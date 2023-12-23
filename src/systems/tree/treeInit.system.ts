import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { TreeComponent } from '../../components/tree.component';
import { InitializationStatus } from '../../utils/types';
import {
  Color3,
  Material,
  Mesh,
  PBRMaterial,
  SceneLoader,
  ShaderLanguage,
  ShaderMaterial,
  ShaderStore,
  Texture,
  Vector3,
} from '@babylonjs/core';
import { scene } from '../../game';
import { MeshComponent } from '../../components/mesh.component';
@RegisterSystem()
export class TreeInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(TreeComponent));

    // Make the master tree
    ShaderStore.ShadersStore['customVertexShader'] = `
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;

    #include<instancesDeclaration>
    uniform mat4 view;
    uniform float u_effectBlend;
    uniform float u_remap;
    uniform float u_normalize;
    uniform mat4 projection;

    varying vec2 vUV;
    varying vec3 vPositionW;
    varying vec3 vNormalW;

    float inverseLerp(float v, float minValue, float maxValue) {
      return (v - minValue) / (maxValue - minValue);
    }

    float remap(float v, float inMin, float inMax, float outMin, float outMax) {
      float t = inverseLerp(v, inMin, inMax);
      return mix(outMin, outMax, t);
    }

    void main() {
      #include<instancesVertex>
      vec2 vertexOffset = vec2(
        remap(uv.x, 0.0, 1.0, -u_remap, 1.0),
        remap(uv.y, 0.0, 1.0, -u_remap, 1.0)
      );

      vertexOffset *= vec2(-1.0, 1.0);

      if (u_remap == 1.0) {
        vertexOffset = mix(vertexOffset, normalize(vertexOffset), u_normalize);
      }

      vec4 worldPosition = finalWorld * vec4(position, 1.0);
      vPositionW = worldPosition.xyz;

      vNormalW = normalize(vec3(finalWorld * vec4(normal, 0.0)));

      vec4 worldViewPosition = view * finalWorld * vec4(position, 1.0);

      worldViewPosition += vec4(mix(vec3(0.0), vec3(vertexOffset, 1.0), u_effectBlend), 0.0);
      
      vUV = uv;

      gl_Position = projection * worldViewPosition;
    }
  `;

    ShaderStore.ShadersStore['customFragmentShader'] = `
  precision highp float;

  // Varying variables for lighting calculations
  varying vec2 vUV;
  varying vec3 vPositionW;
  varying vec3 vNormalW;

  // Uniforms
  uniform sampler2D textureSampler;
  uniform vec3 u_color;
  uniform vec3 vLightPosition; // Add a light position uniform

  void main(void) {
      // Toon shader thresholds and brightness levels
      float ToonThresholds[4];
      ToonThresholds[0] = 0.95;
      ToonThresholds[1] = 0.5;
      ToonThresholds[2] = 0.2;
      ToonThresholds[3] = 0.03;

      float ToonBrightnessLevels[5];
      ToonBrightnessLevels[0] = 1.0;
      ToonBrightnessLevels[1] = 0.8;
      ToonBrightnessLevels[2] = 0.6;
      ToonBrightnessLevels[3] = 0.35;
      ToonBrightnessLevels[4] = 0.2;

      // Light calculation
      vec3 lightVectorW = normalize(vPositionW - vLightPosition);
      float ndl = max(0., dot(vNormalW, lightVectorW));

      // Apply toon shading
      vec3 color = texture2D(textureSampler, vUV).rgb;
      for (int i = 0; i < 4; i++) {
          if (ndl > ToonThresholds[i]) {
              color *= ToonBrightnessLevels[i];
              break;
          }
      }

      // Original luminance and transparency logic
      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      if (luminance < 0.75) {
          discard;
      }

      gl_FragColor = vec4(u_color * color, luminance);
  }
  `;

    this.createMasterTree();
  }

  protected updateEntity(entity: Entity): void {
    const treeComponent = entity.get(TreeComponent)!;
    if (
      treeComponent.initializationStatus === InitializationStatus.Initializing ||
      treeComponent.initializationStatus === InitializationStatus.Initialized
    ) {
      return;
    }
    this.createTreeInstance(entity, treeComponent);
  }

  private async createMasterTree(): Promise<void> {
    await SceneLoader.ImportMeshAsync(null, './assets/models/', 'tree.glb').then((result) => {
      const tree = result.meshes[0];
      tree.name = 'masterTree';
      tree.position = new Vector3(0, 0, 0);

      const shaderMaterial = new ShaderMaterial(
        'shader',
        scene,
        { vertex: 'custom', fragment: 'custom' },
        {
          attributes: ['position', 'uv', 'normal'],
          uniforms: ['view', 'projection', 'vLightPosition', 'u_color'],
          uniformBuffers: undefined,
          shaderLanguage: ShaderLanguage.GLSL,
        },
      );

      // Assign the shader material to the mesh
      tree.material = shaderMaterial;

      // Load texture if needed
      const alphaMap = new Texture('https://douges.dev/static/foliage_alpha3.png', scene, false, false, Texture.NEAREST_NEAREST);
      alphaMap.hasAlpha = true;
      shaderMaterial.alphaMode = Material.MATERIAL_ALPHABLEND;
      shaderMaterial.setTexture('textureSampler', alphaMap);
      shaderMaterial.backFaceCulling = false;
      const foliageColor = new Color3(63 / 255, 109 / 255, 33 / 255);
      shaderMaterial.setColor3('u_color', foliageColor);

      // Set initial uniform values
      shaderMaterial.setFloat('u_remap', 1.0);
      shaderMaterial.setFloat('u_normalize', 1.0);
      shaderMaterial.setFloat('u_effectBlend', 1.0);
      shaderMaterial.setVector3('vLightPosition', new Vector3(0, 20, 10));

      // find the child mesh with the name 'trunk'
      const trunk = tree.getChildMeshes().find((mesh) => mesh.name === 'trunk');
      if (!trunk || !trunk.material) {
        return;
      }
      const trunkPBRMaterial = new PBRMaterial('trunkPBRMaterial', scene);

      // brown
      trunkPBRMaterial.emissiveColor = new Color3(0.3, 0.2, 0.1);
      trunkPBRMaterial.emissiveIntensity = 0.13;
      trunkPBRMaterial.metallic = 0.1; // Low metallic value for non-metal surfaces
      trunkPBRMaterial.roughness = 0.8; // Increase roughness to reduce shininess

      trunk.material = trunkPBRMaterial;

      // find the child mesh with the name 'foliage'
      const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage');
      if (!foliage) {
        return;
      }
      foliage.material = shaderMaterial;

      tree.setEnabled(false);
    });
  }

  private createTreeInstance(entity: Entity, treeComponent: TreeComponent) {
    const tree = scene.getMeshByName('masterTree');
    if (!tree) {
      return;
    }

    treeComponent.initializationStatus = InitializationStatus.Initializing;

    const treeInstance = new Mesh('treeInstance', scene);

    const trunk = tree.getChildMeshes().find((mesh) => mesh.name === 'trunk') as Mesh;
    const trunkInstance = trunk.createInstance('trunkInstance');

    const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage') as Mesh;
    const foliageInstance = foliage.createInstance('foliageInstance');

    foliageInstance.parent = treeInstance;
    trunkInstance.parent = treeInstance;
    treeComponent.initializationStatus = InitializationStatus.Initialized;

    const meshComponent = new MeshComponent(treeInstance);
    entity.add(meshComponent);
  }
}
