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

import com.app.osmosis.api.entity.User;

public interface JwtService {
    /**
     * Generates a JWT token for the specified user.
     *
     * @param user the user for whom the token is to be generated
     * @return a JWT token as a String
     */
    String generateToken(User user);

    /**
     * Validates the provided JWT token.
     *
     * @param token the JWT token to validate
     * @return the user ID extracted from the token if valid, or empty string if invalid
     */
    String validateToken(String token);

    /**
     * Extracts the user ID from the provided JWT token.
     *
     * @param token the JWT token from which to extract the user ID
     * @return the user ID as a String, or empty string if extraction fails or token is invalid
     */
    String extractUserId(String token);
}
