import * as path from "path";
import { ApiOsuUser } from "../osu/types/api-osu-user";
import * as fs from "fs-extra";
import cloneDeep = require("lodash/cloneDeep");
import { Log } from "../utils/Log";
import { UnhandledNodeEnvError } from "../errors/unhandled-node-env.error";

export class Helpers {
  static getNow() {
    return Math.floor(Date.now() / 1000);
  }

  static getOrCreateCommandoDatabasePath(): string {
    const dbPath = Helpers.getCommandoDatabasePath();
    Helpers.createEmptyCommandoDatabaseIfNotExists(dbPath);
    return dbPath;
  }

  static getCommandoDatabasePath(): string {
    if (process.env.NODE_ENV == "test") {
      return path.join(__dirname, "..", "..", "test", "database", "commando_test_db.sqlite");
    } else if (process.env.NODE_ENV == "development") {
      return path.join(__dirname, "..", "database", "commando_dev_db.sqlite");
    } else if (process.env.NODE_ENV == "production") {
      return path.join(__dirname, "..", "database", "commando_production_db.sqlite");
    } else {
      throw new UnhandledNodeEnvError();
    }
  }

  static createEmptyCommandoDatabaseIfNotExists(dbPath: string): void {
    try {
<<<<<<< HEAD
      // check if database file exists
      if (fs.existsSync(dbPath)) return;

      // create database file
=======
>>>>>>> 4bf97743557686ba15947b867e8c5fa2aa20e8e7
      const contents = "";
      fs.writeFile(dbPath, contents, { flag: "wx" }, function(err) {
        if (err) throw err;
        Log.debug(`Created new Discord Commando database`, { path: dbPath });
        return true;
      });
    } catch (error) {
      Log.methodError(Helpers.createEmptyCommandoDatabaseIfNotExists, error);
      throw error;
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

  static capitalize(s: string): string {
    if (typeof s !== "string") return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Returns a random integer between min (inclusive) and max (inclusive).
   * The value is no lower than min (or the next integer greater than min
   * if min isn't an integer) and no greater than max (or the next integer
   * lower than max if max isn't an integer).
   * Using Math.round() will give you a non-uniform distribution!
   *
   * Source: https://stackoverflow.com/a/1527820/11622198
   */
  static getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
