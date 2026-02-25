const state = {
  language: localStorage.getItem("jeevikaLanguage") || "en",
  freeMessagesUsed: Number(localStorage.getItem("jeevikaFreeMessagesUsed") || 0),
  subscribed: localStorage.getItem("jeevikaSubscribed") === "true",
  subscriptionPlan: localStorage.getItem("jeevikaSubscriptionPlan") || null,
  reportText: localStorage.getItem("jeevikaReportText") || "",
  reportName: localStorage.getItem("jeevikaReportName") || "",
  callActive: false,
  isMuted: false,
  speakerOn: true,
  recognition: null,
  micStream: null,
  callStartMs: 0,
  callTimerInt: null,
  processingSpeech: false,
};

const i18n = {
  en: {
    welcome: "Hey! I’m Jeevika 🌿 Your health buddy from BalanceBite. Ask me anything about food, reports, or say: create diet plan for 14 days for diabetes.",
    limit: "You’ve used 20 free messages. Subscribe from Assistant details to continue.",
  },
  hi: {
    welcome: "हाय! मैं Jeevika 🌿 हूँ। डाइट, रिपोर्ट और रोज़मर्रा की हेल्थ हेल्प के लिए मुझसे बात करें।",
    limit: "आपके 20 फ्री मैसेज पूरे हो गए हैं। आगे बढ़ने के लिए सब्सक्राइब करें।",
  },
};

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const langBtn = document.getElementById("langBtn");
const callBtn = document.getElementById("callBtn");
const reportInput = document.getElementById("reportInput");
const usageInfo = document.getElementById("usageInfo");
const assistantDetailsBtn = document.getElementById("assistantDetailsBtn");
const assistantDetailsDialog = document.getElementById("assistantDetailsDialog");
const closeDetails = document.getElementById("closeDetails");
const assistantStatus = document.getElementById("assistantStatus");
const callScreen = document.getElementById("callScreen");
const callStateText = document.getElementById("callStateText");
const callTimer = document.getElementById("callTimer");
const muteBtn = document.getElementById("muteBtn");
const speakerBtn = document.getElementById("speakerBtn");
const hangupBtn = document.getElementById("hangupBtn");

function setUsage() {
  const left = Math.max(0, 20 - state.freeMessagesUsed);
  usageInfo.textContent = state.subscribed
    ? `Subscribed (${state.subscriptionPlan}) • Unlimited messages`
    : `Free messages left: ${left}`;
}

function addMessage(text, sender = "bot", options = {}) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.innerHTML = `${text}<div class="meta">${new Date().toLocaleTimeString()}</div>`;

  if (options.downloadCallback) {
    const btn = document.createElement("button");
    btn.className = "chat-download-btn";
    btn.textContent = options.downloadLabel || "Download PDF";
    btn.addEventListener("click", options.downloadCallback);
    div.appendChild(btn);
  }

  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function canChat() {
  return state.subscribed || state.freeMessagesUsed < 20;
}

function getPreferredVoice() {
  const voices = speechSynthesis.getVoices();
  return voices.find((v) => /hi-IN|en-IN/i.test(v.lang) && /female|heera|sangeeta|veena|lekha|kavya|ananya|priya/i.test(v.name))
    || voices.find((v) => /hi-IN|en-IN/i.test(v.lang) && /female/i.test(v.name))
    || voices.find((v) => /hi-IN|en-IN/i.test(v.lang));
}

