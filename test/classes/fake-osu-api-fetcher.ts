import { IOsuApiFetcher } from "../../src/osu/interfaces/osu-api-fetcher";
import { ApiMultiplayer } from "../../src/osu/types/api-multiplayer";
import { OsuUserValidationResult } from "../../src/osu/types/osu-user-validation-result";
import { TestHelpers } from "../test-helpers";
import { injectable } from "inversify";
import { Log } from "../../src/utils/Log";
import { Helpers } from "../../src/utils/helpers";
import { ApiOsuUser } from "../../src/osu/types/api-osu-user";

@injectable()
export class FakeOsuApiFetcher implements IOsuApiFetcher {
  constructor() {
    Log.debug(`Initialized ${this.constructor.name}`);
  }

  fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer> {
    throw new Error("TODO: Implement method of FakeOsuApiFetcher.");
  }

  isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    TestHelpers.logFakeImplementationWarning(this.isValidBanchoMultiplayerId.name);
    return Promise.resolve(true);
  }

  isValidOsuUsername(username: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUsername.name);
    return Promise.resolve({
      isValid: true,
      osuUser: { username: username, userId: Helpers.stringToCharCodeNumbers(username), country: FakeOsuApiFetcher.getFakeCountryCode() }
    });
  }

  isValidOsuUserId(userId: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUserId.name);
    return Promise.resolve({
      isValid: true,
      osuUser: {
        username: `${FakeOsuApiFetcher.getFakeBanchoUsername(userId)}`,
        userId: Number(userId),
        country: FakeOsuApiFetcher.getFakeCountryCode()
      }
    });
  }

  getUserDataForUserId(userId: string): Promise<ApiOsuUser> {
    return Promise.resolve({
      userId: Number(userId),
      username: FakeOsuApiFetcher.getFakeBanchoUsername(userId),
      country: FakeOsuApiFetcher.getFakeCountryCode()
    });
  }

  static getFakeBanchoUsername(userId: string): string {
    return `fakeBanchoUsernameForBanchoUserId${userId}`;
  }

  static getFakeCountryCode(): string {
    return "AU";
  }
}
