import { InitializationStatus } from '../utils/types';

export class InitializationComponent {
  public initializationStatus: InitializationStatus;
  constructor(public componentToInitialize: any) {
    this.initializationStatus = InitializationStatus.NotInitialized;
  }
}
