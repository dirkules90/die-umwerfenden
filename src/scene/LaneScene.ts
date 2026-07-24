import * as THREE from 'three'
import type RAPIER from '@dimforge/rapier3d-compat'
import { ensureRapierInitialized, createWorld, FIXED_TIMESTEP } from '../physics/world'
import { isInGutter, isPinFallen } from '../physics/collisions'
import {
  BALL_RADIUS,
  GUTTER_DEPTH,
  GUTTER_HALF_OUTER,
  LANE_HALF_WIDTH,
  PIN_HEIGHT,
  PIN_LAYOUT,
  PIN_STAND_Z,
  RETURN_CHANNEL_X,
  SETTLE_ANGVEL_THRESHOLD,
  SETTLE_DURATION_MS,
  SETTLE_LINVEL_THRESHOLD,
  START_Z,
} from '../physics/laneConstants'
import { Environment } from './Environment'
import { Ball } from './Ball'
import { Pin } from './Pin'
import { Lever } from './Lever'
import { CameraRig } from './CameraRig'
import { Animator } from './Animator'
import { CharacterModel } from '../characters/CharacterModel'
import type { AvatarConfig } from '../game/types'

type ThrowPhase = 'idle' | 'aiming' | 'rolling' | 'settled'

export interface SettleResult {
  pinsDown: number
  isGutter: boolean
  wasAllNine: boolean
}

// Kamera muss HINTER dem Charakter stehen (größerer Z-Wert), sonst blickt sie an ihm
// vorbei nach vorn und der Werfer ist nie im Bild.
const CHARACTER_STAND = new THREE.Vector3(0, 0, START_Z + 0.9)
const PRE_THROW_POS = new THREE.Vector3(0.75, 2.0, START_Z + 3.1)
const PRE_THROW_LOOK = new THREE.Vector3(0, 0.75, PIN_STAND_Z + 1)
const FORWARD_DIR = new THREE.Vector3(0, 0, -1)

