/**
 * @file Email service utility for OLOHA application
 * @module services/emailService
 * @description Comprehensive email service using Nodemailer with Gmail SMTP.
 * Supports sending generic emails, password reset emails with secure links, and HTML templates.
 * @version 1.0.0
 * @requires nodemailer
 */

const nodemailer = require("nodemailer");

// === Environment Validation ===
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error(
    "Missing required environment variables: EMAIL_USER and EMAIL_PASS"
  );
}

if (!process.env.SUPERADMIN_FRONTEND_URL) {
  console.warn(
    "SUPERADMIN_FRONTEND_URL not set - password reset links will not work for admin users"
  );
}

/**
 * Nodemailer transporter configured for Gmail SMTP
 * @type {import('nodemailer').Transporter}
 * @constant
 */
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true,
  },
});

/**
 * Send email using configured transporter
 * @async
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content of email
 * @returns {Promise<boolean>} True if sent successfully
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"OLOHA" <${process.env.EMAIL_USER}>`,
      to: to.trim(),
      subject,
      html,
      text: html.replace(/<[^>]+>/g, " ").substring(0, 200) + "...",
    });

    console.log(
      `Email sent successfully to ${to} | MessageId: ${info.messageId}`
    );
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return false;
  }
};

/**
 * Generates an HTML email template with OLOHA branding
 * @param {string} content - HTML body content
 * @param {string} [title=""] - Page title
 * @returns {string} Complete HTML email document
 */
const getEmailTemplate = (content, title = "") => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#f5f7fa;color:#2d3748;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:40px 0;background:#f5f7fa;">
        <table width="100%" style="max-width:640px;background:#ffffff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.08);overflow:hidden;">
          <tr>
            <td style="background:#8E0400;padding:32px 20px;text-align:center;border-bottom:4px solid #6b0300;">
              <img 
                src="https://res.cloudinary.com/dd524q9vc/image/upload/v1763400321/Oloha/logo/logo_xazy6j.png" 
                alt="OLOHA" 
                style="width:130px;height:auto;margin-bottom:12px;" 
              />
              <h1 style="font-size:26px;font-weight:700;color:#ffffff;margin:0;letter-spacing:-0.5px;">OLOHA</h1>
              <p style="color:#fad4d4;font-size:14px;margin:8px 0 0;opacity:0.9;">
                Your trusted event management companion
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:48px 40px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:32px 40px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#64748b;font-size:14px;line-height:1.7;">
                &copy; ${new Date().getFullYear()} <strong>OLOHA</strong>. All rights reserved.
              </p>
              <p style="margin:16px 0 0;color:#94a3b8;font-size:13px;">
                This is an automated message. If you didn't request this action, secure your account immediately.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

/**
 * Get frontend URL for a specific user role
 * @param {string} role - User role
 * @returns {string} Base frontend URL
 * @throws {Error} If role URL is not configured
 */
function getFrontendUrl(role) {
  switch (role) {
    case "SUPERADMIN":
      if (!process.env.SUPERADMIN_FRONTEND_URL) {
        throw new Error("SUPERADMIN_FRONTEND_URL is not defined");
      }
      return process.env.SUPERADMIN_FRONTEND_URL.replace(/\/+$/, "");
    default:
      throw new Error(`No frontend URL configured for role: ${role}`);
  }
}

/**
 * Send a password reset email with token link
 * @async
 * @param {string} toEmail - Recipient email
 * @param {string} resetToken - Reset token
 * @param {string} role - User role
 * @returns {Promise<boolean>} True if email sent successfully
 */
const sendPasswordResetEmail = async (toEmail, resetToken, role) => {
  const frontendUrl = getFrontendUrl(role);
  const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

  const content = `
    <div style="text-align:center;max-width:500px;margin:0 auto;">
      <h2 style="color:#1a202c;font-size:28px;margin-bottom:20px;font-weight:700;letter-spacing:-0.5px;">Password Reset Request</h2>
      <p style="color:#4a5568;line-height:1.7;margin-bottom:32px;font-size:16px;">
        Click the button below to set a new password.
      </p>
      <div style="margin:40px 0;">
        <a href="${resetLink}" 
           style="background:linear-gradient(135deg,#8E0400 0%,#c1121f 100%);
                  color:#ffffff;padding:16px 40px;text-decoration:none;
                  border-radius:12px;font-weight:700;font-size:17px;display:inline-block;">
          Reset Password Now
        </a>
      </div>
      <p style="color:#718096;font-size:14px;margin-top:32px;line-height:1.6;">
        This link expires in <strong>1 hour</strong>. Ignore if you did not request this.
      </p>

      <p style="color:#718096;font-size:14px;margin-top:32px;line-height:1.6;">
        ${resetToken}
      </p>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: "Reset Your OLOHA Password",
    html: getEmailTemplate(content, "Password Reset Request"),
  });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  getEmailTemplate,
};
