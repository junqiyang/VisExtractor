$(function () {
    $("#nodeDetailsModal").on("hide.bs.modal", function () {
        if (selectedDataNode != null) {
            selectedDataNode.name = $('#newTopicName').val();
            redrawText();
        }
    });


    $('#reloadModel').click(function(){
        processLDATopics(currentModelData.topics, currentModelData.graphData);
    });
});

//GLOBAL VARIABLES
var MAX_BUBBLE_RADIUS = 10;
var selectedDataNode = null;
var graphData = null;
var link,
    node,
    bubble,
    text,
    simulation,
    navXScale,
    svg,
    navChart,
    vis_node,
    vis_link,
    r, common_node, x, child_node, node_for_link, brush;

var menu = [
    {
        title: 'Edit',
        action: function (d, i) {
            selectedDataNode = d;
            $('#newTopicName').val(d.name);
            var matchingDocuments = [];
            currentModelData.agg.grouped.forEach(function(t){if(t.key.toDateString() == d.date.toDateString()){
                matchingDocuments = t.values;
            }});

            var htmlString = "";
            var docs = [];
            matchingDocuments.forEach(function(d) {
               htmlString += "<div class=\"box box-solid\" style='box-shadow: none'>"+d.title +"</div>";
                docs.push(d.title);
            });

            getLDATopics(docs,'topicMatchDocs');

            $('#topicMatchDocs').html(htmlString);

            $("#nodeDetailsModal").modal();
        },
        disabled: false // optional, defaults to false
    },
    {
        title: 'Delete',
        action: function (d, i) {
            //delete the root data model (not used directly in the diagram)
            for (var j = graphData.length-1; j >= 0 ; j--) {
                if (graphData[j].id === d.id) {
                    graphData.splice(j, 1);
                } else {
                    for (var s = graphData[j].subtopics.length - 1; s >= 0; s--) {
                        if (graphData[j].subtopics[s] === d.name) {
                            graphData[j].subtopics.splice(s, 1);
                        }
                    }
                }
            }

            //delete the vis_nodes that are mapped to the circles in the diagram
            for (var j = 0; j < vis_node.length; j++) {
                if (vis_node[j].id === d.id) {
                    vis_node.splice(j, 1);
                    continue;
                }
            }

            //delete the vis_links that are mapped to the edges in the diagram
            for (var j = vis_link.length - 1; j >= 0; j--) {
                if (vis_link[j].source.id === d.id || vis_link[j].target.id === d.id) {
                    vis_link.splice(j, 1);
                }
            }

            restart();
        }
    }
];

function getLDATopics(documents, div2Highlight){
    var postBody = {documents: documents};
    $.ajax({
        type: "POST",
        url: "/api/extractLDATopic",
        data: JSON.stringify(postBody),
        contentType: "application/json",
        success: function (resp) {
            var topics = resp.topics;
            var terms = "";
            topics.forEach(function(t){
                t.forEach(function (k){
                   terms += k.term + " ";
                });
            });
            var keywordhighlighter = new KeywordHighlighter(div2Highlight);
            // keywordhighlighter.remove();

            keywordhighlighter.apply(terms, true, "", true);
        },
        error: function(err) {
            toastr.error('', resp.error)
            // alert(resp.error);
        }
    });
}

