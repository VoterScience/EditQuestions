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
    private questIndex: number;

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

                if (!!info.ParentId) {   
                    // Give a useful error immediately upfront, before they submit questions to the server.
                    var msg = "You can only edit questions on the top-level sheet."
                    alert (msg);
                    throw msg;
                }

                this._info = info;
                this.updateInfo(info);
            });
        });
    }

    // Required columns 
    private _required : string[] = [ "RecId", "FirstName", "LastName",  "Gender", "Birthday", "Address",
    "City", "Lat", "Long", "Party", "ResultOfContact" ];

    // Warn if this sheet is missing any required columns 
    public checkRequired(info: trcSheet.ISheetInfoResult): void {

        var missing = null;

        for(var i in this._required) {
            var requiredName : string = this._required[i];
            if (info.Columns.find( x=> x.Name == requiredName) == undefined) {
                if (missing == null) {
                    missing = requiredName;
                } else {
                    missing += ", " + requiredName;
                }
            }
        }

        if (missing != null) {
            showError("Warning! This sheet is missing required columns and may not work on mobile devices: " + missing);
        }
    }

    // Are we allowed to edit this column? 
    protected allowEditing(c : trcSheet.IColumnInfo) : boolean{
        if (c.IsReadOnly) {
            return false;
        }
        // Don't allow editing / removing Party column since it's required and has a strict format.
        // They can edit ResultOfContact if they want to change the possible values.
        if (c.Name == "Party") {
            return false;
        }
        return true;
    }

    // Display sheet info on HTML page
    public updateInfo(info: trcSheet.ISheetInfoResult): void {
        this.checkRequired(info);
        
        $("#existing").html("");
        var root = $("#existing");
        var readOnly = $("#viewText");
        var readOnlyData = "";
        // Add existing questions to the page.
        for (var i in info.Columns) {
            var c = info.Columns[i];

            var viewText = '';
            if (this.allowEditing(c)) {
                var name = c.Name; // Api name
                var desc = c.Description; // maybe missing
                var answers = c.PossibleValues; // Possible values

                if (answers && answers.length > 0) {

                    var text = "[" + name + "]";
                    viewText += name;
                    if (desc) {
                        text += " " + desc;
                        viewText += '|' + desc;
                    }
                    viewText += "?\n";
                    var e1 = $("<div class='panel panel-default'>");
                    if (name == "ResultOfContact") {
                        text += " [REQUIRED!]";
                    }
                    var eHeading = $("<div class='panel-heading'>").text(text);
                    eHeading.append("<a class='btn pull-right' onclick=_plugin.onQuestionDelete('" + name + "') id='" + name + "'><i class='glyphicon glyphicon-remove'></i><a/>");
                    e1.append(eHeading);

                    var eBody = $("<div class='panel-body'>");

                    // var tx3 = $("<p>" + text + "</p>");
                    var ans = '';
                    var e2 = $("<ul>");
                    for (var j in answers) {

                        var answer: string = answers[j];

                        var elementAnswer = $("<li>").text(answer);
                        e2.append(elementAnswer);

                        ans += $.trim(answer) + '\n';
                    }
                    viewText += ans + '\n';
                    eBody.append(e2);

                }

                if (e1) {
                    e1.append(eBody);
                    root.append(e1);
                }
                if (viewText && (name != 'Party' && name != 'Cellphone' && name != 'Comment' && name != 'Comments')) {
                    readOnlyData += viewText;
                }
            }
        }
        if (readOnlyData) {
            readOnly.html(readOnlyData);
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
        MyPlugin.AddAnswer(answers, "Answer6");
        MyPlugin.AddAnswer(answers, "Answer7");
        MyPlugin.AddAnswer(answers, "Answer8");
        MyPlugin.AddAnswer(answers, "Answer9");
        MyPlugin.AddAnswer(answers, "Answer10");

        var add = this.validateQuestion(qname, qdescr, answers);

        if (add) {
            var questions = [add];

            this.AddQuestionInSheet(questions);
        } else {
            return;
        }
    }

    private validateQuestion(qname: string, qdescr: string, answers: string[]): trcSheet.IMaintenanceAddColumn {
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

    private AddQuestionInSheet(questions: trcSheet.IMaintenanceAddColumn[]) {
        // Actually add the question and do the refresh
        var admin = new trcSheet.SheetAdminClient(this._sheet);
        admin.postOpAddQuestionAsync(questions).then(
            () => {

                return this.InitAsync();
            }
        );
    }

    public onAddMultipleQuestion(): void {

        let questions : trcSheet.IMaintenanceAddColumn[] = new Array();
        for (let i: number = 0; i <= this.questIndex; i++) {
            if ($('div#new' + i).length == 1) {
                var answers: string[] = [];
                var qname = $("#qname" + i).val();
                var qdescr = $("#qdescr" + i).val();

                if (!qname) {
                    alert('Error: Question shortname is missing');
                    return;
                }

                var answers: string[] = [];
                MyPlugin.AddAnswer(answers, "Answer1-" + i);
                MyPlugin.AddAnswer(answers, "Answer2-" + i);
                MyPlugin.AddAnswer(answers, "Answer3-" + i);
                MyPlugin.AddAnswer(answers, "Answer4-" + i);
                MyPlugin.AddAnswer(answers, "Answer5-" + i);
                MyPlugin.AddAnswer(answers, "Answer6-" + i);
                MyPlugin.AddAnswer(answers, "Answer7-" + i);
                MyPlugin.AddAnswer(answers, "Answer8-" + i);
                MyPlugin.AddAnswer(answers, "Answer9-" + i);
                MyPlugin.AddAnswer(answers, "Answer10-" + i);

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

    public onAddmoreQuest(): void {
        this.questIndex++;
        var firstDiv = $("#new0");
        var newDiv = "<div class='more-question' id='new" + this.questIndex + "'>" + 
        "<hr style='border-top: 1px solid #8c8b8b;'><a onclick=_plugin.onRemoveButton('" + this.questIndex + "') id='remove[" + this.questIndex + "]' class='btn pull-right'>" + 
        "<i class='glyphicon glyphicon-remove'></i><a/><p><input id='qname" + this.questIndex + "' placeholder='(slug)'> (required, Short name, made of just A-Z,0-9,_ ) </p>" + 
        "<p><input id='qdescr" + this.questIndex + "' placeholder='(description)' size=80> (optional, Human readable description)</p>" + 
        "<p>Possible Answers:</p>" + 
        "<ul>" + 
        "<li><input id='Answer1-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer2-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer3-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer4-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer5-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer6-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer7-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer8-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer9-" + this.questIndex + "' placeholder='(answer)' size='40'></li><br/>" + 
        "<li><input id='Answer10-" + this.questIndex + "' placeholder='(answer)' size='40'></li>" + 
        "</ul></div><div>";

        firstDiv.append(newDiv);
    }

    public onRemoveButton(Id: string): void {
        $("#new" + Id).remove();
    }

    public onTextImport(): void {
        var e1 = "";
        $("#importText").val("");
        for (var i = 0; i <= this.questIndex; i++) {

            if ($('div#new' + i).length != 0) {
                var qname = $("#qname" + i).val();
                var qdescr = $("#qdescr" + i).val();
                e1 += qname;
                if (qdescr) {
                    e1 += "|" + qdescr;
                }
                if (qname || qdescr) {
                    e1 += "?";
                }

                e1 += '\n';
                for (var j = 1; j <= 10; j++) {

                    var ans = $("#Answer" + j + "-" + i).val();
                    if (ans) {
                        e1 += ans + '\n';
                    }
                }
                e1 += '\n';
            }
        }
        $("#importText").val(e1);
    }

    public onViewImport(): void {

        var i = 0;
        var j = 1;
        var k = 0;
        var l = 0;

        this.questIndex = 0;
        $('.more-question').remove();

        //reset form
        $('form#survey-form')[0].reset();

        var arrayOfData: any = $('#importText').val().split('\n');

        $.each(arrayOfData, function (index: number, item: string) {
            if (item == "") {
                if (k != 0) {
                    i++;
                    j = 1;
                    l = 0;
                }
                return;
            }

            if (l == 0) {

                if (k > 0) {
                    $('#addQuestion').click();
                }

                if (item.indexOf("?") != -1) {
                    item = item.replace(/\?/g, "");
                }

                var ques = item.split("|");

                $('#qname' + i).val(ques[0]);
                $('#qdescr' + i).val(ques[1]);
                k++;
            } else {
                $('#Answer' + j + '-' + i).val(item);
                j++;
            }
            l++;
        });
    }

    public onBulkImport(): void {
        $('#as-view').click();
    }

    public onQuestionDelete(question: string): void {

        var remove = confirm("Do you wish to delete this question?");

        if (remove) {
            // delete the question and do the refresh
            var admin = new trcSheet.SheetAdminClient(this._sheet);
            admin.postOpDeleteQuestionAsync(question).then(
                () => {
                    return this.InitAsync();
                }
            );
        }
    }
}