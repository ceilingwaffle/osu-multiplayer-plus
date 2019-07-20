import { inject } from "inversify";
import { Repository } from "typeorm";
import { User } from "./user.entity";
import { Either } from "../../utils/Either";
import { Failure } from "../../utils/Failure";
import { UserFailure } from "./user.failure";

export class UserService {
  constructor(@inject(Repository) private readonly userRepository: Repository<User>) {
    console.debug("Initialized User Service.");
  }

  async getOrCreateUserForWebUserId(userId: string): Promise<Either<Failure<UserFailure>, User>> {
    throw new Error("Method not implemented: " + this.getOrCreateUserForWebUserId);
  }

  async getOrCreateUserForBanchoUserId(userId: string): Promise<Either<Failure<UserFailure>, User>> {
    throw new Error("Method not implemented: " + this.getOrCreateUserForBanchoUserId);
  }
}
