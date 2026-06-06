import nodemailer from "nodemailer";

const smtpReady = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

if (!smtpReady) {
  console.warn(
    "⚠️  SMTP_USER or SMTP_PASS not set — email sending is disabled."
  );
}

const transporter = smtpReady
  ? nodemailer.createTransport({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: {
        user: "resend",
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

export const sendEmail = async ({ to, subject, body }) => {
  if (!smtpReady || !transporter) {
    console.warn(`sendEmail skipped (SMTP not configured) [to: ${to}]`);
    return null;
  }
  try {
    const response = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to,
      subject,
      html: body,
    });
    return response;
  } catch (error) {
    console.error(`sendEmail failed [to: ${to}]:`, error.message);
    throw error;
  }
};