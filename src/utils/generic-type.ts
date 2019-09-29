export abstract class GenericType {
  // private to disallow creating other instances of this type
  protected constructor(private key: string, private readonly value: any) {}

  getKey() {
    return this.key;
  }

  getText() {
    return this.value;
  }

  static getTextFromKey(key: string): string {
    const theseProps = Object.values(this) as Array<GenericType>;
    const found = theseProps.filter(prop => prop.getKey() === key);

    if (found.length < 1) {
      throw new Error("Key not found.");
    }
    if (found.length > 1) {
      throw new Error("Multiple keys found?? This should never happen...");
    }

    return found[0].getText();
  }

  static getStatusFromKey<T>(key: string): T {
    const theseProps = Object.values(this) as Array<GenericType>;
    const found: T[] = (theseProps.filter(prop => prop.getKey() === key) as unknown[]) as T[];

    if (found.length < 1) {
      throw new Error("Key not found.");
    }
    if (found.length > 1) {
      throw new Error("Multiple keys found?? This should never happen...");
    }

    return found[0];
  }
}
