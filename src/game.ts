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

function createDemoTrack() {
  // Create array of points to describe the curve
  let currentPoint;

  const points = [];
  //Straight section (0)
  let n = 100; // number of points
  let railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(i * railLength, 0, 0));
  }

  currentPoint = points[points.length - 1];

  //Curve up section (1)
  n = 20; // number of points
  let r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos((3 * Math.PI) / 2 + ((i + 1) * Math.PI) / (4 * n)),
        currentPoint.y + r * Math.sin((3 * Math.PI) / 2 + ((i + 1) * Math.PI) / (4 * n)) + r,
        0,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Straight up section (2)
  n = 100; // number of points
  railLength = 0.3;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(currentPoint.x + (i + 1) * railLength, currentPoint.y + (i + 1) * railLength, 0));
  }

  currentPoint = points[points.length - 1];

  //Curve to flat section (3)
  n = 20; // number of points
  r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos((3 * Math.PI) / 4 - ((i + 1) * Math.PI) / (4 * n)) + r / Math.sqrt(2),
        currentPoint.y + r * Math.sin((3 * Math.PI) / 4 - ((i + 1) * Math.PI) / (4 * n)) - r / Math.sqrt(2),
        0,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Curve to change direction (4)
  n = 40; // number of points
  r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos((3 * Math.PI) / 2 + ((i + 1) * Math.PI) / (2 * n)),
        currentPoint.y,
        currentPoint.z + r * Math.sin((3 * Math.PI) / 2 + ((i + 1) * Math.PI) / (2 * n)) + r,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Straight section (5)
  n = 100; // number of points
  railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(currentPoint.x, currentPoint.y, currentPoint.z + (i + 1) * railLength));
  }

  currentPoint = points[points.length - 1];

  //Curve to change direction (6)
  n = 40; // number of points
  r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos(((i + 1) * Math.PI) / (2 * n)) - r,
        currentPoint.y,
        currentPoint.z + r * Math.sin(((i + 1) * Math.PI) / (2 * n)),
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Curve down (7)
  n = 60; // number of points
  railLength = 0.35;
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x - (i + 1) * railLength,
        currentPoint.y - ((i + 1) * (i + 1) * railLength * railLength) / 20,
        currentPoint.z,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Curve up (8)
  n = 120; // number of points
  railLength = 0.35;
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x - (i + 1) * railLength,
        currentPoint.y + (((44 - i) * (44 - i) - 45 * 45) * railLength * railLength) / 20,
        currentPoint.z,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Curve up (9)
  n = 44; // number of points
  railLength = 0.35;
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x - (i + 1) * railLength,
        currentPoint.y - (((44 - i) * (44 - i) - 45 * 45) * railLength * railLength) / 20,
        currentPoint.z,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Straight section (10)
  n = 100; // number of points
  railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(currentPoint.x - (i + 1) * railLength, currentPoint.y, currentPoint.z));
  }

  currentPoint = points[points.length - 1];

  //Semi circle section (11)
  n = 160; // number of points
  r = 35; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos(Math.PI / 2 + ((i + 1) * Math.PI) / n),
        currentPoint.y,
        currentPoint.z + r * Math.sin(Math.PI / 2 + ((i + 1) * Math.PI) / n) - r,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //curve down (12)
  n = 30; // number of points
  r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos(Math.PI / 2 - ((i + 1) * 3 * Math.PI) / (8 * n)),
        currentPoint.y + r * Math.sin(Math.PI / 2 - ((i + 1) * 3 * Math.PI) / (8 * n)) - r,
        currentPoint.z,
      ),
    );
  }

  currentPoint = points[points.length - 1];

  //Straight section (13)
  n = 71; // number of points
  railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(currentPoint.x + ((i + 1) * railLength) / 3, currentPoint.y - (i + 1) * railLength, currentPoint.z));
  }

  currentPoint = points[points.length - 1];

  //curve down (14)
  n = 30; // number of points
  r = 10; //radius
  for (let i = 0; i < n; i++) {
    points.push(
      new Vector3(
        currentPoint.x + r * Math.cos((9 * Math.PI) / 8 + ((i + 1) * 3 * Math.PI) / (8 * n)) + r * Math.cos(Math.PI / 8),
        currentPoint.y + r * Math.sin((9 * Math.PI) / 8 + ((i + 1) * 3 * Math.PI) / (8 * n)) + r * Math.sin(Math.PI / 8),
        currentPoint.z,
      ),
    );
  }
  currentPoint = points[points.length - 1];

  //Close gap (15)
  n = 8; // number of points
  railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(currentPoint.x + (i + 1) * railLength, currentPoint.y - ((i + 1) * railLength) / 10, currentPoint.z));
  }

  currentPoint = points[points.length - 1];
  points.push(points[0]); // push to close path

  points.pop(); // remove for car directions

  // create dots at points
  for (let i = 0; i < points.length; i++) {
    const sphere = MeshBuilder.CreateSphere('', { diameter: 0.1 });
    sphere.position = points[i];
  }

  const options0 = {
    turnWaves: 2,
    turnWaveAngle: Math.PI / 2,
  };

  const options11 = {
    lean: Math.PI / 2,
  };

  const options12 = {
    lean: Math.PI / 2,
  };

  const options13 = {
    leanTwists: 2,
  };

  const section0: Section = new Section(0, options0);
  const section1: Section = new Section(100);
  const section2: Section = new Section(120);
  const section3: Section = new Section(220);
  const section4: Section = new Section(240);
  const section5: Section = new Section(280);
  const section6: Section = new Section(380);
  const section7: Section = new Section(420);
  const section8: Section = new Section(480);
  const section9: Section = new Section(600);
  const section10: Section = new Section(644);
  const section11: Section = new Section(744, options11);
  const section12: Section = new Section(904, options12);
  const section13: Section = new Section(934, options13);
  const section14: Section = new Section(1026);
  const section15: Section = new Section(1034);

  const sections = [
    section0,
    section1,
    section2,
    section3,
    section4,
    section5,
    section6,
    section7,
    section8,
    section9,
    section10,
    section11,
    section12,
    section13,
    section14,
    section15,
  ];

  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}

