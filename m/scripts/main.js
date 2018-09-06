var app = angular.module('app', ['googlechart', 'ui.bootstrap', 'ngRoute']);
var _TESTING = {};
var tester;

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'views/home.html',
            controller: 'ctrl_home as vm'
        })
        .when('/home', {
            templateUrl: 'views/home.html',
            controller: 'ctrl_home as vm'
        })
        .when('/home/:type', {
            templateUrl: 'views/home.html',
            controller: 'ctrl_home as vm'
        })
        .when('/details', {
            templateUrl: 'views/details.html',
            controller: 'ctrl_details as vm'
        })
        .when('/details/:type/:categoryid', {
            templateUrl: 'views/details.html',
            controller: 'ctrl_details as vm'
        })
        .when('/details/:type/:categoryid/:edit', {
            templateUrl: 'views/details.html',
            controller: 'ctrl_details as vm'
        })
        .otherwise({
            redirectTo: '/home'
        })
}]);

//SERVICE - Categories (Big moves, priorities and departments)
app.service("svc_categories", function($http, svc_utilities) {
    var svc = this;

    svc.categories = [];

    //Get big moves, priorities and departments (PSOFIA form #40)
    svc.get_listOfBigMovesPrioritiesDepartments = function(_settings) {

            $http.jsonp("http://eservices.cityoflewisville.com/citydata/?datasetid=DashGetAllCategory2&datasetformat=jsonp&callback=JSON_CALLBACK")
                .success(function(data) {
                    var _data = svc_utilities.JsonPropsToLower(data.results);
                    console.log(_data)
                    if (_data[0]) {
                        _data.sort(function(a,b) {
                            if (a.bmpdisplayname < b.bmpdisplayname) return -1
                            if (a.bmpdisplayname > b.bmpdisplayname) return 1
                            return 0
                        })
                        // console.log(_data)
                        svc.categories = _data.map(function(e) {
                            return {
                                type: e.bmptype,
                                id: e.bmpid,
                                title: e.bmpdisplayname,
                                description: e.bmpdescription,
                                icon: e.bmpicon,
                                orderby: 0,//(e.orderby ? parseInt(e.orderby) : 9999),
                                url: e.bmpurl,
                                urlmask: e.bmpurlmask,
                                editurl: e.editurl
                            }
                        })

                        //Callback
                        if (_settings && _settings.hasOwnProperty("onsuccess")) {
                            _settings.onsuccess();
                        }
                    } else {
                        console.warn("Ajax: get_listOfBigMoves is empty")
                        console.log(_data);
                    }
                });
        } //end

    //Filter: By Category
    svc.filter_by_type = function(_type) {
        return svc.categories.filter(function(e) {
            return e.type == _type })
    }

    //Filter: By ID
    svc.filter_by_id = function(_id) {
        if (_id == 'all') {
            return [{ title: "All Metrics" }];
        } else {
            return svc.categories.filter(function(e) {
                return e.id == _id })
        }
    }

    // alphabetize
    svc.alphabetize = function() {
        var these = svc.categories
        these.sort(function(a,b) {
            if (a.title < b.title) return -1
            if (a.title > b.title) return 1
            return 0
        })
        return svc.categories.categories
    }

    //Has url field
    svc.hasUrlField = function(_id) {
        if (typeof svc.filter_by_id(_id)[0] != 'undefined') {
            if (svc.filter_by_id(_id)[0].url && svc.filter_by_id(_id)[0].url.length != 0) {
                return true;
            } else {
                return false;
            }
        }
    }
    return svc;
}); //end service


