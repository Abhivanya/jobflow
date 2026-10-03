import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert, PageHeader } from "../components/ui";
import type { Job, Resume } from "../types";
import { employmentLabel } from "../types";
import { useState } from "react";

export function JobDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resumeId, setResumeId] = useState("");

  const job = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const response = await api.get<{ data: { job: Job } }>(`/jobs/${id}`);
      return response.data.data.job;
    },
  });
  const resumes = useQuery({
    queryKey: ["resumes"],
    queryFn: async () => {
      const response = await api.get<{ data: { resumes: Resume[] } }>("/resumes");
      return response.data.data.resumes;
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["job", id] });
  const analyze = useMutation({
    mutationFn: async (method?: "rules") => {
      await api.post(`/jobs/${id}/analyze`, {}, { params: method ? { method } : {} });
    },
    onSuccess: refresh,
  });
  const match = useMutation({
    mutationFn: async () => {
      await api.post(`/jobs/${id}/match`, { resumeId: resumeId || undefined });
    },
    onSuccess: refresh,
  });
  const tailor = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { resume: Resume } }>(`/jobs/${id}/tailor`, { resumeId: resumeId || undefined });
      return response.data.data.resume;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["resumes"] }),
  });
  const track = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { application: { id: string } } }>("/applications", {
        jobId: id,
        resumeId: resumeId || undefined,
        status: "DISCOVERED",
      });
      return response.data.data.application.id;
    },
    onSuccess: (applicationId) => navigate(`/applications/${applicationId}`),
  });
  const remove = useMutation({
    mutationFn: async () => {
      await api.delete(`/jobs/${id}`);
    },
    onSuccess: () => navigate("/jobs"),
  });
  const toggleSaved = useMutation({
    mutationFn: async (saved: boolean) => {
      await api.patch(`/jobs/${id}`, { saved });
    },
    onSuccess: refresh,
  });

  if (job.isLoading) return <p className="text-muted">Loading job...</p>;
  if (job.isError || !job.data) return <Alert>{errorMessage(job.error)}</Alert>;
  const data = job.data;

  return (
    <div>
      <PageHeader
        title={data.title}
        lede={`${data.company}${data.location ? ` · ${data.location}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <button className="btn secondary" onClick={() => toggleSaved.mutate(!data.saved)}>
              {data.saved ? "Unsave" : "Save"}
            </button>
            <button className="btn" onClick={() => track.mutate()} disabled={track.isPending}>
              Track application
            </button>
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted">
        {data.employmentType ? <span>{employmentLabel[data.employmentType]}</span> : null}
        {data.salaryText ? <span>{data.salaryText}</span> : null}
        {data.salaryMin || data.salaryMax ? (
          <span>
            {data.salaryMin ?? "?"} – {data.salaryMax ?? "?"}
          </span>
        ) : null}
        {data.url ? (
          <a href={data.url} target="_blank" rel="noreferrer">
            Original posting
          </a>
        ) : null}
        <span>Source: {data.source}</span>
      </div>
      <article className="card whitespace-pre-wrap p-4 text-sm leading-6">{data.description || "No description yet."}</article>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="font-serif text-xl">Description parse</h2>
          <p className="mt-1 text-sm text-muted">This is not a score. It is a list pulled from the posting.</p>
          <div className="mt-3 flex gap-2">
            <button className="btn" onClick={() => analyze.mutate(undefined)} disabled={analyze.isPending}>
              Analyze
            </button>
            <button className="btn secondary" onClick={() => analyze.mutate("rules")} disabled={analyze.isPending}>
              Rules only
            </button>
          </div>
          {analyze.isError ? <Alert>{errorMessage(analyze.error)}</Alert> : null}
          {data.analysis ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>{data.analysis.note}</p>
              <p>Seniority: {data.analysis.seniority}</p>
              <p>Required: {data.analysis.requiredSkills.join(", ") || "none found"}</p>
              <p>Preferred: {data.analysis.preferredSkills.join(", ") || "none found"}</p>
              <p>Experience: {data.analysis.experienceRequirements.join(", ") || "not stated"}</p>
              <p>Education: {data.analysis.educationRequirements.join(", ") || "not stated"}</p>
            </div>
          ) : null}
        </div>
        <div className="card p-4">
          <h2 className="font-serif text-xl">Overlap</h2>
          <p className="mt-1 text-sm text-muted">Required skills count double. Preferred skills count once. No requirements means no number.</p>
          <select className="select mt-3" value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
            <option value="">Default resume</option>
            {resumes.data?.map((resume) => (
              <option key={resume.id} value={resume.id}>
                v{resume.version} · {resume.label}
              </option>
            ))}
          </select>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" onClick={() => match.mutate()} disabled={match.isPending}>
              Check overlap
            </button>
            <button className="btn secondary" onClick={() => tailor.mutate()} disabled={tailor.isPending}>
              Tailor from my profile
            </button>
          </div>
          {match.isError ? <Alert>{errorMessage(match.error)}</Alert> : null}
          {tailor.isError ? <Alert>{errorMessage(tailor.error)}</Alert> : null}
          {tailor.data ? <p className="mt-2 text-sm">Saved as version {tailor.data.version}. See it under Resumes.</p> : null}
          {data.lastMatch ? (
            <div className="mt-4 text-sm">
              <p className="font-serif text-3xl">{data.lastMatch.score === null ? "—" : data.lastMatch.score}</p>
              <p className="text-muted">out of 100, from skill overlap</p>
              <p className="mt-2">Matched: {data.lastMatch.matchedSkills.join(", ") || "none"}</p>
              <p>Missing: {data.lastMatch.missingSkills.join(", ") || "none"}</p>
              {data.lastMatch.experienceGap ? <p className="mt-2">{data.lastMatch.experienceGap}</p> : null}
              <ul className="mt-2 list-disc pl-5">
                {data.lastMatch.suggestions.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>
      <div className="mt-6">
        <button
          className="btn danger"
          onClick={() => {
            if (window.confirm("Remove this job from your list?")) remove.mutate();
          }}
        >
          Delete job
        </button>
        <Link className="ml-4 text-sm" to="/jobs">
          Back
        </Link>
      </div>
    </div>
  );
}
