/**
 * Created with IntelliJ IDEA.
 * User: zenoss
 * Date: 1/24/14
 * Time: 7:25 PM
 * To change this template use File | Settings | File Templates.
 */
var getImpactServices = function(id, callback, errback) {
    d3.json(id, function(error, json) {
        if (error)
            errback(error);
        else
            callback(json);
    });
}

var createGraphFromImpacts = function(impact_doc, params) {
    console.log("Creating graph from impacts");

    // Create nodes
    console.info("Creating graph nodes");
    var nodes = {};
    var impact_nodes = impact_doc["nodes"];
    for (var name in impact_nodes) {
        nodes[name] = new Node(name);
        nodes[name].impact_node = impact_nodes[name];
    }

    // Second link the nodes together
    console.info("Linking graph nodes");
    var edges = impact_doc["edges"];
    for (var i in edges) {
        edge = edges[i];
        var toNode = nodes[edge["to"]];
        var fromNode=nodes[edge["from"]];
        toNode.addChild(fromNode);
        fromNode.addParent(toNode);
    }

    // Create the graph and add the nodes
    var graph = new Graph();
    for (var id in nodes) {
        graph.addNode(nodes[id]);
    }

    console.log("Done creating graph from reports");
    return graph;
}


var updateDescendantVisibility = function(node) {
    var updateChildren = function(node) {
        var isVisible = false;
        var hidingParents = {};

        node.getParents().forEach(function (p) {
            if (p.visible() && !p.hidingDescendants)
                isVisible = true;
            if (p['hidingDescendants'])
                hidingParents[p] = true;
        });

        node.visible(isVisible);

        node.getChildren().forEach(updateChildren);
    }

    node.getChildren().forEach(updateChildren);
}