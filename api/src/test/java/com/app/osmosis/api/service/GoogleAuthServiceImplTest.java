/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.mockito.Mockito.verify;

import com.app.osmosis.api.config.AppConfig;
import com.app.osmosis.api.exception.AuthProviderException;
import com.app.osmosis.api.service.impl.GoogleAuthServiceImpl;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedConstruction;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GoogleAuthServiceImplTest {

    @Test
    void verify_returnsPayload_whenVerifierReturnsToken() throws Exception {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Google google = mock(AppConfig.Google.class);
        when(appConfig.getGoogle()).thenReturn(google);
        when(google.getClientId()).thenReturn("client-123");

        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mocked =
                mockConstruction(GoogleIdTokenVerifier.Builder.class)) {

            // obtain the constructed builder mock and prepare verifier mock
            GoogleIdTokenVerifier.Builder builderMock = mocked.constructed().get(0);
            when(builderMock.setAudience(any())).thenReturn(builderMock);

            GoogleIdTokenVerifier verifierMock = mock(GoogleIdTokenVerifier.class);
            when(builderMock.build()).thenReturn(verifierMock);

            GoogleIdToken tokenMock = mock(GoogleIdToken.class);
            GoogleIdToken.Payload payloadMock = mock(GoogleIdToken.Payload.class);
            when(verifierMock.verify("good-token")).thenReturn(tokenMock);
            when(tokenMock.getPayload()).thenReturn(payloadMock);

            GoogleAuthServiceImpl svc = new GoogleAuthServiceImpl(appConfig);
            GoogleIdToken.Payload payload = svc.verify("good-token");

            assertSame(payloadMock, payload);

            // verify audience was set using configured client id
            ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
            verify(builderMock).setAudience(captor.capture());
            assertEquals(List.of("client-123"), captor.getValue());
        }
    }

    @Test
    void verify_returnsNull_whenVerifierReturnsNull() throws Exception {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Google google = mock(AppConfig.Google.class);
        when(appConfig.getGoogle()).thenReturn(google);
        when(google.getClientId()).thenReturn("cid");

        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mocked =
                mockConstruction(GoogleIdTokenVerifier.Builder.class)) {

            GoogleIdTokenVerifier.Builder builderMock = mocked.constructed().get(0);
            when(builderMock.setAudience(any())).thenReturn(builderMock);

            GoogleIdTokenVerifier verifierMock = mock(GoogleIdTokenVerifier.class);
            when(builderMock.build()).thenReturn(verifierMock);

            when(verifierMock.verify("unknown")).thenReturn(null);

            GoogleAuthServiceImpl svc = new GoogleAuthServiceImpl(appConfig);
            GoogleIdToken.Payload payload = svc.verify("unknown");

            assertNull(payload);

            verify(builderMock).setAudience(any());
            verify(verifierMock).verify("unknown");
        }
    }

    @Test
    void verify_throwsAuthProviderException_whenVerifierThrows()
            throws GeneralSecurityException, IOException {
        AppConfig appConfig = mock(AppConfig.class);
        AppConfig.Google google = mock(AppConfig.Google.class);
        when(appConfig.getGoogle()).thenReturn(google);
        when(google.getClientId()).thenReturn("cid-ex");

        try (MockedConstruction<GoogleIdTokenVerifier.Builder> mocked =
                mockConstruction(GoogleIdTokenVerifier.Builder.class)) {

            GoogleIdTokenVerifier.Builder builderMock = mocked.constructed().get(0);
            when(builderMock.setAudience(any())).thenReturn(builderMock);

            GoogleIdTokenVerifier verifierMock = mock(GoogleIdTokenVerifier.class);
            when(builderMock.build()).thenReturn(verifierMock);

            when(verifierMock.verify("bad")).thenThrow(new RuntimeException("boom"));

            GoogleAuthServiceImpl svc = new GoogleAuthServiceImpl(appConfig);

            AuthProviderException ex =
                    assertThrows(AuthProviderException.class, () -> svc.verify("bad"));
            assertTrue(ex.getMessage().contains("Failed to verify Google ID token"));
            assertNotNull(ex.getCause());
            assertEquals("boom", ex.getCause().getMessage());

            verify(builderMock).setAudience(any());
            verify(verifierMock).verify("bad");
        }
    }
}
