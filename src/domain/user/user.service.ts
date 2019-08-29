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

export class UserService {
  private readonly userRepository: UserRepository = getCustomRepository(UserRepository);
  private readonly discordUserRepository: DiscordUserRepository = getCustomRepository(DiscordUserRepository);

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
    try {
      const user = await this.userRepository.findOne(userData.id, { relations: ["discordUser", "webUser"] });
      if (!user) {
        const msg = `A user with ID '${user.id}' does not exist.`;
        Log.methodFailure(this.findOne, this.constructor.name, msg);
        return failurePromise(userLookupFailure(msg));
      }
      Log.methodSuccess(this.findOne, this.constructor.name);
      return successPromise(user);
    } catch (error) {
      Log.methodError(this.findOne, this.constructor.name, error);
      return failurePromise(userLookupError(error, `An error occurred when trying to find a user with ID '${userData.id}'.`));
    }
  }
}
