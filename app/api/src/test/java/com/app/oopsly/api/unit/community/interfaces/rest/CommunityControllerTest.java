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

package com.app.oopsly.api.unit.community.interfaces.rest;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.community.application.CommunityService;
import com.app.oopsly.api.community.application.vm.CreateCommunityReq;
import com.app.oopsly.api.community.application.vm.InviteMemberReq;
import com.app.oopsly.api.community.application.vm.JoinCommunityReq;
import com.app.oopsly.api.community.interfaces.rest.CommunityController;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CommunityControllerTest {

    @Mock private CommunityService communityService;

    @InjectMocks private CommunityController communityController;

    private final UUID communityId = UUID.randomUUID();
    private final UUID requestId = UUID.randomUUID();

    @Test
    void getAll_delegatesToService() {
        ApiRes expected = ApiRes.success("all");
        when(communityService.getAll()).thenReturn(expected);

        assertSame(expected, communityController.getAll());
    }

    @Test
    void getMyCommunities_delegatesToService() {
        ApiRes expected = ApiRes.success("mine");
        when(communityService.getMyCommunities()).thenReturn(expected);

        assertSame(expected, communityController.getMyCommunities());
    }

    @Test
    void create_delegatesToService() {
        CreateCommunityReq request =
                new CreateCommunityReq("Club", "d", null, null, null, false, List.of());
        ApiRes expected = ApiRes.created("created");
        when(communityService.create(request)).thenReturn(expected);

        assertSame(expected, communityController.create(request));
    }

    @Test
    void join_supportsOptionalBody() {
        ApiRes expected = ApiRes.success("joined");
        when(communityService.join(communityId, null)).thenReturn(expected);

        assertSame(expected, communityController.join(communityId, null));
    }

    @Test
    void join_forwardsMessage() {
        JoinCommunityReq request = new JoinCommunityReq("hi");
        ApiRes expected = ApiRes.success("requested");
        when(communityService.join(communityId, request)).thenReturn(expected);

        assertSame(expected, communityController.join(communityId, request));
    }

    @Test
    void join_propagatesDomainErrors() {
        when(communityService.join(communityId, null))
                .thenThrow(new ValidationException("already member"));

        assertThrows(ValidationException.class, () -> communityController.join(communityId, null));
    }

    @Test
    void leave_delegatesToService() {
        ApiRes expected = ApiRes.success("left");
        when(communityService.leave(communityId)).thenReturn(expected);

        assertSame(expected, communityController.leave(communityId));
    }

    @Test
    void leave_propagatesNotFound() {
        when(communityService.leave(communityId)).thenThrow(new NotFoundException("gone"));

        assertThrows(NotFoundException.class, () -> communityController.leave(communityId));
    }

    @Test
    void invite_delegatesToService() {
        InviteMemberReq request = new InviteMemberReq("friend@test.dev");
        ApiRes expected = ApiRes.success("invited");
        when(communityService.invite(communityId, request)).thenReturn(expected);

        assertSame(expected, communityController.invite(communityId, request));
    }

    @Test
    void invite_propagatesAuthorizationErrors() {
        InviteMemberReq request = new InviteMemberReq("friend@test.dev");
        when(communityService.invite(communityId, request))
                .thenThrow(new ValidationException("not allowed"));

        assertThrows(
                ValidationException.class, () -> communityController.invite(communityId, request));
    }

    @Test
    void getJoinRequests_delegatesToService() {
        ApiRes expected = ApiRes.success("requests");
        when(communityService.getJoinRequests(communityId)).thenReturn(expected);

        assertSame(expected, communityController.getJoinRequests(communityId));
    }

    @Test
    void approve_delegatesToService() {
        ApiRes expected = ApiRes.success("approved");
        when(communityService.approveJoinRequest(communityId, requestId)).thenReturn(expected);

        assertSame(expected, communityController.approve(communityId, requestId));
    }

    @Test
    void reject_delegatesToService() {
        ApiRes expected = ApiRes.success("rejected");
        when(communityService.rejectJoinRequest(communityId, requestId)).thenReturn(expected);

        assertSame(expected, communityController.reject(communityId, requestId));
    }

    @Test
    void getLeaderboard_delegatesToService() {
        ApiRes expected = ApiRes.success("leaderboard");
        when(communityService.getLeaderboard(communityId)).thenReturn(expected);

        assertSame(expected, communityController.getLeaderboard(communityId));
    }
}
