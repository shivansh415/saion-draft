import * as THREE from 'three'
import gsap from 'gsap'

import { AMENITY_BY_MESH, TERRACE_AMENITIES } from './terraceAmenities'
import { loadTerraceModel } from './terraceLoader'
import type { TerraceModel } from './terraceLoader'

/**
 * Reposé Residence — the terrace, in three dimensions.
 *
 * The supplied model is a source-traced relief with the brochure's own plan
 * registered onto it as a single atlas: almost everything you see is the
 * picture, and the geometry is a shallow, unverified proxy for it. The
 * package says so plainly, and this scene is built around it — the camera
 * stays high (never below 70° of elevation), the tilt is small, and the
 * travel is bounded. Anything lower or looser exposes a projection the source
 * cannot support, which is why there is no free orbit here.
 *
 * Nothing in this file renders on a clock of its own. The frame loop is added
 * to GSAP's ticker — the same ticker Lenis and every scrubbed timeline on the
 * page already run on — so the terrace can never fall a frame behind the rest
 * of the site, and the site never grows a second rAF loop.
 */

/* ------------------------------------------------------------------ *
 * The camera's world
 *
 * Distances are in the model's own units: one source pixel is 0.03 of them,
 * and the complete reference frame is 47.94 × 29.52 (see the package
 * manifest). The rig is spherical about a target on the terrace floor.
 * ------------------------------------------------------------------ */

/** The reference frame the overview is fitted to. */
const EXTENT_X = 47.94
const EXTENT_Z = 29.52

/** A long lens: near-plan, with just enough perspective to read as built. */
const FOV = 22

/** Elevation is never allowed below 70°, which is `polar` above 20°. */
const POLAR_MIN = 0.075
const POLAR_MAX = 0.345
/** The overview's own tilt — a plan, leaned into. */
const POLAR_REST = 0.235

/**
 * How far around the terrace a drag may travel. Ten degrees is deliberate:
 * far enough that the terrace answers the hand and reads as built, short of
 * the angle at which a plan stops looking like one.
 */
const AZIMUTH_LIMIT = 0.17

/**
 * Zoom, as a multiple of the distance the whole terrace fits at. The camera
 * cannot be panned — that is the point of a curated overview — so the closest
 * it may come is the point at which the terrace still mostly fills the frame.
 * Past that a visitor would be stuck looking at the middle of it.
 */
const ZOOM_MIN = 0.66
const ZOOM_MAX = 1.12

/** Where the camera comes in from, before it settles. */
const ENTRY_ZOOM = 1.4
const ENTRY_POLAR = 0.055

/** How far the pointer may lean the camera, on top of everything else. */
const PARALLAX_AZIMUTH = 0.024
const PARALLAX_POLAR = 0.014

/** Per-frame damping, at 60fps. Time-corrected below, so it holds at any rate. */
const DAMPING = 0.17
const PARALLAX_DAMPING = 0.055

/** How far a rested amenity travels toward this colour, and what it is. */
const RESTED = new THREE.Color(0.5, 0.52, 0.56)
const REST_HOVER = 0.46
const REST_APPROACH = 0.9

interface Callbacks {
  /** The amenity under the pointer, by hotspot id. */
  onHover: (id: string | null) => void
  /** Where that amenity sits on screen, in the canvas's own CSS pixels. */
  onMark: (mark: { x: number; y: number } | null) => void
  onSelect: (id: string) => void
}

interface Options {
  canvas: HTMLCanvasElement
  coarse: boolean
  reducedMotion: boolean
  callbacks: Callbacks
}

const clamp = (value: number, low: number, high: number) => Math.min(Math.max(value, low), high)

export class TerraceScene {
  private readonly canvas: HTMLCanvasElement
  private readonly coarse: boolean
  private readonly reducedMotion: boolean
  private readonly callbacks: Callbacks

  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly raycaster = new THREE.Raycaster()

  private model: TerraceModel | null = null
  private targets = new Map<string, THREE.Vector3>()

