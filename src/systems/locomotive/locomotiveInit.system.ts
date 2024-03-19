import { Entity, IterativeSystem } from 'tick-knock';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { ArcRotateCamera, Color3, Mesh, MeshBuilder, SceneLoader, StandardMaterial, Vector3 } from '@babylonjs/core';
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
    // const mesh = MeshBuilder.CreateBox('locomotive', { width: loc.width, depth: loc.depth, height: loc.height});
    await SceneLoader.ImportMeshAsync(null, './assets/models/prr_d16/', 'locomotive_final.glb').then((result) => {
      const mesh = result.meshes[0] as Mesh;
      mesh.name = 'locomotive';
      (scene.activeCamera as ArcRotateCamera).parent = mesh;
      const material = new StandardMaterial('locomotive-material');
      material.diffuseColor = new Color3(0.5, 0.5, 0.5);
      mesh.material = material;
      loc.bodyMesh = mesh;
    });

    // Import wheels
    await SceneLoader.ImportMeshAsync(null, './assets/models/prr_d16/', 'frontwheels_final.glb').then((result) => {
      const wheel = result.meshes[0] as Mesh;
      wheel.name = 'frontWheels';
      wheel.parent = loc.bodyMesh;
      wheel.position = new Vector3(0, 0, -5.325);
      loc.frontWheelsMesh = wheel;
    });
  }
}
