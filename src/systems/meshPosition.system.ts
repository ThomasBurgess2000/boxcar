import { Entity, IterativeSystem } from 'tick-knock';
import { MeshComponent } from '../components/mesh.component';
import { PositionComponent } from '../components/position.component';
import { RegisterSystem } from '../startup/systemRegistration';

@RegisterSystem()
export class MeshPositionSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasAll(MeshComponent, PositionComponent));
  }

  protected updateEntity(entity: Entity): void {
    const meshComponent = entity.get(MeshComponent)!;
    const positionComponent = entity.get(PositionComponent)!;
    meshComponent.mesh.position = positionComponent.position;
  }
}
