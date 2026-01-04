package org.team3.helmetdetection.services;

import org.springframework.http.ResponseEntity;
import org.team3.helmetdetection.requests.LoginRequest;
import org.team3.helmetdetection.responses.ResponseObject;

public interface AuthService {
    ResponseEntity<ResponseObject> login(LoginRequest request);
}
