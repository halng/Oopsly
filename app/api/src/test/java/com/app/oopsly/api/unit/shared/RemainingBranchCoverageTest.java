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

package com.app.oopsly.api.unit.shared;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.card.application.CardServiceImpl;
import com.app.oopsly.api.card.application.vm.CardItemReq;
import com.app.oopsly.api.card.application.vm.ReviewResultRes;
import com.app.oopsly.api.card.application.vm.UpdateDifficultyReq;
import com.app.oopsly.api.card.domain.CardEntity;
import com.app.oopsly.api.card.domain.DifficultyLevel;
import com.app.oopsly.api.card.infrastructure.CardRepository;
import com.app.oopsly.api.library.application.SubjectServiceImpl;
import com.app.oopsly.api.library.application.vm.SubjectSettingReq;
import com.app.oopsly.api.library.domain.ShelfEntity;
import com.app.oopsly.api.library.domain.SubjectEntity;
import com.app.oopsly.api.library.infrastructure.ShelfRepository;
import com.app.oopsly.api.library.infrastructure.SubjectRepository;
import com.app.oopsly.api.shared.application.vm.ApiRes;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.RetryLaterException;
import com.app.oopsly.api.shared.exception.SendEmailException;
import com.app.oopsly.api.shared.exception.UnauthenticatedException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.messaging.IEmailSender;
import com.app.oopsly.api.stats.infrastructure.ReviewLogRepository;
import com.app.oopsly.api.testsuite.application.TestSuiteService;
import com.app.oopsly.api.testsuite.application.vm.TestSubmissionReq;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import com.app.oopsly.api.testsuite.interfaces.rest.TestSuiteController;
import com.app.oopsly.api.user.application.OTPServiceImpl;
import com.app.oopsly.api.user.application.UserService;
import com.app.oopsly.api.user.application.UserServiceImpl;
import com.app.oopsly.api.user.application.vm.OTPReq;
import com.app.oopsly.api.user.application.vm.RefreshTokenReq;
import com.app.oopsly.api.user.domain.User;
import jakarta.mail.MessagingException;
import java.io.IOException;
import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

/**
 * Targeted tests closing the last uncovered branches: not-found guards, null-safe XP totals,
 * asynchronous e-mail failure paths and the request/response view models.
 */
@DisplayName("Remaining branch coverage")
class RemainingBranchCoverageTest {

    @Nested
    @DisplayName("OTPReq view model")
    class ViewModelTest {

        @Test
        @DisplayName("equals should treat requests with identical fields as equal")
        void equals_shouldTreatRequestsAsEqual_whenAllFieldsMatch() {
            OTPReq first = new OTPReq("learner@test.dev", "123456");
            OTPReq same = new OTPReq("learner@test.dev", "123456");
            OTPReq other = new OTPReq("learner@test.dev", "654321");

            assertEquals(first, same);
            assertEquals(first.hashCode(), same.hashCode());
            assertNotEquals(first, other);
            assertNotEquals(first, null);
            assertNotEquals(first, "not an OTPReq");
            assertEquals("learner@test.dev", first.email());
            assertEquals("123456", first.otp());
            assertTrue(first.toString().contains("learner@test.dev"));
        }

