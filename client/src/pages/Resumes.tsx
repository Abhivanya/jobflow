import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api, errorMessage } from "../api/client";
import { Alert, PageHeader } from "../components/ui";
import type { Resume } from "../types";

export function Resumes() {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const response = await api.get<{ data: { resumes: Resume[] } }>("/resumes");
      return response.data.data.resumes;
    },
    refetchInterval: (query) => (query.state.data?.some((resume) => resume.parseStatus === "pending") ? 2000 : false),
  });
  const upload = useMutation({
    mutationFn: async () => {
      if (!file) return;
      const body = new FormData();
      body.set("file", file);
      if (label.trim()) body.set("label", label.trim());
      await api.post("/resumes", body);
    },
    onSuccess: () => {
      setFile(null);
      setLabel("");
      queryClient.invalidateQueries({ queryKey: ["resumes"] });
    },
  });
  const makeDefault = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/resumes/${id}/default`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/resumes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });

  return (
    <div>
      <PageHeader title="Resumes" lede="PDF, DOCX, or TXT, up to 5 MB. One of them can be the default used for overlap checks." />
      <form
        className="card mb-5 flex flex-wrap items-end gap-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          upload.mutate();
        }}
      >
        <label className="text-sm">
          File
          <input
            className="mt-1 block"
            type="file"
            accept=".pdf,.docx,.txt,application/pdf,text/plain"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="text-sm">
          Label
          <input className="field mt-1" value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Optional" />
        </label>
        <button className="btn" disabled={!file || upload.isPending}>
          Upload
        </button>
      </form>
      {upload.isError ? <Alert>{errorMessage(upload.error)}</Alert> : null}
      <div className="space-y-3">
        {resumes.data?.map((resume) => (
          <article key={resume.id} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-xl">
                v{resume.version} · {resume.label}
              </h2>
              <span className="text-sm text-muted">{resume.kind}</span>
            </div>
            <p className="text-sm text-muted">
              {resume.isDefault ? "Default · " : ""}
              {Math.ceil(resume.size / 1024)} KB · text {resume.parseStatus}
              {resume.parseError ? ` · ${resume.parseError}` : ""}
            </p>
            {resume.content?.note ? <p className="mt-2 text-sm">{resume.content.note}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <a className="btn secondary" href={`/api/resumes/${resume.id}/download`}>
                Download
              </a>
              {!resume.isDefault ? (
                <button className="btn secondary" onClick={() => makeDefault.mutate(resume.id)}>
                  Make default
                </button>
              ) : null}
              <button
                className="btn danger"
                onClick={() => {
                  if (window.confirm("Delete this resume?")) remove.mutate(resume.id);
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {resumes.data && resumes.data.length === 0 ? <p className="text-muted">No resumes yet.</p> : null}
      </div>
    </div>
  );
}
