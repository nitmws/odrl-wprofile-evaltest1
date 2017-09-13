"use strict"

let N3 = require("n3")
let odrlVocab = require("../model/vocabulary")
let policy = require("../model/Policy")
let configs = require("../services/configs")

/**
 * The states resulting from the evaluation of an ODRL Rule etc use strings
 * The sequence in the array is: 0 = positive state, 1 = not-positive state,
 *  2 = semantically not existing, 3 = error state
 */
const evalConstraintState  = ["Satisfied", "Not-Satisfied", "Not-Existing", "ERROR"]
exports.evalConstraintState = evalConstraintState
const evalDutyState = ["FulFilled", "Not-Fulfilled", "Not-Existing", "ERROR"]
exports.evalDutyState = evalDutyState
const evalPermissionState = ["Allowed", "Not-Allowed", "Not-Existing", "ERROR"]
exports.evalPermissionState = evalPermissionState
const evalProhibitionState = ["Not-Violated", "Violated", "Not-Existing", "ERROR"]
exports.evalProhibitionState = evalProhibitionState
const evalActionExersState = ["Exercised", "Not-Exercised", "Not-Existing", "ERROR"]
exports.evalActionExersState = evalActionExersState

/*
    *************************************************************************************
    ***** below: evaluate Constraint(s) and Refinement(s) section
*/

function evaluateAllConstraints(policyTriplestore, ruleId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalConstraintState[3]
    }

    return evaluateConstraintClassInstances(policyTriplestore, ruleId,
        odrlVocab.constraint, testlogger, testcaseName)
}
exports.evaluateAllConstraints = evaluateAllConstraints

function evaluateAllRefinements(policyTriplestore, subjectId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalConstraintState[3]
    }

    return evaluateConstraintClassInstances(policyTriplestore, subjectId,
        odrlVocab.refinement, testlogger, testcaseName)
}
exports.evaluateAllRefinements = evaluateAllRefinements

function evaluateConstraintClassInstances(policyTriplestore, subjectId, propertyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let constraintQuads = policyTriplestore.getTriplesByIRI(subjectId, propertyId, null, null)
    let stateIdx = 0
    if (constraintQuads.length == 0){
        stateIdx = 2
    }
    else {
        for (let i = 0; i < constraintQuads.length; i++) {
            let constraintId = constraintQuads[i].object
            let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            switch (constrEvalResult) {
                case evalConstraintState[0]:
                    break;
                case evalConstraintState[1]:
                    stateIdx = 1
                    break;
                case evalConstraintState[2]:
                    stateIdx = 2
                    break;
                case evalConstraintState[3]:
                    stateIdx = 3
                    break;
                default:
                    stateIdx = 3
            }
            if (stateIdx > 0) {
                return evalConstraintState[stateIdx]
            }
        }
    }
    return evalConstraintState[stateIdx]
}
// exports.evaluateConstraintClassInstances = evaluateConstraintClassInstances

function evaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    switch(propertyId){
        case odrlVocab.constraint:
            if (testcaseName) {
                let testResultPreset = ""
                if (configs.testconfig[testcaseName].evalpresets.instances[constraintId]) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[constraintId]
                    return testResultPreset
                }
                if (configs.testconfig[testcaseName].evalpresets.defaults.constraint) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.constraint
                    return testResultPreset
                }
            }
            break
        case odrlVocab.refinement:
            if (testcaseName) {
                let testResultPreset = ""
                if (configs.testconfig[testcaseName].evalpresets.instances[constraintId]) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[constraintId]
                }
                if (configs.testconfig[testcaseName].evalpresets.defaults.refinement) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.refinement
                }
                testlogger.addLine("TESTRESULT: Evalution of Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
    }

/*
    NOTE: a full implementation of an Evaluator should start processing the Constraint now.
        As this is considered as black-box by the ODRL Recommendation this processing and
        its result is replaced by the presets above.

    let constraintQuads = policyTriplestore.getTriplesByIRI(constraintId, null, null, null)
    ...

*/
    return evalConstraintState[3] // actually the function shouldn't get there because of the presets above
}
exports.evaluateConstraintClassInstance = evaluateConstraintClassInstance


/*
    *************************************************************************************
    ***** below: evaluate Duty/-ies section
*/

