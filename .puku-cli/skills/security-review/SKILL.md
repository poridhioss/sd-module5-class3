---
name: security-review
description: Security review checklist for Node.js/Express backends and web apps. Use when reviewing code for vulnerabilities, auditing an API before release, checking auth/authz, input validation, injection risks (SQL/NoSQL/command), secrets handling, CORS, rate limiting, headers, file uploads, session and cookie security, or dependency vulnerabilities. Triggers on "security", "vulnerability", "audit", "CVE", "injection", "XSS", "CSRF", "SSRF", "auth", "JWT", "sanitize", "OWASP", "hardcoded secret", "rate limit", "CORS".
---

# Security review skill

## Priority order

Fix in this order — exploitability beats elegance.

1. **Broken access control** (authn/authz missing or bypassable) — critical
2. **Injection** (SQL, NoSQL, command, template, path) — critical
3. **Secret exposure** (hardcoded keys, logged credentials) — critical
4. **SSRF / unsafe deserialization** — critical
5. **Session & cookie misconfiguration** — high
6. **XSS** (reflected/stored, especially in API responses) — high
7. **CSRF** — high for cookie-authenticated apps
8. **DoS** (unbounded input, no rate limit, regex blowup) — high
9. **Missing security headers / CORS misconfig** — medium
10. **Info disclosure** (stack traces, verbose errors, directory listing) — medium
11. **Outdated dependencies** — medium

## 1. Access control

- **Every** non-public route checks authentication. Default-deny, not default-allow.
- Authorization is checked **per object**, not just per route. "Is the user logged in" is not "does this user own this resource": check `resource.ownerId === req.user.id` (or a role/permission check) on every fetch/update/delete.
- IDOR is the classic bug: `GET /products/:id` that returns any product to any authenticated user. Enforce ownership server-side, on every single request.
- Mass assignment: never spread the raw body into a model. Pick fields explicitly.

```ts
// bad — client can set role, id, ownerId
await User.update({ ...req.body });

// good
const { name, email } = parseUpdate(req.body);
await User.update({ name, email }, userId);
```

- Admin routes need an explicit role check server-side. Hiding an admin button in the UI is not authorization.

## 2. Injection

### SQL / NoSQL

- **Always use parameterized queries.** String concatenation with user input is injection.

```js
// vulnerable
db.query(`SELECT * FROM users WHERE id = '${req.query.id}'`);

// safe
db.query("SELECT * FROM users WHERE id = ?", [req.query.id]);
```

- With ORMs, use the query-builder's parameter form. Watch for raw query escape hatches (`sequelize.query`, `knex.raw`, `mongoose.$where`).
- **NoSQL operator injection**: a JSON body like `{"password": {"$ne": null}}` becomes a query. Validate that the value has the expected primitive type, not just that the key exists.
- MongoDB `$where` and JS execution (`eval`, `vm`, `new Function`) on user input are code execution.

### Command injection

- Never build a shell string from input. Use `execFile`/`spawn` with an argument array, never `exec` with interpolation.

```js
// vulnerable
exec(`ls ${req.query.dir}`);

// safe
execFile("ls", [req.query.dir]);
```

- Even `execFile` is unsafe if a user-controlled value can become a **flag**. Use `--` before positional args and validate values against an allowlist.

### Path traversal

- `path.join(root, req.params.file)` is exploitable via `../../`. Resolve and then assert the result stays under the root.

```js
const filePath = path.resolve(root, req.params.file);
if (!filePath.startsWith(path.resolve(root) + path.sep)) {
  return res.status(400).json({ error: "Invalid path" });
}
```

- Never use user input in a path without this check. `decodeURIComponent` first — `%2e%2e%2f` is `../`.

### Template / HTML

- Untrusted data into HTML must be escaped by the template engine's default escaping. Never build HTML by concatenation, and never use `innerHTML` with untrusted data.

## 3. Secrets

- **Never hardcode** API keys, passwords, tokens, connection strings, or private keys — not even in a test fixture or a comment. Not even "example" ones that look real.
- Load from `process.env` (or a secret manager). Fail fast at startup if a required secret is missing — do not default to a placeholder.
- **`.env` must be in `.gitignore`** and the `.env.example` must contain only empty/placeholder values.
- Scan for committed secrets: `git log -p | grep -iE "(api[_-]?key|secret|password|token)\s*[:=]"` and check the whole history, not just HEAD. A secret in a deleted commit is still in the repo.
- **Never log** credentials, tokens, session ids, full request bodies on auth routes, or card numbers. Redact before logging.
- Rotate anything that was ever committed. Removing the line does not remove it from history.

## 4. SSRF

- Any URL that comes from user input and is fetched server-side is an SSRF vector.
- Block internal ranges: `127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16` (cloud metadata at `169.254.169.254`), `::1`, `fc00::/7`.
- Resolve DNS **before** connecting and validate the resolved IP — otherwise DNS rebinding bypasses the hostname check.
- Do not follow redirects to internal addresses. `redirect: "manual"`.
- Prefer an **allowlist** of permitted hosts over a blocklist of forbidden ranges.

