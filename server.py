from flask import Flask, request, jsonify, send_from_directory
from email.message import EmailMessage
import smtplib
import os

app = Flask(__name__, static_folder='.', static_url_path='')

# ---------- Email configuration ----------
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "rohithmanche@gmail.com"      # change
SENDER_PASSWORD = "thtmqxokbdomumdo"             # change (Gmail app password)
TARGET_EMAIL = "bunnymanche@gmail.com"           # change

# ---------- Routes ----------

@app.route("/")
def index():
    # serves index.html from current folder
    return app.send_static_file("index.html")


@app.route("/send_report", methods=["POST"])
def send_report():
    try:
        # form fields must match index.html
        description = request.form.get("description", "")
        location = request.form.get("location", "")
        image = request.files.get("image")

        if not description and not location:
            return jsonify({"status": "error", "message": "Missing data"}), 400

        # build email
        body = f"New FixMyStreet report\nLocation:\n  {location}\n\nDescription:\n{description}\n\n"
        msg = EmailMessage()
        msg["Subject"] = "New FixMyStreet report"
        msg["From"] = SENDER_EMAIL
        msg["To"] = TARGET_EMAIL
        msg.set_content(body)

        # attach image if present
        if image and image.filename:
            img_data = image.read()
            # simple subtype guess
            filename = image.filename
            subtype = "jpeg"
            if filename.lower().endswith(".png"):
                subtype = "png"
            elif filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
                subtype = "jpeg"
            msg.add_attachment(
                img_data,
                maintype="image",
                subtype=subtype,
                filename=filename,
            )

        # send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as smtp:
            smtp.starttls()
            smtp.login(SENDER_EMAIL, SENDER_PASSWORD)
            smtp.send_message(msg)

        return jsonify({"status": "ok"}), 200

    except Exception as e:
        print("Error sending report:", e)
        return jsonify({"status": "error", "message": "Error sending report"}), 500


# serve other static files such as CSS, images, JS if needed
@app.route("/<path:filename>")
def base_static(filename):
    return send_from_directory(".", filename)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)