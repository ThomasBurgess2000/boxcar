/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { initSystems } from './startup/systemRegistration';
import { ArcRotateCamera, Color3, Color4, Engine, Mesh, PointLight, Scene, Vector3 } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { EcsEngine } from './singletons/ecsEngine';
import { Section, TrackComponent } from './components/track.component';
import { Entity } from 'tick-knock';
import { LocomotiveComponent } from './components/locomotive.component';
import '@babylonjs/loaders/glTF';
import { TreeComponent } from './components/tree.component';
import { PositionComponent } from './components/position.component';

export let scene: Scene;

export async function startGame() {
  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Create a basic scene
  scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = Color4.FromColor3(Color3.Black());
  Inspector.Show(scene, {});

  const camera = new ArcRotateCamera('camera', 9.44, 1.575, 0.1, new Vector3(0, 0, 0), scene);
  camera.attachControl(canvas, true);
  // const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);
  const pointLight = new PointLight('pointLight', new Vector3(0, 20, 10), scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const ecsEngine = EcsEngine.getInstance();
  await initSystems();
  scene.onBeforeRenderObservable.add(() => {
    ecsEngine.update(engine.getDeltaTime() / 1000);
  });

  const trackSections = ['straight', 'straight', 'straight', 'left', 'straight'];
  const trackComponent = createTrack(trackSections);
  createLocomotive(trackComponent);

  // Make a bunch of trees
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 3; j++) {
      const treeEntity = new Entity();
      const treeComponent = new TreeComponent();
      treeEntity.add(treeComponent);
      const randomDistanceVariation = Math.random() * 10;
      const distanceFromTrack = 5;
      const positionComponent = new PositionComponent({
        x: i * 10 + randomDistanceVariation,
        y: 0,
        z: j * 10 + randomDistanceVariation + distanceFromTrack,
      });
      treeEntity.add(positionComponent);
      ecsEngine.addEntity(treeEntity);
    }
  }

  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 3; j++) {
      const treeEntity = new Entity();
      const treeComponent = new TreeComponent();
      treeEntity.add(treeComponent);
      const randomDistanceVariation = Math.random() * 10;
      const distanceFromTrack = 15;
      const positionComponent = new PositionComponent({
        x: i * 10 + randomDistanceVariation,
        y: 0,
        z: j * -10 + randomDistanceVariation - distanceFromTrack,
      });
      treeEntity.add(positionComponent);
      ecsEngine.addEntity(treeEntity);
    }
  }
}

function addCurveSection(points: Vector3[], turnDirection: 'left' | 'right', turnAngle: number): Vector3[] {
  const currentPoint = points[points.length - 1];
  // Calculate the direction of the last segment
  let secondLastPoint = points[points.length - 2];
  let lastDirection = currentPoint.subtract(secondLastPoint).normalize();

  const initialAngle = Math.atan2(lastDirection.z, lastDirection.x);

  const turnAngleRadians = (turnAngle * Math.PI) / 180;

  // ratio of number of points to the turn angle is ~105:90
  const ratio = 105 / 90;

  const r = 30;
  const curvePoints = Math.round(ratio * Math.abs(turnAngle));

  let newPoints: Vector3[] = [];

  for (let i = 1; i < curvePoints; i++) {
    // Angle in radians for each point in the curve
    let angle = turnAngleRadians * (i / curvePoints);
    let dx = r * Math.sin(angle);
    let dz = r * (1 - Math.cos(angle));

    // flip the direction if turning right
    if (turnDirection === 'left') {
      dz = -dz;
    }

    // Rotate the offsets by the initial angle
    let rotatedDx = dx * Math.cos(initialAngle) - dz * Math.sin(initialAngle);
    let rotatedDz = dx * Math.sin(initialAngle) + dz * Math.cos(initialAngle);

    let newPoint = currentPoint.add(new Vector3(rotatedDx, 0, rotatedDz));
    newPoints.push(newPoint);
  }

  return newPoints;
}

function addStraightSection(points: Vector3[], n: number): Vector3[] {
  let newPoints = [];
  // First section
  if (points.length === 0) {
    for (let i = 0; i < n; i++) {
      newPoints.push(new Vector3(i * 0.5, 0, 0));
    }
  } else {
    const currentPoint = points[points.length - 1];
    // base the direction of the new section on the direction of the last segment
    let secondLastPoint = points[points.length - 2];
    let lastDirection = currentPoint.subtract(secondLastPoint).normalize();

    // Create the new section
    for (let i = 0; i < n; i++) {
      newPoints.push(currentPoint.add(lastDirection.scale((i + 1) * 0.5)));
    }
  }
  return newPoints;
}

function createTrack(trackSections: string[]): TrackComponent {
  const points = [];
  const n = 100;
  const railLength = 0.5;
  let sections = [];

  for (let trackSection of trackSections) {
    const section = new Section(points.length);
    if (trackSection === 'straight') {
      const newPoints = addStraightSection(points, n);
      points.push(...newPoints);
    } else if (trackSection === 'left') {
      const newPoints = addCurveSection(points, 'left', 90);
      points.push(...newPoints);
    } else if (trackSection === 'right') {
      const newPoints = addCurveSection(points, 'right', 90);
      points.push(...newPoints);
    }
    sections.push(section);
  }
  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
  return trackComponent;
}

function createLocomotive(trackComponent: TrackComponent) {
  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const locomotiveComponent = new LocomotiveComponent();
  entity.add(locomotiveComponent);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}
