import { Mesh, Nullable } from '@babylonjs/core';
import { InitializationStatus } from '../../utils/types';
import { LinkedComponent } from 'tick-knock';

export class CarComponent extends LinkedComponent {
  public mesh: Nullable<Mesh> = null;
  public offset: number; // Distance behind the locomotive
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public width: number = 16.891;
  public depth: number = 3.2258;
  public height: number = 3.048;

  constructor(offset: number) {
    super();
    this.offset = offset;
  }
}