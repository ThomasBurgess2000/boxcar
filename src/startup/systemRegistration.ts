import { System } from 'tick-knock';
import { EcsEngine } from '../ecsEngine';
import { SystemRegistry } from './systemRegistry';
import '../systems/index';

export function RegisterSystem<T extends new () => System>() {
  return function (constructor: T) {
    SystemRegistry.push(constructor);
  };
}

function getRegisteredSystems() {
  return SystemRegistry;
}

export async function initSystems() {
  const ecsEngine = EcsEngine.getInstance();
  const systemConstructors = getRegisteredSystems();
  for (const SystemConstructor of systemConstructors) {
    const system = new SystemConstructor();
    ecsEngine.addSystem(system);
  }
}
