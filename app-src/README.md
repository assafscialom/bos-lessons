# BOS Lessons player (source)

The React + Vite source of the player that the `[bos_lessons_app]` shortcode shows.
`npm run build` writes the bundle the plugin ships into `../app/` (`bos-lessons.js`, `bos-lessons.css`, `bell.m4a`).

## Development
```
npm install
npm run dev      # http://localhost:5173        calls the BOS API through Vite's dev proxy
                 # http://localhost:5173/?mock  local demo data, no account and no network
npm run build    # builds into ../app
```

## Why a proxy
The BOS API sends no CORS headers, so the browser cannot call it directly.
In WordPress the plugin exposes `/wp-json/bos-lessons/v1/proxy/<endpoint>` and forwards the call from the server.
Only the endpoints listed in `BOS_LESSONS_ENDPOINTS` (bos-lessons.php) are allowed.
