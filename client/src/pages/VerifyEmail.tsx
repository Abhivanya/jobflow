import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import { Alert } from "../components/ui";
import { AuthShell } from "./Login";

export function VerifyEmail() {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const verify = useMutation({
    mutationFn: async () => {
      await api.post("/auth/verify-email", { token: params.get("token") });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <AuthShell title="Verify email" lede="This marks the account as yours.">
      {verify.isSuccess ? (
        <p>
          Email verified. <Link to="/">Back to the dashboard</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {verify.isError ? <Alert>{errorMessage(verify.error)}</Alert> : null}
          <button className="btn" onClick={() => verify.mutate()} disabled={verify.isPending || !params.get("token")}>
            Verify
          </button>
        </div>
      )}
    </AuthShell>
  );
}
