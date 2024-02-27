import { Entity, IterativeSystem } from 'tick-knock';
import { PositionComponent } from '../../components/babylonPrimitives/position.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { TransformNodeComponent } from '../../components/babylonPrimitives/transformNode.component';
import { AbstractMesh, InstancedMesh, Mesh, TransformNode } from '@babylonjs/core';

@RegisterSystem()
export class TransformNodePositionSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasAll(TransformNodeComponent, PositionComponent));
  }

  protected updateEntity(entity: Entity): void {
    const transformNodeComponent = entity.get(TransformNodeComponent)!;
    const positionComponent = entity.get(PositionComponent)!;
    transformNodeComponent.transformNode.position = positionComponent.position;
    if (positionComponent.unmoving) {
      entity.remove(PositionComponent);
      transformNodeComponent.transformNode.freezeWorldMatrix();
      const children = transformNodeComponent.transformNode.getChildren();
      for (const child of children) {
        if (child instanceof TransformNode || child instanceof Mesh || child instanceof InstancedMesh || child instanceof AbstractMesh) {
          child.freezeWorldMatrix();
        }
      }
    }
  }
}
