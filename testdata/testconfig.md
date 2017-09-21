# The Test Configuration

This evaluator supports setting values reflecting the context of a test case for multiple different cases.
The format of the file is YAML.

## Definition of a single test case

The data for a single test case must define a unique name of the case and must or may include values for variables.

The case below shows all possible variables:
* variable name to the left of the colon is fixed
* "..." stands for a variable value (it may should even a specific value) and the text to the right explains the semantics of the variable

```
CASE99: = the only variable name which must be changed: it sets the name of the test case, must be used in main.js to run it.
  filename: "..." = the mandatory filename, no directory/folder, not extension.
  description: "..." = an optional short description of the case
  evalRuleid: "..." = the uid of the Rule of a Policy which should be evaluated
  evalRuleproperty: "prohibition.1" = the property name, a dot and the sequence number of the Rule of a Policy which should be evaluated
                    Note: either evalRuleid or  evalRuleproperty MUST be used
  evalpresets: = this section defines preset values
    defaults: = this section defines preset values for any instance of the used property names if no preset is defined in the instances section below
      constraint: "Satisfied" = preset value of any constraint Constraint
      refinement: "Satisfied" = preset value of any refinement Constraint
      dutyAction: "Exercised" =  preset value of the action in any duty
      obligationAction: "Exercised" = preset value of the action of any obligation
      consequenceAction: "Not-Exercised"  = preset value of the action of any consequence
      remedyAction: "Exercised"  = preset value of the action of any remedy
      action: "Exercised" = preset value of the action of any other property
    instances: = This section defines preset values for Things in the evaluated Rule with a specific id - may be the id of a blank node!
      "_:b0_b0": "Not-Satisfied" = preset value of a blank node with the id _:b0_b0
                                 Be aware: the preset value must match the type of the node
```
