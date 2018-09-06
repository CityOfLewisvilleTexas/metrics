"use strict";
google.charts.load('current', { 'packages': ['corechart', 'gauge'] })
google.charts.setOnLoadCallback(googleReady)
var timer

// Vue!
var app = new Vue({
    el: "#app",

    data: {
        cityUrl: './details/#/',
        categoryData: [],
        metricDataAlpha: [],
        metricDepartments: [],
        metricPriorities: [],
        metricBigmoves: [],
        searchTerm: '',
        sorter: 1,
        sortBy: '',
        sortIcons: [
            { show: false, icon: '' },
            { show: false, icon: '' }
        ],
        base16: [9, 5, 3, 6],
        isLoading: true,
        isLoadingNew: false,
        lastUpdate: '',
        metricData: [],
        rawMetrics: [],
        isIntro: true,
        showKPI: [
            { i: 0, show: false },
            { i: 1, show: false },
            { i: 2, show: false },
            { i: 3, show: false },
            { i: 4, show: false },
            { i: 5, show: false }
        ],
        KPIs: [{}, {}, {}, {}, {}, {}],
        cityscore: 0,
        compressed: false,
        xcompressed: false,
        sized: 0,
        isError: false,
        error: '',
        setDefaultKPIflag: true,
        pager: '1 - ? of ??',
        interval: -1,
        timer: 0,
        timerText: '15s',
        page: 1,
        isPaused: false,
        stats: false,
        currentMetric: {}
    },

    methods: {

        // app init
        created: function() {

            // for hiding intro paragraph
            if (location.search.indexOf('&hide') > -1 || location.search.indexOf('?hide') > -1) this.isIntro = false
            if (location.search.indexOf('&pause') > -1 || location.search.indexOf('?pause') > -1) {
                this.isPaused = true
            }
            // for stats page
            if (location.href.indexOf('stats.cityoflewisville.com') > -1) app.stats = true
            if (app.stats) document.title = 'COL Stats'

            // check cache
            this.checkCache()
            this.restoreKPIs()

            this.isLoadingNew = true
            this.getAll()
            timer = setInterval(function() {
                app.isLoadingNew = true
                app.getAll()
            }, 60000*5) // refresh every 5 min
            $(window).resize(function() {
                app.size()
            })
        },

        // set the default KPIs
        setDefaults: function() {
            console.log('setting defaults..')
            for (var i in this.metricData) {
                if (!app.stats) {
                    if (this.metricData[i].shortname == 'Avg Response Time to Priority 1 Fire Calls (minutes)') {
                        this.storeKPI(0, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Avg Response Time Priority 1 Police Calls (minutes)') {
                        this.storeKPI(1, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Days of General Fund Reserves') {
                        this.storeKPI(2, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Pct Change in City-wide Water Usage (w/o new growth)') {
                        this.storeKPI(3, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Code Violator Compliance Rate') {
                        this.storeKPI(4, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Pct Change in Registered Library Patrons') {
                        this.storeKPI(5, this.metricData[i])
                    }
                } else {
                    if (this.metricData[i].shortname == 'Avg Num Inmates in Jail') {
                        this.storeKPI(0, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'New Library Patrons This Month') {
                        this.storeKPI(1, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Total Library Patrons as of This Month') {
                        this.storeKPI(2, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Avg Num Days to Pay Water Bill') {
                        this.storeKPI(3, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Ttl # of Active Development Projects') {
                        this.storeKPI(4, this.metricData[i])
                    }
                    else if (this.metricData[i].shortname == 'Ttl Num Active Development Projects in Old Town') {
                        this.storeKPI(5, this.metricData[i])
                    }
                }
            }
        },

        // restore KPIs from cache
        restoreKPIs: function() {
            if (!app.stats) {
                var k = JSON.parse(localStorage.getItem('KPI'))
                if (!k) {
                    return
                }
                this.KPIs = k
                for (var i in this.KPIs) {
                    if (JSON.stringify(app.KPIs[i]) != '{}')
                        this.showKPI[i].show = true
                    else this.showKPI[i].show = false
                }
                for (var i in this.showKPI)
                    if (this.showKPI[i].show == true)
                        this.setDefaultKPIflag = false
                // app.isLoading = false
            } else {
                var k = JSON.parse(localStorage.getItem('statsKPI'))
                if (!k) {
                    return
                }
                this.KPIs = k
                for (var i in this.KPIs) {
                    if (JSON.stringify(app.KPIs[i]) != '{}')
                        this.showKPI[i].show = true
                    else this.showKPI[i].show = false
                }
                for (var i in this.showKPI)
                    if (this.showKPI[i].show == true)
                        this.setDefaultKPIflag = false
                // app.isLoading = false
            }
        },

        // save KPIs to cache
        storeKPI: function(i, metric) {
            this.showKPI[i].show = true
            this.KPIs[i] = metric
            if (!app.stats) localStorage.setItem('KPI', JSON.stringify(this.KPIs))
            else localStorage.setItem('statsKPI', JSON.stringify(this.KPIs))
        },

        // remove KPI from screen and cache
        removeKPI: function(i) {
            this.showKPI[i].show = false
            this.KPIs[i] = {}
            if (!app.stats) localStorage.setItem('KPI', JSON.stringify(this.KPIs))
            else localStorage.setItem('statsKPI', JSON.stringify(this.KPIs))
            Vue.nextTick(function() {
                $('.modal').modal()
            })
        },

        // get all metric data
        getAll: function() {
            // this.isLoading = true

            // city score, metric scores, raw metrics, metric categories
            var queryUrl = 'http://query.cityoflewisville.com/v2/'
            var eservUrl = 'http://eservices.cityoflewisville.com/citydata/'
            var promiseArray = [
                // axios.post(queryUrl + '?webservice=Performance Measures/City Score'),
                axios.post(queryUrl + '?webservice=Performance Measures/Metric Scores'),
                axios.post(eservUrl + '?datasetid=DashGetAllCategory2&datasetformat=json&callback=JSON_CALLBACK'),
                axios.post(queryUrl + '?webservice=Performance Measures/Get All Public Metrics')
                // http://query.cityoflewisville.com/v2/?webservice=Performance Measures/City Score
                // http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Metric Scores
                // http://eservices.cityoflewisville.com/citydata/?datasetid=DashGetAllCategory2&datasetformat=json&callback=JSON_CALLBACK
            ]

            // GET
            axios.all(promiseArray).then(function(results) {
                    // errors
                    // if (!results[0].data[0][0])
                    //     app.errorOut('No city score returned')
                    if (!results[0].data[0])
                        app.errorOut('No metric scores returned')
                    else if (!results[1].data.Results)
                        app.errorOut('No metric categories returned')
                    else if (!results[2].data[0])
                        app.errorOut('No raw metrics returned')
                    app.isError = false
                    app.error = ''

                    // save raw metric data
                    app.rawMetrics = results[2].data[0].filter(function(a) {
                        return a.metrictype == 'Query'
                    })

                    // save data, build categories
                    app.categoryData = results[1].data.Results
                    app.buildDepartments()

                    // set city score, no %
                    // app.cityscore = Number(results[0].data[0][0].CurrentScore
                    //     .slice(0, -1)).toFixed(0)

                    // set metrics to stats only
                    if (app.stats) {
                        app.metricData = results[0].data[0].filter(function(a) {
                            return a.metricisstat == true
                        })

                        // check for any static stats
                        results[2].data[0].forEach(function(rawMetric) {
                            if (rawMetric.metricisstat == 'true') {
                                var found = false
                                app.metricData.forEach(function(metric) {
                                    if (metric.metricName == rawMetric.metricname) found = true
                                })
                                if (!found) {
                                    app.metricData.push({
                                        metricName: rawMetric.metricname,
                                        shortname: rawMetric.realtimeshortname,
                                        CurrentValue: rawMetric.statictext,
                                        WeeklyAvg: rawMetric.statictext,
                                        MonthlyAvg: rawMetric.statictext,
                                        CurrentMetricColor: 'GREEN',
                                        weekColor: 'green-text',
                                        monthColor: 'green-text',
                                        CatName: rawMetric.departmentcode,
                                        PSOFIA_RecordNumber: rawMetric.psofia_recordid
                                    })
                                }
                                found = false
                            }
                        })
                    }
                    else {
                        // set metric scores data to public only
                        app.metricData = results[0].data[0].filter(function(a) {
                            return a.metricispublic == 1 && a.metricstatus == 'deployed'
                        })
                    }

                    app.metricDataAlpha = app.alpha(app.metricData)
                    app.correctColor()
                    if (localStorage.sorter) {
                        var x = JSON.parse(localStorage.sorter)
                        app.sorter = x[1]
                        app.sortMetricsBy(x[0])
                    }
                    else {
                        localStorage.setItem('sorter', app.sorter)
                        app.sorter = -1
                        app.sortIcons[0].icon = 'arrow_upward'
                        app.sortIcons[0].show = true
                    }

                    // set defaults kpis
                    if (app.setDefaultKPIflag) app.setDefaults()

                    // set colors
                    app.colorCode('week')
                    app.colorCode('month')

                    // update the kpis
                    for (var x in app.KPIs) {
                        // console.log(app.KPIs[x])
                        for (var y in app.metricData) {
                            if (app.metricData[y].metricName == app.KPIs[x].metricName) {
                                app.storeKPI(x, app.metricData[y])
                                // console.log('storing KPI '+x)
                            }
                        }
                    }


                    // done!
                    app.isLoading = false
                    app.isLoadingNew = false
                    Vue.nextTick(function() {
                        app.size()
                        $('.modal').modal()
                        $('.dropdown-button').dropdown({
                            constrainWidth: false
                        })
                        $('.collapsible').collapsible()
                        $('.carousel.carousel-slider').carousel({fullWidth: true, duration: 200, noWrap: false})
                        if (app.page == 1)
                            app.pager = '1 - ' + parseInt(app.metricData.length/2) + ' of ' + parseInt(app.metricData.length)
                        else
                            app.pager = parseInt(app.metricData.length/2)+1 + ' - ' + app.metricData.length + ' of ' + parseInt(app.metricData.length)
                        if (!app.isPaused) app.cycler()
                    })

                    // cache data for faster loading
                    app.lastUpdate = new Date().toLocaleString()
                    app.cacheData()
                })
                .catch(function(error) {
                    app.errorOut(error)
                })
        },

        errorOut: function(e) {
            console.log(e)
            // app.clearAll()
            // app.isError = true
            app.isLoading = false
            app.isLoadingNew = false
            Vue.nextTick(function() {
                app.error = '. Error retrieving data. Trying again in 30 seconds...'
                clearInterval(timer)
                setTimeout(function() {
                    app.isLoadingNew = true
                    // pseudo loading
                    setTimeout(function() {
                        app.getAll()
                    }, 1000)
                }, 30000)
            })
        },

        // cache metric data for quick loading
        cacheData: function() {
            var cache = { categoryData: [], cityscore: -1, metricData: [], lastUpdate: '' }
            cache.categoryData = this.categoryData
            cache.cityscore = this.cityscore
            cache.metricData = this.metricData
            cache.rawMetrics = this.rawMetrics
            cache.metricDataAlpha = this.alpha(this.metricData)
            app.correctColor()
            cache.lastUpdate = this.lastUpdate
            if (!app.stats) localStorage.setItem('cache', JSON.stringify(cache))
            else localStorage.setItem('statsCache', JSON.stringify(cache))

        },

        // retrieve cache
        checkCache: function() {
            if (localStorage.cache && !app.stats) {
                var cache = JSON.parse(localStorage.cache)

                // save data, build categories
                app.categoryData = cache.categoryData
                if (!app.stats) app.buildDepartments()

                // set city score, no %
                app.cityscore = cache.cityscore

                app.rawMetrics = cache.rawMetrics

                // set metric scores data
                app.metricData = cache.metricData
                if (localStorage.sorter) {
                    var x = JSON.parse(localStorage.sorter)
                    app.sorter = x[1]
                    app.sortMetricsBy(x[0])
                }

                // lastupdate is updated
                app.lastUpdate = cache.lastUpdate

                // done!
                app.isLoading = false
                app.isLoadingNew = false
                Vue.nextTick(function() {
                    app.size()
                    $('.modal').modal()
                    $('.dropdown-button').dropdown()
                    $('.collapsible').collapsible()
                    $('.carousel.carousel-slider').carousel({fullWidth: true, duration: 200, noWrap: false})
                })
            }
        },

        // clears out data for current session
        clearAll: function() {
            app.categoryData = []
            app.metricDepartments = []
            app.metricPriorities = []
            app.metricBigmoves = []
            app.isLoading = false
            app.metricData = []
            app.rawMetrics = []
            app.metricDataAlpha = []
            app.isError = false
        },

        // build out the categories for dropdowns
        buildDepartments: function() {
            this.metricDepartments = this.categoryData.filter(function(cat) {
                return cat[0] == 'department'
            }).sort(function(a,b) {
                if (a[2] < b[2] ) return -1
                if (a[2] > b[2] ) return 1
                return 0
            })
            this.metricPriorities = this.categoryData.filter(function(cat) {
                return cat[0] == 'priority'
            }).sort(function(a,b) {
                if (a[2] < b[2] ) return -1
                if (a[2] > b[2] ) return 1
                return 0
            })
            this.metricBigmoves = this.categoryData.filter(function(cat) {
                return cat[0] == 'bigmove'
            }).sort(function(a,b) {
                if (a[2] < b[2] ) return -1
                if (a[2] > b[2] ) return 1
                return 0
            })
            Vue.nextTick(function() { $(".button-collapse").sideNav() })
        },

        // render pie chart in DOM
        renderPie: function() {

            // sum up each color
            var sums = { green: 0, yellow: 0, red: 0, other: 0 }
            this.metricData.forEach(function(met) {
                if (met.CurrentMetricColor == 'GREEN') sums.green++
                    else if (met.CurrentMetricColor == 'YELLOW') sums.yellow++
                        else if (met.CurrentMetricColor == 'RED') sums.red++
                            else sums.other++
            })

            // chart data
            var data = google.visualization.arrayToDataTable([
                ['Label', 'Value'],
                ['Exceeding expectations', sums.green],
                ['On track', sums.yellow],
                ['Delayed', sums.red],
                ['No Score', sums.other]
            ])

            // adjust height of pie chart
            var pieHt = 160
            if ($('#intro-holder').height() && $(window).width() >= 976)
                pieHt = $('#intro-holder').height()
            $('#pie-holder').height(pieHt)

            // style the pie
            var options = {
                pieHole: 0.4,
                height: pieHt,
                pieSliceBorderColor: 'transparent',
                backgroundColor: 'transparent',
                legend: 'none',
                pieSliceText: 'none',
                chartArea: {
                    height: '90%'
                },
                slices: {
                    0: { color: '#048204' },
                    1: { color: '#10d310' },
                    2: { color: '#d50000' },
                    3: { color: '#666666' }
                },
                fontSize: 12,
                tooltip: {
                    trigger: 'selection',
                    isHtml: true
                }
            }

            // draw pie
            var el = document.getElementById('pie-chart')
            var chart = new google.visualization.PieChart(el)
            chart.draw(data, options)

            // position city score in middle of pie
            $('#cityscore').css('margin-top', '-' + $('#pie-chart').height() / 2 - 30 + 'px')
        },

        // hides the intro paragraph / re-renders pie chart
        removeIntro: function() {
            this.isIntro = false
            Vue.nextTick(function() {
                if (!app.stats) app.renderPie()
            })
        },

        // called on window resize
        size: function() {

            // small
            if ($(window).width() < 584) {
                this.sized = 1
            }
            // medium
            else if ($(window).width() < 976) {
                this.sized = 2
            }
            // large
            else if ($(window).width() < 1484) {
                this.sized = 3
            }
            // xlarge
            else {
                this.sized = 4
            }
            // console.log($(window).width())

            // after compressed or !compressing
            Vue.nextTick(function() {
                if (!app.stats) app.renderPie()
                // adjust city score position to middle of pie chart
                $('#cityscore').css('margin-top', '-' + $('#pie-chart').height() / 2 - 30 + 'px')
            })
        },

        // get sections of metrics for tables in DOM
        splitMetrics: function(h) {
            // h values:
            // 1 : first half
            // 2 : second half
            // 3 : first third
            // 4 : second third
            // 5 : third third
            // 6 : first fourth
            // 7 : second fourth
            // 8 : third fourth
            // 9 : fourth fourth
            // ? : all metrics

            var these = this.metricData

            // if (these.length < 10 && (h==1 || h==3 || h==6)) return these
            // else return []

            // only return half
            var half = these.length / 2
            var third = these.length / 3
            var fourth = these.length / 4

            // stat page splits
            if (app.stats) {
                if (h == 6) return these.slice(0, half)
                if (h == 7) return these.slice(half)
            }

            if (h == 1) return these.slice(0, half)
            if (h == 2) return these.slice(half)
            if (h == 3) return these.slice(0, third)
            if (h == 4) return these.slice(third, third * 2)
            if (h == 5) return these.slice(third * 2)

            if (h == 6) return these.slice(0, fourth)
            if (h == 7) return these.slice(fourth, fourth * 2)
            if (h == 8) return these.slice(fourth * 2, fourth * 3)
            if (h == 9) return these.slice(fourth * 3)
        },

        metricRanges: function(h, s) {
            if (h == 1 && s == 1) return '1 - ' + Math.floor(this.metricData.length/1)
            if (h == 1 && s == 2) return '1 - ' + Math.floor(this.metricData.length/2)
            if (h == 1 && s == 3) return '1 - ' + Math.floor(this.metricData.length/3)
            if (h == 1 && s == 4) return '1 - ' + Math.floor(this.metricData.length/4)

            if (h == 2 && s == 2) return  Math.floor(this.metricData.length/2)+1 + ' - ' + Math.floor(this.metricData.length/2*2)
            if (h == 2 && s == 3) return  Math.floor(this.metricData.length/3)+1 + ' - ' + Math.floor(this.metricData.length/3*2)
            if (h == 2 && s == 4) return  Math.floor(this.metricData.length/4)+1 + ' - ' + Math.floor(this.metricData.length/4*2)

            if (h == 3 && s == 3) return  Math.floor(this.metricData.length/3*2)+1 + ' - ' + Math.floor(this.metricData.length/3*3)
            if (h == 3 && s == 4) return  Math.floor(this.metricData.length/4*2)+1 + ' - ' + Math.floor(this.metricData.length/4*3)

            if (h == 4 && s == 4) return  Math.floor(this.metricData.length/4*3)+1 + ' - ' + Math.floor(this.metricData.length/4*4)
        },

        // returns the appropriate color (formatted for css classes)
        getColor: function(metric, extra) {
            if (this.stats) return (extra) ? 'deep-purple' + extra : 'deep-purple'
            if (metric.CurrentMetricColor == 'GREEN')
                return  (extra) ? 'green' + extra : 'green'
            else if (metric.CurrentMetricColor == 'YELLOW')
                return (extra) ? 'amber' + extra : 'amber'
            else if (metric.CurrentMetricColor == 'RED')
                return (extra) ? 'red' + extra : 'red'
            else
                return (extra) ? 'grey' + extra : 'grey'
        },

        // sorts metrics by name or score
        sortMetricsBy: function(sorter) {
            // console.log('sorting')
            this.metricData.sort(function(a, b) {
                var x = a[sorter]//.toLowerCase()
                var y = b[sorter]//.toLowerCase()
                if (x < y) return -1 * app.sorter
                else if (x > y) return 1 * app.sorter
                else return 0
            })

            // swap ascending/descending sort order
            if (this.sorter == -1) this.sorter = 1
            else this.sorter = -1

            // set up icon
            if (sorter == 'shortname') {
                if (this.sorter == -1) this.sortIcons[0].icon = 'arrow_upward'
                else this.sortIcons[0].icon = 'arrow_downward'
                this.sortIcons[0].show = true
                this.sortIcons[1].show = false
                this.sortIcons[1].icon = ''
            } else if (sorter == 'CurrentMetricWeight') {
                if (this.sorter == -1) this.sortIcons[1].icon = 'arrow_upward'
                else this.sortIcons[1].icon = 'arrow_downward'
                this.sortIcons[1].show = true
                this.sortIcons[0].show = false
                this.sortIcons[0].icon = ''
            }
            // console.log(sorter)
            // if (sorter) localStorage.setItem('sorter', JSON.stringify([sorter, app.sorter]))
            localStorage.setItem('sorter', JSON.stringify([sorter, app.sorter * -1]))
            this.cacheData()
        },

        // returns the letter grade for cityscore
        grade: function(score) {
            if (97 < score) return 'A+'
            if (93 <= score) return 'A'
            if (90 <= score) return 'A-'
            if (87 <= score) return 'B+'
            if (83 <= score) return 'B'
            if (80 <= score) return 'B-'
            if (77 <= score) return 'C+'
            if (73 <= score) return 'C'
            if (70 <= score) return 'C-'
            if (67 <= score) return 'D+'
            if (63 <= score) return 'D'
            if (60 <= score) return 'D-'
            if (score < 60) return 'F'
            return '?'
        },

        colorCode: function(time) {
            var ftime = time.slice(0,1).toUpperCase()
            ftime += time.slice(1)
            // console.log(ftime)
            this.rawMetrics.forEach(function(met) {
                app.metricData.forEach(function(metric, i) {
                    if (met.realtimeshortname == metric.shortname) {
                        var glower = Number(met.gaugegreenfromamount)
                        var gupper = Number(met.gaugegreentoamount)
                        var ylower = Number(met.gaugeyellowfromamount)
                        var yupper = Number(met.gaugeyellowtoamount)
                        var rlower = Number(met.gaugeredfromamount)
                        var rupper = Number(met.gaugeredtoamount)
                        var val = metric[ftime + 'lyAvg']
                        if (val.indexOf('%') != -1) val = val.replace('%', '')
                        val = Number(val)

                        if (between(glower, gupper, val)){
                            Vue.set(app.metricData[i], time+'Color', 'green-text')
                        }
                        else if (between(ylower, yupper, val)){
                            Vue.set(app.metricData[i], time+'Color', 'amber-text')
                        }
                        else if (between(rlower, rupper, val)){
                            Vue.set(app.metricData[i], time+'Color', 'red-text')
                        }
                        else {
                            // console.log(glower, gupper, ylower, yupper, rlower, rupper, val)
                            // console.log(between(gupper, rlower, val))
                            ;
                        }
                    }
                })
            })
        },

        // this has to take into account values that are outside of the range provided.
        // (tricky parsing of the goal and value)
        correctColor: function() {
            for (var xx in app.metricData) {
                var metric = app.metricData[xx]

                if (!metric.CurrentMetricColor) {
                    var words = metric.metricgoal.split(' ')

                    // has a < or >
                    if (words[0] == '<' || words[0] == '>') {
                        // remove %
                        if (words[1].slice(-1) == '%') words[1] = words[1].slice(0, -1)
                    } else {
                        // add >, remove %
                        words[1] = words[0]
                        if (words[1].slice(-1) == '%') words[1] = words[1].slice(0, -1)
                        words[0] = '>'
                    }

                    // get the value as a number, remove %
                    var val
                    if (metric.CurrentValue.slice(-1) == '%') val = metric.CurrentValue.slice(0, -1)
                    else val = metric.CurrentValue

                    // set and return the correct score
                    if (words[0] == '<') {
                        if (Number(val) < Number(words[1])) {
                            metric.CurrentMetricColor = 'GREEN'
                            metric.CurrentMetricWeight = 10
                        } else {
                            metric.CurrentMetricColor = 'RED'
                            metric.CurrentMetricWeight = 1
                        }
                    } else {
                        if (Number(val) > Number(words[1])) {
                            metric.CurrentMetricColor = 'GREEN'
                            metric.CurrentMetricWeight = 10
                        } else {
                            metric.CurrentMetricColor = 'RED'
                            metric.CurrentMetricWeight = 1
                        }
                    }
                }
            }
        },

        // removes trailing decimals .000 but adds back in % if it was there
        truncate: function(num) {
            var n = num.toString()
            // remove %
            if (n.indexOf('%') > -1) n = n.slice(0, -1)
            // remove trailing .0
            if (n.indexOf('.0') > -1) n = n.slice(0, -2)
            // add % back in
            if (num.indexOf('%') > -1) n += '%'
            return n
        },

        alpha: function(metrics) {
            var m = JSON.parse(JSON.stringify(metrics))
            return m.sort(function(a, b) {
                if (a.shortname < b.shortname) return -1
                if (a.shortname > b.shortname) return 1
                return 0
            })
        },

        // open tab in new window
        newTab: function(url) {
            window.open(url)
        },

        // debugging
        bad: function(e, err) {
            alert(err)
            console.log(e)
        },

        cycler: function() {
            // console.log('cycler')
            // clearTimeout(app.interval)
            // app.interval = -1
            // $('#timerbar').css('width', '0%')
            // this.interval = setTimeout(app.autoplay, 15000)

            if (app.stats) return
            clearInterval(app.interval)
            app.interval = -1
            this.timer = 0
            this.interval = setInterval(function() { app.updateTimer() }, 1000)
        },

        updateTimer: function() {
            this.timer += 1000
            this.timerText = (15000 - this.timer)/1000 + 's'
            var cur = $('.carousel-item.active')
            if (this.timer >= 15000) {
                // change pages
                if (cur[0].id != 'page1') {
                    this.pager = '1 - ' + parseInt(app.metricData.length/2) + ' of ' + parseInt(app.metricData.length)
                    this.page = 1
                    $('.carousel').carousel('prev')
                }
                else {
                    this.pager = parseInt(app.metricData.length/2)+1 + ' - ' + app.metricData.length + ' of ' + parseInt(app.metricData.length)
                    this.page = 2
                    $('.carousel').carousel('next')
                }
               this.timer = 0
               this.timerText = '15s'
            }
        },

        autoplay: function() {
            // console.log('autoplay')
            $('#timerbar').addClass('snap')
            $('#timerbar').css('width', '100%')
            $('#timerbar')[0].offsetHeight
            $('#timerbar').removeClass('snap')
            $('#timerbar').css('width', '0%')

            var cur = $('.carousel-item.active')
            if (cur[0].id != 'page1') {
                this.pager = '1 - ' + parseInt(app.metricData.length/2) + ' of ' + parseInt(app.metricData.length)
                this.page = 1
                $('.carousel').carousel('prev')
            }
            else {
                this.pager = parseInt(app.metricData.length/2)+1 + ' - ' + app.metricData.length + ' of ' + parseInt(app.metricData.length)
                this.page = 2
                $('.carousel').carousel('next')
            }

            this.interval = setTimeout(app.autoplay, 15000)
        },

        pauseAutoplay: function() {
            // if paused, PLAY
            if (this.interval == -1) {
                this.isPaused = 0
                // $('#timerbar').addClass('snap')
                // $('#timerbar').css('width', '100%')
                // $('#timerbar')[0].offsetHeight
                // $('#timerbar').removeClass('snap')
                // $('#timerbar').css('width', '0%')
                // this.interval = setTimeout(app.autoplay, 15000)
                this.interval = setInterval(function() { app.updateTimer() }, 1000)
            }
            else {
                this.isPaused = 1
                // clearTimeout(this.interval)
                // this.interval = -1
                // $('#timerbar').addClass('snap')
                // $('#timerbar').css('width', '100%')
                // $('#timerbar')[0].offsetHeight
                // $('#timerbar').removeClass('snap')
                clearInterval(this.interval)
                this.interval = -1
                this.timer = 0
                this.timerText = '15s'
            }
        },


        nav: function(dir) {
            if (!this.isPaused) {
                // console.log('nav')
                // $('#timerbar').addClass('snap')
                // $('#timerbar').css('width', '100%')
                // $('#timerbar')[0].offsetHeight
                // $('#timerbar').removeClass('snap')
                // $('#timerbar').css('width', '0%')

                // clearTimeout(app.interval)
                clearInterval(app.interval)
                app.interval = -1
                app.timer = 0
                app.timerText = '15s'
            }
            $('.carousel').carousel(dir)

            var cur = $('.carousel-item.active')
            if (cur[0].id != 'page1') {
                this.pager = '1 - ' + parseInt(app.metricData.length/2) + ' of ' + parseInt(app.metricData.length)
                this.page = 1
            }
            else {
                this.pager = parseInt(app.metricData.length/2)+1 + ' - ' + app.metricData.length + ' of ' + parseInt(app.metricData.length)
                this.page = 2
            }
            if (!this.isPaused) this.interval = setInterval(function() { app.updateTimer() }, 1000) //this.autoplay()
        },

        rinse: function(num) {
            var p = false
            num = num.toString()
            if (num.indexOf('%') != -1) {
                p = true
                num = num.slice(0, num.indexOf('%'))
            }
            num = Number(num)
            if (num > 10000) {
                var r = num.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                r += (p) ? '%' : ''
                return r
            }
            if (num.toFixed(1) != num) {
                var r = num.toFixed(1).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                r += (p) ? '%' : ''
                return r
            }
            var r = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
            r += (p) ? '%' : ''
            return r
        },

        metricDetails: function(metric) {

            app.pauseAutoplay()

            // find the raw metric info
            var rawMetric = {}
            app.rawMetrics.forEach(function(met) {
                if (met.metricname == metric.metricName) rawMetric = met
            })

            // stop if not found
            if (!rawMetric) return

            // set up the card details
            rawMetric.value = metric.CurrentValue
            rawMetric.CatName = metric.CatName
            app.currentMetric = rawMetric

            // if it's a gauge
            if ((app.currentMetric.metrictype == 'Query' && app.currentMetric.gaugedataformat == 'PERCENT')
                || (app.currentMetric.metrictype == 'Static' && app.currentMetric.staticsymbol == 'Gauge'))
                Vue.nextTick(function() {
                    app.drawGauge(rawMetric)
                })


            $('#metric-modal').modal('open')
        },

        drawGauge: function(metric) {

            // set the gauge data
            var data
            if (metric.value) {
                data = google.visualization.arrayToDataTable([
                    ['Label', 'Value'],
                    ['', Number(metric.value.replace('%', ''))]
                ])
            }

            // self explanatory
            var options = {
                width: $('.lefty').width(),
                height: Math.min($('.lefty').width(), 195),
                yellowFrom: metric.gaugeyellowfromamount,
                yellowTo: metric.gaugeyellowtoamount,
                greenFrom: metric.gaugegreenfromamount,
                greenTo: metric.gaugegreentoamount,
                redFrom: metric.gaugeredfromamount,
                redTo: metric.gaugeredtoamount,
                minorTicks: 0,
                yellowColor: '#10d310',
                min: metric.gaugeminvalue,
                max: metric.gaugemaxvalue
            }

            // adds % to gauge value
            var formatter = new google.visualization.NumberFormat({ suffix: '%', pattern: '#' })
            formatter.format(data, 1)

            // draw gauge
            var chart = new google.visualization.Gauge(document.getElementById('metric-gauge'))
            chart.draw(data, options)
        },

        searchMetrics: function() {
            this.newTab(this.cityUrl + '?search=' + this.searchTerm)
        },

        demo: function() {
            for (var idx in [0,2,5]) {
                var data = google.visualization.arrayToDataTable([
                    ['Label', 'Value'],
                    ['', 40]
                ])
                var options = {
                    width: 120, height: 120,
                    redFrom: 90, redTo: 100,
                    yellowFrom: 75, yellowTo: 90,
                    minorTicks: 5
                }
                var chart = new google.visualization.Gauge(document.getElementById('kpi-'+idx))
                chart.draw(data, options)
                $('#kpi-'+idx+' table:eq(0)').css('width', 'auto')
                $('#kpi-'+idx+' table:eq(0)').css('display', 'inline-block')
            }
        }
    }
})

// google is ready, start app!
function googleReady() {
    app.created()
    konami()
}

// used for easter egg debugging
function konami() {
    if (window.addEventListener) {
        var kkeys = [],
            konami = "71,79,79,68,66,89,69" // removeme
        window.addEventListener("keydown", function(e) {
            kkeys.push(e.keyCode)
            if (kkeys.toString().indexOf(konami) >= 0) {

                // remove user preferences
                if (confirm('Remove user preferences?')) {
                    app.clearAll()
                    app.isLoading = true
                    app.isLoadingNew = true
                    app.lastUpdate = ''
                    app.sorter = -1
                    app.pager = '1 - ? of ??'
                    app.sortIcons = [
                        { show: true, icon: 'arrow_upward' },
                        { show: false, icon: '' }
                    ]
                    app.showKPI = [
                        { i: 0, show: false },
                        { i: 1, show: false },
                        { i: 2, show: false },
                        { i: 3, show: false },
                        { i: 4, show: false },
                        { i: 5, show: false }
                    ]
                    app.KPIs = [{}, {}, {}, {}, {}, {}]
                    app.cityscore = 0
                    app.setDefaultKPIflag = true
                    if (!app.stats) localStorage.removeItem('KPI')
                    else localStorage.removeItem('statsKPI')
                    localStorage.removeItem('sorter')
                    localStorage.removeItem('cache')
                    Vue.nextTick(function() {
                        app.created()
                    })
                }
                kkeys = []
            }
        }, {passive: true})
    }
}

var between = function(a,b,c){
    if(a>b) return c>=b && c<=a
    else return c>=a && c<=b
}