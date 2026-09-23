package com.uched.config;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.YamlPropertiesFactoryBean;
import org.springframework.core.io.FileSystemResource;

import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

/** The test profile replaces application.yml, so parse the real one here to catch syntax mistakes. */
class MainConfigTest {
    @Test
    void mainApplicationYamlParsesAndKeepsSafeDefaults() {
        YamlPropertiesFactoryBean yaml = new YamlPropertiesFactoryBean();
        yaml.setResources(new FileSystemResource("src/main/resources/application.yml"));
        Properties p = yaml.getObject();

        assertThat(p).isNotNull();
        assertThat(p.getProperty("uched.ismis.user-agent")).contains("USChed/1.0");
        assertThat(p.getProperty("spring.datasource.url")).startsWith("${DB_URL:jdbc:mysql://");
        assertThat(p.getProperty("server.error.include-message")).isEqualTo("never");
        // A JDBC time zone shifts LocalTime values and breaks the meeting time CHECK on MySQL.
        assertThat(p.stringPropertyNames()).noneMatch(k -> k.contains("jdbc.time_zone"));
        assertThat(p.getProperty("uched.ismis.search-path")).contains("/CourseSchedule/CourseScheduleOffered");
        assertThat(p.getProperty("uched.ismis.base-url")).isEqualTo("${UCHED_ISMIS_BASE_URL:https://ismis.usc.edu.ph}");
    }
}
