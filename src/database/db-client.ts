import * as path from "path";
require("dotenv").config({
  path: path.resolve(__dirname, "../.env"),
  debug: process.env.DEBUG
});
import { Connection, createConnection } from "typeorm";
import { injectable } from "inversify";
import { Log } from "../utils/Log";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

export interface IDbClient {
  connect(): Promise<Connection>;
  connectIfNotConnected(): Promise<Connection>;
  getConnection(): Connection;
  close(): Promise<boolean>;
  getDatabaseName(): Promise<string>;
}

@injectable()
export class DbClient implements IDbClient {
  private connection: Connection;

  constructor() {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async connect(): Promise<Connection> {
    try {
      // TODO: wrap in settimeout with some max db connection time allowed?
      Log.debug("Creating database connection...");
      if (process.env.NODE_ENV == "test") {
        this.connection = await createConnection(require("../../test/config/typeorm/ormconfig.testing.sqlite.dbinmemory.json"));
      } else if (process.env.NODE_ENV == "development") {
        // this.connection = await createConnection(require("../../test/config/typeorm/ormconfig.testing.sqlite.dbinfile.json"));
        const config: PostgresConnectionOptions = {
          type: "postgres",
          host: process.env.POSTGRES_HOSTNAME,
          port: Number(process.env.POSTGRES_PORT),
          username: process.env.POSTGRES_USERNAME,
          password: process.env.POSTGRES_PASSWORD,
          database: process.env.POSTGRES_DBNAME,
          synchronize: false, // npm run typeorm schema:sync
          logging: ["warn"],
          entities: ["src/domain/**/*.entity.ts"],
          subscribers: ["src/domain/**/*.subscriber.ts"],
          migrations: ["src/database/migrations/**/*.ts"],
          // seeds: ["src/database/seeds/**/*.ts"],
          cli: {
            entitiesDir: "src/domain/**",
            migrationsDir: "src/database/migrations",
            subscribersDir: "src/domain/**"
          }
        };

        this.connection = await createConnection(config);
      } else {
        this.connection = await createConnection(require("../../config/typeorm/ormconfig.sqlite.json"));
      }
      Log.debug("Created database connection.", {
        dbName: this.connection.name,
        dbLocation: this.connection.options.database,
        dbType: this.connection.options.type
      });
      return this.connection;
    } catch (error) {
      Log.methodError(error);
      throw error;
    }
  }

  async connectIfNotConnected(): Promise<Connection> {
    if (this.connection && this.connection.isConnected) {
      Log.debug("Reusing existing database connection.");
      return this.connection;
    }
    return await this.connect();
  }

  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Closes the typeorm Connection.
   *
   * @static
   * @returns {Promise<boolean>} true if successfully closed
   */
  async close(): Promise<boolean> {
    try {
      Log.debug("Closing database connection...");
      if (!this.connection) {
        throw Error("Cannot close database connection. Connection was never established?");
      }
      if (!this.connection.isConnected) {
        throw Error("Cannot close database connection. Connection is already closed.");
      }
      await this.connection.close();
      Log.debug("Closed database connection.");
      return true;
    } catch (error) {
      Log.error("Error closing database connection:", error);
      throw error;
    }
  }

  /**
   * Gets the database name of the typeorm Connection.
   *
   * @static
   * @returns {Promise<string>} the database name
   */
  async getDatabaseName(): Promise<string> {
    const dbName = this.connection.options.database;
    if (typeof dbName === "string") {
      return dbName;
    }
    return null;
  }
}
