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

package com.app.oopsly.api.unit.community.domain;

import static org.junit.jupiter.api.Assertions.*;

import com.app.oopsly.api.community.domain.*;
import java.lang.reflect.Constructor;
import java.lang.reflect.Modifier;
import org.junit.jupiter.api.Test;

class CommunityDomainTest {

    @Test
    void communityConstants_areStable() throws Exception {
        assertEquals("JOINED", CommunityConstants.JOIN_STATUS_JOINED);
        assertEquals("REQUEST_SENT", CommunityConstants.JOIN_STATUS_REQUEST_SENT);
        assertEquals("Users", CommunityConstants.DEFAULT_ICON);
        assertEquals("#8BC34A", CommunityConstants.DEFAULT_COLOR);
        assertFalse(CommunityConstants.DEFAULT_JOIN_MESSAGE.isBlank());

        Constructor<CommunityConstants> constructor =
                CommunityConstants.class.getDeclaredConstructor();
        assertTrue(Modifier.isPrivate(constructor.getModifiers()));
        constructor.setAccessible(true);
        assertNotNull(constructor.newInstance());
    }

    @Test
    void enums_exposeExpectedValues() {
        assertEquals(5, CommunityRole.values().length);
        assertEquals(CommunityRole.OWNER, CommunityRole.valueOf("OWNER"));
        assertEquals(3, JoinRequestStatus.values().length);
        assertEquals(JoinRequestStatus.PENDING, JoinRequestStatus.valueOf("PENDING"));
    }

    @Test
    void communityEntity_hasSafeDefaults() {
        CommunityEntity entity = CommunityEntity.builder().name("Club").build();

        assertFalse(entity.getIsPrivate());
        assertTrue(entity.getTags().isEmpty());
        assertTrue(entity.getMembers().isEmpty());
    }

    @Test
    void memberEntity_defaultsToMemberRole() {
        CommunityMemberEntity entity = CommunityMemberEntity.builder().build();

        assertEquals(CommunityRole.MEMBER, entity.getRole());
        assertEquals(0, entity.getCardsStudiedThisWeek());
        assertNotNull(entity.getJoinedAt());
    }

    @Test
    void joinRequestEntity_defaultsToPending() {
        CommunityJoinRequestEntity entity = CommunityJoinRequestEntity.builder().build();

        assertEquals(JoinRequestStatus.PENDING, entity.getStatus());
        assertNotNull(entity.getRequestedAt());
    }
}
