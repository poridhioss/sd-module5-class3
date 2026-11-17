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
