package com.chatapp;

import com.chatapp.model.User;
import com.chatapp.service.DatabaseService;
import com.chatapp.service.EmailService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.Javalin;
import io.javalin.http.Context;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

public class ChatApplication {
    private static final String DB_URL = "jdbc:sqlite:chat.db";
    private static final Map<String, String> verificationCodes = new ConcurrentHashMap<>();
    private final DatabaseService dbService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    public ChatApplication() {
        try {
            Connection connection = DriverManager.getConnection(DB_URL);
            this.dbService = new DatabaseService(connection);
            this.emailService = new EmailService();
            this.objectMapper = new ObjectMapper();
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize application", e);
        }
    }

    public void start() {
        Javalin app = Javalin.create(config -> {
            config.enableCorsForAllOrigins();
        });

        // Auth endpoints
        app.post("/api/register", this::handleRegister);
        app.post("/api/verify", this::handleVerify);
        app.post("/api/login", this::handleLogin);

        // Chat endpoints
        app.get("/api/contacts", this::handleGetContacts);
        app.get("/api/messages/{contactId}", this::handleGetMessages);
        app.post("/api/messages", this::handleSendMessage);

        app.start(8080);
    }

    private void handleRegister(Context ctx) {
        try {
            Map<String, String> body = objectMapper.readValue(ctx.body(), Map.class);
            String email = body.get("email");
            String nickname = body.get("nickname");
            String password = body.get("password");

            // Generate verification code
            String verificationCode = emailService.generateVerificationCode();
            verificationCodes.put(email, verificationCode);

            // Create user
            User user = new User(email, nickname, password);
            user.setVerificationCode(verificationCode);
            dbService.createUser(user);

            // Send verification email
            emailService.sendVerificationEmail(email, verificationCode);

            ctx.status(200);
        } catch (Exception e) {
            ctx.status(500).result("Registration failed: " + e.getMessage());
        }
    }

    private void handleVerify(Context ctx) {
        try {
            Map<String, String> body = objectMapper.readValue(ctx.body(), Map.class);
            String email = body.get("email");
            String code = body.get("code");

            if (verificationCodes.get(email).equals(code)) {
                dbService.verifyUser(email, code);
                verificationCodes.remove(email);
                ctx.status(200);
            } else {
                ctx.status(400).result("Invalid verification code");
            }
        } catch (Exception e) {
            ctx.status(500).result("Verification failed: " + e.getMessage());
        }
    }

    private void handleLogin(Context ctx) {
        try {
            Map<String, String> body = objectMapper.readValue(ctx.body(), Map.class);
            String email = body.get("email");
            String password = body.get("password");

            User user = dbService.getUserByEmail(email);
            if (user != null && user.getPassword().equals(password) && user.isVerified()) {
                String token = UUID.randomUUID().toString();
                ctx.status(200).json(Map.of("token", token));
            } else {
                ctx.status(401).result("Invalid credentials or unverified account");
            }
        } catch (Exception e) {
            ctx.status(500).result("Login failed: " + e.getMessage());
        }
    }

    private void handleGetContacts(Context ctx) {
        try {
            String token = ctx.header("Authorization").replace("Bearer ", "");
            // In a real application, you would validate the token and get the user ID
            String userId = "user-id"; // This should come from token validation
            ctx.json(dbService.getFriends(userId));
        } catch (Exception e) {
            ctx.status(500).result("Failed to get contacts: " + e.getMessage());
        }
    }

    private void handleGetMessages(Context ctx) {
        try {
            String token = ctx.header("Authorization").replace("Bearer ", "");
            String contactId = ctx.pathParam("contactId");
            // In a real application, you would validate the token and get the user ID
            String userId = "user-id"; // This should come from token validation
            ctx.json(dbService.getMessages(userId, contactId));
        } catch (Exception e) {
            ctx.status(500).result("Failed to get messages: " + e.getMessage());
        }
    }

    private void handleSendMessage(Context ctx) {
        try {
            String token = ctx.header("Authorization").replace("Bearer ", "");
            Map<String, String> body = objectMapper.readValue(ctx.body(), Map.class);
            String receiverId = body.get("receiverId");
            String content = body.get("content");
            // In a real application, you would validate the token and get the user ID
            String senderId = "user-id"; // This should come from token validation
            dbService.saveMessage(senderId, receiverId, content);
            ctx.status(200);
        } catch (Exception e) {
            ctx.status(500).result("Failed to send message: " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        new ChatApplication().start();
    }
} 