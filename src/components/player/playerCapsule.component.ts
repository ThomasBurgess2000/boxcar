import { Mesh } from '@babylonjs/core';
import { InitializationStatus } from '../../utils/types';

export class PlayerCapsuleComponent {
  public initalizationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public mesh: Mesh | null = null;
  constructor() {}
}
