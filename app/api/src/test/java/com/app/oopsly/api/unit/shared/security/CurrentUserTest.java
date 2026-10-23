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

package com.app.oopsly.api.unit.shared.security;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.security.CurrentUser;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class CurrentUserTest {

    private final CurrentUser currentUser = new CurrentUser();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void id_returnsThePrincipalAsUuid() {
        UUID id = UUID.randomUUID();
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken(id.toString(), null));

        assertEquals(id, currentUser.id());
    }

    @Test
    void id_withoutAuthentication_throwsUnauthenticated() {
        assertThrows(UnauthenticatedException.class, currentUser::id);
    }

    @Test
    void id_withNonUuidPrincipal_throwsUnauthenticated() {
        SecurityContextHolder.getContext()
                .setAuthentication(new UsernamePasswordAuthenticationToken("not-a-uuid", null));

        assertThrows(UnauthenticatedException.class, currentUser::id);
    }
}
