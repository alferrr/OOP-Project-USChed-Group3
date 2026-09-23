package com.uched.datasource.ismis;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Everything about the ISMIS site is configuration, never a guess baked into code.
 * Values in application.yml come from the recon of the real sign-in and "Course Schedule Offered" pages.
 */
@Component
@ConfigurationProperties(prefix = "uched.ismis")
@Getter
@Setter
public class IsmisConfig {
    private String baseUrl = "";
    private String loginPath = "";
    private String logoutPath = "";
    private String usernameField = "";
    private String passwordField = "";

    /** GET page that contains the term search form. */
    private String offeredCoursesPath = "";
    /** GET page listing the student's own degree program curriculum, by year level and semester. */
    private String prospectusPath = "";
    /** The only path (besides login) that may receive a POST: the read-only term search. */
    private String searchPath = "";
    private String searchFormSelector = "form#CourseScheduleCourseScheduleOffered";
    private String academicPeriodField = "AcademicPeriod";
    private String academicYearField = "AcademicYear";
    private String coursesField = "Courses";

    /** The offered-courses table has no units column; new courses get this until real units are known. */
    private double defaultUnits = 3.0;
    private String defaultCampus = "Main";
    private String userAgent = "USChed/1.0 (student schedule planner)";
    private long minDelayMs = 500;
    private int requestTimeoutSeconds = 20;
    private int maxPages = 50;
    /** Extra read-only GET path prefixes (e.g. result pagination links). */
    private List<String> allowedPathPrefixes = new ArrayList<>(List.of("/CourseSchedule/OfferedCoursesFilter"));

    public boolean isConfigured() {
        return notBlank(baseUrl) && notBlank(loginPath) && notBlank(offeredCoursesPath) && notBlank(searchPath)
                && notBlank(usernameField) && notBlank(passwordField);
    }

    public boolean prospectusConfigured() {
        return isConfigured() && notBlank(prospectusPath);
    }

    private static boolean notBlank(String s) {
        return s != null && !s.isBlank();
    }
}
