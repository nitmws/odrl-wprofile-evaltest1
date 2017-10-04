# The logic implemented by this evaluator

(This document is currently Under Construction)

### Basics:
* the evaluation of Rules, Logical/Constraints, Action exercised or Duties return a state. All terms used as name of a state are starting with an uppercase character and are used in the logic below:
  * affirmative state (term depends on evaluated subject, see below)
  * negative state (term depends on evaluated subject, see below)
  * Not-Existing state
  * Error state
* Term **preset** used below: this evaluator has a system to set values from a preset. The file /testdata/testconfig.yml holds these data and they are transformed into a context object. This evaluator checks this object and retrieve preset values, if available.
* `>>>` indicates: a sub-evaluation is called
* `-->` indicates: the processing of this evaluation is stopped at that point and a state is returned
* `continue` indicates the processing is continued
* ERROR state: is bubbled up, further evaluation of this state is not included in this project

### Generic design

All evaluation functions of this project follow this generic design:
* if the evaluation of a sub-component returns an affirmative state the processing is continued
* if the evaluation of a sub-component returns a negative or an error state the processing of the function is stopped and this state is returned.
* at the end of a function an affirmative state is returned.
* how the Not-Existing state of an evaluated sub-component is treated depends on the function.

# The Main Rules

## Permission
```
>>> All constraint Constraints:
  None-Exist: continue
  Satisfied: continue
  Not-Satisfied: --> Permission state = Not-Existing
action
  >>> All refinement Constraints:
    None-Exist: continue
    Satisfied: continue
    Not-Satisfied: --> Permission state = Not-Allowed
duties: all Fulfilled?
  None-Exist: --> Permission state = Allowed
  YES: --> Permission state = Allowed
  NO: --> Permission state = Not-Allowed

```

## Prohibition
```
>>> All constraint Constraints:
  None-Exist: continue
  Satisfied: continue
  Not-Satisfied: --> Prohibition state = Not-Existing
>>> Action Exercised:
  Exercised: continue
  Not-Exercised: --> Prohibition state = Not-Violated
  Not-Existing: --> Prohibition state = ERROR
>>> All remedy Duties
  None-Exist: --> Prohibition state = Violated
  Fulfilled: --> Prohibition state = Not-Violated
  Not-Fulfilled: --> Prohibition state = Violated
```

## Obligation
The evaluation of Duty instances with (optional)consequences - including Obligation - is split into two rounds:
1. Evaluate the Duty without considering consequences
2. If the first round returned state Not-Fulfilled evaluate the Duty again including consequences. Further the action of this Duty MUST be Exercised.

Taking the step from round 1 to round 2 is controlled outside the Evaluator!

```
Round 1:
>>> Single Duty instance (do NOT evaluate consequences) --> Obligation state = evaluated state

Round 2:
>>> Single Duty instance (evaluate consequences) --> Obligation state = evaluated state
```

# Sub-evaluations

Note: This document names an evaluation called by an evaluation a _sub-evaluation_.

### All constraint Constraints
```
Do constraint Constraints exist?
  YES: continue
  NO: --> Not-Existing
Iterate over all constraints
  >>> Single Constraint:
    Satisfied: continue
    Not-Satisfied: --> Not-Satisfied
--> Satisfied
```

### All refinement Constraints
```
Do refinement Constraints exist?
  YES: continue
  NO: --> Not-Existing
Iterate over all constraints
  >>> Single Constraint:
    Satisfied: continue
    Not-Satisfied: --> Not-Satisfied
--> Satisfied
```

### Single Constraint instance
```
Is the class of the referenced constraint a Constraint or a Logical Constraint?
  Constraint:
    Does a preset exist?
      YES: --> preset state
      NO: continue
    Is a function for evaluation available? (Note: this project does not provide constraint evaluation functions! - but it outlines where to add code for this purpose.)
      YES: execute it and --> evaluated state
      NO: --> ERROR)
  Logical Constraint:
    Parse for the operand
    Iterate over all referenced constraints (Note: a recursive call of this evaluation function)
      Save the evaluation state
    Apply the operand to the saved evaluation states --> evaluated state
```

### All duty Duties
Note: covers instances of Duty referenced by the duty property
```
Iterate over all duties
  >>> Single Duty instance (evaluate consequences)
  Is returned state == Not-Fulfilled?
    YES: --> Not-Fulfilled
    NO: save returned state, continue
--> Fulfilled (Note: as a Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### All remedy or consequence Duties
Note: covers instances of Duty referenced by the remedy or consequence property
```
Iterate over all remedies or consequences
  >>> Single Duty instance (do not evaluate consequences)
  Is returned state == Not-Fulfilled?
    YES: --> Not-Fulfilled
    NO: save returned state, continue
--> Fulfilled (Note: as a Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### Single Duty instance (evaluate consequences)
Note: this function includes the evaluation of consequence properties
```
>>> All constraint Constraints:
  Satisfied: continue
  Not-Satisfied: --> Not-Existing
>>> Action Exercised:
  Exercised: --> Fulfilled
  Not-Exercised: continue
  Not-Existing: --> ERROR
>>> All consequence Duties:
  Fulfilled: --> Fulfilled
  Not-Fulfilled: --> Not-Fulfilled
```

### Single Duty instance (do not evaluate consequences)
Note: this function does not include the evaluation of consequence properties
```
>>> All constraint Constraints:
  Satisfied: continue
  Not-Satisfied: --> Not-Existing
>>> Action Exercised:
  Exercised: --> Fulfilled
  Not-Exercised: --> Not-Fulfilled
  Not-Existing: --> Not-Fulfilled (Note: this rule is set by this evaluator, the ODRL IM does not define this state.)
```

### Action Exercised
```
>>> All refinement Constraints (of the action):
  Satisfied: continue
  Not-Satisfied: --> Not-Existing (Note: direct logic. This may cause a validation error as the action property is mandatory in all Rule classes.)
  OR
  Not-Satisfied: --> Not-Exercised (Note: assumption by implicit logic: Not-Satisfied sets the action to Not-Existing, a not existing action cannot be exercised.)
  {Programming note: currently these options of Not-Satisfied evaluation can be selected in the Javascript code - currently the second option is active}
Was action exercised:
  Does a preset exist?
    YES: --> preset state
    NO: continue
  Is a function for evaluation available? (Note: this project does not provide has-action-been-exercised evaluation functions! - but it outlines where to add code for this purpose.)
    YES: execute it and --> evaluated state
    NO: --> ERROR
```
