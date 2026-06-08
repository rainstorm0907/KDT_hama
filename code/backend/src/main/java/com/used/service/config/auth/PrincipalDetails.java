package com.used.service.config.auth;

import com.used.service.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;

public class PrincipalDetails implements UserDetails {

    private User user; // ?곕━ ?꾨찓??User

    public PrincipalDetails(User user) {
        this.user = user;
    }

    // [?듭떖 異붽?!] ??硫붿꽌?쒓? ?덉뼱??Thymeleaf?먯꽌 'principal.user'濡??묎렐??媛?ν빀?덈떎.
    public User getUser() {
        return user;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        Collection<GrantedAuthority> collect = new ArrayList<>();
        collect.add(() -> "ROLE_USER");
        return collect;
    }

    @Override
    public String getPassword() { return user.getPassword(); }

    @Override
    public String getUsername() { return user.getEmail(); }

    @Override public boolean isAccountNonExpired() { return true; }
    @Override public boolean isAccountNonLocked() { return true; }
    @Override public boolean isCredentialsNonExpired() { return true; }
    @Override public boolean isEnabled() { return true; }
}
