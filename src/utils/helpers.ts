import * as path from "path";
import { ApiOsuUser } from "../osu/types/api-osu-user";

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

  static unique(fromArray: any[]): any[] {
    return [...new Set(fromArray)];
  }

  /**
   * https://stackoverflow.com/a/40283265
   *
   * @static
   * @param {any[]} arr
   * @returns {any[]}
   * @memberof Helpers
   */
  static deepClone(arr: any[]): any[] {
    return arr.map(a => ({ ...a }));
  }

  /**
   * [a,b,|,c,d,|,e,f] --> [[a,b],[c,d],[e,f]]
   *
   * @static
   * @param {((ApiOsuUser | String)[])} from
   * @returns {ApiOsuUser[][]}
   * @memberof Helpers
   */
  static extractApiOsuUserTeamsBetweenSeparators(from: (ApiOsuUser | String)[]): ApiOsuUser[][] {
    // TODO: unit test
    const separators: string[] = ["|"];
    const groups: ApiOsuUser[][] = [];
    var i = from.length;
    const copy = from.slice();
    copy.push(separators[0]); // somewhat hacky solution to just add a separator to the beginning to make this work
    const items = copy.reverse();
    while (i--) {
      const item = items[i];
      if ((typeof item === "string" && separators.includes(item)) || i === 0) {
        const team = items.splice(i + 1, items.length - 1 - i).reverse() as ApiOsuUser[];
        groups.push(team);
        items.splice(i, 1);
      }
    }
    return groups;
  }

  static stringToCharCodeNumbers(s: string): number {
    return parseInt([...s].map((c, i) => c.charCodeAt(0)).join(""));
  }
}
