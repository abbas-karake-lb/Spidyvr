# Pull on trigger release

This experiment changes only the timing of building-web hand pulls. While a web is held, the existing stroke detector records the hand's latest coherent gesture without changing velocity or suppressing passive spring forces. An intentional trigger release applies the gesture's opposite-direction impulse using the existing pull gain, speed scaling, momentum redirection and speed cap. It includes movement received on the trigger-release frame.

The most recent confirmed stroke replaces previous strokes. It must end within 100 ms of release; a brief stationary release frame is accepted, but holding still does not bank an old boost indefinitely. Existing drift thresholds, recovery-reach filtering and tracking-jump rejection remain in place. Each hand records separately, and simultaneous releases combine their impulses as before. Pause, tracking loss, reset, weapon pickup and cancellation discard the recording without launching.

Elastic stretch, passive catching/swinging, side-grip reeling, locomotion, jumping, web flight/appearance, NPC interactions, guns and hand alignment remain unchanged. Gravity and elastic tension still act while a web is held; only the hand-generated boost/redirection is deferred.

Implementation: `docs/physics.js` adds deferred stroke recording and intentional-release application; `docs/game.js` samples before trigger-up and keeps safety cancellation separate. The low-level immediate `pull` path is retained as the reference for the existing strength/physics regression tests. Gameplay explicitly selects deferred sampling. `docs/index.html` refreshes the browser module version.

Checks cover 72/90/120 Hz, high-speed flight, latest-stroke replacement, unchanged passive elasticity, stale/invalid gestures, both hands, simultaneous releases, movement on the release frame, immediate re-fire, and safety cancellation. Existing integrated Quest tests now expect the launch on release. Automated tests use simulated controller poses; perceived timing still needs a Quest 3 test.

All implementation, cache versions and tests belong to one commit. Revert that commit to restore immediate hand pulling.
