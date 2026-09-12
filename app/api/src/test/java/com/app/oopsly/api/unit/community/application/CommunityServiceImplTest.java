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

package com.app.oopsly.api.unit.community.application;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.community.application.CommunityServiceImpl;
import com.app.oopsly.api.community.application.vm.*;
import com.app.oopsly.api.community.domain.*;
import com.app.oopsly.api.community.infrastructure.CommunityJoinRequestRepository;
import com.app.oopsly.api.community.infrastructure.CommunityMemberRepository;
import com.app.oopsly.api.community.infrastructure.CommunityRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.user.Setting;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserRepository;
import com.app.oopsly.api.user.UserService;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CommunityServiceImplTest {

    @Mock private CommunityRepository communityRepository;
    @Mock private CommunityMemberRepository memberRepository;
    @Mock private CommunityJoinRequestRepository joinRequestRepository;
    @Mock private UserRepository userRepository;
    @Mock private UserService userService;

    @InjectMocks private CommunityServiceImpl communityService;

    private User currentUser;
    private CommunityEntity community;

    @BeforeEach
    void setUp() {
        currentUser = user("owner@test.dev", "Owner", "Owner display", 500);
        community = community(false);
    }

    private User user(String email, String name, String displayName, Integer xp) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail(email);
        user.setName(name);
        user.setDisplayName(displayName);
        user.setPictureUrl("https://cdn/pic.png");
        Setting setting = new Setting();
        setting.setTotalXp(xp);
        user.setSetting(setting);
        return user;
    }

    private CommunityEntity community(boolean isPrivate) {
        CommunityEntity entity =
                CommunityEntity.builder()
                        .name("Study Hall")
                        .description("desc")
                        .icon("Users")
                        .color("#8BC34A")
                        .isPrivate(isPrivate)
                        .tags(new ArrayList<>(List.of("focus")))
                        .owner(currentUser)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private CommunityMemberEntity member(User user, CommunityRole role) {
        CommunityMemberEntity entity =
                CommunityMemberEntity.builder()
                        .community(community)
                        .user(user)
                        .role(role)
                        .cardsStudiedThisWeek(4)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private CommunityJoinRequestEntity joinRequest(User user, JoinRequestStatus status) {
        CommunityJoinRequestEntity entity =
                CommunityJoinRequestEntity.builder()
                        .community(community)
                        .user(user)
                        .message("let me in")
                        .status(status)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private Object invokePrivate(String name, Class<?>[] types, Object... args) throws Exception {
        Method method = CommunityServiceImpl.class.getDeclaredMethod(name, types);
        method.setAccessible(true);
        try {
            return method.invoke(communityService, args);
        } catch (InvocationTargetException e) {
            throw (Exception) e.getCause();
        }
    }

    @SuppressWarnings("unchecked")
    private <T> T dataOf(ApiRes response) {
        return (T) response.getBody().data();
    }

    // ---------------------------------------------------------------- getAll

    @Test
    void getAll_mapsRoleForMemberships() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(memberRepository.countByCommunityId(community.getId())).thenReturn(12L);

        ApiRes response = communityService.getAll();

        List<CommunityRes> result = dataOf(response);
        assertEquals(1, result.size());
        assertEquals(CommunityRole.OWNER, result.get(0).userRole());
        assertEquals(12L, result.get(0).memberCount());
        assertEquals("Owner display", result.get(0).ownerName());
        assertEquals(List.of("focus"), result.get(0).tags());
    }

    @Test
    void getAll_marksPendingRequestsAsPendingRole() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.of(joinRequest(currentUser, JoinRequestStatus.PENDING)));

        List<CommunityRes> result = dataOf(communityService.getAll());

        assertEquals(CommunityRole.PENDING, result.get(0).userRole());
    }

    @Test
    void getAll_fallsBackToNoneRoleForStrangers() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());

        List<CommunityRes> result = dataOf(communityService.getAll());

        assertEquals(CommunityRole.NONE, result.get(0).userRole());
    }

    @Test
    void getAll_withNoCommunitiesReturnsEmptyList() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of());

        assertTrue(this.<List<CommunityRes>>dataOf(communityService.getAll()).isEmpty());
    }

    @Test
    void getMyCommunities_returnsJoinedCommunitiesOnly() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(memberRepository.findAllByUserId(currentUser.getId()))
                .thenReturn(List.of(member(currentUser, CommunityRole.MEMBER)));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.MEMBER)));

        List<CommunityRes> result = dataOf(communityService.getMyCommunities());

        assertEquals(1, result.size());
        assertEquals(CommunityRole.MEMBER, result.get(0).userRole());
        verify(memberRepository).findAllByUserId(currentUser.getId());
    }

    // ---------------------------------------------------------------- create

    @Test
    void create_registersCallerAsOwner() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.saveAndFlush(any(CommunityEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes response =
                communityService.create(
                        new CreateCommunityReq(
                                "  Focus Club  ",
                                "desc",
                                "Brain",
                                "#FFF",
                                "banner",
                                true,
                                List.of("a")));

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        ArgumentCaptor<CommunityEntity> captor = ArgumentCaptor.forClass(CommunityEntity.class);
        verify(communityRepository).saveAndFlush(captor.capture());
        assertEquals("Focus Club", captor.getValue().getName());
        assertTrue(captor.getValue().getIsPrivate());
        assertEquals(currentUser, captor.getValue().getOwner());

        ArgumentCaptor<CommunityMemberEntity> memberCaptor =
                ArgumentCaptor.forClass(CommunityMemberEntity.class);
        verify(memberRepository).saveAndFlush(memberCaptor.capture());
        assertEquals(CommunityRole.OWNER, memberCaptor.getValue().getRole());
    }

    @Test
    void create_appliesDefaultIconColorAndTags() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.saveAndFlush(any(CommunityEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        communityService.create(new CreateCommunityReq("Club", null, "  ", null, null, null, null));

        ArgumentCaptor<CommunityEntity> captor = ArgumentCaptor.forClass(CommunityEntity.class);
        verify(communityRepository).saveAndFlush(captor.capture());
        assertEquals(CommunityConstants.DEFAULT_ICON, captor.getValue().getIcon());
        assertEquals(CommunityConstants.DEFAULT_COLOR, captor.getValue().getColor());
        assertFalse(captor.getValue().getIsPrivate());
        assertTrue(captor.getValue().getTags().isEmpty());
    }

    @Test
    void create_withBlankNameIsRejected() {
        assertThrows(
                ValidationException.class,
                () ->
                        communityService.create(
                                new CreateCommunityReq("   ", null, null, null, null, null, null)));
        assertThrows(
                ValidationException.class,
                () ->
                        communityService.create(
                                new CreateCommunityReq(null, null, null, null, null, null, null)));
        verifyNoInteractions(communityRepository);
    }

    // ------------------------------------------------------------------ join

    @Test
    void join_openCommunityAddsMemberImmediately() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(memberRepository.saveAndFlush(any(CommunityMemberEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        ApiRes response = communityService.join(community.getId(), new JoinCommunityReq("hello"));

        JoinCommunityRes result = dataOf(response);
        assertEquals(CommunityConstants.JOIN_STATUS_JOINED, result.status());
        assertNotNull(result.member());
        assertNull(result.request());
        assertEquals(CommunityRole.MEMBER, result.member().role());
    }

    @Test
    void join_privateCommunityCreatesPendingRequest() {
        community = community(true);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.saveAndFlush(any(CommunityJoinRequestEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        JoinCommunityRes result =
                dataOf(communityService.join(community.getId(), new JoinCommunityReq("please")));

        assertEquals(CommunityConstants.JOIN_STATUS_REQUEST_SENT, result.status());
        assertNull(result.member());
        assertEquals("please", result.request().message());
        assertEquals(JoinRequestStatus.PENDING.name(), result.request().status());
    }

    @Test
    void join_privateCommunityWithoutMessageUsesDefaultMessage() {
        community = community(true);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.saveAndFlush(any(CommunityJoinRequestEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        JoinCommunityRes result = dataOf(communityService.join(community.getId(), null));

        assertEquals(CommunityConstants.DEFAULT_JOIN_MESSAGE, result.request().message());
    }

    @Test
    void join_existingMemberIsRejected() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.MEMBER)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.join(id, null));
    }

    @Test
    void join_duplicatePendingRequestIsRejected() {
        community = community(true);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.of(joinRequest(currentUser, JoinRequestStatus.PENDING)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.join(id, null));
    }

    @Test
    void join_unknownCommunityThrowsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(unknown)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> communityService.join(unknown, null));
    }

    // ----------------------------------------------------------------- leave

    @Test
    void leave_removesMembership() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));

        ApiRes response = communityService.leave(community.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(memberRepository)
                .deleteByCommunityIdAndUserId(community.getId(), currentUser.getId());
    }

    @Test
    void leave_unknownCommunityThrowsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(unknown)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> communityService.leave(unknown));
        verify(memberRepository, never()).deleteByCommunityIdAndUserId(any(), any());
    }

    // ---------------------------------------------------------------- invite

    @Test
    void invite_asOwnerAddsExistingUser() {
        User invited = user("friend@test.dev", "Friend", null, 100);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(userRepository.findByEmail("friend@test.dev")).thenReturn(Optional.of(invited));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), invited.getId()))
                .thenReturn(Optional.empty());
        when(memberRepository.saveAndFlush(any(CommunityMemberEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CommunityMemberRes result =
                dataOf(
                        communityService.invite(
                                community.getId(), new InviteMemberReq("  friend@test.dev  ")));

        assertEquals(CommunityRole.MEMBER, result.role());
        assertEquals("Friend", result.displayName());
        assertEquals(invited.getId(), result.userId());
    }

    @Test
    void invite_alreadyMemberIsIdempotent() {
        User invited = user("friend@test.dev", "Friend", null, 100);
        CommunityMemberEntity existing = member(invited, CommunityRole.ADMIN);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.ADMIN)));
        when(userRepository.findByEmail("friend@test.dev")).thenReturn(Optional.of(invited));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), invited.getId()))
                .thenReturn(Optional.of(existing));

        CommunityMemberRes result =
                dataOf(
                        communityService.invite(
                                community.getId(), new InviteMemberReq("friend@test.dev")));

        assertEquals(CommunityRole.ADMIN, result.role());
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void invite_byPlainMemberIsForbidden() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.MEMBER)));

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq("friend@test.dev");
        assertThrows(ValidationException.class, () -> communityService.invite(id, request));
        verifyNoInteractions(userRepository);
    }

    @Test
    void invite_byNonMemberIsForbidden() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq("friend@test.dev");
        assertThrows(ValidationException.class, () -> communityService.invite(id, request));
    }

    @Test
    void invite_unknownUserThrowsNotFound() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(userRepository.findByEmail("ghost@test.dev")).thenReturn(Optional.empty());

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq("ghost@test.dev");
        assertThrows(NotFoundException.class, () -> communityService.invite(id, request));
    }

    // --------------------------------------------------------- join requests

    @Test
    void getJoinRequests_returnsPendingRequestsForManagers() {
        User applicant = user("apply@test.dev", "Applicant", "App", 10);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(joinRequestRepository.findAllByCommunityIdAndStatus(
                        community.getId(), JoinRequestStatus.PENDING))
                .thenReturn(List.of(joinRequest(applicant, JoinRequestStatus.PENDING)));

        List<JoinRequestRes> result = dataOf(communityService.getJoinRequests(community.getId()));

        assertEquals(1, result.size());
        assertEquals("App", result.get(0).displayName());
        assertEquals("apply@test.dev", result.get(0).userEmail());
        assertEquals("Study Hall", result.get(0).communityName());
    }

    @Test
    void getJoinRequests_requiresManagerRole() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.MEMBER)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.getJoinRequests(id));
    }

    @Test
    void approveJoinRequest_promotesApplicantToMember() {
        User applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(request.getId(), community.getId()))
                .thenReturn(Optional.of(request));
        when(joinRequestRepository.saveAndFlush(request)).thenReturn(request);
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), applicant.getId()))
                .thenReturn(Optional.empty());
        when(memberRepository.saveAndFlush(any(CommunityMemberEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CommunityMemberRes result =
                dataOf(communityService.approveJoinRequest(community.getId(), request.getId()));

        assertEquals(JoinRequestStatus.APPROVED, request.getStatus());
        assertEquals(CommunityRole.MEMBER, result.role());
    }

    @Test
    void approveJoinRequest_whenAlreadyMemberDoesNotDuplicate() {
        User applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(request.getId(), community.getId()))
                .thenReturn(Optional.of(request));
        when(joinRequestRepository.saveAndFlush(request)).thenReturn(request);
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), applicant.getId()))
                .thenReturn(Optional.of(member(applicant, CommunityRole.MEMBER)));

        communityService.approveJoinRequest(community.getId(), request.getId());

        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void approveJoinRequest_unknownRequestThrowsNotFound() {
        UUID requestId = UUID.randomUUID();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(requestId, community.getId()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        assertThrows(
                NotFoundException.class, () -> communityService.approveJoinRequest(id, requestId));
    }

    @Test
    void rejectJoinRequest_marksRequestRejected() {
        User applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.ADMIN)));
        when(joinRequestRepository.findByIdAndCommunityId(request.getId(), community.getId()))
                .thenReturn(Optional.of(request));
        when(joinRequestRepository.saveAndFlush(request)).thenReturn(request);

        JoinRequestRes result =
                dataOf(communityService.rejectJoinRequest(community.getId(), request.getId()));

        assertEquals(JoinRequestStatus.REJECTED.name(), result.status());
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectJoinRequest_requiresManagerRole() {
        UUID requestId = UUID.randomUUID();
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        assertThrows(
                ValidationException.class, () -> communityService.rejectJoinRequest(id, requestId));
    }

    // ----------------------------------------------------------- leaderboard

    @Test
    void getLeaderboard_ranksMembersByXpDescending() {
        User low = user("low@test.dev", "Low", null, 10);
        User high = user("high@test.dev", "High", null, 900);
        User none = user("none@test.dev", "None", null, null);
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findAllByCommunityId(community.getId()))
                .thenReturn(
                        new ArrayList<>(
                                List.of(
                                        member(low, CommunityRole.MEMBER),
                                        member(high, CommunityRole.OWNER),
                                        member(none, CommunityRole.MEMBER))));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.of(member(currentUser, CommunityRole.OWNER)));

        CommunityLeaderboardRes result = dataOf(communityService.getLeaderboard(community.getId()));

        assertEquals(3, result.members().size());
        assertEquals("High", result.members().get(0).displayName());
        assertEquals(1, result.members().get(0).rank());
        assertEquals(900, result.members().get(0).xp());
        assertEquals("Low", result.members().get(1).displayName());
        assertEquals(2, result.members().get(1).rank());
        assertEquals(0, result.members().get(2).xp());
        assertEquals(3, result.members().get(2).rank());
        assertEquals(4, result.members().get(0).cardsStudiedThisWeek());
        assertEquals(community.getId(), result.community().id());
    }

    @Test
    void getLeaderboard_emptyCommunityReturnsNoRows() {
        when(userService.getCurrentUser()).thenReturn(currentUser);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findAllByCommunityId(community.getId()))
                .thenReturn(new ArrayList<>());
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), currentUser.getId()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), currentUser.getId(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());

        CommunityLeaderboardRes result = dataOf(communityService.getLeaderboard(community.getId()));

        assertTrue(result.members().isEmpty());
        assertEquals(CommunityRole.NONE, result.community().userRole());
    }

    // -------------------------------------------------------------- fallback

    @Test
    void fallbacks_rethrowDomainExceptions() {
        ValidationException validation = new ValidationException("bad");
        NotFoundException notFound = new NotFoundException("gone");

        assertThrows(
                ValidationException.class,
                () -> invokePrivate("readFallback", new Class<?>[] {Throwable.class}, validation));
        assertThrows(
                NotFoundException.class,
                () ->
                        invokePrivate(
                                "readFallback",
                                new Class<?>[] {UUID.class, Throwable.class},
                                UUID.randomUUID(),
                                notFound));
        assertThrows(
                ValidationException.class,
                () ->
                        invokePrivate(
                                "writeFallback",
                                new Class<?>[] {CreateCommunityReq.class, Throwable.class},
                                null,
                                validation));
    }

    @Test
    void fallbacks_returnServiceUnavailableForInfrastructureFailures() throws Exception {
        Throwable cause = new IllegalStateException("db down");
        UUID id = UUID.randomUUID();

        List<ApiRes> responses =
                List.of(
                        (ApiRes)
                                invokePrivate(
                                        "readFallback", new Class<?>[] {Throwable.class}, cause),
                        (ApiRes)
                                invokePrivate(
                                        "readFallback",
                                        new Class<?>[] {UUID.class, Throwable.class},
                                        id,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "writeFallback",
                                        new Class<?>[] {CreateCommunityReq.class, Throwable.class},
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "writeFallback",
                                        new Class<?>[] {UUID.class, Throwable.class},
                                        id,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "writeFallback",
                                        new Class<?>[] {
                                            UUID.class, JoinCommunityReq.class, Throwable.class
                                        },
                                        id,
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "writeFallback",
                                        new Class<?>[] {
                                            UUID.class, InviteMemberReq.class, Throwable.class
                                        },
                                        id,
                                        null,
                                        cause),
                        (ApiRes)
                                invokePrivate(
                                        "writeFallback",
                                        new Class<?>[] {UUID.class, UUID.class, Throwable.class},
                                        id,
                                        id,
                                        cause));

        responses.forEach(
                response -> {
                    assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
                    assertFalse(response.getBody().isSuccess());
                });
    }

    @Test
    void fallback_checkedExceptionsAreAlsoDegradedGracefully() throws Exception {
        ApiRes response =
                (ApiRes)
                        invokePrivate(
                                "readFallback",
                                new Class<?>[] {Throwable.class},
                                new java.io.IOException("network"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    }
}
