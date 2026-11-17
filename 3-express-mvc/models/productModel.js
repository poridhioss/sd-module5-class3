let products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Phone", price: 30000 },
  { id: 3, name: "Tablet", price: 20000 },
];

let nextId = 4;

export const getAll = () => products;

export const create = (name, price) => {
  const product = { id: nextId++, name, price };
  products.push(product);
  return product;
};
