# The logic implemented by this evaluator

### Basics:
* the evaluation of Rules, Logical/Constraints, Action exercised or Duties return if the Rule is ACTIVE (or NOT) and a state. All terms used as name of a state are starting with an uppercase character and are used in the logic below:
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
* in case of a successful closing of a function an affirmative state is returned.
* how the Not-Existing state of an evaluated sub-component is treated depends on the function.

# The Main Rules

## Permission
```
>>> All constraint (Logical) Constraints:
  None-Exist: continue
  Satisfied: continue
  Not-Satisfied: --> Permission state = NOT-ACTIVE & Not-Allowed
action
  >>> All refinement Constraints:
    None-Exist: continue
    Satisfied: continue
    Not-Satisfied: --> Permission state = NOT-ACTIVE & Not-Allowed
duties: all Fulfilled?
  None-Exist: --> Permission state = ACTIVE & Allowed
  YES: --> Permission state = ACTIVE & Allowed
  NO: --> Permission state = NOT-ACTIVE & Not-Allowed

```

## Prohibition
```
>>> All constraint (Logical) Constraints:
  None-Exist: continue
  Satisfied: continue
  Not-Satisfied: --> Prohibition state = NOT-ACTIVE & Not-Infringed
>>> Action Exercised:
  Exercised: continue
  Not-Exercised: --> Prohibition state = ACTIVE & Not-Infringed
  Not-Existing: --> Prohibition state = ERROR
>>> All remedy Duties
  None-Exist: --> Prohibition state = ACTIVE & Infringed
  Fulfilled: --> Prohibition state = ACTIVE & Not-Infringed
  Not-Fulfilled: --> Prohibition state = ACTIVE & Infringed
```

## Obligation
The evaluation of Duty instances with (optional)consequences - including Obligation - is split into two rounds:
1. Evaluate the Duty, ignory any consequences
2. If the first round returned state ACTIVE & Not-Fulfilled evaluate the Duty again including consequences. (T)he action of this Duty MUST be Exercised.)

Taking the step from round 1 to round 2 is controlled outside the Evaluator!

```
Round 1:
>>> Single Duty instance (ignore consequences) --> Obligation state = evaluated state

Round 2:
>>> Single Duty instance (evaluate also consequences) --> Obligation state = evaluated state
```

# Sub-evaluations

Note: This document names an evaluation which is called by an evaluation a _sub-evaluation_.

### All constraint Constraints
```
Do constraint (Logical) Constraints exist?
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
  >>> If a Constraint:
    Does a preset exist?
      YES: --> preset state
      NO: continue
    Is a function for evaluation available? (Note: this project does not provide constraint evaluation functions! - but it outlines where to add code for this purpose.)
      YES: execute it and --> evaluated state
      NO: --> ERROR)
  >>> If a Logical Constraint:
    Parse for the operand
    Iterate over all referenced constraints (Note: a recursive call of this evaluation function)
      Save the evaluation state
    Apply the operand to the saved evaluation states --> evaluated state
```

### All duty Duties
Note: covers instances of Duty referenced by the duty property
```
Iterate over all duties
  >>> Single Duty instance evaluation 
    >>> Single Duty instance (ignore consequences)
    Is it ACTIVE?
      YES: continue
      NO: continue iteration with next Duty instance
    Is returned state == Fulfilled?
      YES: ACTIVE & Fulfilled, continue iterating
      NO: does 1 or more consequences exist?
        NO: --> ACTIVE & Not-Fulfilled, break iterating
        YES: continue with iterating Single Duty instance (evaluate also consequences)
          Is returned state == Fulfilled?
            YES: ACTIVE & Fulfilled, continue with iteration
            NO: --> ACTIVE & Not-Fulfilled, break iterating
--> ACTIVE & Fulfilled (Note: as a NOT-ACTIVE/Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### All remedy or consequence Duties
Note: covers instances of Duty referenced by the remedy or consequence property
```
Iterate over all remedies or consequences
  >>> Single Duty instance (ignore consequences)
  Is it ACTIVE?
    YES: continue
    NO: continue iteration with next Duty instance
  Is returned state == Fulfilled?
    YES: continue with iterating
    NO: --> ACTIVE & Not-Fulfilled
--> ACTIVE & Fulfilled (Note: as a NOT-ACTIVE/Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### Single Duty instance ("round 1" = ignore consequences)
Note: this function does not include the evaluation of consequence properties
```
>>> All constraint Constraints:
  Satisfied: continue
  Not-Satisfied: --> NOT-ACTIVE/Not-Existing
>>> Duty Action Exercised:
  Exercised: --> ACTIVE & Fulfilled
  Not-Exercised: --> ACTIVE & Not-Fulfilled
  Not-Existing: --> ACTIVE & Not-Fulfilled (Note: this rule is set by this evaluator, the ODRL IM does not define this state.)
```

### Single Duty instance ("round 2" = evaluate also consequences)
Note: this function includes the evaluation of consequence properties
```
>>> All constraint Constraints:
  Satisfied: continue
  Not-Satisfied: --> NOT-ACTIVE/Not-Existing
>>> Duty Action Exercised:
  Exercised: --> Fulfilled, continue
  Not-Exercised: --> ACTIVE & Not-Fulfilled
  Not-Existing: --> ERROR
>>> All consequence Duties:
  Fulfilled: --> ACTIVE & Fulfilled
  Not-Fulfilled: --> ACTIVE & Not-Fulfilled
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
