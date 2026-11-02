package com.app.quizi.api;

import com.app.quizi.api.shared.application.vm.ApiRes;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1")
public class ApiController {
    @GetMapping("/ping")
    public ApiRes ping() {
        return ApiRes.ok("pong");
    }
}
