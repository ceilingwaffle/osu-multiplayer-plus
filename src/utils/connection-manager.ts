import { createConnection, Connection, getConnection } from "typeorm";
import { Log } from "./Log";

/**
 * The typeorm connection manager.
 *
 * @export
 * @class ConnectionManager
 */
export class ConnectionManager {
  private static instance: Connection = null;

  /**
   * Gets the typeorm Connection instance (initializes if not yet initialized).
   *
   * @static
   * @returns {Promise<Connection>} the typeorm Connection
   */
  static async getInstance(): Promise<Connection> {
    if (!ConnectionManager.instance) {
      Log.debug("Connecting to database...");
      ConnectionManager.instance = await ConnectionManager.createConnection();
      Log.debug("Connected to database.");
    }
    while (ConnectionManager.instance === null) {
      Log.debug("Retrying connection to database...");
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return getConnection();
  }

  /**
   * Closes the typeorm Connection.
   *
   * @static
   * @returns {Promise<boolean>} true if successfully closed
   */
  static async close(): Promise<boolean> {
    try {
      if (!ConnectionManager.instance) {
        throw Error("Cannot close connection. Connection is not open?");
      }
      Log.debug("Closing database connection...");
      await ConnectionManager.instance.close();
      ConnectionManager.instance = null;
      return true;
    } catch (error) {
      console.error("Error closing connection:", error);
      return false;
    }
  }

  /**
   * Gets the database name of the typeorm Connection.
   *
   * @static
   * @returns {Promise<string>} the database name
   */
  static async getDatabaseName(): Promise<string> {
    const conn = await ConnectionManager.getInstance();
    const dbName = conn.options.database;
    if (typeof dbName === "string") {
      return dbName;
    }
    return null;
  }

  private static async createConnection(): Promise<Connection> {
    if (process.env.NODE_ENV == "test") {
      return createConnection(require("../../test/config/typeorm/ormconfig.testing.sqlite.dbinmemory.json"));
    } else if (process.env.NODE_ENV == "development") {
      return createConnection(require("../../test/config/typeorm/ormconfig.testing.sqlite.dbinfile.json"));
    } else {
      return createConnection(require("../../config/typeorm/ormconfig.sqlite.json"));
    }
  }
}
