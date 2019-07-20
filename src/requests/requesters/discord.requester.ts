import { inject } from "inversify";
import { UserService } from "../../domain/user/user.service";
import { RequesterType } from "../requester-type";
import { Requester } from "./requester";

export class DiscordRequester extends Requester {
  constructor(
    @inject(UserService)
    private readonly userService: UserService
  ) {
    super(RequesterType.DISCORD);
  }

  public getOrCreateUser(): Promise<any> {
    return this.userService.getOrCreateUserForBanchoUserId(this.requesterInfo.authorId);
  }
}
