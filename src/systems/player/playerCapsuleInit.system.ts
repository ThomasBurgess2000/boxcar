import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { PlayerCapsuleComponent } from '../../components/player/playerCapsule.component';
import { InitializationStatus } from '../../utils/types';
import { MeshBuilder, PhysicsAggregate, PhysicsShapeType, Vector3 } from '@babylonjs/core';

@RegisterSystem()
export class PlayerCapsuleInitSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasComponent(PlayerCapsuleComponent));
  }

  protected updateEntity(entity: Entity): void {
    const playerCapsuleComponent = entity.get(PlayerCapsuleComponent)!;
    if (playerCapsuleComponent.initalizationStatus !== InitializationStatus.NotInitialized) {
      return;
    }

    playerCapsuleComponent.initalizationStatus = InitializationStatus.Initializing;
    const mesh = this.createMesh();
    this.attachPhysics(mesh);
    playerCapsuleComponent.mesh = mesh;
    playerCapsuleComponent.initalizationStatus = InitializationStatus.Initialized;
  }

  private createMesh() {
    const capsule = MeshBuilder.CreateCapsule('player-capsule', { radius: 0.5, height: 1.5 });
    capsule.position = new Vector3(5, 15, 0);
    // capsule.isVisible = false;
    return capsule;
  }

  private attachPhysics(mesh: any) {
    const sphereAggregate = new PhysicsAggregate(mesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.75 });
  }
}
