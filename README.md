# 🎳 Kegeln in Lembeck

Ein digitales, physikbasiertes Kegelspiel für den mobilen Browser – eine originalgetreue
Nachbildung der Outdoor-Kegelbahn in Lembeck (Dorsten, NRW), inklusive des charakteristischen
mechanischen Hebels zum Aufstellen der Kegel.

Ursprünglich nach dem Lastenheft „Kegeln in Lembeck" (Version 1.0) umgesetzt, seither nach
Praxistests des Auftraggebers mehrfach angepasst (siehe „Umsetzungsstand" unten) – für den
Freundeskreis Daniel, Tobias, Dirk, Fabian, Pascal und Alex.

## Spielprinzip

- **3D-Physik** (Three.js + Rapier.js): Wurf per Drag-and-Shoot mit drei unabhängigen
  Komponenten – Richtung, Kraft und Spin/Effet (aus dem Schwung der Fingergeste beim Loslassen) –
  echte Kollisionssimulation von Kugel und neun Kegeln im Kranz-Aufbau.
- **Mechanischer Hebel**: Nach jedem Wurf müssen die Kegel per Zuggeste manuell aufgestellt
  werden – das zentrale Alleinstellungsmerkmal der Lembecker Bahn.
- **Hausnummer-Regelwerk**: Jede Partie besteht aus genau drei Würfen. Nach jedem Wurf wird frei
  entschieden, ob die geworfene Ziffer an die Hunderter-, Zehner- oder Einerstelle kommt. Zwei
  Modi: „Hohe Hausnummer" und „Niedrige Hausnummer" (Rinne zählt als 0 bzw. 9).
- **Ein Spieler pro Gerät**: Jeder aus der Gruppe wählt beim Spielstart seinen eigenen Charakter
  und spielt seine eigene Hausnummer auf seinem eigenen Handy – kein Hotseat-Wechsel.
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

```
src/
├── scene/         3D-Aufbau (Bahn, Kugel, Kegel, Hebel, Kamera, Umgebung)
├── physics/        Rapier-Weltinitialisierung, Kollisions-/Rinnenlogik
├── characters/     Sechs Charakterdefinitionen, stilisierte Low-Poly-Avatare
├── game/           Zustandsautomat, Hausnummer-Regeln, Achievements
├── state/          Zentraler Zustand (Zustand-Store)
├── ui/             Bildschirme, HUD, Eingabe-Hooks (Drag-and-Shoot, Hebel)
├── audio/           Web-Audio-Soundmanager
└── storage/         LocalStorage-Persistenz
```

## Umsetzungsstand

Das Projekt startete als Umsetzung des Lastenhefts „Kegeln in Lembeck" v1.0 (Hotseat-Mehrspieler,
mehrere Runden, Kugelauswahl leicht/schwer). Nach Praxistests des Auftraggebers wurde das Konzept
mehrfach angepasst:

- **Ein Spieler pro Partie/Gerät** statt Hotseat: Jeder aus der Gruppe spielt auf dem eigenen
  Handy und ermittelt seinen eigenen Highscore. Spielerauswahl ist daher eine Einzelauswahl statt
  Mehrfachauswahl.
- **Immer eine Runde** (drei Würfe) statt konfigurierbarer Rundenanzahl.
- **Eine Kugel** statt der ursprünglich vorgesehenen Auswahl zwischen leicht/schwer.
- **Spin/Effet als dritte Steuerungskomponente**: Neben Richtung und Kraft lässt sich die Kugel
  durch einen seitlichen Schwung am Ende der Zuggeste anschneiden, was die Flugbahn per
  vereinfachtem Magnus-Effekt krümmt.
- **Avatare** sind eigenständige, stilisierte Low-Poly-Figuren für die Wurfanimation im 3D-Spiel;
  in Auswahlbildschirm und HUD werden zusätzlich echte, vom Auftraggeber bereitgestellte Fotos
  angezeigt (`public/icons/<Name>.png`).
- **Sounddesign**: Die Architektur (Web Audio API, getrennte Musik-/Effektlautstärke,
  Ereignis-Sounds, Hintergrundmusik) ist vollständig umgesetzt. Da keine lizenzierten
  Audioaufnahmen vorliegen, werden alle Klänge und die Hintergrundmelodie prozedural
  synthetisiert (Oszillatoren/Rauschgeneratoren) statt aus produzierten Audiodateien zu stammen.
  Produzierte Sounds lassen sich später 1:1 in `src/audio/soundManager.ts` einsetzen, ohne die
  Aufrufstellen zu ändern.
- **Umgebung**: Bahn, Rinnen, Kegelstand, Vereinsheim (mit „Die Umwerfenden"-Schriftzug an der
  Fassade), Bäume und Bänke sind als stilisierte Cartoon-Geometrie umgesetzt, nicht als
  detailgetreue Nachbildung realer Referenzfotos. Die ursprünglich vorgesehenen Werbebanner am
  Bahnrand wurden entfernt, da sie im Spiel die Sicht auf die Bahn versperrten.
- **Statistik**: Zeigt Bestwerte (Hoch/Niedrig), Partienzahl, „Alle Neune"-Treffer, Rinnenwürfe
  und Achievements. Da nur noch solo gespielt wird, entfallen Siegquote und Hebel-Betätigungen.
- Tag-/Nachtmodus, Wetterzustände, Online-Highscores, weitere Kameraperspektive und die
  König-Kegel-Sonderregel aus dem ursprünglichen Lastenheft sind weiterhin **nicht** umgesetzt.

## Lizenz / Datenschutz

Alle Spieler- und Statistikdaten verbleiben ausschließlich lokal im Browser des jeweiligen
Geräts. Es gibt keine Cloud-Synchronisierung, kein Tracking und kein Login.
