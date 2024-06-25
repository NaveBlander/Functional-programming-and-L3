// L3-eval.ts
// Evaluator with Environments model

import { apply, is, map } from "ramda";
import { isBoolExp, isCExp, isLitExp, isNumExp, isPrimOp, isStrExp, isVarRef, isAppExp, isDefineExp, isIfExp, isLetExp, isProcExp, Binding, VarDecl, CExp, Exp, IfExp, LetExp, ProcExp, Program, parseL3Exp, DefineExp, isClassExp, ClassExp} from "./L3-ast";
import { applyEnv, makeEmptyEnv, makeExtEnv, Env } from "./L3-env-env";
import { isClosure, makeClosureEnv, Closure, Value, Class, Object, makeClassEnv, makeObjectEnv, isClass, isObject, valueToString} from "./L3-value";
import { applyPrimitive } from "./evalPrimitive";
import { allT, first, rest, isEmpty, isNonEmptyList } from "../shared/list";
import { Result, makeOk, makeFailure, bind, mapResult } from "../shared/result";
import { parse as p } from "../shared/parser";
import { format } from "../shared/format";
import exp from "constants";

// ========================================================
// Eval functions

const L3applicativeEval = (exp: CExp, env: Env): Result<Value> =>
    isNumExp(exp) ? makeOk(exp.val) : 
    isBoolExp(exp) ? makeOk(exp.val) :
    isStrExp(exp) ? makeOk(exp.val) :
    isPrimOp(exp) ? makeOk(exp) :
    isVarRef(exp) ? applyEnv(env, exp.var) :
    isLitExp(exp) ? makeOk(exp.val) :
    isIfExp(exp) ? evalIf(exp, env) :
    isProcExp(exp) ? evalProc(exp, env) :
    isAppExp(exp) ? bind(L3applicativeEval(exp.rator, env), (rator: Value) =>
                        bind(mapResult(param => 
                            L3applicativeEval(param, env), 
                              exp.rands), 
                            (rands: Value[]) =>
                                L3applyProcedure(rator, rands, env))) :
    isLetExp(exp) ? makeFailure('"let" not supported (yet)') :
    makeFailure('Never');

export const isTrueValue = (x: Value): boolean =>
  ! (x === false);

const evalIf = (exp: IfExp, env: Env): Result<Value> =>
  bind(L3applicativeEval(exp.test, env), (test: Value) => 
          isTrueValue(test) ? L3applicativeEval(exp.then, env) : 
          L3applicativeEval(exp.alt, env));

const evalProc = (exp: ProcExp, env: Env): Result<Closure> =>
  makeOk(makeClosureEnv(exp.args, exp.body, env));

// KEY: This procedure does NOT have an env parameter.
//      Instead we use the env of the closure.
const L3applyProcedure = (proc: Value, args: Value[]): Result<Value> =>
  isPrimOp(proc) ? applyPrimitive(proc, args) :
  isClosure(proc) ? applyClosure(proc, args) :
  isClass(proc) ? applyClass(proc, args) :
  isObject(proc) ? applyObject(proc, args) :
  makeFailure(`Bad procedure ${format(proc)}`);

// Applications are computed by substituting computed
// values into the body of the closure.
// To make the types fit - computed values of params must be
// turned back in Literal Expressions that eval to the computed value.
const valueToLitExp = (v: Value): NumExp | BoolExp | StrExp | LitExp | PrimOp | ProcExp =>
    isNumber(v) ? makeNumExp(v) :
    isBoolean(v) ? makeBoolExp(v) :
    isString(v) ? makeStrExp(v) :
    isPrimOp(v) ? v :
    isClosure(v) ? makeProcExp(v.params, v.body) :
    makeLitExp(v);

const applyClosure = (proc: Closure, args: Value[], env: Env): Result<Value> => {
    const vars = map((v: VarDecl) => v.var, proc.params);
    return evalSequence(proc.body, makeExtEnv(vars, args, proc.env));
}

//--------------------------------------

const evalClass = (exp: ClassExp, env: Env): Result<Value> =>
  makeOk(makeClassEnv(exp.fields, exp.methods, env));

const applyClass = (proc: Class, args: Value[]): Result<Value> => {
  const vars = map((v: VarDecl) => v.var, proc.fields);
  return args.length === proc.fields.length? makeOk(makeObjectEnv(proc, args, makeExtEnv(vars, args, proc.env))) :
  makeFailure("Invalid number of fields given to the class");
};


const applyObject = (proc: Object, args: Value[]): Result<Value> =>
  // Check if arguments list is non-empty (because the first argument is the method name)
  !isNonEmptyList<Value>(args) ? makeFailure("Arguments are empty") :
  // Retrieve the method using the first argument as the method name
  bind(getMethod(proc, first(args)),
    method => 
      // Check if the method exists and is a valid procedure expression
      method === undefined || !isProcExp(method.val) ? makeFailure(`Unrecognized method: ${valueToString(first(args))}`) :
      // Check if the number of arguments matches the method's parameters
      method.val.args.length !== rest(args).length ? makeFailure("Invalid number of arguments to the function") :
      // Apply the method by creating a closure with the method's environment and applying it with the remaining arguments
      applyClosure(makeClosureEnv(method.val.args, method.val.body, proc.env), rest(args))
  );

const getMethod = (proc: Object, arg: Value): Result<Binding> => {
  // Find the method in the object's class by matching the method name
  const method = proc.ref.methods.find(b => b.var.var === valueToString(arg));
  // Return the method if found, otherwise return a failure
  return method !== undefined ? makeOk(method) : makeFailure(`Unrecognized method: ${valueToString(arg)}`);
};

//--------------------------------------

// Evaluate a sequence of expressions (in a program)
export const evalSequence = (seq: Exp[], env: Env): Result<Value> =>
  isNonEmptyList<Exp>(seq) ? evalCExps(first(seq), rest(seq), env) : 
  makeFailure("Empty sequence");

const evalCExps = (first: Exp, rest: Exp[], env: Env): Result<Value> =>
  isDefineExp(first) ? evalDefineExps(first, rest, env) :
  isCExp(first) && isEmpty(rest) ? L3applicativeEval(first, env) :
  isCExp(first) ? bind(L3applicativeEval(first, env), _ => evalSequence(rest, env)) :
  first;

// Eval a sequence of expressions when the first exp is a Define.
// Compute the rhs of the define, extend the env with the new binding
// then compute the rest of the exps in the new env.
const evalDefineExps = (def: DefineExp, exps: Exp[], env: Env): Result<Value> =>
  bind(L3applicativeEval(def.val, env), (rhs: Value) => 
          evalSequence(exps, makeExtEnv([def.var.var], [rhs], env)));

// Main program
export const evalL3program = (program: Program): Result<Value> =>
  evalSequence(program.exps, makeEmptyEnv());

export const evalParse = (s: string): Result<Value> =>
  bind(p(s), (x) => 
      bind(parseL3Exp(x), (exp: Exp) =>
          evalSequence([exp], makeEmptyEnv())));

// LET: Direct evaluation rule without syntax expansion
// compute the values, extend the env, eval the body.
const evalLet = (exp: LetExp, env: Env): Result<Value> => {
  const vals  = mapResult((v: CExp) => 
    L3applicativeEval(v, env), map((b: Binding) => b.val, exp.bindings));
  const vars = map((b: Binding) => b.var.var, exp.bindings);
  return bind(vals, (vals: Value[]) => 
      evalSequence(exp.body, makeExtEnv(vars, vals, env)));
}