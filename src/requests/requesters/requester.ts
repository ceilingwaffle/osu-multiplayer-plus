import { TYPES } from "../../types";
import getDecorators from "inversify-inject-decorators";
import iocContainer from "../../inversify.config";
const { lazyInject } = getDecorators(iocContainer);
import { UserService } from "../../domain/user/user.service";
import { User } from "../../domain/user/user.entity";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailureTypes } from "../../domain/user/user.failure";
import { RequestDto } from "../dto";

export abstract class Requester {
  // @lazyInject(TYPES.UserService) protected userService: UserService;

  constructor(public readonly dto: RequestDto, protected userService: UserService) {}

  /**
   * Gets or creates the user who made the request.
   *
   * @abstract
   * @returns {Promise<Either<Failure<UserFailureTypes>, User>>}
   */
  public abstract async getOrCreateUser(): Promise<Either<Failure<UserFailureTypes>, User>>;
}
