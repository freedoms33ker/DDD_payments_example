# domain-driven-design-pmts

A PostgreSQL 16 database plus a small Node.js API that connects to it and reports whether the database is healthy.

You can run it in either of two ways:

- **Option A – Docker Compose:** the quickest way to get going on your own machine.
- **Option B – Kubernetes (minikube):** runs the same setup on a local Kubernetes cluster.

Both options use the same database setup script and the same API code.

---

## Project layout

```
domain-driven-design-pmts/
├── api/                  Node.js service (Express + pg)
│   ├── src/server.ts     API entry point (TypeScript; `npm start` compiles it)
│   ├── package.json
│   └── Dockerfile
├── db/
│   ├── init/01-init.sql  Runs once, the first time the database starts
│   └── kustomization.yaml
├── k8s/                  Kubernetes manifests (applied with kubectl apply -k k8s)
│   ├── namespace.yaml    "pmts" namespace
│   ├── postgres.yaml     Postgres StatefulSet, Service, credentials Secret, 1Gi volume
│   ├── api.yaml          API Deployment and NodePort Service
│   └── kustomization.yaml
└── docker-compose.yml    Postgres + API for local development
```

---

## Prerequisites

Install these before you start:

| Tool | Needed for | Check it's installed |
|------|------------|----------------------|
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine with the Compose plugin) | Options A and B | `docker compose version` |
| [Node.js](https://nodejs.org/) 18 or later | Running the API outside a container (optional) | `node -v` |
| [minikube](https://minikube.sigs.k8s.io/docs/start/) | Option B | `minikube version` |
| [kubectl](https://kubernetes.io/docs/tasks/tools/) | Option B | `kubectl version --client` |

Make sure Docker is running before you continue.

Clone the repository and open the project folder:

```bash
git clone <repository-url> domain-driven-design-pmts
```

```bash
cd domain-driven-design-pmts
```

---

## Default connection settings

These are the same for both options:

| Setting  | Value       |
|----------|-------------|
| Host     | `localhost` (from your machine) or `postgres` (from inside Docker/Kubernetes) |
| Port     | `5432`      |
| Database | `pmts`      |
| User     | `pmts`      |
| Password | `pmts`      |

> ⚠️ These credentials are for local development only. Do not reuse them in any shared or production environment.

---

## Option A – Docker Compose

### 1. Start the database and API

```bash
docker compose up -d --build
```

This builds the API image, starts Postgres, waits for it to report healthy, and then starts the API. The first run takes a minute or two while images download.

### 2. Check that both containers are running

```bash
docker compose ps
```

You should see `postgres` with the status **Up (healthy)** and `api` with the status **Up**.

### 3. Check that the API can reach the database

```bash
curl http://localhost:3000/health/db
```

A healthy response looks like this:

```json
{
  "status": "ok",
  "latencyMs": 19,
  "version": "PostgreSQL 16.x ...",
  "database": "pmts",
  "server_time": "2026-10-03T03:38:51.137Z"
}
```

### 4. (Optional) Open a SQL shell

```bash
docker compose exec postgres psql -U pmts -d pmts
```

Run `SELECT * FROM schema_info;` and you should see the row `pmts database initialized`, which the setup script created. Type `\q` to exit.

You can also connect any database client (TablePlus, DBeaver, pgAdmin, `psql`) to `localhost:5432` using the settings above.

### 5. Stop everything

Stop the containers but keep the database data:

```bash
docker compose down
```

Stop the containers **and delete all database data**. Use this to start fresh, for example after changing `db/init/01-init.sql`:

```bash
docker compose down -v
```

### Customising credentials

Docker Compose reads `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` from your environment or from a `.env` file in the project root. `.env` is already listed in `.gitignore`. For example:

```
POSTGRES_USER=myuser
POSTGRES_PASSWORD=change-me
POSTGRES_DB=pmts
```

New credentials only take effect on an empty database, so run `docker compose down -v` first.

---

## Running the API on your machine (outside Docker)

This is useful while you're developing the API, because you don't need to rebuild an image after every change. Postgres still runs in Docker.

1. Start only the database:

   ```bash
   docker compose up -d postgres
   ```

2. Install the API's dependencies:

   ```bash
   cd api
   ```

   ```bash
   npm ci
   ```

3. Start the API. It connects to `localhost:5432` with the `pmts`/`pmts` credentials by default:

   ```bash
   npm start
   ```

4. In another terminal, check it:

   ```bash
   curl http://localhost:3000/health/db
   ```

If the Compose `api` container is also running, port 3000 is already taken. Either stop that container with `docker compose stop api`, or run the API on another port with `PORT=3001 npm start`.

The API reads these environment variables:

| Variable     | Default     |
|--------------|-------------|
| `PORT`       | `3000`      |
| `PGHOST`     | `localhost` |
| `PGPORT`     | `5432`      |
| `PGUSER`     | `pmts`      |
| `PGPASSWORD` | `pmts`      |
| `PGDATABASE` | `pmts`      |

---

## Option B – Kubernetes (minikube)

### 1. Start minikube

```bash
minikube start
```

Check that the cluster is ready. The node's status should be **Ready**:

```bash
kubectl get nodes
```

### 2. Build the API image inside minikube

minikube has its own image store, so build the image there. You don't need an image registry:

```bash
minikube image build -t pmts-api:local ./api
```

### 3. Deploy everything

```bash
kubectl apply -k k8s
```

This creates a `pmts` namespace with Postgres, its storage, a credentials Secret, the database setup script, and the API.

### 4. Wait until it's ready

```bash
kubectl -n pmts rollout status statefulset/postgres
```

```bash
kubectl -n pmts rollout status deployment/pmts-api
```

Then check the pods. Both should show **1/1 Running**:

```bash
kubectl -n pmts get pods
```

### 5. Call the API

Forward a local port to the API service and leave this command running:

```bash
kubectl -n pmts port-forward svc/pmts-api 3300:3000
```

In a second terminal:

```bash
curl http://localhost:3300/health/db
```

Alternatively, let minikube open the NodePort service for you:

```bash
minikube service pmts-api -n pmts --url
```

### 6. (Optional) Open a SQL shell

```bash
kubectl -n pmts exec -it postgres-0 -- psql -U pmts -d pmts
```

To connect a database client from your machine, forward the Postgres port first, then connect to `localhost:5433`:

```bash
kubectl -n pmts port-forward svc/postgres 5433:5432
```

### 7. Deploy API code changes

After editing the API, rebuild the image and restart the deployment:

```bash
minikube image build -t pmts-api:local ./api
```

```bash
kubectl -n pmts rollout restart deployment/pmts-api
```

### 8. Tear down

This removes the `pmts` namespace and **everything in it, including the database data**:

```bash
kubectl delete -k k8s
```

---

## API endpoints

| Endpoint         | What it tells you | Success | Failure |
|------------------|-------------------|---------|---------|
| `GET /health`    | The API process is running | `200 {"status":"ok"}` | No response |
| `GET /health/db` | The API can run a query against Postgres | `200` with the database version, name and response time | `503 {"status":"error","error":"..."}` |

In Kubernetes, `/health` is used as the liveness probe and `/health/db` as the readiness probe. If the database goes down, the API pod is taken out of service until the database is reachable again.

---

## Troubleshooting

**`port is already allocated` / `address already in use` on 5432 or 3000**
Something else on your machine is using that port, often a locally installed Postgres. Find it with `lsof -nP -iTCP:5432 -sTCP:LISTEN`, then stop it or change the left-hand port number in `docker-compose.yml` (for example `"5433:5432"`).

**`/health/db` returns 503 or `ECONNREFUSED`**
Postgres isn't ready or isn't reachable. Check `docker compose ps` (or `kubectl -n pmts get pods`) and the logs:

```bash
docker compose logs postgres
```

```bash
kubectl -n pmts logs postgres-0
```

**`password authentication failed`**
The database volume was created with different credentials. Postgres only applies credentials when it first creates its data, so wipe the volume and start again with `docker compose down -v` (or `kubectl delete -k k8s` for Kubernetes).

**Changes to `db/init/01-init.sql` aren't applied**
The setup script only runs against an empty database. Wipe the data as described above and start again.

**API pod shows `ErrImageNeverPull` in Kubernetes**
The image wasn't built inside minikube. Run `minikube image build -t pmts-api:local ./api`, then `kubectl -n pmts rollout restart deployment/pmts-api`.

**API pod is `Running` but `0/1` Ready**
Its readiness check (`/health/db`) is failing, which means it can't reach Postgres. Check the Postgres pod with `kubectl -n pmts get pods` and the API's logs with `kubectl -n pmts logs deploy/pmts-api`.
