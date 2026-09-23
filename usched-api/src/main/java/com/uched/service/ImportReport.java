package com.uched.service;

import java.util.List;

public record ImportReport(int courses, int sections, int skipped, List<String> errors) {
}