//SERVICE - Metrics and metric-data
app.service("svc_metrics", function($http, svc_utilities, $timeout) {
    var svc = this;
    svc.metrics = [];
    svc.inDev = false

    //Get
    svc.get_listOfMetrics = function(_settings) {
            // console.group("svc_metrics.metrics")

            $http.jsonp("http://eservices.cityoflewisville.com/citydata/?datasetid=DashGetAllPMs3_1&datasetformat=jsonp&callback=JSON_CALLBACK")
                .success(function(data) {
                    // svc.loading = false
                    var _data = svc_utilities.JsonPropsToLower(data.results);

                    if (_data[0] && _data[0].hasOwnProperty("psofia_recordid") == true) {

                        tester = svc.metrics = _data.filter(function(e) {
                            return e.metricispublic == 'true' });

                        //Fix orderby
                        svc.metrics.forEach(function(e) {
                            e.orderby = (e.orderby ? parseInt(e.orderby) : 9999);
                        });

                        // console.log(svc.metrics);

                        //Callback
                        if (_settings && _settings.hasOwnProperty("onsuccess")) {
                            _settings.onsuccess();
                        }

                        // svc.setDev(1)

                    } else {
                        console.warn("Ajax: get_listOfMetrics error")
                        console.log(_data);
                    }
                });

            //console.groupEnd();
        } //end get

    //Update metric
    svc.update_metric = function(_id, _prop, _val) {
        // this.inDev = false
        svc.metrics.filter(function(e) {
            return e.id == _id;
        })[0][_prop] = _val;
    }

    //Filter: Metrics - By ID
    svc.filter_by_id = function(_id) {
        return svc.metrics.filter(function(e) {
            return e.id == _id });
    }

    //Filter: Metrics - By IDs
    svc.filter_by_ids = function(_ids) {
        return svc.metrics.filter(function(e) {
            if (_ids.indexOf(e.psofia_recordid) > -1) {
                return e;
            }
        });
    }

    // tell if there are more than 0 of type 'type'
    svc.type_exists = function(type, id) {

        var values = []
        if (type=='department') 
            values = svc.metrics.filter(function(e) {
                return e.category1 == id;
            })
        else if (type=='priority') 
            values = svc.metrics.filter(function(e) {
                return e.category3 == id;
            })
        else if (type=='bigmove') 
            values = svc.metrics.filter(function(e) {
                return e.category2 == id;
            })

        if (values.length > 0) return true;
        else return false;

        // for (i in svc.metrics) {
        //     if (svc.metrics[i].metrictype.toLowerCase() == type) return true;
        // }
        // return false;
    }

    svc.setDev = function(num) {
        // console.log('setting')
        if (!num) this.inDev = true
        else this.inDev = false
    }

    svc.checkDev = function() {
        // console.log('checking', this.inDev)
        if (this.inDev) return true
        else return false
    }

    //Filter: Metrics - By Category
    svc.filter_by_category_type = function(_type, _id) {
        var _val = 0;
        var svc = this
        // console.log(svc.metrics)
        if (_type == 'priority') {
            _val = svc.metrics.filter(function(e) {
                return e.category3.toLowerCase().replace(/-/g, '') == _id.toLowerCase().replace(/-/g, '');
            });
        }
        if (_type == 'bigmove') {
            _val = svc.metrics.filter(function(e) {
                return e.category2.toLowerCase().replace(/-/g, '') == _id.toLowerCase().replace(/-/g, '');
            });
        }
        if (_type == 'department') {
            _val = svc.metrics.filter(function(e) {
                return e.category1 == _id;
            });
        }
        if (_type == 'all' && _id == 'all') {
            _val = svc.metrics;
        }

        return _val;
    }

    //Filter: Metrics - By Category / Metric Type
    svc.filter_by_category_metricType = function(_type, _id, _metricType) {
        var _val = 0;
        if (_type == 'priority') {
            _val = svc.metrics.filter(function(e) {
                return e.category3.toLowerCase().replace(/-/g, '') == _id.toLowerCase().replace(/-/g, '');
            });
        }
        if (_type == 'bigmove') {
            _val = svc.metrics.filter(function(e) {
                return e.category2.toLowerCase().replace(/-/g, '') == _id.toLowerCase().replace(/-/g, '');
            });
        }
        if (_type == 'department') {
            _val = svc.metrics.filter(function(e) {
                return e.category1 == _id && e.metrictype.toLowerCase() == _metricType;
            });
        }
        if (_type == 'all' && _id == 'all') {
            _val = svc.metrics;
        }
        return _val;
    }

    //Count by category/type
    svc.count_by_category_type = function(_type, _id) {
        return svc.filter_by_category_type(_type, _id).length;
    }

    //Has url field
    svc.hasUrlField = function(_id) {
        if (svc.filter_by_id(_id)[0].url && svc.filter_by_id(_id)[0].url.length != 0) {
            return true;
        } else {
            return false;
        }
    }

}); //end svc_metrics

