function renderTopicCloud(data) {





    var margin = {top: 5, right: 50, bottom: 30, left: 5};
    var width = window.innerWidth*0.9 - margin.left - margin.right;
    var height = 500 - margin.top - margin.bottom;

    d3.select("#wordCloud").html("");

    var g = d3.select('#wordCloud').append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


    var color = d3.scaleOrdinal(d3.schemeCategory20);
    var categories = d3.keys(d3.nest().key(function (d) {
        return d.State;
    }).map(data));
    var fontSize = d3.scaleSqrt()
        .domain([0, d3.max(data, function (d) {
            return d.count;
        })])
        .range([0, 65]);
    ;

    var layout = d3.layout.cloud()
        .size([width, height])
        .timeInterval(20)
        .words(data)
        .rotate(function (d) {
            return 0;
        })
        .fontSize(function (d, i) {
            return fontSize(d.count);
        })
        .fontWeight(["bold"])
        .text(function (d) {
            return d.name;
        })
        .spiral("rectangular") // "archimedean" or "rectangular"
        .on("end", draw)
        .start();

    var wordcloud = g.append("g")
        .attr('class', 'wordcloud')
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    g.append("g")
        .attr("class", "axis")
        .attr("transform", "translate(0," + height + ")")
        .selectAll('text')
        .style('font-size', '20px')
        .style('fill', function (d) {
            return color(d);
        })
        .style('font', 'sans-serif');

    function draw(words) {
        wordcloud.selectAll("text")
            .data(words)
            .enter().append("text")
            .attr('class', 'word')
            .style("fill", function (d, i) {
                return color(i);
            })
            .style("font-size", function (d) {
                return d.size + "px";
            })
            .style("font-family", function (d) {
                return d.font;
            })
            .attr("text-anchor", "middle")
            .attr("transform", function (d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .text(function (d) {
                return d.text;
            });
    };


}