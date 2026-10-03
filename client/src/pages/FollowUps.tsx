import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { Alert, PageHeader } from "../components/ui";
import type { FollowUp } from "../types";

export function FollowUps() {
  const queryClient = useQueryClient();
  const [response, setResponse] = useState<Record<string, string>>({});
  const list = useQuery({
    queryKey: ["followups"],
    queryFn: async () => {
      const data = await api.get<{ data: { followUps: FollowUp[] } }>("/follow-ups");
      return data.data.data.followUps;
    },
  });
  const update = useMutation({
    mutationFn: async (input: { id: string; body: Record<string, unknown> }) => {
      await api.patch(`/follow-ups/${input.id}`, input.body);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["followups"] }),
  });

  return (
    <div>
      <PageHeader title="Follow-ups" lede="A reminder is created when the date passes and the follow-up is still scheduled. Refresh the notifications page, or wait for the minute check." />
      {list.isError ? <Alert>{errorMessage(list.error)}</Alert> : null}
      <div className="space-y-3">
        {list.data?.map((item) => (
          <article key={item.id} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl">
                <Link to={`/applications/${item.applicationId}`}>{item.company || "Application"}</Link>
              </h2>
              <span className="text-sm text-muted">{item.status}</span>
            </div>
            <p className="text-sm text-muted">Due {new Date(item.dueAt).toLocaleString()}</p>
            {item.message ? <p className="mt-2 whitespace-pre-wrap text-sm">{item.message}</p> : null}
            {item.response ? <p className="mt-2 text-sm">Response: {item.response}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button className="btn secondary" onClick={() => update.mutate({ id: item.id, body: { status: "sent" } })}>
                Mark sent
              </button>
              <button className="btn secondary" onClick={() => update.mutate({ id: item.id, body: { status: "skipped" } })}>
                Skip
              </button>
            </div>
            <form
              className="mt-3 flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                update.mutate({
                  id: item.id,
                  body: { response: response[item.id] || "", respondedAt: new Date().toISOString(), status: "done" },
                });
              }}
            >
              <input
                className="field max-w-md"
                placeholder="What did they say?"
                value={response[item.id] || ""}
                onChange={(event) => setResponse((current) => ({ ...current, [item.id]: event.target.value }))}
              />
              <button className="btn">Save response</button>
            </form>
          </article>
        ))}
        {list.data && list.data.length === 0 ? <p className="text-muted">No follow-ups yet. Add one from an application.</p> : null}
      </div>
    </div>
  );
}
