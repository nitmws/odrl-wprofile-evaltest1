# The logic implemented by this evaluator

(This document is currently Under Construction)

Basics:
* the evaluation of Rules, Logical/Constraints, Action exercised, Duty return one of these states, all terms used as name of a state are starting with an uppercase character and are used in the logic below:
  * affirmative reply (term depends on evaluated subject)
  * negative reply (term depends on evaluated subject)
  * Not-Existing 
  * Error
* Term **preset**: this evaluator has a system to set values as a preset of an evaluation. The file /testdata/testconfig.yml holds these data. An evaluator may check this file and retrieve preset values, if available.
* `-->` indicates: a sub-evaluation is called
* `-->` indicates: an evaluation result is returned
* ERROR state: is implicitly bubbled up, getting this state returned is not included in this logic

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
```
>>> Single Duty instance (evaluate consequences) --> Obligation state = evaluated state
```

## Sub-evaluations

This document names an evaluation called by an evaluation a sub-evaluation.

### All constraint Constraints
```
Do constraint Constraints exist?
  YES: continue
  NO: --> Not-Existing
Iterate over all constraints
  Constraint satisfied?
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
  Constraint satisfied?
    >>> Single Constraint:
      Satisfied: continue
      Not-Satisfied: --> Not-Satisfied
--> Satisfied
```

### Single Constraint instance
```
Is the class of the referenced constraint a Constraint or a Logical Constraint
  Constraint:
    Does a preset exist?
      YES: --> preset state
      NO: continue
    Is a function for evaluation available?
      YES: execute it and --> evaluated state
      NO: --> ERROR
  Logical Constraint:
    Parse for the operand
    Iterate over all referenced constraints (Note: a recursive call of this evaluation function)
      Save the evaluation state
    Apply the operand to the saved evaluation states --> evaluated state
```

### All duty Duties
```
Iterate over all duties
  >>> Single Duty instance (evaluate consequences)
  Is returned state == Not-Fulfilled?
    YES: --> Not-Fulfilled
    NO: save returned state, continue
--> Fulfilled (Note: as a Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### All remedy or consequence Duties
```
Iterate over all remedies or consequences
  >>> Single Duty instance (do not evaluate consequences)
  Is returned state == Not-Fulfilled?
    YES: --> Not-Fulfilled
    NO: save returned state, continue
--> Fulfilled (Note: as a Not-Existing Duty does not spoil setting all Duties to Fulfilled this returned state is ignored.)
```

### Single Duty instance (evaluate consequences)
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
>>> All refinement Constraints:
  Satisfied: continue
  Not-Satisfied: --> Not-Existing (Note: this may cause a validation error as the action property is mandatory in some classes.)
Was action exercised:
  Does a preset exist?
    YES: --> preset state
    NO: continue
  Is a function for evaluation available?
    YES: execute it and --> evaluated state
    NO: --> ERROR
```