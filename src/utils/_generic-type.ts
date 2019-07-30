export abstract class GenericType {
  // private to disallow creating other instances of this type
  protected constructor(private key: string, public readonly value: any) {}

  toString() {
    return this.key;
  }
}
