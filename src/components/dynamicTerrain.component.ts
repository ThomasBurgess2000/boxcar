import { Vector3 } from '@babylonjs/core';
import { DynamicTerrain } from '../externals/babylon.dynamicTerrain_modular';
import { InitializationStatus } from '../utils/types';

export class DynamicTerrainComponent {
  public dynamicTerrain: DynamicTerrain | null = null;
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  constructor(public flatPoints: Vector3[] = []) {}
}
