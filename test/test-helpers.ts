import { exec } from "child_process";
import { BaseEntity, Connection } from "typeorm";
import * as fs from "fs-extra";
import { ConnectionManager } from "../src/utils/connection-manager";
import { Log } from "../src/utils/Log";

export class TestHelpers {
  static reloadEntities(entitiesPromise: Promise<TestContextEntities[]>): Promise<void> {
    const timeout: number = 5000;
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          // Setup DB
          await ConnectionManager.getInstance();
          const entities = await entitiesPromise;
          await TestHelpers.cleanAll(entities);
          await TestHelpers.loadAll(entities);
          resolve();
        } catch (error) {
          reject(error);
        }
      }, timeout);
    });
  }

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
      console.error("Failed to delete test database.", error);
      throw error;
    }
  }

  static async dropTestDatabase(connection: Connection): Promise<boolean> {
    try {
      await connection.dropDatabase();
      Log.debug(`Successfully dropped test database.`);
      return true;
    } catch (error) {
      console.error("Error dropping test db:", error);
      throw error;
    } finally {
      // await ConnectionManager.close();
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
          reject(err);
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  static async loadAll(entities: TestContextEntities[]) {
    try {
      const conn = await ConnectionManager.getInstance();
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

  static async cleanAll(entities: TestContextEntities[]) {
    try {
      // we reverse the order due to SQL foreign key constraints
      // slice used here to get elements in reverse order without modifying original array
      for (const entity of entities.slice().reverse()) {
        const qr = (await ConnectionManager.getInstance()).createQueryRunner();
        await qr.query(`DELETE FROM ${entity.tableName};`);
        // Reset IDs
        await qr.query(`DELETE FROM sqlite_sequence WHERE name='${entity.tableName}'`);
        Log.debug("Erased table from test DB:", entity.tableName);
      }
    } catch (error) {
      throw new Error(`ERROR: Cleaning test DB: ${error}`);
    }
  }
}

export interface TestContextEntities {
  name: string;
  tableName: string;
  values: any[];
}
