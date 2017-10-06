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
    var stringTemplate = __dirname + '/stringTrans.txt';
    var stringDir = './resources/lang/';
    var modelDir = './database/seeds/';
    var modelTemplate = __dirname + '/modelTrans.txt';

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
                // So we have 2 formats. Code 1 and 2.
                // [Code 1]: aka String data. Stores data to file translations so it needs to store it
                // to lang/filename and inside that key-value of each entry.
                // [Code 2]: aka Model data. Stores data on a db seeder. It stores data in filename and
                // then the entries for all language.
                for (i = 0; i < rows.length; i++) {
                    // Code 1 format
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
                            stringData[cols[j]][rows[i][sheetFileCol]][rows[i][sheetKeyCol]] = cell_data.replace(/\'/g, '\\\'');
                        }
                    }
                    // Code 2 format
                    if (rows[i][sheetCodeCol] == 2) {
                        var rowInfo = {};
                        if (typeof(modelData[rows[i][sheetFileCol]]) == 'undefined') {
                            modelData[rows[i][sheetFileCol]] = [];
                        }
                        for (j = 0; j < cols.length; j++) {
                            cell_data = rows[i][cols[j]] || rows[i][cols[english_col]];
                            rowInfo[cols[j]] = cell_data.replace(/\'/g, '&apos;')
                        }
                        modelData[rows[i][sheetFileCol]].push(rowInfo);
                    }

                    // Code 3 format (it's code 2 but adding a key => value using the key column )
                    if (rows[i][sheetCodeCol] == 3) {
                        var rowInfo = {};
                        if (typeof(modelData[rows[i][sheetFileCol]]) == 'undefined') {
                            modelData[rows[i][sheetFileCol]] = [];
                        }
                        for (j = 0; j < cols.length; j++) {
                            cell_data = rows[i][cols[j]] || rows[i][cols[english_col]];
                            rowInfo[cols[j]] = cell_data.replace(/\'/g, '&apos;');
                        }
                        rowInfo[sheetKeyCol] = rows[i][sheetKeyCol].replace(/\'/g, '&apos;');
                        modelData[rows[i][sheetFileCol]].push(rowInfo);
                    }

                }
                step();
            });
        },

        function renderData(step) {
            nunjucks.configure({
                autoescape: false
            });

            // String data
            var langs = Object.keys(stringData);
            var files;
            for (langIdx = 0; langIdx < langs.length; langIdx++) {
                var currentLang = langs[langIdx];
                files = Object.keys(stringData[currentLang]);
                for (fileIdx = 0; fileIdx < files.length; fileIdx++) {
                    var currentFile = files[fileIdx];
                    var targetDir = stringDir + currentLang + "/";
                    var translations = nunjucks.render(stringTemplate, {
                        translations: stringData[currentLang][currentFile]
                    });
                    try {
                        fs.accessSync(targetDir);
                    } catch (err) {
                        fs.mkdirSync(targetDir);
                    }
                    fs.writeFile(targetDir + currentFile + '.php', translations, (error) => {});
                }
            }

            // Model data
            var files = Object.keys(modelData)
            for (fileIdx = 0; fileIdx < files.length; fileIdx++) {
                var currentFile = files[fileIdx];
                var translations = nunjucks.render(modelTemplate, {
                    ModelName: currentFile,
                    translations: modelData[currentFile]
                });
                fs.writeFile(modelDir + currentFile + 'TableSeeder.php', translations, (error) => {});
            }
            step();
        }
    ], function (err) {
        return cb();
    });

});
