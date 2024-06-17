import { map} from "ramda";
import { ClassExp, ProcExp, Exp, Program, VarDecl, CExp, makeProcExp, makeIfExp, Binding, makeAppExp } from "./L3-ast";
import { Result, makeFailure } from "../shared/result";
import { first } from "../shared/list";

/*
Purpose: Transform ClassExp to ProcExp
Signature: class2proc(classExp)
Type: ClassExp => ProcExp
*/
export const class2proc = (exp: ClassExp): ProcExp => {
    const fields : VarDecl[] = exp.fields;
    const vals : CExp[] = map((b) => b.val, exp.methods);
    return makeProcExp (fields, makeBodyProc(exp.methods));
}

const makeBodyProc = (methods: Binding[]): CExp[] => {
    const vars : VarDecl[] = map((b) => b.var, methods);
    const vals : CExp[] = map((b) => b.val, methods);
    return makeProcExp(c, vals[0]);
}

const makeBodyApp = ()

// makeProcExp(var, makeIfExp(eq?var, val, ---))


/*
Purpose: Transform all class forms in the given AST to procs
Signature: lexTransform(AST)
Type: [Exp | Program] => Result<Exp | Program>
*/

export const lexTransform = (exp: Exp | Program): Result<Exp | Program> =>
    //@TODO
    makeFailure("ToDo");
