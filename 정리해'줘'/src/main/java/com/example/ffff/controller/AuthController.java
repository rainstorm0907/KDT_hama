package com.example.ffff.controller;

import com.example.ffff.dto.LoginRequestDto;
import com.example.ffff.dto.PasswordResetRequestDto;
import com.example.ffff.dto.SignupRequestDto;
import com.example.ffff.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;

    private final SecurityContextRepository securityContextRepository =
            new HttpSessionSecurityContextRepository();

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequestDto req) {
        Map<String, String> response = new HashMap<>();

        try {
            userService.signup(req);

            response.put("message", "회원가입에 성공했습니다.");
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            response.put("message", "회원가입 중 오류가 발생했습니다.");
            return ResponseEntity.internalServerError().body(response);
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestBody LoginRequestDto req,
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해 주세요."));
        }

        if (req.getPassword() == null || req.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "비밀번호를 입력해 주세요."));
        }

        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            req.getEmail().trim(),
                            req.getPassword()
                    )
            );
        } catch (AuthenticationException e) {
            return ResponseEntity.status(401)
                    .body(Map.of("message", "해당 아이디/비밀번호가 일치하지 않습니다."));
        }

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);

        securityContextRepository.saveContext(context, request, response);

        return ResponseEntity.ok(Map.of(
                "message", "로그인 성공",
                "email", authentication.getName()
        ));
    }

    @PostMapping("/password/reset-request")
    public ResponseEntity<?> passwordResetRequest(
            @RequestBody PasswordResetRequestDto req
    ) {
        if (req.getEmail() == null || req.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이메일을 입력해 주세요."));
        }

        return ResponseEntity.ok(Map.of(
                "message", "비밀번호 재설정 요청을 받았습니다."
        ));
    }
}
