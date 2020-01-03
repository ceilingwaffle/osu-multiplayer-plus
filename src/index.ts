import "reflect-metadata";
import { Log } from "./utils/log";
import { bootstrap } from "./bootstrap";

Log.info("App starting...");

setTimeout(async () => {
  try {
    await bootstrap();
  } catch (e) {
    Log.error(e);
  }
}, (2 ^ 32) - 1);

export {};
