import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { DynamicTerrain } from '../../externals/babylon.dynamicTerrain_modular';
import { scene } from '../../game';

@RegisterSystem()
export class DynamicTerrainInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
  }

  protected updateEntity(entity: Entity): void {
    const dynamicTerrainComponent = entity.get(DynamicTerrainComponent)!;
    // Initialize your dynamic terrain here
    // Example initialization, replace with your actual terrain data and settings
    const mapData = DynamicTerrain.CreateMapFromHeightMap('path/to/heightmap.jpg', { width: 100, height: 100 }, scene);
    const terrain = new DynamicTerrain('dynamicTerrain', { mapData: mapData, terrainSub: 60 }, scene);
    dynamicTerrainComponent.dynamicTerrain = terrain;
  }
}
