import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { api, errorMessage } from "../api/client";
import { Alert, ChipInput, Field, Modal, PageHeader } from "../components/ui";
import { employmentLabel, employmentTypes, type EmploymentType, type Job, type Page } from "../types";

const schema = z.object({
  company: z.string().trim().min(1, "Company is required"),
  title: z.string().trim().min(1, "Title is required"),
  location: z.string().trim(),
  employmentType: z.enum(employmentTypes).nullable(),
  salaryMin: z.string(),
  salaryMax: z.string(),
  url: z.string(),
  description: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  saved: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const empty: FormValues = {
  company: "",
  title: "",
  location: "",
  employmentType: null,
  salaryMin: "",
  salaryMax: "",
  url: "",
  description: "",
  requiredSkills: [],
  preferredSkills: [],
  saved: true,
};

function numberOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function Jobs() {
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mine" | "find">("mine");
  const [search, setSearch] = useState("react");
  const [category, setCategory] = useState("software-dev");
  const [importUrl, setImportUrl] = useState("");

  const jobs = useQuery({
    queryKey: ["jobs", q, page, saved],
    queryFn: async () => {
      const response = await api.get<{ data: Page<Job> }>("/jobs", { params: { q, page, saved: saved || undefined, limit: 10 } });
      return response.data.data;
    },
  });

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty });
  const create = useMutation({
    mutationFn: async (values: FormValues) => {
      await api.post("/jobs", {
        ...values,
        salaryMin: numberOrNull(values.salaryMin),
        salaryMax: numberOrNull(values.salaryMax),
        employmentType: values.employmentType,
      });
    },
    onSuccess: () => {
      setOpen(false);
      form.reset(empty);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const discover = useQuery({
    queryKey: ["discover", search, category],
    enabled: tab === "find",
    queryFn: async () => {
      const response = await api.get<{ data: { jobs: Array<Job & { externalId: string }>; attribution: string } }>("/jobs/discover", {
        params: { search, category },
      });
      return response.data.data;
    },
  });

  const saveRemote = useMutation({
    mutationFn: async (job: Job & { externalId?: string }) => {
      await api.post("/jobs/discover", job);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["jobs"] }),
  });

  const pullUrl = useMutation({
    mutationFn: async () => {
      await api.post("/jobs/import-url", { url: importUrl });
    },
    onSuccess: () => {
      setImportUrl("");
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  return (
    <div>
      <PageHeader
        title="Jobs"
        lede="Search stays on the server. The list below is one page, not your whole history."
        action={
          <button className="btn" onClick={() => setOpen(true)}>
            Add a job
          </button>
        }
      />
      <div className="mb-4 flex gap-2">
        <button className={tab === "mine" ? "btn" : "btn secondary"} onClick={() => setTab("mine")}>
          My jobs
        </button>
        <button className={tab === "find" ? "btn" : "btn secondary"} onClick={() => setTab("find")}>
          Remotive
        </button>
      </div>

      {tab === "mine" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className="field max-w-xs"
              placeholder="Search title or company"
              value={q}
              onChange={(event) => {
                setPage(1);
                setQ(event.target.value);
              }}
            />
            <select
              className="select max-w-40"
              value={saved}
              onChange={(event) => {
                setPage(1);
                setSaved(event.target.value);
              }}
            >
              <option value="">All</option>
              <option value="true">Saved</option>
              <option value="false">Not saved</option>
            </select>
          </div>
          {jobs.isError ? <Alert>{errorMessage(jobs.error)}</Alert> : null}
          <div className="space-y-3">
            {jobs.data?.items.map((job) => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="card block p-4 hover:border-moss">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-2xl">{job.title}</h2>
                  <span className="text-sm text-muted">{job.source}</span>
                </div>
                <p className="text-muted">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                  {job.employmentType ? ` · ${employmentLabel[job.employmentType]}` : ""}
                </p>
                <p className="mt-2 text-sm">{job.description}</p>
              </Link>
            ))}
            {jobs.data && jobs.data.items.length === 0 ? <p className="text-muted">No jobs yet.</p> : null}
          </div>
          {jobs.data && jobs.data.pages > 1 ? (
            <div className="mt-4 flex items-center gap-3">
              <button className="btn secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {jobs.data.page} of {jobs.data.pages}
              </span>
              <button className="btn secondary" disabled={page >= jobs.data.pages} onClick={() => setPage((current) => current + 1)}>
                Next
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div>
          <p className="mb-3 text-sm text-muted">
            Listings come from Remotive and are about a day behind. Saving one keeps their link. Don't republish these on another job board.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            <input className="field max-w-xs" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
            <input className="field max-w-xs" value={category} onChange={(event) => setCategory(event.target.value)} placeholder="category slug, e.g. software-dev" />
          </div>
          {discover.isError ? <Alert>{errorMessage(discover.error)}</Alert> : null}
          {discover.data ? <p className="mb-3 text-sm text-muted">{discover.data.attribution}</p> : null}
          <div className="space-y-3">
            {discover.data?.jobs.map((job) => (
              <article key={job.externalId || job.url} className="card p-4">
                <h2 className="font-serif text-xl">{job.title}</h2>
                <p className="text-muted">{job.company}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <a href={job.url} target="_blank" rel="noreferrer">
                    View on Remotive
                  </a>
                  <button className="btn" onClick={() => saveRemote.mutate(job)} disabled={saveRemote.isPending}>
                    Save
                  </button>
                </div>
              </article>
            ))}
          </div>
          <form
            className="mt-6 flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              pullUrl.mutate();
            }}
          >
            <input className="field max-w-lg" placeholder="Or paste any public job URL" value={importUrl} onChange={(event) => setImportUrl(event.target.value)} />
            <button className="btn secondary" disabled={pullUrl.isPending}>
              Import URL
            </button>
          </form>
          {pullUrl.isError ? <Alert>{errorMessage(pullUrl.error)}</Alert> : null}
        </div>
      )}

      {open ? (
        <Modal title="Add a job" onClose={() => setOpen(false)}>
          <form className="space-y-3" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
            <Field label="Title" error={form.formState.errors.title?.message}>
              <input className="field" {...form.register("title")} />
            </Field>
            <Field label="Company" error={form.formState.errors.company?.message}>
              <input className="field" {...form.register("company")} />
            </Field>
            <Field label="Location">
              <input className="field" {...form.register("location")} />
            </Field>
            <Field label="Type">
              <select className="select" {...form.register("employmentType", { setValueAs: (value) => value || null })}>
                <option value="">Unknown</option>
                {employmentTypes.map((type) => (
                  <option key={type} value={type}>
                    {employmentLabel[type as EmploymentType]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Salary min">
                <input className="field" {...form.register("salaryMin")} />
              </Field>
              <Field label="Salary max">
                <input className="field" {...form.register("salaryMax")} />
              </Field>
            </div>
            <Field label="URL">
              <input className="field" {...form.register("url")} />
            </Field>
            <Field label="Description">
              <textarea className="area" {...form.register("description")} />
            </Field>
            <Field label="Required skills">
              <Controller
                control={form.control}
                name="requiredSkills"
                render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} />}
              />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register("saved")} /> Saved
            </label>
            {create.isError ? <Alert>{errorMessage(create.error)}</Alert> : null}
            <button className="btn" disabled={create.isPending}>
              Save job
            </button>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
