const AI_FUNCTION_URL = "https://rozfgvucyiwqqmmrmbph.supabase.co/functions/v1/ai-chat";

const chatBox = document.getElementById("chatBox");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", sendMessage);

userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  const message = userInput.value.trim();

  if (!message) return;

  addMessage(message, "user");
  userInput.value = "";

  const loadingMessage = addMessage("Sedang berpikir...", "bot");

  try {
  const res = await fetch(AI_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ message })
  });

  const data = await res.json();
  console.log(data);

  const jawaban =
    data?.choices?.[0]?.message?.content ||
    data?.message?.content ||
    data?.error?.message ||
    data?.error ||
    "Maaf, AI belum memberikan jawaban.";

  // Render Markdown jika tersedia
  if (typeof marked !== "undefined") {
    loadingMessage.innerHTML = marked.parse(jawaban);
  } else {
    loadingMessage.textContent = jawaban;
  }

} catch (error) {
  console.error(error);

  if (typeof marked !== "undefined") {
    loadingMessage.innerHTML = `
      <div style="color:#dc2626;">
        <strong>Terjadi kesalahan.</strong><br>
        Gagal menghubungi AI.
      </div>
    `;
  } else {
    loadingMessage.textContent = "Gagal menghubungi AI.";
  }
}

  chatBox.scrollTop = chatBox.scrollHeight;
}

function addMessage(text, type) {
  const div = document.createElement("div");
  div.className = `message ${type}`;

  if (type === "bot" && typeof marked !== "undefined") {
    div.innerHTML = marked.parse(text);
  } else {
    div.textContent = text;
  }

  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;

  return div;
}