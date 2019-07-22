import { User } from "../../domain/user/user.entity";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailureTypes } from "../../domain/user/user.failure";
import { RequestDto } from "../dto";

export abstract class Requester {
  constructor(public readonly dto: RequestDto) {}

  /**
   * Gets or creates the user who made the request.
   *
   * @abstract
   * @returns {Promise<Either<Failure<UserFailureTypes>, User>>}
   */
  public abstract async getOrCreateUser(): Promise<Either<Failure<UserFailureTypes>, User>>;
}