//SERVICE - Cityscore
app.service("svc_cityscore", function($http, svc_utilities, $timeout) {
    var svc = this;
    svc.data = [];

    svc.get = function() {
        $http.jsonp("http://eservices.cityoflewisville.com/citydata/?datasetid=MetricsGetCityScoreAverage&datasetformat=jsonp&callback=JSON_CALLBACK")
            .success(function(data) {
                var _data = svc_utilities.JsonPropsToLower(data.results);
                svc.data = _data[0];
            });
    }

    return svc;
});




//....................................................................................
//....................................................................................
//....................................................................................
//CONTROLLERS
//CONTROLLERS
//....................................................................................
//....................................................................................
//....................................................................................


//CONTROLLER - ctrl-home (home.html)
app.controller("ctrl_home", ['svc_utilities', 'svc_categories', 'svc_metrics', 'svc_charts', '$routeParams', '$interval',
    function(svc_utilities, svc_categories, svc_metrics, svc_charts, $routeParams, $interval) {
        var ctrl = this;

        //References to services that will be available to the front-end
        ctrl.categories = svc_categories;
        ctrl.metrics = svc_metrics;
        ctrl.charts = svc_charts.gauges.objects;
        ctrl.util = svc_utilities;
        _TESTING = ctrl;

        //Controller settings

        //Tab (categoryid)
        if ($routeParams.type && ['priority', 'bigmove', 'department'].indexOf($routeParams.type) > -1) {
            ctrl.tab = $routeParams.type;
        } else {
            ctrl.tab = 'department'
        }

        //Init 
        ctrl.init = function() {

            //Get list of categories (for sidebar / landing page)
            svc_categories.get_listOfBigMovesPrioritiesDepartments({
                onsuccess: function() {

                    //Get a list of all metrics (no values yet, just a list)
                    svc_metrics.get_listOfMetrics({
                        onsuccess: function() {

                            //Get metric values and create gauges
                            //Filter to metrics that display gauges (metrictype = query OR (metrictype = static AND staticsymbol = gauge)):
                            var _metricsWithGauges = svc_metrics.metrics.filter(function(e) {
                                return e.metrictype.toLowerCase() == 'query' || (e.metrictype.toLowerCase() == 'static' && e.staticsymbol.toLowerCase() == 'gauge');
                            });
                            svc_charts.gauges.create(_metricsWithGauges);
                        }
                    });
                }
            });
        }

        ctrl.init();
    }
]); //end controller

