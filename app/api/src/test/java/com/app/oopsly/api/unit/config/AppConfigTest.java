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
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;

import com.app.oopsly.api.config.AppConfig;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AppConfigTest {

    @Test
    void givenAppconfig_withDefaults_thenNestedObjectsInitializedAndHaveDefaults() {
        AppConfig config = new AppConfig();

        assertNotNull(config.getJwt(), "jwt should be initialized by default");
        assertNotNull(config.getGoogle(), "google should be initialized by default");
        assertNotNull(config.getFeatures(), "features should be initialized by default");

        // defaults
        assertNull(config.getJwt().getSecret(), "default jwt.secret should be null");
        assertEquals(
                0L, config.getJwt().getExpirationInMs(), "default jwt.expirationInMs should be 0");
        assertNull(config.getGoogle().getClientId(), "default google.clientId should be null");
        assertFalse(
                config.getFeatures().isAuthWithGoogle(), "default authWithGoogle should be false");
        assertFalse(config.getFeatures().isAuthWithJwt(), "default authWithJwt should be false");
    }

    @Test
    void givenAppconfig_withJwtSet_thenGettersReturnValues() {
        AppConfig config = new AppConfig();
        AppConfig.Jwt jwt = config.getJwt();

        jwt.setSecret("super-secret");
        jwt.setExpirationInMs(3600000L);

        assertEquals("super-secret", config.getJwt().getSecret());
        assertEquals(3600000L, config.getJwt().getExpirationInMs());
    }

    @Test
    void givenAppconfig_withJwtEmptyAndNegativeExpiration_thenValuesStored() {
        AppConfig config = new AppConfig();
        AppConfig.Jwt jwt = config.getJwt();

        jwt.setSecret("");
        jwt.setExpirationInMs(-1L);

        assertEquals("", config.getJwt().getSecret());
        assertEquals(-1L, config.getJwt().getExpirationInMs());
    }

    @Test
    void givenAppconfig_withGoogleAndFeaturesSet_thenGettersReturnValues() {
        AppConfig config = new AppConfig();

        config.getGoogle().setClientId("client-123");
        config.getFeatures().setAuthWithGoogle(true);
        config.getFeatures().setAuthWithJwt(true);

        assertEquals("client-123", config.getGoogle().getClientId());
        assertTrue(config.getFeatures().isAuthWithGoogle());
        assertTrue(config.getFeatures().isAuthWithJwt());
    }

    @Test
    void givenAppconfig_withGetJsonFactoryCalledTwice_thenNewInstanceEachCall() {
        AppConfig config = new AppConfig();

        GsonFactory first = config.getJsonFactory();
        GsonFactory second = config.getJsonFactory();

        assertNotNull(first);
        assertNotNull(second);
        assertNotSame(first, second, "getJsonFactory should return a new instance on each call");
        assertEquals(GsonFactory.class, first.getClass());
    }

    @Test
    void givenAppconfig_withGetHttpTransportCalledTwice_thenNewInstanceEachCall() {
        AppConfig config = new AppConfig();

        NetHttpTransport first = config.getHttpTransport();
        NetHttpTransport second = config.getHttpTransport();

        assertNotNull(first);
        assertNotNull(second);
        assertNotSame(first, second, "getHttpTransport should return a new instance on each call");
        assertEquals(NetHttpTransport.class, first.getClass());
    }

    @Test
    void givenAppconfig_withJwtSetToNull_thenJwtIsNullAndOtherMethodsUnaffected() {
        AppConfig config = new AppConfig();

        config.setJwt(null);
        assertNull(config.getJwt(), "jwt should be allowed to be set to null");

        // Ensure other methods unaffected
        assertNotNull(config.getJsonFactory());
        assertNotNull(config.getHttpTransport());
    }

    @Test
    void givenSpiedAppconfig_withGetJsonFactoryAndGetHttpTransportCalled_thenInvocationsVerified() {
        AppConfig spyConfig = spy(new AppConfig());

        spyConfig.getJsonFactory();
        spyConfig.getHttpTransport();

        verify(spyConfig).getJsonFactory();
        verify(spyConfig).getHttpTransport();
    }

    @Test
    void isTestEmail_nullList_returnsFalse() {
        AppConfig config = new AppConfig();
        config.setTestEmails(null);
        assertFalse(config.isTestEmail("a@b.com"));
    }

    @Test
    void isTestEmail_matchesIgnoreCase() {
        AppConfig config = new AppConfig();
        config.setTestEmails(new String[] {"Test@Oopsly.com"});
        assertTrue(config.isTestEmail("test@oopsly.com"));
        assertFalse(config.isTestEmail("other@oopsly.com"));
    }
}
