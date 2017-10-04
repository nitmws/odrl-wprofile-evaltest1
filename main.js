"use strict"
/* **************************************************************
    Tool for testing an Evaluator of ODRL Rules (with a Profile)
*****************************************************************/

let Test1 = require("./evaltests/test")


// ********************************************************
// ********** ODRL Information Model Examples


Test1.doTheTest("case_imex12-1")

Test1.doTheTest("case_imex13-1")
Test1.doTheTest("case_imex13-2")

Test1.doTheTest("case_imex14-1")
Test1.doTheTest("case_imex14-2")

Test1.doTheTest("case_imex15-1")
Test1.doTheTest("case_imex15-2")
Test1.doTheTest("case_imex15-3")
Test1.doTheTest("case_imex15-4")

Test1.doTheTest("case_imex16-1")
Test1.doTheTest("case_imex16-2")

Test1.doTheTest("case_imex17-1")
Test1.doTheTest("case_imex17-2")

Test1.doTheTest("case_imex18-1")
Test1.doTheTest("case_imex18-2")

Test1.doTheTest("case_imex19-1")
Test1.doTheTest("case_imex19-2")

Test1.doTheTest("case_imex20-1")
Test1.doTheTest("case_imex20-2")

Test1.doTheTest("case_imex21-1")
Test1.doTheTest("case_imex21-2")
Test1.doTheTest("case_imex21-3")
Test1.doTheTest("case_imex21-4")
Test1.doTheTest("case_imex21-5")

Test1.doTheTest("case_imex22-1")
Test1.doTheTest("case_imex22-2")
Test1.doTheTest("case_imex22-3")
Test1.doTheTest("case_imex22-4")

Test1.doTheTest("case_imex23-1")
Test1.doTheTest("case_imex23-2a")
Test1.doTheTest("case_imex23-2b")
Test1.doTheTest("case_imex23-3a")
Test1.doTheTest("case_imex23-3b")
Test1.doTheTest("case_imex23-4")
Test1.doTheTest("case_imex23-5")

Test1.doTheTest("case_imex24-1")
Test1.doTheTest("case_imex24-2")
Test1.doTheTest("case_imex24-3")

/*
    Test cases for developing this evaluator
*/
// Test1.doTheTest("case01") // Constraints

// Test1.doTheTest("case02") // Duties


// Test1.doTheTest("case03") // Refinement

// Test1.doTheTest("case04") // Prohibition

console.log("MSG: ODRL-withProfile Evaluator Tests finished.")