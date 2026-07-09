import * as THREE from 'three'
import { CharacterModel } from './CharacterModel'
import type { AvatarConfig } from '../game/types'

let sharedRenderer: THREE.WebGLRenderer | null = null

function getRenderer(size: number): THREE.WebGLRenderer {
  if (!sharedRenderer) {
    const canvas = document.createElement('canvas')
    sharedRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  }
  sharedRenderer.setSize(size, size, false)
  sharedRenderer.setPixelRatio(2)
  return sharedRenderer
}

/** Rendert ein Portrait-Vorschau-Bild (3D-Kopf-Bust) für die Charakterauswahl (Teil 11.3). */
export function renderAvatarThumbnail(config: AvatarConfig, size = 160): string {
  const renderer = getRenderer(size)
  const scene = new THREE.Scene()
  scene.background = null

  const hemi = new THREE.HemisphereLight(0xffffff, 0x4c9a3a, 0.9)
  scene.add(hemi)
  const key = new THREE.DirectionalLight(0xfff4d6, 1.2)
  key.position.set(1, 1.5, 2)
  scene.add(key)

  const model = new CharacterModel(config)
  scene.add(model.group)

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 10)
  camera.position.set(0, 1.55, 0.85)
  camera.lookAt(0, 1.42, 0)

  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')

  scene.remove(model.group)
  return url
}
