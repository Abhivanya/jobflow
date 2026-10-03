import type { AppStatus } from "../types";
import { statusLabel } from "../types";

const tone: Record<AppStatus, string> = {
  DISCOVERED: "bg-stone-100 text-stone-700",
  SAVED: "bg-amber-50 text-amber-800",
  APPLYING: "bg-sky-50 text-sky-800",
  APPLIED: "bg-emerald-50 text-emerald-800",
  FOLLOW_UP: "bg-orange-50 text-orange-800",
  INTERVIEW: "bg-violet-50 text-violet-800",
  OFFER: "bg-green-100 text-green-900",
  REJECTED: "bg-rose-50 text-rose-800",
  WITHDRAWN: "bg-stone-100 text-stone-500",
};

export function StatusPill({ status }: { status: AppStatus }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone[status]}`}>{statusLabel[status]}</span>;
}
