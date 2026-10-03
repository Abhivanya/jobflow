import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { User } from "../types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const response = await api.get<{ data: { user: User } }>("/auth/me");
      return response.data.data.user;
    },
    retry: false,
    staleTime: 60_000,
  });
}
