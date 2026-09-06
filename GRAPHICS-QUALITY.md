# Coastal city: quality-first graphics upgrade

This is an isolated visual upgrade based on `e4987c00cdb5bc0e387c72fa83a3329a424c62fc`. The original 105 building collision boxes, streets, population, traffic routes, controller mappings and traversal physics are preserved. Revert this graphics commit if its GPU cost is too high on the headset; do not reset the entire branch over later work.

## Visible changes

- Four photographic-style facade assets replace the small painted window textures. Brick, limestone, curtain glass and dark metal styles include frames, blinds, curtains and interior details. Each style has an independent repeating mip chain, roughness mask and shallow bump relief. Stone and glass respond differently to lighting. Building instance tints are reduced to preserve the source material colours.
- Physically based materials and a shared coastal environment map replace flat Lambert/Phong lighting throughout the city. Cars use clearcoat paint, rough tyres, smooth glass, chrome and emissive lamps; instance colour affects paint without turning windows and tyres the body colour.
- Real 2048-pixel sun shadow mapping replaces the old flat projected building-shadow polygons. Buildings, architecture, nearby vehicles, characters and tree canopies cast onto streets and roofs. Character depth shaders use the same live joints as visible walkers and ragdolls. The sun camera follows the player and snaps in light space to reduce shadow crawling. The single original roof surface remains intact.
- Asphalt now has grain and cracks; paving has recessed joints; rooftops have weathered membrane detail. Fine bump response adds lighting variation to these surfaces.
- A new 1774 × 887 coastal sky supplies detailed cumulus clouds and environment reflections. Harbor water reflects that sky with animated ripple normals, sun glints, shoreline foam and gentle geometric waves offshore.
- Vehicle bodies use lofted automotive profiles, sloped windshields and curved shoulders instead of stacked boxes. Wheels, hubs, spokes, grilles, mirrors, door seams, plates and lamps add nearby detail across sedan, SUV, van, bus and taxi variants. Far vehicles retain curved silhouettes with fewer parts.
- Nearby people have smoother shaped torsos, higher-detail heads, ears, eyes, eyebrows, collars, buttons, shoes and accessories. Their existing animation, punching, web attachment, grabbing and throwing use the same physical pose system.
- Trees use layered, vein-detailed leaf sprays with alpha-tested silhouettes instead of solid polygon crowns. Existing wind motion also drives the matching shadow geometry.

## Quality and cost

The preset is deliberately more aggressive, following the request to prioritise image quality:

| Setting | Previous | New |
|---|---:|---:|
| XR framebuffer scale | 0.90 | 1.15 |
| XR fixed foveation | 1.00 | 0.35 |
| Nearby architecture range | 65 m | 140 m |
| Detailed moving vehicles | 85 m | 125 m |
| Detailed parked vehicles | 65 m | 125 m |
| Detailed pedestrians | 55 m / 48 slots | 75 m / 64 slots |
| Building lighting | Flat projected ground shadows | Live sun shadows, 210 m window |

The framebuffer change alone requests about 63% more pixels than the previous scale; this is not a free upgrade. No PC-style fullscreen postprocessing, per-car lights or recursive reflection passes are introduced. Asset downloads total roughly 638 KiB. Four isolated facade tiles share materials across instanced building batches. Crowd pose textures, shared vehicle geometry, pooling, distance culling and the existing bounded NPC simulation remain in use.

A deterministic scene inventory at player heights 2, 32, 80, 150 and 240 metres measures approximately 674k, 632k, 473k, 370k and 176k triangles respectively, before camera-frustum rejection. These counts are per eye; the shadow pass adds work. Corresponding conservative colour-pass draw counts are 113, 113, 112, 96 and 81. These are geometry inventories, not measured headset frame rates.

## Files

- `docs/city-quality.js`: preset, PBR ground textures, atlas loading, environment map, shadow setup, foliage and vehicle surface shader.
- `docs/city-models.js`: curved vehicle meshes, richer characters, UV and material-region geometry attributes.
- `docs/city-look.js`: facade materials, detail range, photographic-style sky and reflective animated water.
- `docs/city.js`, `docs/city-life.js`: integrate material/foliage/LOD changes without changing generation or simulation.
- `docs/game.js`, `docs/index.html`: rendering setup and asset-version refresh.
- `docs/assets/`: generated facade/sky assets and provenance.
- `tests/graphics.test.js`, `tests/city.test.js`: rendering contracts, material data, asset integrity, geometry budgets and unchanged layout.

## Validation and limits

JavaScript syntax checks, exact building-layout comparison, geometry/material checks and the complete controller/physics/NPC integration suite are run before publishing. The tests drive the real game modules through a mocked XR session and renderer. They cover both hands, web travel/attachment/release/refire, smooth turning, momentum-preserving pulls, elasticity, jumps, pause visibility and NPC interactions.

The available browser preview was blocked by its security policy. No alternate browser route was used. This environment therefore does not provide a rendered WebGL visual review, GPU shader compilation result or on-device Quest 3 frame-time measurement. Generated source assets were visually inspected; geometry, shader bindings and gameplay paths were checked without a GPU. A Quest 3 test remains necessary for lighting appearance, shader output, comfort, aliasing, memory use and sustained frame rate. This upgrade substantially increases detail and rendering quality; it is not a claim of scanned humans, ray tracing or literal real-life AAA fidelity.
