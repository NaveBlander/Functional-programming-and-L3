// ========================================================
// Environment data type for L3
import { Value } from './L3-value';
import { Result, makeFailure, makeOk } from '../shared/result';

export type Env = EmptyEnv | NonEmptyEnv;
export type EmptyEnv = { tag: "EmptyEnv" }
export type NonEmptyEnv = {
    tag: "Env";
    var: string;
    val: Value;
    nextEnv: Env;
}
export const makeEmptyEnv = (): EmptyEnv => ({ tag: "EmptyEnv" });
export const makeEnv = (v: string, val: Value, env: Env): NonEmptyEnv =>
    ({ tag: "Env", var: v, val: val, nextEnv: env });
export const isEmptyEnv = (x: any): x is EmptyEnv => x.tag === "EmptyEnv";
export const isNonEmptyEnv = (x: any): x is NonEmptyEnv => x.tag === "Env";
export const isEnv = (x: any): x is Env => isEmptyEnv(x) || isNonEmptyEnv(x);

// Enhanced applyEnv with detailed logging for debugging
export const applyEnv = (env: Env, v: string): Result<Value> => {
    // console.log(`applyEnv called with var: ${v}`);
    // console.log(`applyEnv on environment: ${JSON.stringify(env, null, 2)}`);

    if (isEmptyEnv(env)) {
        return makeFailure(`Variable not found: ${v}`);
    } else if (env.var === v) {
        return makeOk(env.val);
    } else {
        return applyEnv(env.nextEnv, v);
    }
};
