# firefox-autohide

Smooth auto-hide for the Firefox address bar and the vertical tabs sidebar, in fullscreen and in a regular window.

Firefox's built-in "Hide Toolbars" pops the toolbars in instantly at the slightest touch of the screen edge. This mod does it differently:

- **Reveal delay.** A panel appears only when the pointer rests at the edge for 0.3 s. A pointer that just passes by doesn't open anything.
- **Smooth animation.** Panels ease in and ease out. The sidebar slides in whole, like a drawer, instead of being squeezed.
- **Separate panels.** The top edge reveals the address bar and the side edge reveals the tabs. Each one hides when the pointer leaves it for the page.
- **Change of mind.** If the pointer comes back while a panel is still hiding, it turns around right away.
- **Works in a window too.** There the "edge" is a 6px strip inside the window along its border.
- **Stays out of the way.** The address bar shows up by itself on Cmd/Ctrl+L and Cmd/Ctrl+T while you type, and stays while a menu or a tab's context menu is open.

## Hotkeys

| Keys | What it does |
|---|---|
| Ctrl+L | pin / unpin the address bar |
| Ctrl+S | pin / unpin the sidebar |

A pinned panel stays visible. Pins are remembered, separately for windowed and fullscreen mode.

## Install

### macOS and Linux

```sh
git clone https://github.com/Nikita19329/firefox-autohide.git
cd firefox-autohide
./install.sh
```

Then quit Firefox completely (Cmd+Q) and start it again.

The installer looks for Firefox in `/Applications`, `~/Applications`, `/usr/lib/firefox` and other usual places. If yours is somewhere else, pass the path: `./install.sh /path/to/Firefox.app` (on Linux, the folder that contains `omni.ja`).

On Linux, Snap and Flatpak builds won't work: their install folder is read-only. Use Firefox from mozilla.org or your distro's package.

### Windows

Untested, but it should work. Copy the files into the Firefox folder (usually `C:\Program Files\Mozilla Firefox`):

- `src\config.js` → `C:\Program Files\Mozilla Firefox\config.js`
- `src\defaults\pref\autoconfig.js` → `C:\Program Files\Mozilla Firefox\defaults\pref\autoconfig.js`

Restart Firefox.

## Uninstall

```sh
./uninstall.sh
```

On Windows, delete those two files by hand.

## Settings

Change them in `about:config`, creating the pref if it isn't there yet.

| Pref | Type | Default | What it does |
|---|---|---|---|
| `uc.autohide.windowed` | boolean | `true` | auto-hide in windowed mode |
| `uc.autohide.reveal_delay` | number | `300` | how long the pointer rests at the edge, ms |
| `uc.autohide.window_edge` | number | `6` | width of the "edge" in a window, px |
| `uc.autohide.sidebar_anim_ms` | number | `450` | sidebar slide-in duration, ms |
| `uc.autohide.sidebar_hide_ms` | number | `300` | sidebar slide-out duration, ms |
| `uc.autohide.key_modifiers` | string | `control` | hotkey modifiers, e.g. `alt` or `accel,shift` |
| `uc.autohide.urlbar_key` | string | `L` | address bar hotkey letter |
| `uc.autohide.sidebar_key` | string | `S` | sidebar hotkey letter |

In fullscreen, auto-hide follows Firefox's own "Hide Toolbars" context menu checkbox. Hotkey changes apply after a restart, everything else applies right away.

## How it works, and why it isn't an extension

Firefox extensions can't touch the browser's own interface: they can't hide or animate the address bar or the sidebar.

So the mod uses autoconfig, Firefox's built-in mechanism for administrators. On startup Firefox runs `config.js` from its install folder, and the script takes over showing and hiding the panels: it watches the pointer near the edges, animates the panels, and adds the styles it needs. Nothing goes into your profile, and no `userChrome.css` is needed.

## Good to know

- **Full privileges.** `config.js` runs with full browser privileges. Read the code before installing: the whole mod is one file, [`src/config.js`](src/config.js).
- **Firefox updates.** The mod relies on Firefox internals, so a major update can break it. Updates can also remove the files; if that happens, run `./install.sh` again.
- **Where it's tested.** macOS, Firefox 157, vertical tabs. Not tested on Windows or Linux.
- **Other autoconfig mods.** If you already have a `config.js` (for example, [fx-autoconfig](https://github.com/MrOtherGuy/fx-autoconfig)), the installer saves a copy and `uninstall.sh` restores it. The two can't run at the same time.

## License

[MIT](LICENSE)
