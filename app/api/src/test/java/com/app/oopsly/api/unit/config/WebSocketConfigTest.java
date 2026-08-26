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

package com.app.oopsly.api.unit.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.app.oopsly.api.config.WebSocketConfig;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.config.annotation.SockJsServiceRegistration;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

@ExtendWith(MockitoExtension.class)
class WebSocketConfigTest {

    @Mock private MessageBrokerRegistry messageBrokerRegistry;
    @Mock private StompEndpointRegistry stompEndpointRegistry;
    @Mock private StompWebSocketEndpointRegistration endpointRegistration;
    @Mock private SockJsServiceRegistration sockJsServiceRegistration;

    private WebSocketConfig webSocketConfig;

    @BeforeEach
    void setUp() {
        webSocketConfig = new WebSocketConfig();
    }

    @Test
    void configureMessageBroker_enablesQuizTopicsAndPrefixes() {
        webSocketConfig.configureMessageBroker(messageBrokerRegistry);

        verify(messageBrokerRegistry)
                .enableSimpleBroker(QuizChannels.TOPIC_PREFIX, QuizChannels.QUEUE_PREFIX);
        verify(messageBrokerRegistry).setApplicationDestinationPrefixes(QuizChannels.APP_PREFIX);
        verify(messageBrokerRegistry).setUserDestinationPrefix(QuizChannels.USER_PREFIX);
    }

    @Test
    void registerStompEndpoints_restrictsOriginsToTheConfiguredList() {
        ReflectionTestUtils.setField(
                webSocketConfig, "allowedOrigins", "http://localhost:8081,https://oopsly.app");
        when(stompEndpointRegistry.addEndpoint(QuizChannels.ENDPOINT))
                .thenReturn(endpointRegistration);
        when(endpointRegistration.setAllowedOriginPatterns(any(String[].class)))
                .thenReturn(endpointRegistration);
        when(endpointRegistration.withSockJS()).thenReturn(sockJsServiceRegistration);

        webSocketConfig.registerStompEndpoints(stompEndpointRegistry);

        ArgumentCaptor<String[]> captor = ArgumentCaptor.forClass(String[].class);
        verify(endpointRegistration).setAllowedOriginPatterns(captor.capture());
        org.junit.jupiter.api.Assertions.assertArrayEquals(
                new String[] {"http://localhost:8081", "https://oopsly.app"}, captor.getValue());
        verify(endpointRegistration).withSockJS();
    }

    @Test
    void registerStompEndpoints_singleOriginIsSupported() {
        ReflectionTestUtils.setField(webSocketConfig, "allowedOrigins", "https://oopsly.app");
        when(stompEndpointRegistry.addEndpoint(QuizChannels.ENDPOINT))
                .thenReturn(endpointRegistration);
        when(endpointRegistration.setAllowedOriginPatterns(any(String[].class)))
                .thenReturn(endpointRegistration);
        when(endpointRegistration.withSockJS()).thenReturn(sockJsServiceRegistration);

        webSocketConfig.registerStompEndpoints(stompEndpointRegistry);

        verify(stompEndpointRegistry).addEndpoint(QuizChannels.ENDPOINT);
    }
}
