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

package com.app.osmosis.api.config.secutity;

import com.app.osmosis.api.entity.UserEntity;
import com.app.osmosis.api.exception.UnauthenticatedException;
import com.app.osmosis.api.repository.CustomUserRepository;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Component;

@Component
public class UserSessionHelper {
  private static final Logger log = LoggerFactory.getLogger(UserSessionHelper.class);
  private final CustomUserRepository userRepository;

  public UserSessionHelper(CustomUserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public String getCurrentUser() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();

    if (auth == null || !auth.isAuthenticated()) {
      throw new UnauthenticatedException("User is not authenticated");
    }
    // Implementation to retrieve the current user's email from the security context

    Object principal = auth.getPrincipal();
    if (principal instanceof OAuth2User oAuth2User) {
      String email = oAuth2User.getAttribute("email");
      Optional<UserEntity> user = userRepository.findByEmail(email);

      if (user.isPresent()) {
        log.info("User found with email: {}", email);
        return user.get().getId();
      }

      log.error("User not found. Starting create new user flow for email: {}", email);
      String name = oAuth2User.getAttribute("name");
      String pictureUrl = oAuth2User.getAttribute("picture");

      UserEntity userEntity =
          UserEntity.builder().email(email).name(name).pictureUrl(pictureUrl).build();
      UserEntity createdUser = userRepository.save(userEntity);

      return createdUser.getId();
    } else {
      // Fallback to principal's name or other identifier
      return principal.toString();
    }
  }
}
