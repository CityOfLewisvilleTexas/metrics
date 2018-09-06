"use strict";

// Vue!
var app = new Vue({
    el: "#app",

    // vars
    data: {
        init: false,
        urls: {
            stats: 'http://stats.cityoflewisville.com/d/#/dashboard/stats',
            data: 'http://data.cityoflewisville.com/',
            metrics: './d'
        },
        isLoading: {
            responsetimes: true,
            codeenforcement: true,
            financehealth: true,
            categories: true,
            streets: true
        },
        cats: [],
        extLink: './d/#/dashboard/public/details/',
        modalDetails: '',
        citypriorities: [
            { bmpdisplayname: 'Citizen Involvement' },
            { bmpdisplayname: 'Controlling Costs' },
            { bmpdisplayname: 'Economic Base' },
            { bmpdisplayname: 'Financial Stability' },
            { bmpdisplayname: 'Infrastructure' },
            { bmpdisplayname: 'Recreation' },
            { bmpdisplayname: 'Safety and Security' },
            { bmpdisplayname: 'Stable Workforce' },
            { bmpdisplayname: 'Transportation' }
        ],
        departments: [
            { bmpdisplayname: 'Animal Services' },
            { bmpdisplayname: 'Citywide' },
            { bmpdisplayname: 'Code Enforcement' },
            { bmpdisplayname: 'Community Relations' },
            { bmpdisplayname: 'Court' },
            { bmpdisplayname: 'Economic Development' },
            { bmpdisplayname: 'Finance' },
            { bmpdisplayname: 'Fire' },
            { bmpdisplayname: 'Health' },
            { bmpdisplayname: 'Human Resources' },
            { bmpdisplayname: 'Information Technology' },
            { bmpdisplayname: 'Inspections and Permitting' },
            { bmpdisplayname: 'Library' },
            { bmpdisplayname: 'Neighborhood Services' },
            { bmpdisplayname: 'Parks and Recreation' },
            { bmpdisplayname: 'Planning' },
            { bmpdisplayname: 'Police' },
            { bmpdisplayname: 'Public Services' }
        ],
        tifValues: [
            { year: 2003, value:  99106955 },
            { year: 2004, value: 104538043 },
            { year: 2005, value: 108586756 },
            { year: 2006, value: 134616906 },
            { year: 2007, value: 144542076 },
            { year: 2008, value: 158192308 },
            { year: 2009, value: 135940593 },
            { year: 2010, value: 148150407 },
            { year: 2011, value: 138354534 },
            { year: 2012, value: 142543241 },
            { year: 2013, value: 161709229 },
            { year: 2014, value: 174784076 },
            { year: 2015, value: 182277890 },
            { year: 2016, value: 190906029 }
        ],
        data: {
            healthInspections: [],
            policeP1Times: [],
            fireP1Times: [],
            emsP1Times: [],
            potholeRepairs: [],
            streetsMap: [],
            salesTax: [],
            tifValue: [],
            raw_Police: [],
            raw_Fire: [],
            raw_EMS: []
        },
        lastUpdated: {
            police: '',
            fire: '',
            ems: '',
            health: '',
            code1: '',
            code2: '',
            streets1: '',
            streets2: '',
            tifValue: ''
        }
    },

    computed: {

        // format police data for google charts
        policeTimes: function() {

            // google chart headers
            var fin = this.data.policeP1Times.map(this.mapper.bind(this))
            fin.unshift(['Date', 'Response Time (min)', 'Total P1 Calls'])

            // google chart data
            var data = new google.visualization.arrayToDataTable(fin)
            return data
        },

        // format fire data for google charts
        fireTimes: function() {

            // google chart headers
            var fin = this.data.fireP1Times.map(this.mapper.bind(this))
            fin.unshift(['Date', 'Response Time (min)', 'Total Calls'])

            // google chart data
            var data = new google.visualization.arrayToDataTable(fin)
            return data
        },

        // format fire data for google charts
        emsTimes: function() {

            // google chart headers
            var fin = this.data.emsP1Times.map(this.mapper.bind(this))
            fin.unshift(['Date', 'Response Time (min)', 'Total Calls'])

            // google chart data
            var data = new google.visualization.arrayToDataTable(fin)
            return data
        },

        // format fire data for google charts
        potholeRepairs: function() {

            // google chart headers
            var fin = this.data.potholeRepairs.map(this.mapper.bind(this))
            fin.unshift(['Date', 'Repair Time (days)', 'Total Potholes'])

            // google chart data
            var data = new google.visualization.arrayToDataTable(fin)
            return data
        }
    },

    // start here
    mounted: function() {
        var el = document.querySelector('.parallax')
        var instance = M.Parallax.init(el, { responsiveThreshold: 0 })
        // return
        google.charts.load('current', {'packages':['corechart']})
        google.charts.setOnLoadCallback(this.fetchData)
    },

    // functions
    methods: {
        mapper: function(time) {
            return [time.date, time.value, time.count ? time.count : 0]
        },
        initMaterialize: function() {
            if (this.init) return
            this.init = true
            var el = document.querySelector('.sidenav')
            var instance = M.Sidenav.init(el, {})
            el = document.querySelector('#details-modal');
            instance = M.Modal.init(el, {});
        },
        openModal: function(id, category) {
            if (!this.init) return
            var el = document.querySelector(id)
            var instance = M.Modal.getInstance(el, {})
            instance.open()

            this.modalDetails = category
        },
        drawResponseTimes: function() {
            Vue.nextTick(this.drawChart('ps-line1', this.data.policeP1Times, ['#18FFFF','#EEFF41']))
            Vue.nextTick(this.drawChart('ps-line2', this.data.fireP1Times, ['#ff5252','#69F0AE']))
            Vue.nextTick(this.drawChart('ps-line3', this.data.emsP1Times, ['#B2FF59','#ff5252']))
        },
        drawStreets: function() {
            Vue.nextTick(this.drawChart('knm-line1', this.data.potholeRepairs, ['#18FFFF','#EEFF41'], 4))
        },
        drawFinance: function() {
            Vue.nextTick(this.drawFinanceChart('finance-chart', '#69F0AE'))
            Vue.nextTick(this.drawTIFChart('tif-chart', '#B2FF59'))
        },
        urlEncodeAddress: function(string) {
            return encodeURI(string + ' Lewisville, Tx')
        },

        fetchData: function() {
            // axios.post('http://query.cityoflewisville.com/v2/', {
            //     webservice: 'Performance Measures/Landing Page'
            // }).then(this.handleData)

            // Vue.nextTick(this.initMaterialize)
            // Vue.nextTick(this.initResizer)

            // categories
            axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Get All Categories', {}).then(this.handleData_categories)

            // response times
            axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Landing Page/ResponseTimes', {}).then(this.handleData_responsetimes)

            // code enforcement
            axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Landing Page/CodeEnforcement', {}).then(this.handleData_codeenforcement)

            // health and finance
            axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Landing Page/FinanceHealth', {}).then(this.handleData_healthfinance)

            // streets
            axios.post('http://query.cityoflewisville.com/v2/?webservice=Performance Measures/Landing Page/Streets', {}).then(this.handleData_streets)
        },

        handleData_responsetimes: function(results) {
            this.isLoading.responsetimes = false

            // police
            this.data.raw_Police = results.data.raw_Police
            this.data.policeP1Times = results.data.PoliceP1ResponseTimes
            this.lastUpdated.police = moment(results.data.PoliceP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

            // fire
            this.data.raw_Fire = results.data.raw_Fire
            this.data.fireP1Times = results.data.FireP1ResponseTimes
            this.lastUpdated.fire = moment(results.data.FireP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

            // EMS
            this.data.raw_EMS = results.data.raw_EMS
            this.data.emsP1Times = results.data.EMSP1ResponseTimes
            this.lastUpdated.ems = moment(results.data.EMSP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

            Vue.nextTick(this.drawResponseTimes)
            Vue.nextTick(this.initMaterialize)
        },

        handleData_codeenforcement: function(results) {
            this.isLoading.codeenforcement = false

            // code - compliance rate
            this.data.code1 = results.data.ComplianceRate[0]
            this.lastUpdated.code1 = moment(results.data.ComplianceRate.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

            // code - officer initiated rate
            this.data.code2 = results.data.OfficerInit[0]
            this.lastUpdated.code2 = moment(results.data.OfficerInit.slice(-1)[0].lastimported.replace('Z', '')).fromNow()
        },

        handleData_healthfinance: function(results) {
            this.isLoading.financehealth = false

            // health - list
            this.data.healthInspections = results.data.HealthInspections
            this.lastUpdated.health = moment(results.data.HealthInspections.slice(-1)[0].LastImported.replace('Z', '')).fromNow()
            // health - map
            Vue.nextTick(this.initHealthMap)

            // finance - sales tax
            this.data.salesTax = results.data.SalesTaxPerMonth.sort(function(a,b) {
                if (a.CalendarDate < b.CalendarDate) return -1
                if (a.CalendarDate > b.CalendarDate) return 1
                return 0
            })

            // finance - tif values
            this.tifValue = results.data.TIFValue[0]
            this.tifValues.push({ year: this.tifValues.slice(-1)[0].year+1, value: this.tifValue.TotalValue })

            Vue.nextTick(this.drawFinance)
            Vue.nextTick(this.initMaterialize)
        },

        handleData_streets: function(results) {
            this.isLoading.streets = false

            // streets - potholes
            this.data.potholeRepairs = results.data.PotholeRepairs
            this.lastUpdated.streets1 = moment(results.data.PotholeRepairs.slice(-1)[0].lastimported.replace('Z', '')).fromNow()
            // streets - map
            this.data.streetsMap = results.data.StreetsMap
            Vue.nextTick(this.initStreetsMap)
            this.lastUpdated.streets2 = moment(results.data.StreetsMap.slice(-1)[0].TODAY.replace('Z', '')).fromNow()

            Vue.nextTick(this.drawStreets)
            Vue.nextTick(this.initMaterialize)
        },

        handleData_categories: function(results) {
            this.isLoading.categories = false

            this.cats = results.data[0]
        },

        // handleData: function(results) {
        //     console.log(results.data)
        //     this.isLoading = false
        //     Vue.nextTick(this.initMaterialize)
        //     Vue.nextTick(this.initResizer)

        //     // categories
        //     this.cats = results.data.Categories

        //     // police
        //     this.data.raw_Police = results.data.raw_Police
        //     this.data.policeP1Times = results.data.PoliceP1ResponseTimes
        //     this.lastUpdated.police = moment(results.data.PoliceP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

        //     // fire
        //     this.data.raw_Fire = results.data.raw_Fire
        //     this.data.fireP1Times = results.data.FireP1ResponseTimes
        //     this.lastUpdated.fire = moment(results.data.FireP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

        //     // EMS
        //     this.data.raw_EMS = results.data.raw_EMS
        //     this.data.emsP1Times = results.data.EMSP1ResponseTimes
        //     this.lastUpdated.ems = moment(results.data.EMSP1ResponseTimes.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

        //     // health - list
        //     this.data.healthInspections = results.data.HealthInspections
        //     this.lastUpdated.health = moment(results.data.HealthInspections.slice(-1)[0].LastImported.replace('Z', '')).fromNow()
        //     // health - map
        //     Vue.nextTick(this.initHealthMap)

        //     // code - compliance rate
        //     this.data.code1 = results.data.ComplianceRate[0]
        //     this.lastUpdated.code1 = moment(results.data.ComplianceRate.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

        //     // code - officer initiated rate
        //     this.data.code2 = results.data.OfficerInit[0]
        //     this.lastUpdated.code2 = moment(results.data.OfficerInit.slice(-1)[0].lastimported.replace('Z', '')).fromNow()

        //     // streets - potholes
        //     this.data.potholeRepairs = results.data.PotholeRepairs
        //     this.lastUpdated.streets1 = moment(results.data.PotholeRepairs.slice(-1)[0].lastimported.replace('Z', '')).fromNow()
        //     // streets - map
        //     this.data.streetsMap = results.data.StreetsMap
        //     Vue.nextTick(this.initStreetsMap)
        //     this.lastUpdated.streets2 = moment(results.data.StreetsMap.slice(-1)[0].TODAY.replace('Z', '')).fromNow()

        //     // finance - sales tax
        //     this.data.salesTax = results.data.SalesTaxPerMonth.sort(function(a,b) {
        //         if (a.CalendarDate < b.CalendarDate) return -1
        //         if (a.CalendarDate > b.CalendarDate) return 1
        //         return 0
        //     })

        //     // finance - tif values
        //     this.tifValue = results.data.TIFValue[0]
        //     this.tifValues.push({ year: this.tifValues.slice(-1)[0].year+1, value: this.tifValue.TotalValue })

        //     Vue.nextTick(this.drawAll)
        // },

        initHealthMap: function() {
            var uluru = {lat: 33.047751, lng:  -96.997290}
            var map = new google.maps.Map(document.getElementById('health-map'), {
                zoom: 13,
                center: uluru
            })
            var kmlLayer = new google.maps.KmlLayer('https://sites.google.com/a/cityoflewisville.com/gis/files/CityLimitsPoly.kmz?attredirects=0&d=1', {
                suppressInfoWindows: true,
                preserveViewport: true,
                map: map
            })
            this.initHealthMarkers(map)
        },

        initStreetsMap: function() {
            var uluru = {lat: 33.047751, lng:  -96.997290}
            var map = new google.maps.Map(document.getElementById('streets-map'), {
                zoom: 13,
                center: uluru
            })
            var kmlLayer = new google.maps.KmlLayer('https://sites.google.com/a/cityoflewisville.com/gis/files/CityLimitsPoly.kmz?attredirects=0&d=1', {
                suppressInfoWindows: true,
                preserveViewport: true,
                map: map
            })
            this.initStreetsMarkers(map)
        },

        initStreetsMarkers: function(map) {
            var bounds = new google.maps.LatLngBounds()
            var infowindow = new google.maps.InfoWindow()
            var markers = []

            // console.log(this.data.streetsMap)

            // loop through markers
            this.data.streetsMap.forEach(function(wo,idx) {
                // if lat and long are present
                if (wo.lat && wo.lng) {
                    // push into array
                    markers.push(null)
                    var latlng = {lat: Number(wo.lat), lng: Number(wo.lng)}

                    // set marker "goal"
                    var goal = 0
                    if (wo.PROBLEMCODE.replace(/ /g, '').toLowerCase().indexOf('pothole') != -1) goal = 2
                    else if (wo.PROBLEMCODE.replace(/ /g, '').toLowerCase().indexOf('street') != -1) goal = 7
                    else if (wo.PROBLEMCODE.replace(/ /g, '').toLowerCase().indexOf('sidewalk') != -1) goal = 7

                    // set marker color
                    var color = 'grey'
                    if (wo.DAYDIFF < 0) {
                        if (wo.STATUS == 'IP') color = 'green'
                        else if (wo.STATUS == 'CLOSED' || wo.STATUS == 'NS') color = 'green'
                    }
                    else if (wo.DAYDIFF <= goal) color = 'green'
                    else if (wo.DAYDIFF > goal) color = 'red'

                    goal += ' days'

                    // push onto map
                    markers[idx] = new google.maps.Marker({
                        position: latlng,
                        map: map,
                        icon: 'assets/markers/' + color + '-dot.png'
                    })
                    markers[idx].id = wo.WORKORDERID

                    // extend bounds
                    bounds.extend(markers[idx].position)

                    // set up click listener
                    google.maps.event.addListener(markers[idx], 'click', (function(marker, i) {
                        return function() {
                            var content = '<table class="info-table"><tr><th>Workorder Type</th>'
                            content += '<td>' + wo.PROBLEMCODE + '</td></tr><tr><th>Description</th>'
                            content += '<td>' + wo.REQDESCRIPTION + '</td></tr><tr><th>Goal</th>'
                            content += '<td>' + goal + '</td></tr><tr><th>Time Taken (days)</th>'
                            content += '<td>' + ((wo.DAYDIFF < 0) ? '--' : Number(wo.DAYDIFF.toFixed(2)))  + '</td></tr><tr><th>Status</th>'
                            content += '<td>' + wo.STATUS + '</td></tr>'
                            infowindow.setContent(content)
                            infowindow.open(map, marker)
                            // map.panTo(marker.position)
                            // map.setZoom(15)
                        }
                    }.bind(this))(markers[idx], idx))
                }
            }.bind(this))

            // fit the markers on the map
            map.fitBounds(bounds)
        },

        initHealthMarkers: function(map) {
            var bounds = new google.maps.LatLngBounds()
            var infowindow = new google.maps.InfoWindow()
            var markers = []

            // loop through markers
            this.data.healthInspections.forEach(function(project,idx) {
                // if lat and long are present
                if (project.Lat && project.Lng) {
                    // push into array
                    markers.push(null)
                    var latlng = {lat: Number(project.Lat), lng: Number(project.Lng)};

                    // push onto map
                    markers[idx] = new google.maps.Marker({
                        position: latlng,
                        map: map
                    })
                    markers[idx].id = project.InspectionID

                    // extend bounds
                    bounds.extend(markers[idx].position)

                    // set up click listener
                    google.maps.event.addListener(markers[idx], 'click', (function(marker, i) {
                        return function() {
                            var content = '<table class="info-table"><tr><th>Business Name</th>'
                            content += '<td>' + project.BusinessName + '</td></tr><tr><th>Address</th>'
                            content += '<td>' + project.BusinessAddress + '</td></tr><tr><th>Score</th>'
                            content += '<td>' + project.Score + '</td></tr>'
                            infowindow.setContent(content)
                            infowindow.open(map, marker)
                            // map.setCenter(marker.position)
                            // map.setZoom(15)
                        }
                    }.bind(this))(markers[idx], idx))
                }
            }.bind(this))

            // fit the markers on the map
            map.fitBounds(bounds)
        },

        drawChart: function(id, data, colors, max) {
            var ctx = document.querySelector('canvas#'+id+'.cvs')
            var config = {
                type: 'line',
                data: {
                    labels: data.map(function(time) { return time.date }),
                    datasets: [
                        {
                            label: 'Total '+(id.indexOf('knm')==-1?(id.indexOf('ps-line1')==-1?'Calls':'P1 Calls'):'Open Work Orders'),
                            // backgroundColor: ,
                            borderColor: colors[1],
                            pointRadius: 0,
                            data: data.map(function(time) { return time.count }),
                            spanGaps: false,
                        },
                        {
                            label: 'Response Time ('+(id.indexOf('knm')==-1?'min':'days')+')',
                            backgroundColor: colors[0],
                            borderColor: colors[0],
                            pointRadius: 0,
                            data: data.map(function(time) { return Number(time.value.toFixed(2)) }),
                            spanGaps: false,
                        }
                    ],
                },
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    title: {
                        display: false
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                suggestedMin: 0,
                                suggestedMax: (max) ? max : 10,
                                fontColor: 'white'
                            },
                            display: true,
                            scaleLabel: {
                                display: false,
                                labelString: 'Minutes',
                                color: 'white'
                            },
                            gridLines: {
                                drawBorder: false,
                                color: '#90A4AE'
                            }
                        }],
                        xAxes: [{
                            ticks: {
                                fontColor: 'white'
                            },
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }]
                    },
                    legend: {
                        labels: {
                            fontColor: 'white'
                        }
                    },
                    animation: {
                        duration: 1500
                    }
                }
            }
            var chart = new Chart(ctx, config)
        },

        drawFinanceChart: function(id, color) {

            // get year totals
            var result = []
            this.data.salesTax.reduce(function (res, value) {
                if (!res[value.FiscalYear]) {
                    res[value.FiscalYear] = {
                        Allocation: 0,
                        Year: value.FiscalYear
                    };
                    result.push(res[value.FiscalYear])
                }
                res[value.FiscalYear].Allocation += value.Allocation
                return res
            }, {})

            var d = new Date()
            var lower = (d.getMonth() >= 9) ? d.getFullYear() - 9 : d.getFullYear() - 10
            var upper = (d.getMonth() >= 9) ? d.getFullYear() - 0 : d.getFullYear() - 1
            result = result.filter(function(year) {
                return year.Year >= lower && year.Year <= upper
            })

            var ctx = document.querySelector('canvas#'+id+'.cvs')
            var config = {
                type: 'line',
                data: {
                    labels: result.map(function(year) { return year.Year }),
                        // this.data.salesTax
                        //     .filter(function(entry) {
                        //         return entry.CalendarMonth == 2 && moment(entry.CalendarDate.replace('Z','')).format('YYYY') >= new Date().getFullYear() - 10 })
                        //     .map(function(entry) { return moment(entry.CalendarDate.replace('Z','')).format('YYYY-MM-DD') }),
                    datasets: [
                        {
                            label: 'Sales Tax Receipt',
                            // backgroundColor: color,
                            borderColor: color,
                            pointRadius: 0,
                            data: result.map(function(year) { return year.Allocation.toFixed(2) }), // this.data.salesTax.map(function(entry) { return entry.Allocation }),
                            spanGaps: false,
                        }
                    ],
                },
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    title: {
                        display: false
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                suggestedMin: 0,
                                // suggestedMax: (max) ? max : 10,
                                fontColor: 'white'
                            },
                            display: true,
                            scaleLabel: {
                                display: false,
                                labelString: 'Minutes',
                                color: 'white'
                            },
                            gridLines: {
                                drawBorder: false,
                                color: '#90A4AE'
                            }
                        }],
                        xAxes: [{
                            ticks: {
                                fontColor: 'white'
                            },
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }]
                    },
                    legend: {
                        labels: {
                            fontColor: 'white'
                        }
                    },
                    animation: {
                        duration: 1500
                    }
                }
            }
            var chart = new Chart(ctx, config)
        },

        drawTIFChart: function(id, color) {
            var ctx = document.querySelector('canvas#'+id+'.cvs')
            var config = {
                type: 'bar',
                data: {
                    labels:
                        this.tifValues
                            // .filter(function(year) { return year.year >= new Date().getFullYear() - 10 })
                            .map(function(year) { return year.year }),
                    datasets: [
                        {
                            label: 'Value',
                            backgroundColor: color,
                            borderColor: color,
                            pointRadius: 0,
                            data: this.tifValues.map(function(year) { return year.value }),
                            spanGaps: false,
                        }
                    ],
                },
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    title: {
                        display: false
                    },
                    tooltips: {
                        mode: 'index',
                        intersect: false
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                suggestedMin: 0,
                                // suggestedMax: (max) ? max : 10,
                                fontColor: 'white'
                            },
                            display: true,
                            scaleLabel: {
                                display: false,
                                labelString: 'Minutes',
                                color: 'white'
                            },
                            gridLines: {
                                drawBorder: false,
                                color: '#90A4AE'
                            }
                        }],
                        xAxes: [{
                            ticks: {
                                fontColor: 'white'
                            },
                            gridLines: {
                                display: false,
                                drawBorder: false
                            }
                        }]
                    },
                    legend: {
                        labels: {
                            fontColor: 'white'
                        }
                    },
                    animation: {
                        duration: 1500
                    }
                }
            }
            var chart = new Chart(ctx, config)
        },

        prettyDate: function(date, format) {
            return moment(date).format(format)
        },

        prettyNum: function(num) {
            return isNaN(num) ? '--' : Number(num.toFixed(1))
        },

        prettyName: function(name) {
            return name.replace(/ /g, '').toLowerCase()
        }
    }
})