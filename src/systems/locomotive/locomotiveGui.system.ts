import { AdvancedDynamicTexture, Control, TextBlock } from '@babylonjs/gui';
import { Entity, IterativeSystem } from 'tick-knock';
import { RegisterSystem } from '../../startup/systemRegistration';
import { LocomotiveComponent } from '../../components/locomotive/locomotive.component';

@RegisterSystem()
export class LocomotiveGuiSystem extends IterativeSystem {
  private guiTexture!: AdvancedDynamicTexture;
  private speedText!: TextBlock;

  public constructor() {
    super((entity: Entity) => entity.hasComponent(LocomotiveComponent));
    this.initGui();
  }

  private initGui() {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI');
    this.speedText = new TextBlock();
    this.speedText.width = 0.2;
    this.speedText.height = '40px';
    this.speedText.color = 'black';
    this.speedText.fontSize = 24;
    this.speedText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.speedText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.speedText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.speedText.paddingRight = '20px';
    this.guiTexture.addControl(this.speedText);
  }

  protected updateEntity(entity: Entity): void {
    const locomotiveComponent = entity.get(LocomotiveComponent)!;
    const speedMs = locomotiveComponent.speed;
    const speedMph = speedMs * 2.23694;
    this.speedText.text = `Speed: ${speedMph.toFixed(2)} mph`;
  }
}
