import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(password: string) {
  return bcrypt.hash(password, ROUNDS);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
