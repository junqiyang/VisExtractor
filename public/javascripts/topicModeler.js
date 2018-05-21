var ODP_URL = "api/extractTopicsFromODP";
var NEWS_API_URL = "api/extractTopicsFromNewsAPI";
var div = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);
var map = null;
var markers = null;
var currentModelData = null;

$(function () {
     //initialize date picker components
    $('.datepicker').datepicker({
        autoclose: true,
        clearBtn: true,
        orientation: "right top"
    });

    setDefaultDates();

    //bind click event for explore button
    $('#exploreTopics').click(exploreTopics);

    //bind key press event for text box
    $('#keywords').keypress(function (e) {
        var key = e.which;
        if (key == 13)  // the enter key code
        {
            exploreTopics();
        }
    });

    $('a[data-toggle="tab"]').on('shown.bs.tab', function (e) {
        var target = $(e.target).attr("href") // activated tab
        if(target === '#maps' && map != null){
            try {
                map.invalidateSize();
            }catch(e){}
        }
    });

    loadExploredTopics();

    $('#exploredTopics').click(function(){
        var progressBar = new ProgressBar.Line('#timeseriesChart',{strokeWidth: 4,
                easing: 'easeInOut',
                duration: 1400,
                color: '#ED6A5A',
                trailColor: '#eee',
                trailWidth: 1,
                svgStyle: {width: '20%', height: '100%'},
                from: {color: '#ED6A5A'},
                to: {color: '#ED6A5A'}
                });
        progressBar.animate(0.8);

        setTimeout(function(){
            progressBar.animate(0.9);
            loadExploredTopic();
        }, 1000)

    });


    $('#showSaveModal').click(function() {
        if(currentModelData != null) {
            $("#saveDataModal").modal();
        }
    });

    $('#saveModelBtn').click(function() {
        var modelName = $('#topicModelName').val();
        if(modelName !== "" && currentModelData != null) {
            currentModelData.graphData = getGraphData2Save();
            var postBody = {modelName: modelName, model: currentModelData};
            $.ajax({
                type: "POST",
                url: "/api/topic/persistTopicAsFile",
                data: JSON.stringify(postBody),
                contentType: "application/json",
                success: function (resp) {
                    toastr.success('', resp.msg)
                    // alert(resp.msg);
                    loadExploredTopics();
                },
                error: function(err) {
                    toastr.error('', resp.error)
                    // alert(resp.error);
                }
            });
        }
    });

    $('#deleteTopic').click(function(){
        $("#modelDeleteModal").modal();
    });

    $('#modelDeleteBtn').click(function() {
        var topicName = $('#topicsList').val();
        if(topicName === "") return;

        var adminPwd = $('#adminPwd').val();
        if(adminPwd === "tadmin") {
            url = "/api/topic/deleteTopicFile?modelName="+topicName;
            $.get(url, function (data) {
                toastr.success('', data.msg);
                loadExploredTopics();
            });
        } else {
            toastr.error('', "Invalid password.")
        }
    });

});

function loadExploredTopics() {
    url = "/api/topic/listTopicFileNames"+"?id="+new Date();

    $.get(url, function (data) {
        var selectOptStr = "";
        data.forEach(function(d){
            selectOptStr += "<option>"+d+"</option>";
        });

        $('#topicsList').html(selectOptStr);

    });
}

function setDefaultDates() {
    var currentDate = new Date();
    var prevMonthDate = new Date();
    prevMonthDate.setMonth(new Date().getMonth() - 3);
    $('#startDate').val(formatDate(prevMonthDate));
    $('#endDate').val(formatDate(currentDate));
}

//Key function related to chart rendering

