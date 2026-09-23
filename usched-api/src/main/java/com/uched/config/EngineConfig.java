package com.uched.config;

import com.uched.engine.generator.BacktrackingScheduleGenerator;
import com.uched.engine.generator.ScheduleGenerator;
import com.uched.engine.scoring.ScheduleScorer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Wires the framework-free engine into Spring as abstractions. */
@Configuration
public class EngineConfig {
    @Bean
    ScheduleGenerator scheduleGenerator() {
        return new BacktrackingScheduleGenerator();
    }

    @Bean
    ScheduleScorer scheduleScorer() {
        return ScheduleScorer.withDefaults();
    }
}
