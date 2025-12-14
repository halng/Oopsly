# ==========================================
# STAGE 1: Build the Native Image
# ==========================================
FROM ghcr.io/graalvm/native-image-community:21 AS builder

WORKDIR /build

# 1. Install missing build dependencies (xargs)
# The base image is minimal and lacks 'xargs', which gradlew needs.
RUN microdnf install -y findutils

# 2. Copy Gradle Wrapper & Config files
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle

# Fix permissions for the wrapper
RUN chmod +x gradlew

# 3. Copy Source Code
COPY src ./src
COPY .env .env

# 4. Build the Native Image
RUN ./gradlew nativeCompile --no-daemon

FROM gcr.io/distroless/base-debian12
WORKDIR /app
COPY --from=builder /build/build/native/nativeCompile/osmosis-backend .

EXPOSE 9009

ENTRYPOINT ["./osmosis-backend"]