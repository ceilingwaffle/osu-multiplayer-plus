import { Repository, EntityRepository } from "typeorm";
import { User } from "./user.entity";
import { Game } from "../game/game.entity";

@EntityRepository(User)
export class UserRepository extends Repository<User> {
  updateUser({
    user,
    updateWith
  }: {
    user: User;
    updateWith: {
      targetGame?: Game;
    };
  }): Promise<User> {
    // TODO: Add more User props to be updated
    if (updateWith.targetGame) user.targetGame = updateWith.targetGame;
    return user.save();
  }
}
