"use strict"

let odrlVocab = require("../model/vocabulary")
let configs = require("../services/configs")

/**
 * The states resulting from the evaluation of an ODRL Rule etc use strings
 * The sequence in the array is: 0 = positive state, 1 = not-positive state,
 *  2 = semantically not existing, 3 = error state
 */
const evalConstraintState  = ["Satisfied", "Not-Satisfied", "Not-Existing", "ERROR"]
exports.evalConstraintState = evalConstraintState
const evalDutyState = ["Fulfilled", "Not-Fulfilled", "Not-Existing", "ERROR"]
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

/**
 * Evaluates all constraints of a Rule (sub-class)
 * @param policyTriplestore
 * @param ruleId
 * @param testlogger
 * @param testcaseName
 * @returns {string|string} - a value of the enumeration evalConstraintState
 */
function evaluateAllConstraints(policyTriplestore, ruleId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalConstraintState[3]
    }

    return evaluateConstraintClassInstances(policyTriplestore, ruleId,
        odrlVocab.constraint, testlogger, testcaseName)
}
exports.evaluateAllConstraints = evaluateAllConstraints

/**
 * Evaluates all refinements of an Action or Asset Collection or Party Collection
 * @param policyTriplestore
 * @param subjectId - id of the Action/AssetCollection/PartyCollection
 * @param testlogger
 * @param testcaseName
 * @returns {string|string} - a value of the enumeration evalConstraintState
 */
function evaluateAllRefinements(policyTriplestore, subjectId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalConstraintState[3]
    }

    let evaluationResult = evaluateConstraintClassInstances(policyTriplestore, subjectId,
        odrlVocab.refinement, testlogger, testcaseName)
    testlogger.addLine("TESTRESULT: Evaluation of all refinements of '" + subjectId + "', status = " + evaluationResult)

    return evaluationResult
}
exports.evaluateAllRefinements = evaluateAllRefinements

/**
 * Evaluates a set of instances of (Logical) Constraint Class (as value of a constraint or refinement property)
 * @param policyTriplestore
 * @param subjectId - id of the Constraint Class instance
 * @param propertyId - id of the property constraint or refinement
 * @param testlogger
 * @param testcaseName
 * @returns {*} - a value of the enumeration evalConstraintState
 */
function evaluateConstraintClassInstances(policyTriplestore, subjectId, propertyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let constraintQuads = policyTriplestore.getTriplesByIRI(subjectId, propertyId, null, null)
    let stateIdx = 0
    if (constraintQuads.length === 0){
        stateIdx = 2
    }
    else {
        for (let i = 0; i < constraintQuads.length; i++) {
            let constraintId = constraintQuads[i].object
            let constrEvalResult = preevaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
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

/**
 * Pre-evaluation of a single instance of a Constraint Class.
 * Makes a distinction between atomic Constraint and Logical Constraint
 * Forwards to a specific full evaluation.
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 */
function preevaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, testcaseName) {
    // check the existence of a Logical Constraint operand:
    let lcoperand = ""
    let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_or, null, null)
    if (lcopTestQuads.length > 0) { lcoperand = odrlVocab.lc_or}
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_and, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlVocab.lc_and}
    }
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_xone, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlVocab.lc_xone}
    }
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_andSequence, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlVocab.lc_andSequence}
    }

    switch(lcoperand){
        case "": // no Logical Constraint operand: is a plain/atomic Constraint
            return evaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            break
        case odrlVocab.lc_or:
            return evaluateLogicalConstraintOr(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            break
        case odrlVocab.lc_and:
            return evaluateLogicalConstraintAnd(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            break
        case odrlVocab.lc_xone:
            return evaluateLogicalConstraintXone(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            break
        case odrlVocab.lc_andSequence:
            return evaluateLogicalConstraintAndSequence(policyTriplestore, constraintId, propertyId, testlogger, testcaseName)
            break
    }
}
exports.preevaluateConstraintClassInstance = preevaluateConstraintClassInstance

/**
 * Evaluates a single instance of a (Logical) Constraint Class
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*} - a value of the enumeration evalConstraintState
 */
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
                }
                if (testResultPreset === "" && configs.testconfig[testcaseName].evalpresets.defaults.constraint) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.constraint
                }
                testlogger.addLine("TESTRESULT: Evaluation of Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
        case odrlVocab.refinement:
            if (testcaseName) {
                let testResultPreset = ""
                if (configs.testconfig[testcaseName].evalpresets.instances[constraintId]) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[constraintId]
                }
                if (testResultPreset === "" && configs.testconfig[testcaseName].evalpresets.defaults.refinement) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.refinement
                }
                testlogger.addLine("TESTRESULT: Evaluation of Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
        case odrlVocab.lc_or:
        case odrlVocab.lc_and:
        case odrlVocab.lc_andSequence:
        case odrlVocab.lc_xone:
            if (testcaseName) {
                let testResultPreset = ""
                if (configs.testconfig[testcaseName].evalpresets.instances[constraintId]) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[constraintId]
                }
                if (testResultPreset === "" && configs.testconfig[testcaseName].evalpresets.defaults.constraint) {
                    testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.constraint
                }
                testlogger.addLine("TESTRESULT: Evaluation of Logical Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
    }

/*
    NOTE: a full implementation of an Evaluator should start processing the Constraint now.
        As this is considered as black-box by the ODRL Recommendation this processing and
        its result is replaced by the presets above.
*/
    return evalConstraintState[3] // actually the function shouldn't get there because of the presets above
}
exports.evaluateConstraintClassInstance = evaluateConstraintClassInstance

