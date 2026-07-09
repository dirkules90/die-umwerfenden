# 🎳 Kegeln in Lembeck

Ein digitales, physikbasiertes Kegelspiel für den mobilen Browser – eine originalgetreue
Nachbildung der Outdoor-Kegelbahn in Lembeck (Dorsten, NRW), inklusive des charakteristischen
mechanischen Hebels zum Aufstellen der Kegel.

Umgesetzt nach dem Lastenheft „Kegeln in Lembeck" (Version 1.0) für den Freundeskreis Daniel,
Tobias, Dirk, Fabian, Pascal und Alex.

## Spielprinzip

- **3D-Physik** (Three.js + Rapier.js): Wurf per Drag-and-Shoot, echte Kollisionssimulation von
  Kugel und neun Kegeln im Kranz-Aufbau.
- **Mechanischer Hebel**: Nach jedem Wurf müssen die Kegel per Zuggeste manuell aufgestellt
  werden – das zentrale Alleinstellungsmerkmal der Lembecker Bahn.
- **Hausnummer-Regelwerk**: Drei Würfe pro Runde, freie Verteilung der Ziffern auf Hunderter-,
  Zehner- und Einerstelle. Zwei Modi: „Hohe Hausnummer" und „Niedrige Hausnummer".
- **Sechs Charaktere**, Hotseat-Mehrspielermodus (1–6 Spieler an einem Gerät).
- **Lokale Statistik & Achievements**, ausschließlich im Browser gespeichert (LocalStorage),
  kein Server, kein Login.
- **PWA**: installierbar, offline-fähig nach dem ersten Laden.

## Entwicklung

```bash
npm install
npm run dev       # Entwicklungsserver (Desktop-Browser eignet sich zum Testen der Logik;
                   # das Spiel selbst ist für mobile mobile Querformat-Geräte ausgelegt)
npm run build      # Produktions-Build nach dist/
npm run preview    # Produktions-Build lokal ansehen
npm run lint        # oxlint
```

Zum Testen auf einem echten Smartphone: Entwicklungsrechner und Handy im selben Netzwerk,
`npm run dev -- --host` verwenden und die angezeigte Netzwerk-URL im mobilen Browser öffnen.

## Deployment

Der Workflow [`deploy.yml`](.github/workflows/deploy.yml) baut das Projekt bei jedem Push auf
`main` und veröffentlicht es automatisch über GitHub Pages. Voraussetzung: In den
Repository-Einstellungen unter **Settings → Pages** die Quelle auf **GitHub Actions** stellen.

Der `base`-Pfad in `vite.config.ts` ist auf `/die-umwerfenden/` gesetzt (Repository-Name). Bei
einem Fork oder einer Umbenennung des Repositories muss dieser Pfad angepasst werden.

## Projektstruktur

Die Struktur folgt Teil 18 des Lastenhefts:

```
src/
├── scene/         3D-Aufbau (Bahn, Kugel, Kegel, Hebel, Kamera, Umgebung)
├── physics/        Rapier-Weltinitialisierung, Kollisions-/Rinnenlogik
├── characters/     Sechs Charakterdefinitionen, stilisierte Low-Poly-Avatare
├── game/           Zustandsautomat, Hausnummer-Regeln, Scoring, Achievements
├── state/          Zentraler Zustand (Zustand-Store)
├── ui/             Bildschirme, HUD, Eingabe-Hooks (Drag-and-Shoot, Hebel)
├── audio/           Web-Audio-Soundmanager
└── storage/         LocalStorage-Persistenz
```

## Umsetzungsstand gegenüber dem Lastenheft

Der komplette Kernspielablauf aus Teil 3.3 ist funktionsfähig implementiert und wurde
End-to-End getestet (Wurf → Physik → Rinnen-/Kegelauswertung → Ziffernwahl → Hebel →
Kegel-Aufrichtung → Kugelrücklauf → Spielerwechsel → Rundenergebnis → Bestenliste).
Alle Teile 1–20 sind umgesetzt; ein paar Punkte im Detail:

- **Avatare** (Teil 11.2) sind eigenständige, stilisierte Low-Poly-Figuren, unterschieden durch
  Statur, Haarfarbe, Bart und Brille. Es wurden keine Referenzfotos realer Personen verarbeitet;
  die Charaktere sind bewusst abstrahiert statt fotorealistisch nachgebildet.
- **Sounddesign** (Teil 13): Die Architektur (Web Audio API, getrennte Musik-/Effektlautstärke,
  Ereignis- und Ambient-Sounds) ist vollständig umgesetzt. Da keine lizenzierten Audioaufnahmen
  vorliegen, werden alle Klänge prozedural synthetisiert (Oszillatoren/Rauschgeneratoren) statt
  aus produzierten Audiodateien zu stammen. Produzierte Sounds lassen sich später 1:1 in
  `src/audio/soundManager.ts` einsetzen, ohne die Aufrufstellen zu ändern.
- **Umgebung** (Teil 4): Bahn, Rinnen, Kegelstand, Vereinsheim, Bäume, Bänke und
  Sponsorenbanner (mit frei erfundenen Namen) sind als stilisierte Cartoon-Geometrie umgesetzt,
  nicht als detailgetreue Nachbildung der Referenzfotos (die diesem Lastenheft nicht als
  Bilddateien beilagen).
- **Erweiterungen aus Teil 21** (Tag-/Nachtmodus, Wetter, Online-Highscores, weitere
  Kameraperspektive, König-Kegel-Sonderregel etc.) sind wie im Lastenheft festgelegt **nicht**
  Teil dieses ersten Entwicklungsumfangs.
- **Kugelauswahl** (Teil 4.5): Auf Wunsch des Auftraggebers nach dem ersten Praxistest wurde die
  Wahl zwischen leichter und schwerer Kugel entfernt, um das Spiel weniger verwirrend zu machen.
  Es gibt jetzt nur noch eine einzige Kugel mit fest eingestellten Wurfeigenschaften.

## Lizenz / Datenschutz

Alle Spieler- und Statistikdaten verbleiben ausschließlich lokal im Browser des jeweiligen
Geräts. Es gibt keine Cloud-Synchronisierung, kein Tracking und kein Login.
