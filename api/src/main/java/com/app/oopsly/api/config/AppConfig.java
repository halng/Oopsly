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

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppConfig {

    private String allowedOrigins;
    private String[] testEmails;

    public GsonFactory getJsonFactory() {
        return new GsonFactory();
    }

    public NetHttpTransport getHttpTransport() {
        return new NetHttpTransport();
    }

    private Jwt jwt = new Jwt();
    private Google google = new Google();
    private Features features = new Features();

    @Getter
    @Setter
    public static class Jwt {
        private String secret;
        private long expirationInMs;
        private long refreshExpirationInMs;
    }

    @Getter
    @Setter
    public static class Google {
        private String clientId;
    }

    @Getter
    @Setter
    public static class Features {
        private boolean authWithGoogle;
        private boolean authWithJwt;
    }

    public boolean isTestEmail(String email) {
        if (testEmails == null) {
            return false;
        }
        for (String testEmail : testEmails) {
            if (testEmail.equalsIgnoreCase(email)) {
                return true;
            }
        }
        return false;
    }
}
