import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { MIN_PASSWORD_LENGTH } from "./password-rules";

export { MIN_PASSWORD_LENGTH };

// scrypt with N=2^15, r=8, p=1 and a 16-byte random salt.
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEY_LEN = 64;
const MAX_MEM = 128 * N * R * 2; // scrypt needs 128·N·r bytes; leave headroom.


function scrypt(password: string, salt: Buffer, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password.normalize("NFKC"), salt, KEY_LEN, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** Format: scrypt$N$r$p$salt(base64)$hash(base64) */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, { N, r: R, p: P, maxmem: MAX_MEM });
  return ["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const opts = { N: Number(n), r: Number(r), p: Number(p), maxmem: 128 * Number(n) * Number(r) * 2 };
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), opts);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

let dummyHash: Promise<string> | null = null;
/**
 * Verify against a throwaway hash so unknown usernames take as long to
 * reject as wrong passwords.
 */
export async function burnVerifyTime(password: string): Promise<void> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
}

/** Returns a message key for what's wrong, or null when the password is acceptable. */
export function passwordProblem(password: string, username: string): "err.pwShort" | "err.pwLong" | "err.pwUsername" | null {
  if (password.length < MIN_PASSWORD_LENGTH) return "err.pwShort";
  if (password.length > 200) return "err.pwLong";
  if (username && password.toLowerCase().includes(username.toLowerCase())) return "err.pwUsername";
  return null;
}

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** A random, easy-to-read password, e.g. for new accounts and resets. */
export function generatePassword(username = "", length = 14): string {
  for (;;) {
    let out = "";
    for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
    if (!passwordProblem(out, username)) return out;
  }
}

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,31}$/;
export const normalizeUsername = (u: string) => u.trim().toLowerCase();
