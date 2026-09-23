package com.uched.support;

import com.uched.datasource.ismis.IsmisConfig;

import java.util.List;

public final class FakeIsmisConfig {
    private FakeIsmisConfig() {
    }

    public static IsmisConfig of(FakeIsmis ismis) {
        IsmisConfig c = new IsmisConfig();
        c.setBaseUrl(ismis.baseUrl());
        c.setLoginPath("/login");
        c.setOfferedCoursesPath("/offered");
        c.setSearchPath("/search");
        c.setLogoutPath("/logout");
        c.setUsernameField("user");
        c.setPasswordField("pass");
        c.setMinDelayMs(0);
        c.setAllowedPathPrefixes(List.of("/home", "/CourseSchedule/OfferedCoursesFilter"));
        c.setProspectusPath("/prospectus");
        return c;
    }
}
