"use strict"

module.exports = convertCFGtoJS

function value(v) {
  if(v.type === "VariableId" || v.type === "Variable") {
    if(v.id === "~global") {
      return "this"
    } else if(v.id.charAt(0) === "~") {
      return "TMP_" + v.id.substr(1)
    } else {
      return "VAR_" + v.id
    }
  } else if(v.type === "Literal") {
    if(typeof v === "string") {
      return "'" + v.value.replace(/\\/g, "\\\\").replace(/\'/g, "\\'") + "'"
    } else {
      return v.value
    }
  }
}

function convertClosure(closure) {

  var code = ["function ", closure.name, "(", closure.arguments.join(), "){"]
  code.push("var ", closure.variables.map(value).join(), ";VAR_THIS=this;")

  for(var i=0; i<closure.closures; ++i) {
    var cl = closure.closures[i]
    code.push(cl.id, "=", convertClosure(cl.closure), ";")
  }

  for(var i=0; i<closure.blocks.length; ++i) {
    var b = closure.blocks[i]
    code.push("function BLOCK", i, "(){")
    for(var j=0; j<b.body.length; ++j) {
      var op = b.body[j]
      if(op.type === "UnaryOperator") {
        code.push(value(op.destination), "=", op.operator, value(op.argument), ";")
      } else if(op.type === "BinaryOperator") {
        code.push(value(op.destination), "=", value(op.left), op.operator, op.right, ";")
      } else {
        throw new Error("Invalid operator: " + op.type)
      }
    }
    switch(b.terminator.type) {
      case "JumpTerminator":
        code.push("return BLOCK", b.terminator.next, "();")
      break

      case "IfTerminator":
        code.push("if(", value(b.terminator.predicate), 
                  "){return BLOCK", b.terminator.consequent, 
                  "()}else{return BLOCK", b.terminator.alternate, "()};") 
      break

      case "NewTerminator":
        code.push("try{", value(b.terminator.result), "=new ", 
            value(b.terminator.constructor), "(", b.terminator.arguments.map(value).join(), ")",
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break

      case "SetTerminator":
        code.push("try{", value(b.terminator.result), "=", 
            value(b.terminator.object), "[", value(b.terminator.property), "]=", value(b.terminator.value),
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break

      case "GetTerminator":
        code.push("try{", value(b.terminator.result), "=", 
            value(b.terminator.object), "[", value(b.terminator.property), "]",
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break
      
      case "DeleteTerminator":
        code.push("try{", value(b.terminator.result), "=delete ", 
            value(b.terminator.object), "[", value(b.terminator.property), "]",
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break

      case "HasTerminator":
        code.push("try{", value(b.terminator.result), "=", 
            value(b.terminator.property), " in ", value(b.terminator.object),
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break

      case "CallTerminator":
        code.push("try{", value(b.terminator.result), "=", 
            value(b.terminator.callee), ".call(", value(b.terminator.object), b.terminator.arguments.map(value).join(), ")",
            ";return BLOCK", b.next, "();",
            "}catch(", value(b.exception), "){return BLOCK", b.catch, "()};")
      break

      case "ReturnTerminator":
        code.push("return ", value(b.terminator.result), ";")
      break

      case "ThrowTerminator":
        code.push("throw ", value(b.terminator.exception), ";")
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