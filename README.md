control-flow-to-js
==================
Converts a control flow graph back into JS for debugging purposes.  At the moment this is not very efficient.

## Example

```javascript
var esprima = require("esprima")
var controlFlow = require("control-flow")
var toJS = require("control-flow-to-js")

//First parse an expression
var ast = esprima.parse("var x = 1; console.log(x)")

//Then generate control flow graph
var cfg = controlFlow(ast)

//Convert control flow graph back into JavaScript
var js = toJS(cfg)

//Eval code
eval(js)      //Prints out: 1
```

## `require("control-flow-to-js")(cfg)`
Converts a control flow graph back into a JS string

* `cfg` is a control flow graph as output by the `control-flow` module

## Credits
(c) 2014 Mikola Lysenko. MIT License