function renderGraph(data) {
    graphData = data
    vis_node = [];
    vis_link = [];
    r = d3.scaleSqrt()
        .domain([0, d3.max(graphData, function (d) {
            return d.count;
        })])
        .range([0, 40]);

    var margin = {
            top: 20,
            right: 20,
            bottom: 30,
            left: 35
        },
        width = window.innerWidth * 0.9 - margin.left - margin.right,
        height = 750 - margin.top - margin.bottom;


    var navWidth = width,
        navHeight = 100 - margin.top - margin.bottom;


    //map elements to time
    var parseTime = d3.timeParse("%Y-%m-%d");

    graphData.forEach(function (d) {
        d.date = parseTime(d.date);
        d.close = +d.close;
    });

    var minN = d3.min(graphData, function (d) {
            return d.date;
        }),
        maxN = d3.max(graphData, function (d) {
            return d.date;
        });
    var minDate = new Date(minN - 80.64e7),
        maxDate = new Date(maxN + 80.64e7);

    //separete big topic and subtopics and setup the visualization graphData
    var parents_node = graphData.filter(function (d) {
        return d.subtopics.length != 0;
    });

    graphData.forEach(function (d) {
        d.clicked = false;
        d.close = +d.close;
    });

    child_node = graphData.filter(function (d) {
        return d.subtopics.length == 0;
    });

    node_for_link = [];
    common_node = [];
    vis_node = parents_node;

    //link all the big topic with common subtopic
    for (i = 0; i < graphData.length; i++) {
        var tmps = graphData[i].subtopics
        for (j = 0; j < tmps.length; j++) {
            for (k = i + 1; k < graphData.length; k++) {
                if (graphData[k].subtopics.includes(tmps[j])) {
                    if (!node_for_link.includes(tmps[j])) {
                        vis_link.push({source: graphData[i], target: graphData[k]})
                        common_node.push(tmps[j])
                        node_for_link.push({name: tmps[j], source: graphData[i], target: graphData[k]})
                    }
                }
            }
        }
    }

    x = d3.scaleTime()
        .range([0, width]);
    x.domain([d3.timeDay.offset(minN, 0), d3.timeDay.offset(maxN, 2)]);


    var networkCenter = d3.forceCenter().x(width/2).y(height/2);

    //CHARGE
    var manyBody = d3.forceManyBody().strength(-250).distanceMax(500)

    //Make the x-position equal to the x-position specified in the module positioning object or, if not in
    //the hash, then set it to 250
    var forceX = d3.forceX(function (d) {
        return x(d.date);
    })
        .strength(0.05)

    //Same for forceY--these act as a gravity parameter so the different strength determines how closely
    //the individual nodes are pulled to the center of their module position
    var forceY = d3.forceY(function (d) {return (Math.random() * height*0.5) + (height*0.2 );})
        .strength(0.05)

    simulation = d3.forceSimulation(vis_node)
        .force("charge", manyBody)
        .force("link", d3.forceLink(vis_link).distance(150).iterations(100))
        // .force("center", networkCenter)
        .force("x", forceX)
        .force("y", forceY);

    // //setup a force field for the d3
    // simulation = d3.forceSimulation()
    //     .force("charge", d3.forceManyBody().strength(-500).distanceMin(100).distanceMax(500))
    //     .force('collision', d3.forceCollide().radius(function (d) {
    //         return Math.max(MAX_BUBBLE_RADIUS, r(d.count));
    //     }))
    //     .force("center", d3.forceCenter(width / 2, height * 0.45))
    //     .force("y", d3.forceY(0.001))
    //     .force("x", d3.forceX(0.001))
    //     .force("link", d3.forceLink().distance(function (d) {
    //         return 5;
    //     }).strength(0.1))
    //     .force('radial', d3.forceRadial(function (d) {
    //         return 25;
    //     }, width / 2, height / 2))


    //main chart
    d3.select("#graphContainer").html("");
    d3.select("#zoomContainer").html("");

    svg = d3.select('#graphContainer').append('svg')
        .classed('viewer', true)
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom),
        g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');


    var formatNumber = d3.format('');

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x)
            .tickFormat(d3.timeFormat("%m-%d")));

    //begin to render a link
    link = g.selectAll('.link')
        .data(vis_link)
        .enter().append('g')
        .attr('class', 'link')
    line = link.append('line')
        .attr("stroke", "black")
        .style('stroke-width', '4px')

    link.exit().remove();

    node = g.selectAll('.node')
        .data(vis_node)
        .enter().append('g')
        .attr("class", "node");

    node.exit().remove();

    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    bubble = node.append('circle')
        .attr('r', function (d) {
            return Math.max(MAX_BUBBLE_RADIUS, r(d.count));
        })
        .style("stroke", function (d) {
            if (d.id.indexOf('subTopic') > -1) {
                return "blue"
            }
            else {
                return "pink"
            }
        })
        .style("fill", "white")
        .style('stroke-width', '10px')

    text = node.append('text')
        .text(function (d) {
            return d.name
        })
        .attr("text-anchor", "middle")
        .style('fill', function (d) {
            if (d.id.indexOf('subTopic') > -1) {
                return "#DCDCDC"
            } else {
                return "darkred"
            }
        })
        .style('font-size', function (d) {
            if (d.id.indexOf('subTopic') > -1) {
                return "12px"
            } else {
                return "16px"
            }
        })
        .attr("pointer-events", "none");

    bubble.on("click", update_data);

    //viewport chart
    navChart = d3.select('#zoomContainer').append('svg')
        .classed('navigator', true)
        .attr('width', width + margin.left + margin.right)
        .attr('height', navHeight + margin.top + margin.bottom),
        f = navChart.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    navXScale = d3.scaleTime()
        .range([0, width]);
    navXScale.domain([d3.timeDay.offset(minN, 0), d3.timeDay.offset(maxN, 2)]);

    navChart.append("g")
        .attr("class", "axis")
        .attr('transform', 'translate(0,' + navHeight + ')')
        .call(d3.axisBottom(x)
            .tickFormat(d3.timeFormat("%y-%m-%d")));

    brush = d3.brushX()
        .extent([[0, 0], [width, height]])
        .on("brush", brushed)
        .on("start end", restart);

    navChart.append("g")
        .attr("class", "brush")
        .call(brush)
        .call(brush.move, x.range());

    //add link and node to the force field
    //simulation.force("link").links(vis_link);
    simulation.nodes(vis_node);
    simulation.on("tick", ticked);
}


