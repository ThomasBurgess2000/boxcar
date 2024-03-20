import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { InitializationStatus } from '../../utils/types';
import { Mesh, PhysicsAggregate, PhysicsShapeType, PhysicsViewer, Vector3, VertexBuffer, VertexData } from '@babylonjs/core';
import { scene } from '../../game';

const DIAMETER_OF_PHYSICS_AGGREGATE = 100;
const DISTANCE_TO_EDGE = 70;

@RegisterSystem()
export class DynamicTerrainColliderSystem extends IterativeSystem {
  // private _physicsViewer: PhysicsViewer;
  public constructor() {
    super((entity: Entity) => entity.hasComponent(DynamicTerrainComponent));
    // this._physicsViewer = new PhysicsViewer();
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

    const playerCapsule = scene.getMeshByName('player-capsule');
    if (!playerCapsule) {
      return;
    }
    const playerPosition = playerCapsule.getAbsolutePosition();

    if (!dynamicTerrainComponent.physicsMesh && !dynamicTerrainComponent.physicsAggregateInitializing) {
      dynamicTerrainComponent.physicsAggregateInitializing = true;
      const result = this.createPhysicsAggregate(terrainMesh, playerPosition, DIAMETER_OF_PHYSICS_AGGREGATE);
      dynamicTerrainComponent.physicsMesh = result.physicsMeshClone;
      dynamicTerrainComponent.currentPhysicsCenter = result.centerPosition;
      dynamicTerrainComponent.physicsAggregateInitializing = false;
    } else if (
      dynamicTerrainComponent.physicsMesh &&
      !dynamicTerrainComponent.physicsAggregateInitializing &&
      dynamicTerrainComponent.currentPhysicsCenter
    ) {
      const center = dynamicTerrainComponent.currentPhysicsCenter.clone();
      const dynamicTerrainPosition = dynamicTerrainComponent.dynamicTerrain?.mesh.getAbsolutePosition().clone();
      if (!dynamicTerrainPosition) {
        return;
      }

      const distance = xzPlaneDistance(playerPosition, center);
      if (distance > DISTANCE_TO_EDGE) {
        dynamicTerrainComponent.physicsAggregateInitializing = true;
        const previousPhysicsMesh = dynamicTerrainComponent.physicsMesh;
        const result = this.createPhysicsAggregate(terrainMesh, playerPosition, DIAMETER_OF_PHYSICS_AGGREGATE);
        dynamicTerrainComponent.physicsMesh = result.physicsMeshClone;
        dynamicTerrainComponent.currentPhysicsCenter = result.centerPosition;
        // this._physicsViewer.hideBody(previousPhysicsMesh?.physicsBody!);
        previousPhysicsMesh?.dispose();
        dynamicTerrainComponent.physicsAggregateInitializing = false;
      }
    }
  }

  private createPhysicsAggregate(
    terrainMesh: Mesh,
    playerPosition: Vector3,
    physicsAggregateDiameter: number,
  ): { physicsMeshClone: Mesh; centerPosition: Vector3 } {
    // Create an empty array to store the vertices and indices within the specified diameter
    const verticesWithinDiameter: number[] = [];
    const indicesWithinDiameter: number[] = [];

    // Get the vertices positions and indices from the original mesh
    const terrainPositions = terrainMesh.getVerticesData(VertexBuffer.PositionKind);
    const terrainIndices = terrainMesh.getIndices();

    const worldMatrix = terrainMesh.getWorldMatrix();

    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    let count = 0;

    if (terrainPositions && terrainIndices) {
      // Create a map to store the new indices for the vertices within the diameter
      const indexMap = new Map<number, number>();

      // Iterate through the indices to find the vertices within the specified diameter
      for (let i = 0; i < terrainIndices.length; i += 3) {
        const index1 = terrainIndices[i];
        const index2 = terrainIndices[i + 1];
        const index3 = terrainIndices[i + 2];

        const localPosition1 = new Vector3(
          terrainPositions[index1 * 3],
          terrainPositions[index1 * 3 + 1],
          terrainPositions[index1 * 3 + 2],
        );
        const localPosition2 = new Vector3(
          terrainPositions[index2 * 3],
          terrainPositions[index2 * 3 + 1],
          terrainPositions[index2 * 3 + 2],
        );
        const localPosition3 = new Vector3(
          terrainPositions[index3 * 3],
          terrainPositions[index3 * 3 + 1],
          terrainPositions[index3 * 3 + 2],
        );

        const position1 = Vector3.TransformCoordinates(localPosition1, worldMatrix);
        const position2 = Vector3.TransformCoordinates(localPosition2, worldMatrix);
        const position3 = Vector3.TransformCoordinates(localPosition3, worldMatrix);

        const distance1 = xzPlaneDistance(playerPosition, position1);
        const distance2 = xzPlaneDistance(playerPosition, position2);
        const distance3 = xzPlaneDistance(playerPosition, position3);

        if (distance1 <= physicsAggregateDiameter && distance2 <= physicsAggregateDiameter && distance3 <= physicsAggregateDiameter) {
          // Add the indices to the array if all three vertices of the face are within the diameter
          [index1, index2, index3].forEach((originalIndex, indexOffset) => {
            if (!indexMap.has(originalIndex)) {
              // Add a new index for the vertex within the diameter
              const newIndex = verticesWithinDiameter.length / 3;
              indexMap.set(originalIndex, newIndex);

              const localPosition = [localPosition1, localPosition2, localPosition3][indexOffset];
              verticesWithinDiameter.push(localPosition.x, localPosition.y, localPosition.z);

              sumX += localPosition.x;
              sumY += localPosition.y;
              sumZ += localPosition.z;
              count += 1;

              indicesWithinDiameter.push(newIndex);
            } else {
              const existingIndex = indexMap.get(originalIndex);
              if (typeof existingIndex === 'number') {
                indicesWithinDiameter.push(existingIndex);
              } else {
                throw new Error('Index is undefined');
              }
            }
          });
        }
      }
    } else {
      throw new Error('Positions or indices are undefined');
    }

    // Create a new mesh with the vertices and indices within the specified diameter
    const physicsMeshClone = new Mesh('terrainPhysicsMesh', scene);
    const vertexData = new VertexData();
    vertexData.positions = verticesWithinDiameter;
    vertexData.indices = indicesWithinDiameter;
    vertexData.applyToMesh(physicsMeshClone);
    physicsMeshClone.position = terrainMesh.position.clone();

    // Create the physics aggregate for the new mesh
    new PhysicsAggregate(physicsMeshClone, PhysicsShapeType.MESH, { mass: 0 });
    const physicsBody = physicsMeshClone.physicsBody;
    // if (physicsBody) {
    // this._physicsViewer.showBody(physicsBody);
    // }
    physicsMeshClone.setEnabled(false);
    let centerPosition = new Vector3(sumX / count, sumY / count, sumZ / count);
    centerPosition = Vector3.TransformCoordinates(centerPosition, worldMatrix);
    return { physicsMeshClone, centerPosition };
  }
}

function xzPlaneDistance(pos1: Vector3, pos2: Vector3): number {
  return Vector3.Distance(new Vector3(pos1.x, 0, pos1.z), new Vector3(pos2.x, 0, pos2.z));
}
