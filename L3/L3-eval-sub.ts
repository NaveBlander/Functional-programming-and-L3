import { map } from "ramda";
import { isCExp, isLetExp, isAppExp, isBoolExp, isDefineExp, isIfExp, isLitExp, isNumExp, isPrimOp, isProcExp, isStrExp, isVarRef, Binding, VarRef, ClassExp, AppExp, ProcExp, Program, Exp, CExp, IfExp, LetExp, NumExp, BoolExp, StrExp, LitExp, PrimOp, VarDecl, isClassExp, isBinding, makeBoolExp, makeLitExp, makeNumExp, makeProcExp, parseL3Exp, makeProgram } from "./L3-ast"; // updated
import { applyEnv as applyEnvSub, makeEmptyEnv, makeEnv, Env } from "./L3-env-sub"; // updated
import { isClosure, makeClosure, Closure, Value, Class, makeClass, isClass, makeObject, Object, isObject, SExpValue, isSymbolSExp } from "./L3-value"; // updated
import { first, rest, isEmpty, List, isNonEmptyList } from '../shared/list';
import { isBoolean, isNumber, isString } from "../shared/type-predicates";
import { Result, makeOk, makeFailure, bind, mapResult, mapv } from "../shared/result";
import { renameExps, substitute } from "./substitute";
import { applyPrimitive } from "./evalPrimitive";
import { parse as p } from "../shared/parser";
import Sexp from "s-expression";
import { format } from "../shared/format";

// ========================================================
// Eval functions

export const evalL3program = (program: Program): Result<Value> =>
    evalSequence(program.exps, makeEmptyEnv());

export const evalParse = (s: string): Result<Value> =>
    bind(p(s), (x) =>
        bind(parseL3Exp(x), (exp) =>
            evalL3program(makeProgram([exp]))));

// Apply Environment
const applyEnv = (env: Env, v: string): Result<Value> => {
    return env.tag === "EmptyEnv" ? makeFailure(`var not found: ${v}`) :
           env.var === v ? makeOk(env.val) :
           applyEnv(env.nextEnv, v);
};


const L3applicativeEval = (exp: CExp, env: Env): Result<Value> => {
    console.log("Evaluating expression:", exp);
    if (isNumExp(exp)) {
        return makeOk(exp.val);
    } else if (isBoolExp(exp)) {
        return makeOk(exp.val);
    } else if (isStrExp(exp)) {
        return makeOk(exp.val);
    } else if (isPrimOp(exp)) {
        return makeOk(exp);
    } else if (isVarRef(exp)) {
        return applyEnv(env, exp.var);
    } else if (isLitExp(exp)) {
        return makeOk(exp.val);
    } else if (isIfExp(exp)) {
        return evalIf(exp, env);
    } else if (isProcExp(exp)) {
        return evalProc(exp);
    } else if (isClassExp(exp)) {
        return evalClass(exp);
    } else if (isAppExp(exp)) {
        console.log("Application expression:", exp);
        if (isVarRef(exp.rator)) {
            return evalObject(exp, env);
        } else {
            return bind(L3applicativeEval(exp.rator, env), (rator: Value) => {
                console.log("Rator evaluated to:", rator);
                return bind(mapResult(param => {
                    console.log("Evaluating param:", param);
                    return L3applicativeEval(param, env);
                }, exp.rands), (rands: Value[]) => {
                    console.log("Params evaluated to:", rands);
                    return L3applyProcedure(rator, rands);
                });
            });
        }
    } else if (isLetExp(exp)) {
        return makeFailure('"let" not supported (yet)');
    } else {
        console.log("Unhandled expression type:", exp);
        return makeFailure('Never');
    }
};




export const isTrueValue = (x: Value): boolean =>
    ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
    bind(L3applicativeEval(exp.test, env), (test: Value) => 
        isTrueValue(test) ? L3applicativeEval(exp.then, env) : 
        L3applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp): Result<Closure> =>
    makeOk(makeClosure(exp.args, exp.body));

const evalClass = (exp: ClassExp): Result<Class> =>
    makeOk(makeClass(exp.fields, exp.methods));

