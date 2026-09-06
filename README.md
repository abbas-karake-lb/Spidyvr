# SpidyVR

A WebXR city-swinging playground built for Meta Quest 3 and its Touch controllers.

**Play:** https://abbas-karake-lb.github.io/Spidyvr/

Open that address in **Meta Quest Browser**, select **Enter VR**, and allow the immersive session. The page must be opened over HTTPS. A phone browser can show the city, but Quest Browser is needed for the headset experience.

## Quest controls

| Control | Action |
|---|---|
| Left / right index trigger | Aim at a building or person; hold to shoot/attach, release to detach |
| Pull attached hand backward | Launch your body forward, opposite the hand stroke |
| Pull attached hand downward | Add upward launch momentum |
| Pull both attached hands | Combine both strokes for more launch power |
| Side grip with building / NPC web | Reel toward the building / reel the person toward your hand |
| Hold either thumbstick click near a person | Grab with that hand; release to drop or throw with hand velocity |
| Move a web hand attached to a person | Lift, pull, or swing their body in the hand movement direction |
| Strike a nearby person with your hand | Directional physical punch with haptic feedback |
| Hold A, then release | Charge a super jump from a roof or the street |
| Left thumbstick | Walk and steer in the air |
| Right thumbstick | Smooth analog turn (18% dead zone, up to 120°/s) |
| B | Return to the starting roof |
| X | Cycle gentle / normal / strong pull power |
| Y | Pause and show controls; press again to resume |

Webs visibly travel for 75–220 milliseconds before elastic web tension becomes active. The firing sound is spatialized at the corresponding hand. The VR controls panel appears only while paused (Y).

Start on the marked roof. Aim above and ahead, attach a web, step or jump off, pull back, then release on the rising portion of the swing. Catch the next building with the other hand. Pulling down and back with both hands adds height and speed. Motion is intense; begin with gentle strokes.

Movement settings are on the start screen and saved only in your browser. The default full jump gains about 34 meters of height. The same 105 buildings and their collision bounds remain in place, with richer facades, rooftop equipment, water tanks, signs, ledges, lighting fixtures, and street furniture. The city now includes 92 moving vehicles, 85 parked vehicles, 288 pedestrians, 24 dogs, 26 birds, and occasional aircraft. Distance culling and LOD limit visible detail. The waterfront, distant skyline, clouds, and islands extend the setting beyond the original street grid. The outer boundary returns you to the starting roof when you are not holding a web or NPC.

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
- `docs/physics.js`: fixed-step movement, pull impulses, elastic rope tension, collision, jumping.
- `docs/city.js`: original seeded layout and enhanced facade materials.
- `docs/city-detail.js`: shared rooftop and street detail batches.
- `docs/city-life.js`: traffic signals/queues/turns, crowd poses/LOD, dogs, birds, aircraft, and actor contact shadows.
- `docs/city-models.js`: reusable vehicle and articulated character geometry.
- `docs/city-look.js`: facade textures, nearby architecture, clouds, waterfront, distant scenery, and baked street shadows.
- `docs/npc-physics.js`: bounded ragdoll simulation, hits, NPC webs, grabbing, throws, and recovery.
- `docs/traversal.js`: continuous turn input and the web-flight state machine.
- `docs/vendor/`: vendored Three.js r180 and its MIT license.
- `tests/`: physics regression checks and city geometry budget checks.

GitHub Pages should publish from **main → /docs**. `.nojekyll` keeps the files as plain static assets. All browser imports are relative so the `/Spidyvr/` project URL works.

Original project code uses the repository's Apache-2.0 license. Three.js is distributed under its own included MIT license. No BattleGlide or Marvel assets are included.

## September 6 update

See [UPDATE-2026-09-06.md](UPDATE-2026-09-06.md) for changes, test coverage, performance budgets, and the remaining physical headset checks.

## Elastic web catch update

Attaching a web preserves incoming velocity. The web stretches beyond its unstretched attachment length and applies damped spring tension, gradually slowing outward travel while retaining motion along the swing. There is no hard distance projection, instant radial-velocity cancellation, automatic rest-length payout, or speed-triggered break. Stronger stretching creates more tension, with the combined acceleration of both webs capped to avoid an abrupt catch. Side-grip reeling shortens the unstretched length.

A deliberate hand pull still removes conflicting momentum and launches opposite the hand movement, independent of anchor height. Passive tension yields during the gesture, then smoothly returns over 0.22 seconds after an 0.08-second grace period. This keeps a loaded web from immediately cancelling a new pull. Releasing a web preserves current velocity.

Speed, webs crossing buildings, and crossing the city boundary while tethered do not detach webs. Trigger release, pause, reset, and XR tracking/session safety releases remain intact. Webs are straight lines rather than wrapping around corners; body collision remains enabled. Catching is gradual, so leave braking distance before obstacles.

The solver uses the existing 180 Hz physics loop, shared temporary vectors, and one spring evaluation per held web instead of five rigid constraint iterations. It adds no meshes, textures, or draw calls. Web visuals already follow the changing hand-to-anchor distance.

Tests cover 80 m/s catches with short and long webs, tangential swinging, stretched-web pulls, dual webs, release/re-fire, collision, and real game input paths driven by simulated Quest controllers at 72/90/120 Hz. An isolated, horizontal 80 m/s outward catch stops outward travel in about 0.7 seconds; geometry, gravity, and controller input affect the actual result. Physical Quest 3 feel and comfort still require headset testing.

This update is isolated in its own reversible commit. The preceding rigid-rope version is `4f70e01b81b0ebc81729a5bd47e053db4680b6aa`.

## Living city overhaul

See [CITY-OVERHAUL.md](CITY-OVERHAUL.md) for the new interactions, rendering budgets, checks, and remaining headset validation. Building collision bounds and the elastic player traversal implementation are preserved. The preceding version is `5de294d3ada94e6cd8f482aa73aa4f4dcd66ccf9`; this overhaul is published as a separate reversible commit.
