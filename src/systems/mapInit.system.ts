import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../startup/systemRegistration';
import { MapComponent } from '../components/map.component';
import { InitializationStatus } from '../utils/types';
import { TreeComponent } from '../components/tree.component';
import { PlacerComponent } from '../components/placer.component';
import { EcsEngine } from '../singletons/ecsEngine';
import { Vector3 } from '@babylonjs/core';

@RegisterSystem()
export class MapInitSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasComponent(MapComponent));
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const mapComponent = entity.get(MapComponent)!;
    if (mapComponent.InitializationStatus !== InitializationStatus.NotInitialized) {
      return;
    }
    mapComponent.InitializationStatus = InitializationStatus.Initializing;
    this.createMap(mapComponent);
    mapComponent.InitializationStatus = InitializationStatus.Initialized;
  }

  private createMap(mapComponent: MapComponent): void {
    // this.placeTrees(mapComponent);
  }

  private placeTrees(mapComponent: MapComponent): void {
    if (!mapComponent.trees) {
      return;
    }

    const trackPoints = mapComponent.dynamicTerrain.flatPoints;

    const ecsEngine = EcsEngine.getInstance();
    const treeRowCount = 30;

    // Helper function to check if a point is too close to any track point
    const isTooCloseToTrack = (x: number, y: number, trackPoints: Vector3[], minDistance: number): boolean => {
      for (let i = 0; i < trackPoints.length; i += 2) {
        // Check every 5th point
        const point = trackPoints[i];
        const distance = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
        if (distance < minDistance) {
          return true;
        }
      }
      return false;
    };

    // Make a bunch of trees
    for (let i = 0; i < treeRowCount; i++) {
      for (let j = 0; j < treeRowCount; j++) {
        const randomDistanceVariation = Math.random() * 10;
        const distanceFromTrack = 5;
        const x = (i + 1) * 10 + randomDistanceVariation;
        const y = (j + 1) * 10 + randomDistanceVariation + distanceFromTrack;

        // Check if the tree is too close to the track
        if (!isTooCloseToTrack(x, y, trackPoints, 10)) {
          const treeEntity = new Entity();
          const treeComponent = new TreeComponent();
          treeEntity.add(treeComponent);
          const placerComponent = new PlacerComponent(x, y);
          treeEntity.add(placerComponent);
          ecsEngine.addEntity(treeEntity);
        }
      }
    }

    for (let i = 0; i < treeRowCount; i++) {
      for (let j = 0; j < treeRowCount; j++) {
        const randomDistanceVariation = Math.random() * 10;
        const distanceFromTrack = 15;
        const x = (i + 1) * 10 + randomDistanceVariation;
        const y = (j + 1) * -10 + randomDistanceVariation - distanceFromTrack;

        // Check if the tree is too close to the track
        if (!isTooCloseToTrack(x, y, trackPoints, 20)) {
          const treeEntity = new Entity();
          const treeComponent = new TreeComponent();
          treeEntity.add(treeComponent);
          const placerComponent = new PlacerComponent(x, y);
          treeEntity.add(placerComponent);
          ecsEngine.addEntity(treeEntity);
        }
      }
    }
  }
}
