import { TestHelpers } from "../test/TestHelpers";

console.log("Executing ./cli/seed_test_db.ts");

(async function() {
  await TestHelpers.seedTestDatabase();
})();
