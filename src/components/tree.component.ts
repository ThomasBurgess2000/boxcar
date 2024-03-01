import { TransformNode } from '@babylonjs/core';
import { InitializationStatus } from '../utils/types';

export class TreeComponent {
  public treeInstance: TransformNode | null = null;
  public initializationStatus: InitializationStatus = InitializationStatus.NotInitialized;
  constructor() {}
}
