---
name: node-backend
description: Backend engineering guidance for Node.js and Express APIs. Use when building or changing a Node/Express server, adding routes, controllers, services, repositories, or middleware, wiring JSON parsing and body limits, handling errors with 4-arity error middleware, or choosing between raw node:http and Express. Triggers on "node", "express", "server.js", "api", "route", "controller", "middleware", "req/res", "npm start", "port", "endpoints", "REST".
---

# Node / Express backend skill

## Stack baseline

- **Runtime**: Node.js 20+ (LTS). `node:version` pinned in `engines`.
- **Language**: ESM (`"type": "module"`) — the only module system to use in new code.
- **Framework**: Express 5 (`express@^5`). Express 4 only if the repo already pins it.
- **No build step** for plain JS. TypeScript only if the repo is already TS.

## Project layout

Pick the smallest layout that fits. Do not add a layer that is not used.

```
server.js                  # app wiring, middleware, listen
routes/product.route.js    # route table only
controllers/product.controller.js  # req/res handling
services/product.service.js        # business logic
repositories/product.repository.js # data access
models/product.model.js            # schema / data shape
validation/product.validation.js  # input rules
```

Rules:
- A file has one job. If a file holds both a route table and business logic, split it.
- Layers depend **downward only**: route → controller → service → repository. A repository must never import a service. A controller must never touch the store directly.
- Validation belongs in one place. If validation lives in middleware, the service trusts its input; if it lives in the service, the controller does not duplicate it. Never both.

## ESM rules (these bite silently)

- Every relative import needs an explicit extension: `import x from "./a.js"`. Node ESM has no extension resolution.
- Use the `node:` prefix for builtins: `import http from "node:http"`, `import fs from "node:fs"`.
- `URL` is a global — do not import it from `"url"`.
- `import express from "express"` — never `import { Router } from "express"`. The named form depends on `cjs-module-lexer` statically detecting the export; the default form works via Node's CJS→ESM interop across all Express versions.
- For a module whose exported names collide with the importing file's own names, use a namespace import: `import * as Product from "./product.service.js"`.
- Named exports for everything that is a bag of functions (controllers, services, repositories, validation). `export default` only for a router — a router is one object.

## Express specifics

### Body parsing and limits

```js
app.use(express.json({ limit: "1000000b" }));
```

- The unit suffix matters: `"1mb"` is **1048576** bytes, `"1000000b"` is **1000000**. Pick one and be exact.
- `express.json()` only parses when `Content-Type: application/json`. A request without that header arrives with `req.body` undefined — always guard with `req.body ?? {}`.
- `express.urlencoded()` is separate; do not assume it ran.

### Error middleware — the 4-arity trap

```js
app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ error: err.message });
});
```

Express detects error-handling middleware by `fn.length === 4`. An arrow function keeps its declared arity, so the form above works — but **dropping any parameter silently converts it into normal middleware**. Errors then fall through to Express's default **HTML** error page instead of your JSON handler. Same failure mode applies to `next` in route-level middleware: dropping it means the route handler never runs.

- `err.status || 400` is what lets body-parser's 413 surface correctly. Hardcoding 400 hides it.
- Handle `err.type === "entity.parse.failed"` (malformed JSON) and `err.type === "entity.too.large"` (body limit) explicitly if you need stable error text.
- Register the error middleware **last**, after the 404 handler.

### 404 vs error middleware

These are different and both are needed:

```js
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});          // no next — terminal, handles unmatched routes

app.use((err, req, res, next) => { ... });  // 4 args — handles thrown/passed errors
```

Without the 404 handler, Express returns its default HTML "Cannot GET /x" page. If the API contract says JSON, the 404 handler is mandatory.

### Status codes

| Case | Status | Body |
|---|---|---|
| Successful GET collection | 200 | the array |
| Resource created | 201 | the created resource |
| Validation failure | 400 | `{"error": "..."}` |
| Malformed JSON | 400 | `{"error": "..."}` |
| Body over limit | 413 | `{"error": "..."}` |
| Route not matched | 404 | `{"error": "Route not found"}` |
| Unhandled server fault | 500 | `{"error": "..."}` — never leak a stack trace |

### Validation

- Validate at the boundary — before any data reaches a service or store.
- Use `!value` style checks that treat `0` as valid when 0 is legitimate. `price: 0` must not be rejected.
- `typeof x !== "number"` rejects `"5"`, `null`, `NaN`. Add `Number.isFinite(x)` if NaN must be rejected (`typeof NaN === "number"`).
- Return **one** error shape everywhere in the API: `{ error: string }`.

## Raw `node:http` (when Express is not available or wanted)

Hand-rolled equivalents that must behave the same as Express:

```js
const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []; let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) {
      reject(Object.assign(new Error("request entity too large"), { status: 413 }));
      req.resume();            // drain, do NOT req.destroy()
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  req.on("error", reject);
});
```

Traps:
- **`req.destroy()` prevents the error response from ever being sent.** Drain the request instead (keep consuming `data` events, discard them) so the socket stays healthy and the 400/413 reaches the client.
- Measure bytes with `Buffer.byteLength(raw)`, not `raw.length`. `raw.length` counts UTF-16 code units, so multibyte payloads slip past a byte limit.
- Parse the URL with `new URL(req.url, \`http://${req.headers.host}\`)` and match on `url.pathname`.
- An unhandled promise rejection inside the request handler kills the process. Wrap async handlers in try/catch.

## Process hygiene

- Read the port from `process.env.PORT` with a default; never hardcode.
- Log the bound address on start.
- Do not `process.exit()` on a request error — let the server keep serving.
- Install `SIGINT`/`SIGTERM` handlers to close the server and release the port cleanly.

## Checklist before declaring done

- [ ] ESM imports with explicit `.js` extensions
- [ ] `import express from "express"`, not the named `Router` form
- [ ] Body limit stated in exact bytes
- [ ] 404 handler returns JSON
- [ ] Error middleware has all 4 parameters
- [ ] `req.body ?? {}` guard on every body-consuming route
- [ ] Status codes match the table above
- [ ] One error shape: `{ error: string }`
- [ ] `0` is treated as a valid value where it should be
- [ ] No stack traces or internal paths in responses
