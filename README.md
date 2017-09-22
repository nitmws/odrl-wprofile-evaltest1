# ODRL with Profile - Evaluator Test 1

[ODRL](https://www.w3.org/2016/poe/charter) - Open Digital Rights Language - has an Information Model and this model defines how to retrieve the key information from a Rule:
* Is the user allowed to exercise a Permission
* Does the user infringe a Prohibition
* Does a user fulfill an Obligation

To show such final results some components of a Rule need to be evaluated as details by an ODRL processor - this feature is called **ODRL Evaluator** by this project.

This project implements all required evaluation steps of components:
* are constraints of a Rule Satisfied
* are refinements of the action of a Rule satisfied
* has the action of a Duty been exercised, including have its refinements been Satisfied
* have required consequences of a Duty been Fulfilled
* have required remedies of a Prohibition been Fulfilled

All these evaluations are defined in detail by the ODRL Information Model document.

As the evaluation of some components require a context (= what action on an asset should be taken by whom ...) and as such a context is not available in this test environment this project supports presetting evaluation states by a configuration file.

The evaluation of an ODRL Rule is documented step by step.

The testwise evaluation of Rules can be controlled by a configuration file which sets
* the filename of the JSON-LD providing the ODRL Policy
* a free-text description of the test case
* the identifier of the to-be-tested Rule
* presets of test results, see above

The current state of this project is "under construction":
* the evaluation of a Permission is complete, needs more testing
* the evaluation of a Prohibition is complete, needs more testing
* the evaluation of an Obligation is complete, needs more testing

Timeline: all evaluations should be available in mid-October 2017.

This project is published under the [MIT](https://opensource.org/licenses/MIT) license and copyrighted by [Michael Steidl/NewsIT](https://www.linkedin.com/in/michaelwsteidl)

