import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert, Field } from "../components/ui";
import { AuthShell } from "./Login";

export function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const reset = useMutation({
    mutationFn: async () => {
      await api.post("/auth/reset-password", { token: params.get("token"), password });
    },
    onSuccess: () => setDone(true),
  });

  return (
    <AuthShell title="Choose a new password" lede="This also signs out your other sessions.">
      {done ? (
        <p>
          Password updated. <Link to="/login">Sign in</Link>
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            reset.mutate();
          }}
        >
          <Field label="New password">
            <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </Field>
          {reset.isError ? <Alert>{errorMessage(reset.error)}</Alert> : null}
          <button className="btn w-full" disabled={reset.isPending}>
            Update password
          </button>
        </form>
      )}
    </AuthShell>
  );
}
