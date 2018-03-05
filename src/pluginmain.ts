// Sample 'Hello World' Plugin template.
// Demonstrates:
// - typescript
// - using trc npm modules and browserify
// - uses promises.
// - basic scaffolding for error reporting.
// This calls TRC APIs and binds to specific HTML elements from the page.
import * as XC from 'trc-httpshim/xclient'
import * as common from 'trc-httpshim/common'

import * as core from 'trc-core/core'

import * as trcSheet from 'trc-sheet/sheet'
import * as trcSheetEx from 'trc-sheet/sheetEx'

import * as gps from 'trc-web/gps'
import * as plugin from 'trc-web/plugin'
import * as trchtml from 'trc-web/html'

declare var $: any; // external definition for JQuery

// Provide easy error handle for reporting errors from promises.  Usage:
//   p.catch(showError);
declare var showError: (error: any) => void; // error handler defined in index.html

export class MyPlugin {
    private _sheet: trcSheet.SheetClient;
    private _pluginClient: plugin.PluginClient;
    private _info: trcSheet.ISheetInfoResult;

    public static BrowserEntryAsync(
        auth: plugin.IStart,
        opts: plugin.IPluginOptions
    ): Promise<MyPlugin> {

        // You can set gpsTracker null if you don't need GPS.
        var pluginClient = new plugin.PluginClient(auth, opts);

        // Do any IO here...

        var throwError = false; // $$$ remove this

        var plugin2 = new MyPlugin(pluginClient);

        return plugin2.InitAsync().then(() => {
            if (throwError) {
                throw "some error";
            }

            return plugin2;
        });
    }

    // Expose constructor directly for tests. They can pass in mock versions.
    public constructor(p: plugin.PluginClient) {
        this._sheet = new trcSheet.SheetClient(p.HttpClient, p.SheetId);
    }

    // Make initial network calls to setup the plugin.
    // Need this as a separate call from the ctor since ctors aren't async.
    private InitAsync(): Promise<void> {
        this._info = null;

        $("#polling").show();
        $("#contents").hide();

        // Check if we're ready?
        var admin = new trcSheet.SheetAdminClient(this._sheet);
        return admin.WaitAsync().then(() => {
            // We're ready!
            $("#polling").hide();
            $("#contents").show();

            return this._sheet.getInfoAsync().then(info => {
                this._info = info;
                this.updateInfo(info);
            });
        });
    }

    // Display sheet info on HTML page
    public updateInfo(info: trcSheet.ISheetInfoResult): void {

        var root = $("#existing");
        var readOnly = $("#viewText");
        // Add existing questions to the page.
        for (var i in info.Columns) {
            var c = info.Columns[i];

            var viewText = '';
            if (!c.IsReadOnly) {
                var name = c.Name; // Api name
                var desc = c.Description; // maybe missing
                var answers = c.PossibleValues; // Possible values
                var newLine = "\r\n";
                if(name!= 'Party' && name!='Cellphone' && name!='Comment' && name!='Comments')
                {
                    var l = name.length; // length of the original string
                    var lastChar = name.substring(l-1, l); // get the last char of the original string
                    if (lastChar == "?") { // if the last char is found, remove the last char
                        name = name.substring(0, l-1);
                    }
                    else { // otherwise do nothing
                    name = name;
                    }
                    viewText += name;
                    if (desc) {
                        viewText += '|'+desc;
                    }
                    
                    var ans = '' ;
                    if (answers) {

                       viewText += newLine;
                       for (let k : number = 0; k< 4 ;k++) {

                            var answer: string = answers[k];
                            ans += $.trim(answer) ;

                            if(answer)
                            {
                                ans += newLine;
                            }
                        }
                        viewText += ans;
                        viewText += newLine;
                        readOnly.append(viewText);
                    }
                }
                if (answers) {
                    
                    var text = "[" + name + "]";
                    if (desc) {
                        text += " " + desc;
                    }
                    var e1 = $("<div class='panel panel-default'>")
                    var eHeading = $("<div class='panel-heading'>").text(text);
                    e1.append(eHeading);

                    var eBody = $("<div class='panel-body'>");

                    // var tx3 = $("<p>" + text + "</p>");

                    var e2 = $("<ul>");
                    for (var j in answers) {

                        var answer: string = answers[j];

                        var elementAnswer = $("<li>").text(answer);
                        e2.append(elementAnswer);
                    }
                     eBody.append(e2);
                    
                }
               
                e1.append(eBody);
                root.append(e1);
            }
        }

    }

    // get answer from html page and add to the answers array.
    private static AddAnswer(answers: string[], elementName: string): void {
        var val = $("#" + elementName).val();
        if (val) {
            answers.push(val);
        }
    }

    public onAddQuestion(): void {
        var qname = $("#qname").val();
        var qdescr = $("#qdescr").val();
        if (!qname) {
            alert('Error: Question shortname is missing');
            return;
        }

        var answers: string[] = [];
        MyPlugin.AddAnswer(answers, "Answer1");
        MyPlugin.AddAnswer(answers, "Answer2");
        MyPlugin.AddAnswer(answers, "Answer3");
        MyPlugin.AddAnswer(answers, "Answer4");
        MyPlugin.AddAnswer(answers, "Answer5");

        var add = this.validateQuestion(qname, qdescr, answers);

        var questions = [add];

        this.AddQuestionInSheet(questions);
    }

    private validateQuestion(qname: string, qdescr: string, answers: any): any {
        // Validate slug doesn't already exist
        for (var i in this._info.Columns) {

            var c = this._info.Columns[i];

            if (qname.toUpperCase() == c.Name.toUpperCase()) {
                alert("Error: Question already exists: " + qname);
                return;
            }
            if (qdescr && c.Description) {
                if (qdescr.toUpperCase() == c.Description.toUpperCase()) {
                    alert("Error: Question description already exists: " + qdescr);
                    return;
                }
            }
        }

        // Validate rest of payload
        var add: trcSheet.IMaintenanceAddColumn =
            {
                ColumnName: qname,
                Description: qdescr,
                PossibleValues: answers
            };

        try {
            trcSheet.Validators.ValidateAddColumn(add);
            return add;
        }
        catch (e) {
            alert("Error: Can't add question: " + e);
            return;
        }
    }

    private AddQuestionInSheet(questions : any) {
        // Actually add the question and do the refresh
        var admin = new trcSheet.SheetAdminClient(this._sheet);
        admin.postOpAddQuestionAsync(questions).then(
            () => {
                return this.InitAsync();
            }
        );
    }

    public onAddMultipleQuestion(questIndex:number): void {

        let questions = new Array();
        for ( let i: number = 0; i <= questIndex; i++) {

                var answers: string[] = [];
                var qname = $("#qname"+i).val();
                var qdescr = $("#qdescr"+i).val();

                var answers: string[] = [];
                MyPlugin.AddAnswer(answers, "Answer1-"+i);
                MyPlugin.AddAnswer(answers, "Answer2-"+i);
                MyPlugin.AddAnswer(answers, "Answer3-"+i);
                MyPlugin.AddAnswer(answers, "Answer4-"+i);
                MyPlugin.AddAnswer(answers, "Answer5-"+i);

                var add = this.validateQuestion(qname, qdescr, answers);
                questions.push(add);
        }
        this.AddQuestionInSheet(questions);
    }
}