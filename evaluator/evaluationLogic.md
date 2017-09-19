# The logic implemented by this evaluator

(This document is currently Under Construction)

Basics:
* the evalution of Rules, Logical/Constraints, Action exercised, Duty return one of these states, all terms are starting with an uppercase character and are used in the logic below:
  * affirmative reply (term depends on evaluated subject)
  * negative reply (term depends on evaluated subject)
  * Not-Existing 
  * Error
* `-->` indicates: an evaluation result is returned


## Permission
```
constraints: all Satisfied?
  None-Exist: continue
  YES: continue
  NO: --> Permission state = Not-Existing
action
  refinements: all Satisfied?
    None-Exist: continue
    YES: continue
    NO: --> Permission state = Not-Allowed
duties: all Fulfilled?
  None-Exist: --> Permission state = Allowed
  YES: --> Permission state = Allowed
  NO: --> Permission state = Not-Allowed

```

## Prohibition
```
constraints: all Satisfied?
  None-Exist: continue
  YES: continue
  NO: --> Prohibition state = Not-Existing
action
  refinements: all Satisfied?
    None-Exist: continue
    YES: continue
    NO: --> Prohibition state = Violated
  action: exercised?
    YES: continue
    NO: --> Prohibition state = Not-Violated
remedies: all Fulfilled?
  None-Exist: --> Prohibition state = Violated
  YES: --> Prohibition state = Not-Violated
  NO: --> Prohibition state = Violated

```

## Sub-evaluations

### All constraint Constraints
```
Do constraint Constraints exist?
  YES: continue
  NO: --> Not-Existing

```

### All refinement Constraints
```
xx
```

### Single Constraint
```
xx
```

### Single Logical Constraint
```
xx
```

### All duty or obligation Duties
```
xx
```

### All remedy or consequence Duties
```
xx
```

### Single Duty (evaluate consequences)
```
xx
```

### Single Duty (do not evaluate consequences)
```
xx
```
