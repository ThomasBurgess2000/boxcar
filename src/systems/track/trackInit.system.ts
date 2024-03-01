import { Entity, IterativeSystem } from 'tick-knock';
import { Section, TrackComponent } from '../../components/track.component';
import { Axis, Matrix, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import { InitializationStatus } from '../../utils/types';
import { RegisterSystem } from '../../startup/systemRegistration';
import { scene } from '../../game';

const TRACK_HEIGHT = 0.5;

@RegisterSystem()
export class TrackInitSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(TrackComponent));
  }

  protected updateEntity(entity: Entity): void {
    const trackComponent = entity.get(TrackComponent)!;
    if (trackComponent.initializationStatus !== InitializationStatus.NotInitialized) {
      return;
    }

    trackComponent.initializationStatus = InitializationStatus.Initializing;
    const trackComponentDefinition = trackComponent.trackDefinition;
    const { points, sections } = this.createPointsAndSections(trackComponentDefinition);
    trackComponent.points = points;
    trackComponent.sections = sections;
    const track = this.createTrack(trackComponent.points, trackComponent.sections);
    this.createMeshes(track, trackComponent.points);

    trackComponent.rotations = track.rotations.map(Quaternion.FromRotationMatrix);
    trackComponent.initializationStatus = InitializationStatus.Initialized;
  }

  private getParentNode(): TransformNode {
    if (scene.getTransformNodeByName('trackParent')) {
      return scene.getTransformNodeByName('trackParent')!;
    }
    const node = new TransformNode('trackParent');
    return node;
  }

  private createPointsAndSections(trackDefinition: string[]): { points: Vector3[]; sections: Section[] } {
    const points = [];
    const n = 100;
    let sections: Section[] = [];

    for (let trackSection of trackDefinition) {
      const section = new Section(points.length);
      if (trackSection === 'straight' || trackSection === 'w' || trackSection === 's') {
        const newPoints = this.addStraightSection(points, n);
        points.push(...newPoints);
      } else if (trackSection === 'left' || trackSection === 'a' || trackSection === 'l') {
        const newPoints = this.addCurveSection(points, 'left', 90);
        points.push(...newPoints);
      } else if (trackSection === 'right' || trackSection === 'd' || trackSection === 'r') {
        const newPoints = this.addCurveSection(points, 'right', 90);
        points.push(...newPoints);
      } else {
        console.error('Invalid track section');
      }
      sections.push(section);
    }
    return { points, sections };
  }

  private addCurveSection(points: Vector3[], turnDirection: 'left' | 'right', turnAngle: number): Vector3[] {
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

  private addStraightSection(points: Vector3[], n: number): Vector3[] {
    let newPoints = [];
    // First section
    if (points.length === 0) {
      for (let i = 0; i < n; i++) {
        newPoints.push(new Vector3(i * 0.5, TRACK_HEIGHT, 0));
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

  private createTrack(points: Vector3[], sections: Section[]): TrackData {
    const trackData: TrackData = {
      directions: [],
      rotations: [],
      carriageRotations: [],
      passengerRotations: [],
    };

    this.validateAndPrepareSections(sections, points);

    sections.forEach((section, i) => {
      const nextSection = sections[i + 1] || sections[i];
      this.createSection(points, section, nextSection, trackData);
    });

    return trackData;
  }

  private validateAndPrepareSections(sections: Section[], points: Vector3[]): void {
    const looped = sections[sections.length - 1].start === 0;
    const loopedNum = looped ? 1 : 0;
    for (let i = 1; i < sections.length - loopedNum; i++) {
      if (sections[i - 1].start > sections[i].start) {
        console.error('Sections not in order');
        return;
      }
    }

    if (sections[sections.length - 1].start > 0 && sections[sections.length - 2].start > sections[sections.length - 1].start) {
      console.error('Last section not in order');
      return;
    }

    if (sections[0].start > 0) {
      sections.unshift(new Section(0));
    }
  }

  private createSection(
    points: Vector3[],
    startSection: Section,
    endSection: Section,
    trackData: TrackData,
  ): { directions: Vector3[]; rotations: Matrix[]; carriageRotations: Matrix[]; passengerRotations: Matrix[] } {
    const railsFrom = startSection.start;
    let railsTo = endSection.start;
    if (endSection.start === 0 || startSection.start === endSection.start) {
      railsTo = points.length;
    }

    const nbRails = railsTo - railsFrom;

    const initialLean = startSection.options.lean; //lean of carriage about direction axis at start, a phi constiable
    const initialTurn = startSection.options.turn; // turn of carriage around upright at start, a theta constiable
    let leanTwists = startSection.options.leanTwists; //number of  lean twists (+ve counter clockwise, -ve clockwise)
    let leanWaves = startSection.options.leanWaves; //number of lean waves
    const leanWaveAngle = startSection.options.leanWaveAngle; //angle for lean wave
    let turnTwists = startSection.options.turnTwists; //number of  turn twists (+ve counter clockwise, -ve clockwise)
    let turnWaves = startSection.options.turnWaves; //number of turn waves
    const turnWaveAngle = startSection.options.turnWaveAngle; //angle for turn wave

    const finalLean = endSection.options.lean;
    const finalTurn = endSection.options.turn;

    //lean waves supersede lean twists unless leanWaveAngle = 0
    if (leanWaves > 0 && Math.abs(leanTwists) > 0) {
      if (leanWaveAngle == 0) {
        leanWaves = 0;
      } else {
        leanTwists = 0;
      }
    }

    //turn waves supersede turn twists unless turnWaveAngle = 0
    if (turnWaves > 0 && Math.abs(turnTwists) > 0) {
      if (turnWaveAngle == 0) {
        turnWaves = 0;
      } else {
        turnTwists = 0;
      }
    }

    //rail transformation
    const rotationMatrixY = Matrix.Identity();
    const rotationMatrixZ = Matrix.Identity();
    const rotationMatrix = Matrix.Identity();

    let tilt = 0; //of rail rotation about (0, 0, 1) gives gradient
    let swivel = 0; //rotation of rail around (0, 1, 0)

    const deltaPhi = (finalLean + 2 * leanTwists * Math.PI - initialLean) / nbRails; //increase in phi per rail for lean twist
    const deltaTheta = (finalTurn + 2 * turnTwists * Math.PI - initialTurn) / nbRails; //increase in theta per rail for lean twist
    let phi = initialLean;
    let theta = initialTurn;
    const initialRailDirection = Axis.X;
    const initialUprightDirection = Axis.Y;
    const initialLevelDirection = Axis.Z;
    const railDirection = Vector3.Zero();
    const uprightDirection = Vector3.Zero();
    const levelDirection = Vector3.Zero();
    const carriageNormal = Vector3.Zero();
    Vector3.TransformNormalToRef(initialRailDirection, rotationMatrix, railDirection);
    const rotationMatrixLean = Matrix.Identity();
    const rotationMatrixTurn = Matrix.Identity();
    const rotationMatrixPassenger = Matrix.Identity();

    const rotation = Matrix.Identity();
    const gradLean = (finalLean - initialLean) / (nbRails - 1); // lean gradient
    const gradTurn = (finalTurn - initialTurn) / (nbRails - 1); // turn gradient
    let railCount = 0;
    for (let i = railsFrom; i < railsTo; i++) {
      points[(i + 1) % points.length].subtractToRef(points[i], railDirection);
      railDirection.normalize();
      swivel = -Math.atan2(railDirection.z, railDirection.x);
      tilt = Math.atan2(Math.abs(railDirection.y), Math.abs(railDirection.x));
      tilt *= Math.sign(railDirection.y);
      Matrix.RotationAxisToRef(Axis.Y, swivel, rotationMatrixY);
      Matrix.RotationAxisToRef(Axis.Z, tilt, rotationMatrixZ);
      rotationMatrixZ.multiplyToRef(rotationMatrixY, rotationMatrix);
      Vector3.TransformNormalToRef(initialUprightDirection, rotationMatrix, uprightDirection);
      Vector3.TransformNormalToRef(initialLevelDirection, rotationMatrix, levelDirection);
      uprightDirection.normalize();
      levelDirection.normalize();

      if (leanWaves > 0) {
        phi = initialLean + railCount * gradLean + leanWaveAngle * Math.sin((railCount * leanWaves * Math.PI) / (nbRails - 1));
      } else {
        phi += deltaPhi;
      }
      if (turnWaves > 0) {
        theta = initialTurn + railCount * gradTurn + turnWaveAngle * Math.sin((railCount * turnWaves * Math.PI) / (nbRails - 1));
      } else {
        theta += deltaTheta;
      }
      railCount++;
      Matrix.RotationAxisToRef(railDirection, phi, rotationMatrixLean);
      Vector3.TransformNormalToRef(uprightDirection, rotationMatrixLean, carriageNormal);
      Matrix.RotationAxisToRef(carriageNormal, theta, rotationMatrixTurn);

      Matrix.RotationAxisToRef(initialUprightDirection, theta, rotationMatrixPassenger);
      trackData.passengerRotations.push(rotationMatrixPassenger.clone());

      rotationMatrix.multiplyToRef(rotationMatrixLean, rotation);
      trackData.carriageRotations.push(rotation.clone());
      rotation.multiplyToRef(rotationMatrixTurn, rotation);
      trackData.rotations.push(rotation.clone());

      trackData.directions.push(railDirection.clone());
    }
    return trackData;
  }

  private createMeshes(track: ReturnType<TrackInitSystem['createTrack']>, points: Vector3[]) {
    if (!track) {
      console.error('no track!');
      return;
    }
    const trackParent = this.getParentNode();
    const normal = Vector3.Zero();
    const binormal = Vector3.Zero();

    const offset = 0.9;
    const height = -0.35;
    const plusPoints = [];
    const negPoints = [];

    const sleeper = MeshBuilder.CreateBox('sleeper', { width: 0.2286, height: 0.1778, depth: 2.6 });
    sleeper.material = new StandardMaterial('');
    sleeper.position.y = -0.5;
    sleeper.isPickable = false;
    for (let i = 0; i < points.length - 1; i += 1) {
      Vector3.TransformNormalToRef(Axis.Y, track.carriageRotations[i], normal);
      Vector3.TransformNormalToRef(Axis.Z, track.carriageRotations[i], binormal);
      plusPoints.push(points[i].add(binormal.scale(offset)).add(normal.scale(height)));
      negPoints.push(points[i].subtract(binormal.scale(offset)).add(normal.scale(height)));

      const nsleeper = sleeper.createInstance('sleeper' + i);

      nsleeper.position.x = points[i].x;
      nsleeper.position.y = points[i].y;
      nsleeper.position.z = points[i].z;

      nsleeper.rotationQuaternion = Quaternion.FromRotationMatrix(track.carriageRotations[i]);
      nsleeper.position.subtractInPlace(normal.scale(0.5));
      nsleeper.freezeWorldMatrix();
      nsleeper.isPickable = false;
      nsleeper.parent = trackParent;
    }
    sleeper.parent = trackParent;

    const closedLoop = points[0].equals(points[points.length - 1]);

    if (closedLoop) {
      plusPoints.push(plusPoints[0]);
      negPoints.push(negPoints[0]);
    }

    const plusTube = MeshBuilder.CreateTube('tube', { path: plusPoints, radius: 0.1, tessellation: 4 });
    const negTube = MeshBuilder.CreateTube('tube', { path: negPoints, radius: 0.1, tessellation: 4 });
    plusTube.isPickable = false;
    negTube.isPickable = false;
    plusTube.freezeWorldMatrix();
    negTube.freezeWorldMatrix();
    plusTube.parent = trackParent;
    negTube.parent = trackParent;
  }
}

interface TrackData {
  directions: Vector3[];
  rotations: Matrix[];
  carriageRotations: Matrix[];
  passengerRotations: Matrix[];
}
