import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { DynamicTerrain } from '../../externals/babylon.dynamicTerrain_modular';
import { MAX_VIEW_DISTANCE, scene } from '../../game';
import alea from 'alea';
import { NoiseFunction2D, createNoise2D } from 'simplex-noise';
import { InitializationStatus } from '../../utils/types';
import {
  Color3,
  Engine,
  RawTexture,
  ShaderLanguage,
  ShaderMaterial,
  ShaderStore,
  Texture,
  Vector2,
  Vector3,
  VertexBuffer,
} from '@babylonjs/core';
import { loadShader } from '../../utils/loadShaders';

@RegisterSystem()
export class DynamicTerrainInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const dynamicTerrainComponent = entity.get(DynamicTerrainComponent)!;
    if (dynamicTerrainComponent.initializationStatus !== InitializationStatus.NotInitialized) {
      return;
    }
    dynamicTerrainComponent.initializationStatus = InitializationStatus.Initializing;
    const mapSubX = 1000;
    const mapSubZ = 400;
    const seed = 0.3;
    const noiseScale = 0.005;
    const elevationScale = 2;
    const prng = alea(seed);
    const noise2D = createNoise2D(prng);
    const mapData = this.makeMapData(mapSubX, mapSubZ, noise2D, noiseScale, elevationScale, dynamicTerrainComponent.flatPoints, 20);

    const mapParams = {
      mapData: mapData,
      mapSubX: mapSubX,
      mapSubZ: mapSubZ,
      terrainSub: MAX_VIEW_DISTANCE * 2,
    };
    const terrain = new DynamicTerrain('dynamicTerrain', mapParams, scene);
    dynamicTerrainComponent.dynamicTerrain = terrain;

    const terrainWidth = mapSubX;
    const terrainHeight = mapSubZ;
    const noiseResolution = 1.0; // Smaller values make smoother noise

    // Create a 1D array to hold the noise values
    const noiseValues = new Float32Array(terrainWidth * terrainHeight);

    // Populate the noise array with values
    for (let z = 0; z < terrainHeight; z++) {
      for (let x = 0; x < terrainWidth; x++) {
        // Calculate the noise value at this point
        const noiseValue = noise2D(x * noiseResolution, z * noiseResolution);

        // Optionally, normalize and scale the noise value
        const normalizedNoiseValue = (noiseValue + 1) / 2; // Normalize to [0, 1]

        // Store the noise value in the array
        noiseValues[z * terrainWidth + x] = normalizedNoiseValue;
      }
    }

    const noiseTextureWidth = Math.sqrt(mapSubX * mapSubZ);
    const noiseTextureHeight = noiseTextureWidth; // Square texture for simplicity

    // Create an empty array for the texture
    const noiseTextureData = new Uint8Array(noiseTextureWidth * noiseTextureHeight * 4); // *4 for RGBA

    // Populate the texture array
    for (let i = 0, l = noiseTextureData.length; i < l; i += 4) {
      // Assuming 'noiseValues' is a 1D array of your noise data normalized to [0, 1]
      // Map the 1D noise array to the 2D texture array
      const noiseValue = Math.floor(i / 4); // This maps directly, but you might need a more complex mapping
      const normalizedNoiseValue = Math.round(noiseValues[noiseValue] * 255);
      noiseTextureData[i] = normalizedNoiseValue; // R
      noiseTextureData[i + 1] = normalizedNoiseValue; // G
      noiseTextureData[i + 2] = normalizedNoiseValue; // B
      noiseTextureData[i + 3] = 255; // A
    }

    // Create the texture
    const noiseTexture = new RawTexture(
      noiseTextureData,
      noiseTextureWidth,
      noiseTextureHeight,
      Engine.TEXTUREFORMAT_RGBA,
      scene,
      false,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
    );

    const terrainShaderMaterial = await this.makeShaders(noiseTexture);
    dynamicTerrainComponent.dynamicTerrain.mesh.material = terrainShaderMaterial;
    dynamicTerrainComponent.dynamicTerrain.mesh.isPickable = false;

    dynamicTerrainComponent.initializationStatus = InitializationStatus.Initialized;
  }

  protected layeredNoise(x: number, z: number, noise2D: NoiseFunction2D, noiseScale: number, elevationScale: number) {
    const baseNoise = noise2D(x * noiseScale, z * noiseScale) * elevationScale;
    const detailNoise = noise2D(x * (noiseScale * 2), z * (noiseScale * 2)) * (elevationScale / 2);
    return baseNoise + detailNoise;
  }

  protected getColorForHeight(height: number) {
    const seaLevel = 0; // Define sea level or base level
    const mountainLevel = 20; // Define the level where hills become mountains

    if (height < seaLevel) {
      return new Color3(0, 0, 1); // Blue for water
    } else if (height < mountainLevel) {
      return new Color3(0, 1, 0); // Green for lowlands
    } else {
      return new Color3(1, 1, 1); // White for mountain tops
    }
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
        const x = (w - mapSubX * 0.5) * 2.0;
        const z = (l - mapSubZ * 0.5) * 2.0;
        let y = this.layeredNoise(x, z, noise2D, noiseScale, elevationScale);
        y *= (0.5 + y) * y * elevationScale;

        trackPoints.forEach((trackPoint) => {
          const dx = x - trackPoint.x;
          const dz = z - trackPoint.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          if (distance <= flatRadius) {
            const falloff = 1 - distance / flatRadius;
            y *= falloff;
          }
        });

        mapData[3 * (l * mapSubX + w)] = x;
        mapData[3 * (l * mapSubX + w) + 1] = y;
        mapData[3 * (l * mapSubX + w) + 2] = z;
      }
    }
    return mapData;
  }

  protected async makeShaders(noiseTexture: RawTexture): Promise<ShaderMaterial> {
    const vertexShader = await loadShader('assets/shaders/terrain/terrainVertexShader.glsl');
    const fragmentShader = await loadShader('assets/shaders/terrain/terrainFragmentShader.glsl');

    ShaderStore.ShadersStore['terrainVertexShader'] = vertexShader;
    ShaderStore.ShadersStore['terrainFragmentShader'] = fragmentShader;

    const terrainShaderMaterial = new ShaderMaterial(
      'terrainShader',
      scene,
      {
        vertex: 'terrain',
        fragment: 'terrain',
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'lowestPoint', 'highestPoint', 'seaLevel', 'mountainLevel'],
        uniformBuffers: undefined,
        shaderLanguage: ShaderLanguage.GLSL,
      },
    );
    terrainShaderMaterial.setTexture('noiseTexture', noiseTexture);

    terrainShaderMaterial.setFloat('lowestPoint', -32);
    terrainShaderMaterial.setFloat('highestPoint', 43);
    terrainShaderMaterial.setFloat('seaLevel', -1);
    terrainShaderMaterial.setFloat('mountainLevel', 38);
    return terrainShaderMaterial;
  }

  protected logMinMaxHeight(mapData: Float32Array) {
    let minHeight = Number.MAX_VALUE;
    let maxHeight = Number.MIN_VALUE;
    for (let i = 0; i < mapData.length; i += 3) {
      const height = mapData[i + 1];
      if (height < minHeight) {
        minHeight = height;
      }
      if (height > maxHeight) {
        maxHeight = height;
      }
    }
  }
}
