# JobFlow

A job-search tracker. Save a posting, compare it with your profile, tailor a resume from facts you already entered, and keep the follow-ups in one place.

The overlap number is skill overlap. Required skills count double, preferred skills count once. It is not a model score.

## Stack

React 19, Vite, React Router, TanStack Query, Tailwind, React Hook Form, Zod on the client.

Express 5, MongoDB, Mongoose, JWT in HTTP-only cookies, Zod, Pino on the server. Redis is optional and used as a cache and a lock around the reminder scan. Mail and OpenAI are optional too. Without them, verify and reset links show up in the server log, and job descriptions are parsed with a local keyword list.

## Run it locally

MongoDB has to be running. Redis is optional.

```bash
cp .env.example .env
# set JWT_ACCESS_SECRET to a long random string

npm install --prefix server
npm install --prefix client

npm run dev:server
npm run dev:client
```

The API listens on port 4000. The Vite app is on http://localhost:5173 and proxies `/api` there. If 4000 is taken, set `PORT` in `.env` and start the client with `API_PROXY=http://127.0.0.1:<port> npm run dev:client`.

Register, then use the verification link in the server log if SMTP is not set.

## Docker

```bash
cp .env.example .env
docker compose up --build
```

The UI is on http://localhost:8080. Compose points the API at the `mongo` and `redis` services.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

GitHub Actions runs lint, types, tests, and the production build for the server and the client.

## Layout

```
server/src
  routes        HTTP only, maps to a controller
  controllers   read the request, call a service, send JSON
  services      the actual rules
  models        Mongoose schemas
  jobs          the one-minute follow-up scan
client/src
  pages         one screen each
  api           axios client, cookie refresh
```

## API

All JSON, under `/api`. Errors look like `{ success: false, error: { code, message, details } }`.

| Area | Routes |
| --- | --- |
| Auth | `POST /auth/register`, `/login`, `/refresh`, `/logout`, `/verify-email`, `/forgot-password`, `/reset-password` |
| Profile | `GET /profile`, `PUT /profile` |
| Resumes | `GET/POST /resumes`, download, default, delete |
| Jobs | list, create, import URL, Remotive discover, `POST /jobs/:id/analyze`, `POST /jobs/:id/match` |
| Applications | list, create, update status |
| Follow-ups | list, create, mark sent or done |
| Other | `/notifications`, `/dashboard`, `/health` |

List endpoints take `page`, `limit`, and the filters shown in the validators. Filtering happens in Mongo, not in the browser.
