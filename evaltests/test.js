"use strict"

let fs = require("fs")
let jsonfile = require('jsonfile')
let jsonld = require('jsonld')
let N3 = require("n3")
let configs = require("../services/configs");
let testlogger = require("../services/testlogger")
let utils = require("../services/utils")
let Policy = require("../model/Policy")
let evaluator = require("../evaluator/evaluator")


function doTheTest(caseName){

    if (!caseName){
        console.log("No case name - TEST ENDED")
        return
    }

    configs.loadTestconfig()

    let logLine = ""

    if (!configs.testconfig[caseName]){
        console.log("case name <" + caseName + "> is unknown or not properly defined - TEST ENDED")
        return
    }
    let testFn = configs.testconfig[caseName].filename


    let tlog = new testlogger.Testlogger()

    tlog.addLine("START with test case: " + caseName + "  -- on/at " + utils.getDateTimeNowISO())
    console.log("START with test case: " + caseName + "  -- on/at " + utils.getDateTimeNowISO())

    // ingest the JSON-LD test file
    let jsonldFp = "testdata/" + testFn + ".json"
    let policyJsonldRaw = jsonfile.readFileSync(jsonldFp)
    let jsonldExpFp = "testdataout/" + testFn + "=exp.json"
    jsonld.expand(policyJsonldRaw, function (err, policyJsonldExp) {
        jsonfile.writeFileSync(jsonldExpFp, policyJsonldExp, {spaces: 2})
    })
    // transform the JSON-LD to RDF triples/nquads
    let nquadsFp = "testdataout/" + testFn + "=nquads.txt"
    jsonld.toRDF(policyJsonldRaw, {format: 'application/nquads'}, function(err, policyNquads) {
        if (err) {
            throw(err)
            return
        }
        // policyNquads is a string of nquads
        fs.writeFileSync(nquadsFp, policyNquads)

        let policyN3store = N3.Store()
        let n3parser = N3.Parser()
        let policyN3triples = n3parser.parse(policyNquads)
        policyN3store.addTriples(policyN3triples)
        tlog.addLine("MSG: JSON-LD read, parsed, transformed to RDF, files written ")

        // START evaluating a specific Rule
        let evalRuleid = ""
        if (configs.testconfig[caseName].evalRuleid){
            evalRuleid = configs.testconfig[caseName].evalRuleid
        }
        else {
            logLine = "ERROR: no id of the Rule which should be evaluated defined - TEST terminated"
            tlog.addLine(logLine)
            tlog.writeLog("CASE_" + caseName + "_log.txt")
            console.log(logLine)
            return
        }

        // Evaluate the Constraints
        let constraintsEvalResult =
            evaluator.evaluateAllConstraints(policyN3store, evalRuleid, tlog, caseName)
        tlog.addLine("TESTRESULT: Evalution of all constraints of the Rule, status = " + constraintsEvalResult)

        if (constraintsEvalResult === evaluator.evalConstraintState[1]){
            tlog.addLine("TESTRESULT: Constraint(s) of the Rule is/are Not-Satisfied - no further processing")
        }
        else {
            // get the subclass of the Rule
            let ruleSubclass = ""
            let subclassQuads = policyN3store.getTriplesByIRI(null, null, evalRuleid, null)
            if (subclassQuads) {
                ruleSubclass = subclassQuads[0].predicate
            }
            tlog.addLine("TESTRESULT: inferred sub-class = " + ruleSubclass)

            switch (ruleSubclass) {
                case "http://www.w3.org/ns/odrl/2/permission":
                    _doPermissionTest(policyN3store, evalRuleid, tlog, caseName)
                    break
                case "http://www.w3.org/ns/odrl/2/prohibition":
                    break;
                case "http://www.w3.org/ns/odrl/2/duty":
                    break;
            }
        }
        // finally: write test log
        tlog.addLine("CLOSING test case: " + caseName + "  -- on/at " + utils.getDateTimeNowISO())
        tlog.writeLog("CASE_" + caseName + "_log.txt")
        console.log("CLOSING test case: " + caseName + "  -- on/at " + utils.getDateTimeNowISO())
    })
}
exports.doTheTest = doTheTest

function _doPermissionTest(policyN3store, evalRuleid, testlogger, testcaseName ){
    let dutyEvalResult = evaluator.evaluateAll_dutyDuties(policyN3store, evalRuleid, testlogger, testcaseName)
    testlogger.addLine("TESTRESULT: Evalution of all duty(ies), status = " + dutyEvalResult)
    let permissionStateIdx = 0
    switch(dutyEvalResult){
        case evaluator.evalDutyState[0]:
            permissionStateIdx = 0;
            break;
        case evaluator.evalDutyState[1]:
            permissionStateIdx = 1;
            break;
        case evaluator.evalDutyState[2]:
            permissionStateIdx = 0;
            break;
        case evaluator.evalDutyState[3]:
            permissionStateIdx = 3;
            break;
    }
    testlogger.addLine("TESTRESULT: Evalution of the full Permission instance, status = " +
        evaluator.evalPermissionState[permissionStateIdx])
}

function _doProhibitionTest(policyN3store, evalRuleid, testcaseName, testlogger){

}

function _doObligationTest(){

}