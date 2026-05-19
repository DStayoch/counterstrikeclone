# Browser FPS MVP

A small browser-based first-person shooter built with HTML, CSS, JavaScript, and Three.js.

Starting money is `$5000`, enough to buy any weapon from the buy menu.
Cover blocks both player and enemy bullets, and enemies need line of sight before chasing or shooting.
Low cover can be jumped onto, and stairs now connect to walkable raised decks.
The game is round based: the Terrorist team of 5 starts on one side, the Counter-Terrorist team of 5 starts on the other, and eliminated players wait until the next round.

## Run locally

Open `index.html` directly in your browser.

The page uses a classic browser script so you can test it without starting a local port. The modular source files are still included in `main.js` and `js/` for cleaner future development.

## Controls

- `W`, `A`, `S`, `D`: move
- `Shift`: sprint
- `Space`: jump
- Mouse: look around after pointer lock
- Left click: shoot
- `1`: equip rifle
- `2`: equip bomb
- `G`: throw grenade
- Hold left click: automatic fire with SMG and rifle
- Right click with sniper rifle: scope in
- `R`: reload
- `B`: open or close buy menu

The first bullet of each trigger pull is perfectly accurate. Continued automatic fire blooms spread over time.
Movement now uses acceleration/friction, air control, cover sliding, and weapon bob/recoil for a smoother feel.

There are 10 rounds total. The round ends when either team is eliminated.
The Terrorist side carries one team bomb. Equip it with `2`, move to the Counter-Terrorist bomb site, and hold still while the 4-second plant animation completes.
Enemies keep their weapons shouldered while roaming.
Bullets register instantly at the raycast hit point while their visible tracer travels to that exact point. Grenades have a timed fuse, bounce, and explosion radius.

## Files

- `index.html`: page shell and HUD
- `style.css`: full-screen game UI
- `classic-main.js`: direct-open playable build
- `main.js`: modular scene setup, game loop, shooting, UI updates
- `js/player.js`: player state
- `js/weapons.js`: weapon definitions and reload helpers
- `js/enemies.js`: enemy spawning, AI, damage, death
- `js/controls.js`: pointer lock and WASD movement
- `js/bullets.js`: visual impact markers
- `js/buyMenu.js`: weapon buying and equipping
- `js/map.js`: floor, walls, cover, and collision boxes
