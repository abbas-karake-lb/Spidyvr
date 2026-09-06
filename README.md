# SpidyVR

A WebXR city-swinging playground built for Meta Quest 3 and its Touch controllers.

**Play:** https://abbas-karake-lb.github.io/Spidyvr/

Open that address in **Meta Quest Browser**, select **Enter VR**, and allow the immersive session. The page must be opened over HTTPS. A phone browser can show the city, but Quest Browser is needed for the headset experience.

## Quest controls

| Control | Action |
|---|---|
| Left / right index trigger | Aim at a building, hold to shoot and attach that web, release to fly |
| Pull attached hand backward | Launch your body forward, opposite the hand stroke |
| Pull attached hand downward | Add upward launch momentum |
| Pull both attached hands | Combine both strokes for more launch power |
| Side grip with web attached | Reel in toward the anchor |
| Hold A, then release | Charge a super jump from a roof or the street |
| Left thumbstick | Walk and steer in the air |
| Right thumbstick | Smooth analog turn (18% dead zone, up to 120°/s) |
| B | Return to the starting roof |
| X | Cycle gentle / normal / strong pull power |
| Y | Pause and show controls; press again to resume |

Webs visibly travel for 75–220 milliseconds before the existing swing constraint becomes active. The firing sound is spatialized at the corresponding hand. The VR controls panel appears only while paused (Y).

Start on the marked roof. Aim above and ahead, attach a web, step or jump off, pull back, then release on the rising portion of the swing. Catch the next building with the other hand. Pulling down and back with both hands adds height and speed. Motion is intense; begin with gentle strokes.

Movement settings are on the start screen and saved only in your browser. The default full jump gains about 34 meters of height. The same 105 buildings and their collision bounds remain in place, with richer facades, rooftop equipment, water tanks, signs, ledges, lighting fixtures, and street furniture. The city now includes 56 moving traffic vehicles, 96 pedestrian routes, 18 birds, and an occasional distant aircraft; distance culling limits what is actually drawn. The outer city boundary returns you to the starting roof.

## Desktop

Click **Play on desktop**. WASD moves, mouse looks, left/right mouse holds the two webs, Q/E reel, hold/release Space charges a jump, R resets, and Escape pauses. Desktop reeling allows inspection of the city and swing simulation, but cannot reproduce physical VR hand gestures.

## Research and scope

See [RESEARCH.md](RESEARCH.md) for source links, physics design, tuning values, and evidence limitations. This is an original traversal implementation inspired by the requested BattleGlide behavior, not BattleGlide source code or an exact verified replica. Physical Quest 3 testing and direct feel comparison remain necessary.

## Development

No build system, npm install, runtime CDN, server, or API key is needed. All published files are in `docs/`. Serve this directory with a static server for local development; use HTTPS for headset testing (localhost is allowed only on the same device).

Run checks with Node 22 or later:

```sh
npm test
npm run check
```

- `docs/game.js`: renderer, XR frame/pose handling, controller input, audio, HUD, session lifecycle.
- `docs/physics.js`: fixed-step movement, pull impulses, rope constraints, collision, jumping.
- `docs/city.js`: original seeded layout and enhanced facade materials.
- `docs/city-detail.js`: shared rooftop and street detail batches.
- `docs/city-life.js`: pooled traffic, pedestrian LOD/gait, birds, aircraft, and sky.
- `docs/traversal.js`: continuous turn input and the web-flight state machine.
- `docs/vendor/`: vendored Three.js r180 and its MIT license.
- `tests/`: physics regression checks and city geometry budget checks.

GitHub Pages should publish from **main → /docs**. `.nojekyll` keeps the files as plain static assets. All browser imports are relative so the `/Spidyvr/` project URL works.

Original project code uses the repository's Apache-2.0 license. Three.js is distributed under its own included MIT license. No BattleGlide or Marvel assets are included.

## September 6 update

See [UPDATE-2026-09-06.md](UPDATE-2026-09-06.md) for changes, test coverage, performance budgets, and the remaining physical headset checks.

## Directional pull update

Pull down and back to boost up and forward, even when attached to a building below you. Pull up and back to boost down and forward. Vertical stroke direction is independent of anchor height; mostly horizontal arm extension remains a recovery movement. While a hand boost carries you away from an anchor, the rope lets out instead of immediately cancelling the boost. Ordinary rope tension resumes when that outward motion ends. Side-grip reeling explicitly overrides this and still draws you toward the anchor.

This change is isolated in its own commit. The preceding city/turning version is `7fb3f57b9ba8f9ccf9a79b0d5e7a4254170a0bbb`; reverting the directional-pull commit restores that behavior without undoing the city upgrade.
