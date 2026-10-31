# Deployment

AWS CloudFormation templates deployed with the SAM CLI. Each service runs as 2 Fargate
tasks behind its own internal ALB; one shared HTTP API (API Gateway) is the only public
entry point.

```
Internet -> HTTP API --VPC link--> internal ALB (per service) -> 2 Fargate tasks
                                                                    |
                                          shared Postgres + Redis <-+
```

| File | What it creates |
|---|---|
| `network.yaml` | VPC and subnets, ECS cluster, Postgres, Redis, ECR repositories, generated secrets, the HTTP API, its stage and the VPC link |
| `auth.yaml` | auth service: ECS service (2 tasks), internal ALB, API routes |
| `api.yaml` | Java API: same shape; reads the auth stack's internal URLs |
| `game.yaml` | game service: same shape |
| `noti.yaml` | noti Lambda (sends emails from the SQS queue that `network.yaml` creates) and its SMTP secret |
| `deploy.sh` | runs `sam deploy` for the stacks in order and copies images to ECR |
| `scripts/copy-images.sh` | copies `ghcr.io/halng/oopsly-*:<tag>` into ECR |

## Public routes

| Route on the HTTP API | Service |
|---|---|
| `/api/auth/v1/*`, `/.well-known/*` | auth |
| `/api/oopsly/*` | api |
| `/v1/game/*` | game |

`/api/auth/internal/*` is deliberately **not** routed. The api service calls it over
the auth ALB inside the VPC, with the shared internal key.

## Deploy

Prerequisites: AWS credentials, the [SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html),
Docker and the AWS CLI. Run the "Build and Push Docker Image" workflow first; its tag
(for example `v1a2b3c4`) is the `<image-tag>` below.

```bash
cd deployment
ALLOWED_ORIGINS=https://app.example.com ./deploy.sh stg v1a2b3c4          # everything
ALLOWED_ORIGINS=https://app.example.com ./deploy.sh stg v1a2b3c4 api       # one service
```

Order matters: `network` -> `auth` -> `api` / `game` (they import the auth stack's URLs).
`DESIRED_COUNT` (default 2) changes the number of tasks per service. At the end the
script prints the public endpoint; set the web app's `NEXT_PUBLIC_*` URLs to it:

```
NEXT_PUBLIC_API_URL=<endpoint>/api/oopsly
NEXT_PUBLIC_AUTH_URL=<endpoint>/api/auth
NEXT_PUBLIC_GAME_API_URL=<endpoint>
```

## Release pipeline

Run the **Release** workflow (`.github/workflows/release.yaml`) by hand with:

- `tag`: the tag the Docker images were built with, for example `v1a2b3c4` (run
  "Build and Push Docker Image" first; it pushes the images and the tag),
- `service`: `auth`, `api`, `game`, `noti` (the email Lambda, see `app/noti`) or `all`,
- `environment`: `stg` or `prod`.

It then (1) checks that the tag exists and the service image is in GHCR, (2) waits for the
`<env>_approval` environment and deploys through `deploy-aws.yaml`, and (3) creates the
GitHub release `<tag>-<service>` (for example `v1a2b3c4-api`): a release for `prod`, a
pre-release for `stg`. The web app has its own **Deploy Frontend** workflow
(`release-web.yaml`, Vercel) with the same release logic and the suffix `-web`.

`deploy-aws.yaml` always applies the shared `network` stack first (VPC, subnets, Postgres,
Redis, API Gateway, ECR; a no-op once it exists), then the selected service. `api`
and `game` need the `auth` stack to exist in that environment, so deploy `auth` first on a
new environment; `deploy.sh` stops with a clear message otherwise.

## Clean up

Run the **Clean up AWS** workflow (`cleanup-aws.yaml`), or `./cleanup.sh <env> [stacks]`,
to delete stacks and stop paying for them. Stacks go in reverse order (game, api, auth,
network); `all` removes everything. The final Postgres snapshot is kept (remove it by hand if the
data is not needed). The avatar bucket `oopsly-avatar-<env>` is deleted for every
environment except `prod`, because its fixed name would block the next deploy.

Per GitHub Environment (`stg`, `prod`):

| Kind | Name | Value |
|---|---|---|
| secret | `AWS_ACCESS_KEY_ID` | Access key ID of an IAM user (needs CloudFormation, ECS, ECR, EC2, ELB, RDS, ElastiCache, API Gateway, IAM, Secrets Manager, Logs and S3 for the SAM bucket) |
| secret | `AWS_SECRET_ACCESS_KEY` | Secret access key of the same IAM user |
| variable | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_FROM` | mail server the noti Lambda sends through (`SMTP_FROM` like `Oopsly <no-reply@example.com>`) |
| secret | `SMTP_PASSWORD` | password of the SMTP user |
| variable | `APP_URL` | web app address used for links in emails (optional) |
| variable | `ALLOWED_ORIGINS` | comma-separated browser origins for CORS |

Add required reviewers on the `prod` environment to gate production deployments.

Validate the templates without AWS access: `uvx cfn-lint *.yaml` (or `sam validate --lint -t <file>`).

## Things to know

- **WebSockets are not exposed.** An HTTP API cannot proxy WebSockets, and the ALBs are
  internal, so the quiz socket (api) and the garden socket (game) are unreachable from
  browsers. Adding an API Gateway WebSocket API, or a public ALB listener for those
  paths, is the next step if they must work in AWS.
- **Secrets are generated** in `network.yaml` (DB password, `INTERNAL_API_KEY` /
  `AUTH_INTERNAL_KEY`, `JWT_KEY_PASSPHRASE`) and injected by ECS, so auth and api always
  share one internal key. Nothing sensitive is in the templates or parameters.
- **No NAT gateway.** Tasks, Postgres and Redis sit in public subnets (tasks with a public
  IP, to pull from ECR); security groups only admit the VPC link, the ALBs and the tasks.
  Move to private subnets plus a NAT or VPC endpoints if policy requires it.
- **CORS** is handled by the services (`AllowedOrigins` / `CorsOrigins`), not by API Gateway.
  `prod` allows only `ALLOWED_ORIGINS` (trailing slashes are stripped; the origin must have
  none); every other environment allows `*`.
- **One Postgres instance** (`oopsly` database) is shared; auth uses its own schema, and
  the auth and game containers run their Alembic migrations on start. The database is
  snapshotted on stack deletion.
