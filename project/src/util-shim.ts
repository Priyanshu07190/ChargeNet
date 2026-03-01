/**
 * Browser polyfill for Node.js 'util' module
 * Required by @tensorflow-models/speech-commands
 */

export function promisify(fn: any) {
  return function (this: any, ...args: any[]) {
    return new Promise<any>((resolve, reject) => {
      fn.call(this, ...args, (err: any, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

export function callbackify(fn: any) {
  return function (this: any, ...args: any[]) {
    const cb = args.pop();
    fn.apply(this, args).then(
      (result: any) => cb(null, result),
      (err: any) => cb(err)
    );
  };
}

export function inherits(ctor: any, superCtor: any) {
  ctor.super_ = superCtor;
  Object.setPrototypeOf(ctor.prototype, superCtor.prototype);
}

export function inspect(obj: any) {
  return JSON.stringify(obj);
}

export function isString(arg: any) { return typeof arg === 'string'; }
export function isNumber(arg: any) { return typeof arg === 'number'; }
export function isBoolean(arg: any) { return typeof arg === 'boolean'; }
export function isUndefined(arg: any) { return arg === undefined; }
export function isObject(arg: any) { return typeof arg === 'object' && arg !== null; }
export function isFunction(arg: any) { return typeof arg === 'function'; }
export function isNull(arg: any) { return arg === null; }

export const TextDecoder = globalThis.TextDecoder;
export const TextEncoder = globalThis.TextEncoder;

export default {
  promisify,
  callbackify,
  inherits,
  inspect,
  isString,
  isNumber,
  isBoolean,
  isUndefined,
  isObject,
  isFunction,
  isNull,
  TextDecoder,
  TextEncoder,
};
