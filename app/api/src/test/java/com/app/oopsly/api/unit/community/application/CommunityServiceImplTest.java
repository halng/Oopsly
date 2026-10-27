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
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.community.application.CommunityServiceImpl;
import com.app.oopsly.api.community.application.vm.*;
import com.app.oopsly.api.community.domain.*;
import com.app.oopsly.api.community.infrastructure.CommunityJoinRequestRepository;
import com.app.oopsly.api.community.infrastructure.CommunityMemberRepository;
import com.app.oopsly.api.community.infrastructure.CommunityRepository;
import com.app.oopsly.api.progress.UserProgress;
import com.app.oopsly.api.progress.UserProgressRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.client.AuthProfile;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
    @Mock private UserProgressRepository progressRepository;
    @Mock private AuthClient authClient;
    @Mock private CurrentUser currentUser;

    @InjectMocks private CommunityServiceImpl communityService;

    private record Person(UUID id, String email) {}

    private final Map<UUID, AuthProfile> profiles = new HashMap<>();
    private final Map<UUID, UserProgress> progresses = new HashMap<>();
    private Person me;
    private CommunityEntity community;

    @BeforeEach
    void setUp() {
        me = user("owner@test.dev", "Owner", "Owner display", 500);
        lenient().when(currentUser.id()).thenReturn(me.id());
        lenient()
                .when(authClient.lookup(any(UUID.class)))
                .thenAnswer(
                        inv -> {
                            UUID id = inv.getArgument(0);
                            return profiles.getOrDefault(id, AuthProfile.unknown(id));
                        });
        lenient()
                .when(authClient.lookup(anyCollection()))
                .thenAnswer(
                        inv -> {
                            Map<UUID, AuthProfile> result = new HashMap<>();
                            for (UUID id : (java.util.Collection<UUID>) inv.getArgument(0)) {
                                result.put(id, profiles.getOrDefault(id, AuthProfile.unknown(id)));
                            }
                            return result;
                        });
        lenient()
                .when(progressRepository.findByUserId(any()))
                .thenAnswer(inv -> Optional.ofNullable(progresses.get(inv.<UUID>getArgument(0))));
        lenient()
                .when(progressRepository.findAllByUserIdIn(anyCollection()))
                .thenAnswer(
                        inv ->
                                ((java.util.Collection<UUID>) inv.getArgument(0))
                                        .stream()
                                                .filter(progresses::containsKey)
                                                .map(progresses::get)
                                                .toList());
        community = community(false);
    }

    private Person user(String email, String name, String displayName, Integer xp) {
        UUID id = UUID.randomUUID();
        profiles.put(id, new AuthProfile(id, name, displayName, "https://cdn/pic.png", 20));
        progresses.put(id, UserProgress.builder().userId(id).totalXp(xp).build());
        return new Person(id, email);
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
                        .ownerId(me.id())
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private CommunityMemberEntity member(Person user, CommunityRole role) {
        CommunityMemberEntity entity =
                CommunityMemberEntity.builder()
                        .community(community)
                        .userId(user.id())
                        .role(role)
                        .cardsStudiedThisWeek(4)
                        .build();
        entity.setId(UUID.randomUUID());
        return entity;
    }

    private CommunityJoinRequestEntity joinRequest(Person user, JoinRequestStatus status) {
        CommunityJoinRequestEntity entity =
                CommunityJoinRequestEntity.builder()
                        .community(community)
                        .userId(user.id())
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
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
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
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.of(joinRequest(me, JoinRequestStatus.PENDING)));

        List<CommunityRes> result = dataOf(communityService.getAll());

        assertEquals(CommunityRole.PENDING, result.get(0).userRole());
    }

    @Test
    void getAll_fallsBackToNoneRoleForStrangers() {
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());

        List<CommunityRes> result = dataOf(communityService.getAll());

        assertEquals(CommunityRole.NONE, result.get(0).userRole());
    }

    @Test
    void getAll_withNoCommunitiesReturnsEmptyList() {
        when(communityRepository.findAllByDeletedFalse()).thenReturn(List.of());

        assertTrue(this.<List<CommunityRes>>dataOf(communityService.getAll()).isEmpty());
    }

    @Test
    void getMyCommunities_returnsJoinedCommunitiesOnly() {
        when(memberRepository.findAllByUserId(me.id()))
                .thenReturn(List.of(member(me, CommunityRole.MEMBER)));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.MEMBER)));

        List<CommunityRes> result = dataOf(communityService.getMyCommunities());

        assertEquals(1, result.size());
        assertEquals(CommunityRole.MEMBER, result.get(0).userRole());
        verify(memberRepository).findAllByUserId(me.id());
    }

    // ---------------------------------------------------------------- create

    @Test
    void create_registersCallerAsOwner() {
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
        assertEquals(me.id(), captor.getValue().getOwnerId());

        ArgumentCaptor<CommunityMemberEntity> memberCaptor =
                ArgumentCaptor.forClass(CommunityMemberEntity.class);
        verify(memberRepository).saveAndFlush(memberCaptor.capture());
        assertEquals(CommunityRole.OWNER, memberCaptor.getValue().getRole());
    }

    @Test
    void create_appliesDefaultIconColorAndTags() {
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
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
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
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
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
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.saveAndFlush(any(CommunityJoinRequestEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        JoinCommunityRes result = dataOf(communityService.join(community.getId(), null));

        assertEquals(CommunityConstants.DEFAULT_JOIN_MESSAGE, result.request().message());
    }

    @Test
    void join_existingMemberIsRejected() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.MEMBER)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.join(id, null));
    }

    @Test
    void join_duplicatePendingRequestIsRejected() {
        community = community(true);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
                .thenReturn(Optional.of(joinRequest(me, JoinRequestStatus.PENDING)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.join(id, null));
    }

    @Test
    void join_unknownCommunityThrowsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(communityRepository.findById(unknown)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> communityService.join(unknown, null));
    }

    // ----------------------------------------------------------------- leave

    @Test
    void leave_removesMembership() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));

        ApiRes response = communityService.leave(community.getId());

        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(memberRepository).deleteByCommunityIdAndUserId(community.getId(), me.id());
    }

    @Test
    void leave_unknownCommunityThrowsNotFound() {
        UUID unknown = UUID.randomUUID();
        when(communityRepository.findById(unknown)).thenReturn(Optional.empty());

        assertThrows(NotFoundException.class, () -> communityService.leave(unknown));
        verify(memberRepository, never()).deleteByCommunityIdAndUserId(any(), any());
    }

    // ---------------------------------------------------------------- invite

    @Test
    void invite_asOwnerAddsExistingUser() {
        Person invited = user("friend@test.dev", "Friend", null, 100);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), invited.id()))
                .thenReturn(Optional.empty());
        when(memberRepository.saveAndFlush(any(CommunityMemberEntity.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CommunityMemberRes result =
                dataOf(
                        communityService.invite(
                                community.getId(),
                                new InviteMemberReq("  " + invited.id() + "  ")));

        assertEquals(CommunityRole.MEMBER, result.role());
        assertEquals("Friend", result.displayName());
        assertEquals(invited.id(), result.userId());
    }

    @Test
    void invite_alreadyMemberIsIdempotent() {
        Person invited = user("friend@test.dev", "Friend", null, 100);
        CommunityMemberEntity existing = member(invited, CommunityRole.ADMIN);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.ADMIN)));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), invited.id()))
                .thenReturn(Optional.of(existing));

        CommunityMemberRes result =
                dataOf(
                        communityService.invite(
                                community.getId(), new InviteMemberReq(invited.id().toString())));

        assertEquals(CommunityRole.ADMIN, result.role());
        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void invite_byPlainMemberIsForbidden() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.MEMBER)));

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq(UUID.randomUUID().toString());
        assertThrows(ValidationException.class, () -> communityService.invite(id, request));
        verifyNoInteractions(authClient);
    }

    @Test
    void invite_byNonMemberIsForbidden() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq(UUID.randomUUID().toString());
        assertThrows(ValidationException.class, () -> communityService.invite(id, request));
    }

    @Test
    void invite_unknownUserThrowsNotFound() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));

        UUID id = community.getId();
        InviteMemberReq request = new InviteMemberReq(UUID.randomUUID().toString());
        assertThrows(NotFoundException.class, () -> communityService.invite(id, request));
    }

    // --------------------------------------------------------- join requests

    @Test
    void getJoinRequests_returnsPendingRequestsForManagers() {
        Person applicant = user("apply@test.dev", "Applicant", "App", 10);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
        when(joinRequestRepository.findAllByCommunityIdAndStatus(
                        community.getId(), JoinRequestStatus.PENDING))
                .thenReturn(List.of(joinRequest(applicant, JoinRequestStatus.PENDING)));

        List<JoinRequestRes> result = dataOf(communityService.getJoinRequests(community.getId()));

        assertEquals(1, result.size());
        assertEquals("App", result.get(0).displayName());
        assertNull(result.get(0).userEmail());
        assertEquals("Study Hall", result.get(0).communityName());
    }

    @Test
    void getJoinRequests_requiresManagerRole() {
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.MEMBER)));

        UUID id = community.getId();
        assertThrows(ValidationException.class, () -> communityService.getJoinRequests(id));
    }

    @Test
    void approveJoinRequest_promotesApplicantToMember() {
        Person applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(request.getId(), community.getId()))
                .thenReturn(Optional.of(request));
        when(joinRequestRepository.saveAndFlush(request)).thenReturn(request);
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), applicant.id()))
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
        Person applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(request.getId(), community.getId()))
                .thenReturn(Optional.of(request));
        when(joinRequestRepository.saveAndFlush(request)).thenReturn(request);
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), applicant.id()))
                .thenReturn(Optional.of(member(applicant, CommunityRole.MEMBER)));

        communityService.approveJoinRequest(community.getId(), request.getId());

        verify(memberRepository, never()).saveAndFlush(any());
    }

    @Test
    void approveJoinRequest_unknownRequestThrowsNotFound() {
        UUID requestId = UUID.randomUUID();
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));
        when(joinRequestRepository.findByIdAndCommunityId(requestId, community.getId()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        assertThrows(
                NotFoundException.class, () -> communityService.approveJoinRequest(id, requestId));
    }

    @Test
    void rejectJoinRequest_marksRequestRejected() {
        Person applicant = user("apply@test.dev", "Applicant", null, 10);
        CommunityJoinRequestEntity request = joinRequest(applicant, JoinRequestStatus.PENDING);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.ADMIN)));
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
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());

        UUID id = community.getId();
        assertThrows(
                ValidationException.class, () -> communityService.rejectJoinRequest(id, requestId));
    }

    // ----------------------------------------------------------- leaderboard

    @Test
    void getLeaderboard_ranksMembersByXpDescending() {
        Person low = user("low@test.dev", "Low", null, 10);
        Person high = user("high@test.dev", "High", null, 900);
        Person none = user("none@test.dev", "None", null, null);
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findAllByCommunityId(community.getId()))
                .thenReturn(
                        new ArrayList<>(
                                List.of(
                                        member(low, CommunityRole.MEMBER),
                                        member(high, CommunityRole.OWNER),
                                        member(none, CommunityRole.MEMBER))));
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.of(member(me, CommunityRole.OWNER)));

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
        when(communityRepository.findById(community.getId())).thenReturn(Optional.of(community));
        when(memberRepository.findAllByCommunityId(community.getId()))
                .thenReturn(new ArrayList<>());
        when(memberRepository.findByCommunityIdAndUserId(community.getId(), me.id()))
                .thenReturn(Optional.empty());
        when(joinRequestRepository.findByCommunityIdAndUserIdAndStatus(
                        community.getId(), me.id(), JoinRequestStatus.PENDING))
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
                () -> invokePrivate("listFallback", new Class<?>[] {Throwable.class}, validation));
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
                                        "listFallback", new Class<?>[] {Throwable.class}, cause),
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
                                "listFallback",
                                new Class<?>[] {Throwable.class},
                                new java.io.IOException("network"));

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
    }
}
