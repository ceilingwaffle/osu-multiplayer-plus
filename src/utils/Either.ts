// source: https://gist.github.com/brunovegreville/1289eba4455de2413724c04d8eab3c78
export type Either<L, A> = Left<L, A> | Right<L, A>;

export class Left<L, A> {
  readonly value: L;

  constructor(value: L) {
    this.value = value;
  }

  isLeft(): this is Left<L, A> {
    return true;
  }

  failed(): this is Left<L, A> {
    return this.isLeft();
  }

  isRight(): this is Right<L, A> {
    return false;
  }

  succeeded(): this is Right<L, A> {
    return this.isRight();
  }

  applyOnRight<B>(_: (a: A) => B): Either<L, B> {
    return this as any;
  }

  // async applyOnRightAsync<B>(_: (a: A) => B): Promise<Either<L, B>> {
  //   return this as any;
  // }
}

export class Right<L, A> {
  readonly value: A;

  constructor(value: A) {
    this.value = value;
  }

  isLeft(): this is Left<L, A> {
    return false;
  }

  failed() {
    return this.isLeft();
  }

  isRight(): this is Right<L, A> {
    return true;
  }

  succeeded() {
    return this.isRight();
  }

  applyOnRight<B>(func: (a: A) => B): Either<L, B> {
    return new Right(func(this.value));
  }

  // async applyOnRightAsync<B>(func: (a: A) => B): Promise<Either<L, B>> {
  //   return new Right(func(this.value));
  // }
}

export const left = <L, A>(l: L): Either<L, A> => {
  return new Left(l);
};

export const right = <L, A>(a: A): Either<L, A> => {
  return new Right<L, A>(a);
};

export const leftPromise = <L, A>(l: L): Promise<Either<L, A>> => {
  return new Promise((resolve, reject) => {
    try {
      return resolve(new Left(l));
    } catch (error) {
      return reject(error);
    }
  });
};

export const rightPromise = <L, A>(a: A): Promise<Either<L, A>> => {
  return new Promise((resolve, reject) => {
    try {
      return resolve(new Right<L, A>(a));
    } catch (error) {
      return reject(error);
    }
  });
};

// export const leftAsync = <L, A>(l: L): Promise<Either<L, A>> => {
//   return new Promise(() => new Left(l));
// };

// export const rightAsync = <L, A>(a: A): Promise<Either<L, A>> => {
//   return new Promise(() => new Right<L, A>(a));
// };

export const failure = left;
export const success = right;
export const failurePromise = leftPromise;
export const successPromise = rightPromise;
// export const failureAsync = leftAsync;
// export const successAsync = rightAsync;