/**
 * Evaluates all Duty instances referenced by a 'duty' property. Returns a Duty status.
 * @param policyTriplestore
 * @param ruleId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateAll_dutyDuties(policyTriplestore, ruleId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalDutyState[3]
    }
    let dutyQuads = policyTriplestore.getTriplesByIRI(ruleId, "http://www.w3.org/ns/odrl/2/duty", null, null)
    if (dutyQuads.length == 0){
        return evalDutyState[2]
    }
    let stateIdx = 0
    for (let i=0; i < dutyQuads.length; i++) {
        let dutyId = dutyQuads[i].object
        let dutyEvalResult = evaluate_dutyOr_obligationDuty(policyTriplestore, dutyId, testlogger, testcaseName)
        switch (dutyEvalResult) {
            case evalDutyState[0]:
                // duty is Fulfilled --> continue processing
                break;
            case evalDutyState[1]:
                // duty is Not-Fulfilled --> break processing an return Not-Fulfilled
                return evalDutyState[1]
                break;
            case evalDutyState[2]:
                // duty is Not-Existing --> continue processing
                break;
            case evalDutyState[3]:
                // duty returns an ERROR --> do the same
                return evalDutyState[3]
                break;
            default:
                return evalDutyState[1]
        }
    }
    // at this point of processing all Duties have returned Fulfilled
    return evalConstraintState[0]
}
exports.evaluateAll_dutyDuties = evaluateAll_dutyDuties

function evaluate_dutyOr_obligationDuty(policyTriplestore, dutyId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalDutyState[3]
    }

    // first round of Duty evaluation
    let mainDutyState = evaluateDutyInstance(policyTriplestore, dutyId, testlogger, testcaseName)
    //  check if the returned state is "Not-Fulfilled"
    if (mainDutyState == evalDutyState[1]){
        // in this case: retrieve consequences and evaluate them
        let consquenceQuads = policyTriplestore.getTriplesByIRI(dutyId, "http://www.w3.org/ns/odrl/2/consequence", null, null)
        let stateIdx = 0
        if (consquenceQuads.length == 0) {
            return evalDutyState[1] // if entered as Not-Fulfilled and no consequence -> Not-Fulfilled
        }
        else {
            for (let i = 0; i < consquenceQuads.length; i++) {
                let consequenceId = consquenceQuads[i].object
                let conseqEvalResult = evaluateDutyInstance(policyTriplestore, consequenceId, testlogger, testcaseName)
                switch (conseqEvalResult) {
                    case evalDutyState[0]:
                    case evalDutyState[2]:
                        // consequence is Fulfilled or not existing -> continue processing
                        break;
                    case evalDutyState[1]:
                        // consequence is Not-Fulfilled -> break processing and return a Not-Fulfilled for the Duty
                        return evalDutyState[1]
                        break;
                    case evalDutyState[3]:
                        // consequence returns an ERROR --> break processing and return the same
                        return evalDutyState[3]
                        break;
                }
            }
        }
    }
    // at this point: if consequences should be evaluated they have been Fulfilled or none exist
    let mainStateIdx = 0
    switch(mainDutyState){
        case evalDutyState[0]:
            break;
        case evalDutyState[1]:
            mainStateIdx = 1
            break;
        case evalDutyState[2]:
            mainStateIdx = 2
            break;
        case evalDutyState[3]:
            mainStateIdx = 3
            break;
    }
    return evalDutyState[mainStateIdx]
}
exports.evaluate_dutyOr_obligationDuty = evaluate_dutyOr_obligationDuty

function evaluate_consequenceDutyInstance(policyTriplestore, dutyId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalDutyState[3]
    }

    if (testcaseName) {
        let testResultPreset = ""
        if (configs.testconfig[testcaseName].evalpresets.instances[dutyId]) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[dutyId]
        }
        if (configs.testconfig[testcaseName].evalpresets.defaults.consequence) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.consequence
        }
        testlogger.addLine("TESTRESULT: Evalution of consequence Duty instance '" + dutyId + "', status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }

    // no preset found:
    let mainDutyState = evaluateDutyInstance(policyTriplestore, dutyId, testlogger, testcaseName)
    let mainStateIdx = 0
    switch(mainDutyState){
        case evalDutyState[0]:
            break;
        case evalDutyState[1]:
            mainStateIdx = 1
            break;
        case evalDutyState[2]:
            mainStateIdx = 2
            break;
        case evalDutyState[3]:
            mainStateIdx = 3
            break;
    }
    return evalDutyState[mainStateIdx]
}
exports.evaluate_consequenceDutyInstance = evaluate_consequenceDutyInstance


function evaluateDutyInstance(policyTriplestore, dutyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalDutyState[3]
    }

    // Evaluate the Constraints
    let constraintsEvalResult =
        evaluateAllConstraints(policyTriplestore, dutyId, testlogger, testcaseName)
    switch(constraintsEvalResult){
        case evalConstraintState[0]:
            // constraints are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // constraints are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT: Evalution of Duty instance '" + dutyId + "', status = " + evalDutyState[2] + " (constraints Not-Satisfied)")
            return evalDutyState[2]
            break;
        case evalConstraintState[2]:
            // constraints are Not-Existing --> continue processing
            break;
        case evalConstraintState[3]:
            // constraints returned an ERROR --> do the same
            testlogger.addLine("TESTRESULT: Evalution of Duty instance '" + dutyId + "', status = " + evalDutyState[3])
            return evalDutyState[3]
            break;
    }

    // Evaluate the Action
    let actionEvalResult =
        evaluateActionExercised(policyTriplestore, dutyId, testlogger, testcaseName)
    switch(actionEvalResult){
        case evalActionExersState[0]:
        case evalActionExersState[1]:
            // Action was not-/exercised --> continue processing
            break;
        case evalActionExersState[2]:
            // Action is Not-Existing --> return Not-Fulfilled
            testlogger.addLine("TESTRESULT: Evalution of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not existing)")
            return evalDutyState[1]
            break;
        case evalActionExersState[3]:
            // constraints returned an ERROR --> do the same
            return evalDutyState[3]
            break;
    }

    if (actionEvalResult === evalActionExersState[1]) {
        // action was Not-Exercised: evaluate the Consequences
        let consequQuads = policyTriplestore.getTriplesByIRI(dutyId, "http://www.w3.org/ns/odrl/2/consequence", null, null)
        let stateIdx = 0
        if (consequQuads.length == 0) {
            return evalDutyState[1] // action Not-Exercised, no consequences exist - return Not-Fulfilled
        }
        else {
            for (let i = 0; i < consequQuads.length; i++) {
                let consequId = consequQuads[i].object
                let consequEvalResult = evaluate_consequenceDutyInstance(policyTriplestore, consequId, testlogger, testcaseName)
                switch (consequEvalResult) {
                    case evalDutyState[0]:
                        // consequence is Fulfilled --> continue processing
                        break;
                    case evalDutyState[1]:
                        // consequence is Not-Fulfilled --> break processing an return Not-Fulfilled
                        return evalDutyState[1]
                        break;
                    case evalDutyState[2]:
                        // consequence is Not-Existing --> continue processing
                        break;
                    case evalDutyState[3]:
                        // consequence returns an ERROR --> do the same
                        return evalDutyState[3]
                        break;
                }
            }
        }
    }


    if (testcaseName) {
        let testResultPreset = ""
        if (configs.testconfig[testcaseName].evalpresets.instances[dutyId]) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[dutyId]
        }
        if (configs.testconfig[testcaseName].evalpresets.defaults.duty) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.duty
        }
        testlogger.addLine("TESTRESULT: Evalution of Duty instance '" + dutyId + "', status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }

    /*
        NOTE: a full implementation of an Evaluator should start processing the Duty now.
            As this is considered as black-box by the ODRL Recommendation this processing and
            its result is replaced by the presets above.

        let dutyQuads = policyTriplestore.getTriplesByIRI(dutyId, null, null, null)
        ...

    */
    return evalDutyState[3] // actually the function shouldn't get there because of the presets above
}
exports.evaluateDutyInstance = evaluateDutyInstance

