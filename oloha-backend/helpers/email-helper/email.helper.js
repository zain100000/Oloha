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
      from: "OLOHA",
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
 * Generates a premium, OLOHA-branded HTML email template
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
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    .btn-primary { 
      background: linear-gradient(135deg, #FEBD2F 0%, #f4a62a 100%);
      color: #000000 !important;
      font-weight: 700;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 12px;
      display: inline-block;
      font-size: 17px;
      box-shadow: 0 8px 25px rgba(254, 189, 47, 0.4);
      transition: all 0.3s ease;
    }
    .btn-primary:hover { 
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(254, 189, 47, 0.5);
    }
  </style>
</head>
<body style="margin:0;padding:0;font-family:'Inter',Arial,sans-serif;background:#171725;color:#FFFFFF;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#171725;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="100%" style="max-width:640px;background:#FFFFFF;border-radius:18px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          
          <!-- Header with Gold Accent -->
          <tr>
            <td style="background:#000000;padding:40px 30px;text-align:center;position:relative;">
              <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg, #FEBD2F, #f4a62a);"></div>
              <img 
                src="https://res.cloudinary.com/dd524q9vc/image/upload/v1763400321/Oloha/logo/logo_xazy6j.png" 
                alt="OLOHA" 
                style="width:140px;height:auto;margin-bottom:16px;" 
              />
              <h1 style="color:#FEBD2F;font-size:32px;font-weight:800;margin:0;letter-spacing:-1px;">OLOHA</h1>              
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:48px 40px;background:#FFFFFF;color:#171725;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#171725;padding:40px 40px;text-align:center;">
              <p style="margin:0 0 12px 0;color:#FEBD2F;font-size:18px;font-weight:600;">
                OLOHA
              </p>
              <p style="margin:0;color:#888888;font-size:14px;line-height:1.7;">
                &copy; ${new Date().getFullYear()} <strong style="color:#FEBD2F;">OLOHA</strong>. All rights reserved.
              </p>
              <p style="margin:20px 0 0;color:#666666;font-size:13px;line-height:1.6;">
                This is an automated message from OLOHA.<br>
                If you didn't initiate this action, please ignore this email.
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
      if (!process.env.FRONTEND_URL) {
        throw new Error("FRONTEND_URL is not defined");
      }
      return process.env.FRONTEND_URL.replace(/\/+$/, "");

    case "AGENCY":
      if (!process.env.FRONTEND_URL) {
        throw new Error("FRONTEND_URL is not defined");
      }
      return process.env.FRONTEND_URL.replace(/\/+$/, "");
    default:
      throw new Error(`No frontend URL configured for role: ${role}`);
  }
}

/**
 * Send a password reset email with premium OLOHA styling
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
    <div style="text-align:center;max-width:520px;margin:0 auto;">
      <h2 style="color:#000000;font-size:30px;margin-bottom:20px;font-weight:800;letter-spacing:-0.8px;line-height:1.2;">
        Reset Your Password
      </h2>
      <p style="color:#444444;line-height:1.8;margin-bottom:36px;font-size:17px;">
        We received a request to reset your OLOHA account password. 
        Click the button below to create a new one.
      </p>
      
      <div style="margin:45px 0;">
        <a href="${resetLink}" class="btn-primary">
          Reset Password Now
        </a>
      </div>

      <p style="color:#666666;font-size:15px;line-height:1.7;margin-top:40px;">
        This link will expire in <strong style="color:#FEBD2F;">1 hour</strong> for security.<br><br>
        If you didn't request this, please ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: "OLOHA • Reset Your Password",
    html: getEmailTemplate(content, "Password Reset - OLOHA"),
  });
};

/**
 * Send Agency Account Deletion Confirmation Email
 * @async
 * @param {string} toEmail - Agency's email
 * @param {string} agencyName - Name of the agency (for personalization)
 * @returns {Promise<boolean>} True if email sent successfully
 */
const sendAgencyDeletionConfirmationEmail = async (toEmail, agencyName) => {
  const content = `
    <div style="text-align:center;max-width:520px;margin:0 auto;">
      <h2 style="color:#000000;font-size:30px;margin-bottom:20px;font-weight:800;letter-spacing:-0.8px;line-height:1.2;">
        Your OLOHA Agency Account Has Been Permanently Deleted
      </h2>
      
      <p style="color:#444444;line-height:1.8;margin-bottom:28px;font-size:17px;">
        Hello <strong>${agencyName}</strong>,
      </p>
      
      <p style="color:#444444;line-height:1.8;margin-bottom:32px;font-size:17px;">
        This is a confirmation that your OLOHA agency account, along with all associated data 
        (travel packages, bookings, images, verification documents, etc.), has been 
        <strong style="color:#d32f2f;">permanently deleted</strong> from our platform as per your request.
      </p>

      <div style="background:#fff3cd;padding:24px;border-radius:12px;margin:32px 0;border-left:6px solid #FEBD2F;">
        <p style="margin:0;color:#856404;font-size:16px;line-height:1.7;">
          <strong>Important:</strong> This action is irreversible.<br>
          All your data has been completely removed and cannot be recovered.
        </p>
      </div>

      <p style="color:#555555;font-size:16px;line-height:1.8;margin-bottom:40px;">
        We're sorry to see you go! If you ever want to join OLOHA again, 
        we'd love to welcome you back. You can register a new agency account anytime.
      </p>     

      <p style="color:#777777;font-size:14px;margin-top:50px;">
        Thank you for being part of the OLOHA family.<br>
        Wishing you safe travels and success ahead!
      </p>
    </div>
  `;

  return await sendEmail({
    to: toEmail,
    subject: "OLOHA • Your Agency Account Has Been Deleted",
    html: getEmailTemplate(content, "Account Deleted - OLOHA"),
  });
};

module.exports = {
  sendEmail,
  getEmailTemplate,
  sendPasswordResetEmail,
  sendAgencyDeletionConfirmationEmail,
};