function speak(text) {
  if (!state.callActive || !state.speakerOn || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.02;
  utterance.pitch = 1.1;
  utterance.volume = 1;
  const voice = getPreferredVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

const mealLibrary = {
  breakfast: ["Moong chilla + mint chutney", "Vegetable oats upma", "Poha with peanuts + sprouts", "Besan cheela + curd", "Idli + sambar", "Ragi dosa + coconut chutney", "Paneer multigrain toast"],
  midMorning: ["Guava + almonds", "Papaya + pumpkin seeds", "Apple + peanut butter", "Coconut water + chia", "Pear + walnuts", "Buttermilk + seeds"],
  lunch: ["Roti + dal + salad + sabzi", "Brown rice + rajma + salad", "Millet khichdi + curd", "Quinoa pulao + chole", "Roti + paneer bhurji", "Lemon rice + sambar"],
  eveningSnack: ["Roasted chana + buttermilk", "Makhana chaat + tea", "Sprouts bhel", "Boiled corn", "Fruit chaat", "Hummus + cucumber"],
  dinner: ["Paneer/tofu + soup", "Dal soup + phulka", "Grilled fish/tofu + salad", "Veg clear soup + chickpea salad", "Moong khichdi + greens", "Stuffed capsicum + lentil soup"],
  bedtime: ["Haldi milk", "Chamomile tea", "Unsweetened almond milk", "Jeera-ajwain water", "Cinnamon warm water"],
};

const pickByDay = (list, day, salt = 0) => list[(day + salt) % list.length];

function createDietPlanData(days, condition, mealChange) {
  const plan = [];
  for (let day = 1; day <= days; day += 1) {
    plan.push({
      day,
      breakfast: `${pickByDay(mealLibrary.breakfast, day, 1)} (${condition})`,
      midMorning: pickByDay(mealLibrary.midMorning, day, 2),
      lunch: pickByDay(mealLibrary.lunch, day, 3),
      eveningSnack: pickByDay(mealLibrary.eveningSnack, day, 4),
      dinner: mealChange || pickByDay(mealLibrary.dinner, day, 5),
      bedtime: pickByDay(mealLibrary.bedtime, day, 6),
    });
  }
  return plan;
}

function dietPlanToPdf(days, condition, mealChange) {
  if (!window.jspdf?.jsPDF) {
    addMessage("PDF tool not loaded. Please check internet and retry.", "bot");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const plan = createDietPlanData(days, condition, mealChange);
  doc.setFontSize(16);
  doc.text("BalanceBite - Jeevika Diet Plan", 14, 16);
  doc.setFontSize(11);
  doc.text(`Days: ${days}`, 14, 24);
  doc.text(`Condition: ${condition}`, 14, 30);
  doc.text(`Meal changes: ${mealChange || "No custom changes"}`, 14, 36, { maxWidth: 180 });
  let y = 48;
  for (const d of plan) {
    const lines = [
      `Day ${d.day}`,
      `Breakfast: ${d.breakfast}`,
      `Mid-morning: ${d.midMorning}`,
      `Lunch: ${d.lunch}`,
      `Evening snack: ${d.eveningSnack}`,
      `Dinner: ${d.dinner}`,
      `Bedtime: ${d.bedtime}`,
      "",
    ];
    for (const line of lines) {
      doc.text(line, 14, y, { maxWidth: 180 });
      y += 7;
      if (y > 280) {
        doc.addPage();
        y = 18;
      }
    }
  }
  doc.save(`Jeevika_Diet_Plan_${days}_days.pdf`);
}

function parseDietIntent(text) {
  const lc = text.toLowerCase();
  if (!/(diet plan|meal plan|create plan|plan for)/.test(lc)) return null;
  const days = Number((lc.match(/(\d{1,2})\s*(day|days)/) || [])[1] || 7);
  let condition = "General wellness";
  if (lc.includes("diabetes")) condition = "Diabetes";
  else if (lc.includes("pcos")) condition = "PCOS";
  else if (lc.includes("thyroid")) condition = "Thyroid";
  else if (lc.includes("weight loss")) condition = "Weight loss";
  const changeMatch = text.match(/(replace|change|swap|no\s+rice|no\s+sugar).*/i);
  return { days: Math.max(1, Math.min(60, days)), condition, mealChange: changeMatch ? changeMatch[0] : "" };
}

function genericReply(text) {
  const lc = text.toLowerCase();
  if (state.reportText && /(report|sugar|thyroid|cholesterol|hb|hemoglobin)/.test(lc)) {
    return `Based on your report (${state.reportName || "file"}), here is usable context:\n${state.reportText.slice(0, 420)}\n\nIf you want, I can generate a report-based diet plan now.`;
  }
  if (/hello|hi|hey/.test(lc)) return "Hey! Tell me what you ate today and I’ll improve it in a simple way 😊";
  if (/water|hydration/.test(lc)) return "Hydration check: aim 8–10 glasses today 💧 Want a reminder pattern?";
  return "Got you 👍 I can do report-based guidance and instant downloadable diet plans from chat.";
}

function handleSendText(text, sender = "user") {
  addMessage(text, sender);
  if (!canChat()) return addMessage(i18n[state.language]?.limit || i18n.en.limit, "bot");

  if (!state.subscribed && sender === "user") {
    state.freeMessagesUsed += 1;
    localStorage.setItem("jeevikaFreeMessagesUsed", String(state.freeMessagesUsed));
    setUsage();
  }

  const intent = parseDietIntent(text);
  if (intent) {
    const { days, condition, mealChange } = intent;
    addMessage(`Perfect! I created your ${days}-day plan for ${condition} with full-day meals.`, "bot", {
      downloadLabel: "Download diet plan PDF",
      downloadCallback: () => dietPlanToPdf(days, condition, mealChange),
    });
    if (state.callActive) speak("Done! Your plan is ready. Tap download to get the PDF.");
    return;
  }

  const reply = genericReply(text);
  addMessage(reply, "bot");
  if (state.callActive) speak(reply);
}

async function parseReport(file) {
  if (!file) return;
  state.reportName = file.name;
  localStorage.setItem("jeevikaReportName", file.name);

  if (file.type.startsWith("image/")) {
    state.reportText = `Image report uploaded: ${file.name}. OCR is browser-limited, share values in chat for precise advice.`;
    localStorage.setItem("jeevikaReportText", state.reportText);
    addMessage(`Attached: ${file.name}. I’ll use this as medical context.`, "bot");
    return;
  }

  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf" && window.pdfjsLib) {
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= Math.min(5, pdf.numPages); i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `Page ${i}: ${content.items.map((it) => it.str).join(" ")}\n`;
    }
    state.reportText = text || `PDF uploaded: ${file.name}`;
    localStorage.setItem("jeevikaReportText", state.reportText);
    addMessage(`Attached: ${file.name}. I read it and will prioritize report-based answers.`, "bot");
    return;
  }

  state.reportText = `Report uploaded: ${file.name}`;
  localStorage.setItem("jeevikaReportText", state.reportText);
  addMessage(`Attached: ${file.name}.`, "bot");
}

function fmtElapsed(ms) {
  const s = Math.floor(ms / 1000);
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function updateCallUi(active) {
  callScreen.classList.toggle("hidden", !active);
  callScreen.setAttribute("aria-hidden", String(!active));
  callBtn.textContent = active ? "🛑" : "📞";
  assistantStatus.textContent = active ? "on call • listening" : "online • BalanceBite by Dietician Aakriti";
}

function getRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.continuous = true;
  rec.interimResults = false;
  rec.lang = state.language === "hi" ? "hi-IN" : "en-IN";
  return rec;
}

function restartRecognitionSoon() {
  if (!state.callActive || state.isMuted || state.processingSpeech || !state.recognition) return;
  setTimeout(() => {
    if (!state.callActive || state.isMuted || state.processingSpeech || !state.recognition) return;
    try { state.recognition.start(); } catch (_) {}
  }, 350);
}

function wireRecognitionHandlers(rec) {
  rec.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (!transcript || !state.callActive || state.isMuted) return;
    state.processingSpeech = true;
    handleSendText(transcript, "user");
    setTimeout(() => {
      state.processingSpeech = false;
      restartRecognitionSoon();
    }, 900);
  };

  rec.onerror = (event) => {
    if (!state.callActive) return;
    const err = event?.error || "unknown";
    if (err === "not-allowed" || err === "service-not-allowed") {
      callStateText.textContent = "Mic blocked. Please allow microphone and call again.";
      addMessage("Mic permission blocked. Tap Allow and call again.", "bot");
      stopCallMode(true);
      return;
    }
    if (!["no-speech", "aborted"].includes(err)) {
      callStateText.textContent = "Reconnecting microphone...";
    }
  };

  rec.onend = () => {
    if (!state.callActive || state.isMuted || state.processingSpeech) return;
    restartRecognitionSoon();
  };
}

