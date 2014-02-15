var ImpactNodeContextMenu = function() {
    var onMenuOpen = function(d) {
        handlers.open.call(this, d);
    }

    var onMenuClose = function(d) {
        handlers.close.call(this, d);
    }
    var onMenuClick = function(d) {
        if (d.operation=="toggleChildren") {
            handlers.toggleChildren.call(this, d3.select(this).datum());
        }
    }
    var ctxmenu = ContextMenu()
        .on("open", onMenuOpen)
        .on("close", onMenuClose)
        .on("click", onMenuClick);

    var menu = function(selection) {
        menu.hide.call(this, selection);
        selection.each(function(d) {

            var items = [];

            items.push({
                "operation": "toggleChildren",
                "name": "Toggle Children"
            });

            ctxmenu.call(this, items);
            d3.select(this).classed("hascontextmenu", true);
        });
    }

    menu.hide = function(selection) {
        d3.select(this).selectAll(".hascontextmenu").each(function(d) {
            $(this).unbind("contextmenu");
        })
        d3.select(this).selectAll(".context-menu").remove();
    }

    var onhide = function(nodes, selectionname) {}

    var handlers = {
        "open": function() {},
        "close": function() {},
        "toggleChildren": function() {}
    }

    menu.on = function(event, _) {
        if (!handlers.hasOwnProperty(event)) return menu;
        if (arguments.length==1) return handlers[event];
        handlers[event] = _;
        return menu;
    }

    return menu;
}
