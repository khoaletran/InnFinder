# Stage 1: Build source code với Maven và Java 21
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# Copy file pom.xml và source code
COPY pom.xml .
COPY src ./src

# Đóng gói file .jar (bỏ qua tests để build nhanh trên server)
RUN mvn clean package -DskipTests

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
