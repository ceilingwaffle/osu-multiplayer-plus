import { inject } from "inversify";
import { UserService } from "../../domain/user/user.service";
import { Requester } from "./requester";
import { RequestDto } from "../dto";

export class WebRequester extends Requester {
  constructor(dto: RequestDto, @inject(UserService) private readonly userService: UserService) {
    super(dto);
  }
  public getOrCreateUser(): Promise<any> {
    return this.userService.getOrCreateUserForWebUserId(this.dto.authorId);
  }
}