//CONTROLLER - ctrl-details (details.html)
app.controller("ctrl_details", ['svc_utilities', 'svc_categories', 'svc_metrics', 'svc_cityscore', 'svc_charts', '$routeParams', '$location', '$interval', '$scope',
    function(svc_utilities, svc_categories, svc_metrics, svc_cityscore, svc_charts, $routeParams, $location, $interval, $scope) {
        var ctrl = this;

        //References to services that will be available to the front-end
        ctrl.categories = svc_categories;
        ctrl.metrics = svc_metrics;
        ctrl.cityscore = svc_cityscore;
        ctrl.charts = {
            gauges: svc_charts.gauges,
            linecharts: svc_charts.linecharts,
            tables: svc_charts.tables
        };
        ctrl.util = svc_utilities;
        ctrl.editmode = false;

        _TESTING = ctrl;

        //Local settings
        ctrl.currentmetricindex = 0;

        //Controller settings
        if ($routeParams.categoryid) {
            ctrl.selectedCategory = { type: $routeParams.type, categoryid: $routeParams.categoryid };
        } else {
            ctrl.selectedCategory = { type: 'priority', categoryid: 'infrastructure' }; //initial category to show
        }

        if ($routeParams.edit) {
            ctrl.editmode = true;
        }

        //Init 
        ctrl.init = function() {

            //Get categories
            svc_categories.get_listOfBigMovesPrioritiesDepartments({
                onsuccess: function() {

                    //Get query-based metrics
                    svc_metrics.get_listOfMetrics({
                        onsuccess: function() {
                            var _type = ctrl.selectedCategory.type;
                            var _categoryid = ctrl.selectedCategory.categoryid;
                            var _metrics = svc_metrics.filter_by_category_type(_type, _categoryid);

                            if (ctrl.metrics.filter_by_category_type(_type, _categoryid).length != 0) {
                                ctrl.metrics.setDev(1)
                                // console.log(ctrl.metrics.filter_by_category_type(_type, _categoryid).length, ctrl.metrics.inDev)
                            }
                            else
                                ctrl.metrics.setDev(0)

                            //Metric with gauges (metrictype = query OR (metrictype = static AND staticsymbol = gauge)):
                            var _metricsWithGauges = _metrics.filter(function(e) {
                                var _type = (e.metrictype == null ? 'query' : e.metrictype.toLowerCase());
                                var _symbol = (e.staticsymbol == null ? '' : e.staticsymbol.toLowerCase());
                                return _type == 'query' || (_type == 'static' && _symbol == 'gauge');
                            });
                            svc_charts.gauges.create(_metricsWithGauges);
                        }
                    });
                }
            });

            //Get cityscore
            //svc_cityscore.get();

            //$interval(function(){
            //	svc_cityscore.get();
            //},60000);
        }



        ctrl.init();
    }
]); //end controller

