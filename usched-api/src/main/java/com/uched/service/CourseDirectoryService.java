package com.uched.service;

import com.uched.persistence.entity.CourseDirectoryEntity;
import com.uched.persistence.repository.CourseDirectoryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * The shared course code/title directory behind the search box's suggestions. It never holds anything about a
 * student, so it is safe to share across everyone: it only grows as codes are seen.
 */
@Service
public class CourseDirectoryService {
    static final int MAX_RESULTS = 20;
    static final int MIN_QUERY = 2;

    public record Entry(String code, String name, Double units, String department) {
    }

    private final CourseDirectoryRepository directory;

    public CourseDirectoryService(CourseDirectoryRepository directory) {
        this.directory = directory;
    }

    @Transactional(readOnly = true)
    public List<Entry> search(String q, int limit) {
        String query = q == null ? "" : q.trim().replaceAll("\\s+", " ");
        if (query.length() < MIN_QUERY) {
            return List.of();
        }
        int size = Math.max(1, Math.min(limit, MAX_RESULTS));
        return directory.search(escapeLike(query), PageRequest.of(0, size)).stream()
                .map(d -> new Entry(d.getCode(), d.getName(), d.getUnits() == null ? null : d.getUnits().doubleValue(),
                        d.getDepartment()))
                .toList();
    }

    /** Adds new codes and refreshes the title/units/department of known ones. Blank codes or titles are skipped. */
    @Transactional
    public int record(List<Entry> entries) {
        Map<String, Entry> byCode = new LinkedHashMap<>();
        for (Entry e : entries) {
            if (e == null || blank(e.code()) || blank(e.name())) {
                continue;
            }
            String code = e.code().trim().replaceAll("\\s+", " ");
            if (code.length() > 20) {
                continue;
            }
            byCode.put(code.toUpperCase(Locale.ROOT), new Entry(code, truncate(e.name().trim(), 200), e.units(),
                    blank(e.department()) ? null : truncate(e.department().trim(), 50)));
        }
        if (byCode.isEmpty()) {
            return 0;
        }
        Map<String, CourseDirectoryEntity> existing = directory.findByUpperCodeIn(byCode.keySet()).stream()
                .collect(Collectors.toMap(d -> d.getCode().toUpperCase(Locale.ROOT), d -> d, (a, b) -> a));
        List<CourseDirectoryEntity> toSave = new ArrayList<>();
        for (var kv : byCode.entrySet()) {
            Entry e = kv.getValue();
            CourseDirectoryEntity d = existing.getOrDefault(kv.getKey(), new CourseDirectoryEntity());
            d.setCode(e.code());
            d.setName(e.name());
            if (e.units() != null) {
                d.setUnits(BigDecimal.valueOf(e.units()));
            }
            if (e.department() != null) {
                d.setDepartment(e.department());
            }
            d.setUpdatedAt(Instant.now());
            toSave.add(d);
        }
        directory.saveAll(toSave);
        return toSave.size();
    }

    /** CSV with a header row: code,name[,units[,department]]. Returns how many rows were stored. */
    public int importCsv(Reader csv) {
        List<Entry> entries = new ArrayList<>();
        try (BufferedReader in = new BufferedReader(csv)) {
            String header = in.readLine();
            if (header == null) {
                return 0;
            }
            for (String line; (line = in.readLine()) != null; ) {
                if (line.isBlank()) {
                    continue;
                }
                String[] f = line.split(",", -1);
                if (f.length < 2) {
                    continue;
                }
                entries.add(new Entry(f[0], f[1], f.length > 2 ? parseUnits(f[2]) : null, f.length > 3 ? f[3] : null));
            }
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
        return record(entries);
    }

    private static Double parseUnits(String s) {
        try {
            return s.isBlank() ? null : Double.valueOf(s.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** The query is bound as a parameter, but % and _ would still act as wildcards inside LIKE. */
    private static String escapeLike(String q) {
        return q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }

    private static boolean blank(String s) {
        return s == null || s.isBlank();
    }

    private static String truncate(String s, int max) {
        return s.length() <= max ? s : s.substring(0, max);
    }
}
