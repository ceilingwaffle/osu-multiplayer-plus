import iocContainer from "../src/inversify.config";
import { IDbClient } from "../src/database/db-client";
import TYPES from "../src/types";
import { Log } from "../src/utils/Log";
import CreateUsersSeeder from "../src/database/seeds/create-users.seeder";

const runSeeders = async function() {
  try {
    const dbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
    const connection = await dbClient.connectIfNotConnected();

    // TODO: Get user confirmation to drop database before seeding
    // TODO: Drop database

    const usersSeeder: CreateUsersSeeder = new CreateUsersSeeder();
    await usersSeeder.run(connection);
  } catch (error) {
    throw error;
  }
};

setTimeout(async () => {
  try {
    Log.info("Seeding database...");
    await runSeeders();
    Log.info("Seeding completed successfully.");
  } catch (e) {
    Log.error(e);
    throw e;
  }
}, (2 ^ 32) - 1);
