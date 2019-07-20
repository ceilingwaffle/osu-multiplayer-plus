import { User } from "../../domain/user/user.entity";
import { RequesterInfo } from "../requester-info";
import { RequesterType } from "../requester-type";
import { UserFailure } from "../../domain/user/user.failure";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";

export abstract class Requester {
  protected readonly requesterInfo: RequesterInfo;

  constructor(public readonly type: RequesterType) {}

  public abstract async getOrCreateUser(): Promise<Either<Failure<UserFailure>, User>>;
}
