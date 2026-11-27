package com.innfinder.backend.config;

import com.google.auth.oauth2.ServiceAccountCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@Configuration
public class RoommateFirestoreConfig {
    @Bean(destroyMethod = "close")
    @Lazy
    @ConditionalOnProperty(name = "innfinder.firestore.project-id")
    Firestore roommateFirestore(@Value("${innfinder.firestore.project-id}") String projectId,
                                @Value("${FIRESTORE_EMULATOR_HOST:}") String emulatorHost,
                                @Value("${innfinder.firestore.credentials-file}") String credentialsFile) throws IOException {
        var options = FirestoreOptions.newBuilder().setProjectId(projectId);
        if (!emulatorHost.isBlank()) {
            options.setEmulatorHost(emulatorHost);
        } else if (!credentialsFile.isBlank()) {
            try (var key = Files.newInputStream(Path.of(credentialsFile))) {
                options.setCredentials(ServiceAccountCredentials.fromStream(key));
            }
        }
        return options.build().getService();
    }
}
