export class UnhandledNodeEnvError extends Error {
  constructor() {
    super("Unhandled NODE_ENV");
  }
}
