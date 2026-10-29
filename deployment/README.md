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
- `environment`: `stg` or `prod`,
- which services to deploy: auth, api, game and optionally the web frontend.

It then (1) checks that the tag exists and that every selected image is in GHCR, (2) creates
the GitHub release for the tag (a pre-release for `stg`, reused if it already exists),
(3) deploys through `deploy-aws.yaml`, and (4) for `prod` marks the release as latest.

`deploy-aws.yaml` always applies the shared `network` stack first (VPC, subnets, Postgres,
Redis, API Gateway, ECR; a no-op once it exists), then only the selected services. `api`
and `game` need the `auth` stack to exist in that environment, so deploy `auth` first on a
new environment; `deploy.sh` stops with a clear message otherwise.

Per GitHub Environment (`stg`, `prod`):

| Kind | Name | Value |
|---|---|---|
| secret | `AWS_ROLE_ARN` | IAM role the workflow assumes through OIDC (needs CloudFormation, ECS, ECR, EC2, ELB, RDS, ElastiCache, API Gateway, IAM, Secrets Manager, Logs and S3 for the SAM bucket) |
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
- **One Postgres instance** (`oopsly` database) is shared; auth uses its own schema, and
  the auth and game containers run their Alembic migrations on start. The database is
  snapshotted on stack deletion.
