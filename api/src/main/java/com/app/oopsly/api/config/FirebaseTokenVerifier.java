/*
 * Copyright 2026 Hao Nguyen Tan
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */
package com.app.oopsly.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class FirebaseTokenVerifier {
    private final AppConfig appConfig;

    @PostConstruct
    void initialize() throws IOException {
        if (appConfig.getFeatures().isAuthWithFirebase() && FirebaseApp.getApps().isEmpty()) {
            FirebaseOptions options =
                    FirebaseOptions.builder()
                            .setCredentials(GoogleCredentials.getApplicationDefault())
                            .build();
            FirebaseApp.initializeApp(options);
        }
    }

    public FirebaseToken verify(String idToken) throws Exception {
        return FirebaseAuth.getInstance().verifyIdToken(idToken, true);
    }
}
