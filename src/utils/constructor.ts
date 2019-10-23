// source: https://dev.to/krumpet/generic-type-guard-in-typescript-258l
export type Constructor<T> = {
  new (...args: any[]): T;
};
