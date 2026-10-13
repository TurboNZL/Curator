# turboengine: the reference this app is pinned to

[TurboNZL/turboengine](https://github.com/TurboNZL/turboengine) is a reference and template shared by TurboNZL's apps (release flow, updaters, theme picker, window chrome, settings layout, docs and briefing). It is **not a dependency**: its modules are working files copied from Curator, so there is nothing to install. Curator records what it is aligned with in `/.turboengine.json` (engine commit, modules, any moved paths).

## Which Curator files are engine modules
| Module | Curator paths |
|---|---|
| `release-pipeline` | `.github/workflows/{release,auto-pr,check}.yml` |
| `editions` | `apps/electron/{package.json,electron-builder*.json,scripts/*,src/headless.ts,build/server-*.sh}`, `packages/server/src/staticServer.ts` |
| `updaters` | `apps/electron/src/{updater,updateErrors,debInstall}.ts`, `apps/android/.../update/*`, `apps/web/src/lib/native.ts`, `components/AppSettings.tsx` |
| `appearance` | `apps/web/src/lib/{appearance,useCatalog,layout}.ts`, `layouts.css`, `components/{AppearanceCard,ThemeUpdates,Layout}.tsx`, `tailwind.config.ts`, `index.css`, `fonts.css` |
| `window-frame` | `components/WindowFrame.tsx`, `apps/electron/src/{main,preload,desktopConfig,graphics,gpuModes,accessHeaders,discord}.ts` |
| `guides-and-docs` | `lib/{guides,markdown}.ts`, `components/GuidesTab.tsx`, `docs/guides/GETTING_STARTED.md` |
| `settings-shell` | `pages/Settings.tsx`, `components/Section.tsx`, `lib/pairCode.ts` |
| `android-shell` | `apps/android/**` shell files, the Termux assets, `lib/termux.ts`, `components/TermuxServerCard.tsx` |

Everything else (`packages/core`, `packages/server` apart from `staticServer.ts`, the pages) is the music library and stays here.

## Working with it
- Where Curator and the engine differ: `node <engine checkout>/scripts/engine-diff.mjs . --show` (needs the engine cloned; a cloud session attaches it with `add_repo`).
- Curator is where modules are born. After improving one of the files above, copy it back to `modules/<name>/files/<same path>` in the engine, add the lesson to that module's `MODULE.md`, and move `engine.ref` here.
- If a module is ever restructured here (files moved), record the new location in `.turboengine.json` `moved` so the diff keeps working.
