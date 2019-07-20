import { inject } from "inversify";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { Either, failurePromise, successPromise } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { FindUserDto } from "./dto/find-user.dto";
import { Log } from "../../utils/Log";
import { DiscordUser } from "./discord-user.entity";
import { validate } from "class-validator";
import {
  DiscordUserFailure,
  UserFailure,
  invalidDiscordUserCreationArgumentsFailure,
  userLookupError,
  userLookupFailure
} from "./user.failure";

export class UserService {
  constructor(
    @inject(Repository) private readonly userRepository: Repository<User>,
    @inject(Repository) private readonly discordUserRepository: Repository<DiscordUser>
  ) {
    console.debug("Initialized User Service.");
  }

  async getOrCreateUserForDiscordUserId(discordUserId: string): Promise<Either<Failure<UserFailure | DiscordUserFailure>, User>> {
    // find existing discord user
    const discordUser = await this.discordUserRepository.findOne({ discordUserId: discordUserId });
    if (discordUser) {
      if (!discordUser.user) {
        const message = "Discord user has no User. This should never happen.";
        Log.methodError(this.getOrCreateUserForDiscordUserId, this, message);
        throw new Error(message);
      } else {
        // return the user of the discord user
        Log.methodSuccess(this.getOrCreateUserForDiscordUserId);
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
      Log.methodFailure(this.getOrCreateUserForDiscordUserId, this, "Discord user validation failed.");
      return failurePromise(invalidDiscordUserCreationArgumentsFailure(discordUserErrors));
    }

    // create the user
    const newUser = await this.userRepository.create({
      discordUser: newDiscordUser
    });

    // const userErrors = await validate(newUser);
    // if (userErrors.length > 0) {
    //   Log.methodFailure(this.getOrCreateUserForDiscordUserId, this, "User validation failed.");
    //   return failurePromise(invalidUserCreationArgumentsFailure());
    // }

    // save the user
    const savedUser = await this.userRepository.save(newUser);

    // return the saved user
    Log.methodSuccess(this.getOrCreateUserForDiscordUserId, this);
    return successPromise(savedUser);
  }

  async getOrCreateUserForWebUserId(userId: string): Promise<Either<Failure<UserFailure>, User>> {
    throw new Error("Method not implemented: " + this.getOrCreateUserForWebUserId);
  }

  async findOne(userData: FindUserDto): Promise<Either<Failure<UserFailure>, User>> {
    let user: User;
    try {
      user = await this.userRepository.findOne(userData.id);
    } catch (error) {
      Log.methodError(this.findOne, this, error);
      return failurePromise(userLookupError(error, `An error occurred finding a user with ID '${user.id}'.`));
    }

    if (!user) {
      const msg = `A user with ID '${user.id}' does not exist.`;
      Log.methodFailure(this.findOne, this, msg);
      return failurePromise(userLookupFailure(msg));
    }

    Log.methodSuccess(this.findOne, this);
    return successPromise(user);
  }
}
