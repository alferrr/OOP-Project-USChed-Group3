package com.uched.config;

import com.uched.service.UChedProperties;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final UChedProperties props;

    public WebConfig(UChedProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(props.getCorsAllowedOrigins().toArray(String[]::new))
                .allowedMethods("GET", "POST", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "X-Consent-Token", "X-Admin-Token", "X-Ismis-Session");
    }

    @Bean
    OpenAPI openApi() {
        return new OpenAPI().info(new Info().title("USChed API").version("0.1.0")
                .description("Schedule planning for USC students. Never enrolls or modifies anything in ISMIS."));
    }
}
