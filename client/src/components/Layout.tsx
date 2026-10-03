import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { api } from "../api/client";
import { useMe } from "../api/session";

const links = [
  ["/", "Dashboard"],
  ["/jobs", "Jobs"],
  ["/applications", "Applications"],
  ["/follow-ups", "Follow-ups"],
  ["/resumes", "Resumes"],
  ["/profile", "Profile"],
  ["/notifications", "Notifications"],
];

export function Layout() {
  const me = useMe();
  const [verifyLink, setVerifyLink] = useState("");
  const resend = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { devLink?: string; alreadyVerified: boolean } }>("/auth/resend-verification");
      return response.data.data;
    },
    onSuccess: (data) => setVerifyLink(data.devLink || ""),
  });
  const unread = useQuery({
    queryKey: ["unread"],
    queryFn: async () => {
      const response = await api.get<{ data: { unread: number } }>("/notifications/unread-count");
      return response.data.data.unread;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-sidebar px-4 py-5 text-stone-100">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-moss font-serif text-white">JF</span>
          <div>
            <p className="font-serif text-xl leading-none">JobFlow</p>
            <p className="text-xs text-stone-400">Keep the search in one place</p>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto md:block md:space-y-1">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? "bg-white/10 text-white" : "text-stone-300 hover:text-white"}`
              }
            >
              {label}
              {to === "/notifications" && unread.data ? ` (${unread.data})` : ""}
            </NavLink>
          ))}
        </nav>
        <p className="mt-8 hidden text-xs leading-5 text-stone-500 md:block">Your jobs stay in your database. The overlap number is just skill overlap.</p>
      </aside>
      <div>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <p className="text-sm text-muted">{me.data?.name}</p>
          {!me.data?.emailVerified ? (
            <button className="text-sm text-clay" onClick={() => resend.mutate()}>
              {verifyLink ? "Verification link ready below" : "Resend verification email"}
            </button>
          ) : (
            <span />
          )}
        </div>
        {verifyLink ? (
          <p className="border-b border-line px-5 py-2 text-sm">
            No mail server configured.{" "}
            <a className="underline" href={verifyLink}>
              Open the verification link
            </a>
          </p>
        ) : null}
        <main className="px-5 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
