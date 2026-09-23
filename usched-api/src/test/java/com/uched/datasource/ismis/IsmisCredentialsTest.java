package com.uched.datasource.ismis;

import org.junit.jupiter.api.Test;

import java.io.Serializable;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class IsmisCredentialsTest {
    @Test
    void toStringIsRedacted() {
        IsmisCredentials c = new IsmisCredentials("alice".toCharArray(), "s3cret-value".toCharArray());
        assertThat(c.toString()).isEqualTo("IsmisCredentials[REDACTED]").doesNotContain("alice").doesNotContain("s3cret");
    }

    @Test
    void closeZeroesTheArrays() {
        char[] user = "alice".toCharArray();
        char[] pass = "s3cret-value".toCharArray();
        IsmisCredentials c = new IsmisCredentials(user, pass);
        c.close();
        assertThat(pass).containsOnly('\0');
        assertThat(user).containsOnly('\0');
        assertThat(c.isClosed()).isTrue();
        assertThatThrownBy(c::password).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void worksInTryWithResources() {
        char[] pass = "s3cret-value".toCharArray();
        try (IsmisCredentials c = new IsmisCredentials("alice".toCharArray(), pass)) {
            assertThat(c.password()).isNotEmpty();
        }
        assertThat(pass).containsOnly('\0');
    }

    @Test
    void isNotSerializable() {
        assertThat(Serializable.class.isAssignableFrom(IsmisCredentials.class)).isFalse();
    }

    @Test
    void rejectsEmptyValues() {
        assertThatThrownBy(() -> new IsmisCredentials(new char[0], "x".toCharArray()))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