/**
 * Evaluates an instance of a Logical Constraint class with the "or" operand
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateLogicalConstraintOr(policyTriplestore, constraintId, propertyId, testlogger, testcaseName) {
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_or, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlVocab.lc_or, testlogger, testcaseName)
        switch (constrEvalResult) {
            case evalConstraintState[0]:
                satisfiedCount++
                break;
            case evalConstraintState[1]:
                break;
            case evalConstraintState[2]:
                break;
            case evalConstraintState[3]:
                break;
            default:
        }
    }
    if (satisfiedCount > 1) {
        return evalConstraintState[0]
    }
    return evalConstraintState[1]
}

/**
 * Evaluates an instance of a Logical Constraint class with an "xone" operand
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateLogicalConstraintXone(policyTriplestore, constraintId, propertyId, testlogger, testcaseName) {
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_xone, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlVocab.lc_xone, testlogger, testcaseName)
        switch (constrEvalResult) {
            case evalConstraintState[0]:
                satisfiedCount++
                break;
            case evalConstraintState[1]:
                break;
            case evalConstraintState[2]:
                break;
            case evalConstraintState[3]:
                break;
            default:
        }
    }
    if (satisfiedCount === 1) {
        return evalConstraintState[0]
    }
    return evalConstraintState[1]
}

/**
 * Evaluates an instance of a Logical Constraint class with an "and" operand
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateLogicalConstraintAnd(policyTriplestore, constraintId, propertyId, testlogger, testcaseName) {
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_and, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlVocab.lc_and, testlogger, testcaseName)
        switch (constrEvalResult) {
            case evalConstraintState[0]:
                satisfiedCount++
                break;
            case evalConstraintState[1]:
                break;
            case evalConstraintState[2]:
                break;
            case evalConstraintState[3]:
                break;
            default:
        }
    }
    if (satisfiedCount === lcoperandValueQuads.length) {
        return evalConstraintState[0]
    }
    return evalConstraintState[1]
}

/**
 * Evaluates an instance of a Logical Constraint class with an "andSequence" operand
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateLogicalConstraintAndSequence(policyTriplestore, constraintId, propertyId, testlogger, testcaseName) {
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlVocab.lc_andSequence, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlVocab.lc_andSequence, testlogger, testcaseName)
        switch (constrEvalResult) {
            case evalConstraintState[0]:
                satisfiedCount++
                break;
            case evalConstraintState[1]:
                break;
            case evalConstraintState[2]:
                break;
            case evalConstraintState[3]:
                break;
            default:
        }
    }
    if (satisfiedCount === lcoperandValueQuads.length) {
        return evalConstraintState[0]
    }
    return evalConstraintState[1]
}

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
    let dutyQuads = policyTriplestore.getTriplesByIRI(ruleId, odrlVocab.duty, null, null)
    if (dutyQuads.length === 0){
        return evalDutyState[2]
    }
    for (let i=0; i < dutyQuads.length; i++) {
        let dutyId = dutyQuads[i].object
        let dutyEvalResult = evaluateDutyInstance(policyTriplestore, dutyId, true, odrlVocab.duty, testlogger, testcaseName)
            // evaluate_dutyOr_obligationDuty(policyTriplestore, dutyId, testlogger, testcaseName)
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
    return evalDutyState[0]
}
exports.evaluateAll_dutyDuties = evaluateAll_dutyDuties

/**
 * Evaluates all Duty instances referenced by a 'remedy' property. Returns a Duty status.
 * @param policyTriplestore
 * @param ruleId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateAll_remedyDuties(policyTriplestore, ruleId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalDutyState[3]
    }
    let remedyQuads = policyTriplestore.getTriplesByIRI(ruleId, odrlVocab.remedy, null, null)
    if (remedyQuads.length === 0){
        return evalDutyState[2]
    }
    for (let i=0; i < remedyQuads.length; i++) {
        let remedyId = remedyQuads[i].object
        let remedyEvalResult = evaluateDutyInstance(policyTriplestore, remedyId, false, odrlVocab.remedy, testlogger, testcaseName)
        switch (remedyEvalResult) {
            case evalDutyState[0]:
                // remedy is Fulfilled --> continue processing
                break;
            case evalDutyState[1]:
                // remedy is Not-Fulfilled --> break processing an return Not-Fulfilled
                testlogger.addLine("TESTRESULT: Evaluation of all remedies of '" + ruleId + "', status = " + evalDutyState[1] + " (constraint(s) Not-Satisfied)")
                return evalDutyState[1]
                break;
            case evalDutyState[2]:
                // remedy is Not-Existing --> continue processing
                break;
            case evalDutyState[3]:
                // remedy returns an ERROR --> do the same
                return evalDutyState[3]
                break;
            default:
                return evalDutyState[1]
        }
    }
    // at this point of processing all Duties have returned Fulfilled
    return evalDutyState[0]
}
exports.evaluateAll_remedyDuties = evaluateAll_remedyDuties

/*
function evaluate_dutyOr_obligationDuty(policyTriplestore, dutyId, testlogger, testcaseName) {
    if (!policyTriplestore) {
        return evalDutyState[3]
    }

    // evaluate the Duty instance, include evaluation of consequences
    let dutyState = evaluateDutyInstance(policyTriplestore, dutyId, true, testlogger, testcaseName)

    // testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + dutyState)
    return dutyState
}
exports.evaluate_dutyOr_obligationDuty = evaluate_dutyOr_obligationDuty
*/

