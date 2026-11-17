import * as Product from "../models/productModel.js";

export const getProducts = (req, res) => {
  res.status(200).json(Product.getAll());
};

export const createProduct = (req, res) => {
  const { name, price } = req.body ?? {};

  if (!name || typeof price !== "number") {
    return res
      .status(400)
      .json({ error: "name (string) and price (number) are required" });
  }

  const product = Product.create(name, price);

  res.status(201).json(product);
};
