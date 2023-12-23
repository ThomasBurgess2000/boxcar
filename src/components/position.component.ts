import { Vector3 } from '@babylonjs/core';

export class PositionComponent {
  public position: Vector3;
  constructor({ x, y, z }: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 }) {
    this.position = new Vector3(x, y, z);
  }
}
