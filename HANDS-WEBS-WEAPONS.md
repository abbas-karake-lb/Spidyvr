# Animated hands, web visuals and city gun pickups

## Controls

- Near a floating pistol (within 65 cm of the hand), press the **side grip** and keep holding to carry it. Two are on the starting rooftop, a couple of metres ahead; the rest are distributed across rooftops and sidewalks.
- While carrying a pistol, each **index-trigger press** fires one shot. Release and press again for another shot. Either hand can carry a gun; the other can continue shooting webs, or carry another gun.
- Release the side grip to drop it. Move the hand and release to throw, including the player's existing travel velocity. The next trigger press shoots a web again. Dropping while already holding the trigger does not accidentally fire a web.
- Without a gun, trigger/web and grip/reel controls retain their existing behaviour. Thumbstick click still grabs pedestrians. A, B, X, Y and both sticks retain their mappings.
- Pause, tracking loss, hidden sessions and focus loss release weapons without a throwing impulse. Resume requires releasing and pressing grip again before another pickup.

## Hand research and implementation

The hand models are the **generic-hand left/right GLB assets** from [Immersive Web's WebXR Input Profiles](https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets/profiles/generic-hand), distributed under the project's [MIT asset license](https://github.com/immersive-web/webxr-input-profiles/blob/main/packages/assets/LICENSE.md). The license is included next to the bundled files. They are the default asset family used by [Three.js XRHandMeshModel](https://github.com/mrdoob/three.js/blob/r180/examples/jsm/webxr/XRHandMeshModel.js).

These are actual skinned anatomical hand meshes: 1,360 vertices, 2,314 triangles and 25 joints per hand. `docs/hands.js` reads this specific uncompressed GLB layout, converts the rest pose into wrist coordinates and drives joint curls from controller values. It intentionally does not implement a general glTF loader. Controller poses remain the original grip-space poses; the hand model is a cosmetic child, so animation cannot change measured hand pulls.

The models wear detailed red/blue gloves, with a fitted cuff and web emitter. Relaxed, squeeze/fist, trigger-touch, web-shoot and gun-grip poses blend smoothly. The web gesture extends index and little fingers while curling the middle and ring fingers toward the palm. Gun mode curls the hand around the grip and animates the trigger finger. These are controller-driven poses, not claims of optical tracking of every finger; [Meta's WebXR hand tracking](https://developers.meta.com/horizon/documentation/web/webxr-hands/) is a separate input mode.

## Web appearance

`docs/web-visual.js` replaces the straight cylinder with one reusable curved tube per hand. Braided/fibre shading, traveling ripples, cosmetic sag, a settling ripple and a small web-shaped impact provide flexible strand movement. The first/last points remain exactly at the existing emitter and flight tip or anchor. Fine shader patterns fade at subpixel scales to limit aliasing.

`docs/physics.js` and `docs/traversal.js` are byte-for-byte unchanged: identical web travel duration, attachment timing, spring tension, rest length, pull strength, movement, turning and release momentum. The curves do not wrap around building corners or add physical rope segments.

## Guns and NPC effects

`docs/weapons.js` adds 20 pooled pickups sharing one detailed pistol geometry/material. Pickups bob and rotate; held guns follow the controller and have visual recoil. Firing adds spatial audio, haptics, a brief muzzle flash and a pooled tracer. Collision is a hitscan from the visible muzzle, selecting the nearest building/NPC hit, including preventing shots through a wall containing the muzzle.

A hit kills the pedestrian and applies a directional impulse to the existing articulated ragdoll. Dead pedestrians stop walking and stay down. When a body sleeps or leaves the active simulation pool, its physical pose is retained instead of playing the usual get-up animation. Nearby survivors use the existing reaction behaviour. Active ragdolls remain capped at 12; no gore system or persistent save state is added. Corpses are omitted from distant standing-person LODs.

## Performance and checks

- About 184 KiB of bundled hand GLBs, no third-party requests during play.
- Two skinned hand meshes; 56 × 8 reusable tube segments per web.
- Shared pickup geometry/material; 100 m pickup culling and nearby-only halos.
- Eight reusable shot-effect slots; raycasts happen only on accepted trigger presses.
- Existing population, city layout and physics budgets remain intact.

The complete automated suite passed **66 tests**. New coverage includes both real hand assets, skinning bounds, gesture consistency at 72/90/120 Hz, exact web endpoints, occluded shots, directional NPC death, sleeping corpse poses, simulation limits, controller pickup/fire/throw/web reuse, dual ownership, pause and tracking loss. A focused follow-up verified the fresh-grip requirement after a safety release.

CPU-rendered views of the actual skinned geometry were inspected for anatomical shape and web/grip poses. No headset or GPU-rendered browser review was available; Quest 3 finger alignment, perceived scale, shader appearance and frame rate still need an on-device test.
