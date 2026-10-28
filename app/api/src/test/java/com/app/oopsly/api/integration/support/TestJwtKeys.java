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

import com.app.oopsly.api.shared.security.JwksKeyProvider;
import io.jsonwebtoken.JwtException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/** Stands in for the auth service: one RSA key to sign with and a provider that serves it. */
@TestConfiguration
public class TestJwtKeys {
    public static final String KID = "test-key";
    public static final KeyPair KEY_PAIR = generate();

    private static KeyPair generate() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @Bean
    @Primary
    JwksKeyProvider testJwksKeyProvider() {
        return kid -> {
            if (!KID.equals(kid)) {
                throw new JwtException("Unknown signing key id");
            }
            return (RSAPublicKey) KEY_PAIR.getPublic();
        };
    }
}
