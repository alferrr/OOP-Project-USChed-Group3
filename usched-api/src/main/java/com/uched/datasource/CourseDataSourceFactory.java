package com.uched.datasource;

import com.uched.datasource.ismis.ISMISScraper;
import com.uched.datasource.ismis.IsmisConnection;
import com.uched.datasource.ismis.IsmisConfig;
import com.uched.datasource.ismis.IsmisCredentials;
import com.uched.datasource.ismis.IsmisPageParser;
import org.springframework.stereotype.Component;

import java.io.Reader;

@Component
public class CourseDataSourceFactory {
    private final IsmisConfig ismisConfig;
    private final IsmisPageParser parser;

    public CourseDataSourceFactory(IsmisConfig ismisConfig, IsmisPageParser parser) {
        this.ismisConfig = ismisConfig;
        this.parser = parser;
    }

    public CourseDataSource createCsv(Reader reader) {
        return new CsvCourseDataSource(reader);
    }

    /**
     * Signs in and returns a live connection for repeated read-only searches. The credentials are only read
     * during this call; the caller closes them and later closes the connection.
     */
    public IsmisConnection signIn(IsmisCredentials credentials) {
        return IsmisConnection.signIn(ismisConfig, parser, credentials);
    }

    /** A fresh scraper per scrape; the caller closes it, which also destroys the credentials. */
    public ISMISScraper createIsmis(IsmisCredentials credentials) {
        return new ISMISScraper(ismisConfig, parser, credentials);
    }
}
