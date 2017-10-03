"use strict"
/**
 * Evaluator module
 */

let odrlCoreVocab = require("../model/odrlCoreVocabulary")

/**
 * The states resulting from the evaluation of an ODRL Rule etc use strings
 * The index in the array is: 0 = positive/affirmative state, 1 = negative state,
 *  2 = semantically not existing, 3 = error state
 */
const evalConstraintState  = ["Satisfied", "Not-Satisfied", "Not-Existing", "ERROR"]
exports.evalConstraintState = evalConstraintState
const evalDutyState = ["Fulfilled", "Not-Fulfilled", "Not-Existing", "ERROR"]
exports.evalDutyState = evalDutyState
const evalPermissionState = ["Allowed", "Not-Allowed", "Not-Existing", "ERROR"]
exports.evalPermissionState = evalPermissionState
const evalProhibitionState = ["Not-Infringed", "Infringed", "Not-Existing", "ERROR"]
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
 * @param evalContext
 * @returns {string|string} - a value of the enumeration evalConstraintState
 */
function evaluateAllConstraints(policyTriplestore, ruleId, testlogger, evalContext) {
    if (!policyTriplestore) {
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    return evaluateConstraintClassInstances(policyTriplestore, ruleId,
        odrlCoreVocab.constraint, testlogger, evalContext)
}
exports.evaluateAllConstraints = evaluateAllConstraints

/**
 * Evaluates all refinements of an Action or Asset Collection or Party Collection
 * @param policyTriplestore
 * @param subjectId - id of the Action/AssetCollection/PartyCollection
 * @param testlogger
 * @param evalContext
 * @returns {string|string} - a value of the enumeration evalConstraintState
 */
function evaluateAllRefinements(policyTriplestore, subjectId, testlogger, evalContext) {
    if (!policyTriplestore) {
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    let evaluationResult = evaluateConstraintClassInstances(policyTriplestore, subjectId,
        odrlCoreVocab.refinement, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*} - a value of the enumeration evalConstraintState
 */
function evaluateConstraintClassInstances(policyTriplestore, subjectId, propertyId, testlogger, evalContext){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
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
            let constrEvalResult = preevaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
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

/**
 * Pre-evaluation of a single instance of a Constraint Class.
 * Makes a distinction between atomic Constraint and Logical Constraint
 * Forwards to a specific full evaluation.
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param evalContext
 */
function preevaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, evalContext) {
    // check the existence of a Logical Constraint operand:
    let lcoperand = ""
    let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_or, null, null)
    if (lcopTestQuads.length > 0) { lcoperand = odrlCoreVocab.lc_or}
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_and, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlCoreVocab.lc_and}
    }
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_xone, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlCoreVocab.lc_xone}
    }
    if (lcoperand === ""){
        let lcopTestQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_andSequence, null, null)
        if (lcopTestQuads.length > 0) { lcoperand = odrlCoreVocab.lc_andSequence}
    }

    switch(lcoperand){
        case "": // no Logical Constraint operand: is a plain/atomic Constraint
            return evaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
            break
        case odrlCoreVocab.lc_or:
            return evaluateLogicalConstraintOr(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
            break
        case odrlCoreVocab.lc_and:
            return evaluateLogicalConstraintAnd(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
            break
        case odrlCoreVocab.lc_xone:
            return evaluateLogicalConstraintXone(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
            break
        case odrlCoreVocab.lc_andSequence:
            return evaluateLogicalConstraintAndSequence(policyTriplestore, constraintId, propertyId, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*} - a value of the enumeration evalConstraintState
 */
function evaluateConstraintClassInstance(policyTriplestore, constraintId, propertyId, testlogger, evalContext){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    switch(propertyId){
        case odrlCoreVocab.constraint:
            if (evalContext) {
                let testResultPreset = ""
                if (evalContext.evalpresets.instances[constraintId]) {
                    testResultPreset = evalContext.evalpresets.instances[constraintId]
                }
                if (testResultPreset === "" && evalContext.evalpresets.defaults.constraint) {
                    testResultPreset = evalContext.evalpresets.defaults.constraint
                }
                testlogger.addLine("TESTRESULT: Evaluation of Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
        case odrlCoreVocab.refinement:
            if (evalContext) {
                let testResultPreset = ""
                if (evalContext.evalpresets.instances[constraintId]) {
                    testResultPreset = evalContext.evalpresets.instances[constraintId]
                }
                if (testResultPreset === "" && evalContext.evalpresets.defaults.refinement) {
                    testResultPreset = evalContext.evalpresets.defaults.refinement
                }
                testlogger.addLine("TESTRESULT: Evaluation of Constraint instance '" + constraintId + "' (a "
                    + propertyId +  "), status = " + testResultPreset + " (preset)")
                return testResultPreset
            }
            break
        case odrlCoreVocab.lc_or:
        case odrlCoreVocab.lc_and:
        case odrlCoreVocab.lc_andSequence:
        case odrlCoreVocab.lc_xone:
            if (evalContext) {
                let testResultPreset = ""
                if (evalContext.evalpresets.instances[constraintId]) {
                    testResultPreset = evalContext.evalpresets.instances[constraintId]
                }
                if (testResultPreset === "" && evalContext.evalpresets.defaults.constraint) {
                    testResultPreset = evalContext.evalpresets.defaults.constraint
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
   testlogger.addLine("ERROR: evaluateConstraintClassInstance -- no presets found")

    return evalConstraintState[3] // actually the function shouldn't get there because of the presets above
}
exports.evaluateConstraintClassInstance = evaluateConstraintClassInstance

/**
 * Evaluates an instance of a Logical Constraint class with the "or" operand
 * @param policyTriplestore
 * @param constraintId
 * @param propertyId
 * @param testlogger
 * @param evalContext
 * @returns {*}
 */
function evaluateLogicalConstraintOr(policyTriplestore, constraintId, propertyId, testlogger, evalContext) {
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_or, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlCoreVocab.lc_or, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*}
 */
function evaluateLogicalConstraintXone(policyTriplestore, constraintId, propertyId, testlogger, evalContext) {
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_xone, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlCoreVocab.lc_xone, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*}
 */
function evaluateLogicalConstraintAnd(policyTriplestore, constraintId, propertyId, testlogger, evalContext) {
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_and, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlCoreVocab.lc_and, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*}
 */
function evaluateLogicalConstraintAndSequence(policyTriplestore, constraintId, propertyId, testlogger, evalContext) {
    if (!policyTriplestore){
        return evalConstraintState[3]
    }

    let lcoperandValueQuads = policyTriplestore.getTriplesByIRI(constraintId, odrlCoreVocab.lc_andSequence, null, null)
    let satisfiedCount = 0
    if (lcoperandValueQuads.length === 0){
        return evalConstraintState[1] // not satisfied
    }
    for (let i = 0; i < lcoperandValueQuads.length; i++) {
        let constraintId = lcoperandValueQuads[i].object
        let constrEvalResult = evaluateConstraintClassInstance(policyTriplestore, constraintId, odrlCoreVocab.lc_andSequence, testlogger, evalContext)
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
 * @param evalContext
 * @returns {*}
 */
function evaluateAll_dutyDuties(policyTriplestore, ruleId, testlogger, evalContext) {
    if (!policyTriplestore) {
        testlogger.addLine("ERROR: triple store is missing")
        return evalDutyState[3]
    }
    let evalConsequences = true
    if (evalContext.evalpresets.defaults.dutyEvalRound){
        let der = evalContext.evalpresets.defaults.dutyEvalRound
        switch (der){
            case "1":
                evalConsequences = false
                break
        }
    }
    let dutyQuads = policyTriplestore.getTriplesByIRI(ruleId, odrlCoreVocab.duty, null, null)
    if (dutyQuads.length === 0){
        return evalDutyState[2]
    }
    for (let i=0; i < dutyQuads.length; i++) {
        let dutyId = dutyQuads[i].object
        let dutyEvalResult = evaluateDutyInstance(policyTriplestore, dutyId, evalConsequences, odrlCoreVocab.duty, testlogger, evalContext)
            // evaluate_dutyOr_obligationDuty(policyTriplestore, dutyId, testlogger, evalContext)
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
                testlogger.addLine("ERROR: evaluateAll_dutyDuties -- a duty returned an error")
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
 * @param evalContext
 * @returns {*}
 */
function evaluateAll_remedyDuties(policyTriplestore, ruleId, testlogger, evalContext) {
    if (!policyTriplestore) {
        testlogger.addLine("ERROR: triple store is missing")
        return evalDutyState[3]
    }
    let remedyQuads = policyTriplestore.getTriplesByIRI(ruleId, odrlCoreVocab.remedy, null, null)
    if (remedyQuads.length === 0){
        return evalDutyState[2]
    }
    for (let i=0; i < remedyQuads.length; i++) {
        let remedyId = remedyQuads[i].object
        let remedyEvalResult = evaluateDutyInstance(policyTriplestore, remedyId, false, odrlCoreVocab.remedy, testlogger, evalContext)
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
                testlogger.addLine("ERROR: evaluateAll_remedyDuties -- a remedy returned an error")
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

/**
 * Evaluates the core of an instance of a Duty Class
 * @param policyTriplestore
 * @param dutyId
 * @param evalConsequences - boolean (true for duty and obligation Duties, else false)
 * @param propertyId
 * @param testlogger
 * @param evalContext
 * @returns {*}
 */
function evaluateDutyInstance(policyTriplestore, dutyId, evalConsequences, propertyId, testlogger, evalContext){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalDutyState[3]
    }

    testlogger.addLine("NEXT STEP: Evaluation of Duty instance '" + dutyId + "', referenced by '" + propertyId + "'")
    // Evaluate the Constraints
    let constraintsEvalResult =
        evaluateAllConstraints(policyTriplestore, dutyId, testlogger, evalContext)
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
            testlogger.addLine("ERROR: evaluateDutyInstance -- constraints returned an error")
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[3])
            return evalDutyState[3]
            break;
    }

    // Evaluate the refinements of the target
    let targetQuads = policyTriplestore.getTriplesByIRI(dutyId, odrlCoreVocab.target, null, null)
    let targetId = ""
    if (targetQuads.length < 1){
        testlogger.addLine("NOTICE: Duty has no target")
    }
    else {
        targetId = targetQuads[0].object
    }
    if (targetId !== "") {
        let targetRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, targetId, testlogger, evalContext)
        switch (targetRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT: Evaluation of Duty's target '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (target not existing by Not-Satisfied refinement)")
                return
                break;
            case evalConstraintState[2]:
                // refinements are Not-Existing --> continue processing
                break;
            case evalConstraintState[3]:
                // refinements returned an ERROR --> do the same
                testlogger.addLine("ERROR: evaluateDutyInstance -- target refinements returned an error")
                return
                break;
        }
    }

    // Evaluate the refinements of the assignee
    let assigneeQuads = policyTriplestore.getTriplesByIRI(dutyId, odrlCoreVocab.assignee, null, null)
    let assigneeId = ""
    if (assigneeQuads.length < 1){
        testlogger.addLine("NOTICE: Duty has no assignee")
    }
    else {
        assigneeId = assigneeQuads[0].object
    }
    if (assigneeId !== "") {
        let assigneeRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, assigneeId, testlogger, evalContext)
        switch (assigneeRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT-FINAL: Evaluation of Duty's assignee '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (assignee not existing by Not-Satisfied refinement)")
                return
                break;
            case evalConstraintState[2]:
                // refinements are Not-Existing --> continue processing
                break;
            case evalConstraintState[3]:
                // refinements returned an ERROR --> do the same
                testlogger.addLine("ERROR: evaluateDutyInstance -- assignee refinements returned an error")
                return
                break;
        }
    }

    // Evaluate the Action
    let actionEvalResult =
        evaluateActionExercised(policyTriplestore, dutyId, propertyId, testlogger, evalContext)
    switch(actionEvalResult){
        case evalActionExersState[0]:
            // Action was exercised ...
            if (!evalConsequences) {
                // ... --> break and return Duty Fulfilled
                testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[0] + " (action exercised)")
                return evalDutyState[0]
            }
            // ... else: continue
            break
        case evalActionExersState[1]:
            // Action was Not-Exercised --> break and return Duty Not-Fulfilled
            if (!evalConsequences) {
                // ... --> break and return Duty Fulfilled
                testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[1] + " (action not exercised/consequences ignored)")
                return evalDutyState[1]
            }
            // ... else: continue
            break;
        case evalActionExersState[2]:
            // Action is Not-Existing (due to refinements) --> break and return ERROR
            testlogger.addLine("TESTRESULT: Evaluation of Duty instance '" + dutyId + "', status = " + evalDutyState[3] + " (action not existing)")
            return evalDutyState[3]
            break;
        case evalActionExersState[3]:
            // constraints returned an ERROR --> do the same
            testlogger.addLine("ERROR: evaluateDutyInstance -- action refinements returned an error")
            return evalDutyState[3]
            break;
    }

    // actually the function should get there only in case of to-be-evaluated consequences, but let's be strict:
    if (evalConsequences) {
        if (true) { // actionEvalResult === evalActionExersState[1]
            // step 1: action Exercised -> step 2: evaluate the Consequences
            let consequQuads = policyTriplestore.getTriplesByIRI(dutyId, odrlCoreVocab.consequence, null, null)
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
                        odrlCoreVocab.consequence, testlogger, evalContext)
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
                            testlogger.addLine("ERROR: evaluateDutyInstance -- consequences returned an error")
                            return evalDutyState[3]
                            break;
                    }
                }
                // At this point the status of all consequences can be only Fulfilled or Not-Existing
                if (consequenceFulfilled) {
                    testlogger.addLine("TESTRESULT: Evaluation of all consequence-Duty instances of '" + dutyId + "', status = " + evalDutyState[0])
                    return evalDutyState[0]
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
        NOTE: a full implementation of an Evaluator should start processing the Duty now.
            As this is considered as black-box by the ODRL Recommendation this processing and
            its result is replaced by the presets above.

    */
    testlogger.addLine("ERROR: evaluateDutyInstance -- no preset found")
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
 * @param evalContext
 * @returns {*}
 */
function evaluateActionExercised(policyTriplestore, subjectId, propertyId, testlogger, evalContext){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return evalActionExersState[3]
    }
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(subjectId, odrlCoreVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("ERROR: evaluateActionExercised -- no action triple exists")
        return evalActionExersState[3] // = not existing
    }
    else {
        actionId = actionQuads[0].object
    }

    testlogger.addLine("NEXT STEP: Evaluation of ActionExercised of action (of '" + subjectId + "')")

    // Evaluate the refinement Constraints
    let refinementsEvalResult =
        evaluateAllRefinements(policyTriplestore, actionId, testlogger, evalContext)
    switch(refinementsEvalResult){
        case evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT: Evaluation of ActionExercised '" + actionId + "' - refinements, status = "
                + evalDutyState[2] + " (action not existing by Not-Satisfied refinement)")
            return evalDutyState[2]
            break;
        case evalConstraintState[2]:
            // refinements are Not-Existing --> continue processing
            break;
        case evalConstraintState[3]:
            // refinements returned an ERROR --> do the same
            testlogger.addLine("ERROR: evaluateActionExercised -- refinements returned an error")
            return evalActionExersState[3]
            break;
    }

    // retrieve and return preset value
    if (evalContext) {
        let testResultPreset = ""
        if (evalContext.evalpresets.instances[actionId]) {
            testResultPreset = evalContext.evalpresets.instances[actionId]
        }
        if (testResultPreset === "" && propertyId === odrlCoreVocab.prohibition && evalContext.evalpresets.defaults.prohibitionAction) {
            testResultPreset = evalContext.evalpresets.defaults.prohibitionAction
        }
        if (testResultPreset === "" && propertyId === odrlCoreVocab.duty && evalContext.evalpresets.defaults.dutyAction) {
            testResultPreset = evalContext.evalpresets.defaults.dutyAction
        }
        if (testResultPreset === "" && propertyId === odrlCoreVocab.obligation && evalContext.evalpresets.defaults.obligationAction) {
            testResultPreset = evalContext.evalpresets.defaults.obligationAction
        }
        if (testResultPreset === "" && propertyId === odrlCoreVocab.remedy && evalContext.evalpresets.defaults.remedyAction) {
            testResultPreset = evalContext.evalpresets.defaults.remedyAction
        }
        if (testResultPreset === "" && propertyId === odrlCoreVocab.consequence && evalContext.evalpresets.defaults.consequenceAction) {
            testResultPreset = evalContext.evalpresets.defaults.consequenceAction
        }
        if (testResultPreset === "" && evalContext.evalpresets.defaults.action) {
            testResultPreset = evalContext.evalpresets.defaults.action
        }
        testlogger.addLine("TESTRESULT: Evaluation of ActionExercised '" + actionId + "' (action of '" + subjectId + "'), status = "
            + testResultPreset + " (preset)")
        return testResultPreset
    }

}
exports.evaluateActionExercised = evaluateActionExercised

/*
    *************************************************************************************
    ***** Below: evaluate a Rule referenced by a property of an ODRL Policy
    *************************************************************************************
*/

/**
 * Evaluates an instance of the Permission Class referenced by the property permission
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluatePermission(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }
    // Evaluate the Constraints
    let constraintsEvalResult =
        evaluateAllConstraints(policyTriplestore, evalRuleid, testlogger, evalContext)
    switch (constraintsEvalResult){
        case evalConstraintState[0]:
        case evalConstraintState[2]:
            // constraints are Satisfied or Not-Existing --> continue processing
            testlogger.addLine("TESTRESULT: Evaluation of all constraints of the Rule, status = " + constraintsEvalResult)
            break
        case evalConstraintState[1]:
        case evalConstraintState[3]:
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of all constraints of the Rule, status = " + constraintsEvalResult
                + " -- no further evaluation")
            return
            break
    }

    // Evaluate the refinements of the target
    let targetQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.target, null, null)
    let targetId = ""
    if (targetQuads.length < 1){
        testlogger.addLine("NOTICE: Permission has no target")
    }
    else {
        targetId = targetQuads[0].object
    }
    if (targetId !== "") {
        let targetRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, targetId, testlogger, evalContext)
        switch (targetRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT-FINAL: Evaluation of target '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (target not existing by Not-Satisfied refinement) -- no further processing of the Permission")
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
    }

    // Evaluate the refinements of the assignee
    let assigneeQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.assignee, null, null)
    let assigneeId = ""
    if (assigneeQuads.length < 1){
        testlogger.addLine("NOTICE: Permission has no assignee")
    }
    else {
        assigneeId = assigneeQuads[0].object
    }
    if (assigneeId !== "") {
        let assigneeRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, assigneeId, testlogger, evalContext)
        switch (assigneeRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT-FINAL: Evaluation of assignee '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (assignee not existing by Not-Satisfied refinement)  -- no further processing of the Permission")
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
    }

    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Permission has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }

    // Evaluate the refinement Constraints of the action
    let actionRefinementsEvalResult =
        evaluateAllRefinements(policyTriplestore, actionId, testlogger, evalContext)
    switch(actionRefinementsEvalResult){
        case evalConstraintState[0]:
            // refinements are Satisified --> continue processing
            break;
        case evalConstraintState[1]:
            // refinements are Not-Satisified --> return a Not-Existing
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of ActionExercised '" + actionId + "' - refinements, status = "
                + evalDutyState[2] + " (action not existing by Not-Satisfied refinement) -- no further processing of the Permission")
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

    let dutyEvalResult = evaluateAll_dutyDuties(policyTriplestore, evalRuleid, testlogger, evalContext)
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
 * Evaluates an instance of the Prohibition Class referenced by the property prohibition
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluateProhibition(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }
    // Evaluate the Constraints
    let constraintsEvalResult =
        evaluateAllConstraints(policyTriplestore, evalRuleid, testlogger, evalContext)
    switch (constraintsEvalResult){
        case evalConstraintState[0]:
        case evalConstraintState[2]:
            // constraints are Satisfied or Not-Existing --> continue processing
            testlogger.addLine("TESTRESULT: Evaluation of all constraints of the Rule, status = " + constraintsEvalResult)
            break
        case evalConstraintState[1]:
        case evalConstraintState[3]:
            testlogger.addLine("TESTRESULT-FINAL: Evaluation of all constraints of the Rule, status = " + constraintsEvalResult
                + " -- no further evaluation")
            return
            break
    }

    // Evaluate the refinements of the target
    let targetQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.target, null, null)
    let targetId = ""
    if (targetQuads.length < 1){
        testlogger.addLine("NOTICE: Prohibition has no target")
    }
    else {
        targetId = targetQuads[0].object
    }
    if (targetId !== "") {
        let targetRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, targetId, testlogger, evalContext)
        switch (targetRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT-FINAL: Evaluation of target '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (target not existing by Not-Satisfied refinement)  -- no further processing of the Prohibition")
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
    }

    // Evaluate the refinements of the assignee
    let assigneeQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.assignee, null, null)
    let assigneeId = ""
    if (assigneeQuads.length < 1){
        testlogger.addLine("NOTICE: Prohibition has no assignee")
    }
    else {
        assigneeId = assigneeQuads[0].object
    }
    if (assigneeId !== "") {
        let assigneeRefinementsEvalResult =
            evaluateAllRefinements(policyTriplestore, assigneeId, testlogger, evalContext)
        switch (assigneeRefinementsEvalResult) {
            case evalConstraintState[0]:
                // refinements are Satisfied --> continue processing
                break;
            case evalConstraintState[1]:
                // refinements are Not-Satisified --> return a Not-Existing
                testlogger.addLine("TESTRESULT-FINAL: Evaluation of assignee '" + targetId + "' - refinements, status = "
                    + evalDutyState[2] + " (assignee not existing by Not-Satisfied refinement)  -- no further processing of the Prohibition")
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
    }

    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Prohibition has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }


    let actionExercisedEvalResult =
        evaluateActionExercised(policyTriplestore, evalRuleid, odrlCoreVocab.prohibition, testlogger, evalContext)
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
    let remedyEvalResult = evaluateAll_remedyDuties(policyTriplestore, evalRuleid, testlogger, evalContext)
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

/**
 * Evaluates the action of an instance of the Prohibition Class referenced by the property prohibition
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluateProhibitionAction(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }
    // retrieve the actionId from the class of the subjectId
    let actionQuads = policyTriplestore.getTriplesByIRI(evalRuleid, odrlCoreVocab.action, null, null)
    let actionId = ""
    if (actionQuads.length < 1){
        testlogger.addLine("TESTRESULT-FINAL: validation ERROR: Prohibition has no action")
        return
    }
    else {
        actionId = actionQuads[0].object
    }

    let actionExercisedEvalResult =
        evaluateActionExercised(policyTriplestore, actionId, odrlCoreVocab.prohibition, testlogger, evalContext)

    testlogger.addLine("TESTRESULT-FINAL: Evaluation of the action of a Prohibition instance, status = " +
        actionExercisedEvalResult)
}
exports.evaluateProhibitionAction = evaluateProhibitionAction

/**
 * Evaluates all remedies of an instance of the Prohibition Class referenced by the property prohibition
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluateProhibitionRemedies(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }
    // assume action has been exercised: evaluate the satisfaction of the remedies
    testlogger.addLine("NEXT STEP: Prohibtion: evaluation of remedies")
    let remedyEvalResult = evaluateAll_remedyDuties(policyTriplestore, evalRuleid, testlogger, evalContext)
    testlogger.addLine("TESTRESULT-FINAL: Evaluation of the remedies of Prohibition instance, status = " +
        remedyEvalResult)
}
exports.evaluateProhibitionRemedies = evaluateProhibitionRemedies

/**
 * Evaluates an instance of the Duty Class referenced by the property obligation, ignoring consequences
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluateObligationRound1(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }

    let obligationEvalResult = evaluateDutyInstance(policyTriplestore, evalRuleid, false, odrlCoreVocab.obligation, testlogger, evalContext)
    testlogger.addLine("TESTRESULT-FINAL: Evaluation round 1 of the full Obligation instance, status = " +
        obligationEvalResult)
}
exports.evaluateObligationRound1 = evaluateObligationRound1

/**
 * Evaluates an instance of the Duty Class referenced by the property obligation, including consequences
 * @param policyTriplestore
 * @param evalRuleid
 * @param testlogger
 * @param evalContext
 */
function evaluateObligationRound2(policyTriplestore, evalRuleid, testlogger, evalContext ){
    if (!policyTriplestore){
        testlogger.addLine("ERROR: triple store is missing")
        return
    }

    let obligationEvalResult = evaluateDutyInstance(policyTriplestore, evalRuleid, true, odrlCoreVocab.obligation, testlogger, evalContext)
    testlogger.addLine("TESTRESULT-FINAL: Evaluation round 2 of the full Obligation instance, status = " +
        obligationEvalResult)
}
exports.evaluateObligationRound2 = evaluateObligationRound2

