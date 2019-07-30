export interface Response<T> {
  success: boolean;
  message: string;
  errors?: string[];
  result?: T;
}
