import { IterativeSystem } from 'tick-knock/lib/ecs/IterativeSystem';
import { RegisterSystem } from '../../startup/systemRegistration';
import { Entity } from 'tick-knock/lib/ecs/Entity';
import { Quaternion, Vector3 } from '@babylonjs/core';
import { CarComponent } from '../../components/locomotive/car.component';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';
import { TrackComponent } from '../../components/track.component';
import { HEIGHT_ABOVE_TRACK } from '.';

@RegisterSystem()
export class CarSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasAll(LocomotiveComponent, CarComponent, TrackComponent));
  }

  protected updateEntity(entity: Entity): void {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    const trackComponent = entity.get(TrackComponent)!;
    const carComponents = entity.getAll(CarComponent)!;
    for (const carComponent of carComponents) {
      if (!carComponent.mesh) {
        return;
      }

      const trackLength = trackComponent.points.length;
      const carPositionOnTrack = (locomotiveComponent.positionOnTrack - carComponent.offset + trackLength) % trackLength;
      const carIndex = Math.floor(carPositionOnTrack);
      const nextCarIndex = (carIndex + 1) % trackLength;

      const currentPosition = trackComponent.points[carIndex];
      const nextPosition = trackComponent.points[nextCarIndex];
      const interpolationFactor = carPositionOnTrack - carIndex;
      const interpolatedPosition = new Vector3(
        currentPosition.x + (nextPosition.x - currentPosition.x) * interpolationFactor,
        currentPosition.y + (nextPosition.y - currentPosition.y) * interpolationFactor + HEIGHT_ABOVE_TRACK,
        currentPosition.z + (nextPosition.z - currentPosition.z) * interpolationFactor,
      );

      // Update position
      carComponent.mesh.position = interpolatedPosition;

      // Update rotation
      const currentRotation = trackComponent.rotations[carIndex];
      const nextRotation = trackComponent.rotations[nextCarIndex];
      const interpolatedRotation = Quaternion.Slerp(currentRotation, nextRotation, interpolationFactor);
      carComponent.mesh.rotationQuaternion = interpolatedRotation;
    }
  }
}
