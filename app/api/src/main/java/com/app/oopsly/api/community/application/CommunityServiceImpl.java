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
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.CircuitBreakerNames;
import com.app.oopsly.api.user.application.UserService;
import com.app.oopsly.api.user.domain.User;
import com.app.oopsly.api.user.infrastructure.UserRepository;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
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
    private final UserRepository userRepository;
    private final UserService userService;

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "readFallback")
    public ApiRes getAll() {
        User currentUser = userService.getCurrentUser();
        List<CommunityRes> result =
                communityRepository.findAllByDeletedFalse().stream()
                        .map(c -> toCommunityRes(c, currentUser))
                        .toList();
        return ApiRes.success(ApiMessages.COMMUNITY_LIST_FETCHED, result);
    }

    @Override
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "readFallback")
    public ApiRes getMyCommunities() {
        User currentUser = userService.getCurrentUser();
        List<CommunityRes> result =
                memberRepository.findAllByUserId(currentUser.getId()).stream()
                        .map(m -> toCommunityRes(m.getCommunity(), currentUser))
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
        User currentUser = userService.getCurrentUser();

        CommunityEntity community =
                CommunityEntity.builder()
                        .name(request.name().trim())
                        .description(request.description())
                        .icon(orDefault(request.icon(), CommunityConstants.DEFAULT_ICON))
                        .color(orDefault(request.color(), CommunityConstants.DEFAULT_COLOR))
                        .bannerUrl(request.bannerUrl())
                        .isPrivate(Boolean.TRUE.equals(request.isPrivate()))
                        .tags(request.tags() == null ? new ArrayList<>() : request.tags())
                        .owner(currentUser)
                        .build();
        communityRepository.saveAndFlush(community);

        memberRepository.saveAndFlush(
                CommunityMemberEntity.builder()
                        .community(community)
                        .user(currentUser)
                        .role(CommunityRole.OWNER)
                        .build());

        log.info("Community {} created by user {}", community.getId(), currentUser.getId());
        return ApiRes.created(
                ApiMessages.COMMUNITY_CREATED, toCommunityRes(community, currentUser));
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes join(UUID communityId, JoinCommunityReq request) {
        User currentUser = userService.getCurrentUser();
        CommunityEntity community = getCommunity(communityId);

        memberRepository
                .findByCommunityIdAndUserId(communityId, currentUser.getId())
                .ifPresent(
                        m -> {
                            throw new ValidationException(ApiMessages.COMMUNITY_ALREADY_MEMBER);
                        });

        if (Boolean.TRUE.equals(community.getIsPrivate())) {
            joinRequestRepository
                    .findByCommunityIdAndUserIdAndStatus(
                            communityId, currentUser.getId(), JoinRequestStatus.PENDING)
                    .ifPresent(
                            r -> {
                                throw new ValidationException(
                                        ApiMessages.COMMUNITY_REQUEST_PENDING);
                            });

            CommunityJoinRequestEntity joinRequest =
                    joinRequestRepository.saveAndFlush(
                            CommunityJoinRequestEntity.builder()
                                    .community(community)
                                    .user(currentUser)
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
                                .user(currentUser)
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
        User currentUser = userService.getCurrentUser();
        getCommunity(communityId);
        memberRepository.deleteByCommunityIdAndUserId(communityId, currentUser.getId());
        return ApiRes.success(ApiMessages.COMMUNITY_LEFT);
    }

    @Override
    @Transactional
    @CircuitBreaker(name = CircuitBreakerNames.COMMUNITY, fallbackMethod = "writeFallback")
    public ApiRes invite(UUID communityId, InviteMemberReq request) {
        CommunityEntity community = getCommunity(communityId);
        requireManager(community);

        String emailOrName = request.emailOrName().trim();
        User invited =
                userRepository
                        .findByEmail(emailOrName)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                ApiMessages.COMMUNITY_INVITE_USER_NOT_FOUND));

        CommunityMemberEntity member =
                memberRepository
                        .findByCommunityIdAndUserId(communityId, invited.getId())
                        .orElseGet(
                                () ->
                                        memberRepository.saveAndFlush(
                                                CommunityMemberEntity.builder()
                                                        .community(community)
                                                        .user(invited)
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
                        .findByCommunityIdAndUserId(communityId, joinRequest.getUser().getId())
                        .orElseGet(
                                () ->
                                        memberRepository.saveAndFlush(
                                                CommunityMemberEntity.builder()
                                                        .community(community)
                                                        .user(joinRequest.getUser())
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
        User currentUser = userService.getCurrentUser();
        CommunityEntity community = getCommunity(communityId);

        List<CommunityMemberEntity> members = memberRepository.findAllByCommunityId(communityId);
        members.sort(
                Comparator.comparingInt(
                                (CommunityMemberEntity m) -> safeInt(m.getUser().getTotalXp()))
                        .reversed());

        List<CommunityMemberRes> ranked = new ArrayList<>();
        for (int i = 0; i < members.size(); i++) {
            ranked.add(toMemberRes(members.get(i), i + 1));
        }

        return ApiRes.success(
                ApiMessages.COMMUNITY_LEADERBOARD_FETCHED,
                new CommunityLeaderboardRes(toCommunityRes(community, currentUser), ranked));
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
        User currentUser = userService.getCurrentUser();
        CommunityRole role =
                memberRepository
                        .findByCommunityIdAndUserId(community.getId(), currentUser.getId())
                        .map(CommunityMemberEntity::getRole)
                        .orElse(CommunityRole.NONE);
        if (role != CommunityRole.OWNER && role != CommunityRole.ADMIN) {
            throw new ValidationException(ApiMessages.COMMUNITY_NOT_ALLOWED);
        }
    }

    private CommunityRes toCommunityRes(CommunityEntity community, User currentUser) {
        CommunityRole role =
                memberRepository
                        .findByCommunityIdAndUserId(community.getId(), currentUser.getId())
                        .map(CommunityMemberEntity::getRole)
                        .orElseGet(
                                () ->
                                        joinRequestRepository
                                                        .findByCommunityIdAndUserIdAndStatus(
                                                                community.getId(),
                                                                currentUser.getId(),
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
                community.getOwner().getId(),
                displayNameOf(community.getOwner()),
                role,
                community.getTags(),
                community.getCreatedAt(),
                community.getUpdatedAt());
    }

    private CommunityMemberRes toMemberRes(CommunityMemberEntity member, int rank) {
        User user = member.getUser();
        return new CommunityMemberRes(
                member.getId(),
                member.getCommunity().getId(),
                user.getId(),
                displayNameOf(user),
                user.getPictureUrl(),
                member.getRole(),
                safeInt(user.getTotalXp()),
                safeInt(user.getDailyStreak()),
                safeInt(member.getCardsStudiedThisWeek()),
                rank,
                member.getJoinedAt());
    }

    private JoinRequestRes toJoinRequestRes(CommunityJoinRequestEntity request) {
        User user = request.getUser();
        return new JoinRequestRes(
                request.getId(),
                request.getCommunity().getId(),
                request.getCommunity().getName(),
                user.getId(),
                displayNameOf(user),
                user.getEmail(),
                user.getPictureUrl(),
                request.getMessage(),
                request.getStatus().name(),
                request.getRequestedAt());
    }

    private static String displayNameOf(User user) {
        return user.getDisplayName() != null ? user.getDisplayName() : user.getName();
    }

    private static String orDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }

    // -------------------------------------------------------------- fallbacks

    @SuppressWarnings("unused")
    private ApiRes readFallback(Throwable throwable) {
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
