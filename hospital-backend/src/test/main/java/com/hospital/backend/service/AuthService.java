package com.hospital.backend.service;

import com.hospital.backend.dto.*;
import org.springframework.data.domain.Pageable;

public interface AuthService {
    LoginResponse login(LoginRequest request);
    UserDTO register(RegisterRequest request);
    LoginResponse refreshToken(String refreshToken);
    void logout(String token);
}
