"use strict"
let yaml = require("js-yaml")
let fs = require("fs")

function loadTestconfig() {
    try {
        exports.testconfig = yaml.safeLoad(fs.readFileSync(__dirname + './../testdata/testconfig.yml', 'utf8'));
    } catch (e) {
        console.log(e);
    }
    Object.freeze(exports.testconfig);
}
exports.loadTestconfig = loadTestconfig;