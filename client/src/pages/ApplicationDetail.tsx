import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { StatusPill } from "../components/StatusPill";
import { Alert, Field, PageHeader } from "../components/ui";
import { statusLabel, statuses, type AppStatus, type Application, type TimelineEvent } from "../types";

export function ApplicationDetail() {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const [note, setNote] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [due, setDue] = useState("");

  const detail = useQuery({
    queryKey: ["application", id],
    queryFn: async () => {
      const response = await api.get<{ data: { application: Application; events: TimelineEvent[] } }>(`/applications/${id}`);
      return response.data.data;
    },
  });

  const update = useMutation({
    mutationFn: async (body: { status?: AppStatus; notes?: string }) => {
      await api.patch(`/applications/${id}`, body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["application", id] }),
  });

  const follow = useMutation({
    mutationFn: async () => {
      await api.post("/follow-ups", {
        applicationId: id,
        dueAt: new Date(due).toISOString(),
        message,
      });
    },
    onSuccess: () => {
      setMessage("");
      setDue("");
      queryClient.invalidateQueries({ queryKey: ["application", id] });
      queryClient.invalidateQueries({ queryKey: ["followups"] });
    },
  });

  if (detail.isLoading) return <p className="text-muted">Loading application...</p>;
  if (!detail.data) return <Alert>{errorMessage(detail.error)}</Alert>;
  const { application, events } = detail.data;

  return (
    <div>
      <PageHeader
        title={application.title}
        lede={application.company}
        action={<StatusPill status={application.status} />}
      />
      <p className="mb-4 text-sm">
        <Link to={`/jobs/${application.jobId}`}>Open the job</Link>
        {application.resumeLabel ? ` · Resume: ${application.resumeLabel}` : ""}
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <ol className="card space-y-4 p-4">
          {events.map((event) => (
            <li key={event.id} className="border-l-2 border-moss pl-3">
              <p>{event.summary}</p>
              <p className="text-xs text-muted">{new Date(event.createdAt).toLocaleString()}</p>
            </li>
          ))}
        </ol>
        <div className="space-y-4">
          <form
            className="card space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              update.mutate({ status: String(form.get("status")) as AppStatus, notes: note ?? application.notes });
            }}
          >
            <Field label="Status">
              <select className="select" name="status" defaultValue={application.status}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className="area" value={note ?? application.notes} onChange={(event) => setNote(event.target.value)} />
            </Field>
            {update.isError ? <Alert>{errorMessage(update.error)}</Alert> : null}
            <button className="btn" disabled={update.isPending}>
              Save
            </button>
          </form>
          <form
            className="card space-y-3 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              follow.mutate();
            }}
          >
            <h2 className="font-serif text-xl">Follow-up</h2>
            <Field label="When">
              <input className="field" type="datetime-local" value={due} onChange={(event) => setDue(event.target.value)} required />
            </Field>
            <Field label="Message">
              <textarea className="area" value={message} onChange={(event) => setMessage(event.target.value)} />
            </Field>
            {follow.isError ? <Alert>{errorMessage(follow.error)}</Alert> : null}
            <button className="btn secondary" disabled={follow.isPending}>
              Schedule
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
