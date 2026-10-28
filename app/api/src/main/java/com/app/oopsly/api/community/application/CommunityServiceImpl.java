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

package com.app.oopsly.api.community.application;

import com.app.oopsly.api.community.application.vm.CommunityLeaderboardRes;
import com.app.oopsly.api.community.application.vm.CommunityMemberRes;
import com.app.oopsly.api.community.application.vm.CommunityRes;
import com.app.oopsly.api.community.application.vm.CreateCommunityReq;
import com.app.oopsly.api.community.application.vm.InviteMemberReq;
import com.app.oopsly.api.community.application.vm.JoinCommunityReq;
import com.app.oopsly.api.community.application.vm.JoinCommunityRes;
import com.app.oopsly.api.community.application.vm.JoinRequestRes;
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
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CommunityServiceImpl implements CommunityService {

    private final CommunityRepository communityRepository;
    private final CommunityMemberRepository memberRepository;
    private final CommunityJoinRequestRepository joinRequestRepository;
    private final UserProgressRepository progressRepository;
    private final AuthClient authClient;
    private final CurrentUser currentUser;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "listFallback")
    public ApiRes getAll() {
        UUID userId = currentUser.id();
        List<CommunityRes> result =
                communityRepository.findAllByDeletedFalse().stream()
                        .map(c -> toCommunityRes(c, userId))
                        .toList();
        return ApiRes.success(ApiMessages.COMMUNITY_LIST_FETCHED, result);
    }

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "listFallback")
    public ApiRes getMyCommunities() {
        UUID userId = currentUser.id();
        List<CommunityRes> result =
                memberRepository.findAllByUserId(userId).stream()
                        .map(m -> toCommunityRes(m.getCommunity(), userId))
                        .toList();
        return ApiRes.success(ApiMessages.COMMUNITY_MY_LIST_FETCHED, result);
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes create(CreateCommunityReq request) {
        if (request.name() == null || request.name().isBlank()) {
            throw new ValidationException(ApiMessages.COMMUNITY_NAME_REQUIRED);
        }
        UUID userId = currentUser.id();

        CommunityEntity community =
                CommunityEntity.builder()
                        .name(request.name().trim())
                        .description(request.description())
                        .icon(orDefault(request.icon(), CommunityConstants.DEFAULT_ICON))
                        .color(orDefault(request.color(), CommunityConstants.DEFAULT_COLOR))
                        .bannerUrl(request.bannerUrl())
                        .isPrivate(Boolean.TRUE.equals(request.isPrivate()))
                        .tags(request.tags() == null ? new ArrayList<>() : request.tags())
                        .ownerId(userId)
                        .build();
        communityRepository.saveAndFlush(community);

        memberRepository.saveAndFlush(
                CommunityMemberEntity.builder()
                        .community(community)
                        .userId(userId)
                        .role(CommunityRole.OWNER)
                        .build());

        log.info("Community {} created by user {}", community.getId(), userId);
        return ApiRes.created(ApiMessages.COMMUNITY_CREATED, toCommunityRes(community, userId));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes join(UUID communityId, JoinCommunityReq request) {
        UUID userId = currentUser.id();
        CommunityEntity community = getCommunity(communityId);

        memberRepository
                .findByCommunityIdAndUserId(communityId, userId)
                .ifPresent(
                        m -> {
                            throw new ValidationException(ApiMessages.COMMUNITY_ALREADY_MEMBER);
                        });

        if (Boolean.TRUE.equals(community.getIsPrivate())) {
            joinRequestRepository
                    .findByCommunityIdAndUserIdAndStatus(
                            communityId, userId, JoinRequestStatus.PENDING)
                    .ifPresent(
                            r -> {
                                throw new ValidationException(
                                        ApiMessages.COMMUNITY_REQUEST_PENDING);
                            });

            CommunityJoinRequestEntity joinRequest =
                    joinRequestRepository.saveAndFlush(
                            CommunityJoinRequestEntity.builder()
                                    .community(community)
                                    .userId(userId)
                                    .message(
                                            orDefault(
                                                    request == null ? null : request.message(),
                                                    CommunityConstants.DEFAULT_JOIN_MESSAGE))
                                    .status(JoinRequestStatus.PENDING)
                                    .build());

            return ApiRes.success(
                    ApiMessages.COMMUNITY_JOIN_REQUEST_SENT,
                    new JoinCommunityRes(
                            CommunityConstants.JOIN_STATUS_REQUEST_SENT,
                            null,
                            toJoinRequestRes(joinRequest)));
        }

        CommunityMemberEntity member =
                memberRepository.saveAndFlush(
                        CommunityMemberEntity.builder()
                                .community(community)
                                .userId(userId)
                                .role(CommunityRole.MEMBER)
                                .build());

        return ApiRes.success(
                ApiMessages.COMMUNITY_JOINED,
                new JoinCommunityRes(
                        CommunityConstants.JOIN_STATUS_JOINED, toMemberRes(member, 0), null));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes leave(UUID communityId) {
        getCommunity(communityId);
        memberRepository.deleteByCommunityIdAndUserId(communityId, currentUser.id());
        return ApiRes.success(ApiMessages.COMMUNITY_LEFT);
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes invite(UUID communityId, InviteMemberReq request) {
        CommunityEntity community = getCommunity(communityId);
        requireManager(community);

        // The auth service owns user lookup; members can only be invited by user id for now.
        UUID invitedId = parseUserId(request.emailOrName().trim());
        if (authClient.lookup(invitedId).equals(AuthProfile.unknown(invitedId))) {
            throw new NotFoundException(ApiMessages.COMMUNITY_INVITE_USER_NOT_FOUND);
        }

        CommunityMemberEntity member =
                memberRepository
                        .findByCommunityIdAndUserId(communityId, invitedId)
                        .orElseGet(
                                () ->
                                        memberRepository.saveAndFlush(
                                                CommunityMemberEntity.builder()
                                                        .community(community)
                                                        .userId(invitedId)
                                                        .role(CommunityRole.MEMBER)
                                                        .build()));

        return ApiRes.success(ApiMessages.COMMUNITY_MEMBER_INVITED, toMemberRes(member, 0));
    }

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "readFallback")
    public ApiRes getJoinRequests(UUID communityId) {
        CommunityEntity community = getCommunity(communityId);
        requireManager(community);
        List<JoinRequestRes> requests =
                joinRequestRepository
                        .findAllByCommunityIdAndStatus(communityId, JoinRequestStatus.PENDING)
                        .stream()
                        .map(this::toJoinRequestRes)
                        .toList();
        return ApiRes.success(ApiMessages.COMMUNITY_REQUESTS_FETCHED, requests);
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes approveJoinRequest(UUID communityId, UUID requestId) {
        CommunityEntity community = getCommunity(communityId);
        requireManager(community);
        CommunityJoinRequestEntity joinRequest = getJoinRequest(communityId, requestId);

        joinRequest.setStatus(JoinRequestStatus.APPROVED);
        joinRequestRepository.saveAndFlush(joinRequest);

        CommunityMemberEntity member =
                memberRepository
                        .findByCommunityIdAndUserId(communityId, joinRequest.getUserId())
                        .orElseGet(
                                () ->
                                        memberRepository.saveAndFlush(
                                                CommunityMemberEntity.builder()
                                                        .community(community)
                                                        .userId(joinRequest.getUserId())
                                                        .role(CommunityRole.MEMBER)
                                                        .build()));

        return ApiRes.success(ApiMessages.COMMUNITY_REQUEST_APPROVED, toMemberRes(member, 0));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes rejectJoinRequest(UUID communityId, UUID requestId) {
        CommunityEntity community = getCommunity(communityId);
        requireManager(community);
        CommunityJoinRequestEntity joinRequest = getJoinRequest(communityId, requestId);
        joinRequest.setStatus(JoinRequestStatus.REJECTED);
        joinRequestRepository.saveAndFlush(joinRequest);
        return ApiRes.success(
                ApiMessages.COMMUNITY_REQUEST_REJECTED, toJoinRequestRes(joinRequest));
    }

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "readFallback")
    public ApiRes getLeaderboard(UUID communityId) {
        UUID userId = currentUser.id();
        CommunityEntity community = getCommunity(communityId);

        List<CommunityMemberEntity> members =
                new ArrayList<>(memberRepository.findAllByCommunityId(communityId));
        List<UUID> memberIds = members.stream().map(CommunityMemberEntity::getUserId).toList();
        Map<UUID, UserProgress> progress =
                progressRepository.findAllByUserIdIn(memberIds).stream()
                        .collect(Collectors.toMap(UserProgress::getUserId, Function.identity()));
        Map<UUID, AuthProfile> profiles = authClient.lookup(memberIds);
        members.sort(
                Comparator.comparingInt(
                                (CommunityMemberEntity m) ->
                                        progress.containsKey(m.getUserId())
                                                ? safeInt(progress.get(m.getUserId()).getTotalXp())
                                                : 0)
                        .reversed());

        List<CommunityMemberRes> ranked = new ArrayList<>();
        for (int i = 0; i < members.size(); i++) {
            CommunityMemberEntity member = members.get(i);
            ranked.add(
                    toMemberRes(
                            member,
                            i + 1,
                            profiles.get(member.getUserId()),
                            progress.get(member.getUserId())));
        }

        return ApiRes.success(
                ApiMessages.COMMUNITY_LEADERBOARD_FETCHED,
                new CommunityLeaderboardRes(toCommunityRes(community, userId), ranked));
    }

    // ---------------------------------------------------------------- helpers

    private CommunityEntity getCommunity(UUID communityId) {
        return communityRepository
                .findById(communityId)
                .orElseThrow(() -> new NotFoundException(ApiMessages.COMMUNITY_NOT_FOUND));
    }

    private CommunityJoinRequestEntity getJoinRequest(UUID communityId, UUID requestId) {
        return joinRequestRepository
                .findByIdAndCommunityId(requestId, communityId)
                .orElseThrow(() -> new NotFoundException(ApiMessages.COMMUNITY_REQUEST_NOT_FOUND));
    }

    private void requireManager(CommunityEntity community) {
        CommunityRole role =
                memberRepository
                        .findByCommunityIdAndUserId(community.getId(), currentUser.id())
                        .map(CommunityMemberEntity::getRole)
                        .orElse(CommunityRole.NONE);
        if (role != CommunityRole.OWNER && role != CommunityRole.ADMIN) {
            throw new ValidationException(ApiMessages.COMMUNITY_NOT_ALLOWED);
        }
    }

    private CommunityRes toCommunityRes(CommunityEntity community, UUID userId) {
        CommunityRole role =
                memberRepository
                        .findByCommunityIdAndUserId(community.getId(), userId)
                        .map(CommunityMemberEntity::getRole)
                        .orElseGet(
                                () ->
                                        joinRequestRepository
                                                        .findByCommunityIdAndUserIdAndStatus(
                                                                community.getId(),
                                                                userId,
                                                                JoinRequestStatus.PENDING)
                                                        .isPresent()
                                                ? CommunityRole.PENDING
                                                : CommunityRole.NONE);

        return new CommunityRes(
                community.getId(),
                community.getName(),
                community.getDescription(),
                community.getIcon(),
                community.getColor(),
                community.getBannerUrl(),
                Boolean.TRUE.equals(community.getIsPrivate()),
                memberRepository.countByCommunityId(community.getId()),
                community.getOwnerId(),
                authClient.lookup(community.getOwnerId()).label(),
                role,
                community.getTags(),
                community.getCreatedAt(),
                community.getUpdatedAt());
    }

    private CommunityMemberRes toMemberRes(CommunityMemberEntity member, int rank) {
        UUID memberUserId = member.getUserId();
        return toMemberRes(
                member,
                rank,
                authClient.lookup(memberUserId),
                progressRepository.findByUserId(memberUserId).orElse(null));
    }

    private CommunityMemberRes toMemberRes(
            CommunityMemberEntity member, int rank, AuthProfile profile, UserProgress progress) {
        return new CommunityMemberRes(
                member.getId(),
                member.getCommunity().getId(),
                member.getUserId(),
                profile.label(),
                profile.pictureUrl(),
                member.getRole(),
                safeInt(progress == null ? null : progress.getTotalXp()),
                safeInt(progress == null ? null : progress.getDailyStreak()),
                safeInt(member.getCardsStudiedThisWeek()),
                rank,
                member.getJoinedAt());
    }

    private JoinRequestRes toJoinRequestRes(CommunityJoinRequestEntity request) {
        AuthProfile profile = authClient.lookup(request.getUserId());
        return new JoinRequestRes(
                request.getId(),
                request.getCommunity().getId(),
                request.getCommunity().getName(),
                request.getUserId(),
                profile.label(),
                null,
                profile.pictureUrl(),
                request.getMessage(),
                request.getStatus().name(),
                request.getRequestedAt());
    }

    private static UUID parseUserId(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException e) {
            throw new NotFoundException(ApiMessages.COMMUNITY_INVITE_USER_NOT_FOUND);
        }
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    // -------------------------------------------------------------- fallbacks

    @SuppressWarnings("unused")
    private ApiRes listFallback(Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes readFallback(UUID communityId, Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes writeFallback(CreateCommunityReq request, Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes writeFallback(UUID communityId, Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes writeFallback(UUID communityId, JoinCommunityReq request, Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes writeFallback(UUID communityId, InviteMemberReq request, Throwable throwable) {
        return communityFallback(throwable);
    }

    @SuppressWarnings("unused")
    private ApiRes writeFallback(UUID communityId, UUID requestId, Throwable throwable) {
        return communityFallback(throwable);
    }

    private ApiRes communityFallback(Throwable throwable) {
        if (throwable instanceof RuntimeException runtimeException) {
            // Domain errors must keep their user-facing message
            if (throwable instanceof NotFoundException
                    || throwable instanceof ValidationException) {
                throw runtimeException;
            }
        }
        log.error("Community service degraded: {}", throwable.getMessage(), throwable);
        return ApiRes.retryLater(ApiMessages.COMMUNITY_UNAVAILABLE);
    }
}
