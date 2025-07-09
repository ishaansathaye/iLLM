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

    message = Mail(
        from_email=FROM_EMAIL,
        to_emails=to_email,
        subject="Your iLLM Access Password",
        html_content=f"""
          <p>Hi there!</p>
          <p>Your one-time access password is:</p>
          <p style="font-size:1.25rem;"><strong>{password}</strong></p>
          <p>It expires at <em>{expires_at} UTC</em>.</p>
          <p>Enjoy!</p>
        """,
    )
    client = SendGridAPIClient(SG_API_KEY)
    client.send(message)