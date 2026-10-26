FROM golang:1.23-alpine AS build
WORKDIR /src
COPY . .
# go.sum is resolved here until it is committed; then this becomes a plain download step.
RUN go mod tidy
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/auth ./cmd/auth

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/auth /auth
USER nonroot:nonroot
EXPOSE 9010
ENTRYPOINT ["/auth"]