  /** Where the camera is asked to be. GSAP writes here; user input writes here. */
  private goal = { azimuth: 0, polar: POLAR_REST, zoom: 1, x: 0, y: 0, z: 0 }
  /** Where it actually is, damped toward the goal every frame. */
  private view = { azimuth: 0, polar: ENTRY_POLAR, zoom: ENTRY_ZOOM, x: 0, y: 0, z: 0 }
  /** The pointer's lean, and where it is heading. */
  private lean = { x: 0, y: 0 }
  private leanGoal = { x: 0, y: 0 }

  /** The distance the whole reference frame fits at, for the current viewport. */
  private fitDistance = 90
  private width = 1
  private height = 1

  private hovered: string | null = null
  private approaching: string | null = null
  private interactive = true
  private paused = false
  private running = false

  private readonly pointer = new THREE.Vector2()
  private pointerInside = false
  private pointerMoved = false
  private dragging = false
  private dragged = false
  private readonly drag = { x: 0, y: 0 }
  private readonly touches = new Map<number, { x: number; y: number }>()
  private pinch = 0
  /** The grace period between leaving the terrace and the mark being put away. */
  private leaveTimer: number | null = null

  private readonly water: { uniform: { value: number } } = { uniform: { value: 0 } }
  private waterAnimated = false

  private readonly tick: (time: number, delta: number) => void

