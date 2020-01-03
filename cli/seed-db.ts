import iocContainer from "../src/inversify.config";
import { IDbClient } from "../src/database/db-client";
import TYPES from "../src/types";
import { Log } from "../src/utils/log";
import CreateUsersSeeder from "../src/database/seeds/create-users.seeder";
import { Seeder } from "../src/database/seeder";

setTimeout(async () => {
  try {
    await runSeeders();
  } catch (e) {
    Log.error(e);
    throw e;
  }
}, (2 ^ 32) - 1);

const runSeeders = async function() {
  try {
    Log.info("Seeding database...");
    const dbClient = iocContainer.get<IDbClient>(TYPES.IDbClient);
    const connection = await dbClient.connectIfNotConnected();

    // TODO: Get user confirmation to drop database before seeding

    // initialize seeders
    const seeders: Seeder[] = [new CreateUsersSeeder()];

    // run seeders
    for (const seeder of seeders) {
      await seeder.run(connection);
    }
    Log.info("Seeding completed successfully.");
  } catch (error) {
    throw error;
  }
};
