import { Mesh, Nullable } from '@babylonjs/core';
import { InitializationStatus } from '../../utils/types';

export class LocomotiveComponent {
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public bodyMesh: Nullable<Mesh> = null;
  public frontWheelsMesh: Nullable<Mesh> = null;
  public driverMesh: Nullable<Mesh> = null;
  public positionOnTrack: number = 0;
  public speed: number = 0;
  public previousSpeed: number = 0;
  public acceleration: number = 5;
  public deceleration: number = 10;
  public maxSpeed: number = 26.8224;
  public width: number = 16.891;
  public depth: number = 3.2258;
  public height: number = 3.048;
  constructor() {}
}
