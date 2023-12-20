import { Quaternion, Vector3 } from '@babylonjs/core';
import { InitializationStatus } from '../utils/types';

export class TrackComponent {
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public rotations: Quaternion[] = [];
  constructor(
    public points: Vector3[],
    public sections: Section[],
  ) {}
}

export class Section {
  start: number;
  options: {
    lean: number;
    leanTwists: number;
    leanWaves: number;
    leanWaveAngle: number;
    turn: number;
    turnTwists: number;
    turnWaves: number;
    turnWaveAngle: number;
  };

  constructor(start: number, options?: Partial<Section['options']>) {
    this.start = start;
    this.options = {
      lean: 0,
      leanTwists: 0,
      leanWaves: 0,
      leanWaveAngle: 0,
      turn: 0,
      turnTwists: 0,
      turnWaves: 0,
      turnWaveAngle: 0,
      ...options,
    };
  }
}
