# Stage 1: build the Spring Boot jar.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY gradlew settings.gradle build.gradle ./
COPY gradle ./gradle
# Dependencies first so this layer is cached until build.gradle changes.
RUN chmod +x gradlew && ./gradlew --no-daemon dependencies > /dev/null 2>&1 || true
COPY src ./src
# -x jar skips the *-plain.jar, leaving a single boot jar to extract.
RUN ./gradlew --no-daemon bootJar -x jar -x test \
    && cp build/libs/*.jar app.jar \
    && java -Djarmode=tools -jar app.jar extract --layers --destination /layers

# Stage 2: JRE only, with the jar split into layers so a code change only
# rewrites the small application layer.
FROM eclipse-temurin:21-jre-alpine
LABEL org.opencontainers.image.description="Oopsly API service: decks, cards, test suites, quizzes and communities"
WORKDIR /app
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /layers/dependencies/ ./
COPY --from=build /layers/snapshot-dependencies/ ./
COPY --from=build /layers/application/ ./
USER app
EXPOSE 9009
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
