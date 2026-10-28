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

package com.app.oopsly.api.unit.config;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.config.AppConfig;
import org.junit.jupiter.api.Test;

class AppConfigTest {

    @Test
    void givenAppconfig_withDefaults_thenNestedObjectsInitializedAndHaveDefaults() {
        AppConfig config = new AppConfig();

        assertNotNull(config.getJwt(), "jwt should be initialized by default");
        assertNotNull(config.getAuth(), "auth should be initialized by default");

        assertEquals("http://localhost:9010/.well-known/pub.json", config.getJwt().getJwksUrl());
        assertEquals("http://localhost:9010/api/auth", config.getAuth().getBaseUrl());
        assertEquals("", config.getAuth().getInternalKey());
    }

    @Test
    void givenAppconfig_withJwtSet_thenGettersReturnValues() {
        AppConfig config = new AppConfig();

        config.getJwt().setJwksUrl("http://auth/jwks");

        assertEquals("http://auth/jwks", config.getJwt().getJwksUrl());
    }

    @Test
    void givenAppconfig_withAuthSet_thenGettersReturnValues() {
        AppConfig config = new AppConfig();

        config.getAuth().setBaseUrl("http://auth:9010/api/auth");
        config.getAuth().setInternalKey("key");

        assertEquals("http://auth:9010/api/auth", config.getAuth().getBaseUrl());
        assertEquals("key", config.getAuth().getInternalKey());
    }

    @Test
    void givenAppconfig_withJwtSetToNull_thenJwtIsNull() {
        AppConfig config = new AppConfig();

        config.setJwt(null);

        assertNull(config.getJwt(), "jwt should be allowed to be set to null");
    }
}
