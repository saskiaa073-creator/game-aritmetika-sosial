from dotenv import load_dotenv
from google import genai

# Baca GEMINI_API_KEY dari file .env
load_dotenv()

# Client otomatis mengambil API key dari environment variable GEMINI_API_KEY
client = genai.Client()

MODEL = "gemini-3.5-flash"

# Bikin sesi chat supaya Gemini ingat percakapan sebelumnya
chat = client.chats.create(model=MODEL)

print("Chat dengan Gemini (ketik 'keluar' untuk berhenti)\n")

while True:
    pesan = input("Kamu: ").strip()
    if pesan.lower() in ("keluar", "exit", "quit"):
        print("Sampai jumpa!")
        break
    if not pesan:
        continue

    try:
        response = chat.send_message(pesan)
        print(f"Gemini: {response.text}\n")
    except Exception as e:
        print(f"Terjadi error: {e}\n")