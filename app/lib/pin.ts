export const generateGameCode = () => {
  const n = Math.floor(Math.random() * 1_000_000);
  return n.toString().padStart(6, "0");
};

export const normalizeGameCode = (value: string) =>
  value.replace(/\D/g, "").slice(0, 6);
