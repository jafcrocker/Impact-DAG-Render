/**
 * Created with IntelliJ IDEA.
 * User: zenoss
 * Date: 1/24/14
 * Time: 7:41 PM
 * To change this template use File | Settings | File Templates.
 */
function ImpactDAG(attachPoint, impact_doc, /*optional*/ params) {
    var dag = this;
    var aspect = "AVAILABILITY";
    var nodeTemplate = "{name}";

    // Setter for the node template
    dag.nodeTemplate = function(_) { if (!arguments.length) return nodeTemplate; nodeTemplate = _; return this; }

    // Get the necessary parameters
    var lightweight = params.lightweight ? true : false;

    // Attach the aspect menu
    var aspectMenu = d3.select(attachPoint)
        .append("div").attr("class", "aspectMenu").html("View:&nbsp;");
    aspectMenu.append("button").html("Availability").on("click", function(){
        aspect = "AVAILABILITY";
        d3.selectAll(".policy").remove();
        dag.draw();
    });
    aspectMenu.append("button").html("Performance").on("click", function(){
        aspect = "PERFORMANCE";
        d3.selectAll(".policy").remove();
        dag.draw();
    });

    var rootSVG = d3.select(attachPoint).append("svg").attr("class", "graph-viewport");

    // Set up graphics we will need to for rendering the graph
    var rootDefs = rootSVG.append("defs");
    var graphSVG = rootSVG.append("svg").attr("width", "100%").attr("height", "100%").attr("class", "graph-attach");
    graphSVG.node().oncontextmenu = function(d) { return false; };
    var minimapSVG = rootSVG.append("svg").attr("class", "minimap-attach");

    var graph = createGraphFromImpacts(impact_doc, params);

    var DAG = DirectedAcyclicGraph().animate(!lightweight).getedges(function (d) {
        var edges = [];
        d.getVisibleLinks().forEach(function (e) {
            if (! e.source.hidingDescendants)
                edges.push(e);
        });
        return edges;
    });

    var DAGMinimap = DirectedAcyclicGraphMinimap(DAG).width("19.5%").height("19.5%").x("80%").y("80%");
    var DAGTooltip = DirectedAcyclicGraphTooltip();
    var nodeContextMenu = ImpactNodeContextMenu();
    var contextMenu = ImpactContextMenu(dag);
    contextMenu.call(rootSVG.node(), rootSVG.select(".graph-attach"));

    // Update function
    var update = function(data){
        graph = updateGraphFromImpacts(data, graph);
        this.draw();
    }

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

    params.nodeTemplate ? dag.nodeTemplate(params.nodeTemplate) : null;

    var applyTemplate = function(d) {
        var nodeRepresentation = dag.nodeTemplate();
        for( var key in d.impact_node ){
            nodeRepresentation = nodeRepresentation.replace("{" + key + "}", d.impact_node[key]);
        }
        return nodeRepresentation;
    }

    DAG.updatenode(function(d){
        // Attach the DOM elements
        d3.select(this).attr("state", d.impact_node.states[aspect].context_state);
        d3.select(this).select(".nodeRepresentation").html(applyTemplate(d));

        // Attach/Detach marker for policies
        if(d.impact_node.states[aspect].global_policy){
            var policyRep = d3.select(this).append("g").attr("class", "policy");
            policyRep.append("rect").attr("rx", 2);
            policyRep.append("text").attr("font-size", 8).text("Global");
        }

        // Attach marker for policies
        if(d.impact_node.states[aspect].context_policy){
            var policyRep = d3.select(this).append("g").attr("class", "policy");
            policyRep.append("rect").attr("rx", 2).attr("class", "policy");
            policyRep.append("text").attr("font-size", 8).text("Context");
        }
    });

    DAG.drawnode(function(d) {
        // Attach the DOM elements
        d3.select(this).attr("state", d.impact_node.states[aspect].context_state);

        // Attach box
        d3.select(this).append("rect").attr("rx", 4);

        // Attach HTML body
        d3.select(this).append("foreignObject").attr("class", "nodeRep")
            .append("xhtml:div").attr("class", "nodeRepresentation").html(applyTemplate(d));

        // Attach collapse marker if the node has hidden children
        if(d.hidingDescendants){
            d3.select(this).append("line").attr("class", "collapse");
        }

        // Attach/Detach marker for policies
        if(d.impact_node.states[aspect].global_policy){
            var policyRep = d3.select(this).append("g").attr("class", "policy");
            policyRep.append("rect").attr("rx", 2);
            policyRep.append("text").attr("font-size", 8).text("Global");
        }

        // Attach marker for policies
        if(d.impact_node.states[aspect].context_policy){
            var policyRep = d3.select(this).append("g").attr("class", "policy");
            policyRep.append("rect").attr("rx", 2).attr("class", "policy");
            policyRep.append("text").attr("font-size", 8).text("Context");
        }

        var prior_pos = d.dagre;
        if (prior_pos!=null) {
            d3.select(this).attr("transform", graph.nodeTranslate);
        }
    });

    function toggleChildren(d) {
        var parent = d;
        parent.hidingDescendants = !parent.hidingDescendants;

        if(parent.hidingDescendants){
            d3.select(this).append("line").attr("class", "collapse");
        }else{
            d3.select(this).select(".collapse").remove();
        }

        updateDescendantVisibility(parent);

        DAG.removenode(function(d) {
            if (lightweight) {
                d3.select(this).remove();
            } else {
                var transform = "translate("+ parent.dagre.x+","+ parent.dagre.y+") scale(0.1)";
                d3.select(this).classed("visible", false).transition().attr("transform", transform).duration(800).remove();
            }
        });

        var transform = "translate("+ parent.dagre.x+","+ parent.dagre.y+") scale(0.1)";
        DAG.newnodetransition(function(d) {
            if (DAG.animate()) {
                d3.select(this).attr("transform", transform).transition().duration(800).attr("transform", DAG.nodeTranslate);
            } else {
                d3.select(this).attr("transform", transform).attr("transform", DAG.nodeTranslate);
            }
        });

        dag.draw();

        graphSVG.classed("hovering", false);
        var nodes = graphSVG.selectAll(".node");
        var edges = graphSVG.selectAll(".edge");
        edges.classed("hovered", false).classed("immediate", false);
        nodes.classed("hovered", false).classed("immediate", false);
    }

    // Attaches a context menu to any selected graph nodes
    function attachContextMenus() {
        nodeContextMenu.call(graphSVG.node(), graphSVG.selectAll(".node"));
        nodeContextMenu.on("open", function() {
            DAGTooltip.hide();
            }).on("close", function() {
                if (!lightweight) {
                    graphSVG.selectAll(".node").classed("preview", false);
                    graphSVG.selectAll(".edge").classed("preview", false);
                }
            }).on("editPolicies", function(d) { alert("TODO: edit policies...");
            }).on("addChildren", function(d) { alert("TODO: add children...");
            }).on("toggleChildren", toggleChildren );
    }

    // Detaches any bound context menus
    function detachContextMenus() {
        $(".graph .node").unbind("contextmenu");
    }


    // A function that attaches mouse-click events to nodes to enable node selection
    function setupEvents(){
        var nodes = graphSVG.selectAll(".node");
        var edges = graphSVG.selectAll(".edge");

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

        function highlightPath(center) {
            var path = getEntirePathLinks(center);

            var pathnodes = {};
            var pathlinks = {};

            path.forEach(function(p) {
                pathnodes[p.source.id] = true;
                pathnodes[p.target.id] = true;
                pathlinks[p.id] = true;
            });

            edges.classed("hovered", function(d) {
                return pathlinks[d.id];
            })
            nodes.classed("hovered", function(d) {
                return pathnodes[d.id];
            });
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
    this.DAGTooltip = DAGTooltip;
    this.nodeContextMenu = nodeContextMenu;
    this.graph = graph;
    this.resetViewport = resetViewport;
    this.update = update;
}