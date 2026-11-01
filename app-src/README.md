# Sense in Motion web app (prototype)

A web version of the English app (`audio-app-en`) for senseinmotion.com (WordPress).
It includes sign-in, the lessons list with search, and the player (~10/~20/~30, ±10s, favourite, `startCourse`, the end bell). It uses the same API and the same accounts as the mobile app.

## Structure
- `web-app/`: React + Vite source
- `wp-plugin/sim-web-app/`: WordPress plugin. `npm run build` writes the bundle into `app/` here.

## Development
```
cd web-app
npm install
npm run dev              # http://localhost:5173 (Vite proxies /api to the real API)
                         # http://localhost:5173/?mock  demo data, no account needed
npm run build            # builds into ../wp-plugin/sim-web-app/app
```

## Installing on WordPress
1. Zip the `wp-plugin/sim-web-app` folder, then upload it in WP Admin → Plugins → Add New → Upload and activate it.
2. Create a page and add the shortcode `[sim_app]`.

## Why a proxy
The API (`audio.scidan.co.uk`) sends no CORS headers, so the browser can't call it directly.
The plugin exposes `/wp-json/sim/v1/proxy/<endpoint>` and forwards the call from the server. Only the endpoints in `SIM_APP_ENDPOINTS` are allowed.
Alternative: add `Access-Control-Allow-Origin: https://senseinmotion.com` on the API server and point `apiBase` straight at it.

## Not implemented yet
- Payment on the web: `react-native-iap` doesn't work in a browser. A user without access sees a "subscribe in the app" screen.
- Sign-up, verification code, forgot password, packages/levels, Find Lessons, history, Zoom, YouTube.
