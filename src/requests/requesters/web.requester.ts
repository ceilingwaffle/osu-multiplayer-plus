import { RequesterType } from "../requester-type";
import { inject } from "inversify";
import { UserService } from "../../domain/user/user.service";
import { Requester } from "./requester";

export class WebRequester extends Requester {
  constructor(
    @inject(UserService)
    private readonly userService: UserService
  ) {
    super(RequesterType.WEB);
  }
  public getOrCreateUser(): Promise<any> {
    return this.userService.getOrCreateUserForWebUserId(this.requesterInfo.authorId);
  }
}
