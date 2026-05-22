package com.example.ffff.controller;

import com.example.ffff.dto.SignupRequestDto;
import com.example.ffff.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
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
    public String signup(@ModelAttribute("signupRequest") SignupRequestDto req, Model model) {

        // 1. 비밀번호 일치 확인 (반드시 return이 있어야 아래 코드가 실행 안 됨)
        if (!req.getPassword().equals(req.getPasswordConfirm())) {
            model.addAttribute("errorMessage", "비밀번호가 일치하지 않습니다.");
            // 입력했던 데이터를 다시 모델에 담아 화면에 유지 (email, nickname 등)
            model.addAttribute("signupRequest", req);
            return "signup"; // ◀ 여기서 바로 회원가입 페이지로 다시 돌아가야 함!
        }

        try {
            // 2. 서비스 호출 (중복 이메일 체크 등)
            userService.signup(req);
            return "redirect:/login?success"; // 성공 시에만 로그인 페이지로

        } catch (IllegalArgumentException e) {
            // 중복 이메일 예외 발생 시
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("signupRequest", req);
            return "signup";

        } catch (Exception e) {
            // 기타 알 수 없는 에러
            model.addAttribute("errorMessage", "회원가입 중 오류가 발생했습니다.");
            model.addAttribute("signupRequest", req);
            return "signup";
        }
    }
}