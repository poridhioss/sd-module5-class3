# sd-module5-class3

Node.js & Express class session — four progressive implementations of the same
Products API, from raw `http` module to a fully modular Express app.

## Projects

| # | Folder | What it shows |
|---|--------|---------------|
| 1 | `1-raw-node` | Raw Node.js `http` module — manual routing, JSON body parsing, no dependencies |
| 2 | `2-simple-express` | Same API in Express — single-file server, routes inline |
| 3 | `3-express-mvc` | MVC structure — `routes/`, `controllers/`, `models/` split out |
| 4 | `4-express-modular` | Modular structure — one folder per feature, each self-contained |

All four expose the same contract:

```
GET  /api/products        -> list products
POST /api/products        -> create a product
```

## Getting started

Each project is standalone. Pick one and run it:

```bash
cd 4-express-modular
npm install
npm start
```

Projects 2–4 depend on Express 5; project 1 has no dependencies.

## API usage

```bash
curl http://localhost:3000/api/products

curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Laptop","price":999}'
```

## Notes

- All projects use ESM (`"type": "module"`).
- `node_modules/` is git-ignored.

## AI tooling

This repo ships the [Puku CLI](https://puku.sh) config that drives the class
session — custom review agents, backend/security/TypeScript skills, an MCP
browser server, and hook wiring.

### Agents (`.puku-cli/agents/`)

Subagents invoked on demand, each with a fixed tool allowlist.

| Agent | Purpose | Tools |
|-------|---------|-------|
| `code-reviewer` | Reviews source for correctness, readability, maintainability. Reports findings with `file:line` refs; does not rewrite code. | Read, Grep, Glob, Bash |
| `pr-reviewer` | Reviews a PR end to end — diff, description, linked issues, CI status — then posts a structured review with a verdict. Works on a GitHub PR via `gh` or a local branch with no remote. | Read, Grep, Glob, Bash |
| `system-design-reviewer` | Reviews and designs architecture — component boundaries, data flow, scaling, failure modes, trade-offs. Produces diagrams and a decision record. | Read, Grep, Glob, Bash, Write |

### Skills (`.puku-cli/skills/`)

Model-invoked guidance loaded when the request matches its description.

| Skill | Covers |
|-------|--------|
| `node-backend` | Node 20+/Express 5 backend engineering — routes, controllers, services, repositories, middleware, JSON parsing and body limits, 4-arity error middleware, `node:http` vs Express. |
| `security-review` | Vulnerability audit checklist — authn/authz, input validation, injection, secrets, CORS, rate limiting, headers, uploads, sessions/cookies, dependency CVEs. |
| `typescript-best-practices` | `tsconfig` setup, strict mode, typing Express routes and handlers, API contracts and DTOs, interfaces vs type aliases. |

### MCP servers

Configured in `~/.puku-cli/settings.json`:

```json
{
  "mcpServers": {
    "browser-mcp": {
      "command": "npx",
      "args": ["-y", "@agent360/browser-mcp@latest"]
    }
  }
}
```

Gives the agent browser access for debugging the running Express apps.

### Hooks

`hook/` holds shell hooks that run in response to harness events (for example
a `user-prompt-submit` hook that validates input before it reaches the model).
Hooks are configured under the `hooks` key in `~/.puku-cli/settings.json`.

### Using it

```bash
/puku-cli                      # start the session in this repo
```

Ask for a review directly — e.g. "review my changes" routes to
`code-reviewer`, "review PR #12" to `pr-reviewer`, "how should I structure
this" to `system-design-reviewer`.
