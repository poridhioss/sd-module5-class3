import * as Repository from "./product.repository.js";
import { validateCreate } from "./product.validation.js";

export const getAll = () => Repository.findAll();

export const create = (body) => {
  const { error, name, price } = validateCreate(body);

  if (error) {
    return { error };
  }

  return { product: Repository.insert(name, price) };
};
