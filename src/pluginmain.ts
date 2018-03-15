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
    private questIndex:number;

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
        this.questIndex = 0;
    }

    // Make initial network calls to setup the plugin.
    // Need this as a separate call from the ctor since ctors aren't async.
    private InitAsync(): Promise<void> {
        this._info = null;

        $("#polling").show();
        $("#contents").hide();
        $("#maincontent").hide();

        // Check if we're ready?
        var admin = new trcSheet.SheetAdminClient(this._sheet);
        return admin.WaitAsync().then(() => {
            // We're ready!
            $("#polling").hide();
            $("#contents").show();
            $("#maincontent").show();


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
                var newLine = "<br>";
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
                    viewText += "<div>" + name;
                    if (desc) {
                        viewText += '|'+desc;
                    }
                    viewText += "?</div>";
                    var ans = '' ;
                    if (answers) {

                       for (let k : number = 0; k< 4 ;k++) {

                            var answer: string = answers[k];
                            ans += "<div>" + $.trim(answer) + "</div>";
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

                if (e1) {
                    e1.append(eBody);
                    root.append(e1);
                }
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

        if (add) {
            var questions = [add];

            this.AddQuestionInSheet(questions);
        } else {
            return;
        }
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

    public onAddMultipleQuestion(): void {

        let questions = new Array();
        for (let i: number = 0; i <= this.questIndex; i++) {
            if ($('div#new' + i).length == 1) {
                var answers: string[] = [];
                var qname = $("#qname"+i).val();
                var qdescr = $("#qdescr"+i).val();

                if (!qname) {
                    alert('Error: Question shortname is missing');
                    return;
                }

                var answers: string[] = [];
                MyPlugin.AddAnswer(answers, "Answer1-"+i);
                MyPlugin.AddAnswer(answers, "Answer2-"+i);
                MyPlugin.AddAnswer(answers, "Answer3-"+i);
                MyPlugin.AddAnswer(answers, "Answer4-"+i);
                MyPlugin.AddAnswer(answers, "Answer5-"+i);

                var add = this.validateQuestion(qname, qdescr, answers);
                if (add) {
                    questions.push(add);
                } else {
                    return;
                }
            }
        }
        this.AddQuestionInSheet(questions);
    }

    public onAddmoreQuest() : void {
        this.questIndex++;
        var firstDiv = $("#new0");
        var newDiv = "<div id='new" + this.questIndex + "'><hr style='border-top: 1px solid #8c8b8b;'><a style='cursor: pointer;float:right;' onclick='_plugin.onRemoveButton(" + this.questIndex + ")' id='remove[" + this.questIndex + "]' class='btn' ><i class='glyphicon glyphicon-remove'></i><a/><p><input id='qname" + this.questIndex + "' placeholder='(slug)'> (required, Short name, made of just A-Z,0-9,_ ) </p><p><input id='qdescr" + this.questIndex + "' placeholder='(description)' size=80> (optional, Human readable description)</p><p>Possible Answers:</p><ul><li><input id='Answer1-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/><li><input id='Answer2-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/><li><input id='Answer3-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/><li><input id='Answer4-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/><li><input id='Answer5-" + this.questIndex + "' placeholder='(answer)' size='40'></li></ul></div><div>";

        firstDiv.append(newDiv);
    }

    public onRemoveButton(Id : string) : void {

       //this.questIndex--;
       $( "#new"+Id ).remove();
    }

    public onTextImport() : void {
        var e1 = "";
        for (var i = 0; i <= this.questIndex; i++) {

            if ($('div#new' + i).length == 1) {
                var qname = $("#qname"+i).val();
                var qdescr = $("#qdescr"+i).val();
                e1 += "<div>"+qname;
                if(qdescr)
                {
                    e1 += "|"+qdescr;
                }
                if (qname || qdescr) {
                    e1 += "?";
                }

                e1 += "</div>";
                for(var j = 1; j <= 5;j++){

                    var ans = $("#Answer"+j+"-"+i).val();
                    if(ans)
                    {
                        e1 +=  "<div>"+ans+"</div>";
                    }
                }
                e1 += "<br>";
            }
        }
        $("#importText").html(e1);
    }

    public onViewImport() : void {

        var i = 0;
        var j = 1;
        var k = 0;
        var index = this.questIndex;
        //reset form
        $('form#survey-form')[0].reset();


        $("#importText div").each(function() {
            var item = $(this).html();

            if (item == "<br>") {
                return ;
            }

            if (item.indexOf("?") != -1) {

                if (k != 0) {
                    i++;
                    j = 1;

                    if (k > index) {
                        $('#addQuestion').click();
                    }
                }
                item = item.replace("?", "");
                var ques = item.split("|");

                $('#qname'+i).val(ques[0]);
                $('#qdescr'+i).val(ques[1]);
                k++;
            } else {
                $('#Answer' + j + '-' +i).val(item);
                j++;
            }
        });
    }

    public onBulkImport(): void {
        $('#as-view').click();
    }
}