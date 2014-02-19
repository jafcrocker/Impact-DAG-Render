/**
 * Created with IntelliJ IDEA.
 * User: zenoss
 * Date: 1/24/14
 * Time: 7:25 PM
 * To change this template use File | Settings | File Templates.
 */


var getParameters = function() {
    if (window.location.href.indexOf("?")==-1) return {};
    var param_strs = window.location.href.substr(window.location.href.indexOf("?")+1).split("&");
    var params = {};
    param_strs.forEach(function(str) {
        splits = str.split("=");
        if (splits.length==2) {
            params[splits[0]] = splits[1];
        }
    });
    return params;
};

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
    for (var id in impact_nodes) {
        nodes[id] = new Node(id);
        nodes[id].impact_node = impact_nodes[id];
    }

    // Second link the nodes together
    console.info("Linking graph nodes");
    var edges = impact_doc["edges"];
    for (var i in edges) {
        edge = edges[i];
        var toNode = nodes[edge["to"]];
        var fromNode=nodes[edge["from"]];
        toNode.addChild(fromNode);
    }

    // Create the graph and add the nodes
    var graph = new Graph();
    for (var id in nodes) {
        graph.addNode(nodes[id]);
    }

    console.log("Done creating graph from reports");
    return graph;
}

var updateGraphFromImpacts = function(impact_doc, graph) {
    // Create nodes
    var nodes = {};
    var impact_nodes = impact_doc["nodes"];
    for (var id in impact_nodes) {
        nodes[id] = new Node(id);
        nodes[id].impact_node = impact_nodes[id];

        // copy data from the old node so nodes change visually
        var oldNode = graph.getNode(id);
        if (oldNode != null){
            nodes[id].hidden = oldNode.hidden;
            nodes[id].hidingDescendants = oldNode.hidingDescendants;
            nodes[id].dagre_id = oldNode.dagre_id;
            nodes[id].dagre = oldNode.dagre;
            nodes[id].dagre_prev = oldNode.dagre_prev;
        }
    }

    // Second link the nodes together
    var edges = impact_doc["edges"];
    for (var i in edges) {
        edge = edges[i];
        var toNode = nodes[edge["to"]];
        var fromNode=nodes[edge["from"]];
        toNode.addChild(fromNode);
    }

    // Create the graph and add the nodes
    var graph = new Graph();
    for (var id in nodes) {
        graph.addNode(nodes[id]);
    }

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