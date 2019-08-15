import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments
} from "class-validator";
import { NodesuApiFetcher } from "../nodesu-api-fetcher";
import { IOsuApiFetcher } from "../interfaces/osu-api-fetcher";

@ValidatorConstraint({ async: true })
export class IsValidBanchoMultiplayerIdConstraint implements ValidatorConstraintInterface {
  protected osuApi: IOsuApiFetcher = NodesuApiFetcher.getInstance();

  validate(banchoMultiplayerId: string, args: ValidationArguments): Promise<boolean> {
    return this.osuApi.isValidBanchoMultiplayerId(banchoMultiplayerId);
  }

  defaultMessage(args: ValidationArguments) {
    // TODO: reason for failed validation
    return "Bancho Multiplayer ID ($value) is not valid (why?).";
  }
}

export function IsValidBanchoMultiplayerId(validationOptions?: ValidationOptions) {
  return function(object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidBanchoMultiplayerIdConstraint
    });
  };
}
