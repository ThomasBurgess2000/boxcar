import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { InitializationStatus } from '../../utils/types';
import {
  ArcRotateCamera,
  Mesh,
  MeshBuilder,
  PhysicsAggregate,
  PhysicsShapeType,
  SubMesh,
  Vector3,
  VertexBuffer,
  VertexData,
} from '@babylonjs/core';
import { MAX_VIEW_DISTANCE, scene } from '../../game';

const RADIUS_OF_PHYSICS_AGGREGATE = 30;

@RegisterSystem()
export class DynamicTerrainColliderSystem extends IterativeSystem {
  public constructor() {
    super((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
    const centerMarker = MeshBuilder.CreateBox('centerMarker', { size: 1 }, scene);
  }

  protected async updateEntity(entity: Entity): Promise<void> {
    const dynamicTerrainComponent = entity.get(DynamicTerrainComponent)!;
    if (dynamicTerrainComponent.initializationStatus !== InitializationStatus.Initialized) {
      return;
    }

    const terrainMesh = dynamicTerrainComponent.dynamicTerrain?.mesh;

    if (!terrainMesh) {
      return;
    }

    const camera = scene.activeCamera as ArcRotateCamera;

    if (!camera) {
      return;
    }

    if (!dynamicTerrainComponent.physicsMesh && !dynamicTerrainComponent.physicsAggregateInitializing) {
      console.log('Creating physics aggregate', dynamicTerrainComponent.physicsMesh, dynamicTerrainComponent.physicsAggregateInitializing);
      dynamicTerrainComponent.physicsAggregateInitializing = true;
      const result = this.createPhysicsAggregate(terrainMesh, camera.globalPosition.clone(), RADIUS_OF_PHYSICS_AGGREGATE);
      dynamicTerrainComponent.physicsMesh = result.physicsMeshClone;
      dynamicTerrainComponent.currentPhysicsCenter = result.centerPosition;
      dynamicTerrainComponent.physicsAggregateInitializing = false;
    } else if (
      dynamicTerrainComponent.physicsMesh &&
      !dynamicTerrainComponent.physicsAggregateInitializing &&
      dynamicTerrainComponent.currentPhysicsCenter
    ) {
      const center = dynamicTerrainComponent.currentPhysicsCenter;
      const correctedAggregateCenter = new Vector3(center.x, center.y, center.z);
      correctedAggregateCenter.x -= MAX_VIEW_DISTANCE;
      correctedAggregateCenter.z -= MAX_VIEW_DISTANCE;
      // get the distance from the camera to the center of the physics aggregate in the xz plane
      const distance = Vector3.Distance(
        new Vector3(camera.globalPosition.clone().x, 0, camera.globalPosition.clone().z),
        new Vector3(correctedAggregateCenter.x, 0, correctedAggregateCenter.z),
      );
      const centerMarker = scene.getMeshByName('centerMarker') as Mesh;
      centerMarker.position = correctedAggregateCenter;
      console.log(correctedAggregateCenter, camera.globalPosition.clone(), distance);
      if (distance > RADIUS_OF_PHYSICS_AGGREGATE / 2 - 1) {
        console.log('making new physics aggregate');
        dynamicTerrainComponent.physicsAggregateInitializing = true;
        const previousPhysicsMesh = dynamicTerrainComponent.physicsMesh;
        const result = this.createPhysicsAggregate(terrainMesh, camera.globalPosition.clone(), RADIUS_OF_PHYSICS_AGGREGATE);
        dynamicTerrainComponent.physicsMesh = result.physicsMeshClone;
        dynamicTerrainComponent.currentPhysicsCenter = result.centerPosition;
        previousPhysicsMesh?.dispose();
        dynamicTerrainComponent.physicsAggregateInitializing = false;
      }
    }
  }

  private createPhysicsAggregate(
    terrainMesh: Mesh,
    cameraPosition: Vector3,
    radius: number,
  ): { physicsMeshClone: Mesh; centerPosition: Vector3 } {
    // Create an empty array to store the vertices and indices within the specified radius
    const verticesWithinRadius: number[] = [];
    const indicesWithinRadius: number[] = [];

    cameraPosition.x += MAX_VIEW_DISTANCE;
    cameraPosition.z += MAX_VIEW_DISTANCE;

    // Get the vertices positions and indices from the original mesh
    const positions = terrainMesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = terrainMesh.getIndices();

    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    let count = 0;

    if (positions && indices) {
      // Create a map to store the new indices for the vertices within the radius
      const indexMap = new Map<number, number>();

      // Iterate through the indices to find the vertices within the specified radius
      for (let i = 0; i < indices.length; i += 3) {
        const index1 = indices[i];
        const index2 = indices[i + 1];
        const index3 = indices[i + 2];

        const position1 = new Vector3(positions[index1 * 3], positions[index1 * 3 + 1], positions[index1 * 3 + 2]);
        const position2 = new Vector3(positions[index2 * 3], positions[index2 * 3 + 1], positions[index2 * 3 + 2]);
        const position3 = new Vector3(positions[index3 * 3], positions[index3 * 3 + 1], positions[index3 * 3 + 2]);

        const distance1 = Vector3.Distance(new Vector3(cameraPosition.x, 0, cameraPosition.z), new Vector3(position1.x, 0, position1.z));
        const distance2 = Vector3.Distance(new Vector3(cameraPosition.x, 0, cameraPosition.z), new Vector3(position2.x, 0, position2.z));
        const distance3 = Vector3.Distance(new Vector3(cameraPosition.x, 0, cameraPosition.z), new Vector3(position3.x, 0, position3.z));

        if (distance1 <= radius && distance2 <= radius && distance3 <= radius) {
          // Add the indices to the array if all three vertices of the face are within the radius
          [index1, index2, index3].forEach((originalIndex) => {
            if (!indexMap.has(originalIndex)) {
              // Add a new index for the vertex within the radius
              const newIndex = verticesWithinRadius.length / 3;
              indexMap.set(originalIndex, newIndex);
              verticesWithinRadius.push(positions[originalIndex * 3], positions[originalIndex * 3 + 1], positions[originalIndex * 3 + 2]);

              sumX += positions[originalIndex * 3];
              sumY += positions[originalIndex * 3 + 1];
              sumZ += positions[originalIndex * 3 + 2];
              count++;
            }
            const indexWithinRadius = indexMap.get(originalIndex);
            if (indexWithinRadius !== undefined) {
              indicesWithinRadius.push(indexWithinRadius);
            }
          });
        }
      }
    }

    // Create a new mesh with the vertices and indices within the specified radius
    const physicsMeshClone = new Mesh('terrainPhysicsMesh', scene);
    const vertexData = new VertexData();
    vertexData.positions = verticesWithinRadius;
    vertexData.indices = indicesWithinRadius;
    vertexData.applyToMesh(physicsMeshClone);
    physicsMeshClone.position = terrainMesh.position.clone();

    // Create the physics aggregate for the new mesh
    const physicsAggregate = new PhysicsAggregate(physicsMeshClone, PhysicsShapeType.MESH, { mass: 0 });
    physicsMeshClone.setEnabled(false);
    const centerPosition = new Vector3(sumX / count, sumY / count, sumZ / count);
    return { physicsMeshClone, centerPosition };
  }
}
