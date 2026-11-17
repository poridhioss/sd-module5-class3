import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1000000b" }));

let products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Phone", price: 30000 },
  { id: 3, name: "Tablet", price: 20000 },
];

let nextId = 4;

app.get("/products", (req, res) => {
  res.status(200).json(products);
});

app.post("/products", (req, res) => {
  const { name, price } = req.body ?? {};

  if (!name || typeof price !== "number") {
    return res
      .status(400)
      .json({ error: "name (string) and price (number) are required" });
  }

  const product = { id: nextId++, name, price };
  products.push(product);

  res.status(201).json(product);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
