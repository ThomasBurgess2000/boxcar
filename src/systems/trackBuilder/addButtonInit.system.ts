import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { AddButtonComponent } from '../../components/trackBuilder/addButton.component';
import { InitializationStatus } from '../../utils/types';
import { AdvancedDynamicTexture } from '@babylonjs/gui';

@RegisterSystem()
export class AddButtonInitSystem extends IterativeSystem {
  public constructor() {
    super((entity) => entity.hasComponent(AddButtonComponent));
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const addButtonComponent = entity.get(AddButtonComponent)!;
    if (
      addButtonComponent.initializationStatus === InitializationStatus.Initializing ||
      addButtonComponent.initializationStatus === InitializationStatus.Initialized
    ) {
      return;
    }
    addButtonComponent.initializationStatus = InitializationStatus.Initializing;
    const buttonGui = await this.createButton();
    addButtonComponent.initializationStatus = InitializationStatus.Initialized;
  }

  private async createButton() {
    const advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('GUI');
    const loadedButton = await advancedTexture.parseFromSnippetAsync('#075NTA');
  }
}
