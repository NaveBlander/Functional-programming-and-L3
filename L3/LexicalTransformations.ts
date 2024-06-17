import { ClassExp, ProcExp, Exp, Program, makeProcExp, CExp, Binding, VarDecl, makeIfExp, makeVarDecl, makeBoolExp, makeAppExp, makePrimOp, makeVarRef, makeLitExp, isExp, isDefineExp, isProgram, makeProgram, isCExp, makeDefineExp, isAtomicExp, isLitExp, isIfExp, isAppExp, isProcExp, isLetExp, makeLetExp, makeBinding, isClassExp } from "./L3-ast";
import { Result, makeFailure, makeOk } from "../shared/result";
import { makeCompoundSExp } from "./L3-value";
import { __, map } from "ramda";
import exp from "constants";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp => {
    return (makeProcExp(exp.fields, [makeProcExp([makeVarDecl("msg")], [makeProcBody(exp.methods, 0)])]));
}


const makeProcBody : (methods: Binding[], index: number) => CExp = (methods, index) => 
    index === methods.length ?
        makeBoolExp(false) :
        makeIfExp(makeAppExp(makePrimOp("eq?"), [makeVarRef("msg"), makeLitExp({tag: "SymbolSExp", val: methods[index].var.var})]),
                  makeAppExp(methods[index].val, []),
                  makeProcBody(methods, index+1));
    

// const makeBody = (msg: VarDecl): CExp => {
//     return makeProcExp(___, makeEmptyProc(msg));
// }

// const makeEmptyProc = (msg: VarDecl): CExp[] => {

// }

/*
Purpose: Transform all class forms in the given AST to procs
Signature: lexTransform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const lexTransform = (exp: Exp | Program): Result<Exp | Program> =>
    isExp(exp) ? makeOk(rewriteAllClassExp(exp)) :
    isProgram(exp) ? makeOk(makeProgram(map(rewriteAllClassExp, exp.exps))) :
    makeFailure(exp);


    const rewriteAllClassExp = (exp: Exp): Exp =>
        isCExp(exp) ? rewriteAllClassCExp(exp) :
        isDefineExp(exp) ? makeDefineExp(exp.var, rewriteAllClassCExp(exp.val)) :
        exp;

    const rewriteAllClassCExp = (exp: CExp): CExp =>
        isAtomicExp(exp) ? exp :
        isLitExp(exp) ? exp :
        isIfExp(exp) ? makeIfExp(rewriteAllClassCExp(exp.test),
                                 rewriteAllClassCExp(exp.then),
                                 rewriteAllClassCExp(exp.alt)) :
        isAppExp(exp) ? makeAppExp(rewriteAllClassCExp(exp.rator),
                                    map(rewriteAllClassCExp, exp.rands)) :
        isProcExp(exp) ? makeProcExp (exp.args, map (rewriteAllClassCExp, exp.body)) :
        isLetExp(exp) ? makeLetExp(map ((b: Binding) : Binding => makeBinding(b.var.var, rewriteAllClassCExp(b.val)), exp.bindings),
                                    map(rewriteAllClassCExp, exp.body)) :
        isClassExp(exp) ? class2proc(exp) :
        exp;
        
