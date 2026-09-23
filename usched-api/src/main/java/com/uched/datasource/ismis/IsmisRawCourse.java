package com.uched.datasource.ismis;

import java.util.List;

/** One unvalidated results row exactly as read from the page. */
public record IsmisRawCourse(int row, String courseCode, String title, String status,
                             List<String> teachers, List<String> scheduleLines, String enrolled) {
}
