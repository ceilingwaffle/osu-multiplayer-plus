declare module "set-interval-async" {
  export class SetIntervalAsyncError extends Error {
    constructor(...args: any[]);
    static captureStackTrace(p0: any, p1: any): any;
    static stackTraceLimit: number;
  }

  export class SetIntervalAsyncTimer {
    stopped: boolean;
    id: number;
    timeouts: object;
    promises: object;
  }

  export function clearIntervalAsync(timer: SetIntervalAsyncTimer): Promise<any>;

  export namespace dynamic {
    function setIntervalAsync(handler: Function, interval: number, ...args: any): SetIntervalAsyncTimer;
  }

  export namespace fixed {
    function setIntervalAsync(handler: Function, interval: number, ...args: any): SetIntervalAsyncTimer;
  }

  export namespace legacy {
    function setIntervalAsync(handler: Function, interval: number, ...args: any): SetIntervalAsyncTimer;
  }
}
