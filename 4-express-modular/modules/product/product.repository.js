let products = [
  { id: 1, name: "Laptop", price: 50000 },
  { id: 2, name: "Phone", price: 30000 },
  { id: 3, name: "Tablet", price: 20000 },
];

let nextId = 4;

export const findAll = () => products;

export const insert = (name, price) => {
  const product = { id: nextId++, name, price };
  products.push(product);
  return product;
};
