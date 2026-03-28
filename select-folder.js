/*\
title: $:/plugins/welford/twexe/select-folder.js
type: application/javascript
module-type: widget

Select-folder widget for HTA mode using ActiveXObject.
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false, ActiveXObject: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var SelectFolderWidget = function(parseTreeNode,options) {
    this.initialise(parseTreeNode,options);
};

SelectFolderWidget.prototype = new Widget();

SelectFolderWidget.prototype.render = function(parent,nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();

    // Create the button element
    var buttonNode = this.document.createElement("button");
    
    // Render the contents inside the widget tags as the button label
    this.makeChildWidgets();
    this.renderChildren(buttonNode, null);

    // Click event to trigger folder selection
    buttonNode.addEventListener("click", function(event) {
        var tiddler = self.getAttribute("tiddler", self.getVariable("currentTiddler"));
        var field = self.getAttribute("field", "text");
        var index = self.getAttribute("index");
        var def = self.getAttribute("default", "");

        try {
            // HTA relies on ActiveXObject to spawn a folder browser dialogue
            var shell = new ActiveXObject("Shell.Application");
            var folder = shell.BrowseForFolder(0, "Select a Folder", 0, "");
            var path = def;

            if (folder != null) {
                path = folder.Self.Path;
            }

            if (path) {
                $tw.wiki.setText(tiddler, index ? undefined : field, index, path);
            }
        } catch(e) {
            console.error("Failed to open folder browser. Ensure you are running in HTA mode.", e);
            alert("ActiveXObject error: Folder selection requires HTA mode.");
        }
    });

    parent.insertBefore(buttonNode,nextSibling);
    this.domNodes.push(buttonNode);
};

SelectFolderWidget.prototype.execute = function() {};

SelectFolderWidget.prototype.refresh = function(changedTiddlers) {
    var changedAttributes = this.computeAttributes();
    if(Object.keys(changedAttributes).length > 0) {
        this.refreshSelf();
        return true;
    }
    return this.refreshChildren(changedTiddlers);
};

exports["select-folder"] = SelectFolderWidget;

})();
