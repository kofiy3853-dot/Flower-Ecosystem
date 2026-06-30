const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

    // Use SMTP if configured
    if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: parseInt(SMTP_PORT, 10) || 587,
            secure: parseInt(SMTP_PORT, 10) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            }
        });
        console.log('Email: Using SMTP transport');
        return transporter;
    }

    // Fallback: use Ethereal (fake SMTP for testing)
    console.log('Email: No SMTP configured — using Ethereal test account');
    return null;
}

async function sendMail({ to, subject, html, text }) {
    const transporter = getTransporter();
    const from = process.env.SMTP_FROM || 'Flower Ecosystem <noreply@flowerecosystem.com>';

    // If no transporter, log to console (development mode)
    if (!transporter) {
        console.log('\n═══════════════════════════════════════════════════════');
        console.log('📧 EMAIL (Development Mode — not actually sent)');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`To: ${to}`);
        console.log(`From: ${from}`);
        console.log(`Subject: ${subject}`);
        console.log('───────────────────────────────────────────────────────');
        console.log(text || html.replace(/<[^>]*>/g, ''));
        console.log('═══════════════════════════════════════════════════════\n');
        return { success: true, devMode: true };
    }

    try {
        const info = await transporter.sendMail({
            from,
            to,
            subject,
            html,
            text: text || html.replace(/<[^>]*>/g, '')
        });
        console.log('Email sent:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Email send failed:', err.message);
        return { success: false, error: err.message };
    }
}

async function sendPasswordResetEmail(email, resetUrl) {
    const subject = 'Reset Your Password — Flower Ecosystem';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #d63384, #e84393); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px; }
        .content h2 { color: #333; margin-top: 0; }
        .content p { color: #666; line-height: 1.6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #d63384, #e84393); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
        .note { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 12px; margin-top: 20px; font-size: 13px; color: #856404; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">🌸</div>
            <h1>Flower Ecosystem</h1>
        </div>
        <div class="content">
            <h2>Password Reset Request</h2>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="btn">Reset My Password</a>
            </p>
            <p style="color: #999; font-size: 13px;">Or copy this link: <br><a href="${resetUrl}" style="word-break: break-all;">${resetUrl}</a></p>
            <div class="note">
                <strong>⏱️ This link expires in 1 hour.</strong><br>
                If you didn't request this, you can safely ignore this email.
            </div>
        </div>
        <div class="footer">
            <p>Flower Ecosystem — Buy, Sell, Learn & Grow Together</p>
            <p>This is an automated message, please do not reply.</p>
        </div>
    </div>
</body>
</html>`;

    return sendMail({
        to: email,
        subject,
        html,
        text: `Reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`
    });
}

async function sendVerificationEmail(email, verificationUrl) {
    const subject = 'Verify Your Email — Flower Ecosystem';
    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #28a745, #20c997); padding: 30px; text-align: center; }
        .header h1 { color: white; margin: 0; font-size: 24px; }
        .header .icon { font-size: 48px; margin-bottom: 10px; }
        .content { padding: 30px; }
        .content h2 { color: #333; margin-top: 0; }
        .content p { color: #666; line-height: 1.6; }
        .btn { display: inline-block; background: linear-gradient(135deg, #28a745, #20c997); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="icon">✉️</div>
            <h1>Flower Ecosystem</h1>
        </div>
        <div class="content">
            <h2>Welcome! Verify Your Email</h2>
            <p>Thanks for joining Flower Ecosystem! Please verify your email address to get started:</p>
            <p style="text-align: center;">
                <a href="${verificationUrl}" class="btn">Verify Email</a>
            </p>
            <p style="color: #999; font-size: 13px;">Or copy this link: <br><a href="${verificationUrl}" style="word-break: break-all;">${verificationUrl}</a></p>
        </div>
        <div class="footer">
            <p>Flower Ecosystem — Buy, Sell, Learn & Grow Together</p>
        </div>
    </div>
</body>
</html>`;

    return sendMail({
        to: email,
        subject,
        html,
        text: `Verify your email: ${verificationUrl}`
    });
}

module.exports = {
    sendMail,
    sendPasswordResetEmail,
    sendVerificationEmail
};
