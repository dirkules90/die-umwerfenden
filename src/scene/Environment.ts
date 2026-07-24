import * as THREE from 'three'
import { GUTTER_HALF_OUTER, LANE_HALF_WIDTH, LANE_LENGTH, PIN_STAND_Z, RUNUP_LENGTH, START_Z } from '../physics/laneConstants'

// Farbpalette gemäß Teil 5.2 / 22.3.
const COLORS = {
  grass: 0x5cae43,
  grassDark: 0x4c9a3a,
  concrete: 0xd2cdbf,
  gravel: 0xb9ae9c,
  wood: 0x8c5a34,
  woodDark: 0x6b3f1f,
  metal: 0xb8bcc2,
  sky: 0xa9def9,
  runup: 0xb23a2b,
  clubhouse: 0x9c4a3c,
  roof: 0x4a3528,
}

function toonMat(color: number, roughness = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.05, flatShading: false })
}

// Mittelpunkt der Betonbahn (ohne Anlaufbereich) entlang der Z-Achse: Die Bahn reicht vom
// Kegelstand bis zum Anlaufbereich, dessen vorderes Ende bei START_Z liegt.
const LANE_CENTER_Z = START_Z - LANE_LENGTH / 2

export class Environment {
  group = new THREE.Group()

  constructor() {
    this.buildSky()
    this.buildGround()
    this.buildLane()
    this.buildGutters()
    this.buildPinStandStructure()
    this.buildClubhouse()
    this.buildTrees()
    this.buildBenches()
    this.buildFootballPlaceholder()
  }

