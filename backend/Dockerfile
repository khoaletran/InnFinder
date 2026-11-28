# syntax=docker/dockerfile:1
# Stage 1: Build source code với Maven và Java 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Dùng Google Maven Central Mirror để tránh lỗi 429 Too Many Requests từ repo.maven.apache.org
RUN printf '<settings><mirrors><mirror><id>google-maven-central</id><name>GCS Maven Central mirror</name><url>https://maven-central.storage-download.googleapis.com/maven2</url><mirrorOf>central</mirrorOf></mirror></mirrors></settings>\n' > /tmp/maven-settings.xml

# Tách lớp cache dependency trước khi copy src
COPY pom.xml .
RUN --mount=type=cache,target=/root/.m2 mvn -B -s /tmp/maven-settings.xml dependency:go-offline

COPY src ./src

# Đóng gói file .jar (bỏ qua tests để build nhanh trên server)
RUN --mount=type=cache,target=/root/.m2 mvn -B -s /tmp/maven-settings.xml clean package -DskipTests

# Stage 2: Chạy ứng dụng với JRE 21 siêu nhẹ (Alpine)
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Cài đặt múi giờ Việt Nam
ENV TZ=Asia/Ho_Chi_Minh
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo $TZ > /etc/timezone

# Tạo user bảo mật không dùng quyền root
RUN addgroup -S innfinder && adduser -S innfinder -G innfinder
USER innfinder

# Copy file jar từ Stage 1
COPY --from=builder /app/target/*.jar app.jar

# Mở cổng 8080
EXPOSE 8080

# Chạy ứng dụng Spring Boot
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Duser.timezone=Asia/Ho_Chi_Minh", "-jar", "app.jar"]
