---
name: typescript-best-practices
description: TypeScript best practices for backend and Node.js projects. Use when adding or reviewing TypeScript files, setting up tsconfig, typing Express routes and request handlers, defining API contracts and DTOs, choosing between interfaces and type aliases, or configuring strict mode. Triggers on ".ts", "typescript", "tsconfig", "interface", "type ", "strict", "generic", "enum", "DTO", "typing an API", "ts error", "tsc".
---

# TypeScript best practices

## Compiler setup

Start from `strict: true`. Every flag below is either required for correctness or prevents a whole class of runtime bug.

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

- `module`/`moduleResolution`: `NodeNext` for Node ESM projects. With `NodeNext`, relative imports **must** carry the `.js` extension in the emitted JS, even though the source says `.ts`.
- `noUncheckedIndexedAccess` turns `arr[0]` into `T | undefined`. This is the single highest-value flag — it surfaces every off-by-one and missing-key bug at compile time.
- `exactOptionalPropertyTypes` distinguishes `{ x?: string }` from `{ x: string | undefined }`. Annoying to enable on an old codebase, essential on a new one.
- `skipLibCheck: true` avoids third-party `.d.ts` errors breaking your build. Keep it on.
- `noEmit: true` when the build tool is `tsc`/`tsup`/`esbuild`/`tsx`. Do not mix `tsc` output with a bundler.

## Types vs interfaces

- **`interface`** for object shapes that will be extended or implemented. Interfaces are open — a declaration merges with another — which is sometimes a feature and sometimes a footgun.
- **`type`** for unions, intersections, tuples, mapped types, and function types. `type` cannot be extended by a class in the declaration-merge sense.
- Use `type` for unions. `type Result = { ok: true; value: Data } | { ok: false; error: string }` — a discriminated union with a literal discriminant gives you exhaustive narrowing.
- **Never use `enum`.** Use a union of string literals instead:

```ts
type Status = "pending" | "active" | "closed";   // good
enum Status { Pending, Active }                    // avoid
```

`enum` adds runtime code, is not tree-shakeable, and rejects string values. A const object gives the same autocompletion with no runtime cost:

```ts
const STATUS = { pending: "pending", active: "active" } as const;
type Status = (typeof STATUS)[keyof typeof STATUS];
```

## Narrowing and exhaustiveness

- Use a literal discriminant so `switch` is checked:

```ts
const assertNever = (x: never): never => {
  throw new Error(`Unhandled: ${JSON.stringify(x)}`);
};

switch (result.status) {
  case "ok": return result.value;
  case "err": return result.error;
  default: return assertNever(result);   // compile error if a case is missing
}
```

- Prefer **type predicates** over casting: `function isFoo(x: unknown): x is Foo`.
- Avoid `as`. Every `as` is a place the compiler stopped helping you. If you need `as`, use `as const` or a type predicate instead.
- `as unknown as T` is always wrong — it launders away all checking.

## Modeling API contracts

Keep the wire format and the internal shape separate when they differ. Do not leak a DB row straight into a response.

```ts
// wire / DTO
export type ProductResponse = {
  id: number;
  name: string;
  price: number;
};

// internal
export type ProductRecord = ProductResponse & { createdAt: Date };
```

- **Parse, don't validate.** Incoming request bodies are `unknown`. A type annotation does not check anything at runtime.

```ts
const parseProduct = (body: unknown): ProductResponse | null => {
  if (typeof body !== "object" || body === null) return null;
  const { name, price } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name) return null;
  if (typeof price !== "number" || !Number.isFinite(price)) return null;
  return { name, price };
};
```

  Prefer a schema library (`zod`, `valibot`, `typebox`) when the project already has one — it gives you runtime validation and inferred types from one definition.
- `unknown` is the right type for untrusted input. `any` disables checking silently and is almost always the wrong answer.

## Express with TypeScript

```ts
import express from "express";

const app = express();

// Typed params / query / body
app.get<{ id: string }>("/products/:id", (req, res) => {
  const { id } = req.params;      // string
  res.status(200).json({ id });
});

app.post("/products", (req, res) => {
  const body: unknown = req.body;   // still unknown until parsed
  res.status(201).json(body);
});
```

- `req.params`, `req.query` and `req.body` are **not** typed by default. Generics on the handler (`app.get<Params, ResBody, ReqBody, Query>`) type them, or use `RequestHandler<P, ResBody, ReqBody, Query>`.
- `req.query` values are `string | string[] | ParsedQs | ParsedQs[] | undefined`. Narrow them before use.
- `res.json()` is `any`-typed by default — it will happily serialize anything. Type the response with the `ResBody` generic.
- Define `RequestHandler` types once and reuse them; do not inline handler signatures.

## Async and error handling

- **`async` handlers that reject do NOT reach Express's error middleware** in Express 4 — a rejected promise is an unhandled rejection. Express 5 forwards rejected promises to the error handler automatically; on Express 4 you need `express-async-errors` or a wrapper.

```ts
const asyncHandler =
  <T extends RequestHandler>(fn: T): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
```

- Every `catch` block must do something: rethrow, return a fallback, or log. An empty `catch` swallows the bug.
- `Promise.all` fails fast — one rejection rejects the whole thing. Use `Promise.allSettled` when partial success is meaningful.

## General rules

- `const` by default; `let` only when reassigned. Never `var`.
- Prefer `readonly` on properties that should not change after construction.
- Use `satisfies` instead of `as` for literal-to-type checks:

```ts
const config = { port: 3000, host: "localhost" } satisfies Config;
// config is { port: number; host: string } and was checked against Config
```

- `import type { X }` for type-only imports — keeps them erased and avoids runtime cycles.
- `verbatimModuleSyntax: true` (with `NodeNext`) enforces `import type` vs `import` correctness.
- No `any` in exported signatures — it infects every consumer.
- Name types in `PascalCase`, values in `camelCase`, `SCREAMING_SNAKE` for constants.

## Checklist

- [ ] `strict: true`, `noUncheckedIndexedAccess: true`
- [ ] `module`/`moduleResolution` = `NodeNext` for Node ESM
- [ ] `.js` extensions on relative imports
- [ ] No `enum` — string-literal unions instead
- [ ] No `any`; `unknown` for untrusted input
- [ ] `as` replaced by `satisfies`, `as const`, or type predicates
- [ ] Exhaustiveness check via `assertNever` on unions
- [ ] Request bodies parsed at runtime, not just annotated
- [ ] Async handlers wired to the error middleware (Express 4 needs a wrapper)
- [ ] `import type` for type-only imports
