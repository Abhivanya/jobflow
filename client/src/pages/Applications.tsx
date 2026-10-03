import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { StatusPill } from "../components/StatusPill";
import { Alert, PageHeader } from "../components/ui";
import { statuses, type AppStatus, type Application, type Page } from "../types";
import { statusLabel } from "../types";

export function Applications() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const apps = useQuery({
    queryKey: ["applications", status, page],
    queryFn: async () => {
      const response = await api.get<{ data: Page<Application> }>("/applications", {
        params: { status: status || undefined, page, limit: 12 },
      });
      return response.data.data;
    },
  });

  return (
    <div>
      <PageHeader title="Applications" lede="Each status change is kept on the timeline, including the one you are about to make." />
      <select
        className="select mb-4 max-w-xs"
        value={status}
        onChange={(event) => {
          setPage(1);
          setStatus(event.target.value);
        }}
      >
        <option value="">All statuses</option>
        {statuses.map((item) => (
          <option key={item} value={item}>
            {statusLabel[item]}
          </option>
        ))}
      </select>
      {apps.isError ? <Alert>{errorMessage(apps.error)}</Alert> : null}
      <div className="space-y-3">
        {apps.data?.items.map((application) => (
          <Link key={application.id} to={`/applications/${application.id}`} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <h2 className="font-serif text-xl">{application.title}</h2>
              <p className="text-sm text-muted">{application.company}</p>
            </div>
            <StatusPill status={application.status as AppStatus} />
          </Link>
        ))}
        {apps.data && apps.data.items.length === 0 ? <p className="text-muted">No applications in this filter.</p> : null}
      </div>
      {apps.data && apps.data.pages > 1 ? (
        <div className="mt-4 flex gap-2">
          <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>
            Previous
          </button>
          <button className="btn secondary" disabled={page >= (apps.data?.pages ?? 1)} onClick={() => setPage((n) => n + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}
