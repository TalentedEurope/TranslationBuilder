var gulp = require('gulp');
var nunjucks = require('nunjucks');
var GoogleSpreadsheet = require('google-spreadsheet');
var async = require('async');
var fs = require('fs');
var gutil = require('gulp-util');

gulp.task('translate', function(cb) {
    var settingsPath = './translation-settings.json';
    var settingsFile;
    try {
        fs.accessSync(settingsPath);
    } catch (err) {
        gutil.log("No translation settings file set, aborting.");
        cb();
        return;
    }
    settingsFile = fs.readFileSync(settingsPath);
    var settings = JSON.parse(settingsFile);
    var doc = new GoogleSpreadsheet(settings.spreadsheet);
    var sheet;
    var stringData = {};
    var modelData = {};
    var appsDir = './app/i18n/';

    var sheetKeyCol = "key";
    var sheetFileCol = "file";
    var sheetCodeCol = "code";

    async.series([
        function setAuth(step) {
            doc.useServiceAccountAuth(settings, step);
        },

        function getInfoAndWorksheets(step) {
            doc.getInfo(function(err, info) {
                sheet = info.worksheets[0];
                step();
            });
        },

        function getColumns(step) {
            sheet.getCells({
                'min-row': 1,
                'max-row': 1,
                'min-col': 4,
                'return-empty': false
            }, function(err, cells) {
                for (i = 0; i < cells.length; i++) {
                    stringData[cells[i].value] = {};
                }
                step();
            });
        },

        function getData(step) {
            // We skip the first 2 lines because those are titles.
            sheet.getRows({
                offset: 3,
                limit: sheet.rowCount
            }, function(err, rows) {
                var cols = Object.keys(stringData);
                var english_col = 0;
                var cell_data = '';
                for (i = 0; i < rows.length; i++) {
                    if (rows[i][sheetCodeCol] == 1) {
                        // sheet.rowCount gives more rows than it should (lots of them empty) so
                        // we ignore the row if key is empty.
                        if (rows[i][sheetKeyCol] == "") break;
                        for (j = 0; j < cols.length; j++) {
                            // Todo: Fix this mess of dictionaries, like on the render data.
                            if (typeof(stringData[cols[j]][rows[i][sheetFileCol]]) == 'undefined') {
                                stringData[cols[j]][rows[i][sheetFileCol]] = {};
                            }
                            cell_data = rows[i][cols[j]] || rows[i][cols[english_col]];
                            stringData[cols[j]][rows[i][sheetFileCol]][rows[i][sheetKeyCol]] = cell_data;
                        }
                    }
                }
                step();
            });
        },

        function renderData(step) {
            nunjucks.configure({
                autoescape: false
            });

            var langs = Object.keys(stringData);
            var files;
            for (langIdx = 0; langIdx < langs.length; langIdx++) {
                var currentLang = langs[langIdx];
                files = Object.keys(stringData[currentLang]);
                var targetDir = appsDir + "/";
                var translations = JSON.stringify(stringData[currentLang]);
                try {
                    fs.accessSync(targetDir);
                } catch (err) {
                    fs.mkdirSync(targetDir);
                }
                fs.writeFile(targetDir + currentLang + '.json', translations);
            }

            step();
        }
    ], function (err) {
        return cb();
    });

});
