/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { initSystems } from './startup/systemRegistration';
import {
  Color3,
  Engine,
  HemisphericLight,
  Material,
  Scene,
  SceneLoader,
  ShaderLanguage,
  ShaderMaterial,
  ShaderStore,
  Texture,
  UniversalCamera,
  Vector3,
} from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { EcsEngine } from './ecsEngine';
import { Section, TrackComponent } from './components/track.component';
import { Entity } from 'tick-knock';
import { LocomotiveComponent } from './components/locomotive.component';
import '@babylonjs/loaders/glTF';

export async function startGame() {
  ShaderStore.ShadersStore['customVertexShader'] = `attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

uniform mat4 worldViewProjection;
uniform float u_effectBlend;
uniform float u_inflate;
uniform float u_scale;
uniform float u_windSpeed;
uniform float u_windTime;

varying vec2 vUV;

float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}

float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

mat4 rotateZ(float radians) {
  float c = cos(radians);
  float s = sin(radians);

	return mat4(
    c, -s, 0, 0,
    s, c, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  );
}

vec4 applyWind(vec4 v) {
  float boundedYNormal = remap(normal.y, -1.0, 1.0, 0.0, 1.0);
  float posXZ = position.x + position.z;
  float power = u_windSpeed / 5.0 * -0.5;

  float topFacing = remap(sin(u_windTime + posXZ), -1.0, 1.0, 0.0, power);
  float bottomFacing = remap(cos(u_windTime + posXZ), -1.0, 1.0, 0.0, 0.05);
  float radians = mix(bottomFacing, topFacing, boundedYNormal);

  return rotateZ(radians) * v;
}

vec2 calcInitialOffsetFromUVs() {
  vec2 offset = vec2(
    remap(uv.x, 0.0, 1.0, -1.0, 1.0),
    remap(uv.y, 0.0, 1.0, -1.0, 1.0)
  );

  // Invert the vertex offset so it's positioned towards the camera.
  offset *= vec2(-1.0, 1.0);
  offset = normalize(offset) * u_scale;

  return offset;
}

vec3 inflateOffset(vec3 offset) {
  return offset + normal.xyz * u_inflate;
}

void main() {
  vec2 vertexOffset = calcInitialOffsetFromUVs();

  vec3 inflatedVertexOffset = inflateOffset(vec3(vertexOffset, 0.0));

  vec4 worldViewPosition = worldViewProjection * vec4(position, 1.0);

  worldViewPosition += vec4(mix(vec3(0.0), inflatedVertexOffset, u_effectBlend), 0.0);

  worldViewPosition = applyWind(worldViewPosition);
  
  vUV = uv;

  gl_Position = worldViewPosition;
}
`;

  ShaderStore.ShadersStore['customFragmentShader'] = `precision highp float;

varying vec2 vUV;

uniform sampler2D textureSampler;
uniform vec3 u_color;

void main(void) {
    vec4 texColor = texture2D(textureSampler, vUV);

    float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

    gl_FragColor = vec4(u_color * texColor.rgb, luminance);

    if (luminance < 0.75) {
      discard;
    }
}`;

  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Create a basic scene
  const scene = new Scene(engine);

  Inspector.Show(scene, {});

  const camera = new UniversalCamera('camera', new Vector3(-10, 1.91, -21.74), scene);
  camera.setTarget(new Vector3(10, 2, 16.75));
  camera.attachControl(canvas, true);
  const light = new HemisphericLight('light', new Vector3(0, 1, 0), scene);

  engine.runRenderLoop(() => {
    scene.render();
  });

  const ecsEngine = EcsEngine.getInstance();
  await initSystems();
  scene.onBeforeRenderObservable.add(() => {
    ecsEngine.update(engine.getDeltaTime() / 1000);
  });

  // const trackSections = ['straight', 'left', 'right', 'left', 'straight'];
  const trackSections = ['straight', 'left'];
  const trackComponent = createTrack(trackSections);
  createLocomotive(trackComponent);
  makeTree(scene, engine);
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

function makeTree(scene: Scene, engine: Engine) {
  SceneLoader.ImportMeshAsync(null, './assets/models/', 'tree.glb').then((result) => {
    console.log(result);
    const tree = result.meshes[0];
    tree.position = new Vector3(0, 0, 0);

    const shaderMaterial = new ShaderMaterial(
      'shader',
      scene,
      { vertex: 'custom', fragment: 'custom' },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['world', 'worldView', 'worldViewProjection', 'view', 'projection'],
        uniformBuffers: undefined,
        shaderLanguage: ShaderLanguage.GLSL,
      },
    );

    // Assign the shader material to the mesh
    tree.material = shaderMaterial;

    // Load texture if needed
    const alphaMap = new Texture('https://douges.dev/static/foliage_alpha3.png', scene, false, false, Texture.NEAREST_NEAREST);
    alphaMap.hasAlpha = true;
    shaderMaterial.alphaMode = Material.MATERIAL_ALPHABLEND;
    shaderMaterial.setTexture('textureSampler', alphaMap);
    const foliageColor = new Color3(0.25, 0.45, 0.13);
    shaderMaterial.setColor3('u_color', foliageColor);

    // Set initial uniform values
    shaderMaterial.setFloat('u_effectBlend', 1.0);
    shaderMaterial.setFloat('u_inflate', 0.0);
    shaderMaterial.setFloat('u_scale', 1.0);
    shaderMaterial.setFloat('u_windSpeed', 1.0);
    shaderMaterial.setFloat('u_windTime', 0.0);

    // find the child mesh with the name 'foliage'
    const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage');
    if (!foliage) {
      return;
    }
    foliage.material = shaderMaterial;

    // Update uniforms in the render loop
    // scene.registerBeforeRender(() => {
    //   const delta = engine.getDeltaTime() / 1000;
    //   shaderMaterial.setFloat('u_windTime', shaderMaterial.getFloat('u_windTime') + shaderMaterial.getFloat('u_windSpeed') * delta);
    // });
  });
}
