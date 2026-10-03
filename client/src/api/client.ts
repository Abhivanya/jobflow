import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let refresh: Promise<void> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const url = String(config?.url || "");
    const skip =
      !config ||
      config._retry ||
      error.response?.status !== 401 ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/login") ||
      url.includes("/auth/register");
    if (skip) return Promise.reject(error);
    config._retry = true;
    refresh ??= api
      .post("/auth/refresh")
      .then(() => undefined)
      .finally(() => {
        refresh = null;
      });
    await refresh;
    return api(config);
  },
);

export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.error?.message;
    if (typeof message === "string") return message;
  }
  return "Something went wrong";
}