export class LaneScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private cameraRig: CameraRig
  private clock = new THREE.Clock()
  private accumulator = 0
  private world!: RAPIER.World
  private rapier!: typeof RAPIER
  private pins: Pin[] = []
  private ball!: Ball
  private lever!: Lever
  private character: CharacterModel | null = null
  private animator = new Animator()
  private throwPhase: ThrowPhase = 'idle'
  private settleTimerMs = 0
  private onSettled: ((result: SettleResult) => void) | null = null
  private allNineTriggered = false
  private slowMoElapsed = 0
  private slowMoActive = false
  private disposed = false
  private paused = false
  private rollingElapsedMs = 0
  private aimTrajectory: THREE.Line

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.cameraRig = new CameraRig(canvas.clientWidth / Math.max(canvas.clientHeight, 1))

    const trajGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    const trajMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.15, gapSize: 0.1, opacity: 0.8, transparent: true })
    this.aimTrajectory = new THREE.Line(trajGeo, trajMat)
    this.aimTrajectory.visible = false
  }

  async init() {
    this.rapier = await ensureRapierInitialized()
    this.world = createWorld()

    this.setupLights()
    const env = new Environment()
    this.scene.add(env.group)
    this.scene.add(this.aimTrajectory)

    // Statische Kollisionsfläche der Bahn - bewusst exakt auf Bahnbreite begrenzt (nicht mehr
    // bis weit in die Wiese hinein), damit die Rinne echt tiefer liegen kann (siehe unten) statt
    // von dieser durchgehenden Fläche auf Bahnniveau "aufgefangen" zu werden.
    const groundBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed())
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(LANE_HALF_WIDTH, 0.05, 20).setTranslation(0, -0.05, 0).setFriction(0.5),
      groundBody,
    )

    // Echte Rinnen (Teil 8.2/8.3): der Rinnenboden liegt spürbar UNTER dem Bahnniveau (echter
    // Absatz statt nur ein Reibungsunterschied). Eine Kugel, die über die Bahnkante hinausrollt,
    // fällt dort hinein und kann aus eigener Kraft nicht mehr zurück auf die Bahn hochrollen -
    // vorher blieb sie faktisch auf Bahnhöhe und konnte zurückrollen, wodurch ein Rinnenwurf bei
    // "Niedrige Hausnummer" fälschlich als 0 statt 9 gewertet wurde.
    const gutterHalfWidth = (GUTTER_HALF_OUTER - LANE_HALF_WIDTH) / 2
    for (const side of [-1, 1] as const) {
      const gutterCenterX = side * (LANE_HALF_WIDTH + gutterHalfWidth)
      const gutterFloorBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed())
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(gutterHalfWidth, 0.05, 20)
          .setTranslation(gutterCenterX, -GUTTER_DEPTH - 0.05, 0)
          .setFriction(0.55),
        gutterFloorBody,
      )

      const wallBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed())
      const wallHalfHeight = 0.16 + GUTTER_DEPTH / 2
      this.world.createCollider(
        this.rapier.ColliderDesc.cuboid(0.04, wallHalfHeight, 20)
          .setTranslation(side * GUTTER_HALF_OUTER, 0.14 - GUTTER_DEPTH / 2, 0)
          .setFriction(0.3)
          .setRestitution(0.1),
        wallBody,
      )
    }

    // Rückwand am Kegelstand (deckt sich mit der sichtbaren Fangwand in Environment.ts):
    // ohne diese Kollision würde eine sehr kraftvoll geworfene Kugel physikalisch ungebremst
    // durch den Kegelstand und das Vereinsheim hindurchrollen.
    const backWallBody = this.world.createRigidBody(this.rapier.RigidBodyDesc.fixed())
    this.world.createCollider(
      this.rapier.ColliderDesc.cuboid(LANE_HALF_WIDTH + 0.2, 0.6, 0.1)
        .setTranslation(0, 0.6, PIN_STAND_Z - 1.15)
        .setFriction(0.6)
        .setRestitution(0.1),
      backWallBody,
    )

    this.pins = PIN_LAYOUT.map((p, i) => {
      const pos = new THREE.Vector3(p.x, PIN_HEIGHT / 2, PIN_STAND_Z + p.zOffset)
      const pin = new Pin(this.rapier, this.world, pos, i)
      this.scene.add(pin.mesh)
      return pin
    })

    this.ball = new Ball(this.rapier, this.world)
    this.scene.add(this.ball.mesh)

    this.lever = new Lever()
    this.scene.add(this.lever.group)

    this.cameraRig.setImmediate(PRE_THROW_POS, PRE_THROW_LOOK)

    this.renderer.setAnimationLoop(() => this.tick())
  }

  resize(width: number, height: number) {
    this.renderer.setSize(width, height, false)
    this.cameraRig.setAspect(width / Math.max(height, 1))
  }

  private setupLights() {
    const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4c9a3a, 0.65)
    this.scene.add(hemi)
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.4)
    sun.position.set(-8, 14, 8)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.left = -12
    sun.shadow.camera.right = 12
    sun.shadow.camera.top = 12
    sun.shadow.camera.bottom = -12
    sun.shadow.camera.far = 40
    this.scene.add(sun)
    const fill = new THREE.AmbientLight(0xffffff, 0.25)
    this.scene.add(fill)
  }

  setActiveCharacter(config: AvatarConfig) {
    if (this.character) this.scene.remove(this.character.group)
    this.character = new CharacterModel(config)
    this.character.group.position.copy(CHARACTER_STAND)
    // Modell blickt lokal in +Z; die Kamera steht hinter dem Spieler und schaut Richtung
    // Kegelstand (-Z), daher um 180° drehen, damit der Spieler zur Bahn blickt statt zur Kamera.
    this.character.group.rotation.y = Math.PI
    this.scene.add(this.character.group)
  }

  resetBall() {
    this.ball.reset()
    this.throwPhase = 'idle'
  }

  beginAimPhase() {
    this.throwPhase = 'aiming'
    this.allNineTriggered = false
    this.aimTrajectory.visible = true
    this.character?.setAnimState('backswing')
    this.cameraRig.tweenTo(PRE_THROW_POS, PRE_THROW_LOOK, 0.3)
  }

  updateAim(pullFraction: number, angleDeg: number) {
    this.character?.setBackswingAmount(pullFraction)
    const angleRad = THREE.MathUtils.degToRad(angleDeg)
    const dir = new THREE.Vector3(Math.sin(angleRad), 0, -Math.cos(angleRad))
    const start = new THREE.Vector3(0, 0.08, START_Z)
    const end = start.clone().addScaledVector(dir, 3 + pullFraction * 6)
    const positions = this.aimTrajectory.geometry.attributes.position as THREE.BufferAttribute
    positions.setXYZ(0, start.x, start.y, start.z)
    positions.setXYZ(1, end.x, end.y, end.z)
    positions.needsUpdate = true
    this.aimTrajectory.computeLineDistances()

    this.cameraRig.dollyToward(PRE_THROW_POS, PRE_THROW_LOOK, FORWARD_DIR, pullFraction * 0.8)
  }

  releaseThrow(power: number, angleDeg: number, spin: number, onSettled: (result: SettleResult) => void) {
    this.aimTrajectory.visible = false
    this.character?.setAnimState('throw')
    this.ball.applyThrow(power, angleDeg, spin)
    this.throwPhase = 'rolling'
    this.settleTimerMs = 0
    this.rollingElapsedMs = 0
    this.allNineTriggered = false
    this.slowMoActive = false
    this.onSettled = onSettled
  }

  showLeverPhase() {
    const leverPos = this.lever.stationPosition.clone().add(new THREE.Vector3(1.2, 1.3, 0.3))
    const leverLook = this.lever.stationPosition.clone().add(new THREE.Vector3(0, 0.9, 0))
    this.lever.setGlow(true)
    this.cameraRig.tweenTo(leverPos, leverLook, 0.7)
  }

  setLeverProgress(progress: number) {
    this.lever.setPullProgress(progress)
  }

  snapBackLever() {
    this.animator.play(0.25, (t) => this.lever.setPullProgress(1 - t))
  }

  runLeverSequence(onGearDone: () => void, onBallReturnDone: () => void) {
    this.lever.setGlow(false)
    // Kugel während der gesamten Aufricht-/Rücklaufsequenz zum Sensor machen: sie darf frisch
    // aufgestellte Kegel nicht anrempeln, egal wo sie zufällig zum Stehen gekommen ist (Bug:
    // "nicht alle Kegel stellen sich wieder auf").
    this.ball.setSensor(true)
    let gearT = 0
    const gearDuration = 1.2
    const gearTick = () => {
      gearT += 1 / 60
      this.lever.animateLinkage(gearT)
    }
    const gearInterval = window.setInterval(gearTick, 16)

    // Kegel-Aufrichtung (Teil 9.2 / 14.2): Stangen bewegen sich, Kegel klappen hoch.
    this.animator.play(
      gearDuration,
      () => {},
      () => {
        window.clearInterval(gearInterval)
        this.uprightPins(() => {
          onGearDone()
          this.returnBall(onBallReturnDone)
        })
      },
    )
  }

  private uprightPins(onDone: () => void) {
    // Alle Kegel bleiben kinematisch, bis WIRKLICH jeder seine Zielposition erreicht hat, und
    // werden erst dann gemeinsam auf Dynamic zurückgeschaltet. Andernfalls könnte ein noch
    // fahrender (kinematischer) Kegel einen bereits fertigen, schon dynamischen Nachbarn anstoßen
    // und wieder umwerfen (Bug: "nicht alle Kegel stellen sich wieder auf").
    let remaining = this.pins.length
    this.pins.forEach((pin, i) => {
      const startPos = pin.body.translation()
      const startRot = pin.body.rotation()
      const startVec = new THREE.Vector3(startPos.x, startPos.y, startPos.z)
      const startQuat = new THREE.Quaternion(startRot.x, startRot.y, startRot.z, startRot.w)
      const endVec = pin.startPosition
      const endQuat = new THREE.Quaternion()

      pin.body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
      window.setTimeout(() => {
        this.animator.play(
          0.5,
          (t) => {
            const pos = new THREE.Vector3().lerpVectors(startVec, endVec, t)
            pos.y += Math.sin(t * Math.PI) * 0.12
            const rot = new THREE.Quaternion().slerpQuaternions(startQuat, endQuat, t)
            pin.body.setNextKinematicTranslation(pos)
            pin.body.setNextKinematicRotation(rot)
          },
          () => {
            remaining -= 1
            if (remaining <= 0) {
              for (const p of this.pins) {
                // Harte, exakte Rücksetzung statt sich auf den letzten Tween-Frame zu verlassen:
                // dessen kinematisches Ziel würde sonst erst mit dem nächsten world.step()
                // übernommen, was gelegentlich einen nicht ganz aufgerichteten Kegel übrig ließ
                // (Bug: "Kegel bleiben nach Hebelzug liegen").
                p.body.setTranslation({ x: p.startPosition.x, y: p.startPosition.y, z: p.startPosition.z }, true)
                p.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
                p.body.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
                p.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
                p.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
              }
              onDone()
            }
          },
        )
      }, i * 60)
    })
  }

  private returnBall(onDone: () => void) {
    const t0 = this.ball.body.translation()
    const startVec = new THREE.Vector3(t0.x, t0.y, t0.z)
    const channelY = BALL_RADIUS + 0.07
    // Statt geradewegs zu teleportieren, rollt die Kugel sichtbar über die Rückführungsrinne
    // neben dem Hebel-Gestänge zurück zum Spieler (Teil 9.4 Ergänzung).
    const waypoints = [
      startVec,
      new THREE.Vector3(RETURN_CHANNEL_X, channelY, PIN_STAND_Z - 0.6),
      new THREE.Vector3(RETURN_CHANNEL_X, channelY, START_Z - 1.2),
      new THREE.Vector3(0, BALL_RADIUS + 0.05, START_Z),
    ]
    const segLengths = waypoints.slice(1).map((p, i) => p.distanceTo(waypoints[i]))
    const totalLength = segLengths.reduce((a, b) => a + b, 0) || 1
    const cumulative = segLengths.reduce<number[]>((acc, l) => [...acc, acc[acc.length - 1] + l], [0])

    this.ball.body.setBodyType(this.rapier.RigidBodyType.KinematicPositionBased, true)
    this.animator.play(
      2.6,
      (t) => {
        const dist = t * totalLength
        let seg = 0
        while (seg < segLengths.length - 1 && dist > cumulative[seg + 1]) seg++
        const segT = segLengths[seg] > 0 ? (dist - cumulative[seg]) / segLengths[seg] : 1
        const pos = new THREE.Vector3().lerpVectors(waypoints[seg], waypoints[seg + 1], THREE.MathUtils.clamp(segT, 0, 1))
        this.ball.body.setNextKinematicTranslation(pos)
      },
      () => {
        this.ball.body.setBodyType(this.rapier.RigidBodyType.Dynamic, true)
        this.ball.reset()
        this.ball.setSensor(false)
        this.character?.resetPose()
        this.cameraRig.tweenTo(PRE_THROW_POS, PRE_THROW_LOOK, 0.6)
        this.throwPhase = 'idle'
        onDone()
      },
    )
  }

  celebrate() {
    this.character?.setAnimState('cheer')
  }

  disappoint() {
    this.character?.setAnimState('disappointed')
  }

  private countFallenPins(): number {
    let count = 0
    for (const pin of this.pins) {
      const rot = pin.body.rotation()
      if (isPinFallen(rot)) count++
    }
    return count
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    this.clock.getDelta()
  }

  private tick() {
    if (this.disposed) return
    if (this.paused) return
    const rawDt = Math.min(this.clock.getDelta(), 0.05)
    let dt = rawDt

    if (this.throwPhase === 'rolling') {
      const fallen = this.countFallenPins()
      if (fallen >= 9 && !this.allNineTriggered) {
        this.allNineTriggered = true
        this.slowMoActive = true
        this.slowMoElapsed = 0
        this.cameraRig.triggerShake(0.05)
      }
      if (this.slowMoActive) {
        this.slowMoElapsed += rawDt
        dt = rawDt * 0.35
        if (this.slowMoElapsed > 0.7) this.slowMoActive = false
      }
    }

    this.accumulator += dt
    while (this.accumulator >= FIXED_TIMESTEP) {
      if (this.throwPhase === 'rolling') this.ball.applyCurve(FIXED_TIMESTEP)
      this.world.step()
      this.accumulator -= FIXED_TIMESTEP
    }

    this.ball.syncMesh()
    for (const pin of this.pins) pin.syncMesh()

    this.character?.update(rawDt)
    this.animator.update(rawDt)
    this.cameraRig.update(rawDt)

    if (this.throwPhase === 'rolling' && !this.slowMoActive) {
      const linvel = this.ball.body.linvel()
      // Nur die Translation der Kugel zählt für die Ruheerkennung: eine liegende Kugel kann
      // durch fehlende Rollreibung um die eigene Achse unendlich weiterspinnen, ohne dass dies
      // spielrelevant wäre.
      let allAtRest = Math.hypot(linvel.x, linvel.y, linvel.z) < SETTLE_LINVEL_THRESHOLD
      if (allAtRest) {
        for (const pin of this.pins) {
          // Ein bereits gefallener Kegel zählt sofort als „ausgewertet”: minimales Nachrutschen
          // an Nachbarkörpern oder Restspin um die liegende Achse ist spielerisch irrelevant und
          // würde die Ruheerkennung sonst unnötig verzögern oder blockieren.
          if (isPinFallen(pin.body.rotation())) continue
          const lv = pin.body.linvel()
          const av = pin.body.angvel()
          const rest =
            Math.hypot(lv.x, lv.y, lv.z) < SETTLE_LINVEL_THRESHOLD &&
            Math.hypot(av.x, av.y, av.z) < SETTLE_ANGVEL_THRESHOLD * 1.5
          if (!rest) {
            allAtRest = false
            break
          }
        }
      }

      this.rollingElapsedMs += rawDt * 1000
      // Sicherheitsnetz (Teil 20.1 Stabilität): numerisches Kontaktjitter (z. B. Kugel knapp an
      // einer Wand) darf die Ruheerkennung nie dauerhaft blockieren.
      const forceSettle = this.rollingElapsedMs > 6000

      if (allAtRest || forceSettle) {
        this.settleTimerMs += rawDt * 1000
      } else {
        this.settleTimerMs = 0
      }

      // Kamera folgt der Kugel während des Rollens.
      const ballPos = this.ball.mesh.position
      this.cameraRig.followBehind(ballPos, new THREE.Vector3(0, 0, 1), 1.6, 1.1, Math.min(rawDt * 3, 1))

      if (this.settleTimerMs >= SETTLE_DURATION_MS) {
        this.throwPhase = 'settled'
        const pinsDown = this.countFallenPins()
        // Eine Kugel, die nach dem Anstoßen von Kegeln seitlich in die Rinne weiterrollt, ist
        // kein Fehlwurf mehr - sie hat die Kegel ja bereits getroffen. Nur wenn wirklich kein
        // einziger Kegel gefallen ist, zählt die Endposition in der Rinne als "Rinne".
        const isGutter = isInGutter(ballPos.x) && pinsDown === 0
        const wasAllNine = pinsDown === 9 && !isGutter
        const resultLook = new THREE.Vector3(0, 0.3, PIN_STAND_Z)
        const resultPos = new THREE.Vector3(0.8, 1.3, PIN_STAND_Z + 2.2)
        this.cameraRig.tweenTo(resultPos, resultLook, 1.0)
        if (wasAllNine) this.celebrate()
        else if (isGutter || pinsDown === 0) this.disappoint()
        const cb = this.onSettled
        this.onSettled = null
        window.setTimeout(() => cb?.({ pinsDown, isGutter, wasAllNine }), 900)
      }
    }

    this.renderer.render(this.scene, this.cameraRig.camera)
  }

  dispose() {
    this.disposed = true
    this.renderer.setAnimationLoop(null)
    this.renderer.dispose()
  }
}