/*
    *************************************************************************************
    ***** below: evaluate Action section
*/

function evaluateActionExercised(policyTriplestore, subjectId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalDutyState[3]
    }
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(subjectId, "http://www.w3.org/ns/odrl/2/action", null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        return evalActionExersState[3] // = not existing
    }
    else {
        actionId = actionQuads[0].object
    }

    // Evaluate the refinement Constraints
    let refinementsEvalResult =
        evaluateAllRefinements(policyTriplestore, actionId, testlogger, testcaseName)
    switch(refinementsEvalResult){
        case evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT: Evalution of ActionExercised '" + actionId + "' - refinments, status = "
                + evalDutyState[2] + " (action not existing by Not-Satisfied refinement)")
            return evalDutyState[2]
            break;
        case evalConstraintState[2]:
            // refinements are Not-Existing --> continue processing
            break;
        case evalConstraintState[3]:
            // refinements returned an ERROR --> do the same
            return evalActionExersState[3]
            break;
    }

    if (testcaseName) {
        let testResultPreset = ""
        if (configs.testconfig[testcaseName].evalpresets.instances[actionId]) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[actionId]
        }
        if (configs.testconfig[testcaseName].evalpresets.defaults.action) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.action
        }
        testlogger.addLine("TESTRESULT: Evalution of ActionExercised '" + actionId + "', status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }

}
exports.evaluateActionExercised = evaluateActionExercised