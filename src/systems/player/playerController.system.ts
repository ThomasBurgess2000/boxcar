import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { PlayerCapsuleComponent } from '../../components/player/playerCapsule.component';
import { KeysComponent } from '../../components/keys.component';
import { scene } from '../../game';
import { Vector3, Quaternion, Ray, Mesh } from '@babylonjs/core';

@RegisterSystem()
export class PlayerControllerSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasAll(PlayerCapsuleComponent, KeysComponent));
  }

  protected updateEntity(entity: Entity): void {
    const playerCapsuleComponent = entity.get(PlayerCapsuleComponent)!;
    const keysComponent = entity.get(KeysComponent)!;

    if (!playerCapsuleComponent.mesh) {
      return;
    }

    const mesh = playerCapsuleComponent.mesh;
    const camera = scene.activeCamera!;
    const { direction } = camera.getForwardRay();
    const forward = new Vector3(direction.normalize().x, 0, direction.normalize().z);
    const rot = Quaternion.FromLookDirectionLH(forward, Vector3.Up());
    const euler = rot.toEulerAngles();

    const angle180 = Math.PI;
    const angle45 = angle180 / 4;
    const angle90 = angle180 / 2;
    const angle135 = angle45 + angle90;

    if (keysComponent.getKeyState('w') && !keysComponent.getKeyState('d') && !keysComponent.getKeyState('a')) {
      euler.y = euler.y;
    }
    if (keysComponent.getKeyState('s') && !keysComponent.getKeyState('d') && !keysComponent.getKeyState('a')) {
      euler.y = euler.y + angle180;
    }
    if (keysComponent.getKeyState('a') && !keysComponent.getKeyState('w') && !keysComponent.getKeyState('s')) {
      euler.y = euler.y + angle90;
    }
    if (keysComponent.getKeyState('d') && !keysComponent.getKeyState('w') && !keysComponent.getKeyState('s')) {
      euler.y = euler.y - angle90;
    }
    if (keysComponent.getKeyState('w') && keysComponent.getKeyState('d')) {
      euler.y = euler.y - angle45;
    }
    if (keysComponent.getKeyState('w') && keysComponent.getKeyState('a')) {
      euler.y = euler.y + angle45;
    }
    if (keysComponent.getKeyState('s') && keysComponent.getKeyState('d')) {
      euler.y = euler.y - angle135;
    }
    if (keysComponent.getKeyState('s') && keysComponent.getKeyState('a')) {
      euler.y = euler.y + angle135;
    }
    const cameraCapsule = camera.parent as Mesh;

    // TODO: Use new physics shapecast?
    const rayOrigin = mesh.position.clone();
    const rayDirection = Vector3.Down();
    const rayLength = 0.78; // Adjust this value based on your player's height and the maximum slope angle you want to consider as "grounded"
    const ray = new Ray(rayOrigin, rayDirection, rayLength);
    const pickInfo = scene.pickWithRay(ray, (mesh) => {
      return mesh.isPickable && mesh !== playerCapsuleComponent.mesh && mesh !== cameraCapsule; // Exclude the player's own mesh from the raycast
    });

    const isPlayerGrounded = pickInfo && pickInfo.hit;

    if (isPlayerGrounded) {
      if (
        keysComponent.getKeyState('w') ||
        keysComponent.getKeyState('s') ||
        keysComponent.getKeyState('a') ||
        keysComponent.getKeyState('d')
      ) {
        const quaternion = euler.toQuaternion();
        Quaternion.SlerpToRef(mesh.rotationQuaternion!, quaternion, 0.1, mesh.rotationQuaternion!);
        mesh.translate(new Vector3(0, 0, -1), 0.08);
        if (mesh.physicsBody && mesh.rotationQuaternion) {
          mesh.physicsBody.setTargetTransform(mesh.absolutePosition, mesh.rotationQuaternion);
        }
      }
    }

    cameraCapsule.position = mesh.position.clone();
  }
}
