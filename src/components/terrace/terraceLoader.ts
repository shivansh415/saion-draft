import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { AMENITY_BY_MESH } from './terraceAmenities'

/**
 * Reposé Residence — loading the supplied terrace model.
 *
 * Built on the loader that ships with the package
 * (`repose-terrace/integration/loadReposeTerrace.ts`): its zone map, its
 * raycast resolver and its per-amenity material isolation are kept as they
 * were given. What is added here is only what the chapter needs on top —
 * the meshes worth raycasting, the material groups a highlight writes to,
 * and the water surfaces.
 *
 * Asset loading and inspection only. No UI, no listeners, no animation.
 */

/** One amenity's materials, with the colour each of them was authored at. */
export interface AmenityGroup {
  readonly id: string
  readonly materials: THREE.Material[]
  readonly base: THREE.Color[]
  /** How far this group is currently rested, 0 → 1. Written by the scene. */
  rest: number
  /** The value last written to the materials, so an unchanged group is skipped. */
  applied: number
}

export interface TerraceModel {
  readonly root: THREE.Object3D
  readonly zones: Map<string, THREE.Object3D>
  /** Every material group, keyed by amenity id — the terrace, not just the hotspots. */
  readonly groups: Map<string, AmenityGroup>
  /** Only the meshes of the interactive amenities: what the raycaster is given. */
  readonly interactive: THREE.Mesh[]
  /** The three still-water surfaces, for the pool's own treatment. */
  readonly water: THREE.Mesh[]
  findAmenity(object: THREE.Object3D | null): THREE.Object3D | null
  getZoneTarget(id: string): THREE.Vector3 | null
  dispose(): void
}

const materialsOf = (mesh: THREE.Mesh): THREE.Material[] =>
  Array.isArray(mesh.material) ? mesh.material : [mesh.material]

/** The still-water surfaces, whatever suffix the loader gave their primitives. */
const isWater = (name: string) => /_Water(_\d+)?$/.test(name)

export async function loadTerraceModel(url: string, anisotropy: number): Promise<TerraceModel> {
  const gltf = await new GLTFLoader().loadAsync(url)
  const root = gltf.scene
  const zones = new Map<string, THREE.Object3D>()

  root.traverse((object) => {
    if (object.userData.selectable === true && object.userData.amenityId) {
      zones.set(object.userData.amenityId as string, object)
    }
  })

  /** Resolves a raycast hit to its logical amenity, including primitive children. */
  function findAmenity(object: THREE.Object3D | null): THREE.Object3D | null {
    for (let node = object; node; node = node.parent) {
      const zone = zones.get(node.userData.amenityId as string)
      if (zone) return zone
    }
    return null
  }

  // Edge materials are shared in the GLB to reduce payload. Isolate them by
  // amenity at import so a later highlight cannot colour unrelated zones.
  // (This is the package's own step, kept verbatim in effect.)
  const materialCopies = new Map<string, Map<THREE.Material, THREE.Material>>()
  const groups = new Map<string, AmenityGroup>()
  const interactive: THREE.Mesh[] = []
  const water: THREE.Mesh[] = []

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const id = (findAmenity(object)?.userData.amenityId as string | undefined) ?? 'reference-context'

    let copies = materialCopies.get(id)
    if (!copies) materialCopies.set(id, (copies = new Map()))
    const isolate = (original: THREE.Material) => {
      let copy = copies!.get(original)
      if (!copy) copies!.set(original, (copy = original.clone()))
      return copy
    }
    object.material = Array.isArray(object.material) ? object.material.map(isolate) : isolate(object.material)

    let group = groups.get(id)
    if (!group) groups.set(id, (group = { id, materials: [], base: [], rest: 0, applied: 0 }))
    for (const material of materialsOf(object)) {
      if (group.materials.includes(material)) continue
      group.materials.push(material)
      const colour = (material as THREE.MeshStandardMaterial).color
      group.base.push(colour ? colour.clone() : new THREE.Color(1, 1, 1))
    }

    if (AMENITY_BY_MESH.has(id)) interactive.push(object)
    if (isWater(object.name)) water.push(object)

    object.castShadow = false
    object.receiveShadow = false
    object.frustumCulled = true

    // The atlas is one 1598×984 JPEG shared by everything; tuning it once on
    // the first material that carries it is enough.
    for (const material of materialsOf(object)) {
      const map = (material as THREE.MeshStandardMaterial).map
      if (map && map.anisotropy !== anisotropy) {
        map.anisotropy = anisotropy
        map.needsUpdate = true
      }
    }
  })

  /** The camera target the package authored for a zone, in world space. */
  function getZoneTarget(id: string): THREE.Vector3 | null {
    const zone = zones.get(id)
    const target = zone?.userData.target
    if (!zone || !Array.isArray(target)) return null
    root.updateWorldMatrix(true, true)
    return zone.localToWorld(new THREE.Vector3(...(target as [number, number, number])))
  }

  function dispose() {
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    const textures = new Set<THREE.Texture>()
    root.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      geometries.add(object.geometry)
      for (const material of materialsOf(object)) {
        materials.add(material)
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) textures.add(value)
        }
      }
    })
    geometries.forEach((geometry) => geometry.dispose())
    materials.forEach((material) => material.dispose())
    textures.forEach((texture) => texture.dispose())
  }

  return { root, zones, groups, interactive, water, findAmenity, getZoneTarget, dispose }
}
