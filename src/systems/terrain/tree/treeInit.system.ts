import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../../startup/systemRegistration';
import { TreeComponent } from '../../../components/tree.component';
import { InitializationStatus } from '../../../utils/types';
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
  TransformNode,
  Vector3,
} from '@babylonjs/core';
import { scene } from '../../../game';
import { TransformNodeComponent } from '../../../components/babylonPrimitives/transformNode.component';
import { loadShader } from '../../../utils/loadShaders';

@RegisterSystem()
export class TreeInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(TreeComponent));
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const treeComponent = entity.get(TreeComponent)!;
    if (treeComponent.masterTreeInitializationStatus === InitializationStatus.NotInitialized) {
      treeComponent.masterTreeInitializationStatus = InitializationStatus.Initializing;
      await this.createMasterTree(treeComponent);
    }
    if (
      treeComponent.initializationStatus === InitializationStatus.NotInitialized &&
      treeComponent.masterTreeInitializationStatus === InitializationStatus.Initialized
    ) {
      treeComponent.initializationStatus = InitializationStatus.Initializing;
      this.createTreeInstance(entity, treeComponent);
    }
  }

  private async createMasterTree(treeComponent: TreeComponent): Promise<void> {
    const vertexShader = await loadShader('src/assets/shaders/tree/treeVertexShader.glsl');
    const fragmentShader = await loadShader('src/assets/shaders/tree/treeFragmentShader.glsl');

    ShaderStore.ShadersStore['treeVertexShader'] = vertexShader;
    ShaderStore.ShadersStore['treeFragmentShader'] = fragmentShader;

    await SceneLoader.ImportMeshAsync(null, './assets/models/', 'tree.glb').then((result) => {
      console.log(result);
      const tree = result.meshes[0];
      tree.name = 'masterTree';
      tree.position = new Vector3(0, 0, 0);

      const shaderMaterial = new ShaderMaterial(
        'shader',
        scene,
        { vertex: 'tree', fragment: 'tree' },
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
      treeComponent.masterTreeInitializationStatus = InitializationStatus.Initialized;
    });
  }

  private createTreeInstance(entity: Entity, treeComponent: TreeComponent) {
    const tree = scene.getMeshByName('masterTree');
    if (!tree) {
      return;
    }

    const treeInstance = new TransformNode('treeInstance');

    const trunk = tree.getChildMeshes().find((mesh) => mesh.name === 'trunk') as Mesh;
    const trunkInstance = trunk.createInstance('trunkInstance');

    const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage') as Mesh;
    const foliageInstance = foliage.createInstance('foliageInstance');

    foliageInstance.parent = treeInstance;
    trunkInstance.parent = treeInstance;
    treeInstance.freezeWorldMatrix();
    foliageInstance.freezeWorldMatrix();
    trunkInstance.freezeWorldMatrix();
    foliageInstance.alwaysSelectAsActiveMesh = true;
    trunkInstance.alwaysSelectAsActiveMesh = true;
    const transformNodeComponent = new TransformNodeComponent(treeInstance);
    entity.add(transformNodeComponent);
    treeComponent.initializationStatus = InitializationStatus.Initialized;
  }
}
