import { TYPES } from "../../types";
import getDecorators from "inversify-inject-decorators";
import iocContainer from "../../inversify.config";
const { lazyInject } = getDecorators(iocContainer);
import { GameService } from "../game/game.service";
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
import { GameFailure } from "../game/game.failure";

export class UserService {
  private readonly userRepository: UserRepository = getCustomRepository(UserRepository);
  private readonly discordUserRepository: DiscordUserRepository = getCustomRepository(DiscordUserRepository);
  @lazyInject(TYPES.GameService) private gameService: GameService;

  constructor() {
    Log.info("Initialized User Service.");
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
      if (!user) {
        return failurePromise(userLookupFailure(userId));
      }

      const gameFindResult = await this.gameService.findGameById(gameId);
      if (gameFindResult.failed()) {
        return failurePromise(gameFindResult.value);
      }
      const game = gameFindResult.value;

      const updatedUser = await this.userRepository.updateUser({ user: user, updateWith: { targetGame: game } });
      return successPromise(updatedUser);
    } catch (error) {
      Log.methodError(this.updateUserTargetGame, this.constructor.name, error);
      throw error;
    }
  }
}
