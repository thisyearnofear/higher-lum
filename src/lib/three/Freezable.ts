export class Freezable {
  protected isFrozen: boolean = false;

  freeze() {
    this.isFrozen = true;
    return this;
  }

  unfreeze() {
    this.isFrozen = false;
    return this;
  }
}
