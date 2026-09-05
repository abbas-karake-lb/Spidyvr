# BattleGlide movement research and SpidyVR implementation

Research date: 5 September 2026.

## What the public sources establish

BattleGlide's developer describes an open city with rope swinging, jumping, and climbing. The developer also publishes separate swinging and pulling tutorials. These establish the reference movement families, but do not publish the underlying numerical physics model.

Primary sources:

- [BattleGlide developer website](https://www.battleglide.com/) — developer description of the city and traversal.
- [BattleGlide on the Meta Quest store](https://www.meta.com/experiences/battleglide/9685315748175636/) — developer's product listing.
- [Developer: full swinging mechanic tutorial](https://www.instagram.com/reel/DUtq-lRErEb/) — indexed caption identifies the official swinging tutorial, dated 13 February 2026.
- [Developer: updated pulling tutorial](https://www.instagram.com/reel/C6MjyXJRf7b/) — indexed caption identifies an updated pulling tutorial.
- [Swinging tutorial on YouTube](https://www.youtube.com/shorts/JDJxyCZY1bU) — additional reference for comparison during headset playtesting.

**Evidence limitation:** The social-video pages were throttled when opened. Their indexed captions were available; full video playback/transcripts were not. This research does not claim frame-by-frame video analysis. No source code, exact button mapping, force constants, rope solver, or controller-to-body gain was verified from BattleGlide. The specific opposite-hand pull behavior below follows the user's detailed description. Numerical values and implementation decisions are original to this project, not measured BattleGlide values.

## Mechanics translated into this game

| Requirement | Implementation |
|---|---|
| Shoot toward a building | Each tracked controller supplies its own aim ray. The nearest intersected building within 170 meters becomes the anchor. A marker shows a valid aim point. Empty sky creates no anchor. |
| Independent webs | Hold either index trigger to retain that hand's anchor. Hold both for two simultaneous constraints. Release individually. |
| Swing under gravity | Fixed 180 Hz movement simulation. The rope limits maximum hand-to-anchor distance; it cannot push when slack. Outward radial velocity is removed when taut, preserving tangential motion. |
| Keep flying after release | Releasing deletes the constraint without resetting velocity. Gravity and small air drag continue to act. |
| Pull hand back to launch forward | Measure grip movement relative to the headset in tracking space, rotate only into player world yaw, negate the stroke, and add it to body velocity. Pulling down can add upward velocity. |
| Fast pull gives stronger launch | A bounded speed-sensitive gain multiplies physical stroke displacement. Subtle noise and large tracking discontinuities are rejected. Extending the arm back toward the anchor does not apply a reverse boost. |
| Use two hands for a larger launch | Both valid hand strokes contribute, under the overall speed limit. |
| Pull closer / reel | Working strokes shorten the rope. Holding the side grip also reels it in continuously and supplies a modest inward motor force. |
| Super jump | Hold A while grounded to charge over 0.65 seconds, release to jump. Default full jump is approximately 34 meters above takeoff before drag. No repeated air jumps. |
| Buildings are solid | Swept axis body collisions stop at walls and land on rooftops. Rope correction uses the same collision path. Obstructed webs detach rather than passing through an intervening building. |
| Quest controllers | Use WebXR input sources by handedness, target-ray poses for aim, grip poses for physical pull, xr-standard trigger/grip/buttons/sticks, and haptic feedback. |

## Original tuning values

Units are meters and seconds. Defaults: gravity 15 m/s², full jump launch 32 m/s, pull gain 22 with speed scaling, maximum body speed 80 m/s, grip reeling 11 m/s, air drag coefficient 0.018/s, minimum rope length 1.2 m. The physics module is readable and these values are editable. Pull gain, jump velocity, gravity, and the optional VR comfort vignette can also be changed on the start screen. Left X cycles pull gain between gentle, normal, and strong in VR.

The physical working stroke must have a component away from its anchor. Its full opposite direction contributes to launch, allowing the hand stroke to shape the trajectory. It is not merely an automatic zip toward a target. Controller displacement is sampled once per XR frame, so additional fixed physics steps do not multiply a stroke. The input is headset-relative to avoid counting simulated travel as another hand pull.

## Web platform sources

- [W3C WebXR Device API](https://www.w3.org/TR/webxr/) — immersive sessions, reference spaces, tracking poses, and frame callbacks.
- [W3C WebXR Gamepads Module](https://www.w3.org/TR/webxr-gamepads-module-1/) — xr-standard trigger, squeeze, and thumbstick mappings.
- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html) — renderer session integration and reference spaces.
- [Meta WebXR First Steps](https://github.com/meta-quest/webxr-first-steps) — Meta's Three.js/WebXR development reference.
- [GitHub Pages publishing sources](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site) — static publishing from main /docs.

## Validation and remaining headset work

Automated checks cover gravity swinging, slack rope behavior, release momentum, backward/downward pulling, dual pulls, stationary hands, tracking discontinuities, 72/90/120 Hz gesture consistency, stronger fast strokes, thin-wall and rooftop collision, obstruction during rope correction, jump height, no midair repeated jump, extended dual-rope stability, and city geometry budgeting.

The deterministic city contains 105 buildings and about 41,486 triangles across an estimated 39 city draw calls (before hands, webs, and HUD). This is an optimization budget, not a measured Quest frame rate. Lighting avoids real-time shadow maps, geometry is instanced, and Three.js r180 is served locally rather than fetched from a third-party CDN.

A physical Quest 3 was not available during development. Stereo presentation, Touch Plus mapping on the user's actual browser version, haptics, sustained headset frame rate, perceived comfort, and subjective similarity to BattleGlide still require a hardware playtest. The available automated tests cannot establish that the result feels exactly like BattleGlide.

The scope is a traversal sandbox. It does not include BattleGlide's combat, NPCs, multiplayer, wall climbing, or proprietary assets. The city boundary returns the player to the starting roof, and ropes detach at obstructions rather than wrapping around corners.
