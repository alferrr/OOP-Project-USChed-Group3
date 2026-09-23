package com.uched.datasource.ismis;

import com.uched.datasource.CourseDataSource;
import com.uched.datasource.SourceType;
import com.uched.domain.model.Course;
import com.uched.domain.value.Semester;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

/**
 * One-shot live source: signs in, runs a single search, and is closed afterwards, which also destroys the
 * credentials. Long-lived, multi-search use goes through {@link IsmisConnection} instead. The rest of the app
 * only ever sees List&lt;Course&gt;.
 */
public class ISMISScraper implements CourseDataSource, AutoCloseable {
    private final IsmisConfig config;
    private final IsmisPageParser parser;
    private final IsmisCredentials credentials;
    private final List<String> skipped = new ArrayList<>();
    private IsmisConnection connection;
    private String query = "";
    private Consumer<String> stageListener = s -> { };

    public ISMISScraper(IsmisConfig config, IsmisPageParser parser, IsmisCredentials credentials) {
        this.config = config;
        this.parser = parser;
        this.credentials = credentials;
    }

    /** Course code or description to search for; this is what the ISMIS "Courses" box receives. */
    public void setQuery(String query) {
        this.query = query == null ? "" : query.trim();
    }

    public void onStage(Consumer<String> listener) {
        this.stageListener = listener;
    }

    @Override
    public SourceType type() {
        return SourceType.ISMIS;
    }

    @Override
    public boolean providesUnits() {
        return false;
    }

    @Override
    public List<String> skippedRecords() {
        return List.copyOf(skipped);
    }

    @Override
    public List<Course> fetchCourses(Semester semester, String academicYear) {
        stageListener.accept("LOGGING_IN");
        connection = IsmisConnection.signIn(config, parser, credentials);
        stageListener.accept("FETCHING");
        IsmisConnection.SearchResult result = connection.search(semester, academicYear, query);
        skipped.clear();
        skipped.addAll(result.skipped());
        return result.courses();
    }

    @Override
    public void close() {
        if (connection != null) {
            connection.close();
        }
        credentials.close();
    }
}