/**
 * Evaluates the core of an instance of a Duty Class
 * @param policyTriplestore
 * @param dutyId
 * @param evalConsequences - boolean (true for duty and obligation Duties, else false)
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateDutyInstance(policyTriplestore, dutyId, evalConsequences, propertyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalDutyState[3]
    }

    testlogger.addLine("NEXT STEP: Evaluation of Duty instance '" + dutyId + "', referenced by '" + propertyId + "'")
    // Evaluate the Constraints
    let constraintsEvalResult =
        evaluateAllConstraints(policyTriplestore, dutyId, testlogger, testcaseName)
    switch(constraintsEvalResult){
        case evalConstraintState[0]:
            // constraints are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // constraints are Not-Satisified --> return Duty Not-Existing
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[2] + " (constraints Not-Satisfied)")
            return evalDutyState[2]
            break;
        case evalConstraintState[2]:
            // constraints are Not-Existing --> continue processing
            break;
        case evalConstraintState[3]:
            // constraints returned an ERROR --> do the same
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[3])
            return evalDutyState[3]
            break;
    }

    // Evaluate the Action
    let actionEvalResult =
        evaluateActionExercised(policyTriplestore, dutyId, propertyId, testlogger, testcaseName)
    switch(actionEvalResult){
        case evalActionExersState[0]:
            // Action was exercised --> break and return Duty Fulfilled
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[0] + " (action exercised)")
            return evalDutyState[0]
            break
        case evalActionExersState[1]:
            if (!evalConsequences) {
                // Action was Not-Exercised --> break and return Duty Not-Fulfilled
                testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not exercised)")
                return evalDutyState[1]
            }
            // else: Action was Not-Exercised --> evaluate the consequences
            break;
        case evalActionExersState[2]:
            // Action is Not-Existing (due to refinements) --> break and return ERROR
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[3] + " (action not existing)")
            return evalDutyState[3]
            break;
        case evalActionExersState[3]:
            // constraints returned an ERROR --> do the same
            return evalDutyState[3]
            break;
    }

    // actually the function should get there only in case of to-be-evaluated consequences, but let's be strict:
    if (evalConsequences) {
        if (actionEvalResult === evalActionExersState[1]) {
            // action Not-Exercised: evaluate the Consequences
            let consequQuads = policyTriplestore.getTriplesByIRI(dutyId, odrlVocab.consequence, null, null)
            if (consequQuads.length === 0) {
                testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not exercised, no consequences exist)")
                return evalDutyState[1] // action Not-Exercised, no consequences exist - return Not-Fulfilled
            }
            else {
                let consequenceFulfilled = false
                    // set to true by fulfilled conseq, not changed by not-existing conseq
                    //    a not fulfilled consequence breaks the processing

                // iterate over all existing Consequence instances
                for (let i = 0; i < consequQuads.length; i++) {
                    let consequId = consequQuads[i].object
                    let consequEvalResult = evaluateDutyInstance(policyTriplestore, consequId, false,
                        odrlVocab.consequence, testlogger, testcaseName)
                    switch (consequEvalResult) {
                        case evalDutyState[0]:
                            // consequence is Fulfilled --> set consequenceFulfilled, continue processing
                            consequenceFulfilled = true
                            break;
                        case evalDutyState[1]:
                            // consequence is Not-Fulfilled --> break processing and return Duty Not-Fulfilled
                            testlogger.addLine("TESTRESULT: Evaluation of all consequence-Duty instances of  '"
                                + dutyId + "' - consequence '" + consequId + "' returned Not-Fulfilled");
                            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not exercised, consequences Not-Fulfilled)")
                            return evalDutyState[1]
                            break;
                        case evalDutyState[2]:
                            // consequence is Not-Existing --> continue processing (keep consequenceFulfilled unchanged)
                            break;
                        case evalDutyState[3]:
                            // consequence returns an ERROR --> do the same
                            return evalDutyState[3]
                            break;
                    }
                }
                // At this point the status of all consequences can be only Fulfilled or Not-Existing
                if (consequenceFulfilled) {
                    testlogger.addLine("TESTRESULT: Evaluation of all consequence-Duty instances of '" + dutyId + "', status = " + evalDutyState[0])
                }
                else {
                    testlogger.addLine("TESTRESULT: Evaluation of all consequence-Duty instances of '" + dutyId + "', status = " +evalDutyState[2])
                    testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not exercised, consequences not existing)")
                    return evalDutyState[2]
                }
            }
        }
    }

 /*
    if (testcaseName) {
        let testResultPreset = ""
        if (configs.testconfig[testcaseName].evalpresets.instances[dutyId]) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[dutyId]
        }
        if (testResultPreset === "" && configs.testconfig[testcaseName].evalpresets.defaults.duty) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.duty
        }
        testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }
*/
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

