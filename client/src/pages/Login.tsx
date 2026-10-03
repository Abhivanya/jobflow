import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { api, errorMessage } from "../api/client";
import { useMe } from "../api/session";
import { Alert, Field } from "../components/ui";

const schema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function Login() {
  const me = useMe();
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });
  const login = useMutation({
    mutationFn: async (values: FormValues) => {
      await api.post("/auth/login", values);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  if (me.data) return <Navigate to="/" replace />;

  return (
    <AuthShell title="Sign in" lede="Pick up the search where you left it.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => login.mutate(values))}>
        <Field label="Email" error={form.formState.errors.email?.message}>
          <input className="field" type="email" {...form.register("email")} />
        </Field>
        <Field label="Password" error={form.formState.errors.password?.message}>
          <input className="field" type="password" {...form.register("password")} />
        </Field>
        {login.isError ? <Alert>{errorMessage(login.error)}</Alert> : null}
        <button className="btn w-full" disabled={login.isPending}>
          {login.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        <Link to="/forgot-password">Forgot password</Link>
        <span> · </span>
        <Link to="/register">Create an account</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ title, lede, children }: { title: string; lede: string; children: ReactNode }) {
  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-10 px-6 py-12 md:grid-cols-2">
      <div>
        <p className="font-serif text-4xl">JobFlow</p>
        <p className="mt-4 max-w-sm text-lg text-muted">A place for the jobs, the resumes, and the follow-ups. I got tired of the spreadsheet.</p>
      </div>
      <div className="card p-6">
        <h1 className="font-serif text-3xl">{title}</h1>
        <p className="mb-5 mt-1 text-muted">{lede}</p>
        {children}
      </div>
    </div>
  );
}
