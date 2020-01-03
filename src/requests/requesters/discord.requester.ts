import { Requester } from "./requester";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { User } from "../../domain/user/user.entity";
import { DiscordUserFailure, UserFailure } from "../../domain/user/user.failure";
import { RequestDto } from "../dto";
import { Log } from "../../utils/log";
import { UserService } from "../../domain/user/user.service";

export class DiscordRequester extends Requester {
  constructor(dto: RequestDto, userService: UserService) {
    super(dto, userService);
    Log.debug(`Initialized ${this.constructor.name}`);
  }

  async getOrCreateUser(): Promise<Either<Failure<DiscordUserFailure | UserFailure>, User>> {
    if (!this.dto) throw new Error();
    return await this.userService.getOrCreateUserForDiscordUserId(this.dto.authorId);
  }
}
