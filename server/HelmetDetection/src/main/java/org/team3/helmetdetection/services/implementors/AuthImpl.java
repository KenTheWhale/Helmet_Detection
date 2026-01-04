package org.team3.helmetdetection.services.implementors;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.team3.helmetdetection.models.Account;
import org.team3.helmetdetection.repositories.AccountRepo;
import org.team3.helmetdetection.requests.LoginRequest;
import org.team3.helmetdetection.responses.ResponseObject;
import org.team3.helmetdetection.services.AuthService;
import org.team3.helmetdetection.utils.ResponseUtil;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthImpl implements AuthService {

    private final AccountRepo accountRepo;

    @Override
    public ResponseEntity<ResponseObject> login(LoginRequest request) {
        Account account = accountRepo.findByUsernameAndPassword(request.getUsername(), request.getPassword()).orElse(null);
        if(account != null) {
            return ResponseUtil.build(HttpStatus.OK, "Login successfully", Map.of("username", request.getUsername()));
        }
        return ResponseUtil.build(HttpStatus.UNAUTHORIZED, "Login fail", null);
    }
}
