import { Engine } from 'tick-knock';

export class EcsEngine {
  private static instance: Engine;

  public static getInstance(): Engine {
    if (!EcsEngine.instance) {
      EcsEngine.instance = new Engine();
    }
    return EcsEngine.instance;
  }
}
