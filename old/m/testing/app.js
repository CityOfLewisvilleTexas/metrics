"use strict"
google.charts.load('current', { 'packages': ['corechart'] })
google.charts.setOnLoadCallback(googleReady)

// Vue!
var app = new Vue({
    el: "#app",

    data: {
        cityUrl: 'http://metrics.cityoflewisville.com/#/details/',
        categoryData: [],
        metricDepartments: [],
        metricPriorities: [],
        metricBigmoves: [],
        sorter: 1,
        sortIcons: [
            { show: false, icon: '' },
            { show: false, icon: '' }
        ],
        isLoading: true,
        metricData: [],
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
        xcompressed: false
    },

    methods: {

        /***********************************************************************
         *
         *	Method to get started!
         *
         **********************************************************************/
        created: function() {
            if(location.search == '?hide') this.isIntro = false
            this.restoreKPIs()
            this.getAll()
            setInterval(function() {
            	app.getAll()
            }, 60000*5) // refresh every 5 min
            $(window).resize(function() {
                app.size()
            })
        },

        /***********************************************************************
         *
         *	Methods to backup/restore session
         *
         **********************************************************************/
        restoreKPIs: function() {
            var k = JSON.parse(localStorage.getItem('KPI'))
            if (!k) return
            this.KPIs = k
            for (var i in this.KPIs) {
                if (JSON.stringify(app.KPIs[i]) != '{}')
                    this.showKPI[i].show = true
                else this.showKPI[i].show = false
            }
        },

        storeKPI: function(i, metric) {
            this.showKPI[i].show = true
            this.KPIs[i] = metric
            localStorage.setItem('KPI', JSON.stringify(this.KPIs))
        },

        removeKPI: function(i) {
            this.showKPI[i].show = false
            this.KPIs[i] = {}
            localStorage.setItem('KPI', JSON.stringify(this.KPIs))
            Vue.nextTick(function() {
                $('.modal').modal()
            })
        },


        /***********************************************************************
         *
         *	Method to get all new data
         *
         **********************************************************************/
        getAll: function() {
            this.isLoading = true

            // city score, metric scores, raw metrics, metric categories
            var promiseArray = [
                axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/City Score'),
                axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Metric Scores'),
                axios.post('http://eservices.cityoflewisville.com/citydata/?datasetid=DashGetAllCategory2&datasetformat=json&callback=JSON_CALLBACK')
            ]

            // GET
            axios.all(promiseArray).then(function(results) {
                // errors
                if (!results[0].data[0][0]) app.bad(0, 'No city score returned')
                else if (!results[1].data[0]) app.bad(1, 'No metric scores returned')
                else if (!results[2].data.Results) app.bad(3, 'No metric categories returned')

                // save data, build categories
                app.categoryData = results[2].data.Results
                app.buildDepartments()

                // set city score, no %
                app.cityscore = Number(results[0].data[0][0].CurrentScore.slice(0, -1)).toFixed(0)

                // set metric scores data
                app.metricData = results[1].data[0]
                if (localStorage.sorter) {
                    var x = JSON.parse(localStorage.sorter)
                    app.sorter = x[1]
                    app.sortMetricsBy(x[0])
                }

                // done!
                app.isLoading = false
                Vue.nextTick(function() {
                    app.size()
                    $('.modal').modal()
                    $('.dropdown-button').dropdown()
                    $('.collapsible').collapsible()
                })

                console.log('> end getAll()')
            })
        },

        /***********************************************************************
         *
         *	Methods to format data
         *
         **********************************************************************/
        buildDepartments: function() {
            this.metricDepartments = this.categoryData.filter(function(cat) {
                return cat[0] == 'department'
            })
            this.metricPriorities = this.categoryData.filter(function(cat) {
                return cat[0] == 'priority'
            })
            this.metricBigmoves = this.categoryData.filter(function(cat) {
                return cat[0] == 'bigmove'
            })
            Vue.nextTick(function() { $(".button-collapse").sideNav() })
        },

        /***********************************************************************
         *
         *	Methods to manipulate DOM
         *
         **********************************************************************/
        renderPie: function() {

            // sum up each color
            var sums = { green: 0, yellow: 0, red: 0, other: 0 }
            this.metricData.forEach(function(met) {
                if (met.CurrentMetricColor == 'GREEN') sums.green++;
                else if (met.CurrentMetricColor == 'YELLOW') sums.yellow++;
                else if (met.CurrentMetricColor == 'RED') sums.red++;
                else sums.other++;
            })

            // chart data
            var data = google.visualization.arrayToDataTable([
                ['Label', 'Value'],
                ['On track', sums.green],
                ['Behind progress', sums.yellow],
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
                pieHole: 0.8,
                height: pieHt,
                pieSliceBorderColor: 'transparent',
                backgroundColor: 'transparent',
                legend: 'none',
                pieSliceText: 'none',
                chartArea: {
                    height: '90%'
                },
                slices: {
                    0: { color: '#00c853' },
                    1: { color: '#ffab00' },
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
            var chart = new google.visualization.PieChart(document.getElementById('pie-chart'));
            chart.draw(data, options);

            // position city score in middle of pie
            $('#cityscore').css('margin-top', '-' + $('#pie-chart').height() / 2 - 30 + 'px')
        },

        removeIntro: function() {
            this.isIntro = false
            Vue.nextTick(function() {
                app.renderPie()
            })
        },

        // called on window resize
        size: function() {
            // combine tables on med-and-down
            if ($(window).width() < 1501 && $(window).width() >= 993) {
                this.xcompressed = false
                this.compressed = true
            }
            else if ($(window).width() < 993) {
                this.xcompressed = true
                this.compressed = false
            } else {
                this.compressed = false
                this.xcompressed = false
            }

            // after compressed or !compressing
            Vue.nextTick(function() {
                app.renderPie()
                // adjust city score position to middle of pie chart
                $('#cityscore').css('margin-top', '-' + $('#pie-chart').height() / 2 - 30 + 'px')
            })
        },

        /***********************************************************************
         *
         *	Methods to get formatted data from app
         *
         **********************************************************************/
        splitMetrics: function(h) {
            // h values:
            // 1 : first half
            // 2 : second half
            // 3 : first third
            // 4 : second third
            // 5 : third third
            // ? : all metrics

            var these = this.metricData

            // only return half
            var half = these.length / 2
            var third = these.length / 3
            if (h == 1) return these.slice(0, half)
            if (h == 2) return these.slice(half)
            if (h == 3) return these.slice(0, third)
            if (h == 4) return these.slice(third, third*2)
            if (h == 5) return these.slice(third*2)
        },

        getColor: function(metric) {
            if (metric.CurrentMetricColor == 'GREEN')
                return 'green'
            else if (metric.CurrentMetricColor == 'YELLOW')
                return 'amber'
            else if (metric.CurrentMetricColor == 'RED')
                return 'red'
            else
                return 'grey'
        },

        sortMetricsBy: function(sorter) {
            this.metricData.sort(function(a, b) {
                var x = a[sorter]
                var y = b[sorter]
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
        },

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

        // this has to take into account values that are outside of the range provided.
        // (tricky parsing of the goal and value)
        getScore: function(metric) {
            if (metric.CurrentMetricColor) return metric.CurrentMetricWeight * 10
            var words = metric.metricgoal.split(' ')

            // has a <>
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
        },

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

        /***********************************************************************
         *
         *	Helpers
         *
         **********************************************************************/
        newTab: function(url) {
            window.open(url)
        },

        bad: function(e, err) {
            alert(err)
            console.log(e)
        }
    }
})

// google is ready, start app!
function googleReady() {
    app.created()
    konami()
}

function konami() {
    if (window.addEventListener) {
        var kkeys = [],
            konami = "71,79,79,68,66,89,69" // removeme
        window.addEventListener("keydown", function(e) {
            // console.log(e.keyCode)
            kkeys.push(e.keyCode);
            if (kkeys.toString().indexOf(konami) >= 0) {

                // remove user preferences
                if (confirm('Remove user preferences?')) {
                    app.categoryData = []
                    app.metricDepartments = []
                    app.metricPriorities = []
                    app.metricBigmoves = []
                    app.sorter = 1
                    app.sortIcons = [
                        { show: false, icon: '' },
                        { show: false, icon: '' }
                    ]
                    app.isLoading = true
                    app.metricData = []
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
                    localStorage.removeItem('KPI')
                    localStorage.removeItem('sorter')
                    Vue.nextTick(function() {
                        app.getAll()
                    })
                }
                kkeys = []
            }
        }, true);
    }
}