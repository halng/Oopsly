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

package com.app.oopsly.api.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.app.oopsly.api.service.SubjectService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

/**
 * Comprehensive tests for SubjectController changes in PR #60.
 *
 * <p>This test suite focuses on the new features introduced in PR #60:
 * - New endpoint: PUT /shelves/{shelfId}/subjects/{id}/settings
 * - SubjectSettingReq validation (or lack thereof)
 * - Path variable renaming (shelveId → shelfId)
 *
 * <p>GOTCHA NOTES:
 * - SubjectSettingReq has NO validation annotations (@Min, @Max, @NotNull)
 * - The updateSetting method lacks @CircuitBreaker annotation
 * - No @Transactional annotation, which might cause partial updates on failure
 * - Controller accepts negative and zero values without validation
 */
@ExtendWith(MockitoExtension.class)
class SubjectControllerPR60Test {

    @Mock private SubjectService subjectService;

    @InjectMocks private SubjectController subjectController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    
    private UUID shelfId;
    private UUID subjectId;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(subjectController).build();
        objectMapper = new ObjectMapper();
        shelfId = UUID.randomUUID();
        subjectId = UUID.randomUUID();
    }

    // ============================================================================
    // HAPPY PATH TESTS
    // ============================================================================

    @Test
    @DisplayName("SUB-T1: Update subject settings with valid data should succeed")
    void updateSettings_withValidData_shouldSucceed() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);
        ApiRes expectedResponse = ApiRes.success("Updated successfully");
        
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(expectedResponse);

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Updated successfully"));

        verify(subjectService, times(1)).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    @Test
    @DisplayName("Update settings with maximum valid values should succeed")
    void updateSettings_withMaxValues_shouldSucceed() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(1000, 500, 10.0);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    // ============================================================================
    // EDGE CASE TESTS - ZERO VALUES
    // ============================================================================

    @Test
    @DisplayName("SUB-T2: Update with zero dailyLimit should be accepted (no validation)")
    void updateSettings_withZeroDailyLimit_shouldHandle() throws Exception {
        /*
         * GOTCHA: SubjectSettingReq has no @Min validation, so zero is accepted.
         * This might represent "unlimited" or could be a data integrity issue.
         * Ambiguous requirement - should be clarified with product owner.
         */
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(0, 10, 1.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    @Test
    @DisplayName("SUB-T5: Update with zero interval should be accepted")
    void updateSettings_withZeroInterval_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 0.0);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Update with all zero values should be accepted")
    void updateSettings_withAllZeroValues_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(0, 0, 0.0);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ============================================================================
    // EDGE CASE TESTS - NEGATIVE VALUES (SHOULD BE REJECTED BUT AREN'T)
    // ============================================================================

    @Test
    @DisplayName("SUB-T3: Update with negative dailyLimit should be accepted (BUG)")
    void updateSettings_withNegativeDailyLimit_shouldReject() throws Exception {
        /*
         * GOTCHA: This test EXPOSES A BUG. The controller accepts negative values
         * because SubjectSettingReq has no @Min(0) validation. Negative dailyLimit
         * makes no sense for a daily review limit.
         */
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(-10, 5, 1.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()); // Currently accepts, should return 400

        // This proves the bug exists
        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    @Test
    @DisplayName("SUB-T4: Update with negative newCardsPerDay should be accepted (BUG)")
    void updateSettings_withNegativeNewCards_shouldReject() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, -5, 1.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()); // Bug: should validate and return 400

        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    @Test
    @DisplayName("SUB-T6: Update with negative interval should be accepted (BUG)")
    void updateSettings_withNegativeInterval_shouldReject() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, -1.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()); // Bug: negative interval makes no sense

        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    @Test
    @DisplayName("Update with all negative values should be accepted (BUG)")
    void updateSettings_withAllNegativeValues_shouldReject() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(-100, -50, -2.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk()); // Major bug: all negative values accepted

        verify(subjectService).updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class));
    }

    // ============================================================================
    // EDGE CASE TESTS - EXTREME VALUES
    // ============================================================================

    @Test
    @DisplayName("SUB-T7: Update with Integer.MAX_VALUE should be handled")
    void updateSettings_withMaxIntValues_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(Integer.MAX_VALUE, Integer.MAX_VALUE, 1.5);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("SUB-T8: Update with Double.MAX_VALUE interval should be handled")
    void updateSettings_withMaxDoubleInterval_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.MAX_VALUE);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Update with Double.NaN interval should be handled")
    void updateSettings_withNaNInterval_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.NaN);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Update with Double.POSITIVE_INFINITY should be handled")
    void updateSettings_withInfinityInterval_shouldHandle() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, Double.POSITIVE_INFINITY);
        when(subjectService.updateSetting(eq(shelfId), eq(subjectId), any(SubjectSettingReq.class)))
                .thenReturn(ApiRes.success("Updated successfully"));

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    // ============================================================================
    // PATH VARIABLE VALIDATION TESTS
    // ============================================================================

    @Test
    @DisplayName("SUB-T14: Invalid shelfId format should return 400")
    void updateSettings_withInvalidShelfId_shouldReturn400() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", "not-a-uuid", subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(subjectService);
    }

    @Test
    @DisplayName("SUB-T15: Invalid subjectId format should return 400")
    void updateSettings_withInvalidSubjectId_shouldReturn400() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, "abc-123")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(subjectService);
    }

    @Test
    @DisplayName("Empty shelfId should return 404 or 400")
    void updateSettings_withEmptyShelfId_shouldReturnError() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(put("/shelves/ /subjects/{id}/settings", subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().is4xxClientError());
    }

    // ============================================================================
    // REQUEST BODY VALIDATION TESTS
    // ============================================================================

    @Test
    @DisplayName("SUB-T13: Missing request body should return 400")
    void updateSettings_withMissingBody_shouldReturn400() throws Exception {
        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(subjectService);
    }

    @Test
    @DisplayName("Malformed JSON in request body should return 400")
    void updateSettings_withMalformedJson_shouldReturn400() throws Exception {
        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{invalid json"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(subjectService);
    }

    @Test
    @DisplayName("Empty JSON object should be handled")
    void updateSettings_withEmptyJson_shouldHandle() throws Exception {
        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest()); // Java record requires all fields
    }

    // ============================================================================
    // CONTENT TYPE TESTS
    // ============================================================================

    @Test
    @DisplayName("Missing Content-Type header should return 415")
    void updateSettings_withoutContentType_shouldReturn415() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnsupportedMediaType());
    }

    @Test
    @DisplayName("Wrong Content-Type should return 415")
    void updateSettings_withWrongContentType_shouldReturn415() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(put("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_XML)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnsupportedMediaType());
    }

    // ============================================================================
    // HTTP METHOD TESTS
    // ============================================================================

    @Test
    @DisplayName("POST to settings endpoint should return 405")
    void updateSettings_withPostMethod_shouldReturn405() throws Exception {
        // Arrange
        SubjectSettingReq request = new SubjectSettingReq(50, 10, 1.5);

        // Act & Assert
        mockMvc.perform(post("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("GET to settings endpoint should return 405")
    void updateSettings_withGetMethod_shouldReturn405() throws Exception {
        // Act & Assert
        mockMvc.perform(get("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @DisplayName("DELETE to settings endpoint should return 405")
    void updateSettings_withDeleteMethod_shouldReturn405() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/shelves/{shelfId}/subjects/{id}/settings", shelfId, subjectId))
                .andExpect(status().isMethodNotAllowed());
    }
}
