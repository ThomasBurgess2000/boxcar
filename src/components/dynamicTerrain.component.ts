import { Vector3 } from '@babylonjs/core';
import { DynamicTerrain } from '../externals/babylon.dynamicTerrain_modular';
import { InitializationStatus } from '../utils/types';

export class DynamicTerrainComponent {
  public dynamicTerrain: DynamicTerrain | null = null;
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public mapSubX = 1000;
  public mapSubZ = 1000;
  public seed = 0.3;
  public noiseScale = 0.005;
  public elevationScale = 2;
  public flatRadius = 20;
  public noiseResolution = 1.0;
  constructor(public flatPoints: Vector3[] = []) {}
}
