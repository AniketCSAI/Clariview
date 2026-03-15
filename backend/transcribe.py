import os
from faster_whisper import WhisperModel

MODEL_SIZE = "medium"

print(f"[Clariview] Faster-Whisper '{MODEL_SIZE}' load ho raha hai...")
model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
print("[Clariview] Model ready!")


def transcribe_audio(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File nahi mili: {file_path}")

    print(f"[Clariview] Transcribing: {file_path}")

    segments, info = model.transcribe(
        file_path,
        beam_size=5,
        language=None,
        task="transcribe",
        vad_filter=True,
    )

    print(f"[Clariview] Detected language: {info.language}")

    result = []
    for seg in segments:
        result.append({
            "start_ms":  int(seg.start * 1000),
            "end_ms":    int(seg.end   * 1000),
            "start_sec": round(seg.start, 1),
            "end_sec":   round(seg.end,   1),
            "text":      seg.text.strip()
        })

    print(f"[Clariview] Done! {len(result)} segments mili!")
    return result