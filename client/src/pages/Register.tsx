import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { api, errorMessage } from "../api/client";
import { useMe } from "../api/session";
import { Alert, Field } from "../components/ui";
import { AuthShell } from "./Login";

const schema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  email: z.email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .regex(/[A-Za-z]/, "Include a letter")
    .regex(/[0-9]/, "Include a number"),
});

type FormValues = z.infer<typeof schema>;

export function Register() {
  const me = useMe();
  const queryClient = useQueryClient();
  const [devLink, setDevLink] = useState("");
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", password: "" } });
  const register = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await api.post<{ data: { devLink?: string } }>("/auth/register", values);
      return response.data.data.devLink;
    },
    onSuccess: (link) => {
      if (link) setDevLink(link);
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  if (me.data && !devLink) return <Navigate to="/" replace />;

  return (
    <AuthShell title="Create an account" lede="At least 8 characters, with a letter and a number.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => register.mutate(values))}>
        <Field label="Name" error={form.formState.errors.name?.message}>
          <input className="field" {...form.register("name")} />
        </Field>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input className="field" type="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input className="field" type="password" {...form.register("password")} />
        </Field>
        {register.isError ? <Alert>{errorMessage(register.error)}</Alert> : null}
        {devLink ? (
          <Alert>
            Mail is not configured, so the verify link is here: <a href={devLink}>{devLink}</a>
          </Alert>
        ) : null}
        <button className="btn w-full" disabled={register.isPending}>
          {register.isPending ? "Creating..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have one? <Link to="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
