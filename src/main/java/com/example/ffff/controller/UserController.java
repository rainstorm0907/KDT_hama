package com.example.ffff.controller;

import com.example.ffff.dto.SignupRequestDto;
import com.example.ffff.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
@RequestMapping("/api")
public class UserController {

    private final UserService userService;

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/login")
    public String loginPage(@RequestParam(value="error", required=false) String error,
                            @RequestParam(value="success", required=false) String success,
                            Model model) {
        if (error != null)   model.addAttribute("loginError", true);
        if (success != null) model.addAttribute("signupSuccess", true);
        return "login";
    }

    @GetMapping("/signup")
    public String signupPage(Model model) {
        model.addAttribute("signupRequest", new SignupRequestDto());
        return "signup";
    }

    @PostMapping("/signup")
    // 2. @ModelAttribute 대신 @RequestBody 사용 (JSON 데이터를 받기 위함)
    // 3. String 대신 ResponseEntity<?> 반환 (상태 코드와 데이터를 함께 보내기 위함)
    public ResponseEntity<?> signup(@RequestBody SignupRequestDto req) {

        // 결과 데이터를 담을 Map (JSON으로 변환됨)
        Map<String, String> response = new HashMap<>();

        // 1. 비밀번호 일치 확인
        if (!req.getPassword().equals(req.getPasswordConfirm())) {
            response.put("message", "비밀번호가 일치하지 않습니다.");
            return ResponseEntity.badRequest().body(response); // 400 에러와 메시지 전송
        }

        try {
            // 2. 서비스 호출
            userService.signup(req);
            response.put("message", "회원가입에 성공했습니다.");
            return ResponseEntity.ok(response); // 200 성공과 메시지 전송

        } catch (IllegalArgumentException e) {
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);

        } catch (Exception e) {
            response.put("message", "회원가입 중 오류가 발생했습니다.");
            return ResponseEntity.internalServerError().body(response);
        }
    }
}