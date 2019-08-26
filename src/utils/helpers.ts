import * as path from "path";

export class Helpers {
  static getNow() {
    return Math.floor(Date.now() / 1000);
  }

  static getCommandoDatabasePath(): string {
    if (process.env.NODE_ENV == "test") {
      return path.join(__dirname, "../../test/database/commando-test-database.sqlite");
    } else if (process.env.NODE_ENV == "development") {
      return path.join(__dirname, "../../test/database/commando-test-database.sqlite");
    } else {
      return path.join(__dirname, "../database/commando-database.sqlite");
    }
  }
}
