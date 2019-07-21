import { inject } from "inversify";
import { UserService } from "../../domain/user/user.service";
import { Requester } from "./requester";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { User } from "../../domain/user/user.entity";
import { DiscordUserFailure, UserFailure } from "../../domain/user/user.failure";
import { RequestDto } from "../dto";

export class DiscordRequester extends Requester {
  constructor(dto: RequestDto, @inject(UserService) private readonly userService: UserService) {
    super(dto);
  }

  async getOrCreateUser(): Promise<Either<Failure<DiscordUserFailure | UserFailure>, User>> {
    return await this.userService.getOrCreateUserForDiscordUserId(this.dto.authorId);
  }
}
