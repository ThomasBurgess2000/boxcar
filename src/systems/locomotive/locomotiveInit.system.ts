import { Entity, IterativeSystem } from 'tick-knock';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { ArcRotateCamera, Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { RegisterSystem } from '../../startup/systemRegistration';
import { scene } from '../../game';

@RegisterSystem()
export class LocomotiveInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(LocomotiveComponent));
  }

  protected updateEntity(entity: Entity): void {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    if (
      locomotiveComponent.initializationStatus === InitializationStatus.Initializing ||
      locomotiveComponent.initializationStatus === InitializationStatus.Initialized
    ) {
      return;
    }
    locomotiveComponent.initializationStatus = InitializationStatus.Initializing;
    const mesh = this.createMesh(locomotiveComponent);
    locomotiveComponent.mesh = mesh;
    locomotiveComponent.initializationStatus = InitializationStatus.Initialized;
  }

  private createMesh(loc: LocomotiveComponent) {
    const mesh = MeshBuilder.CreateBox('locomotive', { width: loc.width, depth: loc.depth, height: loc.height});
    const material = new StandardMaterial('locomotive-material');
    material.diffuseColor = new Color3(0.5, 0.5, 0.5);
    mesh.material = material;
    return mesh;
  }
}
