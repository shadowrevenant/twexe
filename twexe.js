/*\\
title: $:/plugins/welford/twexe/twexe.js
type: application/javascript
module-type: widget

twexe widget
\\*/
(function(){
/*jslint node: true, browser: true */
/*global $tw: false */
//"use strict";

var g_field_prefix	= "twexe_";

var g_target	= "target";
var g_name		= "name";
var g_cwd		= "cwd";
var g_tooltip	= "tooltip";
var g_args		= "args";
var g_deployDir	= "deploydir";

var g_src		= "tiddler";
var g_tmp		= "tmpdir";

function mouseX(evt) {
	if (evt.pageX) {
		return evt.pageX;
	} else if (evt.clientX) {
		return evt.clientX + (document.documentElement.scrollLeft ?
			document.documentElement.scrollLeft :
			document.body.scrollLeft);
	} else {
		return null;
	}
}

function mouseY(evt) {
	if (evt.pageY) {
		return evt.pageY;
	} else if (evt.clientY) {
		return evt.clientY + (document.documentElement.scrollTop ?
		document.documentElement.scrollTop :
		document.body.scrollTop);
	} else {
		return null;
	}
}

var Widget = require("$:/core/modules/widgets/widget.js").widget;

var TWExeWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode, options);

	if (TWExeWidget.prototype.context_menu == null) {
		var context_menu            = document.createElement("div");
		var explorer                = document.createElement("button");
		var clipboard               = document.createElement("button");
		var open_tiddler            = document.createElement("button");
		var deploy_tiddler          = document.createElement("button");

		explorer.innerHTML          = "Open in Explorer";
		clipboard.innerHTML         = "Copy Path to clipboard";
		open_tiddler.innerHTML      = "Open Defining Tiddler";
		deploy_tiddler.innerHTML    = "Deploy Tiddler";

		explorer.style.display = clipboard.style.display = open_tiddler.style.display = deploy_tiddler.deploy
		= "block";
		explorer.style.width = clipboard.style.width = open_tiddler.style.width = deploy_tiddler.style.width
		= "100%";

		explorer.classList.add("twexe"); clipboard.classList.add("twexe"); open_tiddler.classList.add("twexe");

		context_menu.appendChild(explorer);
		context_menu.appendChild(clipboard);
		context_menu.appendChild(open_tiddler);
		context_menu.appendChild(deploy_tiddler);

		context_menu.style.display = "None";
		context_menu.style.zIndex = "1000";
		context_menu.style.position = "absolute";

		TWExeWidget.context_menu = context_menu;
		TWExeWidget.explorer = explorer;
		TWExeWidget.clipboard = clipboard;
		TWExeWidget.open_tiddler = open_tiddler;
		TWExeWidget.deploy_tiddler = deploy_tiddler;

		document.body.appendChild(TWExeWidget.context_menu)

		document.onmousedown = function (event) {
			if (   event.target == TWExeWidget.clipboard 
				|| event.target == TWExeWidget.explorer 
				|| event.target == TWExeWidget.open_tiddler
				|| event.target == TWExeWidget.deploy_tiddler
			) {
				event.target.click();
			}
			TWExeWidget.context_menu.style.display = "None";
		};
	}
};

TWExeWidget.prototype = new Widget();
TWExeWidget.context_menu = null;
TWExeWidget.explorer = null;
TWExeWidget.clipboard = null;
TWExeWidget.open_tiddler = null;
TWExeWidget.deploy_tiddler = null;

var circularstack = {};
TWExeWidget.prototype.ResolveFinalText = function (value, textReference)
{
	if(value in circularstack) {return;}
	var txt = textReference ? this.wiki.getTextReference(value,"",this.tiddler_name) : value;
	if(!txt) return "";
	circularstack[value] = true;
	var c=0;
	while(c<txt.length) {
		var transclude_start = c;
		if(transclude_start+4 < txt.length && txt[transclude_start] == '{' && txt[transclude_start+1] == '{') {
			var start_offset = 2;
			if(txt[transclude_start+2] == '|' && txt[transclude_start+3] == '|'){
				start_offset = 4
			};
			var transclude_end = transclude_start + 1;
			while(transclude_end + 2 < txt.length && txt[transclude_end] != "}" && txt[transclude_end+1] != "}"){transclude_end++};
			var replacement = this.ResolveFinalText(txt.substring(transclude_start+start_offset,transclude_end+1),true);
			txt = txt.substring(0, transclude_start) + replacement + txt.substring(transclude_end + 3);
		}
		c++;
	}
	delete circularstack[value];
	return txt;
}

