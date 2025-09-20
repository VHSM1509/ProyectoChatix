from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
import json
import hashlib

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
USERS_FILE = "users.json"

class Message(BaseModel):
    user_id: str
    message: str
    provider: str

class User(BaseModel):
    username: str
    password: str

def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(data):
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.post("/register")
async def register(user: User):
    users = load_users()
    if user.username in users:
        raise HTTPException(status_code=400, detail="Usuario ya existe.")
    users[user.username] = {"password": hash_password(user.password), "history": []}
    save_users(users)
    return {"message": "Registro exitoso."}

@app.post("/login")
async def login(user: User):
    users = load_users()
    if user.username not in users:
        raise HTTPException(status_code=400, detail="Usuario no encontrado.")
    if users[user.username]["password"] != hash_password(user.password):
        raise HTTPException(status_code=401, detail="Contraseña incorrecta.")
    history = users[user.username]["history"]
    return {"message": "Login exitoso.", "history": history}

@app.post("/chat")
async def chat(req: Message):
    users = load_users()
    if req.user_id not in users:
        return {"response": "Debes iniciar sesión primero."}

    try:
        if req.provider == "openai":
            from openai import OpenAI
            client = OpenAI(api_key=OPENAI_API_KEY)
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "Eres un asistente educativo llamado Robotix."},
                    {"role": "user", "content": req.message}
                ],
                temperature=0.7,
                max_tokens=300
            )
            text = response.choices[0].message.content
        elif req.provider == "ollama":
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={"model": "mistral", "prompt": req.message}
            )
            text = response.json().get("response", "No se pudo generar respuesta.")
        else:
            text = "Proveedor no soportado."

        users[req.user_id]["history"].append({"question": req.message, "response": text})
        save_users(users)

        return {"response": text}

    except Exception as e:
        return {"response": "Ocurrió un error.", "error": str(e)}

# 🔥 Endpoints para el panel de administración
@app.get("/admin/users")
async def admin_users():
    users = load_users()
    return list(users.keys())

@app.get("/admin/user/{username}")
async def admin_user_data(username: str):
    users = load_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    return users[username]

@app.get("/admin/stats")
async def admin_stats():
    users = load_users()
    topics_summary = {}
    for user_data in users.values():
        for entry in user_data.get("history", []):
            topic = entry["question"].split()[0].lower() if entry["question"] else "sin_tema"
            topics_summary[topic] = topics_summary.get(topic, 0) + 1
    return {"topics_summary": topics_summary}

@app.delete("/admin/delete/{username}")
async def admin_delete_user(username: str):
    users = load_users()
    if username not in users:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")
    del users[username]
    save_users(users)
    return {"message": f"Usuario {username} eliminado exitosamente."}
