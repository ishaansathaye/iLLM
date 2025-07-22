import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

SG_API_KEY = os.getenv("SENDGRID_API_KEY")
FROM_EMAIL = "no-reply@illm-issat.online"


def send_user_password_email(to_email: str, password: str, expires_at: str):
    """
    Sends the one-time password email via SendGrid.
    """
    if not SG_API_KEY:
        raise RuntimeError("SENDGRID_API_KEY is not set")

    # Format the expiration time for better readability
    from datetime import datetime
    from zoneinfo import ZoneInfo

    try:
        # Parse the ISO format datetime string
        expires_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))

        # Format in multiple timezones
        utc_time = expires_dt.strftime("%B %d, %Y at %I:%M %p UTC")

        # Convert to common timezones
        et_time = expires_dt.astimezone(
            ZoneInfo('US/Eastern')).strftime("%I:%M %p ET")
        pt_time = expires_dt.astimezone(
            ZoneInfo('US/Pacific')).strftime("%I:%M %p PT")
        cet_time = expires_dt.astimezone(
            ZoneInfo('Europe/Berlin')).strftime("%I:%M %p CET")

        formatted_expires = utc_time
        timezone_info = f"({et_time} • {pt_time} • {cet_time})"

    except (ValueError, AttributeError, ImportError):
        # Fallback if parsing fails or zoneinfo not available
        formatted_expires = expires_at
        timezone_info = ""

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="🔐 Your iLLM Access Password",
        html_content=f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your iLLM Access Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #334155;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1); margin-top: 40px; margin-bottom: 40px;">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                        iLLM
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 16px; color: #e2e8f0; opacity: 0.9;">
                        ishaan's Large Language Model
                    </p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 600; color: #1e293b;">
                        Your Access Password
                    </h2>
                    
                    <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #64748b;">
                        Welcome! I've generated a secure access password for you to access iLLM. Use this password to log in to your account.
                    </p>
                    
                    <!-- Password Box -->
                    <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); border: 2px solid #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 500; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">
                            Your Password
                        </p>
                        <div style="font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; font-size: 24px; font-weight: 700; color: #1e293b; letter-spacing: 2px; background-color: #ffffff; padding: 16px 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 8px 0;">
                            {password}
                        </div>
                        <p style="margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                            Copy and paste this password
                        </p>
                    </div>
                    
                    <!-- Expiration Warning -->
                    <div style="background-color: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 24px 0;">
                        <div style="display: flex; align-items: center;">
                            <span style="font-size: 18px; margin-right: 8px;">⏰</span>
                            <div>
                                <p style="margin: 0; font-size: 14px; font-weight: 600; color: #92400e;">
                                    Time-Sensitive Access
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 13px; color: #b45309;">
                                    This password expires on <strong>{formatted_expires}</strong>
                                </p>
                                <p style="margin: 6px 0 0 0; font-size: 11px; color: #d97706; font-style: italic;">
                                    {timezone_info}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Instructions -->
                    <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 20px; margin: 24px 0;">
                        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #0c4a6e; display: flex; align-items: center;">
                            <span style="margin-right: 8px;">💡</span>
                            How to Use Your Password
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #075985; line-height: 1.6;">
                            <li style="margin-bottom: 8px;">Copy the password above</li>
                            <li style="margin-bottom: 8px;">Go to the iLLM login page</li>
                            <li style="margin-bottom: 8px;">Enter your email and this password</li>
                            <li>Ask unlimited questions until your account expires!</li>
                            <li>Continue asking questions in the demo mode after your account expires.</li>
                        </ol>
                    </div>
                    
                    <p style="margin: 24px 0 0 0; font-size: 14px; line-height: 1.6; color: #64748b;">
                        If you didn't request this password or have any questions, please contact me from the website.
                    </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 30px; text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #94a3b8;">
                        This is an automated message from iLLM. Please do not reply to this email.
                    </p>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #cbd5e1;">
                        © 2025 iLLM. All rights reserved.
                    </p>
                </div>
                
            </div>
        </body>
        </html>
        """,
    )
    client = SendGridAPIClient(SG_API_KEY)
    client.send(message)
