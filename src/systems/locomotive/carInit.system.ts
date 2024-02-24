import { Entity, IterativeSystem } from 'tick-knock';
import { InitializationStatus } from '../../utils/types';
import { Color3, MeshBuilder, StandardMaterial } from '@babylonjs/core';
import { RegisterSystem } from '../../startup/systemRegistration';
import { CarComponent } from '../../components/locomotive/car.component';

@RegisterSystem()
export class CarInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(CarComponent));
  }

  protected updateEntity(entity: Entity): void {
    const carComponents = entity.getAll(CarComponent)!;
    for (const carComponent of carComponents) {
      this.initCar(carComponent);
    }
  }

  private initCar(carComponent: CarComponent) {
    if (
      carComponent.initializationStatus === InitializationStatus.Initializing ||
      carComponent.initializationStatus === InitializationStatus.Initialized
    ) {
      return;
    }
    carComponent.initializationStatus = InitializationStatus.Initializing;
    const mesh = this.createMesh(carComponent);
    carComponent.mesh = mesh;
    carComponent.initializationStatus = InitializationStatus.Initialized;
  }

  private createMesh(car: CarComponent) {
    const mesh = MeshBuilder.CreateBox('car', { width: car.width, depth: car.depth, height: car.height });
    const material = new StandardMaterial('car-material');
    material.diffuseColor = new Color3(0.4, 0.4, 0.4);
    mesh.material = material;
    return mesh;
  }
}
