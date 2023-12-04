/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
import { EcsEngine } from './ecsEngine';

export function startGame() {
  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Create a basic scene
  const scene = new Scene(engine);
  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  // Add a simple sphere
  MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const ecsEngine = EcsEngine.getInstance();
  addSystems();
  scene.onBeforeRenderObservable.add(() => {
    ecsEngine.update(engine.getDeltaTime() / 1000);
  });
}

function addSystems() {
  const ecsEngine = EcsEngine.getInstance();
  // ecsEngine.addSystem(new MovementSystem());
}
