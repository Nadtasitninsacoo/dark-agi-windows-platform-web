import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
    // satellite.js's own barrel (dist/index.js) re-exports its optional WASM calculator API, which lazily
    // imports a giant Emscripten-generated pthreads build referencing node:worker_threads — this app only
    // ever uses satellite.js's plain SGP4 functions (json2satrec/gstime/propagate in src/app/earth/starlink.ts),
    // never that WASM API, but a production build still has to resolve and bundle it as a reachable dynamic-
    // import target, which hangs Turbopack indefinitely (confirmed: excluding the one route that imports
    // satellite.js lets the rest of the app build in 6.6s). These are satellite.js's own package-private
    // `imports` map entries (the `#` prefix), never written anywhere in this app's own code, so aliasing them
    // to nothing is safe and only affects an API this app doesn't call.
    resolveAlias: {
      "#wasm-single-thread": false,
      "#wasm-multi-thread": false,
    },
  },
};

export default nextConfig;
