# Damian Lujan — My own little world

Live: https://damianlujan.vercel.app/

Source: https://github.com/DamianLujan1/damianlujan

A scrolling personal website with a real-time 3D room, built with Three.js and Vite. The homepage introduction uses only the approved name, Damian Lujan. The room has modeled furniture, soft contact shading, a timber floor, a coastal window, a usable computer, and original USS Midway, land rig, and rocket collectibles. Damian's red, black, white, gold, and purple palette carries through the room materials, lighting accents, entrance, website, and desktop apps. The artwork preserves Damian’s coast-to-night scene with no fighter jet.

## Run

Node.js 20.19+ or 22.12+:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000/. The preview binds to this computer only. To select a different port, run `npx vite --host 127.0.0.1 --port 3001`.

## Explore

- Each page load opens on a dark entrance showing only Damian Lujan and an Enter button. The room and website stay hidden and inert until the visitor enters; Enter on the keyboard also works. Direct links wait at the entrance, then open their destination. Refreshing restores the entrance.
- The scene prepares behind the entrance. If Enter is pressed before it is ready, the entrance waits and announces Opening; initialization failure instead leads to the usable desktop fallback.
- Home, My world, and Gallery are normal scrolling website sections. The sticky navigation and footer connect them.
- Enter my world opens the room; Back to website returns to the section you came from. Browser Back supports room navigation and section changes.
- The gallery shows only the two existing approved coastal artworks, with keyboard navigation and image zoom.
- No biography, work history, social links, or project showcase has been added. New personal content requires Damian’s approval.
- Drag the room to look around; scroll or pinch to zoom.
- Click the monitor or **My desk** to approach the computer. Its desktop contains My world, The view, and a working notebook.
- Notebook text is stored only in the current browser’s local storage. There is no account, server storage, or syncing.
- Click the collectibles, or use **The collection**, for close-up views. The rocket can launch and return to its shelf.
- Midway's **Fire together** button triggers six synchronized deck guns with gold-white muzzle flashes, brief barrel recoil, and fading smoke. The sequence resets after 2.2 seconds and stops when leaving the view or hiding the browser tab. Reduced motion uses a short steady glow without recoil or smoke.
- The land rig is modeled from Damian's supplied reference photos: a slender steel mast, raised drilling floor, side cabin, exterior stairs, racking platform, and crown work lights. **Start drilling** runs a short cycle with a rotating pipe, descending top drive and hoisting return. Pause/resume, reset and work-light controls remain available. Leaving the rig pauses its cycle; returning lets you resume it.
- The room stays at night, lit by a warm overhead spotlight against a dark stage. There is no daytime mode. Ambient audio starts only when explicitly enabled. Fullscreen depends on browser support.
- Escape closes an open desktop window, then returns to the room. Navigation and collection buttons work with a keyboard.
- Reduced-motion preferences remove camera transitions and replace rocket flight with a stationary engine toggle.
- For reduced motion, the rig uses immediate **Lower drill / Raise drill** positions and independent lights instead of continuous animation.
- Phones use a larger, readable desktop interface while the modeled computer remains in the scene.
- Browsers without WebGL get access to the desktop interface through a fallback.

## Production

```sh
npm run build
npm run preview
```

The production output is `dist/`. `vercel.json` is configured for Vite; use this directory as the Vercel project root. Production is published at https://damianlujan.vercel.app/.

## Source and assets

- `app.js`: renderer, lighting, camera transitions, room/site routing, desktop apps, audio and responsive behavior.
- `website.css`: scrolling homepage and immersive room presentation.
- `palette.css`: Damian's five-color palette across the entrance, room controls, website, desktop apps, and gallery.
- `gallery.js` and `gallery.css`: accessible image viewer, orientation switching, zoom and focus restoration.
- `room.js`: custom room, furniture, materials and architectural details.
- `personal-objects.js`: original batched miniature geometry.
- `midway-salute.js`: instanced deck guns and synchronized flash, recoil, and smoke effects.
- `rig-model.js`: photo-inspired rig geometry, moving assemblies, connected hoist lines, flexible service hose and work lights.
- `rig-operation.js`: frame-independent drilling and hoisting display cycle.
- `scene-utils.js`: mesh and procedural texture helpers.
- `public/assets/`: coastal artwork, social preview image, and favicon.
- `public/fonts/`: locally served DM Sans and Instrument Serif with their OFL licenses.

The interaction direction is inspired by https://yoshik-pc.vercel.app/. Its source, models, textures, and branding are not used.

## Verification

Production build passes. Browser checks covered desktop and phone framing, real camera changes, the computer apps, notebook persistence and mobile keyboard resizing, collection views, rocket flight/reset, keyboard navigation, reduced motion, and console errors. Rendering uses WebGL2; performance still depends on the device’s GPU.

The renderer redraws only when the camera, viewport, clock, rocket, rig, or Midway salute changes. Static shadows are reused between changes. Camera transitions take 550–650 ms, can be interrupted by dragging outside the desk view, and preserve the displayed pose when interrupted. Repeated taps on the current view do not restart transitions. Height-only resizing preserves manually adjusted camera views and desktop focus.

Rig motion and lighting also invalidate rendering while they change; paused or completed rig cycles return to idle rendering. Its close-up fits the actual model bounds into the area clear of the controls. Untouched rig framing refits when the viewport height changes, while manually adjusted views and desktop input focus are preserved.

Midway's close-up also fits the carrier and its firing effects into the space clear of the controls. Stable bounds prevent the camera from shifting as smoke expands. The salute adds no lights and returns to idle rendering after completion.
