"use strict"

// set up google charts API
google.charts.load('current', { 'packages': ['corechart', 'gauge'] })
google.charts.setOnLoadCallback(googleReady)

//define routes (for url navigation)
var routes = [
	{ path: '/:cat/:name/:edit' }
]

// router instance
var router = new VueRouter({
	routes: routes
})

// Vue!
var app = new Vue({
	router: router,
	data: {
		refreshing: false,
		hardRefreshing: true,
		sidenavLoading: true,
		metricsLoading: true,
		currentCat: '',
		departments: [],
		citypriorities: [],
		bigmoves: [],
		metrics: [],
		vMetrics: [],
		filter: ['all', 'all', 'All Metrics'],
		qOnly: false,
		iOnly: false,
		detailsTitle: '',
		detailsHeaders: [],
		detailsData: [],
		detailsLoading: false,
		historyTitle: '',
		historyData: [],
		historyLoading: false,
		interval: 20, // refresh interval in minutes
		edit: false,
		internal: false,
		working: false,
		stats: false,
		inNetwork: false,
		rawmetrics: [],
		detailsSort: 1,
		detailsSorted: -1,
		whyTitle: '',
		whyText: ''
	},

	watch: {

		// react to route changes...
		'$route': function (to, from) {

			// 'edit'
			if (((from.path + 'edit') == (to.path) && to.path.indexOf('edit') != -1)
				|| ((from.path + '/edit') == (to.path) && to.path.indexOf('/edit') != -1)) {
				console.log(true)
				app.edit = true
				return
			} else if (((from.path) == (to.path + 'edit') && to.path.indexOf('edit') == -1)
				|| ((from.path) == (to.path + '/edit') && to.path.indexOf('/edit') == -1)) {
				app.edit = false
				return
			}

			// 'internal' or 'working' is in url
			if (to.path.indexOf('/internal') != -1 || to.path.indexOf('/working') != -1) {
				app.internal = (to.path.indexOf('/internal') != -1) ? true : false
				app.working = (to.path.indexOf('/working') != -1) ? true : false
				app.filter = app.checkRoute()
				app.hardRefresh(app.filter[0], app.filter[1], app.filter[2])
			}
			else {
				app.internal = false
				app.working = false
				app.filter = app.checkRoute()
				app.hardRefresh(app.filter[0], app.filter[1], app.filter[2])
			}

		}
	},

	methods: {

		// app init
		created: function() {

			// for stats page
            if (location.href.indexOf('stats.cityoflewisville.com') > -1) app.stats = true
            if (app.stats) document.title = 'COL Stats'

			// check the url after #, set to all if empty
			if (this.$route.path == '/' || this.$route.path == '/all') {
				this.currentCat = 'All Metrics'
				router.push('/all')
			}
			if (this.$route.path.indexOf('/internal') != -1) { app.internal = true; app.working = false }
			if (this.$route.path.indexOf('/working') != -1) { app.internal = false; app.working = true }
			if (this.$route.path.indexOf('/edit') != -1) app.edit = true

			// init sidenav and second navbar
			$('.button-collapse').sideNav()
			$('.pushpinned').pushpin({
				top: $('#top-nav').height(),
				offset: 0
			})

			// initial fetch categories
			this.fetchCategories()

			// set up window resize handling
			this.size()
			$(window).resize(function() { app.size() })
		},

		// checks which data to fetch based on the url path
		checkRoute: function() {

			// get the path of url
			// ie - /department/police
			var words = this.$route.path.split('/').slice(1)

			// remove 'internal' and 'edit' and 'working'
			words.forEach(function(word,i) {
				if (word == 'internal' || word == 'edit') words.splice(i,1)
			})


			// check the category, ie - department
			if (words[0] == 'department') {

				// find the appropriate department, save the other details
				this.departments.forEach(function(dep) {
					if (dep.bmpdisplayname.replace(/ /g, '').toLowerCase() == words[1].replace(/ /g, '').toLowerCase()) {
						words[1] = dep.bmpdisplayname
						words[2] = dep.bmpid
					}
				})
			} else if (words[0] == 'citypriority') {

				// find the appropriate city priority, save the other details
				this.citypriorities.forEach(function(cp) {
					if (cp.bmpdisplayname.replace(/ /g, '').toLowerCase() == words[1].replace(/ /g, '').toLowerCase()) {
						words[1] = cp.bmpdisplayname
						words[2] = cp.bmpid
					}
				})
			} else if (words[0] == 'bigmove') {

				// find the appropriate big move, save the other details
				this.bigmoves.forEach(function(bm) {
					if (bm.bmpdisplayname.replace(/ /g, '').toLowerCase() == words[1].replace(/ /g, '').toLowerCase()) {
						words[1] = bm.bmpdisplayname
						words[2] = bm.bmpid
					}
				})
			}
			// nothing found, shouldn't happen
			else {
				console.log('why are you here?')
				console.log(words)
				return ['all', 'all', 'All Metrics']
			}
			return [words[0], words[2], words[1]]
		},

		// called on window resizing
		size: function() {
			if (this.metricsLoading) return

			// redraw gauges at correct size
			this.renderGauges()

			// make cards the same height
			this.normalizeCards()
		},

		// helper to make all cards the same height
		normalizeCards: function() {
			if (!this.vMetrics.length) return

			// save all heights
			var hts = []
			$('.details-col').each(function(i, el) {
				hts.push(el.offsetHeight)
			})
			$('.lefty').each(function(i, el) {
				hts.push(el.offsetHeight)
			})

			// find tallest one
			var max = hts.reduce(function(a, b) { return Math.max(a, b) })

			// set all equal to tallest one
			$('.details-col').height(max)
			$('.lefty').height(max)
		},

		// probably wont need (?)
		checkCache: function() {},

		// get category data
		fetchCategories: function() {

			// loading categories
			this.sidenavLoading = true

			// get categories
			axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Get All Categories')
				.then(function(results) {

					// good
					if (results.status == 200) {

						app.rawmetrics = results.data[1]

						// sort alphabetically
						app.departments = results.data[0].filter(function(a) { return a.bmptype == "department" })
							.sort(function(a, b) {
								return (a.bmpdisplayname < b.bmpdisplayname) ? -1 : 1
							})
						app.citypriorities = results.data[0].filter(function(a) { return a.bmptype == "priority" })
							.sort(function(a, b) {
								return (a.bmpdisplayname < b.bmpdisplayname) ? -1 : 1
							})
						app.bigmoves = results.data[0].filter(function(a) { return a.bmptype == "bigmove" })
							.sort(function(a, b) {
								return (a.bmpdisplayname < b.bmpdisplayname) ? -1 : 1
							})

						// set the filter
						app.filter = app.checkRoute()

						// get metrics based on filter
						app.hardRefresh(app.filter[0], app.filter[1], app.filter[2])

						// setup refresh interval
						setInterval(function() {
							console.log('refreshing()')
							app.refresh()
						}, 60000 * app.interval)

						// update the relative time every minute
						setInterval(function() {
							app.$forceUpdate()
						}, 60000)
					}
				})
				.catch(function(e) {
					console.log(e) // catch errors with POST
				})
		},

		// refresh data
		refresh: function() {
			if (app.refreshing) return
			app.refreshing = true
			app.fetchMetrics(app.filter[0], app.filter[1], app.filter[2])
		},

		// new data - clicked on a category
		hardRefresh: function(cat, code, name) {
			app.hardRefreshing = true
			app.metrics = []
			app.vMetrics = []
			window.scrollTo(0, 0)

			// actually refresh data
			app.fetchMetrics(cat, code, name)
		},

		newRoute: function(cat, code, name) {
			// update the url
			var newRoute = '/' + cat + '/' + name.replace(/ /g, '').toLowerCase()
			newRoute += (app.internal) ? '/internal' : ''
			newRoute += (app.working) ? '/working' : ''
			newRoute += (app.edit) ? '/edit' : ''
			// console.log(newRoute)
			router.push(newRoute)

			// app.hardRefresh(cat, code, name)
		},

		// get metric data
		fetchMetrics: function(cat, code, name) {

			// hide the side bar when a category is clicked
			$('.button-collapse').sideNav('hide')

			// done loading - mostly replaced with hardRefresh i think
			// TODO: find out where this is used
			this.metricsLoading = true

			// set the filter
			this.filter = [cat, code, name]

			// change the url
			this.currentCat = name

			// get scores and get metrics
			var promiseArray = []

			if (app.working)
				promiseArray = [
					axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Working Metric Scores'),
					axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Get All Working Metrics by Cat&cat=' + cat + '&name=' + code)
				]
			else
				promiseArray = [
					axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Metric Scores'),
					axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Get All'
						+ ((app.internal) ? ' Internal ' : ' Public ')
						+ 'Metrics by Cat&cat=' + cat + '&name=' + code)
				]

			// promise
			axios.all(promiseArray).then(function(results) {

				// errors
				if (results[0].status != 200) // metric scores
					return
				if (results[1].status != 200) // raw metrics
					return
				console.log('no errors..yet')

				// set metrics (only those with names)
				results[1].data[0] = results[1].data[0].filter(function(metric, i) {
					return !!metric.metricname
				})

				// public only
				if (!app.working && !app.internal && !app.stats) {
					app.metrics = results[1].data[0].filter(function(metric, i) {
						return metric.metricispublic == 'true' && metric.metricstatus != 'development' && metric.metricsstatus != 'review'
					})
				}
				// stats only
				else if (app.stats) {
					app.metrics = results[1].data[0].filter(function(metric, i) {
						return metric.metricisstat == 'true'
					})
				}
				// working only
				else if (app.working) {
					app.metrics = results[1].data[0].filter(function(metric, i) {
						return (metric.metricstatus == 'development' || metric.metricstatus == 'review')
					})
				}
				// internal and public only
				else if (app.internal) {
					app.metrics = results[1].data[0].filter(function(metric, i) {
						return metric.metricispublic == 'true' || metric.metricisinternal == 'true'
					})
				}

				// adds colors and values to the raw metrics
				app.metrics.forEach(function(metric, i) {
					results[0].data[0].forEach(function(m, j) {
						if (metric.realtimeshortname == m.shortname) {
							metric['value'] = m.CurrentValue
							metric['color'] = m.CurrentMetricColor
						}
					})
				})

				// alphabetizes and query first
				app.metrics = app.metrics.sort(function(a, b) {

					// sort by metrictype first
					if (a.metrictype == b.metrictype) return (a.metricname < b.metricname) ? -1 : (a.metricname > b.metricname) ? 1 : 0

					// else sort by type
					return (a.metrictype < b.metrictype) ? -1 : (a.metrictype > b.metrictype) ? 1 : 0
				})

				// correct missing colors if possible
				app.colorCorrection()

				// get all details/history data
				app.fetchAllDetails()
				app.fetchAllHistory()

				// sets the visual metrics. probably not needed anymore
				app.vMetrics = app.metrics

				// done loading
				app.metricsLoading = false


				app.hardRefreshing = false

				// after dom changes
				Vue.nextTick(function() {

					// set up tooltips
					$('.tooltipped').tooltip()

					// filter metrics to current filter
					app.filterMetrics()

					// hide metrics for reveal effect
					$('.list-of-metrics li').css('opacity', '0')

					// reveal effect, done refreshing
					if (!app.refreshing) Materialize.showStaggeredList('#list-of-metrics')
					app.refreshing = false

					// after dom changes
					Vue.nextTick(function() {

						// draw gauges
						app.renderGauges()

						// set up modal. probably redundant
						$('.modal').modal({
							opacity: 0.7
						})

						// scroll to specific metric
						app.scrollTo()
					})
				})
			})
		},

		// draw gauges
		renderGauges: function() {

			// only metrics with type of PERCENT
			this.vMetrics.filter(function(metric) {
				return metric.gaugedataformat == 'PERCENT'
			}).forEach(function(met) {

				// only draw gauges for certain metrics
				if (!(met.metrictype == 'Query' && met.gaugedataformat == 'PERCENT') && !(met.metrictype == 'Static' && met.staticsymbol == 'Gauge')) return

				// set the gauge data
				var data
				if (met.value) {
					data = google.visualization.arrayToDataTable([
						['Label', 'Value'],
						['', Number(met.value.replace('%', ''))]
					])
				}
				// static gauge values come from different field
				else {
					data = google.visualization.arrayToDataTable([
						['Label', 'Value'],
						['', Number(met.staticgauge) * 100]
					])
				}

				// self explanatory
				var options = {
					width: $('#gauge-' + met.id).width(),
					height: Math.min($('#gauge-' + met.id).width(), 195),
					yellowFrom: met.gaugeyellowfromamount,
					yellowTo: met.gaugeyellowtoamount,
					greenFrom: met.gaugegreenfromamount,
					greenTo: met.gaugegreentoamount,
					minorTicks: 0,
					yellowColor: '#10d310',
					min: met.gaugeminvalue,
					max: met.gaugemaxvalue
				}

				// adds red range only when necessary
				if (met.color == 'RED') {
					options.redFrom = met.gaugeredfromamount
					options.redTo = met.gaugeredtoamount
				}
				// if metric doesnt have color for some reason, find it manually (if static gauge)
				else if (met.metrictype == 'Static'
						&& met.staticgauge
						&& between(met.gaugeredfromamount, met.gaugeredtoamount, Number(met.staticgauge) * 100)) {
					// options.redColor = 'red'
					options.redFrom = met.gaugeredfromamount
					options.redTo = met.gaugeredtoamount
				}

				// adds % to gauge value
				var repeater = '#'
				if (met.decimalplaces != null) {
					repeater += '.'
					repeater += '#'.repeat(Number(met.decimalplaces))
				}
				var formatter = new google.visualization.NumberFormat({ suffix: '%', pattern: repeater })
				formatter.format(data, 1)

				// draw gauge
				var chart = new google.visualization.Gauge(document.getElementById('gauge-' + met.id))
				chart.draw(data, options)

			})
			// re-normalize cards with gauges in place
			this.normalizeCards()
		},

		// remove all gauges
		clearGauges: function() {
			$('.gauges').html('')
		},

		// filter metrics by category
		filterMetrics: function() {
			if (this.metricsLoading) return

			// QUERY ONLY
			// by department
			if (app.filter[0] == 'department') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.qOnly) ? metric.category1 == app.filter[1] && metric.metrictype == 'Query' : metric.category1 == app.filter[1]
				})
			}
			// by city priority
			else if (app.filter[0] == 'citypriority') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.qOnly) ? metric.category3 == app.filter[1] && metric.metrictype == 'Query' : metric.category3 == app.filter[1]
				})
			}
			// by big move
			else if (app.filter[0] == 'bigmove') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.qOnly) ? metric.category2 == app.filter[1] && metric.metrictype == 'Query' : metric.category2 == app.filter[1]
				})
			}
			// rare case when viewing all metrics. (slow!)
			else if (app.filter[0] == 'all') {
				this.vMetrics = (app.qOnly) ? this.metrics.filter(function(metric) { return metric.metrictype == 'Query' }) : this.metrics
			}


			// INTERNAL ONLY
			// by department
			if (app.filter[0] == 'department') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.iOnly) ? metric.category1 == app.filter[1] && metric.metricisinternal == 'true' : metric.category1 == app.filter[1]
				})
			}
			// by city priority
			else if (app.filter[0] == 'citypriority') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.iOnly) ? metric.category3 == app.filter[1] && metric.metricisinternal == 'true' : metric.category3 == app.filter[1]
				})
			}
			// by big move
			else if (app.filter[0] == 'bigmove') {
				// check if query only, filter
				this.vMetrics = this.metrics.filter(function(metric) {
					return (app.iOnly) ? metric.category2 == app.filter[1] && metric.metricisinternal == 'true' : metric.category2 == app.filter[1]
				})
			}
			// rare case when viewing all metrics. (slow!)
			else if (app.filter[0] == 'all') {
				this.vMetrics = (app.iOnly) ? this.metrics.filter(function(metric) { return metric.metricisinternal == 'true' }) : this.metrics
			}

			// re-render all gauges
			this.clearGauges()
			Vue.nextTick(function() {
				app.renderGauges()
			})

			// set second navbar title
			this.currentCat = this.filter[2]
		},

		// query switch
		querySwitch: function(ev) {
			// set query-only variable
			this.qOnly = (ev.target.checked) ? false : true

			// re-filter metrics
			this.filterMetrics()
			if (this.currentCat == 'All Metrics') return

			// reveal animation
			$('#list-of-metrics li').css('opacity', '0')
			Vue.nextTick(function() {
				Materialize.showStaggeredList('#list-of-metrics')
			})
		},

		// query switch
		internalSwitch: function(ev) {
			// set query-only variable
			this.iOnly = (ev.target.checked) ? false : true

			// re-filter metrics
			this.filterMetrics()
			if (this.currentCat == 'All Metrics') return

			// reveal animation
			$('#list-of-metrics li').css('opacity', '0')
			Vue.nextTick(function() {
				Materialize.showStaggeredList('#list-of-metrics')
			})
		},

		// fix the table headers
		fixHeaders: function() {
			var ths = $('.modal-content table thead th')
			var tds = $('.modal-content table tbody tr:eq(0) td')

			ths.each(function(i, th) {
				th.id = 'th-' + i
				tds[i].id = 'td-' + i

				$('#' + th.id).width($('#' + tds[i].id).width())
			})

			if ($(window).width() >= 992) $('#details-table-holder').css('padding-top', $('.fixed-table-header').height()-24 + 'px')
		},

		// set up details table in model
		setDetails: function(metric) {
			app.detailsSorted = -1
			// re-init just in case
			$('.modal').modal({
				opacity: 0.7
			})

			// set info
			this.detailsTitle = metric.metricname
			this.detailsHeaders = metric.details.fieldnames
			this.detailsData = metric.details.Results

			// sizing
			if ($(window).width() < 1500) $('.modal').css('width', '90%')
			else if (app.detailsHeaders.length > 5) $('.modal').css('width', '80%')
			else if (app.detailsHeaders.length > 4) $('.modal').css('width', '70%')
			else if (app.detailsHeaders.length > 3) $('.modal').css('width', '60%')
			else if (app.detailsHeaders.length > 2) $('.modal').css('width', '50%')
			else $('.modal').css('width', '45%')

			// open table
			$('#details-modal').modal({
				ready: function(modal, trigger) { app.fixHeaders() }
			})
			$('#details-modal').modal('open')

			// sizing
			Vue.nextTick(function() {
				if ($(window).width() > 992)
					$('.scroll').css('height', '100%')
			})
		},

		// set up details table in model
		setHistory: function(metric) {
			// re-init just in case
			$('.modal').modal({
				opacity: 0.7
			})

			// set info
			this.historyTitle = metric.metricname
			app.historyHeaders = metric.history.fieldnames
			app.historyData = metric.history.Results

			// open graph
			$('#history-modal').modal('open')

			// sizing & draw graph
			Vue.nextTick(function() {
				app.renderHistoryGraph()
				if ($(window).width() > 992)
					$('.scroll').css('height', '100%')
			})
		},

		// get details table info
		fetchAllDetails: function() {
			// set loading
			this.detailsLoading = true
			app.detailsSorted = -1

			// set up all GET requests
			var promises = []
			this.metrics.forEach(function(metric) {
				if (!metric.uspname) return
				promises.push(axios.get('http://eservices.cityoflewisville.com/citydata?datasetid=MetricsGetDetailsOrAvg&detoravg=Details&uspname=' + metric.uspname + '&datasetformat=json&callback=j'))
			})

			// GET all
			axios.all(promises).then(function(results) {
				// done loading, set all details
				app.detailsLoading = false
				app.metrics.forEach(function(metric, i) {
					if (!metric.uspname) return
					metric.details = results[i].data
				})
			})
		},

		// get history graph info
		fetchAllHistory: function() {
			// set loading
			this.historyLoading = true

			// set up all GET requests
			var promises = []
			this.metrics.forEach(function(metric) {
				if (!metric.uspname) return
				promises.push(axios.get('http://eservices.cityoflewisville.com/citydata?datasetid=MetricsGetDetailsOrAvg&detoravg=AGG&uspname=' + metric.uspname + '&datasetformat=json&callback=j'))
			})

			// GET all
			axios.all(promises).then(function(results) {
				// done loading, set all history
				app.historyLoading = false
				app.metrics.forEach(function(metric, i) {
					if (!metric.uspname) return
					metric.history = results[i].data
				})
			})
		},

		// draw history graph
		renderHistoryGraph: function() {

			// remove first entry (text only)
			var points = []
			if (points.length > 0) {
				points.unshift(['Date', 'Num'])
			}

			// set up data variable
			var data = new google.visualization.DataTable()
			data.addColumn('date', 'Date')
			data.addColumn('number', 'Value')

			// format data string for IE, set data
			this.historyData.forEach(function(thing, i) {
				data.addRows([
					[new Date(thing[0].slice(0, 19).replace(' ', 'T')), thing[1]]
				])
			})

			// self-explanatory
			var options = {
				titlePosition: 'none',
				backgroundColor: 'transparent',
				height: '90%',
				chartArea: {
					height: '70%',
					width: '70%'
				},
				legend: { position: 'right' },
				curveType: 'none', // or 'function' for smooth curves. looks nicer :)
				trendlines: {
					0: {
						type: 'linear',
						color: '#ef9a9a',
						lineWidth: 2,
						opacity: 0.8,
						showR2: false,
						visibleInLegend: true,
						labelInLegend: 'Trend'
					}
				}
			}

			// draw
			var chart = new google.visualization.LineChart(document.getElementById('historygraph'))
			chart.draw(data, options)
		},

		// gets difference since yesterday
		vsYesterday: function(metric) {

			if (this.historyLoading) return 'x'

			// save value and if percentage
			var val = metric.value
			if (val == undefined) return 'x'
			var pctflag = false
			if (val.indexOf('%') != -1) {
				val = val.replace('%', '')
				pctflag = true
			}
			val = Number(val)

			// get yesterday's value, multiply by 100 if percentage
			var yesterday
			try {
				yesterday = metric.history.Results[1][1]
				yesterday *= (pctflag) ? 100 : 1
			} catch(e) {
				return 'x'
			}

			// get difference
			var final = this.rinse((val - yesterday).toFixed(1))
			return ((final > 0) ? '+' : (final < 0) ? '' : '') + final
		},

		// green/red class for difference (depending)
		vsYesterdayClass: function(metric) {
			if (this.historyLoading) return 'grey-text'

			// save value
			var val = this.vsYesterday(metric).toString()

			// check if up is good or bad
			if (metric.realtimetrendarrowcolordown == 'red') {
				if (val.indexOf('-') != -1) return 'red-text text-lighten-1'
				if (val.indexOf('+') != -1) return 'green-text text-lighten-1'
				return 'grey-text' // uh.. something went wrong
			}
			if (metric.realtimetrendarrowcolordown == 'green') {
				if (val.indexOf('-') != -1) return 'green-text text-lighten-1'
				if (val.indexOf('+') != -1) return 'red-text text-lighten-1'
				return 'grey-text' // uh.. something went wrong
			}
		},

		// relative time to now
		dateDiff: function(metric) {
			try {
				var datestring = metric.history.Results[0][2]
				if (datestring.indexOf(' ') == 3)
					return moment(datestring, 'MMM D YYYY h:mm A').fromNow() // format: Sep 19 2017 7:40AM
				return moment(datestring, 'YYYY-MM-DD hh:mm:ss').fromNow() // format: 2017-09-07 17:52:42
			} catch (e) {
				console.log(metric)
				var datestring = metric
				if (datestring.indexOf(' ') == 3)
					return moment(datestring, 'MMM D YYYY h:mm A').fromNow() // format: Sep 19 2017 7:40AM
				return moment(datestring, 'YYYY-MM-DD hh:mm:ss').fromNow() // format: 2017-09-07 17:52:42
			}
		},

		// get last updated date
		getRefreshedDate: function(metric) {
			try {
				var datestring = metric.history.Results[0][2]
				return datestring
			} catch (e) {
				return 'No date found'
			}
		},

		// format psofia date into prettier one
		prettyDate: function(datestring) {
			return moment(datestring).format('MMM D YYYY h:mm A')
		},

		// get color class of metric
		getColor: function(metric) {
			// i created the 'v classes' because we're not actually using yellow
			// check top of style.css
			if (metric.color == 'GREEN') return 'greenv white-text'
			if (metric.color == 'YELLOW') return 'yellowv white-text shadowed'
			if (metric.color == 'RED') return 'redv white-text'
			return 'grey darken-2 white-text' // something went wrong (or static)
		},

		// fill in missing colors if applicable
		colorCorrection: function() {
			return
			// check all metrics
			this.metrics.forEach(function(metric) {
				if (!metric.color && metric.metrictype == 'Query') {

					// shouldn't see many of these
					console.log(metric)

					// save gauge info (readability)
					var glower = Number(metric.gaugegreenfromamount)
					var gupper = Number(metric.gaugegreentoamount)
					var ylower = Number(metric.gaugeyellowfromamount)
					var yupper = Number(metric.gaugeyellowtoamount)
					var rlower = Number(metric.gaugeredfromamount)
					var rupper = Number(metric.gaugeredtoamount)
					var val = metric.value

					// remove %
					if (val.indexOf('%') != -1) val = val.replace('%', '')
					val = Number(val)

					// check which range value falls under, correct color
					if (between(glower, gupper, val)) {
						metric.color = 'GREEN'
					} else if (between(ylower, yupper, val)) {
						metric.color = 'YELLOW'
					} else if (between(rlower, rupper, val)) {
						metric.color = 'RED'
					} else
						metric.color = 'GREY'
				}
			})
		},

		// make a metric internal only
		pushInternal: function(metric, pflag, iflag, ev) {

			var el = '#'+ev.srcElement.parentElement.id

			// build url
			var u = 'http://query.cityoflewisville.com/v2/?webservice=PSOFIA/Public to Internal'
			u += '&recordnumber=' + metric.psofia_recordid
			u += '&pflag=' + pflag
			u += '&iflag=' + iflag

			// disable button
			$(el).addClass('disabled')

			// add loader
			$(el).html('<div class="preloader-wrapper tiny active"><div class="spinner-layer spinner-blue-only"><div class="circle-clipper left"><div class="circle"></div></div><div class="gap-patch"><div class="circle"></div></div><div class="circle-clipper right"><div class="circle"></div></div></div></div>')

			// hit query to swap metric to internal only
			axios.post(u).then(function(results) {
				// reset page upon success
				if (results.status == 200) {
					$('.tooltipped').tooltip()
					$(el).html('<i class="material-icons">exit_to_app</i>')
					app.created()
				}
			})
		},

		// rinse numbers of trailing decimals (3.432 => 3.4, 8.0 => 8, etc), add commas
		rinse: function(num) {
			num = Number(num)
			if (num > 10000) return num.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
			if (num.toFixed(1) != num) {
				// removes the negative from -0.0
				if (num.toFixed(1) == '-0.0') return num.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',').slice(1)
				else return num.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
			}
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},

		// adds the pre/post text to the value (ie - $)
		addChars: function(num, metric) {
			var tempNum = num.replace(/,/g,'')
			var fin = (metric.prevaluetext) ? metric.prevaluetext : ''
			fin += metric.decimalplaces != null ? Number(tempNum).toFixed(metric.decimalplaces) : tempNum
			fin += (metric.postvaluetext) ? metric.postvaluetext : ''

			return fin.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},

		// rinse numbers of trailing decimals (3.432 => 3.4, 8.0 => 8, etc)
		checkRinse: function(num) {
			if (isNaN(num)) return num
			num = Number(num)
			if (num > 10000) return num.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
			if (num.toFixed(1) != num) return num.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
		},

		// sort details table
		sortDetails: function(i) {
			app.detailsSorted = i
			app.detailsData = app.detailsData.sort(function(a,b) {
				if (a[i] < b[i]) return app.detailsSort * -1
				if (a[i] > b[i]) return app.detailsSort
				return 0
			})
			app.detailsSort *= -1
			Vue.nextTick(function() {
				app.fixHeaders()
			})
		},

		// get count for sidebar
		catCount: function(prop, id) {
			return app.rawmetrics.filter(function(metric) {
				// stats
				if (app.stats) return metric[prop] == id && (metric.metricisstat == 'true')
				// working
				if (app.working) return metric[prop] == id && (metric.metricstatus == 'development' || metric.metricstatus == 'review')
				// internal
				if (app.internal) return metric[prop] == id && (metric.metricisinternal == 'true' || metric.metricispublic == 'true')// && metric.metricstatus != 'development'
				// public
				if (!app.internal && !app.working) return metric[prop] == id && metric.metricispublic == 'true'// && metric.metricstatus != 'development'
				// default
				return metric[prop] == id
			}).length
		},

		// adds slash to url for consistency
		addSlash: function(str) {
			if (str[str.length-1] == '/') return str
			else return (str + '/')
		},

		// open link in new tab
		newTab: function(url) {
			// change to node version
			if (url.indexOf('.cityoflewisville.com/psofia/default.aspx?form=42')) url = url.replace('default.aspx', 'node/index.html')
			url = url.replace('http://apps.', 'http://eservices.')
			window.open(url)
		},

		openWhyModal: function(metric) {
			console.log('hi ' + metric.psofia_recordid)
			this.whyTitle = metric.metricname
			this.whyText = metric.why
			$('#why-modal').modal('open')
		},

		// scrolls to the id if it exists
		scrollTo: function() {
			if (!app.$route.query.id) return
			var id = '#card-' + app.$route.query.id

			if ($(id).length != 1) return

			// animate the scroll
			$('html, body').animate({
		        scrollTop: $(id).offset().top - 120
		    }, 1000)

			// i want a better solution
		    $(id + ' .card').css('box-shadow', '0px 0px 0px 16px rgba(0,0,0,0.5)')

		    // "lift" the card up
		    // $(id).css('position', 'relative')
		    // $(id).css('z-index', '3')

		    // add a shadow over everything else
			// if (!$('#bg-shadow').length) {
			//     $('#app').prepend('<div id="bg-shadow">hi</div>')
			//     $('#bg-shadow').prepend('<span class="material-icons" id="bg-close">close</span>')

			// remove shadow/blur on click
			//     $('#bg-shadow').click(function() {
			//     	$(this).remove()
			//     	$('#metrics li').each(function(i, card) { $(this).removeClass('blurred') })
			//     })
			// }

		    // blur all other cards
		    // $('#metrics li').each(function(i, card) {
		    // 	if ($(this).attr('id') != id.replace('#',''))
		    // 		$(this).addClass('blurred')
		    // })
		},

		// uhh ?
		n: function() {
			return
		}
	}
}).$mount('#app')

// google is ready, start app!
function googleReady() {
	app.created()
}

// little helper function to tell if c is between a and b
var between = function(a, b, c) {
	return (a > b) ? c >= b && c <= a : c >= a && c <= b
}