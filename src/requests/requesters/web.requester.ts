import { Requester } from "./requester";
import { RequestDto } from "../dto";
import { Log } from "../../utils/log";
import { UserService } from "../../domain/user/user.service";

export class WebRequester extends Requester {
  constructor(dto: RequestDto, userService: UserService) {
    super(dto, userService);
    Log.debug(`Initialized ${this.constructor.name}`);
  }
  public getOrCreateUser(): Promise<any> {
    return this.userService.getOrCreateUserForWebUserId(this.dto.authorId);
  }
}