function exploreTopics() {


    // $('#timeseriesChart').html('<div class="spinner"></div>');

    var progressBar = new ProgressBar.Line('#timeseriesChart',{strokeWidth: 4,
        easing: 'easeInOut',
        duration: 1400,
        color: '#ED6A5A',
        trailColor: '#eee',
        trailWidth: 1,
        svgStyle: {width: '20%', height: '100%'},
        from: {color: '#ED6A5A'},
        to: {color: '#ED6A5A'}
    });
    progressBar.animate(0.8);

    setTimeout(function () {

        var ds = $('input[name="sourcePicker"]:checked').val();
        var url = NEWS_API_URL;
        if(ds === "Open Data Platform") {
            url = ODP_URL;
        }

        var text = $('#keywords').val();
        if(text === "") return;

        var start_date = $('#startDate').val();
        var end_date = $('#endDate').val();

        url = url + "?text=" + text + "&start_date=" + start_date + "&end_date=" + end_date+"&id="+new Date();

        $.get(url, function (data) {
            // $(".result").html(data);

            currentModelData = data;

            var transform = {
                '<>': 'div', 'html': [
                    {'<>': 'div', 'class': 'box box-solid', 'html': '${title} (${date})'}
                ]
            };

            var resultElem = '<div class="col-md-12 docSearchResults"  draggable=true class="col-md-12">'+
                '<div class="pull-left" style="margin:0">DOCUMENTS</div><div class="pull-right">'+data.documents.length+'</div>'+
                '</div> ';

            var results = json2html.transform(data.documents,transform);

            $('#allResults').html(results);

            processAndRenderChart(data.agg.grouped, data.agg.top, data.topics);
            //renderTopics(data.topics);
            renderMap(data.agg.grouped);

            processAndRenderTopicCloud(data.topics);
        });
    }, 500);


}

function processAndRenderTopicCloud(topicData){
    var wordCloudData = [];
    var termDict = {};
    var topicStr = "";
    topicData.forEach(function(d){
        d.topics.forEach(function(t){
            t.forEach(function(td){
                if(!(td.term in termDict)){
                    wordCloudData.push({name: td.term.replace("001"," "), count: td.probability*10}) ;
                    topicStr += td.term.replace("001","-") +" ";
                }
                termDict[td.term] = "";
            });

        });
    });

    renderTopicCloud(wordCloudData);
    highlightTopicTerms(topicStr);
}

function loadExploredTopic() {
    var topicName = $('#topicsList').val();
    if(topicName === "") return;

    url = "/api/topic/getPersistedTopic?topicName="+topicName+"&id="+new Date();

    $.get(url, function (data) {
        var transform = {
            '<>': 'div', 'html': [
                {'<>': 'div', 'class': 'box box-solid', 'html': '${title} (${date}) <a target="_blank" href="${url}">link</a>'}
            ]
        };

        currentModelData = data;

        var resultElem = '<div class="col-md-12 docSearchResults"  draggable=true class="col-md-12">'+
            '<div class="pull-left" style="margin:0">DOCUMENTS</div><div class="pull-right">'+data.documents.length+'</div>'+
            '</div> ';

        var results = json2html.transform(data.documents,transform);
        $('#allResults').html(results);

        processAndRenderChart(data.agg.grouped, data.agg.top, data.topics, data.graphData);
        renderTopics(data.topics);
        renderMap(data.agg.grouped);

        processAndRenderTopicCloud(data.topics);
    });

}

function highlightTopicTerms(topics2Highlight) {
    var keywordhighlighter = new KeywordHighlighter('allResults');
    keywordhighlighter.remove();

    keywordhighlighter.apply(topics2Highlight, false, "", true);
}

function geocode(locations) {

        var geocoder = new google.maps.Geocoder();
        var address, text_box;

        for(i = 0; i < locations.length;i++){
            address = locations[i].location
            text_box = locations[i].topic
            // console.log(address)

            // console.log(text_box);
            geocoder.geocode( {'address': address}, function(results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    // map.setCenter(results[0].geometry.location);
                    // console.log(results[0].geometry.location);

                    var marker = L.marker(new L.LatLng(results[0].geometry.location.lat(), results[0].geometry.location.lng()), { title: "" });
                    // marker.bindPopup(title);
                    markers.addLayer(marker);



                } else {
                    // console.log(address + 'Geocode was not successful for the following reason: ' + status);
                }
            });
        }

}

function processAndRenderChart(nested, selectedDates, ldaTopics, editedGraphData) {
    processLDATopics(ldaTopics,  editedGraphData);

    for (var i = 0; i < nested.length; i++) {
        var doc = nested[i];
        doc.key = new Date(doc.key);
    }

    renderTimeSeriesChart(nested);
}

function addDate(date, numDays){
    var dtObj = new Date(date.toString());
    dtObj.setDate(dtObj.getDate() + numDays);
    return dtObj.getFullYear()+"-"+padString((dtObj.getMonth()+1)+"",2,'0')+"-"+padString((dtObj.getDate())+"",2,'0');
}

function getGraphData2Save() {
    var tempGraphData = JSON.parse(JSON.stringify(graphData));
    tempGraphData.forEach(function(d){
        var dt = new Date(d.date);
        d.date = formatDate(dt);
    });
    return tempGraphData;
}

