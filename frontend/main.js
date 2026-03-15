let resultData = null;
let uploadedFilePath = null;
let uploadedMediaId = null;

const API_BASE = "http://localhost:8000";

document.getElementById("fileInput").addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  document.getElementById("fileName").textContent = `✅ Selected: ${file.name}`;
  document.getElementById("processBtn").disabled = false;

  const player = document.getElementById("audioPlayer");
  player.src = URL.createObjectURL(file);
  document.getElementById("playerSection").classList.remove("hidden");
});


async function startProcessing() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files[0]) {
    alert("Bhai pehle file choose karo! 😅");
    return;
  }

  const file = fileInput.files[0];

  document.getElementById("processBtn").disabled = true;
  document.getElementById("progressSection").classList.remove("hidden");
  document.getElementById("resultsSection").classList.add("hidden");

  try {
    updateProgress(20, "📤 File upload ho rahi hai...");

    const formData = new FormData();
    formData.append("file", file);

    const uploadRes = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json();
      throw new Error(err.detail || "Upload failed");
    }

    const uploadData = await uploadRes.json();
    uploadedMediaId = uploadData.media_id;
    uploadedFilePath = uploadData.path;

    updateProgress(50, "🧠 AI transcription chal rahi hai... (thoda time lagega)");

    const processRes = await fetch(
      `${API_BASE}/process/${uploadedMediaId}?path=${encodeURIComponent(uploadedFilePath)}`,
      { method: "POST" }
    );

    if (!processRes.ok) {
      const err = await processRes.json();
      throw new Error(err.detail || "Processing failed");
    }

    resultData = await processRes.json();

    updateProgress(100, "✅ Done! Results ready hain!");

    setTimeout(() => {
      document.getElementById("progressSection").classList.add("hidden");
      renderResults(resultData);
    }, 800);

  } catch (error) {
    console.error(error);
    updateProgress(0, `❌ Error: ${error.message}`);
    document.getElementById("processBtn").disabled = false;
    alert(`Kuch gadbad ho gayi bhai:\n${error.message}`);
  }
}


function renderResults(data) {
  const highlightsList = document.getElementById("highlightsList");
  highlightsList.innerHTML = "";

  if (data.highlights && data.highlights.length > 0) {
    data.highlights.forEach((h) => {
      const div = document.createElement("div");
      div.className = "highlight-item";
      div.onclick = () => seekAudio(h.start_sec);
      div.innerHTML = `
        <div class="highlight-time">
          ⏱️ ${formatTime(h.start_sec)} → ${formatTime(h.end_sec)}
          <span class="highlight-score">Score: ${h.score}</span>
        </div>
        <div class="highlight-text">${h.text}</div>
      `;
      highlightsList.appendChild(div);
    });
  } else {
    highlightsList.innerHTML = "<p style='color:#94a3b8'>Koi highlight nahi mili.</p>";
  }

  const transcriptList = document.getElementById("transcriptList");
  transcriptList.innerHTML = "";

  data.segments.forEach((seg) => {
    const div = document.createElement("div");
    div.className = "segment-item";
    div.onclick = () => seekAudio(seg.start_sec);
    div.innerHTML = `
      <span class="seg-time">[${formatTime(seg.start_sec)}]</span>
      <span class="seg-text">${seg.text}</span>
    `;
    transcriptList.appendChild(div);
  });

  document.getElementById("resultsSection").classList.remove("hidden");
  document.getElementById("resultsSection").scrollIntoView({ behavior: "smooth" });
}


function updateProgress(percent, message) {
  document.getElementById("progressFill").style.width = percent + "%";
  document.getElementById("progressText").textContent = message;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function seekAudio(seconds) {
  const player = document.getElementById("audioPlayer");
  if (player.src) {
    player.currentTime = seconds;
    player.play();
  }
}

function downloadJSON() {
  if (!resultData) return;
  const blob = new Blob([JSON.stringify(resultData, null, 2)],
                        { type: "application/json" });
  downloadFile(blob, "clariview_result.json");
}

function downloadTXT() {
  if (!resultData) return;
  let txt = "=== CLARIVIEW TRANSCRIPT ===\n\n";
  txt += "--- HIGHLIGHTS ---\n";
  resultData.highlights.forEach((h) => {
    txt += `\n[${formatTime(h.start_sec)} → ${formatTime(h.end_sec)}]\n`;
    txt += h.text + "\n";
  });
  txt += "\n\n--- FULL TRANSCRIPT ---\n";
  resultData.segments.forEach((seg) => {
    txt += `\n[${formatTime(seg.start_sec)}] ${seg.text}`;
  });

  const blob = new Blob([txt], { type: "text/plain" });
  downloadFile(blob, "clariview_transcript.txt");
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}