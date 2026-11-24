import { convert } from 'js-text-chart';
import Scheduler from './scheduler';

function run(isLogo?: boolean, todo?: undefined): void;
function run<R>(isLogo: boolean | undefined, todo: (params: undefined) => R): R;
function run<P, R>(isLogo: boolean | undefined, todo: (params: P) => R, params: P): R;
function run<P, R>(isLogo = false, todo?: (params: P) => R, params?: P): R | void {
  // Earlier JavaScript releases also accepted 1, "1" and "true".
  if (isLogo === true || ['1', 'true'].includes(String(isLogo).toLowerCase())) {
    console.log(convert('scheduler', 'close'));
  }
  if (todo) return todo(params as P);
  return Scheduler.startAll();
}

export default { run };
