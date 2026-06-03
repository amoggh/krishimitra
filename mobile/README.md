# KrushiMitra Mobile

Expo + React Native app for Indian farmers (crop optimization, mandi insights, risk analysis).

## Stack

- Expo 52, React Native 0.76
- NativeWind 4 (Tailwind CSS)
- React Navigation (auth stack, tabs, modal settings)
- Axios → FastAPI backend
- react-native-chart-kit, react-native-maps

## Setup

```bash
cd mobile
npm install
```

Add Expo assets (required before first run):

```bash
# From mobile/ — copies default Expo assets if missing
npx expo install expo-asset
mkdir -p assets
# Place icon.png, splash.png, adaptive-icon.png in assets/ (1024x1024 icon recommended)
```

Or init assets from Expo template:

```bash
npx create-expo-app@latest _temp --template blank
cp _temp/assets/* assets/
rm -rf _temp
```

## Environment

Create `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:8000/api/v1
```

For Android emulator use `http://10.0.2.2:8000/api/v1`. For iOS simulator use `http://localhost:8000/api/v1`.

## Run

```bash
npm start
# then press a (Android) or i (iOS)
```

## Run in laptop browser (web preview)

Web support requires `react-dom` and `react-native-web` (install with `npx expo install react-dom react-native-web`).

**Option A — dedicated web command (easiest):**

```bash
npm run web
```

Opens **http://localhost:8081** (or the URL shown in the terminal).

**Option B — from an already running dev server:**

1. Run `npm start`
2. Press **`w`** in that terminal (not in the browser)
3. Browser should open automatically; if not, open the URL shown (usually `http://localhost:8081`)

**If the page is blank:** check the terminal for red errors, then restart with `npm run web`.

**Note:** Maps use a placeholder on web; full map UI works on Android/iOS builds only.

## Maps

Set Google Maps API keys in `app.json` under `ios.config` and `android.config`.

## Project structure

```
src/
  components/   # UI, charts, maps, feature widgets
  screens/      # One file per app screen
  navigation/   # Navigators
  services/api/ # Axios services
  theme/        # Color tokens
  types/        # TS types for API & navigation
  data/         # Mock fallbacks
```
