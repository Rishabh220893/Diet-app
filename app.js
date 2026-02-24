const state = {
  language: localStorage.getItem("jeevikaLanguage") || "en",
  freeMessagesUsed: Number(localStorage.getItem("jeevikaFreeMessagesUsed") || 0),
  subscribed: localStorage.getItem("jeevikaSubscribed") === "true",
  subscriptionPlan: localStorage.getItem("jeevikaSubscriptionPlan") || null,
  reportText: localStorage.getItem("jeevikaReportText") || "",
  reportName: localStorage.getItem("jeevikaReportName") || "",
  callActive: false,
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
  return voices.find(v => /hi-IN|en-IN/i.test(v.lang) && /female|heera|sangeeta|veena|lekha|kavya|ananya|priya/i.test(v.name))
    || voices.find(v => /hi-IN|en-IN/i.test(v.lang) && /female/i.test(v.name))
    || voices.find(v => /hi-IN|en-IN/i.test(v.lang))
    || voices.find(v => /female/i.test(v.name));
}

function speak(text) {
  if (!("speechSynthesis" in window) || !state.callActive) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.12;
  u.volume = 1;
  const preferred = getPreferredVoice();
  if (preferred) u.voice = preferred;
  speechSynthesis.speak(u);
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

const mealLibrary = {
  breakfast: [
    "Moong chilla + mint chutney",
    "Vegetable oats upma",
    "Poha with peanuts + sprouts",
    "Besan cheela + curd",
    "Idli + sambar",
    "Ragi dosa + coconut chutney",
    "Paneer stuffed multigrain toast",
  ],
  midMorning: [
    "1 guava + 5 almonds",
    "Papaya bowl + pumpkin seeds",
    "Apple slices + peanut butter (thin)",
    "Coconut water + chia",
    "Pear + walnuts",
    "Buttermilk + roasted seeds",
  ],
  lunch: [
    "2 multigrain rotis + dal + salad + sabzi",
    "Brown rice + rajma + cucumber salad",
    "Millet khichdi + curd + veggie stir fry",
    "Quinoa pulao + chole + salad",
    "Roti + paneer bhurji + lauki sabzi",
    "Lemon rice + sambar + beans poriyal",
  ],
  eveningSnack: [
    "Roasted chana + buttermilk",
    "Makhana chaat + green tea",
    "Sprouts bhel + lemon",
    "Boiled corn + herbal tea",
    "Fruit chaat + flax seeds",
    "Hummus + cucumber sticks",
  ],
  dinner: [
    "Paneer/tofu + sauteed veggies + soup",
    "Dal soup + veg stir fry + 1 phulka",
    "Grilled fish/tofu + salad bowl",
    "Mixed veg clear soup + chickpea salad",
    "Moong khichdi + sauteed greens",
    "Stuffed capsicum + lentil soup",
  ],
  bedtime: [
    "Haldi milk (low sugar)",
    "Chamomile tea",
    "Unsweetened almond milk",
    "Jeera-ajwain warm water",
    "Cinnamon infused warm water",
  ]
};

function pickByDay(list, day, salt = 0) {
  return list[(day + salt) % list.length];
}

function buildDayPlan(day, condition, mealChange) {
  const dinnerItem = mealChange || pickByDay(mealLibrary.dinner, day, 4);
  return {
    day,
    breakfast: `${pickByDay(mealLibrary.breakfast, day, 1)} (${condition})`,
    midMorning: pickByDay(mealLibrary.midMorning, day, 2),
    lunch: pickByDay(mealLibrary.lunch, day, 3),
    eveningSnack: pickByDay(mealLibrary.eveningSnack, day, 0),
    dinner: dinnerItem,
    bedtime: pickByDay(mealLibrary.bedtime, day, 5),
  };
}

function createDietPlanData(days, condition, mealChange) {
  const plan = [];
  for (let d = 1; d <= days; d++) {
    plan.push(buildDayPlan(d, condition, mealChange));
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
  for (const day of plan) {
    const lines = [
      `Day ${day.day}`,
      `Breakfast: ${day.breakfast}`,
      `Mid-morning: ${day.midMorning}`,
      `Lunch: ${day.lunch}`,
      `Evening snack: ${day.eveningSnack}`,
      `Dinner: ${day.dinner}`,
      `Bedtime: ${day.bedtime}`,
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
  const daysMatch = lc.match(/(\d{1,2})\s*(day|days)/);
  const days = daysMatch ? Math.min(60, Math.max(1, Number(daysMatch[1]))) : 7;
  let condition = "General wellness";
  if (lc.includes("diabetes")) condition = "Diabetes";
  else if (lc.includes("pcos")) condition = "PCOS";
  else if (lc.includes("thyroid")) condition = "Thyroid";
  else if (lc.includes("weight loss")) condition = "Weight loss";

  const changeMatch = text.match(/(replace|change|swap|no\s+rice|no\s+sugar).*/i);
  const mealChange = changeMatch ? changeMatch[0] : "";
  return { days, condition, mealChange };
}

function genericReply(text) {
  const lc = text.toLowerCase();
  if (state.reportText && /(report|sugar|thyroid|cholesterol|hb|hemoglobin)/.test(lc)) {
    return `Based on your uploaded report (${state.reportName || "file"}), here is what I can use:\n${state.reportText.slice(0, 420)}\n\nIf you want, I can create a report-based diet plan right now.`;
  }
  if (/hello|hi|hey/.test(lc)) return "Hey! Tell me what you ate today and I’ll make it better in a simple way 😊";
  if (/water|hydration/.test(lc)) return "Quick check: aim 8–10 glasses today 💧 Want a timed reminder style plan?";
  return "Got you 👍 I can do report-based guidance, casual daily support, and instant downloadable diet plans from chat.";
}

function handleSendText(text, sender = "user") {
  addMessage(text, sender);

  if (!canChat()) {
    addMessage(i18n[state.language]?.limit || i18n.en.limit, "bot");
    return;
  }
  if (!state.subscribed && sender === "user") {
    state.freeMessagesUsed += 1;
    localStorage.setItem("jeevikaFreeMessagesUsed", String(state.freeMessagesUsed));
    setUsage();
  }

  const intent = parseDietIntent(text);
  if (intent) {
    const { days, condition, mealChange } = intent;
    const summary = `Perfect! I created your ${days}-day plan for ${condition}. It includes breakfast, mid-morning, lunch, evening snack, dinner, and bedtime meals daily.`;
    addMessage(summary, "bot", {
      downloadLabel: "Download diet plan PDF",
      downloadCallback: () => dietPlanToPdf(days, condition, mealChange),
    });
    if (state.callActive) speak("Done! I have prepared your diet plan. Tap download to get the PDF.");
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
    state.reportText = `Image report uploaded: ${file.name}. OCR is limited in browser. Share key values in chat and I’ll tailor advice.`;
    localStorage.setItem("jeevikaReportText", state.reportText);
    addMessage(`Attached: ${file.name}. I’ll use this as medical context.`, "bot");
    return;
  }

  const ext = file.name.split(".").pop().toLowerCase();
  if (ext === "pdf" && window.pdfjsLib) {
    const buffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    let text = "";
    for (let i = 1; i <= Math.min(5, pdf.numPages); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `Page ${i}: ${content.items.map(it => it.str).join(" ")}\n`;
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

function startCallMode() {
  const rec = getRecognition();
  if (!rec) {
    addMessage("Call mode needs SpeechRecognition support (Chrome/Edge recommended).", "bot");
    return;
  }

  state.callActive = true;
  callBtn.textContent = "🛑";
  assistantStatus.textContent = "on call • listening";
  addMessage("Call started. Speak naturally — I’ll reply like a normal conversation.", "bot");
  speak("Hey! I am here with you. Tell me how your meals and energy felt today.");

  let restartAttempts = 0;

  rec.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript.trim();
    if (!transcript) return;
    handleSendText(transcript, "user");
  };

  rec.onerror = (event) => {
    const err = event?.error || "unknown";
    if (!state.callActive) return;

    if (err === "no-speech" || err === "aborted") {
      // transient; restart below via onend
      return;
    }
    if (err === "not-allowed" || err === "service-not-allowed") {
      addMessage("Microphone permission is blocked. Please allow mic access and call again.", "bot");
      stopCallMode(rec, true);
      return;
    }
    addMessage("Voice recognition interrupted. Trying to reconnect...", "bot");
  };

  rec.onend = () => {
    if (!state.callActive) return;
    if (restartAttempts >= 10) {
      addMessage("Call paused due to repeated mic interruptions. Tap call to reconnect.", "bot");
      stopCallMode(rec, true);
      return;
    }
    restartAttempts += 1;
    setTimeout(() => {
      if (!state.callActive) return;
      try { rec.start(); } catch (_) {}
    }, 250);
  };

  try { rec.start(); } catch (_) {
    addMessage("Could not start microphone. Please retry.", "bot");
    stopCallMode(rec, true);
    return;
  }
  callBtn._rec = rec;
}

function stopCallMode(rec, silent = false) {
  state.callActive = false;
  assistantStatus.textContent = "online • BalanceBite by Dietician Aakriti";
  callBtn.textContent = "📞";
  speechSynthesis.cancel();
  const r = rec || callBtn._rec;
  if (r) {
    try { r.onend = null; r.stop(); } catch (_) {}
  }
  if (!silent) addMessage("Call ended.", "bot");
}

sendBtn.addEventListener("click", () => {
  const t = messageInput.value.trim();
  if (!t) return;
  messageInput.value = "";
  handleSendText(t, "user");
});
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

langBtn.addEventListener("click", () => {
  state.language = state.language === "en" ? "hi" : "en";
  localStorage.setItem("jeevikaLanguage", state.language);
  addMessage(`Language switched to ${state.language === "en" ? "English" : "Hindi"}.`, "bot");
});

reportInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  try {
    await parseReport(file);
  } catch {
    addMessage("Couldn’t read this report properly. Try another file.", "bot");
  }
});

callBtn.addEventListener("click", () => {
  if (state.callActive) stopCallMode();
  else startCallMode();
});

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

setUsage();
addMessage(i18n[state.language]?.welcome || i18n.en.welcome, "bot");
if (state.reportName) addMessage(`Loaded previous report context: ${state.reportName}`, "bot");
