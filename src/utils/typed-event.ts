// Source: https://basarat.gitbooks.io/typescript/docs/tips/typed-event.html
export interface Listener<T> {
  (event: T): any;
}

export interface Disposable {
  dispose();
}

/** passes through events as they happen. You will not get events from before you start listening */
export class TypedEvent<T> {
  private listeners: Listener<T>[] = [];
  private listenersOncer: Listener<T>[] = [];

  on = (listener: Listener<T>): Disposable => {
    this.listeners.push(listener);
    return {
      dispose: () => this.off(listener)
    };
  };

  once = (listener: Listener<T>): void => {
    this.listenersOncer.push(listener);
  };

  off = (listener: Listener<T>) => {
    var callbackIndex = this.listeners.indexOf(listener);
    if (callbackIndex > -1) this.listeners.splice(callbackIndex, 1);
  };

  emit = (event: T) => {
    /** Update any general listeners */
    this.listeners.forEach(listener => listener(event));

    /** Clear the `once` queue */
    if (this.listenersOncer.length > 0) {
      this.listenersOncer.forEach(listener => listener(event));
      this.listenersOncer = [];
    }
  };

  pipe = (te: TypedEvent<T>): Disposable => {
    return this.on(e => te.emit(e));
  };
}

// class Foo {
//   write() {
//     console.log("We foo'd");
//   }
// }
// class Bar {
//   write() {
//     console.log("We bar'd");
//   }
// }

// const foo = new Foo();
// const bar = new Bar();

// const fe = new TypedEvent<Foo>();
// const be = new TypedEvent<Bar>();

// fe.on(foo => foo.write());
// be.on(bar => bar.write());

// fe.pipe(be);

// fe.emit(foo);
// be.emit(bar);
