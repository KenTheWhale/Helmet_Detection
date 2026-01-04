package org.team3.helmetdetection.configurations;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;

@OpenAPIDefinition(
        info = @Info(
                title = "Helmet Detection",
                version = "0.1",
                description = "API for dev Helmet Detection"
        ),
        servers = {
                @Server(
                        description = "Localhost",
                        url = "http://localhost:8080/"
                ),
                @Server(
                        description = "Live Server",
                        url = "Coming Soon"
                )
        }
)
public class SwaggerConfig {
}
