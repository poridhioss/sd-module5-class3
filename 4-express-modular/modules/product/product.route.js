import express from "express";
import * as ProductController from "./product.controller.js";

const router = express.Router();

router.get("/products", ProductController.getProducts);
router.post("/products", ProductController.createProduct);

export default router;
