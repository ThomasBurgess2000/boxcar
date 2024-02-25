import { DynamicTerrain } from '../externals/babylon.dynamicTerrain_modular';

export class DynamicTerrainComponent {
  public dynamicTerrain: DynamicTerrain;
  constructor(dynamicTerrain: DynamicTerrain) {
    this.dynamicTerrain = dynamicTerrain;
  }
}
