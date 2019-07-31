import { TestHelpers } from "../test/test-helpers";

console.log(`Executing ${__dirname}/${__filename}...`);

(async function() {
  await TestHelpers.seedTestDatabase();
})();
