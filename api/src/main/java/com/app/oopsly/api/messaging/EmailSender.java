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

package com.app.oopsly.api.messaging;

import com.app.oopsly.api.util.Constant;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.Resource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

@Profile("!test & !integration")
@Component
public class EmailSender implements IEmailSender {
    private final JavaMailSender mailSender;

    @Value("classpath:template/email-otp.html")
    private Resource emailTemplate;

    @Value("${spring.mail.username}")
    private String from;

    public EmailSender(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    public void sendEmail(String to, String otp) throws IOException, MessagingException {
        // TODO: make this function generic for other email types
        String htmlContent =
                StreamUtils.copyToString(emailTemplate.getInputStream(), StandardCharsets.UTF_8);

        htmlContent = htmlContent.replace("{{OTP_CODE}}", otp);
        htmlContent = htmlContent.replace("{{USER_NAME}}", to.split("@")[0]);

        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setTo(to);
        helper.setSubject(Constant.OTP_SUBJECT);
        helper.setText(htmlContent, true);
        helper.setFrom(from);

        mailSender.send(message);
    }
}