/**
 * Evaluates the instance of an Action Class.
 * Checks if existing refinements are satisfied and in this case if the action has been exercised
 * @param policyTriplestore
 * @param subjectId
 * @param propertyId
 * @param testlogger
 * @param testcaseName
 * @returns {*}
 */
function evaluateActionExercised(policyTriplestore, subjectId, propertyId, testlogger, testcaseName){
    if (!policyTriplestore){
        return evalActionExersState[3]
    }
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(subjectId, odrlVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        return evalActionExersState[3] // = not existing
    }
    else {
        actionId = actionQuads[0].object
    }

    testlogger.addLine("NEXT STEP: Evaluation of ActionExercised of action (of '" + subjectId + "')")

    // Evaluate the refinement Constraints
    let refinementsEvalResult =
        evaluateAllRefinements(policyTriplestore, actionId, testlogger, testcaseName)
    switch(refinementsEvalResult){
        case evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT: Evaluation of ActionExercised '" + actionId + "' - refinments, status = "
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

    // retrieve and return preset value
    if (testcaseName) {
        let testResultPreset = ""
        if (configs.testconfig[testcaseName].evalpresets.instances[actionId]) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.instances[actionId]
        }
        if (testResultPreset === "" && propertyId === odrlVocab.prohibition && configs.testconfig[testcaseName].evalpresets.defaults.prohibitionAction) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.prohibitionAction
        }
        if (testResultPreset === "" && propertyId === odrlVocab.duty && configs.testconfig[testcaseName].evalpresets.defaults.dutyAction) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.dutyAction
        }
        if (testResultPreset === "" && propertyId === odrlVocab.obligation && configs.testconfig[testcaseName].evalpresets.defaults.obligationAction) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.obligationAction
        }
        if (testResultPreset === "" && propertyId === odrlVocab.remedy && configs.testconfig[testcaseName].evalpresets.defaults.remedyAction) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.remedyAction
        }
        if (testResultPreset === "" && propertyId === odrlVocab.consequence && configs.testconfig[testcaseName].evalpresets.defaults.consequenceAction) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.consequenceAction
        }
        if (testResultPreset === "" && configs.testconfig[testcaseName].evalpresets.defaults.action) {
            testResultPreset = configs.testconfig[testcaseName].evalpresets.defaults.action
        }
        testlogger.addLine("TESTRESULT: Evaluation of ActionExercised '" + actionId + "' (action of '" + subjectId + "'), status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }

}
exports.evaluateActionExercised = evaluateActionExercised

