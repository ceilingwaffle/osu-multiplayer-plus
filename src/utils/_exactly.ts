// self-referential condition mapped type
// https://stackoverflow.com/a/53675287
/** Ensures that all the properties of type T are included on type U */
export type Exactly<T, U> = { [K in keyof U]: K extends keyof T ? T[K] : never };
