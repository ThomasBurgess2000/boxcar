import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { TrackComponent } from '../../components/track.component';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { Direction, LocomotiveInputComponent } from '../../components/locomotive/locomotiveInput.component';
import { scene } from '../../game';

export const HEIGHT_ABOVE_TRACK = 1.5;
const NUMBER_OF_DRIVER_ANIMATION_FRAMES = 150;

@RegisterSystem()
export class LocomotiveSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasAll(LocomotiveComponent, TrackComponent, LocomotiveInputComponent));
  }

  protected updateEntity(entity: Entity, dt: number): void {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    const trackComponent = entity.get(TrackComponent)!;
    const locomotiveInputComponent = entity.get(LocomotiveInputComponent)!;
    if (
      locomotiveComponent.initializationStatus !== InitializationStatus.Initialized ||
      !locomotiveComponent.bodyMesh ||
      trackComponent.initializationStatus !== InitializationStatus.Initialized
    ) {
      return;
    }
    this.setSpeed(locomotiveComponent, locomotiveInputComponent, dt);
    if (locomotiveComponent.speed !== 0) {
      this.updatePositionOnTrack(locomotiveComponent, trackComponent, dt);
    }
    if (locomotiveComponent.previousSpeed !== locomotiveComponent.speed) {
      this.updateDriverAnimationSpeedRatio(locomotiveComponent);
    }
  }

  private setSpeed(locomotiveComponent: LocomotiveComponent, locomotiveInputComponent: LocomotiveInputComponent, dt: number) {
    let speed = locomotiveComponent.speed;
    locomotiveComponent.previousSpeed = speed;
    switch (locomotiveInputComponent.direction) {
      case Direction.Forward:
        speed = Math.min(speed + locomotiveComponent.acceleration * dt, locomotiveComponent.maxSpeed);
        break;
      case Direction.Backward:
        speed = Math.max(speed - locomotiveComponent.acceleration * dt, -locomotiveComponent.maxSpeed);
        break;
      case Direction.Stop:
        if (speed > 0) {
          speed = Math.max(speed - locomotiveComponent.deceleration * dt, 0);
        } else {
          speed = Math.min(speed + locomotiveComponent.deceleration * dt, 0);
        }
        break;
      case Direction.Neutral:
        // Maintain current speed
        break;
    }
    locomotiveComponent.speed = speed;
  }

  private updatePositionOnTrack(locomotiveComponent: LocomotiveComponent, trackComponent: TrackComponent, dt: number) {
    const positionOnTrack = locomotiveComponent.positionOnTrack;
    const trackLength = trackComponent.points.length;
    const newPositionOnTrack = (positionOnTrack + locomotiveComponent.speed * dt) % trackLength;
    locomotiveComponent.positionOnTrack = newPositionOnTrack >= 0 ? newPositionOnTrack : newPositionOnTrack + trackLength;

    // LOCOMOTIVE BODY POSITION AND ROTATION
    const currentIndex = Math.floor(positionOnTrack);
    const nextIndex = (currentIndex + 1) % trackLength;

    const interpolationFactor = newPositionOnTrack - currentIndex;

    const currentPosition = trackComponent.points[currentIndex];
    const nextPosition = trackComponent.points[nextIndex];
    const interpolatedPosition = {
      x: currentPosition.x + (nextPosition.x - currentPosition.x) * interpolationFactor,
      y: currentPosition.y + (nextPosition.y - currentPosition.y) * interpolationFactor + HEIGHT_ABOVE_TRACK,
      z: currentPosition.z + (nextPosition.z - currentPosition.z) * interpolationFactor,
    };

    const currentRotation = trackComponent.rotations[currentIndex];
    const nextRotation = trackComponent.rotations[nextIndex];
    const locomotiveInterpolatedRotation = Quaternion.Slerp(currentRotation, nextRotation, interpolationFactor);
    // Add 90 degrees to the rotation so that the locomotive faces the direction of the track
    locomotiveInterpolatedRotation.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0, 1, 0), -Math.PI / 2));
    const locomotiveMesh = locomotiveComponent.bodyMesh!;
    locomotiveMesh.position = new Vector3(interpolatedPosition.x, interpolatedPosition.y - 1.9, interpolatedPosition.z);
    locomotiveMesh.rotationQuaternion = locomotiveInterpolatedRotation;

    // FRONT WHEEL RELATIVE POSITION AND ROTATION
    if (!locomotiveComponent.frontWheelsMesh) {
      return;
    }
    const frontWheelsMesh = locomotiveComponent.frontWheelsMesh;
    const currentWheelIndex = currentIndex + 10;
    const nextWheelIndex = (currentWheelIndex + 1) % trackLength;

    const currentWheelRotation = trackComponent.rotations[currentWheelIndex];
    const nextWheelRotation = trackComponent.rotations[nextWheelIndex];

    const wheelInterpolatedRotation = Quaternion.Slerp(currentWheelRotation, nextWheelRotation, interpolationFactor);
    const relativeWheelRotation = wheelInterpolatedRotation.multiply(Quaternion.Inverse(locomotiveInterpolatedRotation));
    relativeWheelRotation.multiplyInPlace(Quaternion.RotationAxis(new Vector3(0, 1, 0), -Math.PI / 2));
    frontWheelsMesh.rotationQuaternion = relativeWheelRotation;

    const currentWheelAngle = currentWheelRotation.toEulerAngles().y;
    const nextWheelAngle = nextWheelRotation.toEulerAngles().y;
    let wheelAngleDifference = nextWheelAngle - currentWheelAngle;

    const currentLocomotiveAngle = currentRotation.toEulerAngles().y;
    const nextLocomotiveAngle = nextRotation.toEulerAngles().y;
    let locomotiveAngleDifference = nextLocomotiveAngle - currentLocomotiveAngle;

    // Normalize the angle difference to the range (-PI, PI]
    wheelAngleDifference = ((wheelAngleDifference + Math.PI) % (2 * Math.PI)) - Math.PI;
    const angleInDegrees = (relativeWheelRotation.y * 180) / Math.PI;
    const maxOffset = 0.5;
    const maxTurnAngle = 4.28;

    if (wheelAngleDifference > 0 || locomotiveAngleDifference > 0) {
      const scaledOffset = maxOffset * Math.min(angleInDegrees / maxTurnAngle, 1);
      frontWheelsMesh.position.x = -scaledOffset;
    } else if (wheelAngleDifference < 0 || locomotiveAngleDifference < 0) {
      const scaledOffset = -maxOffset * Math.min(angleInDegrees / -maxTurnAngle, 1);
      frontWheelsMesh.position.x = -scaledOffset;
    } else {
      frontWheelsMesh.position.x = 0;
    }
  }

  private updateDriverAnimationSpeedRatio(locomotiveComponent: LocomotiveComponent) {
    console.log('updateDriverAnimationSpeedRatio');
    const driver = locomotiveComponent.driverMesh;
    if (!driver) {
      throw new Error('Driver mesh not found');
    }
    const armature = driver.getChildTransformNodes(true, (node) => node.name === 'Armature')[0];
    if (!armature) {
      throw new Error('Armature not found');
    }

    // Based on the speed of the locomotive, set the speed ratio of the driver animation
    const speed = locomotiveComponent.speed;
    const speedFactor = (speed * 5) / locomotiveComponent.maxSpeed;

    const animationGroup = scene.getAnimationGroupByName('Armature|Armature|ArmatureAction.001');
    if (!animationGroup) {
      throw new Error('Driver animation group not found');
    }
    animationGroup.speedRatio = speedFactor;
  }
}
