import { Mesh, Nullable } from '@babylonjs/core';
import { InitializationStatus } from '../utils/types';

export class LocomotiveComponent {
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public mesh: Nullable<Mesh> = null;
  public positionOnTrack: number = 0;
  constructor() {}
}
