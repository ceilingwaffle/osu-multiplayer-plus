import { User } from "./user.entity";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { FindUserDto } from "./dto/find-user.dto";
import { Log } from "../../utils/Log";
import { validate } from "class-validator";
import {
  DiscordUserFailure,
  UserFailure,
  invalidDiscordUserCreationArgumentsFailure,
  userLookupError,
  userLookupFailure
} from "./user.failure";
import { UserRepository } from "./user.repository";
import { DiscordUserRepository } from "./discord-user.repository";
import { getCustomRepository } from "typeorm";
import { GameFailure, gameDoesNotExistFailure } from "../game/game.failure";
import { injectable } from "inversify";
import { GameRepository } from "../game/game.repository";
import { userUpdateFailure } from "./user.failure";
import { IOsuApiFetcher } from "../../osu/interfaces/osu-api-fetcher";
import { NodesuApiFetcher } from "../../osu/nodesu-api-fetcher";
import { Helpers } from "../../utils/helpers";
import { OsuUserValidationResult } from "../../osu/types/osu-user-validation-result";
import { ApiOsuUser } from "../../osu/types/api-osu-user";
import { OsuUser } from "./osu-user.entity";
import { OsuUserRepository } from "./osu-user.repository";
import union = require("lodash/union");

@injectable()
export class UserService {
  private readonly userRepository: UserRepository = getCustomRepository(UserRepository);
  private readonly osuUserRepository: OsuUserRepository = getCustomRepository(OsuUserRepository);
  private readonly discordUserRepository: DiscordUserRepository = getCustomRepository(DiscordUserRepository);
  private readonly gameRepository: GameRepository = getCustomRepository(GameRepository);
  private readonly osuApi: IOsuApiFetcher = NodesuApiFetcher.getInstance();

  constructor() {
    Log.info(`Initialized ${this.constructor.name}.`);
  }

  async getOrCreateUserForDiscordUserId(discordUserId: string): Promise<Either<Failure<UserFailure | DiscordUserFailure>, User>> {
    // find existing discord user
    const discordUser = await this.discordUserRepository.findOne(
      { discordUserId: discordUserId },
      { relations: ["user", "user.discordUser"] }
    );
    if (discordUser) {
      if (!discordUser.user) {
        const message = "Discord user has no User. This should never happen.";
        Log.methodError(this.getOrCreateUserForDiscordUserId, this.constructor.name, message);
        throw new Error(message);
      } else {
        // return the user of the discord user
        Log.methodSuccess(this.getOrCreateUserForDiscordUserId, this.constructor.name);
        return successPromise(discordUser.user);
      }
    }

    // create the discord user
    const newDiscordUser = await this.discordUserRepository.create({
      discordUserId: discordUserId
    });

    // validate the discord user
    const discordUserErrors = await validate(newDiscordUser);
    if (discordUserErrors.length > 0) {
      Log.methodFailure(this.getOrCreateUserForDiscordUserId, this.constructor.name, "Discord user validation failed.");
      return failurePromise(invalidDiscordUserCreationArgumentsFailure(discordUserErrors));
    }

    // create the user
    const newUser = await this.userRepository.create({
      discordUser: newDiscordUser
    });

    // save the user (should cascade save the discord user)
    const savedUser = await this.userRepository.save(newUser);

    // return the saved user
    Log.methodSuccess(this.getOrCreateUserForDiscordUserId, this.constructor.name);
    return successPromise(savedUser);
  }

  async getOrCreateUserForWebUserId(userId: string): Promise<Either<Failure<UserFailure>, User>> {
    throw new Error("Method not implemented: " + this.getOrCreateUserForWebUserId);
  }

  async findOne(userData: FindUserDto): Promise<Either<Failure<UserFailure>, User>> {
    // TODO: Refactor - change whatever uses this method to use UserService.findUserById() instead
    try {
      const user = await this.userRepository.findOne(userData.id, { relations: ["discordUser", "webUser"] });
      if (!user) {
        const failure = userLookupFailure(userData.id);
        Log.methodFailure(this.findOne, this.constructor.name, failure.reason);
        return failurePromise(failure);
      }
      Log.methodSuccess(this.findOne, this.constructor.name);
      return successPromise(user);
    } catch (error) {
      Log.methodError(this.findOne, this.constructor.name, error);
      return failurePromise(userLookupError(error, `An error occurred when trying to find a user with ID '${userData.id}'.`));
    }
  }

  async findUserById({
    userId,
    returnWithRelations = ["discordUser", "webUser"]
  }: {
    userId: number;
    returnWithRelations: string[];
  }): Promise<Either<Failure<UserFailure>, User>> {
    try {
      // find the user
      const user = await this.userRepository.findOne({ id: userId }, { relations: returnWithRelations });
      if (!user) {
        Log.methodFailure(this.findUserById, this.constructor.name, `User ID ${userId} does not exist.`);
        return failurePromise(userLookupFailure(userId));
      }
      return successPromise(user);
    } catch (error) {
      Log.methodError(this.findUserById, this.constructor.name, error);
      throw error;
    }
  }

