import * as path from "path";

export class Helpers {
  static getNow() {
    return Math.floor(Date.now() / 1000);
  }

  static getCommandoDatabasePath(): string {
    return path.join(__dirname, "../database/commando-database.sqlite");
  }
}
