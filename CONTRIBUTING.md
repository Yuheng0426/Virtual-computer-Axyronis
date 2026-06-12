# Contributing

Thanks for improving Axyronis OS. This project is intended to be easy to study and remix.

## Good Contributions

- New educational comments or documentation.
- New built-in virtual apps.
- Better accessibility and responsive layout.
- Safer native integrations.
- Cleaner themes, wallpapers, and visual systems.
- Refactors that make secondary creation easier.

## Major Remixing Is Allowed

Large rewrites are welcome. You may rename the project, replace the brand, redesign the UI, split the code into modules, change the app registry, add a plugin system, or build a new educational desktop from this base. Please keep safety documentation clear if your version exposes native system power.

## Development Checklist

Before submitting changes:

```bash
cd AxyronisOS
npm run check
npm audit --audit-level=high
```

Keep the user-facing interface in English. Keep source comments in English. Do not commit `node_modules`.

## Native API Rule

Renderer code should not use Node.js directly. Add native functions in `electron-main.js`, expose only the needed method in `preload.js`, and call it from `app.js`.
