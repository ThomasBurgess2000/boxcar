import { IterativeSystem } from 'tick-knock/lib/ecs/IterativeSystem';
import { KeysComponent } from '../components/keys.component';
import { RegisterSystem } from '../startup/systemRegistration';
import { Entity } from 'tick-knock/lib/ecs/Entity';

@RegisterSystem()
export class KeysSystem extends IterativeSystem {
  private keyStates: { [key: string]: boolean } = {};
  public constructor() {
    super((entity) => entity.hasAll(KeysComponent));

    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  protected updateEntity(entity: Entity): void {
    const keysComponent = entity.get(KeysComponent)!;
    keysComponent.keyStates = this.keyStates;
  }

  private handleKeyDown(event: KeyboardEvent) {
    this.keyStates[event.key] = true;
  }

  private handleKeyUp(event: KeyboardEvent) {
    this.keyStates[event.key] = false;
  }
}
