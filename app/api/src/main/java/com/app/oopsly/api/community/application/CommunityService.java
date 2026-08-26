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

import com.app.oopsly.api.community.application.vm.CreateCommunityReq;
import com.app.oopsly.api.community.application.vm.InviteMemberReq;
import com.app.oopsly.api.community.application.vm.JoinCommunityReq;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import java.util.UUID;

public interface CommunityService {

    ApiRes getAll();

    ApiRes getMyCommunities();

    ApiRes create(CreateCommunityReq request);

    ApiRes join(UUID communityId, JoinCommunityReq request);

    ApiRes leave(UUID communityId);

    ApiRes invite(UUID communityId, InviteMemberReq request);

    ApiRes getJoinRequests(UUID communityId);

    ApiRes approveJoinRequest(UUID communityId, UUID requestId);

    ApiRes rejectJoinRequest(UUID communityId, UUID requestId);

    ApiRes getLeaderboard(UUID communityId);
}
