# Living city overhaul

## What changed

The original 105 building AABBs, heights, and seeded layout are unchanged. New facade textures use more plausible window proportions, masonry, mullions, blinds, inset interior shapes, and selective specular highlights. Nearby architecture adds storefront glazing, awnings, balconies, railings, roof gardens, ducts, equipment, skylights, and aerials. Curbs, paving seams, planters, trees, bins, bollards, bus shelters, and existing signs/street furniture enrich street level.

The city now sits beside visible water, promenades, piers, a distant skyline, and island silhouettes. A gradient sky includes a sun glow and drifting layered cloud texture. Water uses animated normals, Fresnel sky colour, sun glints, and shoreline foam. Afternoon street shadows are baked geometry; nearby actors use soft contact shadows. These are inexpensive visual approximations, not real-time scene reflections or volumetric clouds.

There are 92 moving vehicles and 85 parked vehicles with sedan, SUV, van, bus, and taxi models. Near models include rounded wheels/hubs, glazing, mirrors, pillars, lights, bumpers, and grille detail. Traffic accelerates, queues behind vehicles, stops at coordinated signals, brakes for nearby players/crossing pedestrians, and makes curved intersection turns. It stays on the island roads rather than teleporting between city edges.

The crowd grows from 96 to 288 pedestrians with varied colours, skin tones, proportions, hats, jackets, and backpacks. Nearby bodies use joint-driven limb movement and head turns. People react to proximity and nearby impacts, and some wait for a crossing phase before moving between blocks. Twenty-four dogs accompany distributed walkers. Birds and occasional aircraft add skyline activity.

## Physical interactions and controls

- **Punch:** strike a nearby pedestrian with a physical hand movement. A swept contact test applies an impulse based on direction and speed. Locomotion alone does not count as a punch.
- **NPC web:** aim at a person and hold the index trigger. The visible shot follows its moving target during travel and then attaches to a body joint. Moving the web hand upward, sideways, or toward you applies directional impulses to the body. Grip reels the person closer. Release the trigger to detach.
- **Grab:** hold the thumbstick click on either controller within about half a metre of a person. The selected body joint follows that hand through the constraint solver. Release the click to drop or throw; throwing uses smoothed hand velocity plus player velocity.
- Building triggers, side-grip reeling, A jumping, left-stick movement, right-stick smooth turning, B reset, X pull power, and Y pause remain available. The paused panel and start-screen instructions explain the new controls.

Bodies use 15 simulated nodes and joint-length constraints, gravity, damping, and swept ground/building collisions. Hits can produce different falls and rotations rather than selecting a prerecorded fall animation. Quiet grounded characters blend back into walking. Pause, lost tracking, session changes, and reset release NPC interactions. There is no blood or dismemberment.

## Quest 3 budgets

- At most **12 active articulated bodies**, simulated at **90 Hz**, independently of the existing **180 Hz** player physics.
- At most **48 detailed character instances**, with held/physical bodies prioritized. Other people use simpler geometry; sufficiently distant people are culled.
- Vehicle detail changes with distance; parked cars share vehicle geometry and material pools.
- Nearby architectural details are merged into spatial batches with distance and frustum culling. Original silhouettes, facade textures, roof units, and city layout remain visible beyond that detail range.
- Joint transforms use one small shared float texture. Shared geometry, instancing, shader animation, baked shadows, and pooled contact shadows avoid per-character draw calls and dynamic shadow-map passes.
- Representative street/rooftop/skyline views are roughly **100 to 81 draw submissions** and **240k to 98k triangles**, counting all distance-visible batches before frustum culling, per eye. Tests enforce a conservative **115 draw / 300k triangle** ceiling for the sampled views. Actual visible counts vary with location and interaction state.

## Validation and practical limits

Automated tests cover the unchanged building fixture, roof separation, crowd paths, traffic continuity/bounds, population LOD, finite character skinning poses, directional punches, NPC web movement, grabbing/throwing, ragdoll collision/capacity, controller lifecycle cleanup, and the existing complete swinging/pulling/jumping/turning flows. A simulated Quest harness executes the real input and game loop with a stub renderer.

No physical Quest 3 or functioning GPU/browser render verification was available for this update. Automated checks are not a headset frame-rate or image-quality measurement. First headset checks should include ground-level character appearance, both-hand interactions, a loaded street view, rapid swinging through detail transitions, and water/sky rendering at altitude.

This is a substantial procedural mobile-VR upgrade, not a claim of PC/console AAA photorealism. Traffic and crowd decisions are lightweight rather than a full urban AI simulation. Ragdolls do not use cloth or finger simulation. NPC body collisions cover ground/buildings, not every decorative prop. Held NPC webs and building webs remain straight rather than wrapping around corners.

The previous elastic-traversal commit is `5de294d3ada94e6cd8f482aa73aa4f4dcd66ccf9`. The overhaul is kept in a separate commit for straightforward rollback.