  private buildSky() {
    const skyGeo = new THREE.SphereGeometry(120, 24, 16)
    const skyMat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x7ec8e3) },
        bottomColor: { value: new THREE.Color(0xf5f9e8) },
      },
      vertexShader: `varying vec3 vWorldPosition; void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }`,
      fragmentShader: `varying vec3 vWorldPosition; uniform vec3 topColor; uniform vec3 bottomColor;
      void main() {
        float h = normalize(vWorldPosition).y * 0.5 + 0.5;
        gl_FragColor = vec4(mix(bottomColor, topColor, clamp(h, 0.0, 1.0)), 1.0);
      }`,
      side: THREE.BackSide,
    })
    this.group.add(new THREE.Mesh(skyGeo, skyMat))
  }

  private buildGround() {
    const geo = new THREE.CircleGeometry(60, 48)
    const mat = toonMat(COLORS.grass)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = -0.01
    mesh.receiveShadow = true
    this.group.add(mesh)
  }

  private buildLane() {
    const laneWidth = LANE_HALF_WIDTH * 2
    const laneGeo = new THREE.BoxGeometry(laneWidth, 0.08, LANE_LENGTH)
    const laneMat = toonMat(COLORS.concrete, 0.85)
    const lane = new THREE.Mesh(laneGeo, laneMat)
    lane.position.set(0, 0.0, LANE_CENTER_Z)
    lane.receiveShadow = true
    lane.castShadow = false
    this.group.add(lane)

    // Fugen zwischen Betonsegmenten.
    const segCount = 8
    for (let i = 0; i < segCount; i++) {
      const z = START_Z - (i + 0.5) * (LANE_LENGTH / segCount)
      const seam = new THREE.Mesh(
        new THREE.BoxGeometry(laneWidth, 0.081, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x9c9787 }),
      )
      seam.position.set(0, 0.041, z)
      this.group.add(seam)
    }

    // Anlaufbereich (rote Gummimatte).
    const runup = new THREE.Mesh(new THREE.BoxGeometry(laneWidth + 0.3, 0.05, RUNUP_LENGTH), toonMat(COLORS.runup, 0.7))
    runup.position.set(0, 0.06, START_Z)
    runup.receiveShadow = true
    this.group.add(runup)
  }

  private buildGutters() {
    const totalLen = LANE_LENGTH + RUNUP_LENGTH
    for (const side of [-1, 1]) {
      const gutter = new THREE.Mesh(
        new THREE.BoxGeometry(GUTTER_HALF_OUTER - LANE_HALF_WIDTH, 0.06, LANE_LENGTH),
        toonMat(COLORS.gravel, 1),
      )
      gutter.position.set(side * (LANE_HALF_WIDTH + (GUTTER_HALF_OUTER - LANE_HALF_WIDTH) / 2), -0.01, LANE_CENTER_Z)
      gutter.receiveShadow = true
      this.group.add(gutter)

      // Metallschienen entlang der gesamten Bahn inkl. Anlaufbereich.
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.05, totalLen),
        new THREE.MeshStandardMaterial({ color: COLORS.metal, metalness: 0.6, roughness: 0.4 }),
      )
      rail.position.set(side * LANE_HALF_WIDTH, 0.05, LANE_CENTER_Z)
      this.group.add(rail)
    }
  }

  private buildPinStandStructure() {
    const archGroup = new THREE.Group()
    const postMat = toonMat(COLORS.wood, 0.8)
    const postGeo = new THREE.BoxGeometry(0.12, 1.4, 0.12)
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(postGeo, postMat)
      post.position.set(side * (LANE_HALF_WIDTH + 0.15), 0.7, PIN_STAND_Z - 0.9)
      post.castShadow = true
      archGroup.add(post)
    }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(LANE_HALF_WIDTH * 2 + 0.5, 0.15, 0.15), postMat)
    beam.position.set(0, 1.4, PIN_STAND_Z - 0.9)
    archGroup.add(beam)

    const wappen = new THREE.Mesh(new THREE.CircleGeometry(0.18, 16), toonMat(0x2e5b3e, 0.6))
    wappen.position.set(0, 1.2, PIN_STAND_Z - 0.83)
    archGroup.add(wappen)

    // Rückwand als Fangbereich.
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(LANE_HALF_WIDTH * 2 + 0.4, 0.9, 0.1), toonMat(COLORS.woodDark))
    backWall.position.set(0, 0.45, PIN_STAND_Z - 1.15)
    archGroup.add(backWall)

    this.group.add(archGroup)
  }

  private buildClubhouse() {
    const house = new THREE.Group()
    const bodyZ = PIN_STAND_Z - 6
    const body = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), toonMat(COLORS.clubhouse, 0.9))
    body.position.set(0, 1.5, bodyZ)
    body.castShadow = true
    house.add(body)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.5, 1.6, 4), toonMat(COLORS.roof, 0.8))
    roof.rotation.y = Math.PI / 4
    roof.position.set(0, 3.8, bodyZ)
    house.add(roof)

    const sign = this.buildClubhouseSign()
    sign.position.set(0, 2.25, bodyZ + 2 + 0.02)
    house.add(sign)

    this.group.add(house)
  }

  /** Schriftzug an der Fassade des Vereinsheims, per Canvas-Textur (kein externer Font nötig). */
  private buildClubhouseSign(): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 160
    const ctx = canvas.getContext('2d')!
    ctx.font = 'bold 108px "Segoe UI", Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineJoin = 'round'
    ctx.lineWidth = 10
    ctx.strokeStyle = '#2a1f18'
    ctx.strokeText('DIE UMWERFENDEN', canvas.width / 2, canvas.height / 2)
    ctx.fillStyle = '#f4e9d8'
    ctx.fillText('DIE UMWERFENDEN', canvas.width / 2, canvas.height / 2)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true })
    return new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.8), mat)
  }

  private buildTrees() {
    const positions: [number, number][] = [
      [-6, START_Z - 3],
      [6, START_Z - 6],
      [-7, 2],
      [7, -3],
      [-6.5, PIN_STAND_Z - 3],
      [6.5, PIN_STAND_Z - 4],
    ]
    for (const [x, z] of positions) {
      const tree = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.6, 8), toonMat(COLORS.woodDark))
      trunk.position.y = 0.8
      trunk.castShadow = true
      const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), toonMat(COLORS.grassDark, 1))
      foliage.position.y = 2.1
      foliage.castShadow = true
      tree.add(trunk, foliage)
      tree.position.set(x, 0, z)
      this.group.add(tree)
    }
  }

  private buildBenches() {
    for (const side of [-1, 1]) {
      const bench = new THREE.Group()
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.4), toonMat(COLORS.wood))
      seat.position.y = 0.45
      const legMat = toonMat(COLORS.woodDark)
      for (const lx of [-0.6, 0.6]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.35), legMat)
        leg.position.set(lx, 0.225, 0)
        bench.add(leg)
      }
      bench.add(seat)
      bench.position.set(side * (GUTTER_HALF_OUTER + 1.2), 0, START_Z - 0.5)
      this.group.add(bench)
    }
  }

  private buildFootballPlaceholder() {
    for (const side of [-1, 1]) {
      const field = new THREE.Mesh(new THREE.PlaneGeometry(10, 16), toonMat(COLORS.grassDark, 1))
      field.rotation.x = -Math.PI / 2
      field.position.set(side * 22, 0.005, START_Z - 8)
      this.group.add(field)
    }
  }
}