TWExeWidget.prototype.GetLatestDetails = function ()
{
	this.tiddler_name = this.getAttribute(g_src,this.getVariable("currentTiddler"));
	this.tmpDir       = this.ResolveFinalText(this.getAttribute(g_tmp,this.wiki.getTiddlerText("$:/plugins/welford/twexe/tmpdir")));
	this.bDeployMacro = this.getAttribute("deploy",null) != null ? true : false;

	this.target = this.name = this.tooltip = this.cwd = this.args = null;
	this.isImmediate = false;
	this.hasActiveX = true;
	this.isFolder = false;
	this.contents = "pause";

	tiddler = this.wiki.getTiddler(this.tiddler_name);
	if (tiddler) {
		this.target   = this.ResolveFinalText(this.getAttribute(g_target,   (tiddler.hasField(g_field_prefix + g_target)    ? tiddler.fields[g_field_prefix + g_target]    : "")));
		this.name     = this.ResolveFinalText(this.getAttribute(g_name,     (tiddler.hasField(g_field_prefix + g_name)      ? tiddler.fields[g_field_prefix + g_name]      : this.tiddler_name)));
		this.tooltip  = this.ResolveFinalText(this.getAttribute(g_tooltip,  (tiddler.hasField(g_field_prefix + g_tooltip)   ? tiddler.fields[g_field_prefix + g_tooltip]   : " ")));
		this.cwd      = this.ResolveFinalText(this.getAttribute(g_cwd,      (tiddler.hasField(g_field_prefix + g_cwd)       ? tiddler.fields[g_field_prefix + g_cwd]       : ".\\\\")));
		this.args     = this.ResolveFinalText(this.getAttribute(g_args,     (tiddler.hasField(g_field_prefix + g_args)      ? tiddler.fields[g_field_prefix + g_args]      : "")));
		this.deployDir= this.ResolveFinalText(this.getAttribute(g_deployDir,(tiddler.hasField(g_field_prefix + g_deployDir) ? tiddler.fields[g_field_prefix + g_deployDir] : null)));

		if(this.target.trim().length == 0){
			this.isImmediate = true;
			// FIX: Use renderTiddler instead of ResolveFinalText so that
			// widgets like <$list>, <$set>, <$vars>, etc. are fully
			// evaluated before their output is written to the .bat file.
			this.contents = this.wiki.renderTiddler("text/plain", this.tiddler_name, {
				variables: { currentTiddler: this.tiddler_name }
			});
		}
	}	

	if (this.target != null) {
		var path = this.target.split("/").join("\\\\");
		try{
			var FSO = new ActiveXObject("Scripting.FileSystemObject");		
			var WshShell = new ActiveXObject("WScript.Shell");
			if (path.trim().length > 0 && FSO.FolderExists(WshShell.ExpandEnvironmentStrings(path))) {
				this.isFolder = true;		
			}
		}
		catch (err) {
			this.hasActiveX = false;
		}
	}
}

