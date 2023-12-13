/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { EcsEngine } from './ecsEngine';
import { Section, TrackComponent } from './components/track.component';
import { Entity } from 'tick-knock';
import { TrackInitializationSystem } from './systems/trackInitialization.system';

export function startGame() {
  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Create a basic scene
  const scene = new Scene(engine);

  // Inspector.Show(scene, {});

  const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 15, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const ecsEngine = EcsEngine.getInstance();
  addSystems();
  scene.onBeforeRenderObservable.add(() => {
    ecsEngine.update(engine.getDeltaTime() / 1000);
  });

  // TODO: Figure out why there's a line from the last point to the first point
  const trackSections = ['straight', 'left', 'right', 'left', 'straight'];
  createTrack(trackSections);
}

function addSystems() {
  const ecsEngine = EcsEngine.getInstance();
  ecsEngine.addSystem(new TrackInitializationSystem());
}

function addCurveSection(points: Vector3[], turnDirection: 'left' | 'right', turnAngle: number): Vector3[] {
  const currentPoint = points[points.length - 1];
  // Calculate the direction of the last segment
  let secondLastPoint = points[points.length - 2];
  let lastDirection = currentPoint.subtract(secondLastPoint).normalize();

  const initialAngle = Math.atan2(lastDirection.z, lastDirection.x);

  const turnAngleRadians = (turnAngle * Math.PI) / 180;

  // ratio of number of points to the turn angle is ~105:90
  // TODO: This might need to be a multiple of 5
  const ratio = 105 / 90;

  const r = 30;
  const curvePoints = Math.round(ratio * Math.abs(turnAngle));

  let newPoints: Vector3[] = [];

  for (let i = 0; i < curvePoints; i++) {
    // Angle in radians for each point in the curve
    let angle = turnAngleRadians * (i / curvePoints);
    let dx = r * Math.sin(angle);
    let dz = r * (1 - Math.cos(angle));

    // flip the direction if turning right
    if (turnDirection === 'right') {
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

function createTrack(trackSections: string[]) {
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
  console.log(points);
  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}
