package com.uched.datasource.ismis;

import com.uched.domain.value.Semester;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ProspectusParserTest {
    private final IsmisPageParser parser = new IsmisPageParser();

    private static String fixture() throws IOException {
        return Files.readString(Path.of("src/test/resources/fixtures/prospectus.html"));
    }

    @Test
    void parsesEveryYearAndTermWithRealUnits() throws IOException {
        var p = parser.parseProspectus(fixture());
        assertThat(p.programName()).isEqualTo("BACHELOR OF SCIENCE IN INFORMATION TECHNOLOGY");
        assertThat(p.effectiveYear()).isEqualTo("2023");
        assertThat(p.courses()).hasSize(4);

        var first = p.courses().get(0);
        assertThat(first.yearLevel()).isEqualTo(1);
        assertThat(first.semester()).isEqualTo(Semester.FIRST);
        assertThat(first.code()).isEqualTo("CIS 1101");
        assertThat(first.units()).isEqualTo(3.0);
        assertThat(first.requisiteNote()).isEmpty();

        var summer = p.courses().stream().filter(c -> c.code().equals("CIS 2201")).findFirst().orElseThrow();
        assertThat(summer.semester()).isEqualTo(Semester.SUMMER);
        assertThat(summer.yearLevel()).isEqualTo(1);
        assertThat(summer.requisiteNote()).isEqualTo("PREREQUISITE CIS 1204");

        var elective = p.courses().stream().filter(c -> c.code().equals("IT ELEC 3")).findFirst().orElseThrow();
        assertThat(elective.yearLevel()).isEqualTo(2);
        assertThat(elective.requisiteNote()).isEqualTo("3RD YEAR STANDING");
    }

    @Test
    void emptyOrUnexpectedPagesAreLayoutChanges() {
        assertThatThrownBy(() -> parser.parseProspectus("<html><body>nothing here</body></html>"))
                .isInstanceOf(com.uched.domain.exception.IsmisLayoutChangedException.class);
        assertThatThrownBy(() -> parser.parseProspectus("")).isInstanceOf(com.uched.domain.exception.IsmisLayoutChangedException.class);
    }
}
