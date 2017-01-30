//
// Copyright (c) 2014-2016 THUNDERBEAST GAMES LLC
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

import EditorUI = require("../../EditorUI");

var breakMode = true;

class SelectionPrefabWidget extends Atomic.UILayout {

    widgetLayout: Atomic.UILayout;
    noticeLayout: Atomic.UILayout;
    node: Atomic.Node;

    constructor() {

        super();

        var fd = new Atomic.UIFontDescription();
        fd.id = "Vera";
        fd.size = 11;

        var widgetLayout = this.widgetLayout = new Atomic.UILayout();
        var noticeLayout = this.noticeLayout = new Atomic.UILayout();

        this.axis = Atomic.UI_AXIS.UI_AXIS_Y;
        widgetLayout.layoutDistribution = Atomic.UI_LAYOUT_DISTRIBUTION.UI_LAYOUT_DISTRIBUTION_GRAVITY;
        noticeLayout.layoutDistribution = Atomic.UI_LAYOUT_DISTRIBUTION.UI_LAYOUT_DISTRIBUTION_GRAVITY;

        var name = new Atomic.UITextField();
        name.textAlign = Atomic.UI_TEXT_ALIGN.UI_TEXT_ALIGN_LEFT;
        name.skinBg = "InspectorPrefabTextAttrName";
        name.text = "Prefab";
        name.fontDescription = fd;

        var saveButton = new Atomic.UIButton();
        saveButton.text = "Save";
        saveButton.fontDescription = fd;

        saveButton.onClick = () => {

            this.node.scene.sendEvent(Editor.SceneEditPrefabSaveEventType, {node : this.node});
            return true;
        };

        var undoButton = new Atomic.UIButton();
        undoButton.text = "Revert";
        undoButton.fontDescription = fd;

        undoButton.onClick = () => {

            this.node.scene.sendEvent(Editor.SceneEditPrefabRevertEventType, {node : this.node});
            return true;

        };

        var breakButton = new Atomic.UIButton();
        breakButton.text = "Edit Break";
        breakButton.toggleMode = true;
        breakButton.value = breakMode ? 1 : 0;
        breakButton.fontDescription = fd;
        breakButton.tooltip  = "Prompt to remove prefab connection";

        breakButton.onClick = () => {
            breakMode = breakButton.value == 1 ? true : false;
            return true;
        };

        this.subscribeToEvent("ComponentEditEnd", () => {

            if (breakMode && this.node) {

                var window = new ConfirmPrefabBreak(this.node);
                window.show();
            }

        });

        var noticeName = new Atomic.UITextField();
        noticeName.textAlign = Atomic.UI_TEXT_ALIGN.UI_TEXT_ALIGN_LEFT;
        noticeName.skinBg = "InspectorTextAttrName";
        noticeName.text = "Prefab";
        noticeName.fontDescription = fd;

        var noticeText = new Atomic.UITextField();
        noticeText.textAlign = Atomic.UI_TEXT_ALIGN.UI_TEXT_ALIGN_LEFT;
        noticeText.skinBg = "InspectorTextAttrName";
        noticeText.text = "Multiple Selection";
        noticeText.fontDescription = fd;

        noticeLayout.addChild(noticeName);
        noticeLayout.addChild(noticeText);

        widgetLayout.addChild(name);
        widgetLayout.addChild(saveButton);
        widgetLayout.addChild(undoButton);
        widgetLayout.addChild(breakButton);

        this.addChild(this.widgetLayout);
        this.addChild(this.noticeLayout);

        this.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_GONE;

    }

    detectPrefab(node: Atomic.Node): boolean {

        if (node.getComponent("PrefabComponent"))
            return true;

        if (node.parent)
            return this.detectPrefab(node.parent);

        return false;

    }


    updateSelection(nodes: Atomic.Node[]) {

        var hasPrefab = false;
        this.node = null;

        for (var i in nodes) {

            var node = nodes[i];
            if (this.detectPrefab(node)) {
                hasPrefab = true;
                break;
            }

        }

        if (!hasPrefab) {
            this.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_GONE;
            return;
        }

        this.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_VISIBLE;

        if (nodes.length > 1) {
            this.noticeLayout.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_VISIBLE;
            this.widgetLayout.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_GONE;
            return;
        }

        this.noticeLayout.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_GONE;
        this.widgetLayout.visibility = Atomic.UI_WIDGET_VISIBILITY.UI_WIDGET_VISIBILITY_VISIBLE;
        this.node = nodes[0];

    }


}

class ConfirmPrefabBreak extends Atomic.UIWindow {

    constructor(node:Atomic.Node) {

        super();

        this.node = node;

        this.settings = Atomic.UI_WINDOW_SETTINGS.UI_WINDOW_SETTINGS_DEFAULT & ~Atomic.UI_WINDOW_SETTINGS.UI_WINDOW_SETTINGS_CLOSE_BUTTON;

        this.text = "Break Prefab Connection";
        this.load("AtomicEditor/editor/ui/breakprefab.tb.txt");

        var message = <Atomic.UIEditField>this.getWidget("message");
        message.text = "Editing this node will break the prefab connection.\nThis operation cannot be undone, do you want to continue?";

        this.resizeToFitContent();
        this.center();

        this.dimmer = new Atomic.UIDimmer();

        this.subscribeToEvent(Atomic.UIWidgetEvent((ev) => { this.handleWidgetEvent(ev); }));

    }

    handleWidgetEvent(ev: Atomic.UIWidgetEvent) {

        if (ev.type == Atomic.UI_EVENT_TYPE.UI_EVENT_TYPE_CLICK) {

            var id = ev.target.id;

            if (id == "breakprefab") {

                this.hide();

                this.node.scene.sendEvent(Editor.SceneEditPrefabBreakEventType, {node : this.node});

                return true;
            }

            if (id == "cancel") {

                this.hide();

                this.node.scene.sendEvent(Editor.SceneEditPrefabRevertEventType, {node : this.node});

                return true;
            }

        }
    }

    show() {

        var view = EditorUI.getView();
        view.addChild(this.dimmer);
        view.addChild(this);

    }

    hide() {

        if (this.dimmer.parent)
            this.dimmer.parent.removeChild(this.dimmer, false);

        if (this.parent)
            this.parent.removeChild(this, false);

    }

    node: Atomic.Node;
    dimmer: Atomic.UIDimmer;

}

export = SelectionPrefabWidget;
