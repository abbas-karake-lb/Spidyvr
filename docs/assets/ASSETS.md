# City image assets

Both assets were created for this project using the built-in OpenAI image-generation tool. They are generated artwork, not photographs taken of real buildings. No third-party texture packs or external asset CDN are required.

The selected PNG outputs were inspected and encoded to WebP at quality 93 for deployment with FFmpeg. The image content was not repainted during encoding. The original generation outputs remain in the session output directory; these repository copies are the runtime deliverables.

## facades-real.webp

Final runtime path: `docs/assets/facades-real.webp`. Dimensions: 1254 × 1254. Four equal quadrants, extracted into independent texture tiles at runtime to prevent mip bleeding. Mode: built-in image generation.

Final prompt:

> Use case: photorealistic-natural. Asset type: production game texture atlas for a realistic contemporary waterfront city, NOT a scene screenshot. Generate a 2048x2048 square image divided into exactly four equal square quadrants without any gaps or borders. Each quadrant is a perfectly front-on orthographic seamless building facade surface, zero perspective, no roof, no sky, no ground, no people. Top-left: authentic weathered red-brown brick urban apartment facade with exactly four columns and four rows of recessed rectangular sash windows, stone sills, fine mortar, glass reflecting pale blue sky, individual blinds and curtains. Top-right: elegant warm limestone urban facade, exactly four columns and four rows of evenly spaced detailed dark framed windows, chamfered stone surrounds, weathering and subtle interior curtains. Bottom-left: premium contemporary blue-gray glass curtain wall, exactly four columns and four rows of large rectangular windows with fine metal mullions, convincing soft reflected neighboring skyline, some interior blinds. Bottom-right: dark bronze and teal modern tower facade, exactly four columns and four rows of windows separated by sculpted charcoal metal panels, layered depth, subtle office interiors. All four quadrants use physically realistic photographic material detail, neutral diffuse daylight, low contrast, no baked directional shadow across the facade, no cartoon, no illustration, no text, no logos. Crisp architectural texture quality like a photogrammetry AAA environment asset. Window grid aligns continuously at tile edges. Every quadrant fills its entire area edge-to-edge.

## coastal-sky.webp

Final runtime path: `docs/assets/coastal-sky.webp`. Dimensions: 1774 × 887. A 2:1 equirectangular environment map, reused for sky, water and PBR reflections. Mode: built-in image generation.

Final prompt:

> Production game environment texture. Create an exceptionally photorealistic 360 degree by 180 degree EQUIRECTANGULAR sky panorama, 2:1 aspect ratio. It will be wrapped around a sphere and used for physically based reflections, so the left and right borders must join seamlessly. Upper half: beautiful realistic pale blue coastal afternoon sky with large towering softly illuminated cumulus clouds, fine wisps, convincing atmospheric scattering, very bright warm sunlight on cloud edges, a small bright sun above the western horizon around 25 degrees elevation. Horizon is precisely the horizontal center line, glowing pale cream and blue haze, absolutely NO mountains, buildings, trees or objects. Lower half: featureless soft blue gray sea/ground ambient color fading smoothly to muted cool gray at the bottom, to act as ground hemisphere reflection. Natural cinematic photography, clear rich colors, extremely detailed cloud forms and fine texture, no illustration, no stylization, no star field, no text, no borders. This is a flat lat-long environment map asset, NOT a perspective view of a landscape or a mockup.
