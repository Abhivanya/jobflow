import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert, PageHeader } from "../components/ui";
import type { Notice, Page } from "../types";

export function Notifications() {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await api.get<{ data: Page<Notice> & { unread: number } }>("/notifications");
      return response.data.data;
    },
  });
  const read = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
  });
  const readAll = useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Notifications"
        lede={list.data ? `${list.data.unread} unread` : ""}
        action={
          <button className="btn secondary" onClick={() => readAll.mutate()}>
            Mark all read
          </button>
        }
      />
      {list.isError ? <Alert>{errorMessage(list.error)}</Alert> : null}
      <div className="space-y-2">
        {list.data?.items.map((item) => (
          <article key={item.id} className={`card p-4 ${item.read ? "opacity-70" : ""}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-semibold">{item.title}</h2>
              <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
            </div>
            {item.body ? <p className="mt-1 text-sm">{item.body}</p> : null}
            <div className="mt-2 flex gap-3 text-sm">
              {item.link ? <Link to={item.link}>Open</Link> : null}
              {!item.read ? (
                <button className="text-moss" onClick={() => read.mutate(item.id)}>
                  Mark read
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {list.data && list.data.items.length === 0 ? <p className="text-muted">Quiet for now.</p> : null}
      </div>
    </div>
  );
}
