"use strict"

module.exports = convertCFGtoJS

function value(v) {
  if(v.type === "VariableId" || v.type === "Variable") {
    if(v.id === "arguments") {
      return "arguments"
    } else if(v.id.charAt(0) === "~") {
      return "TMP_" + v.id.substr(1)
    } else {
      return "VAR_" + v.id
    }
  } else if(v.type === "Literal") {
    if(typeof v.value === "string") {
      return "'" + v.value.replace(/\\/g, "\\\\").replace(/\'/g, "\\'") + "'"
    } else if(typeof v.value === "undefined") {
      return "void 0"
    } else if(v.value === null) {
      return "null"
    } else {
      return v.value
    }
  }
}

function convertClosure(closure) {

  var code = ["function VAR_", closure.name, "(", closure.arguments.map(value).join(), "){"]
  code.push("var ", closure.variables.map(value).join(), ";VAR_this=this;")

  for(var i=0; i<closure.closures.length; ++i) {
    var cl = closure.closures[i]
    code.push(value(cl.id), "=", convertClosure(cl.closure), ";")
  }

  function term() {
    code.push("try{")
    code.push.apply(code, Array.prototype.slice.call(arguments))
    code.push("}catch(e){", value(b.terminator.exception), 
        "=e;return BLOCK", b.terminator.catch, 
        "()}return BLOCK", b.terminator.next, "()")
  }

  for(var i=0; i<closure.blocks.length; ++i) {
    var b = closure.blocks[i]
    code.push("function BLOCK", i, "(){")
    for(var j=0; j<b.body.length; ++j) {
      var op = b.body[j]
      if(op.type === "UnaryOperator") {
        code.push(value(op.result), "=", op.operator, value(op.argument), ";")
      } else if(op.type === "BinaryOperator") {
        code.push(value(op.result), "=", value(op.left), op.operator, value(op.right), ";")
      } else {
        throw new Error("Invalid operator: " + op.type)
      }
    }
    switch(b.terminator.type) {
      case "JumpTerminator":
        code.push("return BLOCK", b.terminator.next, "()")
      break

      case "IfTerminator":
        code.push("if(", value(b.terminator.predicate), 
                  "){return BLOCK", b.terminator.consequent, 
                  "()}return BLOCK", b.terminator.alternate, "()") 
      break

      case "NewTerminator":
        term(value(b.terminator.result), 
            "=new ", value(b.terminator.constructor), 
            "(", b.terminator.arguments.map(value).join(), ")")
      break

      case "SetTerminator":
        term(value(b.terminator.result), "=", 
            value(b.terminator.object), "[", value(b.terminator.property), "]=", 
            value(b.terminator.value))
      break

      case "GetTerminator":
        term(value(b.terminator.result), "=", 
            value(b.terminator.object), "[", value(b.terminator.property), "]")
      break
      
      case "DeleteTerminator":
        term(value(b.terminator.result), "=delete ", 
            value(b.terminator.object), "[", value(b.terminator.property), "]")
      break

      case "HasTerminator":
        term(value(b.terminator.result), "=", 
            value(b.terminator.property), " in ", value(b.terminator.object))
      break

      case "CallTerminator":
        term(value(b.terminator.result), "=", 
            value(b.terminator.callee), ".call(", 
              [b.terminator.object]
              .concat(b.terminator.arguments)
              .map(value)
              .join(), ")")
      break

      case "ReturnTerminator":
        code.push("return ", value(b.terminator.result))
      break

      case "ThrowTerminator":
        code.push("throw ", value(b.terminator.exception))
      break

      default:
        throw new Error("Unrecognized terminator")
    }
    code.push("};")
  }

  code.push("return BLOCK", closure.entry, "();}")

  return code.join("")
}

function convertCFGtoJS(root) {
  return ";(" + convertClosure(root) + ")();"
}