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

  static determineCountFailedScoresValue(countFailedScoresString: string) {
    if (countFailedScoresString === "true") {
      return true;
    } else if (countFailedScoresString === "false") {
      return false;
    } else {
      // this should force the validator to generate validation errors
      return null;
    }
  }

  static looksLikeAnOsuApiUserId(usernameOrId: string): boolean {
    return /^[0-9]+$/.test(usernameOrId);
  }

  static isAddTeamCommandSeparator(character: string): boolean {
    const separators = ["|"];
    return separators.includes(character);
  }

  static flatten2Dto1D<T>(array: T[][]): T[] {
    return Array<T>().concat(...array);
  }

  static alphaSort(a: string, b: string) {
    if (a.toLowerCase() < b.toLowerCase()) return -1;
    if (a.toLowerCase() > b.toLowerCase()) return 1;
    return 0;
  }
}
