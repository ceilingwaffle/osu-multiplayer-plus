import { exec } from "child_process";
import { BaseEntity, Connection } from "typeorm";
import * as fs from "fs-extra";
import assert = require("assert");
import { ConnectionManager } from "../src/utils/ConnectionManager";

export class TestHelpers {
  static async clearEntityTable(Entity: typeof BaseEntity, connection: Connection) {
    const entityTableName = connection.getMetadata(Entity).tableName;
    const tableExists = await connection.createQueryRunner().hasTable(entityTableName);
    if (tableExists) {
      console.log(`Clearing ${entityTableName} table...`);
      await connection.createQueryRunner().clearTable(entityTableName);
    }
  }

  static async deleteTestDatabase(dbName: string): Promise<boolean> {
    try {
      console.log("Deleting test database...");
      await fs.unlink(dbName);
      console.log(`Successfully deleted test database "${dbName}".`);
      return true;
    } catch (error) {
      console.error("Failed to delete test database.", error);
      return false;
    }
  }

  static async dropTestDatabase(connection: Connection): Promise<boolean> {
    try {
      await connection.dropDatabase();
      console.debug(`Successfully dropped test database.`);
      return true;
    } catch (error) {
      console.error("Error dropping test db:", error);
      return false;
    } finally {
      // await ConnectionManager.close();
    }
  }

  static async seedTestDatabase(): Promise<boolean> {
    try {
      const sh = await TestHelpers.sh(
        "ts-node ./node_modules/typeorm-seeding/dist/cli.js seed --config ./test/config/ormconfig.testing.json"
      );
      console.log(sh.stdout);
      console.debug("Done seeding test database.");
      return true;
    } catch (error) {
      console.error("Error seeding test db:", error);
      return false;
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
        const result = await conn
          .getRepository(entity.name)
          .createQueryBuilder(entity.name)
          .insert()
          .values(entity.values)
          .execute();
      }
      console.log("Loaded entities into test DB.");
    } catch (error) {
      throw new Error(`ERROR: Loading entities into test DB: ${error}`);
    }
  }

  static async cleanAll(entities: TestContextEntities[]) {
    try {
      // we reverse the order due to SQL foreign key constraints
      // slice used here to get elements in reverse order without modifying original array
      for (const entity of entities.slice().reverse()) {
        const repository = (await ConnectionManager.getInstance()).getRepository(entity.name);
        await repository.query(`DELETE FROM ${entity.tableName};`);
        // Reset IDs
        await repository.query(`DELETE FROM sqlite_sequence WHERE name='${entity.tableName}'`);
      }
      console.log("Erased entities from test DB.");
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
