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
import com.app.osmosis.api.entity.User;
import com.app.osmosis.api.service.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import java.security.Key;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtServiceImpl implements JwtService {

    private final AppConfig appConfig;

    public JwtServiceImpl(AppConfig appConfig) {
        this.appConfig = appConfig;
    }

    @Override
    public String generateToken(User user) {
        return Jwts.builder()
                .subject(user.getEmail())
                .issuedAt(new Date())
                .expiration(
                        new Date(
                                System.currentTimeMillis()
                                        + appConfig.getJwt().getExpirationInMs()))
                .signWith(getSignInKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    @Override
    public String validateToken(String token) {
        try {
            // Parse the token. If parsing fails, an exception will be thrown.
            Jwts.parser()
                    .verifyWith((SecretKey) getSignInKey())
                    .build()
                    .parseSignedClaims(token);
            // If parsing is successful, return the subject (user identifier)
            return extractUserId(token);
        } catch (Exception e) {
            // Token is invalid or expired
            return "";
        }
    }

    @Override
    public String extractUserId(String token) {
        try {
            return Jwts.parser()
                    .verifyWith((SecretKey) getSignInKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
        } catch (Exception e) {
            return "";
        }
    }

    private Key getSignInKey() {
        byte[] key = appConfig.getJwt().getSecret().getBytes();
        if (key.length < 32) {
            throw new IllegalStateException(
                    "JWT secret key must be at least 32 bytes (256 bits) long for HS256.");
        }
        return Keys.hmacShaKeyFor(key);
    }
}