//SERVICE - svc-charts
app.service('svc_charts', function($http, svc_utilities, svc_metrics, $interval) {
    var svc = this;

    //Gauges
    svc.gauges = {
            objects: {},
            create: function(_objects) {

                var _self = svc.gauges.objects;
                var _formatter = { number: [{ suffix: '%', pattern: '#' }] };

                //http://angular-google-chart.github.io/angular-google-chart/docs/latest/examples/gauge/
                _objects.forEach(function(pm) {
                    _self["gauge_" + pm.id] = {};
                    _self["gauge_" + pm.id].type = "Gauge";

                    _self["gauge_" + pm.id].options = {
                        width: 475,
                        height: 195,
                        yellowFrom: pm.gaugeyellowfromamount,
                        yellowTo: pm.gaugeyellowtoamount,
                        greenFrom: pm.gaugegreenfromamount,
                        greenTo: pm.gaugegreentoamount,
                        redFrom: pm.gaugeredfromamount,
                        redTo: pm.gaugeredtoamount,
                        minorTicks: 5,
                        max: pm.gaugemaxvalue || 100,
                        min: pm.gaugeminvalue || 0
                    };

                    _self["gauge_" + pm.id].data = [
                        ['Label', ''],
                        ['', 0]
                    ];

                    //Format percents
                    if (pm.gaugedataformat.toUpperCase() == 'PERCENT') {
                        _self["gauge_" + pm.id].formatters = {
                            number: [{
                                columnNum: 1,
                                suffix: '%',
                                pattern: '#'
                            }]
                        };;
                    }
                });

                //Initial get
                svc.gauges.getData(_objects);

                //Refresh data every 1 minute
                // REFRESHDATA
                $interval(function() {
                    svc.gauges.getData(_objects);
                }, 1000*60)

            }, //end create()

            getData: function(_objects) {
                    var _self = svc.gauges.objects;

                    _objects.forEach(function(pm) {

                        //Get latest data for this metric
                        //Expected format: {"results":[{"Date":"2016-04-11","Value":39,"LastImported":"2016-04-11 19:06:05"},{"Date":"2016-04-09","Value":37,"LastImported":"2016-04-09 23:58:05"}}
                        //Most recent date's data should be in index 0
                        //replaced pm.realtimeurl with pm.uspname
                        $http.jsonp("http://eservices.cityoflewisville.com/citydata?datasetid=MetricsGetDetailOrAggV2&detoravg=AGG&psofia_recordid=" + pm.psofia_recordid + "&datasetformat=jsonp&callback=JSON_CALLBACK")
                            .success(function(data) {
                                //Convert all object properties to lowercase for consistent results
                                var _data = JSON.parse(JSON.stringify(data.results).replace(/"([^"]+)":/g, function($0, $1) {
                                    return ('"' + $1.toLowerCase() + '":'); }));

                                pm.gaugedata = _data;


                                //Re-format date-fields
                                _data.forEach(function(e) {
                                    try {
                                        //Reformat the '[date]' field to a JS date
                                        e.date = new Date(e.date.substr(0, 4), e.date.substr(5, 2) - 1, e.date.substr(8, 2));

                                        //Reformat 'percent' fields
                                        if (pm.gaugedataformat.toUpperCase() == 'PERCENT') {
                                            e.value = parseFloat(e.value) * 100;
                                        }
                                    } catch (e) {
                                        console.log(e);
                                    }
                                }); //end forEach

                                //Format data in Google Chart format: [date,value]
                                var _dataFormatted = _data.map(function(e) {
                                    return [e.date, e.value]
                                });

                                //Update svc_metrics - add 'data' property
                                svc_metrics.update_metric(pm.id, "data", _dataFormatted);

                                //Update local 'data property'
                                pm.data = _dataFormatted;

                                // truncate integers to 1 trailing decimal
                                for (var i in pm.gaugedata) {
                                    pm.gaugedata[i].value = Number(pm.gaugedata[i].value)
                                	if (pm.gaugedata[i].value != pm.gaugedata[i].value.toFixed(1))
                                		pm.gaugedata[i].value = pm.gaugedata[i].value.toFixed(1);
                                }

                                //Difference from yesterday
                                var _differenceamount = (pm.data[0] && pm.data[1] ? (pm.data[0][1] - pm.data[1][1]).toFixed(2) : 0);
                                svc_metrics.update_metric(pm.id, "diff_value", _differenceamount);

                                if (_differenceamount < 0) {
                                    svc_metrics.update_metric(pm.id, "diff_color", { color: pm.realtimetrendarrowcolordown });
                                    svc_metrics.update_metric(pm.id, "diff_symbol", "▼");
                                }
                                if (_differenceamount > 0) {
                                    svc_metrics.update_metric(pm.id, "diff_color", { color: pm.realtimetrendarrowcolorup });
                                    svc_metrics.update_metric(pm.id, "diff_symbol", "▲");
                                }
                                if (_differenceamount == 0) {
                                    svc_metrics.update_metric(pm.id, "diff_color", { color: "gray" });
                                    svc_metrics.update_metric(pm.id, "diff_symbol", "-");
                                }

                                //Current count
                                if (_data[0] && _data[0].hasOwnProperty("numerator")) {
                                    svc_metrics.update_metric(pm.id, "numerator", _data[0].numerator);
                                }
                                if (_data[0] && _data[0].hasOwnProperty("denominator")) {
                                    svc_metrics.update_metric(pm.id, "denominator", _data[0].denominator);
                                }

                                //Create Google Gauge object
                                _self["gauge_" + pm.id].data[1] = pm.data[0];

                                // red only shows if within the red range
                                var val = _self["gauge_" + pm.id].data[1][1]
                                var lower = Number(_self["gauge_" + pm.id].options.redFrom)
                                var upper = Number(_self["gauge_" + pm.id].options.redTo)
                                if (between(lower, upper, val)) {
                                    _self["gauge_" + pm.id].options.redColor = '#d50000'
                                    $('#int_'+pm.id).css('color', '#d50000')
                                }

                            }); //end success

                        // taken from above
                        // ensures that the gauges are redrawn every time data is retrieved
                        // -colton
                        _self["gauge_" + pm.id] = {};
                        _self["gauge_" + pm.id].type = "Gauge";

                        _self["gauge_" + pm.id].options = {
                            width: 475,
                            height: 195,
                            redFrom: pm.gaugeredfromamount,
                            redTo: pm.gaugeredtoamount,
                            yellowFrom: pm.gaugeyellowfromamount,
                            yellowTo: pm.gaugeyellowtoamount,
                            greenFrom: pm.gaugegreenfromamount,
                            greenTo: pm.gaugegreentoamount,
                            greenColor: '#048204',
                            yellowColor: '#10d310',
                            minorTicks: 5,
                            max: pm.gaugemaxvalue || 100,
                            min: pm.gaugeminvalue || 0
                        };

                        _self["gauge_" + pm.id].data = [
                            ['Label', ''],
                            ['', 0]
                        ];

                        //Format percents
                        if (pm.gaugedataformat.toUpperCase() == 'PERCENT') {
                            _self["gauge_" + pm.id].formatters = {
                                number: [{
                                    columnNum: 1,
                                    suffix: '%',
                                    pattern: '#'
                                }]
                            };;
                        }
                    }); //end foreach


                } //end getData()
        } //end gauges

    //Linecharts
    svc.linecharts = {
            objects: {},

            //Called by <button> in details.html view
            //http://angular-google-chart.github.io/angular-google-chart/docs/latest/examples/multi-chart/
            create: function(_id) {
                var _self = svc.linecharts.objects;
                _self["linechart_" + _id] = {};
                _self["linechart_" + _id].type = "AreaChart";
                _self["linechart_" + _id].data = [
                    ['Label', '']
                ];
                var options = {
                    legend: 'none',
                    lineWidth: 3,
                    height: 300,
                    series: {
                        0: { color: '#5E2590' }
                    },
                    trendlines: {
                        0: { color: 'gray' }
                    },
                    vAxis: {
                        viewWindowMode: 'explicit'
                    }
                };
                _self["linechart_" + _id].options = options;

                //Get the metric
                var _metric = svc_metrics.metrics.filter(function(e) {
                    return e.id == _id;
                })[0];

                _self["linechart_" + _id].data.push.apply(_self["linechart_" + _id].data, _metric.data);
                var data = _self["linechart_" + _id].data
                console.log(data)
                var min = data.slice(1).reduce(function(a,b) {
                    return Math.min(a, b[1])
                }, data[1][1])
                var max = data.slice(1).reduce(function(a,b) {
                    return Math.max(a, b[1])
                }, data[1][1])
                var dev = (max - min) / 10
                console.log(min-dev, max+dev)
                options.vAxis = {
                    viewWindow: {
                        max: max+dev,
                        min: min-dev
                    },
                    minValue: min-dev,
                    maxValue: max+dev
                }
            }
        } //end linecharts

    //Details Table
    svc.tables = {
        objects: {},
        create: function(_index) {

            var _self = svc.tables.objects;
            svc.tables.isloading = true;

            //Get the metric
            var _metric = svc_metrics.metrics.filter(function(e) {
                return e.id == _index;
            })[0];

            if (_metric.detailsurl.length == 0) {
                alert("A details-query has not yet been created for this metric.");

            } else {

                //_metric.detailsurl replaced with _metric.uspname
                $http.jsonp('http://eservices.cityoflewisville.com/citydata?datasetid=MetricsGetDetailsOrAvg&detoravg=Details&uspname=' + _metric.uspname + '&datasetformat=jsonp&callback=JSON_CALLBACK')
                    .success(function(data) {

                        console.log(_metric.uspname)
                        console.log(data)

                        //Convert to Google arrayToDataTable format
                        var _data = [];
                        data.results.forEach(function(e, i) { _data[i] = Object.keys(e).map(function(k) {
                                return e[k]; }); });

                        //Table Header
                        _data.unshift(Object.keys(data.results[0]));

                        _self["table_" + _index] = {};
                        _self["table_" + _index].type = "Table";
                        _self["table_" + _index].data = _data;
                        _self["table_" + _index].options = {
                            showRowNumber: false,
                            //width: '100%', 
                            height: '360px',
                            //page: 'enable', 
                            //pageSize: 11,
                            cssClassNames: { headerRow: 'details-table-th', tableCell: 'details-table-td' }
                        };

                        _metric.tabledata = _data;
                        console.log(_metric.tabledata)

                        svc.tables.isloading = false;
                    });
            }
        }
    }
    return svc;
});

