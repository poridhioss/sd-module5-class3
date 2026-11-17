import http from "node:http";

const PORT = process.env.PORT || 3000;

let products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Phone", price: 30000 },
  { id: 3, name: "Tablet", price: 20000 },
];

let nextId = 4;

const MAX_BODY_SIZE = 1000000;

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(Object.assign(new Error("request entity too large"), { status: 413 }));
        req.resume();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });

const sendJSON = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/products") {
    return sendJSON(res, 200, products);
  }

  if (req.method === "POST" && url.pathname === "/products") {
    let raw;
    try {
      raw = await readBody(req);
    } catch (err) {
      return sendJSON(res, err.status || 400, { error: err.message });
    }

    let body;
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return sendJSON(res, 400, { error: "Invalid JSON body" });
    }

    const { name, price } = body || {};

    if (!name || typeof price !== "number") {
      return sendJSON(res, 400, {
        error: "name (string) and price (number) are required",
      });
    }

    const product = { id: nextId++, name, price };
    products.push(product);
    return sendJSON(res, 201, product);
  }

  return sendJSON(res, 404, { error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
