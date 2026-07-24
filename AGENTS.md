# Agent instructions — Fortachones

## Expo SDK pin (required)

This project is **permanently pinned to Expo SDK 54** so it works with the Expo Go build currently on the App Store (newer SDKs are not supported there yet).

**Never** do any of the following unless the user explicitly asks:

- `npx expo install expo@latest`
- `npx expo upgrade` / `expo upgrade`
- Bumping `expo` (or the Expo SDK) past **54.x**
- Aligning dependencies to SDK 55+ / “latest” Expo docs

Any dependency install or fix (`npx expo install`, `npx expo install --fix`, adding packages, etc.) **must stay compatible with Expo SDK 54**.

Use the SDK 54 docs only: https://docs.expo.dev/versions/v54.0.0/

Current targets for this pin:

- `expo`: `~54.0.0`
- `react-native`: `0.81.x`
- `react` / `react-dom`: `19.1.0`
- Keep `react-dom` and `react-native-web` as direct dependencies (web: `npm start` + `w`)
