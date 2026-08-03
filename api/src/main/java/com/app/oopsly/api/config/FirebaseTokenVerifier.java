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
package com.app.oopsly.api.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import org.springframework.stereotype.Component;

@Component
public class FirebaseTokenVerifier {
    @PostConstruct
    void initialize() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
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
