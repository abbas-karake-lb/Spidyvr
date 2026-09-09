# Quarantine Residences

A separate, repeatable zombie encounter on the eastern waterfront at **(252, 44)**. The original 105 city buildings and their collision bounds remain unchanged. The gold crown, elevated beacon, large sign and a direction sign on the starting rooftop identify the new building. Its west-facing street doors open automatically.

## Playing

- Pick up either entrance supply weapon with the existing **side grip**; hold it and use the **trigger** to fire. The silver Breacher does 90 body damage per shot; the teal Rapid does 45 and fires automatically while the trigger is held. Ordinary city pistols still work (40 body damage). Headshots multiply damage by 2.5.
- Explore **ten floors / twenty furnished apartments**. Each floor has living rooms, kitchens, bedrooms and bathrooms, window bays, open apartment doors, fixtures and signage. Each kitchen includes cabinets, stove, extractor, fridge, counter and sink. Stairs connect every floor to the roof.
- The elevator automatically calls to the nearby landing. Wait for its visible safety gate to open, then enter on the **left to go up**, or **right to go down**. It carries the player continuously to the adjacent floor. Step out before selecting another trip. No existing controller buttons are reassigned.
- Forty infected spawn at randomized reachable positions, four per floor. They patrol, pursue through a floor's real doorways, stagger when shot, wind up attacks, and inflict damage only within reach and clear line of sight. They remain on their assigned floors. Directional deaths use the existing articulated ragdoll solver in a separate pool.
- The small wrist display shows health, remaining enemies and floor. A hit produces a red edge flash, sound and haptics. Four unprotected hits defeat the player and immediately return them to the entrance with full health and four seconds of protection. Webs/grabs are released safely; supply weapons return to the cache. Kills already earned remain earned.
- Defeat every zombie and reach the roof pedestal to receive the **gold Warden**, a 150-damage automatic weapon with a faster firing rate. It uses the same grip, throwing and web-reuse controls and can be carried into the city. The reward is issued once per round; an already owned Warden is reused rather than multiplying pickups indefinitely.
- The ten-minute repeat timer starts when the last zombie dies. Once it expires and the player is outside, a fresh randomized encounter becomes available. It never spawns a new wave around a player still inside. Pausing freezes the encounter timer and simulation. Encounter progress is session-local.

## Integration and performance

- `docs/quarantine-building.js`: independent landmark, furnished geometry, collision surfaces, stair support, elevator and floor visibility. No solid exterior AABB seals off the interior. Nearby-floor collision selection and a broad approach margin protect fast traversal without adding every interior collider to normal city movement.
- `docs/quarantine-zombies.js`: encounter state, navigation grids, damage, ragdolls, rewards, timer and one instanced articulated zombie draw. Forty stored actors, typically four simulated pursuers and at most twelve visible bodies. Six active corpse simulations, with sleeping/retired poses retained. Navigation refreshes at 4 Hz.
- `docs/weapons.js`: optional hostile hit target, added supply variants and per-weapon damage/rate. Existing city weapon locations, ordinary pistol firing and NPC interactions are preserved.
- `docs/game.js`: initializes the encounter, applies support only at this building, adds its surfaces to aiming/weapon occlusion, and displays damage/wrist feedback. `docs/physics.js`, hand alignment, web appearance and traversal helpers are unchanged.
- `docs/index.html`: controls and new module version; `tests/quarantine.test.js`: complete encounter checks.

Static details use shared materials and box instancing per floor. Only adjacent interior floors are visible nearby; distant actors/interiors are hidden. Two unshadowed local fill lights, shared 256px generated surface textures, one small pose texture and pooled existing gun effects limit added cost. Zombie materials/geometry are handcrafted and optimized; this is not a claim of scanned assets or photorealism. Weapon slide, optic and barrel variants share the established grip pose.

## Verification

The 75-test full regression suite passed, covering prior movement, web elasticity/pulls, smooth turning, city layout, NPC interactions and hands/weapons, plus the new encounter. Focused tests physically walk the entrance and all stair flights to the roof, enter both apartment layouts, ride the lift in both directions, verify reachable randomized spawns, attacks/occlusion, death protection, completion gating and the ten-minute reset. The Quest input harness tests actual supply pickup, automatic zombie hits, red damage feedback, safe respawn, immediate web reuse and physical reward pickup. A plan rendered from the actual authored geometry was inspected.

No physical Quest 3 or GPU/browser rendering session was available. On-headset visual quality, comfort while riding the lift and sustained frame rate still require a device test. The full feature is isolated in one commit for straightforward rollback.

## Interior stability and combat follow-up

- Exterior glazing is now opaque, depth-writing architectural glazing; wider mullions close the gaps between bays. The entrance still slides open. Structural floors, ceilings, walls and stairs remain resident at every distance. Furnishings preload before entry, with floor/distance hysteresis. Handrails are one static batch instead of forty separate meshes.
- Removed the two proximity-toggled point lights (changing the light count forced lit-material shader variants). Warm material fill and existing scene lighting remain. Only exterior batches cast shadows; interior surfaces no longer sample the outdoor moving shadow map. Static mesh matrices are frozen. Enclosed upper apartment/corridor cells suppress the outdoor render group; the city is restored before the ground lobby, stairs, outer walls and rooftop.
- A 4 m spatial grid narrows movement and zombie-ragdoll collision candidates without changing movement forces or collision response. Queries include the player's swept velocity and body clearance. Gun and web rays first reject irrelevant floor bounds. Temporary query arrays are reused. Up to four zombie ragdolls simulate nearby; distant simulation and invisible pose uploads are skipped.
- The tower footprint is registered as a traffic exclusion. Cars choose an intersection turn before entering the occupied lane, with blocked-turn checks and visible closure barriers. Existing city buildings and streets stay in place.
- Gunfire now has a barrel-aligned layered flame flash that follows the gun, alongside the existing slide recoil, tracer, spatial sound and haptics. Zombie hits produce a bounded blood spray and temporary floor stains: 96 droplets, 20 stains, two instanced draws, no dynamic lights or per-shot mesh allocation.

Validation: stairs through all ten floors, both apartment layouts, elevator up/down, attack/line-of-sight, death/respawn, reward/reset, gun pickup/fire, and subsequent web use are exercised in the integration harness. Added checks cover persistent opaque structure, floor-boundary visibility, swept collision equivalence, ray bounds, sustained effect pooling, and ten minutes of traffic with a forced approach to the closed lane.

CPU comparison (same host, 300 updates at 90 Hz, fourth-floor corridor, four newly killed zombies): median building/challenge update 7.34 ms before / 0.86 ms after; p95 11.55 / 1.49 ms. At that corridor position movement candidates drop from 406 to 1; this is location dependent. Tower scene mesh submissions before frustum rejection: 94 / 88; shadow-casting meshes 31 / 4. These are CPU/source measurements, **not Quest GPU frame-rate measurements**. Stereo appearance, cold shader compilation and sustained thermal performance still need a Quest 3 test.

Research used: [PlayCanvas's official WebXR optimization guidance](https://developer.playcanvas.com/user-manual/xr/optimizing-webxr/) recommends batching/culling, minimizing runtime lights and shadow work, reducing transparency overdraw and avoiding allocation-driven garbage collection stalls. Those principles informed these localized changes; existing global city quality settings and web physics are preserved.