/*
    *************************************************************************************
    ***** below: evaluate a Rule referenced by the property permission
*/

/**
 * Evaluates an instance of the Rule Class referenced by the property permission
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param testcaseName
 */
function evaluatePermission(policyTriplestore, evalRuleid, testlogger, testcaseName ){
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Permission has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }

    // Evaluate the refinement Constraints of the action
    let refinementsEvalResult =
        evaluateAllRefinements(policyTriplestore, actionId, testlogger, testcaseName)
    switch(refinementsEvalResult){
        case evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of ActionExercised '" + actionId + "' - refinments, status = "
                + evalDutyState[2] + " (action not existing by Not-Satisfied refinement)")
            return
            break;
        case evalConstraintState[2]:
            // refinements are Not-Existing --> continue processing
            break;
        case evalConstraintState[3]:
            // refinements returned an ERROR --> do the same
            return
            break;
    }

    let dutyEvalResult = evaluateAll_dutyDuties(policyTriplestore, evalRuleid, testlogger, testcaseName)
    // testlogger.addLine("TESTRESULT: Evaluation of all duty(ies), status = " + dutyEvalResult)
    let permissionStateIdx = 0
    switch(dutyEvalResult){
        case evalDutyState[0]:
            permissionStateIdx = 0;
            break;
        case evalDutyState[1]:
            permissionStateIdx = 1;
            break;
        case evalDutyState[2]:
            permissionStateIdx = 0;
            break;
        case evalDutyState[3]:
            permissionStateIdx = 3;
            break;
    }
    testlogger.addLine("TESTRESULT-FINAL: Evaluation of the full Permission instance, status = " +
        evalPermissionState[permissionStateIdx])
}
exports.evaluatePermission = evaluatePermission

/**
 * Evaluates an instance of the Rule Class referenced by the property prohibition
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param testcaseName
 */
function evaluateProhibition(policyTriplestore, evalRuleid, testlogger, testcaseName ){
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Prohibtion has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }

    // testlogger.addLine("NEXT STEP: Evaluation of ActionExercised")

    let actionExercisedEvalResult =
        evaluateActionExercised(policyTriplestore, evalRuleid, odrlVocab.prohibition, testlogger, testcaseName)
    switch(actionExercisedEvalResult){
        case evalActionExersState[0]:
            // action was exercised - continue processing
            break;
        case evalActionExersState[1]:
            // action was not exercised - Prohibition is not violated
            testlogger.addLine("TESTRESULT: Evaluation of ActionExercised '" + actionId + "', status = "
                + actionExercisedEvalResult)
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of the full Prohibition instance, status = " +
                evalProhibitionState[0])
            return
            break;
        case evalActionExersState[2]:
            // action is Not-Existing --> continue processing
            testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Prohibition has no action")
            return
            break;
        case evalActionExersState[3]:
            // refinements returned an ERROR --> do the same
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of ActionExercised '" + actionId + "' returned an ERROR - evaluation aborted")
            return
            break;
    }

    // action has been exercised: evaluate the satisfaction of the remedies
    testlogger.addLine("NEXT STEP: Action of Prohibition exercised: evaluation of remedies")
    let remedyEvalResult = evaluateAll_remedyDuties(policyTriplestore, evalRuleid, testlogger, testcaseName)
    testlogger.addLine("TESTRESULT: Evaluation of all remedy(ies), status = " + remedyEvalResult)
    let prohibitionStateIdx = 0
    switch(remedyEvalResult){
        case evalDutyState[0]:
            prohibitionStateIdx = 0;
            break;
        case evalDutyState[1]:
            prohibitionStateIdx = 1;
            break;
        case evalDutyState[2]:
            prohibitionStateIdx = 0;
            break;
        case evalDutyState[3]:
            prohibitionStateIdx = 3;
            break;
    }
    testlogger.addLine("TESTRESULT-FINAL: Evaluation of the full Prohibition instance, status = " +
        evalProhibitionState[prohibitionStateIdx])
}
exports.evaluateProhibition = evaluateProhibition
