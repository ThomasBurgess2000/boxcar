import { Mesh, Nullable } from '@babylonjs/core';
import { InitializationStatus } from '../../utils/types';

export class LocomotiveComponent {
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public mesh: Nullable<Mesh> = null;
  public positionOnTrack: number = 0;
  public speed: number = 0;
  public acceleration: number = 10;
  public deceleration: number = 60;
  public maxSpeed: number = 70;
  constructor() {}
}
