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

package com.app.oopsly.api.integration;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.app.oopsly.api.integration.support.AbstractControllerTest;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

@DisplayName("CommunityController integration")
class CommunityControllerTest extends AbstractControllerTest {

    private AuthSession owner;
    private AuthSession member;
    private AuthSession guest;

    @BeforeEach
    void setUp() {
        owner = authenticate(EMAIL);
        member = authenticate(EMAIL_2);
        guest = authenticate("integration3@oopsly.com");
    }

    private UUID createCommunity(String name, boolean isPrivate) throws Exception {
        return uuidFromDataId(
                mockMvc.perform(
                                post("/communities")
                                        .with(bearer(owner))
                                        .contentType(MediaType.APPLICATION_JSON)
                                        .content(
                                                """
                                                {"name":"%s","description":"d","isPrivate":%s,
                                                 "tags":["study"]}
                                                """
                                                        .formatted(name, isPrivate)))
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.isSuccess").value(true))
                        .andExpect(jsonPath("$.data.name").value(name))
                        .andReturn());
    }

    @Test
    void create_rejectsBlankNames() throws Exception {
        mockMvc.perform(
                        post("/communities")
                                .with(bearer(owner))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"name\":\" \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listsAndMyCommunities_includeTheNewCommunityForItsOwner() throws Exception {
        createCommunity("Biology Club", false);

        mockMvc.perform(get("/communities").with(bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItem("Biology Club")));
        mockMvc.perform(get("/communities/my").with(bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].name", hasItem("Biology Club")));
        mockMvc.perform(get("/communities/my").with(bearer(member)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void joinPublicCommunity_thenLeave() throws Exception {
        UUID id = createCommunity("Open Club", false);

        mockMvc.perform(
                        post("/communities/{id}/join", id)
                                .with(bearer(member))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/communities/my").with(bearer(member)))
                .andExpect(jsonPath("$.data[*].name", hasItem("Open Club")));
        mockMvc.perform(
                        post("/communities/{id}/join", id)
                                .with(bearer(member))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/communities/{id}/leave", id).with(bearer(member)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/communities/my").with(bearer(member)))
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    @Test
    void privateCommunity_joinRequestIsApprovedOrRejectedByTheOwner() throws Exception {
        UUID id = createCommunity("Secret Club", true);
        for (AuthSession requester : new AuthSession[] {member, guest}) {
            mockMvc.perform(
                            post("/communities/{id}/join", id)
                                    .with(bearer(requester))
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content("{\"message\":\"please\"}"))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(
                        post("/communities/{id}/join", id)
                                .with(bearer(member))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest());

        var requests =
                dataNode(
                        mockMvc.perform(get("/communities/{id}/requests", id).with(bearer(owner)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.data", hasSize(2)))
                                .andReturn());
        String approve = requests.get(0).get("id").asText();
        String reject = requests.get(1).get("id").asText();

        mockMvc.perform(
                        post("/communities/{id}/requests/{rid}/approve", id, approve)
                                .with(bearer(owner)))
                .andExpect(status().isOk());
        mockMvc.perform(
                        post("/communities/{id}/requests/{rid}/reject", id, reject)
                                .with(bearer(owner)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/communities/{id}/requests", id).with(bearer(owner)))
                .andExpect(jsonPath("$.data", hasSize(0)));
        mockMvc.perform(
                        post("/communities/{id}/requests/{rid}/approve", id, UUID.randomUUID())
                                .with(bearer(owner)))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyManagersSeeRequests() throws Exception {
        UUID id = createCommunity("Managed Club", true);

        mockMvc.perform(get("/communities/{id}/requests", id).with(bearer(member)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void leaderboard_listsMembers_andUnknownCommunitiesAreNotFound() throws Exception {
        UUID id = createCommunity("Ranked Club", false);

        mockMvc.perform(get("/communities/{id}/leaderboard", id).with(bearer(owner)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.community.name").value("Ranked Club"))
                .andExpect(jsonPath("$.data.members", hasSize(1)));
        mockMvc.perform(get("/communities/{id}/leaderboard", UUID.randomUUID()).with(bearer(owner)))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/communities/{id}/leave", UUID.randomUUID()).with(bearer(owner)))
                .andExpect(status().isNotFound());
    }

    @Test
    void unauthenticatedCallsAreRejected() throws Exception {
        mockMvc.perform(get("/communities")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/communities")).andExpect(status().isUnauthorized());
    }
}
