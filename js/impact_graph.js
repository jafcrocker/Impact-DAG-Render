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

    var graph = createGraphFromImpacts(impact_doc, params);

    var DAG = DirectedAcyclicGraph().animate(!lightweight);
    var DAGMinimap = DirectedAcyclicGraphMinimap(DAG).width("19.5%").height("19.5%").x("80%").y("80%");
    // Attach the panzoom behavior
    var refreshViewport = function() {
        var t = zoom.translate();
        var scale = zoom.scale();
        graphSVG.select(".graph").attr("transform","translate("+t[0]+","+t[1]+") scale("+scale+")");
        minimapSVG.select('.viewfinder').attr("x", -t[0]/scale).attr("y", -t[1]/scale).attr("width", attachPoint.offsetWidth/scale).attr("height", attachPoint.offsetHeight/scale);
        if (!lightweight) graphSVG.selectAll(".node text").attr("opacity", 3*scale-0.3);
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

    // The main draw function
    this.draw = function() {
        console.log("draw begin")
        var begin = (new Date()).getTime();
        var start = (new Date()).getTime();
        graphSVG.datum(graph).call(DAG);    // Draw a DAG at the graph attach
        console.log("draw graph", new Date().getTime() - start);
        start = (new Date()).getTime();
        minimapSVG.datum(graphSVG.node()).call(DAGMinimap);  // Draw a Minimap at the minimap attach
        console.log("draw minimap", new Date().getTime() - start);
        console.log("draw complete, total time=", new Date().getTime() - begin);
    }

    // Call the draw function
    this.draw();

    // Start with the graph all the way zoomed out
    resetViewport();

    // Save important variables
    this.attachPoint = attachPoint;
    this.impact_doc = impact_doc;
    this.DAG = DAG
    this.graph = graph;
    this.resetViewport = resetViewport;
}