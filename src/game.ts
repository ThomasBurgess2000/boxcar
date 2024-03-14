/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { initSystems } from './startup/systemRegistration';
import { ArcRotateCamera, Color3, Color4, Engine, HavokPlugin, HemisphericLight, Scene, UniversalCamera, Vector3 } from '@babylonjs/core';
import { EcsEngine } from './singletons/ecsEngine';
import { TrackComponent } from './components/track.component';
import { Entity } from 'tick-knock';
import { LocomotiveComponent } from './components/locomotive/locomotive.component';
import '@babylonjs/loaders/glTF';
import { LocomotiveInputComponent } from './components/locomotive/locomotiveInput.component';
import { KeysComponent } from './components/keys.component';
import { CarComponent } from './components/locomotive/car.component';
import { DynamicTerrainComponent } from './components/dynamicTerrain.component';
import { Inspector } from '@babylonjs/inspector';
import { MapComponent } from './components/map.component';
import { InitializationStatus } from './utils/types';
import HavokPhysics from '@babylonjs/havok';
import { PlayerCapsuleComponent } from './components/player/playerCapsule.component';

export let scene: Scene;
export const MAX_VIEW_DISTANCE = 300;

export async function startGame() {
  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = Color4.FromColor3(new Color3(0 / 255, 221 / 255, 255 / 255));
  scene.fogMode = Scene.FOGMODE_LINEAR;
  scene.fogColor = Color3.White();
  scene.fogStart = 400;
  scene.fogEnd = 500;
  Inspector.Show(scene, {});

  // const camera = new UniversalCamera('camera', new Vector3(0, 0, 0), scene);
  const camera = new ArcRotateCamera('camera', 9.44, 1.575, 0.1, new Vector3(0, 0, 0), scene);
  camera.upperRadiusLimit = 500;
  camera.lowerRadiusLimit = 0;
  camera.maxZ = MAX_VIEW_DISTANCE;
  camera.attachControl(canvas, true);
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const havokInstance = await HavokPhysics();
  const havokPlugin = new HavokPlugin(true, havokInstance);
  scene.enablePhysics(new Vector3(0, -9.81, 0), havokPlugin);

  const ecsEngine = EcsEngine.getInstance();
  await initSystems();
  scene.onBeforeRenderObservable.add(() => {
    ecsEngine.update(engine.getDeltaTime() / 1000);
  });

  // Track initialization might be moved to be part of the map system...dynamic terrain, trees, track, etc. are all interconected and depend on each other
  const trackSections = [
    's',
    's',
    's',
    's',
    's',
    'l',
    's',
    'r',
    's',
    's',
    's',
    's',
    'r',
    's',
    'l',
    'l',
    's',
    'r',
    's',
    'r',
    's',
    's',
    'l',
    's',
    's',
    's',
  ];
  const trackComponent = createTrack(trackSections);
  while (trackComponent.initializationStatus !== InitializationStatus.Initialized) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const dynamicTerrainComponent = makeDynamicTerrain(trackComponent.points);
  createLocomotive(trackComponent);
  makeMap(dynamicTerrainComponent);

  createPlayer();
}

function createTrack(trackSections: string[]): TrackComponent {
  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(trackSections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
  return trackComponent;
}

function createLocomotive(trackComponent: TrackComponent) {
  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const locomotiveComponent = new LocomotiveComponent();
  entity.add(locomotiveComponent);
  const car1 = new CarComponent(40);
  entity.append(car1);
  const car2 = new CarComponent(80);
  entity.append(car2);
  const locomotiveInputComponent = new LocomotiveInputComponent();
  entity.add(locomotiveInputComponent);
  const keysComponent = new KeysComponent();
  entity.add(keysComponent);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}

function makeDynamicTerrain(flatPoints: Vector3[] = []): DynamicTerrainComponent {
  const ecsEngine = EcsEngine.getInstance();
  const dynamicTerrainEntity = new Entity();
  const dynamicTerrainComponent = new DynamicTerrainComponent(flatPoints);
  dynamicTerrainEntity.add(dynamicTerrainComponent);
  ecsEngine.addEntity(dynamicTerrainEntity);
  return dynamicTerrainComponent;
}

function makeMap(dynamicTerrainComponent: DynamicTerrainComponent) {
  const ecsEngine = EcsEngine.getInstance();
  const mapEntity = new Entity();
  const mapComponent = new MapComponent(dynamicTerrainComponent, true);
  mapEntity.add(mapComponent);
  ecsEngine.addEntity(mapEntity);
}

function createPlayer() {
  const ecsEngine = EcsEngine.getInstance();
  const playerEntity = new Entity();
  const playerCapsuleComponent = new PlayerCapsuleComponent();
  playerEntity.add(playerCapsuleComponent);
  ecsEngine.addEntity(playerEntity);
}