        @Test
        @DisplayName("accessors should return null without failing when fields are not provided")
        void accessors_shouldReturnNull_whenFieldsAreNotProvided() {
            OTPReq empty = new OTPReq(null, null);

            assertNull(empty.email());
            assertNull(empty.otp());
            assertEquals(new OTPReq(null, null), empty);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("CardServiceImpl guards")
    class CardServiceTest {

        @Mock private CardRepository cardRepository;
        @Mock private SubjectRepository subjectRepository;
        @Mock private ShelfRepository shelfRepository;
        @Mock private TestSuiteRepository testSuiteRepository;
        @Mock private UserService userService;
        @Mock private ReviewLogRepository reviewLogRepository;

        @InjectMocks private CardServiceImpl cardService;

        private final UUID shelfId = UUID.randomUUID();
        private final UUID subjectId = UUID.randomUUID();
        private final UUID cardId = UUID.randomUUID();

        private SubjectEntity resolveSubject() {
            User user = new User();
            user.setId(UUID.randomUUID());

            ShelfEntity shelf = new ShelfEntity();
            shelf.setId(shelfId);
            shelf.setUser(user);

            SubjectEntity subject = new SubjectEntity();
            subject.setId(subjectId);
            subject.setShelf(shelf);

            when(userService.getCurrentUser()).thenReturn(user);
            when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
            when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                    .thenReturn(Optional.of(subject));
            return subject;
        }

        @Test
        @DisplayName("updateCard should throw NotFoundException when the card does not exist")
        void updateCard_shouldThrowNotFoundException_whenCardDoesNotExist() {
            SubjectEntity subject = resolveSubject();
            when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.empty());

            CardItemReq item = new CardItemReq("front", "back");
            assertThrows(
                    NotFoundException.class,
                    () -> cardService.updateCard(shelfId, subjectId, cardId, item));
            verify(cardRepository, never()).save(any());
        }

        @Test
        @DisplayName("updateDifficulty should report the gained XP as total when the user has none")
        void updateDifficulty_shouldReportGainedXpAsTotal_whenUserTotalXpIsNull() {
            SubjectEntity subject = resolveSubject();

            CardEntity card = new CardEntity();
            card.setId(cardId);
            card.setSubject(subject);
            card.setFront("front");
            card.setBack("back");
            card.setNumberOfPractice(0);

            User user = userService.getCurrentUser();
            user.setTotalXp(null);

            when(cardRepository.findByIdAndSubject(cardId, subject)).thenReturn(Optional.of(card));

            ApiRes response =
                    cardService.updateDifficulty(
                            shelfId,
                            subjectId,
                            List.of(new UpdateDifficultyReq(cardId, DifficultyLevel.GOOD.name())));

            ReviewResultRes result = (ReviewResultRes) response.getBody().data();
            assertTrue(result.xpGained() > 0);
            assertEquals(result.xpGained(), result.totalXp());
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("SubjectServiceImpl guards")
    class SubjectServiceTest {

        @Mock private SubjectRepository subjectRepository;
        @Mock private ShelfRepository shelfRepository;
        @Mock private UserService userService;
        @Mock private com.app.oopsly.api.card.application.CardService cardService;
        @Mock private CardRepository cardRepository;

        @InjectMocks private SubjectServiceImpl subjectService;

        @Test
        @DisplayName("updateSetting should throw NotFoundException when the subject does not exist")
        void updateSetting_shouldThrowNotFoundException_whenSubjectDoesNotExist() {
            UUID shelfId = UUID.randomUUID();
            UUID subjectId = UUID.randomUUID();

            User user = new User();
            user.setId(UUID.randomUUID());
            ShelfEntity shelf = new ShelfEntity();
            shelf.setId(shelfId);
            shelf.setUser(user);

            when(userService.getCurrentUser()).thenReturn(user);
            when(shelfRepository.findByIdAndUser(shelfId, user)).thenReturn(Optional.of(shelf));
            when(subjectRepository.findByIdAndShelve(subjectId, shelf))
                    .thenReturn(Optional.empty());

            SubjectSettingReq request = new SubjectSettingReq(10, 5, 1);
            assertThrows(
                    NotFoundException.class,
                    () -> subjectService.updateSetting(shelfId, subjectId, request));
            verify(subjectRepository, never()).save(any());
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @MockitoSettings(strictness = Strictness.LENIENT)
    @DisplayName("UserServiceImpl refresh token fallback")
    class UserServiceTest {

        @InjectMocks private UserServiceImpl userService;

        @Test
        @DisplayName(
                "refreshTokenFallback should rethrow the original error when it is a validation"
                        + " failure")
        void refreshTokenFallback_shouldRethrowOriginalError_whenCauseIsValidationException() {
            RefreshTokenReq request = new RefreshTokenReq("learner@test.dev", "token");
            ValidationException cause = new ValidationException("token is malformed");

            assertSame(
                    cause,
                    assertThrows(
                            ValidationException.class,
                            () -> userService.refreshTokenFallback(request, cause)));
        }

        @Test
        @DisplayName(
                "refreshTokenFallback should rethrow the original error when the session expired")
        void refreshTokenFallback_shouldRethrowOriginalError_whenCauseIsUnauthenticatedException() {
            RefreshTokenReq request = new RefreshTokenReq("learner@test.dev", "token");
            UnauthenticatedException cause = new UnauthenticatedException("session expired");

            assertSame(
                    cause,
                    assertThrows(
                            UnauthenticatedException.class,
                            () -> userService.refreshTokenFallback(request, cause)));
        }

        @Test
        @DisplayName(
                "refreshTokenFallback should degrade to retry-later when the cause is an outage")
        void refreshTokenFallback_shouldDegradeToRetryLater_whenCauseIsInfrastructureFailure() {
            RefreshTokenReq request = new RefreshTokenReq("learner@test.dev", "token");

            assertThrows(
                    RetryLaterException.class,
                    () ->
                            userService.refreshTokenFallback(
                                    request, new IllegalStateException("redis down")));
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("OTPServiceImpl asynchronous e-mail delivery")
    class OtpAsyncEmailTest {

        @Mock private IEmailSender emailSender;
        @Mock private com.app.oopsly.api.user.infrastructure.UserRepository userRepository;

        @Mock private org.springframework.data.redis.core.StringRedisTemplate stringRedisTemplate;

        @Mock private com.app.oopsly.api.shared.util.JwtUtils jwtUtils;
        @Mock private com.app.oopsly.api.config.AppConfig appConfig;

        private OTPServiceImpl otpService;

        private void invokeAsyncEmail(String email, String otp) throws Exception {
            otpService =
                    new OTPServiceImpl(
                            emailSender, userRepository, stringRedisTemplate, jwtUtils, appConfig);
            Method method =
                    OTPServiceImpl.class.getDeclaredMethod(
                            "sendAsyncEmail", String.class, String.class);
            method.setAccessible(true);
            method.invoke(otpService, email, otp);
            // the async task runs on the common pool, give it a chance to complete
            Thread.sleep(200);
        }

        @Test
        @DisplayName("sendAsyncEmail should deliver the OTP when the mail provider is healthy")
        void sendAsyncEmail_shouldDeliverTheOtp_whenMailProviderIsHealthy() throws Exception {
            invokeAsyncEmail("learner@test.dev", "123456");

            verify(emailSender, timeout(1000)).sendEmail("learner@test.dev", "123456");
        }

        @Test
        @DisplayName("sendAsyncEmail should not propagate the error when SMTP delivery fails")
        void sendAsyncEmail_shouldNotPropagateError_whenSmtpDeliveryFails() throws Exception {
            doThrow(new MessagingException("smtp down"))
                    .when(emailSender)
                    .sendEmail(anyString(), anyString());

            assertDoesNotThrow(() -> invokeAsyncEmail("learner@test.dev", "123456"));
            verify(emailSender, timeout(1000)).sendEmail("learner@test.dev", "123456");
        }

        @Test
        @DisplayName(
                "sendAsyncEmail should not propagate the error when the template cannot be read")
        void sendAsyncEmail_shouldNotPropagateError_whenIoFailureOccurs() throws Exception {
            doThrow(new IOException("template missing"))
                    .when(emailSender)
                    .sendEmail(anyString(), anyString());

            assertDoesNotThrow(() -> invokeAsyncEmail("learner@test.dev", "123456"));
        }

        @Test
        @DisplayName(
                "sendAsyncEmail should not propagate the error when the provider rejects the"
                        + " message")
        void sendAsyncEmail_shouldNotPropagateError_whenRuntimeFailureOccurs() throws Exception {
            doThrow(new SendEmailException("provider rejected the message"))
                    .when(emailSender)
                    .sendEmail(anyString(), anyString());

            assertDoesNotThrow(() -> invokeAsyncEmail("learner@test.dev", "123456"));
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    @DisplayName("TestSuiteController submit endpoint")
    class TestSuiteControllerSubmitTest {

        @Mock private TestSuiteService testSuiteService;

        @InjectMocks private TestSuiteController testSuiteController;

        @Test
        @DisplayName("submitRun should delegate to the service when the submission is valid")
        void submitRun_shouldDelegateToService_whenSubmissionIsValid() {
            UUID shelveId = UUID.randomUUID();
            UUID suiteId = UUID.randomUUID();
            TestSubmissionReq request = new TestSubmissionReq(Map.of(UUID.randomUUID(), 1), 120);
            ApiRes expected = ApiRes.success("submitted");
            when(testSuiteService.submit(shelveId, suiteId, request)).thenReturn(expected);

            assertSame(expected, testSuiteController.submitRun(shelveId, suiteId, request));
            verify(testSuiteService).submit(shelveId, suiteId, request);
        }

        @Test
        @DisplayName("submitRun should propagate NotFoundException when the suite is missing")
        void submitRun_shouldPropagateNotFoundException_whenSuiteIsMissing() {
            UUID shelveId = UUID.randomUUID();
            UUID suiteId = UUID.randomUUID();
            TestSubmissionReq request = new TestSubmissionReq(Map.of(), 0);
            when(testSuiteService.submit(shelveId, suiteId, request))
                    .thenThrow(new NotFoundException("suite is gone"));

            assertThrows(
                    NotFoundException.class,
                    () -> testSuiteController.submitRun(shelveId, suiteId, request));
        }
    }
}
