/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package com.app.oopsly.api.perf;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.BindMode;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.output.Slf4jLogConsumer;
import org.testcontainers.containers.startupcheck.OneShotStartupCheckStrategy;
import org.testcontainers.images.builder.ImageFromDockerfile;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Regression performance test.
 *
 * <p>Boots the real application on a random port against Postgres and Redis running in
 * Testcontainers (Flyway migrations included), then runs the Locust suite from {@code app/perf} in
 * a container with the {@code regression} profile. Locust exits non-zero when an endpoint is slower
 * than {@code thresholds.json} allows, fails, or was never exercised, which fails this test. The
 * per-endpoint report is copied to {@code build/reports/perf/summary.md}.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("perf")
class ApiPerfRegressionTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:15.4").withDatabaseName("oopsly");

    @Container
    static final GenericContainer<?> REDIS =
            new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @DynamicPropertySource
    static void infrastructure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.data.redis.host", REDIS::getHost);
        registry.add("spring.data.redis.port", () -> REDIS.getMappedPort(6379));
    }

    @LocalServerPort private int port;

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${server.servlet.context-path}")
    private String contextPath;

    @Test
    void everyEndpointStaysWithinTheRegressionThresholds() throws Exception {
        Path perfDir = Path.of(System.getProperty("perf.dir"));
        Path reportDir = Path.of(System.getProperty("perf.report.dir"));
        Path resultsDir = reportDir.resolve("locust");
        Files.createDirectories(resultsDir);

        org.testcontainers.Testcontainers.exposeHostPorts(port);
        ImageFromDockerfile image =
                new ImageFromDockerfile("oopsly-perf-locust", false)
                        .withFileFromPath("Dockerfile", perfDir.resolve("Dockerfile"))
                        .withFileFromPath("requirements.txt", perfDir.resolve("requirements.txt"))
                        .withFileFromPath("locustfile.py", perfDir.resolve("locustfile.py"))
                        .withFileFromPath("oopsly_perf", perfDir.resolve("oopsly_perf"));

        try (GenericContainer<?> locust =
                new GenericContainer<>(image)
                        .withEnv("PERF_PROFILE", "regression")
                        .withEnv("PERF_JWT_SECRET", jwtSecret)
                        .withEnv("PERF_RUN_ID", "ci")
                        .withFileSystemBind(
                                resultsDir.toAbsolutePath().toString(),
                                "/results",
                                BindMode.READ_WRITE)
                        .withCommand(
                                "--host",
                                "http://host.testcontainers.internal:" + port + contextPath,
                                "-u",
                                System.getProperty("perf.users", "10"),
                                "-r",
                                "5",
                                "-t",
                                System.getProperty("perf.duration", "45s"),
                                "--csv",
                                "/results/locust")
                        .withLogConsumer(new Slf4jLogConsumer(LoggerFactory.getLogger("locust")))
                        .withStartupCheckStrategy(
                                new OneShotStartupCheckStrategy()
                                        .withTimeout(Duration.ofMinutes(10)))) {
            locust.start();
            long exitCode = locust.getCurrentContainerInfo().getState().getExitCodeLong();

            Path summary = resultsDir.resolve("summary.md");
            String report = Files.exists(summary) ? Files.readString(summary) : "(no summary)";
            Files.writeString(reportDir.resolve("summary.md"), report);
            assertEquals(0L, exitCode, "Perf regression thresholds were violated:\n" + report);
        }
    }
}