function processLDATopics(topics, editecGraphData) {

    if(typeof editecGraphData === 'undefined') {
        var topicMap = {};
        for (var tp = 0; tp < topics.length; tp++) {
            var topicArr = topics[tp].topics;
            for (var tpa = 0; tpa < topicArr.length; tpa++) {
                for (var tpt = 0; tpt < topicArr[tpa].length; tpt++) {
                    if (topicArr[tpa][tpt].term in topicMap) {
                        topicMap[topicArr[tpa][tpt].term] = topicMap[topicArr[tpa][tpt].term] + 1;
                    } else {
                        topicMap[topicArr[tpa][tpt].term] = 1;
                    }
                }
            }
        }

        var newTopics = [];
        for (var tp = 0; tp < topics.length; tp++) {
            var topicArr = topics[tp].topics;
            var newTopicArr = [];
            var topicDict = {};
            for (var tpa = 0; tpa < topicArr.length; tpa++) {
                for (var tpt = 0; tpt < topicArr[tpa].length; tpt++) {

                    if (topicMap[topicArr[tpa][tpt].term] <= 4 && topicArr[tpa][tpt].probability > 0.005) {
                        var topicTerm = topicArr[tpa][tpt].term.replace("001", " ");
                        if (!(topicTerm in topicDict)) {
                            newTopicArr.push(topicTerm);
                        }
                        topicDict[topicTerm] = "";
                    }
                }
            }

            if (newTopicArr.length === 0) {
                var highScore = 0;
                var finalTopicTerm = "";
                for (var tpa = 0; tpa < topicArr.length; tpa++) {
                    for (var tpt = 0; tpt < topicArr[tpa].length; tpt++) {
                        if (topicArr[tpa][tpt].probability > highScore) {
                            finalTopicTerm = topicArr[tpa][tpt].term.replace("001", " ");
                            highScore = topicArr[tpa][tpt].probability;
                        }
                    }
                }
                newTopicArr.push(finalTopicTerm);
            }

            newTopics.push({key: new Date(topics[tp].date), topics: newTopicArr, title: topics[tp].title});
        }
        console.log(newTopics);


        var graphData = [];
        var subTopicMap = {};
        for (var nt = 0; nt < newTopics.length; nt++) {
            var nTopic = newTopics[nt];
            var dtObj = new Date(nTopic.key);
            var dtStr = dtObj.getFullYear() + "-" + padString((dtObj.getMonth() + 1) + "", 2, '0') + "-" + padString((dtObj.getDate()) + "", 2, '0');

            var topicTitle = nTopic.title ? nTopic.title : "Topic-" + nt;

            graphData.push({id: topicTitle, date: dtStr, name: topicTitle, count: 4, subtopics: nTopic.topics});

            for (var st = 0; st < nTopic.topics.length; st++) {
                if (!(nTopic.topics[st] in subTopicMap)) {
                    subTopicMap[nTopic.topics[st]] = "";
                    graphData.push({
                        id: "subTopic-" + st,
                        date: addDate(dtObj, st % 2 === 0 ? (-1 * randomIntFromInterval(4, 7)) : (randomIntFromInterval(4, 7))),
                        name: nTopic.topics[st],
                        count: 0.4,
                        subtopics: []
                    });
                }
            }

        }

        renderGraph(graphData);
    }
    else {

        // editecGraphData.forEach(function(d){
        //     d.date = new Date(d.date);
        // });

        renderGraph(editecGraphData);
    }
}

function randomIntFromInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

