package com.chatapp.service;

import com.chatapp.model.User;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class DatabaseService {
    private final Connection connection;

    public DatabaseService(Connection connection) {
        this.connection = connection;
        initializeTables();
    }

    private void initializeTables() {
        try {
            // Create users table
            connection.createStatement().execute(
                "CREATE TABLE IF NOT EXISTS users (" +
                "id TEXT PRIMARY KEY," +
                "email TEXT UNIQUE," +
                "nickname TEXT," +
                "password TEXT," +
                "verification_code TEXT," +
                "verified BOOLEAN" +
                ")"
            );

            // Create friends table
            connection.createStatement().execute(
                "CREATE TABLE IF NOT EXISTS friends (" +
                "user_id TEXT," +
                "friend_id TEXT," +
                "PRIMARY KEY (user_id, friend_id)," +
                "FOREIGN KEY (user_id) REFERENCES users(id)," +
                "FOREIGN KEY (friend_id) REFERENCES users(id)" +
                ")"
            );

            // Create messages table
            connection.createStatement().execute(
                "CREATE TABLE IF NOT EXISTS messages (" +
                "id TEXT PRIMARY KEY," +
                "sender_id TEXT," +
                "receiver_id TEXT," +
                "content TEXT," +
                "timestamp DATETIME DEFAULT CURRENT_TIMESTAMP," +
                "FOREIGN KEY (sender_id) REFERENCES users(id)," +
                "FOREIGN KEY (receiver_id) REFERENCES users(id)" +
                ")"
            );
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    public User createUser(User user) {
        String sql = "INSERT INTO users (id, email, nickname, password, verification_code, verified) VALUES (?, ?, ?, ?, ?, ?)";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            String userId = UUID.randomUUID().toString();
            stmt.setString(1, userId);
            stmt.setString(2, user.getEmail());
            stmt.setString(3, user.getNickname());
            stmt.setString(4, user.getPassword());
            stmt.setString(5, user.getVerificationCode());
            stmt.setBoolean(6, user.isVerified());
            stmt.executeUpdate();
            user.setId(userId);
            return user;
        } catch (SQLException e) {
            e.printStackTrace();
            return null;
        }
    }

    public User getUserByEmail(String email) {
        String sql = "SELECT * FROM users WHERE email = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            ResultSet rs = stmt.executeQuery();
            if (rs.next()) {
                User user = new User(rs.getString("email"), rs.getString("nickname"), rs.getString("password"));
                user.setId(rs.getString("id"));
                user.setVerificationCode(rs.getString("verification_code"));
                user.setVerified(rs.getBoolean("verified"));
                return user;
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    public boolean verifyUser(String email, String code) {
        String sql = "UPDATE users SET verified = true WHERE email = ? AND verification_code = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, email);
            stmt.setString(2, code);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public boolean addFriend(String userId, String friendId) {
        String sql = "INSERT INTO friends (user_id, friend_id) VALUES (?, ?)";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, userId);
            stmt.setString(2, friendId);
            stmt.executeUpdate();
            return true;
        } catch (SQLException e) {
            e.printStackTrace();
            return false;
        }
    }

    public List<User> getFriends(String userId) {
        List<User> friends = new ArrayList<>();
        String sql = "SELECT u.* FROM users u " +
                    "JOIN friends f ON u.id = f.friend_id " +
                    "WHERE f.user_id = ?";
        try (PreparedStatement stmt = connection.prepareStatement(sql)) {
            stmt.setString(1, userId);
            ResultSet rs = stmt.executeQuery();
            while (rs.next()) {
                User friend = new User(rs.getString("email"), rs.getString("nickname"), "");
                friend.setId(rs.getString("id"));
                friends.add(friend);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return friends;
    }
} 