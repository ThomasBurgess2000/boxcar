import { DynamicTerrain } from '../externals/babylon.dynamicTerrain_modular';
import { InitializationStatus } from '../utils/types';
import { DynamicTerrainComponent } from './dynamicTerrain.component';
import { TrackComponent } from './track.component';

export class MapComponent {
  public InitializationStatus = InitializationStatus.NotInitialized;
  constructor(
    public dynamicTerrain: DynamicTerrainComponent,
    public trees = true,
  ) {}
}
