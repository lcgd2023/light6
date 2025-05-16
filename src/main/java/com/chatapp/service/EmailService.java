package com.chatapp.service;

import com.resend.*;
import java.util.Random;

public class EmailService {
    private static final String RESEND_API_KEY = "re_X41R1iYy_HmYh9jgFHPQvzmFu2oduGFdk";
    private final Resend resend;

    public EmailService() {
        this.resend = new Resend(RESEND_API_KEY);
    }

    public String generateVerificationCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }

    public void sendVerificationEmail(String to, String verificationCode) {
        SendEmailRequest sendEmailRequest = SendEmailRequest.builder()
                .from("微信网页版 <onboarding@resend.dev>")
                .to(to)
                .subject("验证码")
                .html("<p>您的验证码是: <strong>" + verificationCode + "</strong></p>" +
                      "<p>此验证码用于注册微信网页版账号，请勿泄露给他人。</p>" +
                      "<p>如果这不是您的操作，请忽略此邮件。</p>")
                .build();

        resend.emails().send(sendEmailRequest);
    }
} 