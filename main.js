"use strict"
/*
    Testing an Evaluator for ODRL and the RightsML profile

 */

// evaluator test files reside in the /evaltest folder
let Test1 = require("./evaltests/test")

/*
Test1.doTheTest("case01") // Constraints

Test1.doTheTest("case02") // Duties
*/

// Test1.doTheTest("case03") // Refinement

Test1.doTheTest("case_imex15") // Refinement

console.log("MSG: ODRL-RightsML Evaluator Tests finished.")