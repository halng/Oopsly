package com.app.oopsly.api;

import com.app.oopsly.api.shared.application.vm.ApiRes;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class ApiController {
    @RequestMapping("/ping")
    public ApiRes ping() {
        return ApiRes.ok("pong");
    }
}
