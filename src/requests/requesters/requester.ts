import { User } from "../../domain/user/user.entity";
import { RequesterInfo } from "../requester-info";
import { RequesterType } from "../requester-type";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailureTypes } from "../../domain/user/user.failure";
import { RequestDto } from "../../domain/shared/dto/request.dto";

export abstract class Requester {
  public readonly requesterInfo: RequesterInfo;

  constructor(public readonly type: RequesterType) {
    // this.requesterInfo = {
    //   type: type,
    //   authorId: requestDto.authorId,
    //   originChannel: requestDto.originChannel
    // };
  }

  public abstract async getOrCreateUser(): Promise<Either<Failure<UserFailureTypes>, User>>;
}
