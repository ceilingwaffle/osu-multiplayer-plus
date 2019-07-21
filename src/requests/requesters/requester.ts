import { User } from "../../domain/user/user.entity";
import { RequesterInfo } from "../requester-info";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailureTypes } from "../../domain/user/user.failure";
import { RequesterType } from "../requester-type";

export abstract class Requester {
  public readonly requesterInfo: RequesterInfo;

  constructor(public readonly type: RequesterType) {
    this.requesterInfo = {
      type: type,
      authorId: null,
      originChannel: null
    };
  }

  public abstract async getOrCreateUser(): Promise<Either<Failure<UserFailureTypes>, User>>;
}
