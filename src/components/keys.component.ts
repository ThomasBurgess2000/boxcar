export class KeysComponent {
  private _keyStates: { [key: string]: boolean } = {};
  public constructor() {}

  public getKeyState(key: string): boolean {
    return this._keyStates[key] || false;
  }

  public set keyStates(keyStates: { [key: string]: boolean }) {
    this._keyStates = keyStates;
  }
}
