package org.team3.helmetdetection.utils;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.team3.helmetdetection.responses.ResponseObject;

public class ResponseUtil {
    public static ResponseEntity<ResponseObject> build(HttpStatus status, String message, Object data){
        return ResponseEntity.status(status).body(ResponseObject.builder().message(message).body(data).build());
    }
}