  constructor({ canvas, coarse, reducedMotion, callbacks }: Options) {
    this.canvas = canvas
    this.coarse = coarse
    this.reducedMotion = reducedMotion
    this.callbacks = callbacks

    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2)
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: dpr < 1.5,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setClearColor(0x000000, 0)

    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 600)

    // Soft and neutral, as the package asks. The atlas is a lit render: it
    // carries its own shadows and highlights, so this only has to bring it up
    // to its own brightness and leave a little relief on the crowns and walls.
    const sky = new THREE.HemisphereLight(0xffffff, 0x8d919a, 2.15)
    const sun = new THREE.DirectionalLight(0xfff6ec, 1.05)
    sun.position.set(0.35, 1, 0.28)
    this.scene.add(sky, sun)

    this.tick = (_time, delta) => this.frame(delta)
  }

  /* --------------------------------------------------------------- *
   * Loading
   * --------------------------------------------------------------- */
  async load(url: string): Promise<void> {
    const anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy())
    const model = await loadTerraceModel(url, anisotropy)
    this.model = model
    this.scene.add(model.root)

    for (const amenity of TERRACE_AMENITIES) {
      const target = model.getZoneTarget(amenity.meshName)
      if (target) this.targets.set(amenity.id, target)
    }

    if (!this.reducedMotion) this.animateWater(model)
    this.resize(this.width, this.height)
  }

  /**
   * The pool's own treatment: the still-water surfaces sample their patch of
   * the atlas through a whisper of movement. It is a UV nudge of about a
   * thousandth — no geometry is touched, no post-processing is added, and the
   * three surfaces are the only materials in the scene that are patched.
   */
  private animateWater(model: TerraceModel) {
    const patched = new Set<THREE.Material>()
    for (const mesh of model.water) {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        if (patched.has(material)) continue
        patched.add(material)
        material.onBeforeCompile = (shader) => {
          if (!shader.fragmentShader.includes('#include <map_fragment>')) return
          shader.uniforms.uTime = this.water.uniform
          shader.fragmentShader = shader.fragmentShader
            .replace('void main() {', 'uniform float uTime;\nvoid main() {')
            .replace(
              '#include <map_fragment>',
              [
                '#ifdef USE_MAP',
                '  vec2 rippleUv = vMapUv + vec2(',
                '    sin( vMapUv.y * 210.0 + uTime * 0.55 ) * 0.0011,',
                '    cos( vMapUv.x * 178.0 - uTime * 0.44 ) * 0.0009',
                '  );',
                '  diffuseColor *= texture2D( map, rippleUv );',
                '#endif',
              ].join('\n'),
            )
          this.waterAnimated = true
        }
        material.needsUpdate = true
      }
    }
  }

  /* --------------------------------------------------------------- *
   * The frame loop — one callback, on the ticker the page already runs
   * --------------------------------------------------------------- */
  start() {
    if (this.running) return
    this.running = true
    this.bind()
    gsap.ticker.add(this.tick)
  }

  stop() {
    if (!this.running) return
    this.running = false
    gsap.ticker.remove(this.tick)
    this.unbind()
  }

  /** While the portal covers the viewport there is nothing worth drawing. */
  setPaused(paused: boolean) {
    this.paused = paused
  }

  /**
   * Indicate an amenity without a pointer on it — what the list in the margin
   * does, and what a keyboard does when it tabs onto one. A pointer over the
   * model takes it back on the next frame it moves, which is right: the
   * pointer is the more specific answer.
   */
  highlight(id: string | null) {
    if (!this.interactive) return
    this.setHovered(id)
  }

  /** Hover and travel are stood down while a transition owns the frame. */
  setInteractive(interactive: boolean) {
    this.interactive = interactive
    if (!interactive) this.setHovered(null)
  }

  resize(width: number, height: number) {
    if (width <= 0 || height <= 0) return
    this.width = width
    this.height = height
    const aspect = width / height
    this.camera.aspect = aspect
    this.camera.updateProjectionMatrix()

    // Contain the whole reference frame, and keep the frame's own margins
    // clear: the chapter's type lives in them, and a plan that reaches the
    // gutters leaves it standing on the render. A phone has no margins to
    // spare, so there the plan takes what room there is.
    const half = THREE.MathUtils.degToRad(FOV) / 2
    const margin = aspect < 1 ? 1.0 : 1.3
    const byDepth = (EXTENT_Z * margin) / 2 / Math.tan(half)
    const byWidth = (EXTENT_X * margin) / 2 / (Math.tan(half) * aspect)
    this.fitDistance = Math.max(byDepth, byWidth)
    this.settled = false
    this.renderer.setSize(width, height, false)
  }

  private frame(delta: number) {
    if (this.paused || !this.model) return
    const seconds = Math.min(delta, 50) / 1000
    const ease = 1 - Math.pow(1 - DAMPING, seconds * 60)
    const leanEase = 1 - Math.pow(1 - PARALLAX_DAMPING, seconds * 60)

    let moving = false
    const settleAxis = (key: 'azimuth' | 'polar' | 'zoom' | 'x' | 'y' | 'z') => {
      const difference = this.goal[key] - this.view[key]
      if (Math.abs(difference) > 1e-5) {
        this.view[key] += difference * ease
        moving = true
      } else {
        this.view[key] = this.goal[key]
      }
    }
    settleAxis('azimuth')
    settleAxis('polar')
    settleAxis('zoom')
    settleAxis('x')
    settleAxis('y')
    settleAxis('z')

    for (const axis of ['x', 'y'] as const) {
      const difference = this.leanGoal[axis] - this.lean[axis]
      if (Math.abs(difference) > 1e-5) {
        this.lean[axis] += difference * leanEase
        moving = true
      }
    }

    if (this.pointerMoved && this.interactive && !this.dragging) {
      this.pointerMoved = false
      this.pick()
    }

    const rested = this.applyRest(ease)
    if (this.waterAnimated) this.water.uniform.value += seconds

    this.place()
    if (this.hovered) this.mark()

    if (!moving && !rested && !this.waterAnimated) {
      // Nothing is in motion and nothing animates on its own: the last frame
      // is still true, so it is left on screen rather than drawn again.
      if (this.settled) return
      this.settled = true
    } else {
      this.settled = false
    }
    this.renderer.render(this.scene, this.camera)
  }

  private settled = false

  /** The camera, placed from the damped rig. */
  private place() {
    const azimuth = clamp(this.view.azimuth + this.lean.x * PARALLAX_AZIMUTH, -AZIMUTH_LIMIT * 1.3, AZIMUTH_LIMIT * 1.3)
    const polar = clamp(this.view.polar + this.lean.y * PARALLAX_POLAR, POLAR_MIN, POLAR_MAX)
    const distance = this.fitDistance * this.view.zoom

    const sin = Math.sin(polar)
    this.camera.position.set(
      this.view.x + distance * sin * Math.sin(azimuth),
      this.view.y + distance * Math.cos(polar),
      this.view.z + distance * sin * Math.cos(azimuth),
    )
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(this.view.x, this.view.y, this.view.z)

    // The clip planes only have to follow the distance, and rebuilding the
    // projection matrix is the one part of placing the camera that is not
    // nearly free — so it is done when they actually move, not every frame.
    const near = Math.max(1, distance - 60)
    const far = distance + 90
    if (Math.abs(near - this.camera.near) > 0.5 || Math.abs(far - this.camera.far) > 0.5) {
      this.camera.near = near
      this.camera.far = far
      this.camera.updateProjectionMatrix()
    }
  }

  /** Rests every amenity but the one in hand. Returns true while it is moving. */
  private applyRest(ease: number): boolean {
    const model = this.model
    if (!model) return false
    const focus = this.approaching ?? this.hovered
    const depth = this.approaching ? REST_APPROACH : REST_HOVER
    const focusMesh = focus ? AMENITY_BY_ID_MESH.get(focus) : null

    let moving = false
    for (const group of model.groups.values()) {
      const target = !focusMesh ? 0 : group.id === focusMesh ? 0 : depth
      const difference = target - group.rest
      if (Math.abs(difference) > 1e-4) {
        group.rest += difference * ease
        moving = true
      } else {
        group.rest = target
      }
      if (Math.abs(group.rest - group.applied) < 1e-3) continue
      group.applied = group.rest
      // A multiply, not a blend: the materials are authored at very different
      // values — pale edges, dark wood — and lerping toward a mid tone would
      // brighten the dark ones. This only ever takes light away, and takes a
      // little more from red than from blue, so resting also cools.
      const r = 1 - group.rest * (1 - RESTED.r)
      const g = 1 - group.rest * (1 - RESTED.g)
      const b = 1 - group.rest * (1 - RESTED.b)
      for (let i = 0; i < group.materials.length; i += 1) {
        const material = group.materials[i] as THREE.MeshStandardMaterial
        if (!material.color) continue
        material.color.copy(group.base[i])
        material.color.r *= r
        material.color.g *= g
        material.color.b *= b
      }
    }
    return moving
  }

  /* --------------------------------------------------------------- *
   * Picking
   * --------------------------------------------------------------- */
  private pick() {
    const model = this.model
    if (!model || !this.pointerInside) return this.setHovered(null)
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(model.interactive, false)
    const amenity = hits.length ? model.findAmenity(hits[0].object) : null
    const id = amenity ? (AMENITY_BY_MESH.get(amenity.userData.amenityId as string)?.id ?? null) : null
    this.setHovered(id)
  }

  private cancelLeave() {
    if (this.leaveTimer === null) return
    window.clearTimeout(this.leaveTimer)
    this.leaveTimer = null
  }

  private setHovered(id: string | null) {
    if (id !== null) this.cancelLeave()
    if (id === this.hovered) return
    this.hovered = id
    this.canvas.style.cursor = id ? 'pointer' : ''
    this.callbacks.onHover(id)
    if (!id) this.callbacks.onMark(null)
    else this.mark()
    this.settled = false
  }

  private mark() {
    const point = this.project(this.hovered)
    this.callbacks.onMark(point)
  }

  /** Where an amenity currently projects to, in the canvas's own CSS pixels. */
  project(id: string | null): { x: number; y: number } | null {
    const target = id ? this.targets.get(id) : null
    if (!target) return null
    const ndc = target.clone().project(this.camera)
    return {
      x: ((ndc.x + 1) / 2) * this.width,
      y: ((1 - ndc.y) / 2) * this.height,
    }
  }

  /* --------------------------------------------------------------- *
   * Scripted travel
   * --------------------------------------------------------------- */

  /** The arrival: from high and far, down into the overview. */
  settle(): gsap.core.Tween {
    const entry = { azimuth: 0, polar: ENTRY_POLAR, zoom: ENTRY_ZOOM, x: 0, y: 0, z: 0 }
    Object.assign(this.view, entry)
    Object.assign(this.goal, entry)
    this.settled = false
    if (this.reducedMotion) {
      const rest = { azimuth: 0, polar: POLAR_REST, zoom: 1, x: 0, y: 0, z: 0 }
      Object.assign(this.view, rest)
      Object.assign(this.goal, rest)
      return gsap.to({}, { duration: 0.01 })
    }
    // Only the goal is ever tweened. The rig damps toward it every frame, so
    // one curve is in charge of the arrival and the damping merely rounds its
    // last few frames — two smoothing layers writing the same numbers is
    // exactly the sluggishness the film's renderer avoids upstream.
    return gsap.to(this.goal, {
      polar: POLAR_REST,
      zoom: 1,
      duration: 2.2,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  /** In toward one amenity, until it is what the frame holds. */
  approach(id: string): gsap.core.Tween | null {
    const target = this.targets.get(id)
    if (!target) return null
    this.approaching = id
    this.setHovered(null)
    this.settled = false
    const duration = this.reducedMotion ? 0.3 : 1.15
    return gsap.to(this.goal, {
      x: target.x,
      y: target.y,
      z: target.z,
      zoom: ZOOM_MIN * 0.62,
      polar: Math.max(POLAR_MIN, POLAR_REST - 0.06),
      azimuth: 0,
      duration,
      ease: 'power2.inOut',
      overwrite: 'auto',
    })
  }

  /** Back out of an amenity, to the overview it was entered from. */
  withdraw(): gsap.core.Tween {
    this.approaching = null
    this.settled = false
    return gsap.to(this.goal, {
      x: 0,
      y: 0,
      z: 0,
      zoom: 1,
      polar: POLAR_REST,
      azimuth: 0,
      duration: this.reducedMotion ? 0.3 : 1.25,
      ease: 'power3.out',
      overwrite: 'auto',
    })
  }

  /** Away from the terrace, back down the way the rise came. */
  depart(): gsap.core.Tween {
    this.approaching = null
    this.setHovered(null)
    this.settled = false
    return gsap.to(this.goal, {
      polar: ENTRY_POLAR,
      zoom: ENTRY_ZOOM,
      azimuth: 0,
      x: 0,
      y: 0,
      z: 0,
      duration: this.reducedMotion ? 0.3 : 1.1,
      ease: 'power2.in',
      overwrite: 'auto',
    })
  }

  /* --------------------------------------------------------------- *
   * Input
   * --------------------------------------------------------------- */
  private onPointerDown = (event: PointerEvent) => {
    if (!this.interactive) return
    this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (this.touches.size === 2) {
      this.dragging = false
      this.pinch = this.touchSpread()
      return
    }
    if (this.touches.size > 2) return
    this.dragging = true
    this.dragged = false
    this.drag.x = event.clientX
    this.drag.y = event.clientY
    this.canvas.setPointerCapture(event.pointerId)
  }

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    this.pointerInside = true
    this.pointerMoved = true
    this.cancelLeave()

    if (this.touches.has(event.pointerId)) {
      this.touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    }

    if (this.touches.size === 2) {
      const spread = this.touchSpread()
      if (this.pinch > 0 && spread > 0) this.zoomBy(this.pinch / spread)
      this.pinch = spread
      return
    }

    if (!this.interactive) return

    if (this.dragging) {
      const dx = event.clientX - this.drag.x
      const dy = event.clientY - this.drag.y
      this.drag.x = event.clientX
      this.drag.y = event.clientY
      if (Math.abs(dx) + Math.abs(dy) > 2) this.dragged = true
      this.goal.azimuth = clamp(this.goal.azimuth - dx * 0.0016, -AZIMUTH_LIMIT, AZIMUTH_LIMIT)
      this.goal.polar = clamp(this.goal.polar + dy * 0.0011, POLAR_MIN, POLAR_MAX)
      this.settled = false
      return
    }

    // The lean: the pointer's position in the frame, held well under a degree.
    this.leanGoal.x = this.pointer.x
    this.leanGoal.y = -this.pointer.y
    this.settled = false
  }

  private onPointerUp = (event: PointerEvent) => {
    this.touches.delete(event.pointerId)
    if (this.touches.size < 2) this.pinch = 0
    if (!this.dragging) return
    this.dragging = false
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
    if (this.dragged || !this.interactive) return
    // A press that did not travel is a choice. On touch the pick has to be
    // made here, because there was no hover before it.
    if (this.coarse) {
      this.pointerInside = true
      this.pick()
    }
    if (this.hovered) this.callbacks.onSelect(this.hovered)
  }

  private onPointerLeave = () => {
    this.pointerInside = false
    this.leanGoal.x = 0
    this.leanGoal.y = 0
    // A short grace before the mark is put away. Without it the trip from the
    // amenity to the line of type that names it — which is off the terrace,
    // in the margin — takes the type away before it can be reached. The level
    // rail gives a pointer travelling between rows the same courtesy.
    this.cancelLeave()
    this.leaveTimer = window.setTimeout(() => {
      this.leaveTimer = null
      this.setHovered(null)
    }, 240)
  }

  /**
   * Hold the current mark while the pointer is on the type that names it, and
   * release it when the pointer leaves that too. Called by the readout.
   */
  holdHover(hold: boolean) {
    if (hold) this.cancelLeave()
    else if (!this.pointerInside) this.setHovered(null)
  }

  private onWheel = (event: WheelEvent) => {
    if (!this.interactive) return
    event.preventDefault()
    this.zoomBy(1 + clamp(event.deltaY, -120, 120) * 0.0012)
  }

  private zoomBy(factor: number) {
    this.goal.zoom = clamp(this.goal.zoom * factor, ZOOM_MIN, ZOOM_MAX)
    this.settled = false
  }

  private touchSpread(): number {
    const points = [...this.touches.values()]
    if (points.length < 2) return 0
    return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)
  }

  private bind() {
    const canvas = this.canvas
    canvas.addEventListener('pointerdown', this.onPointerDown)
    canvas.addEventListener('pointermove', this.onPointerMove)
    canvas.addEventListener('pointerup', this.onPointerUp)
    canvas.addEventListener('pointercancel', this.onPointerUp)
    canvas.addEventListener('pointerleave', this.onPointerLeave)
    canvas.addEventListener('wheel', this.onWheel, { passive: false })
  }

  private unbind() {
    this.cancelLeave()
    const canvas = this.canvas
    canvas.removeEventListener('pointerdown', this.onPointerDown)
    canvas.removeEventListener('pointermove', this.onPointerMove)
    canvas.removeEventListener('pointerup', this.onPointerUp)
    canvas.removeEventListener('pointercancel', this.onPointerUp)
    canvas.removeEventListener('pointerleave', this.onPointerLeave)
    canvas.removeEventListener('wheel', this.onWheel)
  }

  /* --------------------------------------------------------------- *
   * Taking it down
   * --------------------------------------------------------------- */
  dispose() {
    this.stop()
    gsap.killTweensOf([this.goal, this.view])
    if (this.model) {
      this.scene.remove(this.model.root)
      this.model.dispose()
      this.model = null
    }
    this.targets.clear()
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }
}

/** Hotspot id → the GLB's amenity node name, for the rest pass. */
const AMENITY_BY_ID_MESH = new Map(TERRACE_AMENITIES.map((amenity) => [amenity.id, amenity.meshName]))
