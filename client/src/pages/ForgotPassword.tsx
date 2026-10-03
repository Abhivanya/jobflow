import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert, Field } from "../components/ui";
import { AuthShell } from "./Login";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState("");
  const [message, setMessage] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      const response = await api.post<{ data: { message: string; devLink?: string } }>("/auth/forgot-password", { email });
      return response.data.data;
    },
    onSuccess: (data) => {
      setMessage(data.message);
      setDevLink(data.devLink || "");
    },
  });

  return (
    <AuthShell title="Reset password" lede="If the email is registered, we'll send a link. In local dev the link shows up here too.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          send.mutate();
        }}
      >
        <Field label="Email">
          <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        {send.isError ? <Alert>{errorMessage(send.error)}</Alert> : null}
        {message ? <Alert>{message}</Alert> : null}
        {devLink ? (
          <p className="text-sm">
            <Link to={devLink.replace(/^https?:\/\/[^/]+/, "")}>Open the reset page</Link>
          </p>
        ) : null}
        <button className="btn w-full" disabled={send.isPending}>
          Send link
        </button>
      </form>
    </AuthShell>
  );
}
