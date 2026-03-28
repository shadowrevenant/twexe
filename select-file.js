/*\
title: $:/plugins/welford/twexe/select-file.js
type: application/javascript
module-type: widget

Select-file widget for HTA mode returning an absolute path.
\*/
(function(){

/*jslint node: true, browser: true */
/*global $tw: false */
"use strict";

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var SelectFileWidget = function(parseTreeNode,options) {
    this.initialise(parseTreeNode,options);
};

SelectFileWidget.prototype = new Widget();

SelectFileWidget.prototype.render = function(parent,nextSibling) {
    var self = this;
    this.parentDomNode = parent;
    this.computeAttributes();
    this.execute();

    // Create the button element
    var buttonNode = this.document.createElement("button");
    
    // Render the contents inside the widget tags as the button label
    this.makeChildWidgets();
    this.renderChildren(buttonNode, null);

    // Click event to trigger file selection
    buttonNode.addEventListener("click", function(event) {
        var tiddler = self.getAttribute("tiddler", self.getVariable("currentTiddler"));
        var field = self.getAttribute("field", "text");
        var index = self.getAttribute("index");
        var def = self.getAttribute("default", "");

        // Create a hidden file input. 
        // In HTA mode/IE, input.value safely returns the absolute path instead of a fakepath.
        var input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);

        input.onchange = function() {
            var path = input.value || def;
            if (path) {
                // If index is provided, write to a DataTiddler index, otherwise write to a field
                $tw.wiki.setText(tiddler, index ? undefined : field, index, path);
            }
            document.body.removeChild(input);
        };

        input.click();
    });

    parent.insertBefore(buttonNode,nextSibling);
    this.domNodes.push(buttonNode);
};

SelectFileWidget.prototype.execute = function() {};

SelectFileWidget.prototype.refresh = function(changedTiddlers) {
    var changedAttributes = this.computeAttributes();
    if(Object.keys(changedAttributes).length > 0) {
        this.refreshSelf();
        return true;
    }
    return this.refreshChildren(changedTiddlers);
};

exports["select-file"] = SelectFileWidget;

})();
