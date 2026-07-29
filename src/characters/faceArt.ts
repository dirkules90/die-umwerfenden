/** 'blink' ist keine echte Stimmung, sondern ein kurzer Augenschluss-Frame für die Idle-Animation
 * (Teil: UI-Politur, siehe CharacterModel.update) - macht die Figur in Ruhehaltung lebendiger. */
export type Mood = 'neutral' | 'happy' | 'meh' | 'sad' | 'blink'

/**
 * Bemaltes Mii-artiges Gesicht (Teil: Charaktermodell-Überarbeitung, Vorbild Wii-Bowling-Mii) - wird
 * sowohl auf die 3D-Kopf-Textur (siehe CharacterModel.buildFaceTexture) als auch auf ein flaches
 * 2D-Badge neben dem Wurfergebnis (siehe ui/components/MoodFace.tsx) gezeichnet, damit beide
 * garantiert dieselbe Mimik zeigen statt zweier separat gepflegter Zeichnungen.
 */
export function drawFace(ctx: CanvasRenderingContext2D, mood: Mood, skinColor: string, width: number, height: number) {
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = skinColor
  ctx.fillRect(0, 0, width, height)

  const cx = width / 2
  const eyeY = height * 0.43
  const eyeDX = width * 0.2
  const leftX = cx - eyeDX
  const rightX = cx + eyeDX
  const ink = '#241f1a'
  const s = width / 256 // Skalierungsfaktor gegenüber der ursprünglichen 256x224-Referenzgröße

  // Augenbrauen - Position/Neigung transportiert die Stimmung mindestens so stark wie die Augen.
  ctx.fillStyle = ink
  for (const side of [-1, 1]) {
    const bx = cx + side * eyeDX
    ctx.save()
    ctx.translate(bx, eyeY - 40 * s)
    if (mood === 'sad') ctx.rotate(side * -0.32)
    else if (mood === 'happy') ctx.rotate(side * 0.12)
    else if (mood === 'meh') ctx.rotate(side * 0.22 * -1)
    ctx.fillRect(-26 * s, -5 * s, 52 * s, 10 * s)
    ctx.restore()
  }

  if (mood === 'happy') {
    // Fröhlich zugekniffene Augen (^‿^) statt offener Augäpfel.
    ctx.strokeStyle = ink
    ctx.lineWidth = 9 * s
    ctx.lineCap = 'round'
    for (const x of [leftX, rightX]) {
      ctx.beginPath()
      ctx.arc(x, eyeY + 14 * s, 22 * s, Math.PI, Math.PI * 2)
      ctx.stroke()
    }
  } else if (mood === 'blink') {
    // Kurzer, flacher Strich statt der offenen Augäpfel - simuliert den Sekundenbruchteil eines
    // Lidschlags in der Idle-Animation, ohne eine eigene fünfte Grundstimmung zu behaupten.
    ctx.strokeStyle = ink
    ctx.lineWidth = 6 * s
    ctx.lineCap = 'round'
    for (const x of [leftX, rightX]) {
      ctx.beginPath()
      ctx.moveTo(x - 20 * s, eyeY)
      ctx.lineTo(x + 20 * s, eyeY)
      ctx.stroke()
    }
  } else {
    for (const x of [leftX, rightX]) {
      const squint = mood === 'sad' ? 0.8 : 1
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = ink
      ctx.lineWidth = 4 * s
      ctx.beginPath()
      ctx.ellipse(x, eyeY, 25 * s, 28 * s * squint, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = ink
      ctx.beginPath()
      ctx.arc(x, eyeY + (mood === 'sad' ? 6 * s : 3 * s), 11 * s, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(x - 4 * s, eyeY - 3 * s, 4 * s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (mood === 'sad') {
    // Träne unter dem rechten Auge - klar erkennbares "schlechter Wurf"-Signal auch aus der Distanz.
    ctx.fillStyle = '#6fc3ff'
    ctx.beginPath()
    ctx.moveTo(rightX + 18 * s, eyeY + 22 * s)
    ctx.quadraticCurveTo(rightX + 28 * s, eyeY + 44 * s, rightX + 18 * s, eyeY + 54 * s)
    ctx.quadraticCurveTo(rightX + 8 * s, eyeY + 44 * s, rightX + 18 * s, eyeY + 22 * s)
    ctx.fill()
  }

  // Mund: fröhlicher Bogen, gerade Linie oder trauriger Bogen.
  ctx.strokeStyle = ink
  ctx.fillStyle = ink
  ctx.lineWidth = 8 * s
  ctx.lineCap = 'round'
  const mouthY = height * 0.705
  if (mood === 'happy') {
    ctx.beginPath()
    ctx.arc(cx, mouthY - 14 * s, 34 * s, Math.PI * 0.12, Math.PI * 0.88)
    ctx.fill()
  } else if (mood === 'sad') {
    ctx.beginPath()
    ctx.arc(cx, mouthY + 26 * s, 30 * s, Math.PI * 1.2, Math.PI * 1.8)
    ctx.stroke()
  } else if (mood === 'meh') {
    ctx.save()
    ctx.translate(cx, mouthY)
    ctx.rotate(0.08)
    ctx.beginPath()
    ctx.moveTo(-26 * s, 0)
    ctx.lineTo(26 * s, 0)
    ctx.stroke()
    ctx.restore()
  } else {
    ctx.beginPath()
    ctx.moveTo(cx - 24 * s, mouthY)
    ctx.quadraticCurveTo(cx, mouthY + 10 * s, cx + 24 * s, mouthY)
    ctx.stroke()
  }
}
