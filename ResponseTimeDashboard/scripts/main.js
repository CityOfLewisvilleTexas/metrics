google.load("visualization", "1", { packages: ["corechart", "table"] });
google.setOnLoadCallback(doOnVisualizationLoad);

function doOnVisualizationLoad() {
    App.init();
}
//["#800000","#d62929","#A0522D","#8B4513","#D2691E","#DEB887","#B8860B","#DAA520","#F4A460","#BC8F8F","#D2B48C","#DEB887","#F5DEB3","#FFDEAD"]
var App = (function() {
    return {
        init: function() {
            var that = this;
            that.date1 = new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate());
            that.date2 = new Date();
            that.getData();
            that.setUi();
        },
        data1: 0,
        pieData: 0,
        columnData: 0,
        colors: ["#5E2590", "#C29AE5", "#109618", "#808080", "#C3DAEF", "#F3EBFA", "#286090", "#666699"],
        department: function() {
            var that = this;
            var _urlparam = that.getUrlParameterValueByName("department");
            return (["police", "fire"].indexOf(_urlparam) > -1 ? _urlparam : "police");
        },
        webservice: {
            police: {
                data: "DashResponseTime2",
                history: "DashResponseTimeHist1",
                callsbytype: "DashPDCallsPerComplaint",
                narrative: "Data is for non-officer-initiated calls for service (ie calls from residents for service). Data is filtered to priority 1 call types. Response time is calculated from the time the call was received in the dispatch center to when the first police-unit arrived on the scene. This data has not been audited and is pulled live from the computer aided dispatch database."
            },
            fire: {
                data: "DashResponseTime2FD",
                history: "DashResponseTimeHist1FD",
                callsbytype: "DashFDCallsPerComplaint",
                narrative: "Data is filtered to priority 1 types. Response time is calculated from the time the call was received to when the first fire-unit arrived on the scene. This data has not been audited and is pulled live from the computer aided dispatch database."
            }
        },
        setUi: function() {
            var that = this;

            //Site title and narrative (based on department)
            var _dept = that.department();
            $(".nav-site-title, .nav-site-title-xs").html(_dept.charAt(0).toUpperCase() + _dept.slice(1) + ' Response Times');
            $(".site-narrative").html(that.webservice[that.department()].narrative);

            //Initial date range values
            document.getElementById('date1').valueAsDate = that.date1;
            document.getElementById('date2').valueAsDate = that.date2;

            $("#btnSubmitDateRange").click(function() {
                that.date1 = document.getElementById('date1').valueAsDate;
                that.date2 = document.getElementById('date2').valueAsDate
                that.getData();
            });
        },

        getData: function() {
            var that = this;
            var _date1 = that.date1.getFullYear() + '-' + (that.date1.getMonth() + 1) + '-' + that.date1.getDate();
            var _date2 = that.date2.getFullYear() + '-' + (that.date2.getMonth() + 1) + '-' + that.date2.getDate();
            var _webservice = that.webservice[that.department()];

            $.ajax({
                type: "POST",
                url: "http://eservices.cityoflewisville.com/citydata/?datasetid=" + _webservice.data + "&date1=" + _date1 + "&date2=" + _date2 + "&datasetformat=jsonp&callback=?",
                contentType: "application/json; charset=utf-8",
                dataType: 'jsonp',
                success: function(e) {
                    App.data1 = e.results;

                    //Get the time the most recent response-time was added
                    $("#lblLastImported").html('<small><i>Most recent response-time added: ' + App.data1[0].LastImported.substr(0, 10) + ' at ' + App.data1[0].LastImported.substr(11, 8) + '</i></small>');

                    //Average Response Time Banner (priority 1 calls)
                    var _rtArray = App.data1.filter(function(a) {
                        return a.Priority == 1 && a.Category.toUpperCase() != 'FIRE/EMS ASSIST'; }).map(function(a) {
                        return [a.ResponseTime]; }).reduce(function(a, b) {
                        return a.concat(b) });
                    var _rtSum = _rtArray.reduce(function(a, b) {
                        return a + b; });
                    var _rtAvg = parseFloat(_rtSum / _rtArray.length).toFixed(2);

                    var _totalCallsArray = App.data1.filter(function(a) {
                        return a.Priority == 1 && a.Category.toUpperCase() != 'FIRE/EMS ASSIST'; }).map(function(a) {
                        return [a.Total]; }).reduce(function(a, b) {
                        return a.concat(b) }).reduce(function(a, b) {
                        return a + b; });
                    var _totalCalls = parseFloat(_totalCallsArray).toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

                    $("#bannerCurrentRT").html($("#bannerCurrentRTTemplate").html().replace('{{AVG}}', _rtAvg).replace('{{TOTAL}}', _totalCalls));

                    //Pie Chart Data (Group By [Category], SUM([Total]))
                    App.pieData = e.results
                        .map(function(a) {
                            return { Category: a.Category, Total: a.Total }; })
                        .reduce(function(res, obj) {
                            if (!(obj.Category in res))
                                res.__array.push(res[obj.Category] = obj);
                            else {
                                res[obj.Category].Total += obj.Total;
                            }
                            return res;
                        }, { __array: [] }).__array
                        .map(function(a) {
                            return [a.Category, a.Total];
                        })
                        .sort(function(a, b) {
                            if (a[1] > b[1]) {
                                return -1;
                            }
                            if (a[1] < b[1]) {
                                return 1;
                            }
                            return 0;
                        });

                    //Pie Chart
                    App.pieData.unshift(["Category", "Total"]);
                    App.drawChart_Pie_Categories_Historical(App.pieData);

                    //Column Chart
                    App.columnData = e.results;
                    App.drawChart_Column_ComplaintsForCategory_Historical(e.results, App.pieData[1][0], App.colors[0]); // App.pieData[1][0] is the default selected slice's category
                }
            });

            $.ajax({
                type: "POST",
                url: "http://eservices.cityoflewisville.com/citydata/?datasetid=" + _webservice.history + "&datasetformat=jsonp&callback=?",
                contentType: "application/json; charset=utf-8",
                dataType: 'jsonp',
                success: function(e) {
                    var _data = e.results.map(function(a) {
                        return [a.Month, a.Priority1]; });
                    _data.unshift(["Month", "Priority1"]);
                    App.drawChart_Line_ResponseTime_Historical(_data);
                }
            });

        }, //end getData

        getCallsPerComplaint: function(complaint) {
            $("#close-modal-btn").click(function() {
                $("#popupCalls").modal("hide")
            })
            var that = this;
            //var _priority = complaint.substr(complaint.indexOf(' (P1)',5)).replace(' (P','').replace(')','');
            var _priority = complaint.substr(complaint.indexOf("(P") + 2, 1)
            var _complaint = complaint.replace(' (P1)', '').replace(' (P2)', '');
            var _date1 = that.date1.getFullYear() + '-' + (that.date1.getMonth() + 1) + '-' + that.date1.getDate();
            var _date2 = that.date2.getFullYear() + '-' + (that.date2.getMonth() + 1) + '-' + that.date2.getDate();
            var _webservice = that.webservice[that.department()];

            $.ajax({
                type: "POST",
                url: "http://eservices.cityoflewisville.com/citydata/?datasetid=" + _webservice.callsbytype + "&complainttype=" + _complaint + "&date1=" + _date1 + "&date2=" + _date2 + "&priority=" + _priority + "&datasetformat=jsonp&callback=?",
                contentType: "application/json; charset=utf-8",
                dataType: 'jsonp',
                success: function(e) {
                    var _data = e.results.map(function(a) {
                        return [a.MasterCallNumber, a.Location, a.Priority, a.FirstPD, a.FirstPDTime, a.FirstFD, a.FirstFDTime, a.Date] });
                    _data.unshift(['Master Call #', 'Location', 'Priority', '1st PD Unit', 'PD Resp Time', '1st FD Unit', 'FD Resp Time', 'Date Received']);

                    $("#popupCallsTitle").html(complaint);
                    $("#popupCallsCount").html('Total: ' + parseFloat(_data.length).toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '<small> (from ' + _date1 + ' to ' + _date2 + ')</small>');

                    //Google Chart Table
                    var options = {
                        showRowNumber: false,
                        width: '100%',
                        height: '100%'
                    };
                    $('#popupCalls_Body').height($('.modal-body').height()-30)
                    var chart = new google.visualization.Table(document.getElementById('popupCalls_Body'));
                    chart.draw(google.visualization.arrayToDataTable(_data), options);
                }
            });
            $("#popupCalls").modal("show");
        },

        //----------------------------------------------------------
        //Pie Chart
        //----------------------------------------------------------
        drawChart_Pie_Categories_Historical: function(_data) {
            var data = google.visualization.arrayToDataTable(_data);

            var options = {
                title: 'Calls',
                pieHole: 0.4,
                chartArea: { left: 40, width: '100%', height: '100%' },
                pieSliceBorderColor: "gray",
                colors: App.colors,
                backgroundColor: "whitesmoke",
                legend: { alignment: "center" },
                reverseCategories: false
            };

            var chart = new google.visualization.PieChart(document.getElementById('donutchart'));
            chart.draw(data, options);

            //On load, select the first cateogry in the array
            chart.setSelection([{ row: 0 }]);
            google.visualization.events.trigger(chart, 'select', {});

            google.visualization.events.addListener(chart, 'select', function() {
                if (chart.getSelection().length > 0) {
                    App.drawChart_Column_ComplaintsForCategory_Historical(
                        App.data1,
                        App.pieData[chart.getSelection()[0].row + 1][0],
                        App.colors[chart.getSelection()[0].row]
                    );
                }
            });
        },

        //----------------------------------------------------------
        //Column Chart
        //  - User passes in the raw data, the filter-by category and the bar-color to use
        //----------------------------------------------------------
        drawChart_Column_ComplaintsForCategory_Historical: function(_data, _category, _color) {
            var that = this;

            //Filter the data to just the category that was clicked
            var filteredData = _data.filter(function(a) {
                return a.Category == _category; 
            }).map(function(a, b) {
                return [a.Complaint, a.ResponseTime, a.ResponseTime, a.Tooltip]; 
            });

            App.columnData = filteredData;

            //DataView Column Headers
            filteredData.unshift(["Complaint", "Avg Response Time", { role: 'annotation' }, { role: 'tooltip', p: { html: true } }]);

            //Convert to Google's format
            var data = google.visualization.arrayToDataTable(filteredData);

            //Chart Settings
            var options = {
                title: '[' + _category + '] Complaint-Types (average response time)',
                colors: [_color],
                chartArea: { width: '90%', backgroundColor: "whitesmoke" },
                animation: { duration: 300, startup: true },
                legend: { position: "none" },
                hAxis: { textStyle: { fontSize: 11 } },
                tooltip: { isHtml: true }
            };

            //Dom-element for this chart
            var chart = new google.visualization.ColumnChart(document.getElementById('columnchart'));

            //Create chart
            chart.draw(data, options);

            //Click-event
            google.visualization.events.addListener(chart, 'select', function() {
                that.getCallsPerComplaint(App.columnData[chart.getSelection()[0].row + 1][0]);
            });
        },

        //----------------------------------------------------------
        //Line Chart
        //----------------------------------------------------------
        drawChart_Line_ResponseTime_Historical: function(_data) {
            var data = google.visualization.arrayToDataTable(_data);

            var options = {
                title: 'Response Time History',
                backgroundColor: "whitesmoke",
                chartArea: { backgroundColor: "white" },
                legend: { alignment: "center" },
                hAxis: { textStyle: { fontSize: 11 }, minValue: 3 },
                series: {
                    0: { color: '#5E2590' }
                },
                trendlines: {
                    0: { color: 'gray' }
                }
            };

            var chart = new google.visualization.AreaChart(document.getElementById('linechart'));
            chart.draw(data, options);

            //On load, select the first cateogry in the array
            chart.setSelection([{ row: 0 }]);
            google.visualization.events.trigger(chart, 'select', {});

            google.visualization.events.addListener(chart, 'select', function() {
                if (chart.getSelection().length > 0) {
                    App.drawChart_Column_ComplaintsForCategory_Historical(
                        App.columnData,
                        App.pieData[chart.getSelection()[0].row + 1][0],
                        App.colors[chart.getSelection()[0].row]
                    );
                }
            });
        },

        getUrlParameterValueByName: function(_name) {
            //Ex: that.getUrlParameterByName("a")
            var match = RegExp('[?&]' + _name + '=([^&]*)').exec(window.location.search);
            return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
        }
    } //end return
})(); //end App
