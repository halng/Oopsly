/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.service.impl;

import com.app.osmosis.api.config.secutity.UserSessionHelper;
import com.app.osmosis.api.service.DeckService;
import com.app.osmosis.api.viewmodel.ApiRes;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class DeckServiceImpl implements DeckService {

  private final UserSessionHelper userSessionHelper;

  public DeckServiceImpl(UserSessionHelper userSessionHelper) {
    this.userSessionHelper = userSessionHelper;
  }

  @Override
  public ApiRes createDeck() {
    log.info("Create deck");

    return ApiRes.ok("Deck created by " + userSessionHelper.getCurrentUser());
  }
}
