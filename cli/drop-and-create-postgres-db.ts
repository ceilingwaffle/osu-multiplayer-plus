import { Connection, createConnection } from "typeorm";
import * as path from "path";
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  debug: process.env.DEBUG
});
import { default as postgresConfig } from "../src/config/typeorm/ormconfig.postgres";

setTimeout(async () => {
  try {
    console.log(`Dropping Postgres database '${process.env.POSTGRES_DBNAME}'...`);
    const connection: Connection = await createConnection(postgresConfig);
    const queryRunner = connection.createQueryRunner();
    await queryRunner.dropDatabase(process.env.POSTGRES_DBNAME);
    if (await queryRunner.hasDatabase(process.env.POSTGRES_DBNAME)) {
      throw new Error("Failed to drop database.");
    } else {
      console.log("Dropped database.");
    }
    await queryRunner.createDatabase(process.env.POSTGRES_DBNAME);
    if (!(await pgDatabaseExists({ connection, dbName: process.env.POSTGRES_DBNAME }))) {
      throw new Error("Failed to create database.");
    } else {
      console.log("Created database.");
    }
    await queryRunner.executeMemoryDownSql();
    await queryRunner.release();
    console.log("Done.");
    process.exit();
  } catch (error) {
    console.error(error);
  }
}, (2 ^ 32) - 1);

async function pgDatabaseExists({ connection, dbName }: { connection: Connection; dbName: string }): Promise<boolean> {
  try {
    const result: { exists: boolean }[] = await connection.query(
      `select exists(SELECT datname FROM pg_catalog.pg_database WHERE datname = '${dbName}');`
    );
    return result[0].exists;
  } catch (error) {
    console.log(error);
    throw error;
  }
}
