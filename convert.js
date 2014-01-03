"use strict"

module.exports = convertCFGtoJS

function lvalue(v) {
  if(v.type === "VariableId") {
    return v.name
  } else if(v.type === "Literal") {
    if(typeof v === "string") {
      return "'" + v.value.replace(/\\/g, "\\\\").replace(/\'/g, "\\'") + "'"
    } else {
      return v.value
    }
  }
}

function convertCFGtoJS(closure) {
  var code = ["function ", closure.name, "(", closure.arguments.join(), "){"]
  code.push("var ", closure.variables.map(function(v) {
    if(v.charAt(0) === "~") {
      return "TEMPORARY_" + v.substr(1)
    }
    return v
  }).join(), ";")

  for(var i=0; i<closure.closures; ++i) {
    var cl = closure.closures[i]
    code.push(cl.id, "=", convertCFGtoJS(cl.closure), ";")
  }

  for(var i=0; i<closure.blocks.length; ++i) {
    var b = closure.blocks[i]
    code.push("function BLOCK", i, "(){")
    for(var j=0; j<b.body.length; ++i) {
      var op = b.body[j]
      if(op.type === "UnaryOperator") {
        code.push(op.destination.name, "=", op.operator, lvalue(b.argument), ";")
      } else if(op.type === "BinaryOperator") {
        code.push(op.destination.name, "=", lvalue(op.left), op.operator, op.right, ";")
      } else {
        throw new Error("Invalid operator: " + op.type)
      }
    }
    switch(b.terminator.type) {
      case "JumpTerminator":
        code.push("BLOCK", b.terminator.next, "();")
      break

      case "IfTerminator":
        code.push("if(", lvalue(b.terminator.predicate), 
                  "){BLOCK", b.terminator.consequent, 
                  "()}else{BLOCK", b.terminator.alternate, "()};") 
      break

      case "NewTerminator":
        code.push("try{", b.terminator.result, "=new ", 
            b.terminator.constructor, "(", b.terminator.arguments.map(lvalue).join(), ")",
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break

      case "SetTerminator":
        code.push("try{", b.terminator.result, "=", 
            b.terminator.object, "[", lvalue(b.terminator.property), "]=", lvalue(b.terminator.value),
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break

      case "GetTerminator":
        code.push("try{", b.terminator.result, "=", 
            b.terminator.object, "[", lvalue(b.terminator.property), "]",
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break
      
      case "DeleteTerminator":
        code.push("try{", b.terminator.result, "=delete ", 
            b.terminator.object, "[", lvalue(b.terminator.property), "]",
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break

      case "HasTerminator":
        code.push("try{", b.terminator.result, "=", 
            lvalue(b.terminator.property), " in ", b.terminator.object,
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break

      case "CallTerminator":
        code.push("try{", b.terminator.result, "=", 
            b.terminator.callee, ".call(", b.terminator.object, b.terminator.arguments.map(lvalue).join(), ")",
            ";return BLOCK", b.next, "();",
            "}catch(", b.exception, "){return BLOCK", b.catch "()};")
      break

      case "ReturnTerminator":
        code.push("return ", b.terminator.result, ";")
      break

      case "ThrowTerminator":
        code.push("throw ", b.terminator.exception, ";")
      break

      default:
        throw new Error("Unrecognized terminator")
    }
  }

  code.push("return BLOCKS", closure.entry, "();}")

  return code.join("")
}