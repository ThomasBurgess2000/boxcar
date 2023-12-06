/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { ArcRotateCamera, Engine, HemisphericLight, MeshBuilder, Scene, Vector3 } from '@babylonjs/core';
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
  // createDemoTrack();
  // createStraightTrack();
  createTrackWithGradual90Turn();
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

function createTrackWithGradual90Turn() {
  let currentPoint;
  const points = [];
  const n = 100;
  const railLength = 0.5;

  for (let i = 0; i < n; i++) {
    points.push(new Vector3(i * railLength, 2, 0));
  }
  currentPoint = points[points.length - 1];

  // Gradual 90 degree turn that follows a curve
  const r = 30;
  const curveStartX = currentPoint.x + railLength;
  const curveStartZ = currentPoint.z - r;
  for (let i = 0; i < 105; i++) {
    points.push(
      new Vector3(curveStartX + r * Math.sin((i * Math.PI) / (2 * n)), currentPoint.y, curveStartZ + r * Math.cos((i * Math.PI) / (2 * n))),
    );
  }

  const section: Section = new Section(0);
  const section2: Section = new Section(100);

  const sections = [section, section2];

  const ecsEngine = EcsEngine.getInstance();
  const entity = new Entity();
  const trackComponent = new TrackComponent(points, sections);
  entity.add(trackComponent);
  ecsEngine.addEntity(entity);
}
