export const validateCreate = (body) => {
  const { name, price } = body ?? {};

  if (!name || typeof price !== "number") {
    return { error: "name (string) and price (number) are required" };
  }

  return { name, price };
};
