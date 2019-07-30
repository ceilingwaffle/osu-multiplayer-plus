import { ValidationError } from "class-validator";

/**
 * A controller response.
 *
 * @export
 * @interface Response
 * @template T The type of the response result data.
 */
export interface Response<T> {
  /**
   * Whether the request succeeded.
   *
   * @type {boolean}
   */
  success: boolean;
  /**
   * The response message (e.g. "action succeeded").
   *
   * @type {string}
   */
  message: string;
  /**
   * Any errors generated while forming the response.
   *
   * @type {{
   *     messages?: string[];
   *     validation?: ValidationError[];
   *   }}
   */
  errors?: {
    messages?: string[];
    validation?: ValidationError[];
  };
  /**
   * The response payload data.
   *
   * @type {T}
   */
  result?: T;
}
