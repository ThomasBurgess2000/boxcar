import { Entity, IterativeSystem } from 'tick-knock';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { ArcRotateCamera, Color3, Mesh, MeshBuilder, PointLight, SceneLoader, SpotLight, StandardMaterial, Vector3 } from '@babylonjs/core';
import { RegisterSystem } from '../../startup/systemRegistration';
import { scene } from '../../game';

@RegisterSystem()
export class LocomotiveInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(LocomotiveComponent));
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    if (
      locomotiveComponent.initializationStatus === InitializationStatus.Initializing ||
      locomotiveComponent.initializationStatus === InitializationStatus.Initialized
    ) {
      return;
    }
    locomotiveComponent.initializationStatus = InitializationStatus.Initializing;
    await this.createMesh(locomotiveComponent);
    locomotiveComponent.initializationStatus = InitializationStatus.Initialized;
  }

  private async createMesh(loc: LocomotiveComponent) {

    const material = new StandardMaterial('locomotive-material');
    material.diffuseColor = new Color3(52/255, 52/255, 52/255);

    // const mesh = MeshBuilder.CreateBox('locomotive', { width: loc.width, depth: loc.depth, height: loc.height});
    await SceneLoader.ImportMeshAsync(null, './assets/models/prr_d16/', 'locomotive_final.glb').then((result) => {
      const mesh = result.meshes[0] as Mesh;
      mesh.name = 'locomotive';
      (scene.activeCamera as ArcRotateCamera).parent = mesh;
      (scene.activeCamera as ArcRotateCamera).target = new Vector3(0, 3, -9);
      
      mesh.material = material;
      mesh.getChildMeshes().forEach((child) => {
        child.material = material;
      });
      loc.bodyMesh = mesh;
    });

    // Import wheels
    await SceneLoader.ImportMeshAsync(null, './assets/models/prr_d16/', 'frontwheels_final.glb').then((result) => {
      const wheel = result.meshes[0] as Mesh;
      wheel.name = 'frontWheels';
      wheel.parent = loc.bodyMesh;
      wheel.position = new Vector3(0, 0, -5.325);
      loc.frontWheelsMesh = wheel;
      wheel.material = material;
      wheel.getChildMeshes().forEach((child) => {
        child.material = material;
      });
    });

    // Import driver
    // TODO: Rescale to 37.5 like the others, so don't have to set scale here
    await SceneLoader.ImportMeshAsync(null, './assets/models/prr_d16/', 'driver50.glb').then((result) => {
      const driver = result.meshes[0] as Mesh;
      const armature = driver.getChildTransformNodes(true, (node) => node.name === 'Armature')[0];
      if (!armature) {
        throw new Error('Armature not found');
      }

      driver.scaling = new Vector3(0.75, 0.75, 0.75);
      driver.name = 'driver';
      driver.parent = loc.bodyMesh;
      driver.position = new Vector3(0, 0, 0);
      loc.driverMesh = driver;

      const driverMaterial = new StandardMaterial('driver-material');
      driverMaterial.diffuseColor = new Color3(63/255, 63/255, 63/255);
      driver.material = driverMaterial;
      driver.getChildMeshes().forEach((child) => {
        child.material = driverMaterial;
      });
    });

    // const spotlight = new SpotLight('spotlight', new Vector3(0, 4, -7.4), new Vector3(0, 0, -1), Math.PI / 2, 2, scene);
    // spotlight.parent = loc.bodyMesh;
  }
}
