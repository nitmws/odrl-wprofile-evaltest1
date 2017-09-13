"use strict"
let fs = require("fs")

class Testlogger {
    constructor() {
        this._logstring = ""
    }

    addString(textstring) {
        this._logstring += " " + textstring
    }

    addLine(textline) {
        this._logstring += " " + textline + "\n"
    }

    getLog() {
        return this._logstring
    }

    writeLog(logFilename) {
        if (!logFilename) {return }
        fs.writeFile('testdataout/' + logFilename, this._logstring, function(err) {
            if (err) throw err;
        })
    }
}

exports.Testlogger = Testlogger
