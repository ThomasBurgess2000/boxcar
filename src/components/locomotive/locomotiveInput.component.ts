export class LocomotiveInputComponent {
  public direction: Direction = Direction.Stop;
  public constructor() {}
}

export enum Direction {
  Forward,
  Backward,
  Stop,
  Neutral,
}
