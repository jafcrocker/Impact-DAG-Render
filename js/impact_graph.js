/**
 * Created with IntelliJ IDEA.
 * User: zenoss
 * Date: 1/24/14
 * Time: 7:41 PM
 * To change this template use File | Settings | File Templates.
 */
function ImpactDAG(attachPoint, impact_doc, /*optional*/ params) {
    var dag = this;
    // Get the necessary parameters
    var lightweight = params.lightweight ? true : false;

    var rootSVG = d3.select(attachPoint).append("svg");

    var graphSVG = rootSVG.append("svg").attr("width", "100%").attr("height", "100%").attr("class", "graph-attach");
    graphSVG.node().oncontextmenu = function(d) { return false; };
    var minimapSVG = rootSVG.append("svg").attr("class", "minimap-attach");
    var listSVG = rootSVG.append("svg").attr("class", "history-attach");

    var graph = createGraphFromImpacts(impact_doc, params);
    var history = DirectedAcyclicGraphHistory();

    var DAG = DirectedAcyclicGraph().animate(!lightweight);
    params.nodeTemplate ? DAG.nodeTemplate(params.nodeTemplate) : null;

    var DAGMinimap = DirectedAcyclicGraphMinimap(DAG).width("19.5%").height("19.5%").x("80%").y("80%");
    var DAGHistory = List().width("15%").height("99%").x("0.5%").y("0.5%");
    var DAGTooltip = DirectedAcyclicGraphTooltip();
    var DAGContextMenu = DirectedAcyclicGraphContextMenu(graph, graphSVG);

    // Attach the panzoom behavior
    var refreshViewport = function() {
        var t = zoom.translate();
        var scale = zoom.scale();
        graphSVG.select(".graph").attr("transform","translate("+t[0]+","+t[1]+") scale("+scale+")");
        minimapSVG.select('.viewfinder')
            .attr("x", -t[0]/scale)
            .attr("y", -t[1]/scale)
            .attr("width", attachPoint.offsetWidth/scale)
            .attr("height", attachPoint.offsetHeight/scale);
        if (!lightweight)
            graphSVG.selectAll(".node text").attr("opacity", 3*scale-0.3);
    }
    var zoom = MinimapZoom().scaleExtent([0.001, 2.0]).on("zoom", refreshViewport);
    zoom.call(this, rootSVG, minimapSVG);

    // A function that resets the viewport by zooming all the way out
    var resetViewport = function() {
        var curbbox = graphSVG.node().getBBox();
        var bbox = { x: curbbox.x, y: curbbox.y, width: curbbox.width+50, height: curbbox.height+50};
        scale = Math.min(attachPoint.offsetWidth/bbox.width, attachPoint.offsetHeight/bbox.height);
        w = attachPoint.offsetWidth/scale;
        h = attachPoint.offsetHeight/scale;
        tx = ((w - bbox.width)/2 - bbox.x + 25)*scale;
        ty = ((h - bbox.height)/2 - bbox.y + 25)*scale;
        zoom.translate([tx, ty]).scale(scale);
        refreshViewport();
    }


    // Attaches a context menu to any selected graph nodes
    function attachContextMenus() {
        DAGContextMenu.call(graphSVG.node(), graphSVG.selectAll(".node"));
        DAGContextMenu.on("open", function() {
            // JAFC3 DAGTooltip.hide();
        }).on("close", function() {
                if (!lightweight) {
                    graphSVG.selectAll(".node").classed("preview", false);
                    graphSVG.selectAll(".edge").classed("preview", false);
                }
            }).on("hidenodes", function(nodes, selectionname) {
                var item = history.addSelection(nodes, selectionname);
                if (!lightweight) graphSVG.classed("hovering", false);
                listSVG.datum(history).call(DAGHistory);

                // Find the point to animate the hidden nodes to
                var bbox = DAGHistory.bbox().call(DAGHistory.select.call(listSVG.node(), item), item);
                var transform = zoom.getTransform(bbox);
                DAG.removenode(function(d) {
                    if (lightweight) {
                        d3.select(this).remove();
                    } else {
                        d3.select(this).classed("visible", false).transition().duration(800).attr("transform", transform).remove();
                    }
                });

                dag.draw();

                // Refresh selected edges
                var selected = {};
                graphSVG.selectAll(".node.selected").data().forEach(function(d) { selected[d.id]=true; });
                graphSVG.selectAll(".edge").classed("selected", function(d) {
                    return selected[d.source.id] && selected[d.target.id];
                });
            }).on("hovernodes", function(nodes) {
                if (!lightweight) {
                    graphSVG.selectAll(".node").classed("preview", function(d) {
                        return nodes.indexOf(d)!=-1;
                    })
                    var previewed = {};
                    graphSVG.selectAll(".node.preview").data().forEach(function(d) { previewed[d.id]=true; });
                    graphSVG.selectAll(".edge").classed("preview", function(d) {
                        return previewed[d.source.id] && previewed[d.target.id];
                    });
                }
            }).on("selectnodes", function(nodes) {
                var selected = {};
                nodes.forEach(function(d) { selected[d.id]=true; });
                graphSVG.selectAll(".node").classed("selected", function(d) {
                    var selectme = selected[d.id];
                    if (d3.event.ctrlKey) selectme = selectme || d3.select(this).classed("selected");
                    return selectme;
                })
                graphSVG.selectAll(".edge").classed("selected", function(d) {
                    var selectme = selected[d.source.id] && selected[d.target.id];
                    if (d3.event.ctrlKey) selectme = selectme || d3.select(this).classed("selected");
                    return selectme;
                });
                attachContextMenus();
                DAGTooltip.hide();
            });
    }

    // Detaches any bound context menus
    function detachContextMenus() {
        $(".graph .node").unbind("contextmenu");
    }


    // A function that attaches mouse-click events to nodes to enable node selection
    function setupEvents(){
        var nodes = graphSVG.selectAll(".node");
        var edges = graphSVG.selectAll(".edge");
        var items = listSVG.selectAll(".item");

        nodes.on("click", function(d){
            values(d.child_nodes).forEach(function(n) {n.visible(false);})
            parent = d;
            DAG.removenode(function(d) {
                if (lightweight) {
                    d3.select(this).remove();
                } else {
                    var transform = "translate("+ parent.dagre.x+","+ parent.dagre.y+") scale(0.1)"
                    d3.select(this).classed("visible", false).transition().attr("transform", transform).duration(800).remove();
                }
            });
            dag.draw();
        });

        if (!lightweight) {
            nodes.on("mouseover", function(d) {
                graphSVG.classed("hovering", true);
                highlightPath(d);
            }).on("mouseout", function(d){
                    graphSVG.classed("hovering", false);
                    edges.classed("hovered", false).classed("immediate", false);
                    nodes.classed("hovered", false).classed("immediate", false);
                });
        }

        // When a list item is clicked, it will be removed from the history and added to the graph
        // So we override the DAG node transition behaviour so that the new nodes animate from the click position
        items.on("click", function(d, i) {
            // Remove the item from the history and redraw the history
            history.remove(d);
            listSVG.datum(history).call(DAGHistory);

            // Now update the location that the new elements of the graph will enter from
            var transform = zoom.getTransform(DAGHistory.bbox().call(this, d));
            DAG.newnodetransition(function(d) {
                if (DAG.animate()) {
                    d3.select(this).attr("transform", transform).transition().duration(800).attr("transform", DAG.nodeTranslate);
                } else {
                    d3.select(this).attr("transform", transform).attr("transform", DAG.nodeTranslate);
                }
            })

            // Redraw the graph and such
            dag.draw();
        })

        function highlightPath(center) {
            var path = getEntirePathLinks(center);

            var pathnodes = {};
            var pathlinks = {};

            path.forEach(function(p) {
                pathnodes[p.source.id] = true;
                pathnodes[p.target.id] = true;
                pathlinks[p.source.id+p.target.id] = true;
            });

            edges.classed("hovered", function(d) {
                return pathlinks[d.source.id+d.target.id];
            })
            nodes.classed("hovered", function(d) {
                return pathnodes[d.id];
            });

            var immediatenodes = {};
            var immediatelinks = {};
            immediatenodes[center.id] = true;
            center.getVisibleParents().forEach(function(p) {
                immediatenodes[p.id] = true;
                immediatelinks[p.id+center.id] = true;
            })
            center.getVisibleChildren().forEach(function(p) {
                immediatenodes[p.id] = true;
                immediatelinks[center.id+p.id] = true;
            })

//            edges.classed("immediate", function(d) {
//                return immediatelinks[d.source.id+d.target.id];
//            })
//            nodes.classed("immediate", function(d) {
//                return immediatenodes[d.id];
//            })
        }
    }


    // The main draw function
    this.draw = function() {
        console.log("draw begin")
        var begin = (new Date()).getTime();
        var start = (new Date()).getTime();
        DAGTooltip.hide();
        graphSVG.datum(graph).call(DAG);    // Draw a DAG at the graph attach
        console.log("draw graph", new Date().getTime() - start);
        start = (new Date()).getTime();
        minimapSVG.datum(graphSVG.node()).call(DAGMinimap);  // Draw a Minimap at the minimap attach
        console.log("draw minimap", new Date().getTime() - start);
        start = (new Date()).getTime();
        graphSVG.selectAll(".node").call(DAGTooltip);        // Attach tooltips
        console.log("draw tooltips", new Date().getTime() - start);
        start = (new Date()).getTime();
        setupEvents();                      // Set up the node selection events
        console.log("draw events", new Date().getTime() - start);
        start = (new Date()).getTime();
        refreshViewport();                  // Update the viewport settings
        console.log("draw viewport", new Date().getTime() - start);
        start = (new Date()).getTime();
        attachContextMenus();
        console.log("draw contextmenus", new Date().getTime() - start);
        console.log("draw complete, total time=", new Date().getTime() - begin);
    }

    // Call the draw function
    this.draw();

    // Start with the graph all the way zoomed out
    resetViewport();

    // Save important variables
    this.attachPoint = attachPoint;
    this.impact_doc = impact_doc;
    this.DAG = DAG;
    this.DAGMinimap = DAGMinimap;
    this.DAGHistory = DAGHistory;
    this.DAGTooltip = DAGTooltip;
    this.DAGContextMenu = DAGContextMenu;
    this.graph = graph;
    this.resetViewport = resetViewport;
    this.history = history;

}