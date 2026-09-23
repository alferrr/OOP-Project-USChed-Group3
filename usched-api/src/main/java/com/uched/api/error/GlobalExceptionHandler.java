package com.uched.api.error;

import com.uched.api.dto.ErrorResponse;
import com.uched.domain.exception.NoValidScheduleException;
import com.uched.domain.exception.USChedException;
import com.uched.service.ErrorCodes;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.List;

/**
 * Maps each exception type to its own status and code. Messages for unexpected errors are generic and
 * request bodies are never echoed, so nothing sensitive (e.g. an ISMIS password) can leak into a response.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(USChedException.class)
    public ResponseEntity<ErrorResponse> handleDomain(USChedException e) {
        ErrorCodes.Info info = ErrorCodes.of(e);
        List<String> details = e instanceof NoValidScheduleException nv ? nv.getDetails() : List.of();
        String message = info.status() >= 500 && info.status() != 502 ? "Something went wrong." : e.getMessage();
        return ResponseEntity.status(info.status()).body(new ErrorResponse(info.code(), message, details));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        List<String> details = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage()).toList();
        return ResponseEntity.badRequest().body(new ErrorResponse("VALIDATION_ERROR", "The request is not valid.", details));
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class, MaxUploadSizeExceededException.class})
    public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
        return ResponseEntity.badRequest().body(new ErrorResponse("BAD_REQUEST", "The request could not be read."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleUnexpected(Exception e) {
        log.error("Unhandled error: {}", e.getClass().getName());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "Something went wrong."));
    }
}
