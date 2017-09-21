"use strict"
/*
    Testing an Evaluator for ODRL Rules (with a Profile)

 */

// evaluator test files reside in the /evaltest folder
let Test1 = require("./evaltests/test")


// Test1.doTheTest("case01") // Constraints

// Test1.doTheTest("case02") // Duties


// Test1.doTheTest("case03") // Refinement

Test1.doTheTest("case04") // Prohibition

// ********************************************************
// ********** ODRL Information Model Examples

/*
Test1.doTheTest("case_imex13a")
Test1.doTheTest("case_imex13b")

Test1.doTheTest("case_imex14a")
Test1.doTheTest("case_imex14b")
*/

Test1.doTheTest("case_imex15a")
Test1.doTheTest("case_imex15b")
Test1.doTheTest("case_imex15c")
Test1.doTheTest("case_imex15d")


// Test1.doTheTest("case_imex24") // Refinement

console.log("MSG: ODRL-withProfile Evaluator Tests finished.")