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

package com.app.oopsly.api.community.domain;

/** Domain level constants of the community context. */
public final class CommunityConstants {

    private CommunityConstants() {}

    public static final String JOIN_STATUS_JOINED = "JOINED";
    public static final String JOIN_STATUS_REQUEST_SENT = "REQUEST_SENT";
    public static final String DEFAULT_ICON = "Users";
    public static final String DEFAULT_COLOR = "#8BC34A";
    public static final String DEFAULT_JOIN_MESSAGE =
            "I would like to join your learning community!";
}
