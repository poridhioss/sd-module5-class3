import express from "express";
import productRoutes from "./routes/productRoutes.js";

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1000000b" }));

app.use("/", productRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use((err, req, res, next) => {
  res.status(err.status || 400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
