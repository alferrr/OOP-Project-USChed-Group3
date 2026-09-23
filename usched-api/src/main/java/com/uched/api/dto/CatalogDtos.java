package com.uched.api.dto;

import java.time.Instant;

public final class CatalogDtos {
    private CatalogDtos() {
    }

    public record CatalogStatusResponse(boolean available, String source, Instant scrapedAt,
                                        int courseCount, int sectionCount, boolean fresh) {
    }
}
