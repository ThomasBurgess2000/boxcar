import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { DynamicTerrain } from '../../externals/babylon.dynamicTerrain_modular';
import { scene } from '../../game';
import alea from 'alea';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { InitializationStatus } from '../../utils/types';
import { Vector3 } from '@babylonjs/core';

@RegisterSystem()
export class DynamicTerrainInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
  }

  protected updateEntity(entity: Entity): void {
    const dynamicTerrainComponent = entity.get(DynamicTerrainComponent)!;
    if (dynamicTerrainComponent.initializationStatus !== InitializationStatus.NotInitialized) {
      return;
    }
    dynamicTerrainComponent.initializationStatus = InitializationStatus.Initializing;
    const mapSubX = 1000;
    const mapSubZ = 1000;
    const seed = 0.3;
    const noiseScale = 0.03;
    const elevationScale = 6.0;
    const prng = alea(seed);
    const noise2D = createNoise2D(prng);
    const mapData = this.makeMapData(mapSubX, mapSubZ, noise2D, noiseScale, elevationScale, dynamicTerrainComponent.flatPoints, 7);
    const mapParams = {
      mapData: mapData,
      mapSubX: mapSubX,
      mapSubZ: mapSubZ,
      terrainSub: 1000,
    };
    const terrain = new DynamicTerrain('dynamicTerrain', mapParams, scene);
    dynamicTerrainComponent.dynamicTerrain = terrain;
    dynamicTerrainComponent.initializationStatus = InitializationStatus.Initialized;
  }

  protected makeMapData(
    mapSubX: number,
    mapSubZ: number,
    noise2D: NoiseFunction2D,
    noiseScale: number,
    elevationScale: number,
    trackPoints: Vector3[],
    flatRadius: number,
  ): Float32Array {
    const mapData = new Float32Array(mapSubX * mapSubZ * 3);
    for (let l = 0; l < mapSubZ; l++) {
      for (let w = 0; w < mapSubX; w++) {
        const x = (w - mapSubX * 0.5) * 5.0;
        const z = (l - mapSubZ * 0.5) * 2.0;
        let y = noise2D(x * noiseScale, z * noiseScale);
        y *= (0.5 + y) * y * elevationScale;

        let isFlatArea = trackPoints.some((trackPoint) => {
          const dx = x - trackPoint.x;
          const dz = z - trackPoint.z;
          return Math.sqrt(dx * dx + dz * dz) <= flatRadius;
        });

        if (isFlatArea) {
          y = 0;
        }

        mapData[3 * (l * mapSubX + w)] = x;
        mapData[3 * (l * mapSubX + w) + 1] = y;
        mapData[3 * (l * mapSubX + w) + 2] = z;
      }
    }
    return mapData;
  }
}
