import * as path from "path";

export class Helpers {
  static getNow() {
    return Math.floor(Date.now() / 1000);
  }

  static getCommandoDatabasePath(): string {
    // TODO: Use test database depending on env, similar to ConnectionManager.createConnection()
    return path.join(__dirname, "../database/commando-database.sqlite");
  }
}