  async updateUserTargetGame({
    userId,
    gameId
  }: {
    userId: number;
    gameId: number;
  }): Promise<Either<Failure<UserFailure | GameFailure>, User>> {
    try {
      // no permissions check needed because the userId should always be the same as the user making the request (e.g. The Discord user using the !targetgame command)
      const user = await this.userRepository.findOne({ id: userId });
      if (!user) return failurePromise(userLookupFailure(userId));
      const game = await this.gameRepository.findOne({ id: gameId });
      if (!game) return failurePromise(gameDoesNotExistFailure(gameId));
      const updatedUser = await this.userRepository.updateUser({ user: user, updateWith: { targetGame: game } });
      if (!updatedUser) return failurePromise(userUpdateFailure({ userId }));
      return successPromise(updatedUser);
    } catch (error) {
      Log.methodError(this.updateUserTargetGame, this.constructor.name, error);
      throw error;
    }
  }

  /**
   * Returns true if the given value is a valid osu user ID or username, determined by the osu API.
   *
   * @param {string} usernameOrId
   * @returns {Promise<boolean>}
   */
  async isValidBanchoOsuUserIdOrUsername(usernameOrId: string): Promise<OsuUserValidationResult> {
    try {
      if (!usernameOrId.length) {
        return { isValid: false };
      } else if (Helpers.looksLikeAnOsuApiUserId(usernameOrId)) {
        return await this.osuApi.isValidOsuUserId(usernameOrId);
      } else {
        return await this.osuApi.isValidOsuUsername(usernameOrId);
      }
    } catch (error) {
      Log.methodError(this.isValidBanchoOsuUserIdOrUsername, this.constructor.name, error);
      throw error;
    }
  }

  async getOrCreateAndSaveOsuUsersFromApiResults(
    teamsOfApiOsuUsers: ApiOsuUser[][],
    returnWithRelations: string[] = [
      "user",
      "user.discordUser",
      "user.webUser",
      "teamOsuUsers",
      "teamOsuUsers.team",
      "teamOsuUsers.team.gameTeams",
      "teamOsuUsers.team.gameTeams.addedBy"
    ]
  ): Promise<OsuUser[]> {
    try {
      //    get the existing osu users (Q1)
      const apiOsuUsers: ApiOsuUser[] = Array<ApiOsuUser>().concat(...teamsOfApiOsuUsers); // flattens the 2D array
      const banchoUserIds: number[] = apiOsuUsers.map(u => u.userId);
      const existingOsuUsers: OsuUser[] = await this.osuUserRepository.findByBanchoUserIds(banchoUserIds);
      //    create the osu users that don't exist
      const newUnsavedOsuUsers: OsuUser[] = this.createOsuUsersNotInList({ createThese: apiOsuUsers, notInThese: existingOsuUsers });
      //    save the created osu users (Q2)
      const savedOsuUsers: OsuUser[] = await this.osuUserRepository.save(newUnsavedOsuUsers);
      //    select all from db (Q3)
      const allOsuUserIds = union(existingOsuUsers.map(u => u.id), savedOsuUsers.map(u => u.id));
      const reloadedOsuUsers: OsuUser[] = await this.osuUserRepository.findByIds(allOsuUserIds, {
        relations: returnWithRelations
      });
      Log.methodSuccess(this.getOrCreateAndSaveOsuUsersFromApiResults, this.constructor.name);
      return reloadedOsuUsers;
    } catch (error) {
      Log.methodError(this.getOrCreateAndSaveOsuUsersFromApiResults, this.constructor.name, error);
      throw error;
    }
  }

  private createOsuUsersNotInList({ createThese, notInThese }: { createThese: ApiOsuUser[]; notInThese: OsuUser[] }): OsuUser[] {
    const toBeCreated: ApiOsuUser[] = createThese.filter(
      apiOsuUser => !notInThese.find(osuUser => osuUser.osuUserId === apiOsuUser.userId.toString())
    );
    const createdOsuUsers: OsuUser[] = toBeCreated.map(apiOsuUser =>
      this.createOsuUser({ username: apiOsuUser.username, userId: apiOsuUser.userId, countryCode: apiOsuUser.country })
    );
    const withNewUsersAdded: OsuUser[] = createdOsuUsers.map(osuUser => {
      osuUser.user = this.createUser({});
      return osuUser;
    });
    return withNewUsersAdded;
  }

  private createOsuUser(props: { username: string; userId: number; countryCode: number }): OsuUser {
    const osuUser = new OsuUser();
    osuUser.osuUserId = props.userId.toString();
    osuUser.osuUsername = props.username;
    osuUser.countryCode = props.countryCode.toString();
    return osuUser;
  }

  private createUser(props: {}): User {
    const user = new User();
    return user;
  }
}
