function ImpactInfoBox(DAG) {
    /*
     * Specifies the draw function for the Minimap class, for a DAG
     */
    return InfoBox().draw(function(d) {
        // TODO
    });
}

function InfoBox() {
    var width   = d3.functor(100),
        height  = d3.functor(100),
        x       = d3.functor(0),
        y       = d3.functor(0);
    
    
    function infobox(selection) {
        selection.each(function(data) {
            // Select the svg element that we draw to or add it if it doesn't exist
            var svg = d3.select(this).selectAll("svg").data([data]);
            var firsttime = svg.enter().append("svg");
            firsttime.append("rect").attr("class", "background").attr("fill", "#DDD")
                        .attr("fill-opacity", 0.5).attr("width", "100%").attr("height", "100%");
            var contents = firsttime.append("svg").attr("class", "infobox");
            contents.append("g").attr("class", "contents");
        });
    }
    
    var draw = function(d) {
        // TODO
    }
    
    infobox.draw = function(_) { if (!arguments.length) return draw; draw = _; return infobox; }
    infobox.width = function(_) { if (!arguments.length) return width; width = d3.functor(_); return infobox; }
    infobox.height = function(_) { if (!arguments.length) return height; height = d3.functor(_); return infobox; }
    infobox.x = function(_) { if (!arguments.length) return x; x = d3.functor(_); return infobox; }
    infobox.y = function(_) { if (!arguments.length) return y; y = d3.functor(_); return infobox; }
    
    return infobox;
}