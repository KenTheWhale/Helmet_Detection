package org.team3.helmetdetection.services.implementors;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.team3.helmetdetection.requests.LoginRequest;
import org.team3.helmetdetection.responses.ResponseObject;
import org.team3.helmetdetection.services.AuthService;
import org.team3.helmetdetection.utils.ResponseUtil;

@Service
@RequiredArgsConstructor
public class AuthImpl implements AuthService {

    @Override
    public ResponseEntity<ResponseObject> login(LoginRequest request) {
        if(request.getUsername().equals("manager") && request.getPassword().equals("123")){
            return ResponseUtil.build(HttpStatus.OK, "Login successfully", null);
        }
        return ResponseUtil.build(HttpStatus.UNAUTHORIZED, "Login fail", null);
    }
}
