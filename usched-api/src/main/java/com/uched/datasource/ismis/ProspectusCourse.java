package com.uched.datasource.ismis;

import com.uched.domain.value.Semester;

/**
 * One row of the student's own degree-program curriculum (the "Prospectus" page): what they are expected to
 * take, in which year and term, not what is actually offered this term. requisiteNote is free text exactly as
 * ISMIS shows it (e.g. "Prerequisite: CIS 1204", "3rd year standing"); USChed does not enforce it.
 */
public record ProspectusCourse(int yearLevel, Semester semester, String code, String title, double units,
                               String requisiteNote) {
}
