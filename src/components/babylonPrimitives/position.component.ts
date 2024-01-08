import { Vector3 } from '@babylonjs/core';

export class PositionComponent {
  public position: Vector3;
  public unmoving: boolean = false;
  constructor({ x, y, z, unmoving }: { x: number; y: number; z: number, unmoving: boolean } = { x: 0, y: 0, z: 0, unmoving: false }) {
    this.position = new Vector3(x, y, z);
    this.unmoving = unmoving;
  }
}