## 5. Sessions, cookies, auth

- Cookies: `httpOnly: true`, `secure: true` (in production), `sameSite: "lax"` or `"strict"`, `path` set, `maxAge` bounded. `secure` must be true whenever the app is served over HTTPS.
- Session IDs must be generated from a CSPRNG (`crypto.randomBytes`), and must be **rotated on privilege change** (login, logout, role change) to prevent session fixation.
- Regenerate the session ID after authentication.
- Cookies and Authorization headers must not be readable by JS → `httpOnly` for cookies; never put the token in a `localStorage` accessible to XSS (prefer `httpOnly` cookies, or short-lived in-memory tokens).
- JWT: verify the signature (never `algorithms: ["none"]`), check `exp`, use a secret of adequate length (≥256 bits) or a proper key pair, and validate `iss`/`aud` if the token is not for your service alone. Do not put secrets in the payload.
- Passwords: hash with **argon2id** or **bcrypt** (cost ≥ 12), never MD5/SHA1/SHA256 without a salt-and-stretch KDF. Use `timingSafeEqual` for token/API-key comparison.

## 6. Input validation & XSS

- Validate **type, format, length, range, and allowlist** at the boundary. Reject rather than coerce.
- Set an allowlist of accepted characters/enums. Never interpolate user input into a query, a filename, a shell command, or an HTML string.
- Limit sizes: body bytes, string lengths, array lengths, number ranges, upload size and count.
- **Prototype pollution**: reject `__proto__`, `constructor`, `prototype` in user-supplied JSON when merging objects. Use `Object.create(null)` or `Map` for dynamic keys. In Express, `express.json()` is generally safe, but `qs`/`qs` extended parsing has had prototype-pollution CVEs — keep `extended` off unless needed, and keep `qs` patched.
- For API responses: set `Content-Type: application/json` and never reflect raw user input into HTML.

## 7. CSRF

- Required for any app authenticating via cookies. `SameSite=Lax`/`Strict` helps but is not a complete defense for top-level GET navigations and old browsers.
- Use a synchronizer token or a double-submit cookie, and verify `Origin`/`Referer` on state-changing requests.
- Do **not** exempt routes based on `Content-Type: application/json` alone — a CSRF can set that via `text/plain` with a form? No — but a CORS misconfiguration or a permissive cross-origin fetch can.

## 8. DoS

- **Rate limit** every expensive or auth-sensitive endpoint (login, signup, password reset, search). Use `express-rate-limit`.
- **Cap the request body size** (e.g. `express.json({ limit: "1000000b" })`). Unlimited body = memory exhaustion.
- Bound every collection that grows with input (pagination limits). Return at most N items.
- Avoid unbounded recursion and unbounded in-memory arrays with no eviction.
- Reject **regexes with catastrophic backtracking**. Nested quantifiers like `(a+)+` on user input can hang the event loop. Prefer a linear-time check or a library.
- Set request timeouts and handle `req` aborts so a slow client cannot pin a socket forever.

## 9. Headers & CORS

Security headers:

```js
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});
```

- **CORS**: an explicit allowlist of origins. `origin: true` reflects any origin — that is equivalent to no CORS policy and enables credential theft. `origin: "*"` cannot be combined with `credentials: true` safely.
- Only `GET, HEAD, POST` are CORS-simple methods. A `PUT`/`DELETE` triggers a preflight — handle `OPTIONS` and allow the specific methods/headers.
- `helmet` sets sane defaults for all of the above.

## 10. Info disclosure

- Generic errors in production: `res.status(500).json({ error: "Internal server error" })`. Log the detail server-side.
- Never return stack traces, SQL errors, file paths, or internal hostnames to the client.
- `NODE_ENV=production` disables Express's stack-trace pages.
- Do not expose `/debug`, `/metrics`, or `.env` publicly.

## 11. Dependencies

```bash
npm audit --production
npm outdated
```

- Lockfile committed (`package-lock.json`), `npm ci` in CI.
- Patch promptly — most exploited issues are old CVEs in transitive deps.
- Prefer a small dependency surface. Every dep is code you run with your users' data.
- Watch for typosquat packages and install scripts.

## Review output format

For each finding report:

```
[SEVERITY] Category — file:line
  Issue:    what is wrong and why it matters
  Evidence: the exact code
  Fix:      the concrete change (a diff or precise instruction)
```

Severity: **Critical** (data breach / RCE / auth bypass) → **High** → **Medium** → **Low** (hardening).

Rules for the review itself:
- Cite `file:line` for every finding.
- Do not report style opinions as vulnerabilities.
- Distinguish "exploitable now" from "defense in depth".
- If the code is fine for a category, say so briefly — do not pad the report.
- Never print a real secret value; refer to it as "the key at line N".
