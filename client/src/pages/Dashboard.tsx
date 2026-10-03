import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, errorMessage } from "../api/client";
import { PageHeader } from "../components/ui";

interface DashboardData {
  counts: {
    jobs: number;
    saved: number;
    applications: number;
    interviews: number;
    offers: number;
    rejections: number;
    pendingFollowUps: number;
  };
  byStatus: Array<{ status: string; label: string; count: number }>;
  overTime: Array<{ week: string; count: number }>;
  conversion: { applied: number; interviews: number; offers: number };
  recent: Array<{ id: string; summary: string; createdAt: string; applicationId: string }>;
}

export function Dashboard() {
  const queryClient = useQueryClient();
  const dashboard = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await api.get<{ data: DashboardData }>("/dashboard");
      return response.data.data;
    },
  });
  const logout = useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });

  if (dashboard.isLoading) return <p className="text-muted">Loading the board...</p>;
  if (dashboard.isError) return <p>{errorMessage(dashboard.error)}</p>;
  const data = dashboard.data;
  if (!data) return null;

  const cards = [
    ["Jobs", data.counts.jobs],
    ["Saved", data.counts.saved],
    ["Applications", data.counts.applications],
    ["Interviews", data.counts.interviews],
    ["Offers", data.counts.offers],
    ["Rejections", data.counts.rejections],
    ["Follow-ups waiting", data.counts.pendingFollowUps],
  ];

  return (
    <div>
      <PageHeader
        title="This week"
        lede="Counts are the current status of each application. The funnel below is counted from status changes, so a jump straight to interview still counts as applied."
        action={
          <button className="btn secondary" onClick={() => logout.mutate()}>
            Log out
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={String(label)} className="card p-4">
            <p className="text-sm text-muted">{label}</p>
            <p className="font-serif text-3xl">{value}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-serif text-xl">Where things stand</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byStatus}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-30} height={60} textAnchor="end" />
                <YAxis allowDecimals={false} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e6b48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card p-4">
          <h2 className="mb-1 font-serif text-xl">From the timeline</h2>
          <p className="text-sm text-muted">
            {data.conversion.applied} reached applied, {data.conversion.interviews} reached interview, {data.conversion.offers} reached offer.
          </p>
          <h3 className="mb-2 mt-4 font-serif text-lg">New applications by week</h3>
          {data.overTime.length === 0 ? (
            <p className="text-sm text-muted">Nothing in the last 12 weeks yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.overTime.map((row) => (
                <li key={row.week} className="flex items-center justify-between text-sm">
                  <span>Week of {row.week}</span>
                  <span className="font-semibold">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="card mt-4 p-4">
        <h2 className="mb-3 font-serif text-xl">Recent activity</h2>
        {data.recent.length === 0 ? <p className="text-sm text-muted">Status changes will show up here.</p> : null}
        <ul className="space-y-2">
          {data.recent.map((item) => (
            <li key={item.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
              <Link to={`/applications/${item.applicationId}`}>{item.summary}</Link>
              <span className="text-muted">{new Date(item.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