//when click on the big topic call restart function to redraw everything
function restart() {
    link.remove()
    link = g.selectAll('.link')
        .data(vis_link)
        .enter().append('g')
        .attr('class', 'link')
    line = link.append('line')
        .attr("stroke", "black")
        .style('stroke-width', '1px')

    node.remove()
    node = g.selectAll('.node')
        .data(vis_node)
        .enter().append('g')
        .attr("class", "node");

    node.call(d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    bubble = node.append('circle')
        .attr('r', function (d) {
            return Math.max(MAX_BUBBLE_RADIUS, r(d.count));
        })
        .style("stroke", function (d) {
            if (common_node.includes(d.name)) {
                return "#81c781"//common node
            }
            else if (d.id.indexOf('subTopic')> -1) {
                return "#DCDCDC"//sub topic
            }
            else {
                return "pink"//main topic
            }
        })
        .style("fill", function (d) {
            if (common_node.includes(d.name)) {
                return "#81c781"//common node
            }
            else if (d.id.indexOf('subTopic')> -1) {
                return "#DCDCDC"//sub topic
            }
            else {
                return "white"//main topic
            }
        })
        .style('stroke-width', function (d) {
            if (common_node.includes(d.name)) {
                return "4px"//common node
            }
            else if (d.id.indexOf('subTopic')> -1) {
                return "4px"//sub topic
            }
            else {
                return "10px"//main topic
            }
        })

    text = node.append('text')
        .text(function (d) {
            return d.name
        })
        .attr("text-anchor", "middle")
        .style('fill', function (d) {
            if (common_node.includes(d.name)) {
                return "black"//common node
            }
            else if (d.id.indexOf('subtopic')> -1) {
                return "black"//sub topic
            }
            else {
                return "darkred"//main topic
            }
        })
        .style('font-size', function (d) {
            if (d.id.indexOf('subTopic') > -1) {
                return "12px"
            } else {
                return "16px"
            }
        })
        .attr("pointer-events", "none");

    bubble.on("click", update_data);


    bubble.on("contextmenu", d3.contextMenu(menu));

    simulation.nodes(vis_node);
    simulation.alpha(1).restart();

}

//drag related functions
function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(d) {
    d.fx = d3.event.x
    d.fy = d3.event.y;
}

function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

function brushed() {
    var selection = d3.event.selection;
    x.domain(selection.map(navXScale.invert, navXScale));

    svg.select(".x")
        .transition()
        .call(d3.axisBottom(x)
            .tickFormat(d3.timeFormat("%m-%d")));

}

//I think something wrong here
function ticked() {

    node.attr("transform", function (d) {
        if(d.id.indexOf('subTopic') <= -1) {
            return "translate(" + x(d.date) + "," + d.y + ")";
        } else {
            return "translate(" + d.x + "," + d.y + ")";
        }
    });

    line.attr("x1", function (d) {
        if(d.source.id.indexOf('subTopic') <= -1) {
            return x(d.source.date);
        } else {
            return d.source.x;
        }
        // return x(d.source.date);
    })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            if(d.target.id.indexOf('subTopic') <= -1) {
                return x(d.target.date);
            } else {
                return d.target.x;
            }


            // return x(d.target.date)
        })
        .attr("y2", function (d) {
            return d.target.y;
        });
}

function update_data(d) {
    var subs = d.subtopics
    var pars = d;
    d.clicked = !d.clicked
    child_node.forEach(function (d) {
        var child = d;

        if (subs.includes(d.name)) {
            var tmps = node_for_link.filter(function (d) {
                return d.name == child.name
            });

            if (pars.clicked == true) {
                if (vis_node.includes(d)) {

                }
                else {
                    vis_node.push(d);
                }
                if (common_node.includes(d.name)) {
                    tmps.forEach(function (d) {
                        vis_link.push({source: child, target: d.source})
                        vis_link.push({source: child, target: d.target})
                        var source = d.source;
                        var target = d.target;
                        var tmp_result = vis_link.filter(function (d) {
                            return (d.source == source && d.target == target) || (d.source == target && d.target == source);
                        }, source, target)
                        tmp_result.forEach(function (d) {
                            index = vis_link.indexOf(d)
                            vis_link.splice(index, 1)
                        })
                    })
                }
                else {
                    vis_link.push({source: d, target: pars})
                }
            }
            else {
                var valide = true;

                if (common_node.includes(d.name)) {
                    tmps.forEach(function (d) {
                        if (d.source.clicked == true) {
                            valide = false;
                        }
                        if (d.target.clicked == true) {
                            valide = false;
                        }

                    }, valide)
                }
                if (valide == true) {
                    var index = vis_node.indexOf(d)
                    vis_node.splice(index, 1)
                    var result = vis_link.filter(function (d) {
                        return d.source == child;
                    }, child)
                    result.forEach(function (d) {
                        index = vis_link.indexOf(d)
                        vis_link.splice(index, 1)
                    })
                    if (common_node.includes(d.name)) {
                        tmps.forEach(function (d) {
                            vis_link.push({source: d.source, target: d.target})
                        })
                    }
                }


            }
        }
    }, pars)
    restart();
}

function redrawText() {
    text
        .data(selectedDataNode)
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .transition().duration(500)
        .style("opacity", 1)
        .text(function (d) {
            return d.name
        })
    restart();
}