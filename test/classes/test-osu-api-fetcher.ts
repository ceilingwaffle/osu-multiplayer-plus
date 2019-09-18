import { IOsuApiFetcher } from "../../src/osu/interfaces/osu-api-fetcher";
import { ApiMultiplayer } from "../../src/osu/types/api-multiplayer";
import { OsuUserValidationResult } from "../../src/osu/types/osu-user-validation-result";
import { TestHelpers } from "../test-helpers";
import { injectable } from "inversify";
import { Log } from "../../src/utils/Log";
import { Helpers } from "../../src/utils/helpers";

@injectable()
export class FakeOsuApiFetcher implements IOsuApiFetcher {
  constructor() {
    Log.debug(`Initialized ${this.constructor.name}`);
  }

  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer> {
    throw new Error("TODO: Implement method of TestOsuApiFetcher.");
  }

  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    TestHelpers.logFakeImplementationWarning(this.isValidBanchoMultiplayerId.name);
    return Promise.resolve(true);
  }

  isValidOsuUsername(username: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUsername.name);
    return Promise.resolve({
      isValid: true,
      osuUser: { username: username, userId: Helpers.stringToCharCodeNumbers(username), country: 1 }
    });
  }

  isValidOsuUserId(userId: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUserId.name);
    return Promise.resolve({
      isValid: true,
      osuUser: { username: `fakeBanchoUsernameForBanchoUserId${userId} `, userId: Number(userId), country: 1 }
    });
  }
}
