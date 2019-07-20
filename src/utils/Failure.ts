import { ValidationError } from "class-validator";

export interface Failure<FailureType> {
  type: FailureType;
  reason: string;
  error?: Error;
  validationErrors?: ValidationError[];
}