const evalObject = (exp: AppExp, env: Env): Result<Value> => {
    console.log("Evaluating object with expression:", exp);
    return bind(L3applicativeEval(exp.rator, env), (ratorVal: Value) => {
        console.log("Rator value in evalObject:", ratorVal);
        if (isObject(ratorVal)) {
            console.log("Rator is an object:", ratorVal);
            if (exp.rands.length >= 1 && isLitExp(exp.rands[0]) && isSymbolSExp(exp.rands[0].val)) {
                const methodName = exp.rands[0].val.val;
                console.log("Method name:", methodName);
                const method = ratorVal.class.methods.find(m => m.var.var === methodName);
                console.log("Found method:", method);
                if (method) {
                    const methodVal = method.val;
                    console.log("Method value:", methodVal);
                    if (isProcExp(methodVal)) {
                        const closure = methodVal;
                        const envWithFields = ratorVal.class.fields.reduce((accEnv, field, index) =>
                            makeEnv(field.var, ratorVal.values[index], accEnv), ratorVal.env);
                        const args = exp.rands.slice(1);
                        return bind(mapResult(arg => L3applicativeEval(arg, env), args), evaluatedArgs => {
                            const vars = map((v: VarDecl) => v.var, closure.args);
                            const body = renameExps(closure.body);
                            const litArgs: CExp[] = map(valueToLitExp, evaluatedArgs);
                            return evalSequence(substitute(body, vars, litArgs), envWithFields);
                        });
                    } else {
                        return makeFailure(`Method ${methodName} is not a function`);
                    }
                } else {
                    return makeFailure(`Unrecognized method: ${methodName}`);
                }
            } else {
                return makeFailure("Invalid method call");
            }
        } else if (isClass(ratorVal)) {
            console.log("Rator is a class:", ratorVal);
            const evaluatedArgs = mapResult(param => L3applicativeEval(param, env), exp.rands);
            return bind(evaluatedArgs, args => {
                const object = makeObject(ratorVal, args, env);
                return makeOk(object);
            });
        } else {
            return makeFailure(`Cannot apply non-function: ${JSON.stringify(ratorVal)}`);
        }
    });
};







const L3applyProcedure = (proc: Value, args: Value[]): Result<Value> => {
    console.log("Applying procedure:", proc);
    console.log("With arguments:", args);
    if (isClosure(proc)) {
        const vars = map((v: VarDecl) => v.var, proc.params);
        const body = renameExps(proc.body);
        const litArgs: CExp[] = map(valueToLitExp, args);
        return evalSequence(substitute(body, vars, litArgs), proc.env);
    } else if (isPrimOp(proc)) {
        return applyPrimitive(proc, args);
    } else {
        return makeFailure(`Unknown procedure: ${JSON.stringify(proc)}`);
    }
};

const valueToLitExp = (v: Value): NumExp | BoolExp | StrExp | LitExp | PrimOp | ProcExp =>
    isNumber(v) ? makeNumExp(v) :
    isBoolean(v) ? makeBoolExp(v) :
    isString(v) ? makeLitExp(v) : // Changed from makeStrExp to makeLitExp
    isPrimOp(v) ? v :
    isClosure(v) ? makeProcExp(v.params, v.body) :
    makeLitExp(v);

const applyClosure = (proc: Closure, args: Value[]): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    const body = renameExps(proc.body);
    const litArgs : CExp[] = map(valueToLitExp, args);
    return evalSequence(substitute(body, vars, litArgs), makeEmptyEnv());
};

const applyObject = (obj: Object, args: Value[]): Result<Value> => {
    if (isObject(obj)) {
        const fields = obj.class.fields;
        const methods = obj.class.methods;

        if (fields.length !== args.length) {
            return makeFailure("Number of arguments does not match number of fields");
        }

        const env = fields.reduce((accEnv, field, index) => makeEnv(field.var, args[index], accEnv), obj.env);
        const methodsEnv = methods.reduce((accEnv, method) => makeEnv(method.var.var, method.val as SExpValue, accEnv), env);

        return makeOk(makeObject(obj.class, args, methodsEnv));
    } else {
        return makeFailure("Value is not an object");
    }
};

export const evalSequence = (seq: List<Exp>, env: Env): Result<Value> =>
    isNonEmptyList<Exp>(seq) ? 
        isDefineExp(first(seq)) ? evalDefineExps(first(seq), rest(seq), env) :
        evalCExps(first(seq), rest(seq), env) :
    makeFailure("Empty sequence");

const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
    isCExp(first) && isEmpty(rest) ? L3applicativeEval(first, env) :
    isCExp(first) ? bind(L3applicativeEval(first, env), _ => 
                            evalSequence(rest, env)) :
    makeFailure("Never");

const evalDefineExps = (def: Exp, body: List<Exp>, env: Env): Result<Value> =>
    isDefineExp(def) ? bind(L3applicativeEval(def.val, env), (rhs: Value) =>
                             evalSequence(body, makeEnv(def.var.var, rhs, env))) :
    makeFailure("Unexpected " + def);