//SERVICE - Utility Functions
app.service("svc_utilities", function() {
    var svc = this;

    //URL Parameters
    svc.getURLParameter = function(name) {
        return decodeURIComponent((new RegExp('[?|&]' + name.toLowerCase() + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search.toLowerCase()) || [, ""])[1].replace(/\+/g, '%20')) || null;
    };
    //Json property-names to lower case
    svc.JsonPropsToLower = function(_json) {
        return JSON.parse(JSON.stringify(_json).replace(/"([^"]+)":/g, function($0, $1) {
            return ('"' + $1.toLowerCase() + '":'); }));
    };

    //Date difference
    svc.ui_DateDifference = function(_datestring) {
        //_datestring = year-mo-dy hh:mm:ss
        var _val = '?';


        if (typeof(new Date(_datestring)) !== "undefined") {
            var _date = Date.parse(_datestring); //Use DateJS.js library to properly parse the date string
            var _now = new Date();

            // get total seconds between the times
            var delta = Math.abs(_date - _now) / 1000;

            // calculate (and subtract) whole days
            var days = Math.floor(delta / 86400);
            delta -= days * 86400;

            // calculate (and subtract) whole hours
            var hours = Math.floor(delta / 3600) % 24;
            delta -= hours * 3600;

            // calculate (and subtract) whole minutes
            var minutes = Math.floor(delta / 60) % 60;
            delta -= minutes * 60;

            // what's left is seconds
            var seconds = delta % 60; // in theory the modulus is not required

            if (days > 0) {
                _val = days + ' days, ' + hours + ' hours';
            }
            if (days <= 0 && hours > 0) {
                _val = hours + ' hours, ' + minutes + ' minutes';
            }
            if (days <= 0 && hours <= 0 && minutes > 0) {
                _val = minutes + '.' + (seconds / 60).toFixed(0) + ' minutes';
            }
            if (days <= 0 && hours <= 0 && minutes <= 0 && seconds > 0) {
                _val = seconds.toFixed(0) + ' seconds';
            }
        }
        return _val + ' ago';
    };

    svc.shrink = function(text) {
        try {
            var num = Number(text)
            if (num > 3) return true
        } catch(e) {
            ;
        }
    };

    //Metric-Current-Count
    svc.metric_current_count = function(_metric) {
        var _val = "";

        if (_metric.numerator && _metric.denominator) {
            _val = _metric.numerator + ' of ' + _metric.denominator;
        }
        if (_metric.numerator && !_metric.denominator) {
            _val = _metric.numerator;
        }

        return _val;
    }


    return svc;

}); //end svc_utilities

var between = function(a,b,c){
    if(a>b)
        return c>=b && c<=a
    else
        return c>=a && c<=b
}