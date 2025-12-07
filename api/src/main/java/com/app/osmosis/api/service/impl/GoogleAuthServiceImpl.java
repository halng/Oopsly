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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.config.AppConfig;
import com.app.osmosis.api.service.GoogleAuthService;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import org.springframework.stereotype.Service;

@Service
public class GoogleAuthServiceImpl implements GoogleAuthService {

    private final AppConfig appConfig;

    public GoogleAuthServiceImpl(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Override
    public GoogleIdToken.Payload verify(String idToken) {
        try {
            GoogleIdTokenVerifier verifier =
                    new GoogleIdTokenVerifier.Builder(
                                    appConfig.getHttpTransport(), appConfig.getJsonFactory())
                            .setAudience(
                                    java.util.Collections.singletonList(
                                            appConfig.getGoogle().getClientId()))
                            .build();
            var token = verifier.verify(idToken);
            return token != null ? token.getPayload() : null;
        } catch (Exception ex) {
            throw new GoogleAuthException("Failed to verify Google ID token: " + ex.getMessage(), ex);
        }
    }

    /**
     * Custom exception for Google authentication errors
     */
    public static class GoogleAuthException extends RuntimeException {
        public GoogleAuthException(String message, Throwable cause) {
            super(message, cause);
        }
    }
}
