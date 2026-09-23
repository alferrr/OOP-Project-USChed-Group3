package com.uched.service;

import com.uched.domain.exception.ConsentRequiredException;
import com.uched.domain.exception.DataSourceException;
import com.uched.domain.exception.InvalidCourseDataException;
import com.uched.domain.exception.InvalidTimeRangeException;
import com.uched.domain.exception.IsmisAuthenticationException;
import com.uched.domain.exception.IsmisChallengeException;
import com.uched.domain.exception.IsmisLayoutChangedException;
import com.uched.domain.exception.IsmisNoResultsException;
import com.uched.domain.exception.IsmisNotConfiguredException;
import com.uched.domain.exception.IsmisSessionExpiredException;
import com.uched.domain.exception.IsmisTooManyResultsException;
import com.uched.domain.exception.IsmisUnavailableException;
import com.uched.domain.exception.MissingScheduleInfoException;
import com.uched.domain.exception.NoValidScheduleException;
import com.uched.domain.exception.RateLimitedException;
import com.uched.domain.exception.ResourceNotFoundException;
import com.uched.domain.exception.ScraperException;
import com.uched.domain.exception.USChedException;

/** Polymorphic exception mapping: each USChedException subtype has its own HTTP status and code. */
public final class ErrorCodes {
    public record Info(int status, String code) {
    }

    private ErrorCodes() {
    }

    public static Info of(USChedException e) {
        if (e instanceof ConsentRequiredException) {
            return new Info(403, "CONSENT_REQUIRED");
        }
        if (e instanceof ResourceNotFoundException) {
            return new Info(404, "NOT_FOUND");
        }
        if (e instanceof NoValidScheduleException) {
            return new Info(422, "NO_VALID_SCHEDULE");
        }
        if (e instanceof RateLimitedException) {
            return new Info(429, "SCRAPE_RATE_LIMITED");
        }
        if (e instanceof IsmisSessionExpiredException) {
            return new Info(401, "ISMIS_SESSION_EXPIRED");
        }
        if (e instanceof IsmisAuthenticationException) {
            return new Info(401, "ISMIS_AUTH_FAILED");
        }
        if (e instanceof IsmisChallengeException) {
            return new Info(422, "ISMIS_CHALLENGE_REQUIRED");
        }
        if (e instanceof IsmisLayoutChangedException) {
            return new Info(502, "ISMIS_LAYOUT_CHANGED");
        }
        if (e instanceof IsmisNoResultsException) {
            return new Info(404, "ISMIS_NO_RESULTS");
        }
        if (e instanceof IsmisTooManyResultsException) {
            return new Info(422, "ISMIS_TOO_MANY_RESULTS");
        }
        if (e instanceof IsmisNotConfiguredException) {
            return new Info(503, "ISMIS_NOT_CONFIGURED");
        }
        if (e instanceof IsmisUnavailableException || e instanceof ScraperException) {
            return new Info(502, "ISMIS_UNAVAILABLE");
        }
        if (e instanceof DataSourceException) {
            return new Info(502, "DATA_SOURCE_ERROR");
        }
        if (e instanceof InvalidCourseDataException || e instanceof InvalidTimeRangeException
                || e instanceof MissingScheduleInfoException) {
            return new Info(400, "INVALID_DATA");
        }
        return new Info(500, "INTERNAL_ERROR");
    }
}
