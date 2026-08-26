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

package com.app.oopsly.api.integration.support;

import com.github.fppt.jedismock.RedisServer;
import java.io.IOException;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/**
 * Starts a single in-process Redis (jedis-mock) for the JVM and exposes its port via system
 * property {@code EMBEDDED_REDIS_PORT}.
 */
public class EmbeddedRedisExtension implements BeforeAllCallback {

    private static final Object LOCK = new Object();
    private static RedisServer server;
    private static int port;

    @Override
    public void beforeAll(ExtensionContext context) throws Exception {
        ensureStarted();
    }

    public static int ensureStarted() throws IOException {
        synchronized (LOCK) {
            if (server == null) {
                server = RedisServer.newRedisServer().start();
                port = server.getBindPort();
                System.setProperty("EMBEDDED_REDIS_PORT", String.valueOf(port));
                Runtime.getRuntime()
                        .addShutdownHook(
                                new Thread(
                                        () -> {
                                            try {
                                                if (server != null) {
                                                    server.stop();
                                                }
                                            } catch (IOException ignored) {
                                                // best-effort shutdown
                                            }
                                        }));
            }
            return port;
        }
    }

    public static int port() {
        return port;
    }
}
