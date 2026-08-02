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

package com.app.oopsly.api.unit.messaging;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.messaging.EmailSender;
import com.app.oopsly.api.util.Constant;
import jakarta.mail.Address;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class EmailSenderTest {

    @Mock private JavaMailSender mailSender;

    @Mock private Resource emailTemplate;

    @Mock private MimeMessage mimeMessage;

    @InjectMocks private EmailSender emailSender;

    private final String SENDER_EMAIL = "noreply@example.com";
    private final String DUMMY_TEMPLATE =
            "<html><body>Hi {{USER_NAME}}, your code is {{OTP_CODE}}</body></html>";

    @BeforeEach
    void setUp() {
        // Manually inject values into private fields since we aren't using Spring Context
        ReflectionTestUtils.setField(emailSender, "from", SENDER_EMAIL);
        ReflectionTestUtils.setField(emailSender, "emailTemplate", emailTemplate);
    }

    @Test
    @DisplayName("Should send email successfully with replaced placeholders")
    void sendEmail_Success() throws IOException, MessagingException {
        // Arrange
        String to = "user@example.com";
        String otp = "123456";

        // 1. Mock the template input stream
        InputStream templateStream =
                new ByteArrayInputStream(DUMMY_TEMPLATE.getBytes(StandardCharsets.UTF_8));
        when(emailTemplate.getInputStream()).thenReturn(templateStream);

        // 2. Mock the MimeMessage creation
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        // Act
        emailSender.sendEmail(to, otp);

        // Assert
        // 1. Verify send was called
        verify(mailSender).send(mimeMessage);

        // 2. Verify Subject (Must accept the 2nd argument "UTF-8")
        verify(mimeMessage).setSubject(eq(Constant.OTP_SUBJECT), anyString());

        // 3. Verify Recipient
        // MimeMessageHelper calls setRecipient(Type, Address), so we must match that signature
        verify(mimeMessage)
                .setRecipient(
                        eq(jakarta.mail.Message.RecipientType.TO),
                        argThat(address -> address.toString().contains(to)));

        // 4. Verify Sender (Matches the helper.setFrom() call)
        verify(mimeMessage)
                .setFrom((Address) argThat(address -> address.toString().contains(SENDER_EMAIL)));
    }

    @Test
    @DisplayName("Should throw IOException when template cannot be read")
    void sendEmail_TemplateReadError() throws IOException {
        // Arrange
        String to = "test@example.com";
        String otp = "123456";

        // Mock an exception when reading the file
        when(emailTemplate.getInputStream()).thenThrow(new IOException("File not found"));

        // Act & Assert
        assertThrows(
                IOException.class,
                () -> {
                    emailSender.sendEmail(to, otp);
                });

        // Ensure we never tried to send an email if the template failed
        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Should propagate MessagingException when sending fails")
    void sendEmail_SendingError() throws IOException, MessagingException {
        // Arrange
        String to = "test@example.com";
        String otp = "123456";

        InputStream templateStream =
                new ByteArrayInputStream(DUMMY_TEMPLATE.getBytes(StandardCharsets.UTF_8));
        when(emailTemplate.getInputStream()).thenReturn(templateStream);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        // Mock the send method to throw an exception
        doThrow(new org.springframework.mail.MailSendException("SMTP server down"))
                .when(mailSender)
                .send(mimeMessage);

        // Act & Assert
        // MailSendException is a RuntimeException, usually wrapping MessagingException logic in
        // Spring
        assertThrows(
                org.springframework.mail.MailSendException.class,
                () -> {
                    emailSender.sendEmail(to, otp);
                });
    }
}
