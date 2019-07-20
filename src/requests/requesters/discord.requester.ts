import { inject } from "inversify";
import { UserService } from "../../domain/user/user.service";
import { RequesterType } from "../requester-type";
import { Requester } from "./requester";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { User } from "../../domain/user/user.entity";
import { DiscordUserFailure, UserFailure } from "../../domain/user/user.failure";

export class DiscordRequester extends Requester {
  constructor(@inject(UserService) private readonly userService: UserService) {
    super(RequesterType.DISCORD);
  }

  async getOrCreateUser(): Promise<Either<Failure<DiscordUserFailure | UserFailure>, User>> {
    return await this.userService.getOrCreateUserForDiscordUserId(this.requesterInfo.authorId);
  }
}
