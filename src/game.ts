/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

import { initSystems } from './startup/systemRegistration';
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  Material,
  Mesh,
  PBRMaterial,
  PointLight,
  Scene,
  SceneLoader,
  ShaderLanguage,
  ShaderMaterial,
  ShaderStore,
  Texture,
  Vector3,
} from '@babylonjs/core';
import { Inspector } from '@babylonjs/inspector';
import { EcsEngine } from './ecsEngine';
import { Section, TrackComponent } from './components/track.component';
import { Entity } from 'tick-knock';
import { LocomotiveComponent } from './components/locomotive.component';
import '@babylonjs/loaders/glTF';

export async function startGame() {
  ShaderStore.ShadersStore['customVertexShader'] = `
    attribute vec3 position;
    attribute vec2 uv;
    attribute vec3 normal;

    #include<instancesDeclaration>
    uniform mat4 view;
    uniform float u_effectBlend;
    uniform float u_remap;
    uniform float u_normalize;
    uniform mat4 projection;

    varying vec2 vUV;
    varying vec3 vPositionW;
    varying vec3 vNormalW;

    float inverseLerp(float v, float minValue, float maxValue) {
      return (v - minValue) / (maxValue - minValue);
    }

    float remap(float v, float inMin, float inMax, float outMin, float outMax) {
      float t = inverseLerp(v, inMin, inMax);
      return mix(outMin, outMax, t);
    }

    void main() {
      #include<instancesVertex>
      vec2 vertexOffset = vec2(
        remap(uv.x, 0.0, 1.0, -u_remap, 1.0),
        remap(uv.y, 0.0, 1.0, -u_remap, 1.0)
      );

      vertexOffset *= vec2(-1.0, 1.0);

      if (u_remap == 1.0) {
        vertexOffset = mix(vertexOffset, normalize(vertexOffset), u_normalize);
      }

      vec4 worldPosition = finalWorld * vec4(position, 1.0);
      vPositionW = worldPosition.xyz;

      vNormalW = normalize(vec3(finalWorld * vec4(normal, 0.0)));

      vec4 worldViewPosition = view * finalWorld * vec4(position, 1.0);

      worldViewPosition += vec4(mix(vec3(0.0), vec3(vertexOffset, 1.0), u_effectBlend), 0.0);
      
      vUV = uv;

      gl_Position = projection * worldViewPosition;
    }
  `;

  ShaderStore.ShadersStore['customFragmentShader'] = `
  precision highp float;

  // Varying variables for lighting calculations
  varying vec2 vUV;
  varying vec3 vPositionW;
  varying vec3 vNormalW;

  // Uniforms
  uniform sampler2D textureSampler;
  uniform vec3 u_color;
  uniform vec3 vLightPosition; // Add a light position uniform

  void main(void) {
      // Toon shader thresholds and brightness levels
      float ToonThresholds[4];
      ToonThresholds[0] = 0.95;
      ToonThresholds[1] = 0.5;
      ToonThresholds[2] = 0.2;
      ToonThresholds[3] = 0.03;

      float ToonBrightnessLevels[5];
      ToonBrightnessLevels[0] = 1.0;
      ToonBrightnessLevels[1] = 0.8;
      ToonBrightnessLevels[2] = 0.6;
      ToonBrightnessLevels[3] = 0.35;
      ToonBrightnessLevels[4] = 0.2;

      // Light calculation
      vec3 lightVectorW = normalize(vPositionW - vLightPosition);
      float ndl = max(0., dot(vNormalW, lightVectorW));

      // Apply toon shading
      vec3 color = texture2D(textureSampler, vUV).rgb;
      for (int i = 0; i < 4; i++) {
          if (ndl > ToonThresholds[i]) {
              color *= ToonBrightnessLevels[i];
              break;
          }
      }

      // Original luminance and transparency logic
      float luminance = dot(color, vec3(0.299, 0.587, 0.114));
      if (luminance < 0.75) {
          discard;
      }

      gl_FragColor = vec4(u_color * color, luminance);
  }
  `;

  // Create canvas and engine
  const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement;
  const engine = new Engine(canvas, true);
  window.addEventListener('resize', () => {
    engine.resize();
  });

  // Create a basic scene
  const scene = new Scene(engine);
  scene.useRightHandedSystem = true;
  scene.clearColor = Color4.FromColor3(Color3.Black());
  // Inspector.Show(scene, {});

  const camera = new ArcRotateCamera('camera', 0, 0, 0, new Vector3(0, 2, 0), scene);
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

  // const trackSections = ['straight', 'left', 'right', 'left', 'straight'];
  const trackSections = ['straight', 'left'];
  const trackComponent = createTrack(trackSections);
  // createLocomotive(trackComponent);
  makeTree(scene);
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

async function makeTree(scene: Scene) {
  await SceneLoader.ImportMeshAsync(null, './assets/models/', 'tree.glb').then((result) => {
    const tree = result.meshes[0];
    tree.name = 'tree';
    tree.position = new Vector3(0, 0, 0);

    const shaderMaterial = new ShaderMaterial(
      'shader',
      scene,
      { vertex: 'custom', fragment: 'custom' },
      {
        attributes: ['position', 'uv', 'normal'],
        uniforms: ['view', 'projection', 'vLightPosition', 'u_color'],
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
    shaderMaterial.backFaceCulling = false;
    const foliageColor = new Color3(63 / 255, 109 / 255, 33 / 255);
    shaderMaterial.setColor3('u_color', foliageColor);

    // Set initial uniform values
    shaderMaterial.setFloat('u_remap', 1.0);
    shaderMaterial.setFloat('u_normalize', 1.0);
    shaderMaterial.setFloat('u_effectBlend', 1.0);
    shaderMaterial.setVector3('vLightPosition', new Vector3(0, 20, 10));

    // find the child mesh with the name 'trunk'
    const trunk = tree.getChildMeshes().find((mesh) => mesh.name === 'trunk');
    if (!trunk || !trunk.material) {
      return;
    }
    const trunkPBRMaterial = new PBRMaterial('trunkPBRMaterial', scene);

    // brown
    trunkPBRMaterial.emissiveColor = new Color3(0.3, 0.2, 0.1);
    trunkPBRMaterial.emissiveIntensity = 0.13;
    trunkPBRMaterial.metallic = 0.1; // Low metallic value for non-metal surfaces
    trunkPBRMaterial.roughness = 0.8; // Increase roughness to reduce shininess

    trunk.material = trunkPBRMaterial;

    // find the child mesh with the name 'foliage'
    const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage');
    if (!foliage) {
      return;
    }
    foliage.material = shaderMaterial;
  });

  // make instance of tree
  createTreeInstance(scene);
}

function createTreeInstance(scene: Scene) {
  const tree = scene.getMeshByName('tree');
  if (!tree) {
    return;
  }

  const treeInstance = new Mesh('treeInstance', scene);

  const trunk = tree.getChildMeshes().find((mesh) => mesh.name === 'trunk') as Mesh;
  const trunkInstance = trunk.createInstance('trunkInstance');

  const foliage = tree.getChildMeshes().find((mesh) => mesh.name === 'foliage') as Mesh;
  const foliageInstance = foliage.createInstance('foliageInstance');

  foliageInstance.parent = treeInstance;
  trunkInstance.parent = treeInstance;

  treeInstance.position = new Vector3(7, 0, 7);
}
