import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError } from "../utils/errors";

function ipv4Private(host: string) {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export function isPrivateAddress(address: string) {
  const host = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = host.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1] && ipv4Private(mapped[1])) return true;
  if (host === "::1" || host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host.includes(":")) return false;
  return ipv4Private(host);
}

export async function assertPublicUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "BAD_URL", "That link does not look valid");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "BAD_URL", "Only http and https links are allowed");
  }
  if (url.username || url.password) {
    throw new HttpError(400, "BAD_URL", "Links with a username or password are not allowed");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new HttpError(400, "BAD_URL", "That address is not allowed");
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new HttpError(400, "BAD_URL", "That address is not allowed");
    return url;
  }
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    throw new HttpError(400, "BAD_URL", "Could not resolve that host");
  }
  if (records.length === 0 || records.some((record) => isPrivateAddress(record.address))) {
    throw new HttpError(400, "BAD_URL", "That address is not allowed");
  }
  return url;
}
