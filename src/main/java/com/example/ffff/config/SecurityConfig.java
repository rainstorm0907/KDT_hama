package com.example.ffff.config;

import com.example.ffff.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService customUserDetailsService;

    @Bean
    public BCryptPasswordEncoder encodePassword() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(customUserDetailsService);
        provider.setPasswordEncoder(encodePassword());
        return provider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)

                .cors(cors -> {})

                .authenticationProvider(authenticationProvider())

                .authorizeHttpRequests(auth -> auth
                        // 누구나 접근 가능
                        .requestMatchers("/", "/login", "/signup", "/error").permitAll()

                        // 정적 리소스
                        .requestMatchers("/css/**", "/js/**", "/images/**", "/favicon.ico").permitAll()

                        // 프론트에서 로그인 없이 접근 가능한 API
                        .requestMatchers("/api/products/**").permitAll()
                        .requestMatchers("/api/signup").permitAll()
                        .requestMatchers("/api/gemini/test").permitAll()

                        // 챗봇 API는 로그인 필요
                        .requestMatchers("/api/chatbot/message").authenticated()

                        // 그 외 요청은 로그인 필요
                        .anyRequest().authenticated()
                )

                .formLogin(form -> form
                        .loginPage("/login")
                        .loginProcessingUrl("/login")
                        .usernameParameter("email")
                        .passwordParameter("password")
                        .defaultSuccessUrl("/", true)
                        .permitAll()
                )

                .logout(logout -> logout
                        .logoutUrl("/logout")
                        .logoutSuccessUrl("/")
                        .invalidateHttpSession(true)
                        .deleteCookies("JSESSIONID")
                        .permitAll()
                );

        return http.build();
    }
}