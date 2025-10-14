import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const sendMagicLink = internalAction({
  args: {
    to: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Sending magic link to ${args.to}: ${args.url}`);
    
    // Check if Resend is configured
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendDomain = process.env.RESEND_DOMAIN;
    
    if (resendApiKey && resendDomain) {
      try {
        // Use Resend for production email sending
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: resendDomain,
          to: args.to,
          subject: "Sign in to your Todo App",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Sign in to your Todo App</h2>
              <p style="color: #666; margin-bottom: 20px;">Click the button below to sign in to your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${args.url}" style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Sign In
                </a>
              </div>
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                This link will expire in 10 minutes.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        
        console.log(`📧 Magic link email sent to ${args.to} via Resend`);
      } catch (error) {
        console.error("Failed to send magic link email:", error);
        // Fallback to console log
        console.log(`🔗 Magic Link (fallback): ${args.url}`);
      }
    } else {
      // Development mode or Resend not configured
      console.log(`🔗 Magic Link: ${args.url}`);
      console.log("To enable email sending, set RESEND_API_KEY and RESEND_DOMAIN environment variables");
    }
    
    return null;
  },
});

export const sendOTPVerification = internalAction({
  args: {
    to: v.string(),
    code: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Sending OTP to ${args.to}: ${args.code}`);
    
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendDomain = process.env.RESEND_DOMAIN;
    
    if (resendApiKey && resendDomain) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: resendDomain,
          to: args.to,
          subject: "Your verification code",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Your verification code</h2>
              <p style="color: #666; margin-bottom: 20px;">Use this code to verify your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background: #f8f9fa; border: 2px solid #007bff; padding: 20px; border-radius: 8px; font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 4px;">
                  ${args.code}
                </div>
              </div>
              <p style="color: #999; font-size: 14px;">
                This code will expire in 10 minutes.
              </p>
            </div>
          `,
        });
        
        console.log(`📧 OTP email sent to ${args.to} via Resend`);
      } catch (error) {
        console.error("Failed to send OTP email:", error);
        console.log(`🔢 OTP (fallback): ${args.code}`);
      }
    } else {
      console.log(`🔢 OTP: ${args.code}`);
    }
    
    return null;
  },
});

export const sendEmailVerification = internalAction({
  args: {
    to: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Sending email verification to ${args.to}: ${args.url}`);
    
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendDomain = process.env.RESEND_DOMAIN;
    
    if (resendApiKey && resendDomain) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: resendDomain,
          to: args.to,
          subject: "Verify your email address",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Verify your email address</h2>
              <p style="color: #666; margin-bottom: 20px;">Click the button below to verify your email:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${args.url}" style="display: inline-block; background: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Verify Email
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 24 hours.
              </p>
            </div>
          `,
        });
        
        console.log(`📧 Email verification sent to ${args.to} via Resend`);
      } catch (error) {
        console.error("Failed to send email verification:", error);
        console.log(`✅ Email verification link (fallback): ${args.url}`);
      }
    } else {
      console.log(`✅ Email verification link: ${args.url}`);
    }
    
    return null;
  },
});

export const sendResetPassword = internalAction({
  args: {
    to: v.string(),
    url: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    console.log(`Sending password reset to ${args.to}: ${args.url}`);
    
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendDomain = process.env.RESEND_DOMAIN;
    
    if (resendApiKey && resendDomain) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(resendApiKey);
        
        await resend.emails.send({
          from: resendDomain,
          to: args.to,
          subject: "Reset your password",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #333; margin-bottom: 20px;">Reset your password</h2>
              <p style="color: #666; margin-bottom: 20px;">Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${args.url}" style="display: inline-block; background: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Reset Password
                </a>
              </div>
              <p style="color: #999; font-size: 14px;">
                This link will expire in 1 hour.<br>
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
        
        console.log(`📧 Password reset email sent to ${args.to} via Resend`);
      } catch (error) {
        console.error("Failed to send password reset email:", error);
        console.log(`🔒 Password reset link (fallback): ${args.url}`);
      }
    } else {
      console.log(`🔒 Password reset link: ${args.url}`);
    }
    
    return null;
  },
});