async function ensureMicPermission() {
  if (!window.isSecureContext) {
    addMessage("Call needs a secure page. Open via http://localhost:4173 (not file://).", "bot");
    return false;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    addMessage("Microphone is not supported in this browser.", "bot");
    return false;
  }
  try {
    if (!state.micStream) {
      state.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    return true;
  } catch (_) {
    addMessage("Please allow microphone access to use call mode.", "bot");
    return false;
  }
}

async function startCallMode() {
  if (state.callActive) return;
  const ok = await ensureMicPermission();
  if (!ok) return;

  const rec = getRecognition();
  if (!rec) {
    addMessage("Speech recognition not available here. Use Chrome/Edge on localhost.", "bot");
    return;
  }

  state.callActive = true;
  state.recognition = rec;
  state.isMuted = false;
  state.processingSpeech = false;
  callStateText.textContent = "Connected • Listening";
  state.callStartMs = Date.now();
  updateCallUi(true);
  muteBtn.classList.remove("active");
  muteBtn.textContent = "🎤 Mute";
  speakerBtn.classList.toggle("active", state.speakerOn);

  clearInterval(state.callTimerInt);
  state.callTimerInt = setInterval(() => {
    callTimer.textContent = fmtElapsed(Date.now() - state.callStartMs);
  }, 1000);
  callTimer.textContent = "00:00";

  wireRecognitionHandlers(rec);
  try { rec.start(); } catch (_) {}

  addMessage("Call started. I’m listening now.", "bot");
  speak("Hi! I can hear you now. Tell me how you're feeling today.");
}

function stopCallMode(silent = false) {
  state.callActive = false;
  state.processingSpeech = false;
  if (state.recognition) {
    try { state.recognition.onend = null; state.recognition.stop(); } catch (_) {}
  }
  state.recognition = null;
  speechSynthesis.cancel();
  clearInterval(state.callTimerInt);
  state.callTimerInt = null;
  updateCallUi(false);
  callStateText.textContent = "Calling...";
  callTimer.textContent = "00:00";
  if (!silent) addMessage("Call ended.", "bot");
}

function toggleMute() {
  state.isMuted = !state.isMuted;
  muteBtn.classList.toggle("active", state.isMuted);
  muteBtn.textContent = state.isMuted ? "🔇 Muted" : "🎤 Mute";
  callStateText.textContent = state.isMuted ? "Muted" : "Connected • Listening";

  if (state.isMuted && state.recognition) {
    try { state.recognition.stop(); } catch (_) {}
  } else if (!state.isMuted) {
    restartRecognitionSoon();
  }
}

function toggleSpeaker() {
  state.speakerOn = !state.speakerOn;
  speakerBtn.classList.toggle("active", state.speakerOn);
  speakerBtn.textContent = state.speakerOn ? "🔊 Speaker" : "🔈 Earpiece";
  if (!state.speakerOn) speechSynthesis.cancel();
}

sendBtn.addEventListener("click", () => {
  const t = messageInput.value.trim();
  if (!t) return;
  messageInput.value = "";
  handleSendText(t, "user");
});
messageInput.addEventListener("keydown", (e) => e.key === "Enter" && sendBtn.click());

langBtn.addEventListener("click", () => {
  state.language = state.language === "en" ? "hi" : "en";
  localStorage.setItem("jeevikaLanguage", state.language);
  addMessage(`Language switched to ${state.language === "en" ? "English" : "Hindi"}.`, "bot");
});

reportInput.addEventListener("change", async (e) => {
  try { await parseReport(e.target.files[0]); } catch { addMessage("Couldn’t read this report properly. Try another file.", "bot"); }
});

callBtn.addEventListener("click", () => (state.callActive ? stopCallMode() : startCallMode()));
hangupBtn.addEventListener("click", () => stopCallMode());
muteBtn.addEventListener("click", toggleMute);
speakerBtn.addEventListener("click", toggleSpeaker);

assistantDetailsBtn.addEventListener("click", () => assistantDetailsDialog.showModal());
closeDetails.addEventListener("click", () => assistantDetailsDialog.close());

for (const btn of document.querySelectorAll(".plan-btn")) {
  btn.addEventListener("click", () => {
    state.subscribed = true;
    state.subscriptionPlan = btn.dataset.plan;
    localStorage.setItem("jeevikaSubscribed", "true");
    localStorage.setItem("jeevikaSubscriptionPlan", state.subscriptionPlan);
    setUsage();
    assistantDetailsDialog.close();
    addMessage(`Subscription active (${state.subscriptionPlan}). Razorpay checkout can be linked once account details are provided.`, "bot");
  });
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => getPreferredVoice();
}

setUsage();
addMessage(i18n[state.language]?.welcome || i18n.en.welcome, "bot");
if (state.reportName) addMessage(`Loaded previous report context: ${state.reportName}`, "bot");
