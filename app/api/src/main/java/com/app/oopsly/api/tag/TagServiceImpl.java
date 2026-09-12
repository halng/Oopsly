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

package com.app.oopsly.api.tag;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.tag.vm.TagRes;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;
    private final UserService userService;

    @Override
    public ApiRes createTag(String name) {
        User currentUser = userService.getCurrentUser();
        if (tagRepository.existsByNameAndUser(name, currentUser)) {
            throw new ValidationException("Tag with name '" + name + "' already exists");
        }
        Tag tag = Tag.builder().name(name).user(currentUser).build();
        Tag saved = tagRepository.save(tag);
        log.info("Created tag: {} for user: {}", saved.getId(), currentUser.getId());
        return ApiRes.created(
                "Tag created successfully", new TagRes(saved.getId(), saved.getName()));
    }

    @Override
    public ApiRes getAllTags() {
        User currentUser = userService.getCurrentUser();
        List<TagRes> tags =
                tagRepository.findAllByUser(currentUser).stream()
                        .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                        .map(t -> new TagRes(t.getId(), t.getName()))
                        .collect(Collectors.toList());
        return ApiRes.success("Tags fetched successfully", tags);
    }

    @Override
    public ApiRes deleteTag(UUID tagId) {
        User currentUser = userService.getCurrentUser();
        Tag tag =
                tagRepository
                        .findByIdAndUser(tagId, currentUser)
                        .orElseThrow(
                                () -> new NotFoundException("Tag not found with id: " + tagId));
        tag.setDeleted(true);
        tagRepository.save(tag);
        log.info("Soft-deleted tag: {}", tagId);
        return ApiRes.success("Tag deleted successfully");
    }
}
