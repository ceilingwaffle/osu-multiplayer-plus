export class RequesterFactoryInitializationError extends Error {
  constructor(...args: string[]) {
    let message = "Error initializing the requester factory. This should never happen.";
    if (args) {
      message = message.concat(args.join(". "));
    }
    super(message);
  }
}
