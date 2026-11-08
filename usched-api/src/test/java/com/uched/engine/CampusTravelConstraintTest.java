package com.uched.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/** The frontend (usched/src/lib/insights.ts) duplicates this value; update both if it changes. */
class CampusTravelConstraintTest {
    @Test
    void travelBufferMatchesFrontend() throws Exception {
        var f = com.uched.engine.constraint.CampusTravelConstraint.class.getDeclaredField("TRAVEL_MINUTES");
        f.setAccessible(true);
        assertEquals(45, f.getInt(null));
    }
}
