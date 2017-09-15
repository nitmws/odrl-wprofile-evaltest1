"use strict"

let fs = require("fs")
let jsonfile = require('jsonfile')
let jsonld = require('jsonld')
let N3 = require("n3")
let odrlVocab = require("../model/vocabulary")
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
        tlog.addLine("TESTRESULT: Evaluation of all constraints of the Rule, status = " + constraintsEvalResult)

        if (constraintsEvalResult === evaluator.evalConstraintState[1]){
            tlog.addLine("TESTRESULT: Constraint(s) of the Rule is/are Not-Satisfied - no further processing")
        }
        else {
            // get the subclass of the Rule
            // let testQuads = policyN3store.getTriplesByIRI(null, odrlVocab.permission, null, null)

            let rulePropertyname = ""
            let ruleQuads = policyN3store.getTriplesByIRI(null, null, evalRuleid, null)
            if (ruleQuads) {
                rulePropertyname = ruleQuads[0].predicate
            }
            tlog.addLine("TESTRESULT: inferred sub-class = " + rulePropertyname)

            switch (rulePropertyname) {
                case odrlVocab.permission:
                    _doPermissionTest(policyN3store, evalRuleid, tlog, caseName)
                    break
                case odrlVocab.prohibition:
                    break;
                case odrlVocab.obligation:
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

function _doPermissionTest(policyTriplestore, evalRuleid, testlogger, testcaseName ){
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, "http://www.w3.org/ns/odrl/2/action", null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT: validation ERROR: Permission has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }

    // Evaluate the refinement Constraints of the action
    let refinementsEvalResult =
        evaluator.evaluateAllRefinements(policyTriplestore, actionId, testlogger, testcaseName)
    switch(refinementsEvalResult){
        case evaluator.evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evaluator.evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT: Evalution of ActionExercised '" + actionId + "' - refinments, status = "
                + evalDutyState[2] + " (action not existing by Not-Satisfied refinement)")
            return
            break;
        case evaluator.evalConstraintState[2]:
            // refinements are Not-Existing --> continue processing
            break;
        case evaluator.evalConstraintState[3]:
            // refinements returned an ERROR --> do the same
            return
            break;
    }

    let dutyEvalResult = evaluator.evaluateAll_dutyDuties(policyTriplestore, evalRuleid, testlogger, testcaseName)
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