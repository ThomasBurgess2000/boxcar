import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { PlayerCapsuleComponent } from '../../components/player/playerCapsule.component';
import { InitializationStatus } from '../../utils/types';
import { ArcRotateCamera, Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Vector3 } from '@babylonjs/core';
import { scene } from '../../game';

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
    // this.attachCamera(mesh);
    playerCapsuleComponent.mesh = mesh;
    playerCapsuleComponent.initalizationStatus = InitializationStatus.Initialized;
  }

  private createMesh() {
    const capsule = MeshBuilder.CreateCapsule('player-capsule', { radius: 0.5, height: 1.5 });
    capsule.position = new Vector3(5, 15, 0);
    const boxIndicatingDirection = MeshBuilder.CreateBox('box-indicating-direction', { size: 0.1 });
    boxIndicatingDirection.parent = capsule;
    boxIndicatingDirection.position = new Vector3(0, 0.5, -0.5);

    // TODO: move to camera component/system
    const cameraCapsule = MeshBuilder.CreateCapsule('camera-capsule', { radius: 0.5, height: 1.5 });
    (scene.activeCamera as ArcRotateCamera).parent = cameraCapsule;
    return capsule;
  }

  private attachPhysics(mesh: Mesh) {
    const capsuleAggregate = new PhysicsAggregate(mesh, PhysicsShapeType.CAPSULE, { mass: 1, restitution: 0.75 });
    capsuleAggregate.body.setMassProperties({
      inertia: new Vector3(0, 0, 0),
    });
    capsuleAggregate.body.setAngularDamping(100);
  }

  private attachCamera(mesh: Mesh) {
    (scene.activeCamera as ArcRotateCamera).setTarget(mesh);
  }
}
