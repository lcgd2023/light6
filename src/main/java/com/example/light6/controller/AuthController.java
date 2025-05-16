package com.example.light6.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api")
public class AuthController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest().body("邮箱不能为空");
        }

        // 生成6位随机验证码
        String code = String.format("%06d", new Random().nextInt(1000000));
        
        // 将验证码保存到数据库，设置5分钟过期
        String sql = "INSERT INTO password_reset_codes (email, code, expires_at) VALUES (?, ?, datetime('now', '+5 minutes'))";
        try {
            jdbcTemplate.update(sql, email, code);
            
            // 发送重置密码邮件
            String subject = "重置密码";
            String content = String.format("您的重置密码验证码是：%s，5分钟内有效。", code);
            emailService.sendEmail(email, subject, content);
            
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("发送重置密码邮件失败");
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String code = request.get("code");
        String newPassword = request.get("newPassword");

        if (email == null || code == null || newPassword == null) {
            return ResponseEntity.badRequest().body("参数不完整");
        }

        // 验证验证码
        String sql = "SELECT * FROM password_reset_codes WHERE email = ? AND code = ? AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 1";
        try {
            List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, email, code);
            if (results.isEmpty()) {
                return ResponseEntity.badRequest().body("验证码无效或已过期");
            }

            // 更新密码
            String updateSql = "UPDATE users SET password = ? WHERE email = ?";
            String hashedPassword = passwordEncoder.encode(newPassword);
            jdbcTemplate.update(updateSql, hashedPassword, email);

            // 删除已使用的验证码
            String deleteSql = "DELETE FROM password_reset_codes WHERE email = ?";
            jdbcTemplate.update(deleteSql, email);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("重置密码失败");
        }
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, HttpServletRequest httpRequest) {
        String token = httpRequest.getHeader("Authorization");
        if (token == null || !token.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("未授权");
        }

        token = token.substring(7);
        String email;
        try {
            email = jwtUtil.getEmailFromToken(token);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("无效的token");
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (currentPassword == null || newPassword == null) {
            return ResponseEntity.badRequest().body("参数不完整");
        }

        // 验证当前密码
        String sql = "SELECT password FROM users WHERE email = ?";
        try {
            String storedPassword = jdbcTemplate.queryForObject(sql, String.class, email);
            if (!passwordEncoder.matches(currentPassword, storedPassword)) {
                return ResponseEntity.badRequest().body("当前密码错误");
            }

            // 更新密码
            String updateSql = "UPDATE users SET password = ? WHERE email = ?";
            String hashedPassword = passwordEncoder.encode(newPassword);
            jdbcTemplate.update(updateSql, hashedPassword, email);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("修改密码失败");
        }
    }
} 