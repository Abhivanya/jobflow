import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { api, errorMessage } from "../api/client";
import { Alert, ChipInput, Field, PageHeader } from "../components/ui";
import type { Profile as ProfileData } from "../types";

const date = z.string().regex(/^$|^\d{4}(-\d{2}){0,2}$/, "Use 2024-05");
const link = z.string().refine((value) => value === "" || /^https?:\/\/\S+$/.test(value), "Use http:// or https://");

const schema = z.object({
  headline: z.string().max(120),
  phone: z.string().max(40),
  location: z.string().max(80),
  summary: z.string().max(2000),
  skills: z.array(z.string().min(1).max(40)).max(60),
  preferredRoles: z.array(z.string().min(1).max(60)).max(20),
  preferredLocations: z.array(z.string().min(1).max(60)).max(20),
  experienceLevel: z.enum(["intern", "junior", "mid", "senior", "lead"]).nullable(),
  links: z.object({ linkedin: link, github: link, portfolio: link, website: link }),
  education: z.array(z.object({ school: z.string(), degree: z.string(), field: z.string(), startDate: date, endDate: date })).max(20),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        location: z.string(),
        startDate: date,
        endDate: date,
        current: z.boolean(),
        description: z.string().max(2000),
      }),
    )
    .max(30),
  projects: z.array(z.object({ name: z.string(), url: link, technologies: z.array(z.string()), description: z.string() })).max(30),
  certifications: z.array(z.object({ name: z.string(), issuer: z.string(), date })).max(30),
});

type FormValues = z.infer<typeof schema>;

const blank: FormValues = {
  headline: "",
  phone: "",
  location: "",
  summary: "",
  skills: [],
  preferredRoles: [],
  preferredLocations: [],
  experienceLevel: null,
  links: { linkedin: "", github: "", portfolio: "", website: "" },
  education: [],
  experience: [],
  projects: [],
  certifications: [],
};

