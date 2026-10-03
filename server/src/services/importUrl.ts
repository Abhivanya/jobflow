import { Job } from "../models/Job";
import { HttpError } from "../utils/errors";
import { htmlToText } from "./htmlText";
import { assertPublicUrl } from "./publicUrl";

async function readLimited(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  const max = 500_000;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > max) throw new HttpError(400, "PAGE_TOO_BIG", "That page is too large to import");
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function fetchPage(url: URL, hops = 0): Promise<string> {
  const response = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "JobFlow/1.0", Accept: "text/html,application/xhtml+xml" },
  });
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    if (hops >= 1) throw new HttpError(400, "BAD_URL", "That link redirected too many times");
    const location = response.headers.get("location");
    if (!location) throw new HttpError(400, "BAD_URL", "That link redirected without a destination");
    const next = await assertPublicUrl(new URL(location, url).toString());
    return fetchPage(next, hops + 1);
  }
  if (!response.ok) throw new HttpError(400, "FETCH_FAILED", "Could not read that page");
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html") && !type.includes("text/plain")) {
    throw new HttpError(400, "BAD_URL", "That link is not an HTML page");
  }
  return readLimited(response);
}

function titled(html: string) {
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (og?.[1]) return htmlToText(og[1]);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return htmlToText(title?.[1] || "").slice(0, 140);
}

export async function importJobFromUrl(userId: string, rawUrl: string) {
  const url = await assertPublicUrl(rawUrl);
  const html = await fetchPage(url);
  const text = htmlToText(html).slice(0, 50000);
  const title = titled(html) || "Imported role";
  const job = await Job.create({
    userId,
    title,
    company: url.hostname.replace(/^www\./, ""),
    location: "",
    url: url.toString(),
    description: text,
    source: "url",
    saved: true,
  });
  return job;
}