function renderTimeSeriesChart(data){
    d3.select("#timeseriesChart").html("");

    var svg = d3.select("#timeseriesChart")
        .append("svg:svg")
        .attr("width", window.innerWidth-50)
        .attr("height", 400),
        margin = {top: 10, right: 50, bottom: 0, left: 30},
        margin2 = {top: 275, right: 50, bottom: 0, left: 30},
        width = window.innerWidth-50-margin.right -margin.left,
        height = 250,
        height2 = 100;

    var parseDate = d3.timeParse("%m/%d/%Y %H:%M");

    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y);

    var brush = d3.brushX()
        .extent([[0, 0], [width, height2]])
        .on("brush end", brushed);

    var zoom = d3.zoom()
        .scaleExtent([1, Infinity])
        .translateExtent([[0, 0], [width, height]])
        .extent([[0, 0], [width, height]])
        .on("zoom", zoomed);

    var line = d3.line()
        .x(function (d) { return x(d.key); })
        .y(function (d) { return y(d.values.length); });

    var line2 = d3.line()
        .x(function (d) { return x2(d.key); })
        .y(function (d) { return y2(d.values.length); });

    var clip = svg.append("defs").append("svg:clipPath")
        .attr("id", "clip")
        .append("svg:rect")
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0);


    var Line_chart = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("clip-path", "url(#clip)");


    var focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");



    x.domain(d3.extent(data, function(d) { return d.key; }));
    y.domain([0, d3.max(data, function(d) { return d.values.length; })]);
    x2.domain(x.domain());
    y2.domain(y.domain());


    focus.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line);

    focus.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "axis axis--y")
        .call(yAxis);

    focus.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("class","circle")
        .attr("r", function (d) {
            return d.keyTopic === true ? 10 : 4;
        })
        .style("fill", 'orange')
        .style("stroke", 'red')
        .style("stroke-width", "2")
        .attr("cx", function(d) { return x(d.key) })
        .attr("cy", function(d) { return y(d.values.length); })
        .on('click', function(d) {
            var matchingDocuments = d.values;
            var htmlString = "";
            var docs = [];
            matchingDocuments.forEach(function(d) {
                htmlString += "<div class=\"box box-solid\" style='box-shadow: none'>"+d.title +"</div>";
                docs.push(d.title);
            });

            getLDATopics(docs,'dateMatchDocs');

            $('#dateMatchDocs').html(htmlString);

            $("#dateDetailsModal").modal();
        })
        .on("mouseover", function (d) {
            div.transition()
                .duration(200)
                .style("opacity", .9);
            div.html(formatDate(new Date(d.key)) + "<br/>" + d.title)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            div.transition()
                .duration(500)
                .style("opacity", 0);
        });

    context.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line2);

    context.append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    context.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

        function brushed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
            var s = d3.event.selection || x2.range();
            x.domain(s.map(x2.invert, x2));
            focus.select(".line").attr("d", line);

            focus.selectAll('.circle')
                .attr("cx", function(d) { return x(d.key) })
                .attr("cy", function(d) { return y(d.values.length); });



            focus.select(".axis--x").call(xAxis);
            svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
                .scale(width / (s[1] - s[0]))
                .translate(-s[0], 0));
        }

        function zoomed() {
            if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
            var t = d3.event.transform;
            x.domain(t.rescaleX(x2).domain());
            focus.select(".line").attr("d", line);

            focus.selectAll('.circle')
                .attr("cx", function(d) { return x(d.key) })
                .attr("cy", function(d) { return y(d.values.length); });

            focus.select(".axis--x").call(xAxis);
            context.select(".brush").call(brush.move, x.range().map(t.invertX, t));

        }

    svg.selectAll(".annotation")
        .data(data)
        .filter()
        .enter()
        .append("text")
        .attr("class", "annotation")
        .attr("x", function(d) { return x(d.key); })
        .attr("y", function(d) { return y(d.values.length); })
        .text(function(d) { return d.title; })
}

function renderTopics(topics) {
    var topicStr = "";
    for (var topicIdx = 0; topicIdx < topics.length; topicIdx++) {
        var topic = topics[topicIdx];

        for (var topicKeys = 0; topicKeys < topic.length; topicKeys++) {
            var topicKey = topic[topicKeys];
            topicStr = topicStr + "" + "<span style='font-size:" + (100 + (topicKey.probability * 100)) + "%; margin-right:5px;'>" + topicKey.term + "</span>";
        }
        topicStr = topicStr + "<br>";
    }

    $('#topics').html(topicStr);
}

function renderMap(nested) {
    if(map === null) {


        var tiles = L.tileLayer('https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png', {
                maxZoom: 18,
                attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            }),
            latlng = L.latLng(40.737, -73.923);

        map = L.map('map', {center: latlng, zoom: 3, layers: [tiles]});

        markers = L.markerClusterGroup();

        map.addLayer(markers);
    } else {
        if(markers !== null) {
            markers.clearLayers();
        }
    }

    var locations = []
    nested.forEach(function(d){
        var tmp = d.ner;
        var tmp_title = d.title;
        tmp.forEach(function(d){
            locations.push({topic:tmp_title,location:d.text})
        })
    });

    geocode(locations);
}

//Util functions
function sortByDateAscending(a, b) {
    return a.key - b.key;
}

function sortByValueCount(a, b) {
    return b.values.length - a.values.length;
}

function formatDate(date) {

    return date.getFullYear() + '-' + padString((date.getMonth() + 1) + '', 2, '0') + '-' + padString(date.getDate() + '', 2, 0);
}

function padString(str, len, chr) {

    for (var i = str.length; i < len; i++) {
        str = chr + str;
    }

    return str;
}