export function Profile() {
  const queryClient = useQueryClient();
  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const response = await api.get<{ data: { profile: ProfileData } }>("/profile");
      return response.data.data.profile;
    },
  });
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: blank });
  const education = useFieldArray({ control: form.control, name: "education" });
  const experience = useFieldArray({ control: form.control, name: "experience" });
  const projects = useFieldArray({ control: form.control, name: "projects" });
  const certifications = useFieldArray({ control: form.control, name: "certifications" });

  useEffect(() => {
    if (!profile.data) return;
    form.reset({
      ...blank,
      ...profile.data,
      experienceLevel: profile.data.experienceLevel,
      links: profile.data.links || blank.links,
    });
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: async (values: FormValues) => {
      await api.put("/profile", values);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });

  return (
    <div>
      <PageHeader title="Profile" lede="Tailored resumes only reorder what you put here. If it is not true, don't add it." />
      <form className="space-y-6" onSubmit={form.handleSubmit((values) => save.mutate(values))}>
        <section className="card grid gap-3 p-4 md:grid-cols-2">
          <Field label="Headline">
            <input className="field" {...form.register("headline")} />
          </Field>
          <Field label="Phone">
            <input className="field" {...form.register("phone")} />
          </Field>
          <Field label="Location">
            <input className="field" {...form.register("location")} />
          </Field>
          <Field label="Level">
            <select className="select" {...form.register("experienceLevel", { setValueAs: (value) => value || null })}>
              <option value="">Not set</option>
              <option value="intern">Intern</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead</option>
            </select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Summary">
              <textarea className="area" {...form.register("summary")} />
            </Field>
          </div>
        </section>

        <section className="card space-y-3 p-4">
          <Field label="Skills">
            <Controller control={form.control} name="skills" render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="Preferred roles">
            <Controller control={form.control} name="preferredRoles" render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} />} />
          </Field>
          <Field label="Preferred locations">
            <Controller
              control={form.control}
              name="preferredLocations"
              render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} />}
            />
          </Field>
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Experience</h2>
            <button
              type="button"
              className="btn secondary"
              onClick={() => experience.append({ company: "", title: "", location: "", startDate: "", endDate: "", current: false, description: "" })}
            >
              Add role
            </button>
          </div>
          {experience.fields.map((item, index) => (
            <div key={item.id} className="grid gap-2 border-t border-line pt-3 md:grid-cols-2">
              <input className="field" placeholder="Title" {...form.register(`experience.${index}.title`)} />
              <input className="field" placeholder="Company" {...form.register(`experience.${index}.company`)} />
              <input className="field" placeholder="Start 2022-01" {...form.register(`experience.${index}.startDate`)} />
              <input className="field" placeholder="End" {...form.register(`experience.${index}.endDate`)} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...form.register(`experience.${index}.current`)} /> Current
              </label>
              <textarea className="area md:col-span-2" placeholder="What you actually did" {...form.register(`experience.${index}.description`)} />
              <button type="button" className="text-left text-sm text-clay" onClick={() => experience.remove(index)}>
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Education</h2>
            <button type="button" className="btn secondary" onClick={() => education.append({ school: "", degree: "", field: "", startDate: "", endDate: "" })}>
              Add school
            </button>
          </div>
          {education.fields.map((item, index) => (
            <div key={item.id} className="grid gap-2 border-t border-line pt-3 md:grid-cols-2">
              <input className="field" placeholder="School" {...form.register(`education.${index}.school`)} />
              <input className="field" placeholder="Degree" {...form.register(`education.${index}.degree`)} />
              <input className="field" placeholder="Field" {...form.register(`education.${index}.field`)} />
              <button type="button" className="text-left text-sm text-clay" onClick={() => education.remove(index)}>
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Projects</h2>
            <button type="button" className="btn secondary" onClick={() => projects.append({ name: "", url: "", technologies: [], description: "" })}>
              Add project
            </button>
          </div>
          {projects.fields.map((item, index) => (
            <div key={item.id} className="grid gap-2 border-t border-line pt-3">
              <input className="field" placeholder="Name" {...form.register(`projects.${index}.name`)} />
              <input className="field" placeholder="https://" {...form.register(`projects.${index}.url`)} />
              <textarea className="area" placeholder="Description" {...form.register(`projects.${index}.description`)} />
              <Controller
                control={form.control}
                name={`projects.${index}.technologies`}
                render={({ field }) => <ChipInput value={field.value} onChange={field.onChange} placeholder="Technology, then Enter" />}
              />
              <button type="button" className="text-left text-sm text-clay" onClick={() => projects.remove(index)}>
                Remove
              </button>
            </div>
          ))}
        </section>

        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl">Certifications and links</h2>
            <button type="button" className="btn secondary" onClick={() => certifications.append({ name: "", issuer: "", date: "" })}>
              Add certification
            </button>
          </div>
          {certifications.fields.map((item, index) => (
            <div key={item.id} className="grid gap-2 border-t border-line pt-3 md:grid-cols-3">
              <input className="field" placeholder="Name" {...form.register(`certifications.${index}.name`)} />
              <input className="field" placeholder="Issuer" {...form.register(`certifications.${index}.issuer`)} />
              <input className="field" placeholder="2024-05" {...form.register(`certifications.${index}.date`)} />
            </div>
          ))}
          <div className="grid gap-2 md:grid-cols-2">
            <input className="field" placeholder="LinkedIn URL" {...form.register("links.linkedin")} />
            <input className="field" placeholder="GitHub URL" {...form.register("links.github")} />
            <input className="field" placeholder="Portfolio URL" {...form.register("links.portfolio")} />
            <input className="field" placeholder="Website URL" {...form.register("links.website")} />
          </div>
        </section>

        {save.isError ? <Alert>{errorMessage(save.error)}</Alert> : null}
        {save.isSuccess ? <p className="text-sm text-moss">Saved.</p> : null}
        <button className="btn" disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
