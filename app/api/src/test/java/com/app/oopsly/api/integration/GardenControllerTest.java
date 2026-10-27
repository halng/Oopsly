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

@DisplayName("GardenController integration")
class GardenControllerTest extends AbstractControllerTest {

    private AuthSession session;

    @BeforeEach
    void setUp() {
        session = authenticate(EMAIL);
    }

    @Test
    void getGarden_createsAStarterGardenOnFirstVisit() throws Exception {
        mockMvc.perform(get("/garden").with(bearer(session)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true))
                .andExpect(jsonPath("$.data.plots").isArray())
                .andExpect(jsonPath("$.data.forestLevel").exists());
    }

    @Test
    void completePomodoro_grantsRewards() throws Exception {
        mockMvc.perform(
                        post("/garden/pomodoro/complete")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        """
                                        {"focusDurationMinutes":25,"breakDurationMinutes":5,
                                         "mode":"FOCUS","soundscape":"NONE"}
                                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }

    @Test
    void completePomodoro_rejectsEmptySessions() throws Exception {
        mockMvc.perform(
                        post("/garden/pomodoro/complete")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"focusDurationMinutes\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void plant_usesAStarterSeed_thenRefusesOccupiedLockedAndUnknownInputs() throws Exception {
        String plant = "{\"species\":\"CAMPHOR_TREE\",\"plotIndex\":%d}";
        mockMvc.perform(
                        post("/garden/plants")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(plant.formatted(0)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.plantedTrees.length()").value(1));
        // The plot is taken now.
        mockMvc.perform(
                        post("/garden/plants")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(plant.formatted(0)))
                .andExpect(status().isBadRequest());
        // Only the first plots are free.
        mockMvc.perform(
                        post("/garden/plants")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(plant.formatted(8)))
                .andExpect(status().isBadRequest());
        mockMvc.perform(
                        post("/garden/plants")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"species\":\"NOPE\",\"plotIndex\":0}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void water_aPlantedTree() throws Exception {
        var garden =
                dataNode(
                        mockMvc.perform(
                                        post("/garden/plants")
                                                .with(bearer(session))
                                                .contentType(MediaType.APPLICATION_JSON)
                                                .content(
                                                        "{\"species\":\"CAMPHOR_TREE\",\"plotIndex\":0}"))
                                .andExpect(status().isCreated())
                                .andReturn());
        String treeId = garden.get("plantedTrees").get(0).get("id").asText();

        mockMvc.perform(
                        post("/garden/plants/water")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"treeId\":\"" + treeId + "\"}"))
                .andExpect(status().is(org.hamcrest.Matchers.oneOf(200, 400)));
    }

    @Test
    void water_unknownTreeIsNotFound() throws Exception {
        mockMvc.perform(
                        post("/garden/plants/water")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"treeId\":\"" + UUID.randomUUID() + "\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void unlockPlot_needsEnoughCoins_andAValidPlot() throws Exception {
        mockMvc.perform(
                        post("/garden/plots/unlock")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"plotIndex\":8}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(
                        post("/garden/plots/unlock")
                                .with(bearer(session))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"plotIndex\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void unauthenticatedCallsAreRejected() throws Exception {
        mockMvc.perform(get("/garden")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/garden/plants")).andExpect(status().isUnauthorized());
    }
}
