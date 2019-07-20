import * as Log4js from "log4js";
import { Logger, getLogger } from "log4js";
import * as Path from "path";

export class Log {
  private static logger: Logger;

  static init() {
    Log4js.configure(Path.join(__dirname, "../../logconfig.json"));
    Log.logger = getLogger("default");
    Log.logger.level = "debug";
  }

  static info(info: string, ...args: any[]) {
    if (!Log.logger) Log.init();
    Log.logger.info(info, args);
  }

  static debug(debug: string, ...args: any[]) {
    if (!Log.logger) Log.init();
    Log.logger.debug(debug, args);
  }

  static warn(warn: string, ...args: any[]) {
    if (!Log.logger) Log.init();
    Log.logger.warn(warn, args);
  }

  static error(error: string, ...args: any[]) {
    if (!Log.logger) Log.init();
    Log.logger.error(error, args);
  }

  static methodSuccess(method: Function, ...args: any[]) {
    Log.info(method.name + " success.", args);
  }

  static methodFailure(method: Function, ...args: any[]) {
    Log.warn(method.name + " handled failure.", args);
  }

  static methodError(method: Function, ...args: any[]) {
    Log.error(`${method.name}` + " unhandled? error.", args);
  }
}
