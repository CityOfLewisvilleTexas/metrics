// "use strict";
google.charts.load('current', { packages: ['corechart','table'] });
google.charts.setOnLoadCallback(googleReady);
var d = new Date();
var monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

var app = new Vue({
    el: "#app",
    data: {
        thisPeriod: -1,
        thisMonthNum: -1,
        thisMonth: '',
        lastMonth: '',
        lastMonthFull: '',
        thisYear: 0,
        thisFYear: 0,
        rData: {},
        pctYearClass: '',
        pctMonthClass: '',
        pctYearIcon: '',
        pctMonthIcon: '',
        kpi1: 0,
        kpi2: 0,
        kpi3: 0,
        kpi4: 0,
        lastYtd: [],
        latestYrPct: 0,
        latestMoPct: 0,
        isLoading: true,
        lastTotal: 0
    },
    methods: {
        // big numbers in Collections section
        roundMillionsWithSign: function(num) {
            var fin = num / 1000000;
            if (fin < 0) return '-$' + fin.toFixed(1) * -1;
            else return '+$' + fin.toFixed(1);
        },

        roundMillions: function(num) {
            var fin = num / 1000000;
            if (fin < 0) return '-$' + fin.toFixed(1) * -1;
            else return '$' + fin.toFixed(1);
        },

        // KPI 1 pct difference
        calcPctDiffYear: function(obj) {
            // loop through data and find the value for same month last year
            for (var i in app.rData) {
                if (obj.CalendarMonth == app.rData[i].CalendarMonth && (obj.CalendarYear - 1 == app.rData[i].CalendarYear)) {
                    // pct change
                    var fin = (((obj.Allocation - app.rData[i].Allocation) / app.rData[i].Allocation) * 100).toFixed(2)

                    // set classes for the up/down icon
                    app.pctYearClass = (fin > 0) ? 'pct-up' : 'pct-down'
                    app.pctYearIcon = (fin > 0) ? 'fa fa-caret-up' : 'fa fa-caret-down'

                    return fin
                }
            }
        },

        // KPI 2 pct difference
        calcPctDiffMonth: function(l) {
            var fin = (((app.rData[l].Allocation - app.rData[l-1].Allocation) / app.rData[l-1].Allocation) * 100).toFixed(2)

            app.pctMonthClass = (fin > 0) ? 'pct-up' : 'pct-down'
            app.pctMonthIcon = (fin > 0) ? 'fa fa-caret-up' : 'fa fa-caret-down'

            return fin
        },

        // pie chart in By Month section
        drawPie: function() {

            // get sum of entries within each month for average calculations
            var months = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            var doAdd = true;
            for (var i in this.rData)
                months[this.rData[i].CalendarMonth - 1]++;

            // totals for each month
            var sums = [
                { m: 'Jan', v: 0 },
                { m: 'Feb', v: 0 },
                { m: 'Mar', v: 0 },
                { m: 'Apr', v: 0 },
                { m: 'May', v: 0 },
                { m: 'Jun', v: 0 },
                { m: 'Jul', v: 0 },
                { m: 'Aug', v: 0 },
                { m: 'Sep', v: 0 },
                { m: 'Oct', v: 0 },
                { m: 'Nov', v: 0 },
                { m: 'Dec', v: 0 }
            ];
            for (var i in app.rData)
                sums[app.rData[i].CalendarMonth - 1].v += app.rData[i].Allocation

            // sort sums by month
            sums.sort(function(a, b) {
                return parseFloat(a.v) - parseFloat(b.v)
            })

            // build google data table
            // month name, value/total = avg
            var data = google.visualization.arrayToDataTable([
                ['Month', 'Allocation'],
                [sums[0].m, sums[0].v / months[0]],
                [sums[1].m, sums[1].v / months[1]],
                [sums[2].m, sums[2].v / months[2]],
                [sums[3].m, sums[3].v / months[3]],
                [sums[4].m, sums[4].v / months[4]],
                [sums[5].m, sums[5].v / months[5]],
                [sums[6].m, sums[6].v / months[6]],
                [sums[7].m, sums[7].v / months[7]],
                [sums[8].m, sums[8].v / months[8]],
                [sums[9].m, sums[9].v / months[9]],
                [sums[10].m, sums[10].v / months[10]],
                [sums[11].m, sums[11].v / months[11]],
            ]);

            // $$$
            var formatter = new google.visualization.NumberFormat({
                prefix: '$'
            })
            formatter.format(data, 1)

            // chart options
            var options = {
                titleStyle: 'Test Title',
                legend: {
                    position: 'none'
                },
                chartArea: { left: 0, top: 0, width: "100%", height: "100%" },
                height: 305,
                width: 368,
                pieSliceText: 'label',
                slices: [
                    { color: '#311b92' },
                    { color: '#4527a0' },
                    { color: '#512da8' },
                    { color: '#5e35b1' },
                    { color: '#673ab7' },
                    { color: '#7e57c2' },
                    { color: '#9575cd' },
                    { color: '#b39ddb', textStyle: { color: 'black' } },
                    { color: '#d1c4e9', textStyle: { color: 'black' } },
                    { color: '#d1c4e9', textStyle: { color: 'black' } },
                    { color: '#ede7f6', textStyle: { color: 'black' } },
                    { color: '#ede7f6', textStyle: { color: 'black' } }
                ],
                reverseCategories: true,
                pieStartAngle: 90
            }

            // draw chart
            var chart = new google.visualization.PieChart(document.getElementById('pie'))
            chart.draw(data, options)
        },

        // draw line chart in 10 Year Collection Trend section
        drawLineChart: function() {

            if (app.isLoading) return

            // totals
            var totals = this.rData

            // build google data table
            var data = new google.visualization.DataTable()
            data.addColumn('date', 'Date')
            data.addColumn('number', 'Allocation')

            // non-existent ?
            if (!totals) return

            // cycle through data
            for (var i = totals.length - 1; i >= 0; i--) {

                // format data
                var epoch = parseInt(totals[i].CalendarDate.replace('/Date(', '').replace(')/', ''))
                var d = new Date(epoch)
                var ds = d.getMonth() + '/' + d.getDate() + '/' + d.getFullYear()

                // add date and allocation to google data
                data.addRow([d, totals[i].Allocation])
            }

            // experimental
            $('#graph-holder').css('height', '500px')

            // chart options
            var options = {
                legend: {
                    position: 'none'
                },
                trendlines: { 0: {} },
                series: { 0: { color: '#673ab7' } },
                vAxis: {
                    format: 'currency'
                },
                width: '80%',
                height: '100%',

                // experimental
                // trendlines: {
                //     0: {
                //         color: 'yellow',
                //         width: '4px'
                //     }
                // },
                // series: { 0: { color: '#F50057' } },
                // backgroundColor: '#651FFF',
                // vAxis: {
                //     format: 'currency',
                //     textStyle: {
                //         color: 'white'
                //     },
                //     gridlines: {
                //         color: '#7C4DFF'
                //     }
                // },
                // hAxis: {
                //     textStyle: {
                //         color: 'white'
                //     },
                //     gridlines: {
                //         color: 'transparent'
                //     }
                // },
            }

            // draw chart
            var chart = new google.visualization.LineChart(document.getElementById('line-graph'))
            chart.draw(data, options)
        },

        // draw table in the Month-to-Month Comparison section
        drawTable: function() {

            // totals
            var totals = this.rData

            // get list of years
            years = []
            app.rData.forEach(function(a) { years.push(a.FiscalYear) })
            years = years.filter(function(item, pos, ar) {
                return ar.indexOf(item) === pos
            }).sort(function(a,b) {
                return a - b
            })

            // build google data table
            var data = new google.visualization.DataTable();
            data.addColumn('string', 'Year');
            data.addColumn('number', 'Oct');
            data.addColumn('number', 'Nov');
            data.addColumn('number', 'Dec');
            data.addColumn('number', 'Jan');
            data.addColumn('number', 'Feb');
            data.addColumn('number', 'Mar');
            data.addColumn('number', 'Apr');
            data.addColumn('number', 'May');
            data.addColumn('number', 'Jun');
            data.addColumn('number', 'Jul');
            data.addColumn('number', 'Aug');
            data.addColumn('number', 'Sep');
            data.addColumn('number', 'Total');
            data.addColumn('number', 'FYTD');
            data.addColumn('string', '% Bdg YTD');

            // easier row building
            var row = {
                year: 0, // fiscal years
                bdg: 0, // budget
                val: [0,0,0,0,0,0,0,0,0,0,0,0,0,0] // corresponds to google datatable (above)
            }

            // helper array
            var m = [9,10,11,0,1,2,3,4,5,6,7,8]

            // keep record of ytd for later calculation (KPI 3)
            app.lastYtd = []

            // cycle through years, build table row by row
            for (var i in years) {

                // current row's year and budget
                row.year = years[i]
                var budget = 0

                // month index
                var mx = 9

                // right side table numbers
                var total = 0
                var ytd = 0
                var pctBdgYtd = 0
                var pctActualYtd = 0

                // cycle through data
                for (var j in totals) {
                    if (totals[j].FiscalYear == years[i]) {

                        // set budget - used in calculation(s)
                        budget = totals[j].Budget

                        // ALLOCATIONS (each month)
                        row.val[totals[j].Period-1] = Number(totals[j].Allocation.toFixed(0))

                        // TOTAL
                        total += totals[j].Allocation

                        // FYTD
                        if (totals[j].Period <= app.thisPeriod)
                            ytd += totals[j].Allocation
                    }
                }
                app.lastYtd.push(ytd)

                app.kpi3 = Number(ytd / budget * 100).toFixed(1) + '%'

                data.addRow([
                    row.year.toString(),
                    row.val[0],
                    row.val[1],
                    row.val[2],
                    row.val[3],
                    row.val[4],
                    row.val[5],
                    row.val[6],
                    row.val[7],
                    row.val[8],
                    row.val[9],
                    row.val[10],
                    row.val[11],
                    Number(total.toFixed(0)),
                    Number(ytd.toFixed(0)),
                    Number(ytd / budget * 100).toFixed(1) + '%'
                ])
                // save last year's total
                if (i != years.length-1) app.lastTotal = Number(total.toFixed(0))
                row = {
                    year: 0, // fiscal years
                    bdg: 0, // budget
                    val: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] // corresponds to google datatable (above)
                }
            }

            // table options
            var options = {
                frozenColumns: 1,
                width: '100%'
            };

            // draw chart
            var table = new google.visualization.Table(document.getElementById('table'));
            table.draw(data, options)

            Vue.nextTick(function() {
                app.highlightNow()
                $('.google-visualization-table-th').click(function() { app.highlightNow() })
            })
        },

        highlightNow: function() {
            var l = app.rData.length-1
            var m = app.rData[l].Period + 1 // d.getMonth();
            var tds = $('td:nth-child(' + m + ')').toArray()
            $('th:nth-child(' + m + ')').css('background-color', '#7C4DFF')
            $('th:nth-child(' + m + ')').css('color', '#fff')
            for (var i in tds) {
                tds[i].style.backgroundColor = '#EDE7F6'
            }
        },

        // tie data to page
        calculations: function() {

            // set the current dates
            var l = app.rData.length-1
            this.thisMonthNum = this.rData[l].CalendarMonth
            this.thisMonth = monthNames[this.rData[l].CalendarMonth-1]
            this.lastMonth = monthNames[(this.rData[l-1].CalendarMonth-1) % 12]
            this.thisYear = this.rData[l].CalendarYear // 2 -> 5 for fiscal year
            this.thisFYear = this.rData[l].FiscalYear
            this.thisPeriod = (this.thisMonthNum >= 10) ? this.thisMonthNum - 9 : this.thisMonthNum + 3

            // set the last month with corrected year (if applicable)
            var date = new Date()
            date.setFullYear(this.thisYear)
            date.setMonth(this.thisMonthNum-1 - 1)
            this.lastMonthFull = monthNames[this.rData[l-1].CalendarMonth-1] + ' ' + this.rData[l-1].CalendarYear
            console.log(this.rData[l-1])

            // draw!
            app.drawPie()
            app.drawLineChart()
            app.drawTable()

            // fill out KPIs
            this.latestYrPct = this.calcPctDiffYear(this.rData[l])
            this.latestMoPct = this.calcPctDiffMonth(l)
            this.kpi1 = this.roundMillions(this.rData[l].Allocation)
            this.kpi2 = this.roundMillionsWithSign(this.rData[l].Allocation - this.rData[l-1].Allocation)
            this.kpi3 = (app.lastYtd.slice(-1)[0] / app.lastTotal * 100.00).toFixed(2) + '%'
            this.kpi4 = app.roundMillionsWithSign((app.lastYtd.slice(-1) - app.lastYtd.slice(-2,-1)).toFixed(1))

            // style this month's column
            $('.mini-card-header:eq(3)').height($('.mini-card-header:eq(2)').height())
        },

        // helper to add commas to numbers
        numberWithCommas: function(x) {
            var parts = x.toString().split(".");
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            return parts.join(".");
        },

        // hit web service
        fetchData: function() {
            $.post('http://eservices.cityoflewisville.com/citydata/?datasetid=DashSalesTaxCollectionsByMonth&datasetformat=json', function(data) {

                // set data
                app.rData = []
                data.Results.forEach(function(entry, i) {
                    var obj = {}
                    entry.forEach(function(field, i) {
                        obj[data.fieldnames[i]] = entry[i]
                    })
                    app.rData.push(obj)
                })

                // order data desc
                app.rData.sort(function(a, b) {
                    if (a.CalendarYear < b.CalendarYear) return -1
                    else if (a.CalendarYear > b.CalendarYear) return 1
                    else {
                        if (a.CalendarMonth < b.CalendarMonth) return -1
                        else if (a.CalendarMonth > b.CalendarMonth) return 1
                        return 0
                    }
                })

                // tie data to vue variables
                app.isLoading = false
                Vue.nextTick(function() {
                    app.calculations()

                    // adjust kpi card heights to match
                    Vue.nextTick(function() {
                        $('.mini-card-header:eq(3)').height($('.mini-card-header:eq(2)').height())
                    })
                })
            });
        },

        start: function() {
            // init stuff if needed
            app.fetchData()
        }
    },
    created: function() {
        console.log('vue ready');
    }
});


$(window).resize(function() {
    app.drawLineChart();
})

function googleReady() {
    console.log('google ready');
    app.start();
}