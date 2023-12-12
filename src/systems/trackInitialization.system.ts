import { Entity, IterativeSystem } from 'tick-knock';
import { Section, TrackComponent } from '../components/track.component';
import { Axis, Matrix, MeshBuilder, Quaternion, StandardMaterial, Vector3 } from '@babylonjs/core';

export class TrackInitializationSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(TrackComponent));
  }

  protected updateEntity(entity: Entity): void {
    const trackComponent = entity.get(TrackComponent)!;
    const { points, sections } = trackComponent;
    if (trackComponent.initialized || trackComponent.initializing) return;
    trackComponent.initializing = true;
    const track = this.createTrack(points, sections);
    this.createMeshes(track, points);

    trackComponent.initialized = true;
  }

  private createTrack(points: Vector3[], sections: Section[]) {
    let nbSections = sections.length;

    const looped = sections[nbSections - 1].start === 0;
    const loopedNum = looped ? 1 : 0;
    for (let i = 1; i < nbSections - loopedNum; i++) {
      if (sections[i - 1].start > sections[i].start) {
        console.error('sections not in order');
        return;
      }
    }

    if (0 < sections[nbSections - 1].start && sections[nbSections - 2].start > sections[nbSections - 1].start) {
      console.error('last section not in order');
      return;
    }

    let section = sections[0];
    if (section.start > 0) {
      const startSection: Section = new Section(0);
      sections.unshift(startSection);
      nbSections = sections.length;
    }

    // assumes need to close loop
    // if (0 < sections[nbSections - 1].start && sections[nbSections - 1].start < points.length - 1) {
    //   const endSection: Section = { start: 0, options: sections[0].options };
    //   sections.push(endSection);
    // }

    let directions: Vector3[] = [];
    let rotations: Matrix[] = [];
    let carriageRotations: Matrix[] = [];
    let passengerRotations: Matrix[] = [];
    for (let i = 0; i < sections.length; i++) {
      ({ directions, rotations, carriageRotations, passengerRotations } = this.createSection(
        points,
        sections[i],
        sections[i + 1] || sections[i],
        directions,
        rotations,
        carriageRotations,
        passengerRotations,
      ));
    }
    return { directions, rotations, carriageRotations, passengerRotations };
  }

  private createSection(
    points: Vector3[],
    startSection: Section,
    endSection: Section,
    directions: Vector3[],
    rotations: Matrix[],
    carriageRotations: Matrix[],
    passengerRotations: Matrix[],
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
      passengerRotations.push(rotationMatrixPassenger.clone());

      rotationMatrix.multiplyToRef(rotationMatrixLean, rotation);
      carriageRotations.push(rotation.clone());
      rotation.multiplyToRef(rotationMatrixTurn, rotation);
      rotations.push(rotation.clone());

      directions.push(railDirection.clone());
    }
    return { directions, rotations, carriageRotations, passengerRotations };
  }

  private createMeshes(track: ReturnType<TrackInitializationSystem['createTrack']>, points: Vector3[]) {
    if (!track) {
      console.error('no track!');
      return;
    }
    const normal = Vector3.Zero();
    const binormal = Vector3.Zero();

    const offset = 0.9;
    const height = -0.35;
    const plusPoints = [];
    const negPoints = [];

    const sleeper = MeshBuilder.CreateBox('', { width: 0.5, height: 0.25, depth: 2.5 });
    sleeper.material = new StandardMaterial('');
    sleeper.position.y = -0.5;

    for (let i = 0; i < points.length; i += 5) {
      Vector3.TransformNormalToRef(Axis.Y, track.carriageRotations[i], normal);
      Vector3.TransformNormalToRef(Axis.Z, track.carriageRotations[i], binormal);
      plusPoints.push(points[i].add(binormal.scale(offset)).add(normal.scale(height)));
      negPoints.push(points[i].subtract(binormal.scale(offset)).add(normal.scale(height)));

      const nsleeper = sleeper.createInstance('');

      nsleeper.position.x = points[i].x;
      nsleeper.position.y = points[i].y;
      nsleeper.position.z = points[i].z;

      nsleeper.rotationQuaternion = Quaternion.FromRotationMatrix(track.carriageRotations[i]);
      nsleeper.position.subtractInPlace(normal.scale(0.5));
      nsleeper.freezeWorldMatrix();
    }

    const closedLoop = points[0].equals(points[points.length - 1]);

    if (closedLoop) {
      console.log('here');
      plusPoints.push(plusPoints[0]);
      negPoints.push(negPoints[0]);
    }
    console.log(negPoints);

    const plusTube = MeshBuilder.CreateTube('tube', { path: plusPoints, radius: 0.1, tessellation: 4 });
    const negTube = MeshBuilder.CreateTube('tube', { path: negPoints, radius: 0.1, tessellation: 4 });

    plusTube.freezeWorldMatrix();
    negTube.freezeWorldMatrix();
  }
}
