import { Entity, IterativeSystem } from 'tick-knock';
import { DynamicTerrainComponent } from '../../components/dynamicTerrain.component';
import { RegisterSystem } from '../../startup/systemRegistration';
import { InitializationStatus } from '../../utils/types';
import { Mesh, MeshBuilder, PhysicsAggregate, PhysicsShapeType, Vector3, VertexBuffer, VertexData } from '@babylonjs/core';
import { scene } from '../../game';

const DIAMETER_OF_PHYSICS_AGGREGATE = 30;

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

    const locomotive = scene.getMeshByName('locomotive');
    if (!locomotive) {
      return;
    }

    if (!dynamicTerrainComponent.physicsMesh && !dynamicTerrainComponent.physicsAggregateInitializing) {
      console.log('Creating physics aggregate', dynamicTerrainComponent.physicsMesh, dynamicTerrainComponent.physicsAggregateInitializing);
      dynamicTerrainComponent.physicsAggregateInitializing = true;
      const result = this.createPhysicsAggregate(terrainMesh, locomotive.getAbsolutePosition().clone(), DIAMETER_OF_PHYSICS_AGGREGATE);
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

      // get the distance from the locomtoive to the center of the physics aggregate in the xz plane
      const distance = Vector3.Distance(
        new Vector3(locomotive.getAbsolutePosition().clone().x, 0, locomotive.getAbsolutePosition().clone().z),
        new Vector3(center.x, 0, center.z),
      );
      const centerMarker = scene.getMeshByName('centerMarker') as Mesh;
      centerMarker.position = center.clone();
      console.log(center, locomotive.getAbsolutePosition().clone(), distance);
      if (distance > DIAMETER_OF_PHYSICS_AGGREGATE / 2 - 1) {
        console.log('making new physics aggregate');
        dynamicTerrainComponent.physicsAggregateInitializing = true;
        const previousPhysicsMesh = dynamicTerrainComponent.physicsMesh;
        const result = this.createPhysicsAggregate(terrainMesh, locomotive.getAbsolutePosition().clone(), DIAMETER_OF_PHYSICS_AGGREGATE);
        dynamicTerrainComponent.physicsMesh = result.physicsMeshClone;
        dynamicTerrainComponent.currentPhysicsCenter = result.centerPosition;
        previousPhysicsMesh?.dispose();
        dynamicTerrainComponent.physicsAggregateInitializing = false;
      }
    }
  }

  private createPhysicsAggregate(
    terrainMesh: Mesh,
    playerPosition: Vector3,
    diameter: number,
  ): { physicsMeshClone: Mesh; centerPosition: Vector3 } {
    // Create an empty array to store the vertices and indices within the specified diameter
    const verticesWithinDiameter: number[] = [];
    const indicesWithinDiameter: number[] = [];

    // Get the vertices positions and indices from the original mesh
    const positions = terrainMesh.getVerticesData(VertexBuffer.PositionKind);
    const indices = terrainMesh.getIndices();

    const worldMatrix = terrainMesh.getWorldMatrix();

    let sumX = 0,
      sumY = 0,
      sumZ = 0;
    let count = 0;

    if (positions && indices) {
      // Create a map to store the new indices for the vertices within the diameter
      const indexMap = new Map<number, number>();

      // Iterate through the indices to find the vertices within the specified diameter
      for (let i = 0; i < indices.length; i += 3) {
        const index1 = indices[i];
        const index2 = indices[i + 1];
        const index3 = indices[i + 2];

        const localPosition1 = new Vector3(positions[index1 * 3], positions[index1 * 3 + 1], positions[index1 * 3 + 2]);
        const localPosition2 = new Vector3(positions[index2 * 3], positions[index2 * 3 + 1], positions[index2 * 3 + 2]);
        const localPosition3 = new Vector3(positions[index3 * 3], positions[index3 * 3 + 1], positions[index3 * 3 + 2]);

        const position1 = Vector3.TransformCoordinates(localPosition1, worldMatrix);
        const position2 = Vector3.TransformCoordinates(localPosition2, worldMatrix);
        const position3 = Vector3.TransformCoordinates(localPosition3, worldMatrix);

        const distance1 = Vector3.Distance(new Vector3(playerPosition.x, 0, playerPosition.z), new Vector3(position1.x, 0, position1.z));
        const distance2 = Vector3.Distance(new Vector3(playerPosition.x, 0, playerPosition.z), new Vector3(position2.x, 0, position2.z));
        const distance3 = Vector3.Distance(new Vector3(playerPosition.x, 0, playerPosition.z), new Vector3(position3.x, 0, position3.z));

        if (distance1 <= diameter && distance2 <= diameter && distance3 <= diameter) {
          // Add the indices to the array if all three vertices of the face are within the diameter
          [index1, index2, index3].forEach((originalIndex) => {
            if (!indexMap.has(originalIndex)) {
              // Add a new index for the vertex within the diameter
              const newIndex = verticesWithinDiameter.length / 3;
              indexMap.set(originalIndex, newIndex);
              verticesWithinDiameter.push(localPosition1.x, localPosition1.y, localPosition1.z);
              verticesWithinDiameter.push(localPosition2.x, localPosition2.y, localPosition2.z);
              verticesWithinDiameter.push(localPosition3.x, localPosition3.y, localPosition3.z);

              sumX += localPosition1.x + localPosition2.x + localPosition3.x;
              sumY += localPosition1.y + localPosition2.y + localPosition3.y;
              sumZ += localPosition1.z + localPosition2.z + localPosition3.z;
              count += 3;
            }
            const indexWithinDiameter = indexMap.get(originalIndex);
            if (indexWithinDiameter !== undefined) {
              indicesWithinDiameter.push(indexWithinDiameter);
            }
          });
        }
      }
    }

    // Create a new mesh with the vertices and indices within the specified diameter
    const physicsMeshClone = new Mesh('terrainPhysicsMesh', scene);
    const vertexData = new VertexData();
    vertexData.positions = verticesWithinDiameter;
    vertexData.indices = indicesWithinDiameter;
    vertexData.applyToMesh(physicsMeshClone);
    physicsMeshClone.position = terrainMesh.position.clone();

    // Create the physics aggregate for the new mesh
    const physicsAggregate = new PhysicsAggregate(physicsMeshClone, PhysicsShapeType.MESH, { mass: 0 });
    physicsMeshClone.setEnabled(false);
    let centerPosition = new Vector3(sumX / count, sumY / count, sumZ / count);
    centerPosition = Vector3.TransformCoordinates(centerPosition, worldMatrix);
    return { physicsMeshClone, centerPosition };
  }
}
