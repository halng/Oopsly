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

package com.app.oopsly.api.community.interfaces.rest;

import com.app.oopsly.api.community.application.CommunityService;
import com.app.oopsly.api.community.application.vm.CreateCommunityReq;
import com.app.oopsly.api.community.application.vm.InviteMemberReq;
import com.app.oopsly.api.community.application.vm.JoinCommunityReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/communities")
@RequiredArgsConstructor
@Validated
@Tag(
        name = "Community",
        description =
                "Community APIs for discovering, creating and joining learning communities,"
                        + " managing members, join requests and community leaderboards")
public class CommunityController {

    private final CommunityService communityService;

    @Operation(
            summary = "List all communities",
            description =
                    "Retrieves every visible community enriched with the real member count and the"
                            + " current user's role (OWNER, ADMIN, MEMBER, PENDING or NONE)")
    @ApiResponses(
            value = {
                @ApiResponse(
                        responseCode = "200",
                        description = "Communities retrieved successfully",
                        content = @Content(schema = @Schema(implementation = ApiRes.class))),
                @ApiResponse(responseCode = "401", description = "Unauthenticated"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @GetMapping("")
    public ApiRes getAll() {
        log.info("Listing communities");
        return communityService.getAll();
    }

    @Operation(
            summary = "List my communities",
            description = "Retrieves the communities the authenticated user has joined")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Communities retrieved"),
                @ApiResponse(responseCode = "401", description = "Unauthenticated"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @GetMapping("/my")
    public ApiRes getMyCommunities() {
        log.info("Listing communities of current user");
        return communityService.getMyCommunities();
    }

    @Operation(
            summary = "Create a community",
            description =
                    "Creates a new community and registers the authenticated user as its OWNER")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "201", description = "Community created successfully"),
                @ApiResponse(responseCode = "400", description = "Invalid request body"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("")
    public ApiRes create(
            @Parameter(description = "Community creation request", required = true)
                    @Valid @RequestBody
                    CreateCommunityReq requestBody) {
        log.info("Creating community {}", requestBody.name());
        return communityService.create(requestBody);
    }

    @Operation(
            summary = "Join a community",
            description =
                    "Joins an open community immediately, or creates a pending join request when"
                            + " the community is private")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Joined or request sent"),
                @ApiResponse(responseCode = "400", description = "Already a member or pending"),
                @ApiResponse(responseCode = "404", description = "Community not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("/{id}/join")
    public ApiRes join(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id,
            @Parameter(description = "Optional message for community admins")
                    @RequestBody(required = false)
                    @Valid JoinCommunityReq requestBody) {
        log.info("User joining community {}", id);
        return communityService.join(id, requestBody);
    }

    @Operation(
            summary = "Leave a community",
            description = "Removes the authenticated user's membership from the community")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Left the community"),
                @ApiResponse(responseCode = "404", description = "Community not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("/{id}/leave")
    public ApiRes leave(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id) {
        log.info("User leaving community {}", id);
        return communityService.leave(id);
    }

    @Operation(
            summary = "Invite a member",
            description =
                    "Adds an existing learner to the community directly. Requires OWNER or ADMIN"
                            + " role")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Member added"),
                @ApiResponse(responseCode = "400", description = "Not allowed to manage community"),
                @ApiResponse(responseCode = "404", description = "Community or user not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("/{id}/invite")
    public ApiRes invite(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id,
            @Parameter(description = "Invite request", required = true) @Valid @RequestBody
                    InviteMemberReq requestBody) {
        log.info("Inviting member to community {}", id);
        return communityService.invite(id, requestBody);
    }

    @Operation(
            summary = "List pending join requests",
            description =
                    "Retrieves the pending join requests of a community. Requires OWNER or ADMIN"
                            + " role")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Join requests retrieved"),
                @ApiResponse(responseCode = "400", description = "Not allowed to manage community"),
                @ApiResponse(responseCode = "404", description = "Community not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @GetMapping("/{id}/requests")
    public ApiRes getJoinRequests(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id) {
        log.info("Listing join requests of community {}", id);
        return communityService.getJoinRequests(id);
    }

    @Operation(
            summary = "Approve a join request",
            description = "Approves a pending join request and adds the learner as MEMBER")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Join request approved"),
                @ApiResponse(responseCode = "404", description = "Community or request not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("/{id}/requests/{requestId}/approve")
    public ApiRes approve(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id,
            @Parameter(description = "Join request ID", required = true) @PathVariable
                    UUID requestId) {
        log.info("Approving join request {} of community {}", requestId, id);
        return communityService.approveJoinRequest(id, requestId);
    }

    @Operation(
            summary = "Reject a join request",
            description = "Rejects a pending join request of a community")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Join request rejected"),
                @ApiResponse(responseCode = "404", description = "Community or request not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @PostMapping("/{id}/requests/{requestId}/reject")
    public ApiRes reject(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id,
            @Parameter(description = "Join request ID", required = true) @PathVariable
                    UUID requestId) {
        log.info("Rejecting join request {} of community {}", requestId, id);
        return communityService.rejectJoinRequest(id, requestId);
    }

    @Operation(
            summary = "Community leaderboard",
            description =
                    "Retrieves the members of a community ranked by XP, together with the community"
                            + " summary")
    @ApiResponses(
            value = {
                @ApiResponse(responseCode = "200", description = "Leaderboard retrieved"),
                @ApiResponse(responseCode = "404", description = "Community not found"),
                @ApiResponse(responseCode = "503", description = "Community service degraded")
            })
    @GetMapping("/{id}/leaderboard")
    public ApiRes getLeaderboard(
            @Parameter(description = "Community ID", required = true) @PathVariable UUID id) {
        log.info("Fetching leaderboard of community {}", id);
        return communityService.getLeaderboard(id);
    }
}
