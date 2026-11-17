import * as Service from "./product.service.js";

export const getProducts = (req, res) => {
  res.status(200).json(Service.getAll());
};

export const createProduct = (req, res) => {
  const { error, product } = Service.create(req.body);

  if (error) {
    return res.status(400).json({ error });
  }

  res.status(201).json(product);
};
