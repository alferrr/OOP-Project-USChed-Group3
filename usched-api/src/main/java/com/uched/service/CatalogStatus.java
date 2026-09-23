package com.uched.service;

import com.uched.datasource.SourceType;

import java.time.Instant;

public record CatalogStatus(boolean available, SourceType source, Instant scrapedAt,
                            int courseCount, int sectionCount, boolean fresh) {
    public static CatalogStatus none() {
        return new CatalogStatus(false, null, null, 0, 0, false);
    }
}
