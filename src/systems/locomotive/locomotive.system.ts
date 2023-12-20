import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { LocomotiveComponent } from '../../components/locomotive.component';
import { InitializationStatus } from '../../utils/types';
import { TrackComponent } from '../../components/track.component';
import { Vector3 } from '@babylonjs/core';

@RegisterSystem()
export class LocomotiveSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasAll(LocomotiveComponent, TrackComponent));
  }

  protected updateEntity(entity: Entity, dt: number): void {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    const trackComponent = entity.get(TrackComponent)!;
    if (
      locomotiveComponent.initializationStatus !== InitializationStatus.Initialized ||
      !locomotiveComponent.mesh ||
      trackComponent.initializationStatus !== InitializationStatus.Initialized
    ) {
      return;
    }
    this.updatePositionOnTrack(locomotiveComponent, trackComponent);
  }

  private updatePositionOnTrack(locomotiveComponent: LocomotiveComponent, trackComponent: TrackComponent) {
    const positionOnTrack = locomotiveComponent.positionOnTrack;
    const trackLength = trackComponent.points.length;
    if (positionOnTrack >= trackLength) {
      locomotiveComponent.positionOnTrack = 0;
    }
    const locomotiveMesh = locomotiveComponent.mesh!;
    const position = trackComponent.points[locomotiveComponent.positionOnTrack];
    locomotiveMesh.position = new Vector3(position.x, position.y + 1.5, position.z);
    locomotiveMesh.rotationQuaternion = trackComponent.rotations[locomotiveComponent.positionOnTrack];
    locomotiveComponent.positionOnTrack++;
  }
}
