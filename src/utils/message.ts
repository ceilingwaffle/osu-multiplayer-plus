import "../bootstrap";

export class Message {
  /**
   * The locale file to use.
   *
   * @static
   */
  static en = require("../locales/en.json");

  private static sentenceCaseOn = false;

  /**
   * Enables "sentence case" output of all fetched messages.
   *
   * @static
   */
  static enableSentenceCaseOutput(): void {
    this.sentenceCaseOn = true;
  }

  /**
   * Disables "sentence case" output of all fetched messages.
   *
   * @static
   */
  static disableSentenceCaseOutput(): void {
    this.sentenceCaseOn = false;
  }

  /**
   * Gets a message from the locale.
   *
   * @static
   * @param {string} id The message id from the locale (e.g. "gameReadSuccess").
   * @returns {string} The message if message id exists.
   */
  static get(id: string): string {
    const message: string = this["en"][id] || "unknown";
    return Message.toSentenceCase(message.toString());
  }

  protected static toSentenceCase(message: string): string {
    return this.sentenceCaseOn ? message.toSentenceCase() : message;
  }
}

export class FailureMessage extends Message {
  /**
   * Gets a message from the locale with optional reasons appended.
   *
   * @static
   * @param {string} id The message id from the locale (e.g. "gameReadSuccess").
   * @param {...string[]} reasons Any additional strings to be appended to the message.
   * @returns {string} The message (with reasons appended) if message id exists.
   */
  static get(id: string, ...reasons: string[]): string {
    let message = Message.get(id);

    for (const reason of reasons) {
      message = message.concat(" ").concat(reason);
      message = Message.toSentenceCase(message);
    }

    return message;
  }
}
