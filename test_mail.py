from email.message import EmailMessage
import smtplib

SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "rohithmanche@gmail.com"   # same as in server.py
SENDER_PASSWORD = "thtmqxokbdomumdo"
TARGET_EMAIL = "bunnymanche@gmail.com"

def send_test_mail():
    msg = EmailMessage()
    msg["Subject"] = "Test mail from FixMyStreet project"
    msg["From"] = SENDER_EMAIL
    msg["To"] = TARGET_EMAIL
    msg.set_content("This is a test email from the test_mail.py script.")

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
        smtp.starttls()
        smtp.login(SENDER_EMAIL, SENDER_PASSWORD)
        smtp.send_message(msg)

    print("Test email sent.")

if __name__ == "__main__":
    send_test_mail()