var g_twexeCount = 0;
TWExeWidget.prototype.render = function (parent,nextSibling) {
	this.parentDomNode = parent;
	this.computeAttributes();
	this.execute();

	var self = this;

	var button = this.document.createElement("button");
	var classes = this["class"].split(" ") || [];	
	button.className = classes ? classes.join(" ") : "";
	button.classList.add("twexe");
	if(this.style) {
		button.setAttribute("style", this.style);
	}
	button.innerHTML = (this.isFolder ? "Folder: " : "") + this.name;
	if(!button.isTiddlyWikiFakeDom) {
		button.setAttribute("title", this.tooptip);
		if (self.target) {
			var tmp = button.getAttribute("title")
			button.setAttribute( "title", (tmp ? tmp : "") +
"\\
\\n- - - - - - - - - - - - - - - - - - - - - - - - - - - -\\
\\ncalls : " + self.target.split("\\\\").join("/") );
		}

		button.addEventListener("click", function (event) {
			self.GetLatestDetails();
			if(self.isImmediate){
				if(self.bDeployMacro) {
					self.deployTiddler(event);
				} else {
					self.runTiddler(event, (g_twexeCount++).toString(10));
				}
			}else {
				self.runFile(event);
			}
			event.preventDefault();
			event.stopPropagation();
			return true;
		}, false);

		button.oncontextmenu = function (event) {
			TWExeWidget.context_menu.style.display = "block";
			TWExeWidget.context_menu.style.top = mouseY(event) + "px";
			TWExeWidget.context_menu.style.left = mouseX(event) + "px";

			var old_element = TWExeWidget.explorer;
			var new_element = old_element.cloneNode(true);
			old_element.parentNode.replaceChild(new_element, old_element);
			TWExeWidget.explorer = new_element;

			var old_element = TWExeWidget.clipboard;
			var new_element = old_element.cloneNode(true);
			old_element.parentNode.replaceChild(new_element, old_element);
			TWExeWidget.clipboard = new_element;

			var old_element = TWExeWidget.open_tiddler;
			var new_element = old_element.cloneNode(true);
			old_element.parentNode.replaceChild(new_element, old_element);
			TWExeWidget.open_tiddler = new_element;
			if (self.tiddler_name) {
				TWExeWidget.open_tiddler.style.display = "block";
			}
			else {
				TWExeWidget.open_tiddler.style.display = "None";
			}

			var old_element = TWExeWidget.deploy_tiddler;
			var new_element = old_element.cloneNode(true);
			old_element.parentNode.replaceChild(new_element, old_element);
			TWExeWidget.deploy_tiddler = new_element;
			if (self.deployDir && !self.bDeployMacro) {
				TWExeWidget.deploy_tiddler.style.display = "block";
			}
			else {
				TWExeWidget.deploy_tiddler.style.display = "None";
			}
			if(self.target.trim().length == 0){
				TWExeWidget.explorer.style.display = TWExeWidget.clipboard.style.display ="None";
			}else{
				TWExeWidget.explorer.style.display = TWExeWidget.clipboard.style.display = "block";
			}

			TWExeWidget.explorer.addEventListener("click",function (event) {
				self.GetLatestDetails();
				self.openFile(event);			
				event.preventDefault();
				event.stopPropagation();
				return true;			
			},false);

			TWExeWidget.clipboard.addEventListener("click",function (event) {
				self.GetLatestDetails();
				self.copyToClip(event);
				event.preventDefault();
				event.stopPropagation();
				return true;
			}, false);

			TWExeWidget.open_tiddler.addEventListener("click",function (event) {
				self.GetLatestDetails();
				self.OpenTiddler(event,self.tiddler_name);
				event.preventDefault();
				event.stopPropagation();
				return true;
			}, false);

			TWExeWidget.deploy_tiddler.addEventListener("click",function (event) {
				self.GetLatestDetails();
				self.deployTiddler(event);
				event.preventDefault();
				event.stopPropagation();
				return true;
			}, false);

			return false;
		}
	}

	parent.insertBefore(button,nextSibling);
	this.renderChildren(button, null);
	this.domNodes.push(button);
};

TWExeWidget.prototype.runFile = function (event) {
	if (this.hasActiveX == false) { return;}
	if (this.target) {
		var path = this.target.split("/").join("\\\\");		
		if (this.isFolder){
			this.openFile(event);
		}
		else {
			var args = this.args;
			if (!args){ args = "";}
			var WshShell = new ActiveXObject("WScript.Shell");
			WshShell.CurrentDirectory = WshShell.ExpandEnvironmentStrings(this.cwd);
			if(path.indexOf(".bat") > -1 || path.indexOf(".cmd") > -1){
				WshShell.Run( "cmd /c " + path + " " + args );
			}else{
				WshShell.Run( "cmd /c " + path + " " + args, 0 );
			}
		}
	} else {
		alert( "file parameter incorrectly set" )
	}
};

TWExeWidget.prototype.runTiddler = function (event, postfix) {
	if (this.hasActiveX == false) { return;}

	var WshShell = new ActiveXObject("WScript.Shell");
	var fso = new ActiveXObject("Scripting.FileSystemObject");

	var folder = this.deployDir ? this.deployDir : this.tmpDir;
	var file = this.deployDir ? this.tiddler_name : "twexe_"+postfix+".bat";
	folder = WshShell.ExpandEnvironmentStrings(folder.replace("\\n",""));
	file = WshShell.ExpandEnvironmentStrings(folder+"\\\\"+file);

	if(fso.FolderExists(folder) == false ) {
		fso.CreateFolder(folder)
	}

	var f = fso.CreateTextFile(file, true);
	f.WriteLine(this.contents);
	f.Close();

	var args = this.args;
	if (!args){ args = "";}

	WshShell.CurrentDirectory = WshShell.ExpandEnvironmentStrings(this.cwd);
	WshShell.Run( "cmd /c " + file + " " + args );
};

TWExeWidget.prototype.deployTiddler = function (event) {
	if (this.hasActiveX == false) { return;}

	var WshShell = new ActiveXObject("WScript.Shell");
	var fso = new ActiveXObject("Scripting.FileSystemObject");
	var folder = WshShell.ExpandEnvironmentStrings(this.deployDir.replace("\\n",""));
	var file = WshShell.ExpandEnvironmentStrings(folder + "\\\\" + this.tiddler_name);

	if(fso.FolderExists(folder) == false ) {
		fso.CreateFolder(folder)
	}

	var f = fso.CreateTextFile(file, true);
	f.WriteLine(this.contents);
	f.Close();
};

TWExeWidget.prototype.openFile = function (event) {
	if (this.hasActiveX == false) { return; }
	var WshShell = new ActiveXObject("WScript.Shell");
	if (this.target) {
		var path = WshShell.ExpandEnvironmentStrings(this.target.split("/").join("\\\\"));
		if (this.isFolder){
			WshShell.Run("explorer /e, " + path);		
		} else {
			WshShell.Run("explorer /select, " + path );
		}
	}
	else {
		alert("file parameter incorrectly set")
	}
};

TWExeWidget.prototype.copyToClip = function (event) {
	if (this.target) {
		window.clipboardData.setData( "Text", this.target.split("\\\\").join("/") );
		window.clipboardData.getData( "Text" );
	}
	else {
		alert("file parameter not set")
	}
};

TWExeWidget.prototype.OpenTiddler = function (event,name) {	
	var bounds = this.domNodes[0].getBoundingClientRect();
	this.dispatchEvent({
		type: "tm-navigate",
		navigateTo: name,
		navigateFromTitle: this.getVariable("storyTiddler"),
		navigateFromNode: this,
		navigateFromClientRect: {
			top: bounds.top, left: bounds.left, width: bounds.width, right: bounds.right, bottom: bounds.bottom, height: bounds.height
		},
		navigateSuppressNavigation: event.metaKey || event.ctrlKey || (event.button === 1)
	});
};

TWExeWidget.prototype.execute = function () {
	this.GetLatestDetails();

	this["class"] = this.getAttribute("class", "");
	this.style = this.getAttribute("style");
	this.selectedClass = this.getAttribute("selectedClass");
	this.defaultSetValue = this.getAttribute("default");
	this.makeChildWidgets();	
};

TWExeWidget.prototype.refresh = function (changedTiddlers) {
	var changedAttributes = this.computeAttributes();
	if (changedAttributes["class"] || changedAttributes.selectedClass || changedAttributes.style || changedAttributes.tiddler_name) {
		this.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

exports.twexe = TWExeWidget;

})();
