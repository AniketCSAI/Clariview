import os
import uuid
import nltk
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# NLTK data download
try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)

from transcribe import transcribe_audio
from highlight import get_highlights

app = FastAPI(title="Clariview API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

FRONTEND_DIR = "../frontend"
if os.path.exists(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/")
def root():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Clariview API chal raha hai! 🎙️"}


@app.get("/health")
def health():
    return {"status": "ok", "message": "Clariview is alive!"}


@app.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    allowed = [".mp3", ".wav", ".m4a", ".ogg", ".flac", ".mp4"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' allowed nahi. Use: {allowed}"
        )

    media_id = str(uuid.uuid4())
    save_path = os.path.join(UPLOAD_DIR, media_id + ext)

    with open(save_path, "wb") as f:
        content = await file.read()
        f.write(content)

    print(f"[Clariview] File saved: {save_path}")
    return {
        "media_id": media_id,
        "filename": file.filename,
        "path": save_path,
        "message": "File upload ho gayi!"
    }


@app.post("/process/{media_id}")
async def process_audio(media_id: str, path: str):
    if not os.path.exists(path):
        raise HTTPException(status_code=404,
                            detail="File nahi mili. Pehle /upload karo.")
    try:
        segments = transcribe_audio(path)
        highlights = get_highlights(segments, top_n=5)
        full_text = " ".join(seg["text"] for seg in segments)

        return {
            "media_id": media_id,
            "status": "success",
            "total_segments": len(segments),
            "full_transcript": full_text,
            "segments": segments,
            "highlights": highlights
        }

    except Exception as e:
        raise HTTPException(status_code=500,
                            detail=f"Processing mein error: {str(e)}")