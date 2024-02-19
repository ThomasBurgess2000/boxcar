import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { TrackComponent } from '../../components/track.component';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { Direction, LocomotiveInputComponent } from '../../components/locomotive/locomotiveInput.component';

const ELEVATION = 1.5;

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
      !locomotiveComponent.mesh ||
      trackComponent.initializationStatus !== InitializationStatus.Initialized
    ) {
      return;
    }
    this.setSpeed(locomotiveComponent, locomotiveInputComponent, dt);
    this.updatePositionOnTrack(locomotiveComponent, trackComponent, dt);
  }

  private setSpeed(locomotiveComponent: LocomotiveComponent, locomotiveInputComponent: LocomotiveInputComponent, dt: number) {
    let speed = locomotiveComponent.speed;
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

    const currentIndex = Math.floor(positionOnTrack);
    const nextIndex = (currentIndex + 1) % trackLength;

    const interpolationFactor = newPositionOnTrack - currentIndex;

    const currentPosition = trackComponent.points[currentIndex];
    const nextPosition = trackComponent.points[nextIndex];
    const interpolatedPosition = {
      x: currentPosition.x + (nextPosition.x - currentPosition.x) * interpolationFactor,
      y: currentPosition.y + (nextPosition.y - currentPosition.y) * interpolationFactor + ELEVATION,
      z: currentPosition.z + (nextPosition.z - currentPosition.z) * interpolationFactor,
    };

    const currentRotation = trackComponent.rotations[currentIndex];
    const nextRotation = trackComponent.rotations[nextIndex];
    const interpolatedRotation = Quaternion.Slerp(currentRotation, nextRotation, interpolationFactor);

    const locomotiveMesh = locomotiveComponent.mesh!;
    locomotiveMesh.position = new Vector3(interpolatedPosition.x, interpolatedPosition.y, interpolatedPosition.z);
    locomotiveMesh.rotationQuaternion = interpolatedRotation;
  }
}