function createStraightTrack() {
  let currentPoint;

  const points = [];

  const n = 100;
  const railLength = 0.5;
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(i * railLength, 2, 0));
  }
  currentPoint = points[points.length - 1];

  const section: Section = new Section(0);
  const section2: Section = new Section(50);

  const sections = [section, section2];

  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}

function createTrackWithTurn(turnDirection: 'left' | 'right', turnAngle: number) {
  const points = [];
  const n = 100;
  const railLength = 0.5;

  const section = new Section(points.length);
  for (let i = 0; i < n; i++) {
    points.push(new Vector3(i * railLength, 2, 0));
  }

  const section2 = new Section(points.length);
  const newPoints = addCurveSection(points, turnDirection, 90);
  points.push(...newPoints);

  const section3 = new Section(points.length);
  const newPoints2 = addCurveSection(points, turnDirection, 90);
  points.push(...newPoints2);

  const section4 = new Section(points.length);
  const newPoints3 = addCurveSection(points, turnDirection, 90);
  points.push(...newPoints3);

  const sections = [section, section2, section3, section4];

  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}

function addCurveSection(points: Vector3[], turnDirection: 'left' | 'right', turnAngle: number): Vector3[] {
  const currentPoint = points[points.length - 1];
  // Calculate the direction of the last segment
  let secondLastPoint = points[points.length - 2];
  let lastDirection = currentPoint.subtract(secondLastPoint).normalize();

  const initialAngle = Math.atan2(lastDirection.z, lastDirection.x);

  const turnAngleRadians = (turnAngle * Math.PI) / 180;

  // ratio of number of points to the turn angle is 105:90
  // TODO: This migh need to be a multiple of 5
  const ratio = 105 / 90;

  const r = 30;
  const curvePoints = Math.round(ratio * Math.abs(turnAngle));

  let newPoints: Vector3[] = [];

  for (let i = 0; i < curvePoints; i++) {
    // Angle in radians for each point in the curve
    let angle = turnAngleRadians * (i / curvePoints);
    console.log(i, turnAngle * (i / curvePoints));
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
  // First section
  if (points.length === 0) {
    for (let i = 0; i < n; i++) {
      points.push(new Vector3(i * 0.5, 0, 0));
    }
  } else {
    const currentPoint = points[points.length - 1];
    // base the direction of the new section on the direction of the last segment
    let secondLastPoint = points[points.length - 2];
    let lastDirection = currentPoint.subtract(secondLastPoint).normalize();

    // Create the new section
    for (let i = 0; i < n; i++) {
      points.push(currentPoint.add(lastDirection.scale((i + 1) * 0.5)));
    }
  }
  return points;
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
