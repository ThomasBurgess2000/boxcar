import { InitializationStatus } from '../utils/types';

export class TreeComponent {
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  public masterTreeInitializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  constructor() {}
}
