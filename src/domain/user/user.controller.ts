import { UpdateUserDto } from "./dto/update-user.dto";
import { RequestDto } from "../../requests/dto";
import { Response } from "../../requests/Response";
import { UpdateUserReport } from "./reports/update-user.report";
import { inject } from "inversify";
import { UserService } from "./user.service";
import { Requester } from "../../requests/requesters/requester";
import { RequesterFactory } from "../../requests/requester-factory";
import { RequesterFactoryInitializationError } from "../shared/errors/RequesterFactoryInitializationError";
import { Log } from "../../utils/Log";
import { FailureMessage, Message } from "../../utils/message";
import { UserResponseFactory } from "./user-response-factory";

export class UserController {
  constructor(@inject(UserService) private readonly userService: UserService) {}

  async update(userData: { userDto: UpdateUserDto; requestDto: RequestDto }): Promise<Response<UpdateUserReport>> {
    try {
      if (!userData.userDto.targetGameId) {
        // TODO: Finish update user method
        throw new Error(
          "At the present time, this method is only implemented to update the user's target game ID. Will do more in future."
        );
      }

      // build the requester
      const requester: Requester = RequesterFactory.initialize(userData.requestDto);
      if (!requester) throw new RequesterFactoryInitializationError(this.constructor.name, this.update.name);

      // get/create the user updating the user
      const updaterResult = await requester.getOrCreateUser();
      if (updaterResult.failed()) {
        if (updaterResult.value.error) throw updaterResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, updaterResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("userUpdateFailed"),
          errors: {
            messages: [updaterResult.value.reason],
            validation: updaterResult.value.validationErrors
          }
        };
      }

      // TODO: Write a proper full user-update procedure
      // for now, just update the user's target game
      const userUpdateResult = await this.userService.updateUserTargetGame({
        userId: updaterResult.value.id,
        gameId: userData.userDto.targetGameId
      });

      if (userUpdateResult.failed()) {
        if (userUpdateResult.value.error) throw userUpdateResult.value.error;
        Log.methodFailure(this.update, this.constructor.name, userUpdateResult.value.reason);
        return {
          success: false,
          message: FailureMessage.get("userUpdateFailed"),
          errors: {
            messages: [userUpdateResult.value.reason],
            validation: userUpdateResult.value.validationErrors
          }
        };
      }

      const updatedUser = userUpdateResult.value;
      Log.methodSuccess(this.update, this.constructor.name);
      return {
        success: true,
        message: Message.get("userUpdateSuccess"),
        result: ((): UpdateUserReport => {
          const responseFactory = new UserResponseFactory(requester, updatedUser, userData.requestDto);
          // TODO: Include before and after User proprety values (old value -> new value)
          return {
            userId: updatedUser.id,
            updatedBy: responseFactory.getUpdatedBy(),
            updatedAgo: responseFactory.getUpdatedAgoText()
          };
        })()
      };
    } catch (error) {
      Log.methodError(this.update, this.constructor.name, error);
      return {
        success: false,
        message: FailureMessage.get("userUpdateFailed"),
        errors: {
          messages: [error]
        }
      };
    }
  }
}
