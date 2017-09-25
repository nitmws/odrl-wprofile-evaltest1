# ODRL with Profile - Evaluator Testground 1

[ODRL](https://www.w3.org/2016/poe/charter) - Open Digital Rights Language - has an Information Model and this model defines how to retrieve relevant rights information from a Rule:
* Is the user allowed to exercise a Permission with a specific asset
* Does the user's use of an asset align with a Prohibition or violate it
* Does a user fulfill an Obligation related to an asset

To get such final results some components of a Rule need to be evaluated and their results combined by an ODRL processor - this feature is called **ODRL Evaluator** by this project.

This project implements all required evaluation steps:
* are constraints of a Rule Satisfied
* are refinements of the action of a Rule Satisfied
* has the action of a Duty been exercised, including have its refinements been Satisfied
* have required consequences of a Duty been Fulfilled
* have required remedies of a Prohibition been Fulfilled

All these evaluations are defined in detail by the ODRL Information Model document.

A goal of this project is to support all example policies of the ODRL Information Model document's Candidate Recommendation (CR) document. More on that after the release of the CR (~ late September 2017).

As the evaluation of some components require a context (= what action on what asset should be taken by whom ...) and as this project's testground has no context driven be a production environment the ODRL Evaluator supports presetting values relevant for the evaluation by a configuration file which may include:
* the filename of the JSON-LD providing the ODRL Policy
* a free-text description of the test case
* the identifier of the to-be-tested Rule
* presets of values like is a constraint or a refinement satisfied or an action exercised

Base on such a defined context the identified Rule is evaluated - step by step - and finally a state for the Rule as a whole is generated. To make the process visible the evaluation of an ODRL Rule is documented step by step.

### Documentation

More details are documented by these files:
* /evaluator/evaluationLogic.md : how components of a Rule are evaluated and how results are evaluated for the Rule's state
* /testdata/testconfig.md : the configuation file

Overview of files and folders of this project:
* main.js: the starting point of this project. Run it as Command Line script (node main.js)
* README.md: this file
* package.json: configuration file required for Node JS and NPM
* /evaltest: JS file(s) running the test(s)
* /model: JS files providing identifiers of Things defined by the ODRL Information Model or an ODRL Profile
* /services: JS files supporting the project
* /testdata: JSON-LD files with ODRL Policy data, the test configuration file (YAML)
* /testdataout: the files created by the ODRL Evaluator (is ignored by git)
* /testdataout_archive: subfolders holding data of the /testdataout folder of a specific test sequence

### Errors, Issues, Feedback

To share errors, issues or any other feedback please use the [Issues feature of the Github repository](https://github.com/nitmws/odrl-wprofile-evaltest1/issues).

### State, Timeline, Rights

The current state of this project is "close to final":
* the evaluation of a Permission is complete, needs more testing
* the evaluation of a Prohibition is complete, needs more testing
* the evaluation of an Obligation is complete, needs more testing

Timeline: all evaluation features should be available in early October 2017.

This project is published under the [MIT](https://opensource.org/licenses/MIT) license and copyrighted by [Michael Steidl/NewsIT](https://www.linkedin.com/in/michaelwsteidl)

