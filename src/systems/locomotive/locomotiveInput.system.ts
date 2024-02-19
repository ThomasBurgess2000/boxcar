import { IterativeSystem } from 'tick-knock/lib/ecs/IterativeSystem';
import { RegisterSystem } from '../../startup/systemRegistration';
import { Direction, LocomotiveInputComponent } from '../../components/locomotive/locomotiveInput.component';
import { Entity } from 'tick-knock/lib/ecs/Entity';
import { KeysComponent } from '../../components/keys.component';

@RegisterSystem()
export class LocomotiveInputSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasAll(LocomotiveInputComponent, KeysComponent));
  }

  protected updateEntity(entity: Entity): void {
    const locomotiveInputComponent = entity.get(LocomotiveInputComponent)!;
    const keysComponent = entity.get(KeysComponent)!;
    this.updateDirection(locomotiveInputComponent, keysComponent);
    console.log('locomotiveInputComponent.direction', locomotiveInputComponent.direction);
  }

  private updateDirection(locomotiveInputComponent: LocomotiveInputComponent, keysComponent: KeysComponent) {
    const forward = keysComponent.getKeyState('w');
    const backward = keysComponent.getKeyState('s');
    const stop = keysComponent.getKeyState(' ');
    if (forward) {
      locomotiveInputComponent.direction = Direction.Forward;
    } else if (backward) {
      locomotiveInputComponent.direction = Direction.Backward;
    } else if (stop) {
      locomotiveInputComponent.direction = Direction.Stop;
    } else {
      locomotiveInputComponent.direction = Direction.Neutral;
    }
  }
}
