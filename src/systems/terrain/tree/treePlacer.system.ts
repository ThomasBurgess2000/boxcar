import { Entity, IterativeSystem, Query } from 'tick-knock';
import { RegisterSystem } from '../../../startup/systemRegistration';
import { TreeComponent } from '../../../components/tree.component';
import { InitializationStatus } from '../../../utils/types';
import { PlacerComponent } from '../../../components/placer.component';
import { DynamicTerrainComponent } from '../../../components/dynamicTerrain.component';
import { PositionComponent } from '../../../components/babylonPrimitives/position.component';
import { EcsEngine } from '../../../singletons/ecsEngine';

@RegisterSystem()
export class TreePlacerSystem extends IterativeSystem {
  private dynamicTerrainQuery = new Query((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
  public constructor() {
    super((entity) => entity.hasAll(TreeComponent, PlacerComponent));
    EcsEngine.getInstance().addQuery(this.dynamicTerrainQuery);
  }

  protected updateEntity(entity: Entity): void {
    const treeComponent = entity.get(TreeComponent)!;
    const placerComponent = entity.get(PlacerComponent)!;
    if (treeComponent.initializationStatus !== InitializationStatus.Initialized) {
      return;
    }
    const dynamicTerrainComponent = this.dynamicTerrainQuery.first?.get(DynamicTerrainComponent);
    if (!dynamicTerrainComponent) {
      return;
    }
    entity.remove(PlacerComponent);
    let height = dynamicTerrainComponent.dynamicTerrain?.getHeightFromMap(placerComponent.x, placerComponent.z);
    if (!height) {
      console.error('No height found for tree');
      treeComponent.treeInstance?.dispose();
      entity.remove(TreeComponent);
      return;
    }
    if (height < 0 || height > 35) {
      treeComponent.treeInstance?.dispose();
      entity.remove(TreeComponent);
    }
    const positionComponent = new PositionComponent({
      x: placerComponent.x,
      y: height,
      z: placerComponent.z,
      unmoving: true,
    });
    entity.add(positionComponent);
  }
}
