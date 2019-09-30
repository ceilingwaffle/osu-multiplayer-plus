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

  async fetchMultiplayerResults(banchoMultiplayerId: string): Promise<ApiMultiplayer> {
    Log.warn("TODO: Implement method of FakeOsuApiFetcher.");
    return { multiplayerId: banchoMultiplayerId, matches: [] };
  }

  async isValidBanchoMultiplayerId(banchoMultiplayerId: string): Promise<boolean> {
    TestHelpers.logFakeImplementationWarning(this.isValidBanchoMultiplayerId.name);
    return Promise.resolve(true);
  }

  async isValidOsuUsername(username: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUsername.name);
    return Promise.resolve({
      isValid: true,
      osuUser: {
        username: username,
        userId: FakeOsuApiFetcher.getFakeBanchoUserId(username),
        country: FakeOsuApiFetcher.getFakeCountryCode()
      }
    });
  }

  async isValidOsuUserId(userId: string): Promise<OsuUserValidationResult> {
    TestHelpers.logFakeImplementationWarning(this.isValidOsuUserId.name);
    return Promise.resolve({
      isValid: true,
      osuUser: {
        userId: FakeOsuApiFetcher.getFakeBanchoUserId(userId),
        username: FakeOsuApiFetcher.getFakeBanchoUsername(userId),
        country: FakeOsuApiFetcher.getFakeCountryCode()
      }
    });
  }

  async getUserDataForUserId(userId: string): Promise<ApiOsuUser> {
    return Promise.resolve({
      userId: FakeOsuApiFetcher.getFakeBanchoUserId(userId),
      username: FakeOsuApiFetcher.getFakeBanchoUsername(userId),
      country: FakeOsuApiFetcher.getFakeCountryCode()
    });
  }

  static getFakeBanchoUserId(username: string | number): number {
    const n = Number(username);
    if (!isNaN(n)) return n;
    return parseInt(username.toString(), 36);
  }

  static getFakeBanchoUsername(userId: string): string {
    return `fakeBanchoUsernameForBanchoUserId${userId}`;
  }

  static getFakeCountryCode(): string {
    return "AU";
  }
}
