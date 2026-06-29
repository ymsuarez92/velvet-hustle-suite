---
name: Lovable vite config host override
description: How to fix host/port issues when running a @lovable.dev/vite-tanstack-config project on Replit.
---

The `@lovable.dev/vite-tanstack-config` `defineConfig` wrapper always falls back to `host: "::", port: 8080` — even outside Lovable sandbox — because its `else` branch does `mergeConfig({ server: { host: "::", port: 8080 } }, config)`.

Replit does not support IPv6 (`::`) binding, so the server crashes with `EAFNOSUPPORT`.

**Fix:** Pass a `vite.server` override inside `defineConfig`. Because `options.vite` is merged into `config` before the final merge (where `config` wins), user settings take priority:

```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      allowedHosts: true,
    },
  },
});
```

**Why:** Replit requires port 5000 + IPv4 (`0.0.0.0`) for the webview workflow output type. The lovable default of `::8080` is incompatible.

**How to apply:** Whenever a Lovable-generated TanStack project is imported into Replit, update `vite.config.ts` with the above override before starting the workflow.
