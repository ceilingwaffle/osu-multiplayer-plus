import { exec } from "child_process";
import { BaseEntity, Connection } from "typeorm";
import * as fs from "fs-extra";
import { Log } from "../src/utils/Log";
import iocContainer from "../src/inversify.config";
import { IDbClient } from "../src/database/db-client";
import TYPES from "../src/types";
import { VirtualMatchCreator } from "../src/multiplayer/virtual-match/virtual-match-creator";
import { ApiMultiplayer } from "../src/osu/types/api-multiplayer";

export class TestHelpers {
  static getTimeOfApiResultsMapPlayed(args: { resultsContainingMap: ApiMultiplayer; lobbyPlayedMapOrderNumber: number }): number {
    const found = VirtualMatchCreator.getTimeOfApiMatch(
      // mapNumber is the order in which the map was played in a specific lobby (e.g. BM3#2 is the 6th map played in lobby 2, so the map number is 6).
      args.resultsContainingMap.matches.find(m => m.mapNumber === args.lobbyPlayedMapOrderNumber)
    );

    if (!found) throw new Error("Map does not exist in results");
    return found;
  }
  // static async reloadEntities(entitiesPromise: Promise<TestContextEntities[]>, conn: Connection): Promise<void> {
  //   await TestHelpers.dropTestDatabase(conn);
  //   const entities = await entitiesPromise;
  //   // await TestHelpers.cleanAll(entities);
  //   await TestHelpers.loadAll(entities);
  // }

  static async clearEntityTable(Entity: typeof BaseEntity, connection: Connection) {
    const entityTableName = connection.getMetadata(Entity).tableName;
    const tableExists = await connection.createQueryRunner().hasTable(entityTableName);
    if (tableExists) {
      Log.debug(`Clearing ${entityTableName} table...`);
      await connection.createQueryRunner().clearTable(entityTableName);
    }
  }

  static async deleteTestDatabase(dbName: string): Promise<boolean> {
    try {
      Log.debug("Deleting test database...");
      await fs.unlink(dbName);
      Log.debug(`Successfully deleted test database "${dbName}".`);
      return true;
    } catch (error) {
      Log.error("Failed to delete test database.", error);
      throw error;
    }
  }

  static async dropTestDatabase(conn: Connection): Promise<void> {
    try {
      await conn.dropDatabase();
      Log.info(`Successfully dropped test database (${conn.options.database}).`);
    } catch (error) {
      Log.error("Error dropping test database:", error);
      throw error;
    }
  }

  static async seedTestDatabase(): Promise<boolean> {
    try {
      const sh = await TestHelpers.sh(
        "ts-node ./node_modules/typeorm-seeding/dist/cli.js seed --config ./test/config/ormconfig.testing.json"
      );
      Log.debug(sh.stdout);
      Log.debug("Done seeding test database.");
      return true;
    } catch (error) {
      Log.error("Error seeding test db:", error);
      throw error;
    }
  }

  /**
   * Execute simple shell command (async wrapper).
   * @param {String} cmd
   * @return {Object} { stdout: String, stderr: String }
   */
  static sh(cmd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise(function(resolve, reject) {
      exec(cmd, (err, stdout, stderr) => {
        if (err) {
          return reject(err);
        } else {
          return resolve({ stdout, stderr });
        }
      });
    });
  }

  static async loadAll(entities: TestContextEntities[], conn: Connection) {
    try {
      for (const entity of entities) {
        if (!entity.values.length) continue;

        const result = await conn
          .getRepository(entity.name)
          .createQueryBuilder(entity.name)
          .insert()
          .values(entity.values)
          .execute();

        Log.debug("Loaded entities into test DB:", entity.name);
      }
    } catch (error) {
      throw new Error(`ERROR: Loading entities into test DB: ${error}`);
    }
  }

  static async cleanAll(entities: TestContextEntities[], conn: Connection) {
    try {
      // we reverse the order due to SQL foreign key constraints
      // slice used here to get elements in reverse order without modifying original array
      for (const entity of entities.slice().reverse()) {
        try {
          const qr = conn.createQueryRunner();
          await qr.query(`DELETE FROM ${entity.tableName};`);
          // Reset IDs
          await qr.query(`DELETE FROM sqlite_sequence WHERE name='${entity.tableName}'`);
          Log.debug("Erased table contents from test DB:", entity.tableName);
        } catch (error) {
          throw new Error(`Failed on entity ${entity.name}. Error: ${error}.`);
        }
      }
    } catch (error) {
      throw new Error(`ERROR: Cleaning test DB: ${error}`);
    }
  }

  static logFakeImplementationWarning(methodName: string): void {
    Log.warn(`FAKING RESPONSE FROM ${this.name}.${methodName}`);
  }

  static convertToTeamDtoArgFormatFrom2DArray(inTeams: string[][]): string[] {
    return [].concat(...inTeams.map(teamGroup => teamGroup.map(uid => uid).concat("|"))).slice(0, -1);
  }

  static convertToTeamDtoArgFormatFromObject(teamsObj: {
    T1: {
      P1: string;
      P2: string;
    };
    T2: {
      P3: string;
      P4: string;
    };
    T3: {
      P5: string;
      P6: string;
    };
    T4: {
      P7: string;
      P8: string;
    };
  }): string[] {
    // TODO: Make this method general enough to handle any format of team compositions
    return [
      teamsObj.T1.P1,
      teamsObj.T1.P2,
      "|",
      teamsObj.T2.P3,
      teamsObj.T2.P4,
      "|",
      teamsObj.T3.P5,
      teamsObj.T3.P6,
      "|",
      teamsObj.T4.P7,
      teamsObj.T4.P8
    ];
  }

  static async dropDatabaseAndReloadEntities(entities: TestContextEntities[], conn: Connection) {
    await TestHelpers.dropTestDatabase(conn);
    const dbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
    await dbClient.close();
    conn = await dbClient.connect();
    await TestHelpers.loadAll(entities, conn);
    return conn;
  }
}

export interface TestContextEntities {
  name: string;
  tableName: string;
  values: any[];
}
