const state = {
  language: localStorage.getItem("jeevikaLanguage") || "en",
  freeMessagesUsed: Number(localStorage.getItem("jeevikaFreeMessagesUsed") || 0),
  subscribed: localStorage.getItem("jeevikaSubscribed") === "true",
  subscriptionPlan: localStorage.getItem("jeevikaSubscriptionPlan") || null,
  reportText: localStorage.getItem("jeevikaReportText") || "",
  checkInEnabled: localStorage.getItem("jeevikaCheckInEnabled") === "true",
};

const languageMap = {
  en: {
    welcome: "Hi! I am Jeevika 🌿 from BalanceBite. I can help with meal ideas, habits, report-based guidance and fun daily check-ins.",
    noMessages: "You've reached 20 free messages. Please subscribe to continue.",
    casual: ["Nice! Small steps make big changes 💪", "Hydration check 🥤 done?", "You got this, one meal at a time ✨"],
  },
  hi: {
    welcome: "नमस्ते! मैं Jeevika 🌿 हूँ। मैं आपकी डाइट, हेल्थ रिपोर्ट और रोज़ के हल्के-फुल्के चेक-इन में मदद कर सकती हूँ।",
    noMessages: "आपके 20 फ्री संदेश पूरे हो गए हैं। जारी रखने के लिए सब्सक्राइब करें।",
    casual: ["बहुत बढ़िया! छोटे कदम, बड़ा फर्क 💪", "पानी पिया क्या? 🥤", "एक-एक मील से ही प्रोग्रेस होती है ✨"],
  },
  ta: {
    welcome: "வணக்கம்! நான் Jeevika 🌿. உணவு திட்டம், மருத்துவ அறிக்கை மற்றும் தினசரி நினைவூட்டல்களில் உதவுவேன்.",
    noMessages: "20 இலவச செய்திகளை பயன்படுத்திவிட்டீர்கள். தொடர சந்தா எடுக்கவும்.",
    casual: ["சூப்பர்! சிறிய பழக்கங்கள் பெரிய பலன் 💪", "தண்ணீர் குடிக்க மறக்காதீர்கள் 🥤", "நீங்கள் நல்லா பண்ணிக்கிட்டு இருக்கீங்க ✨"],
  },
  bn: {
    welcome: "নমস্কার! আমি Jeevika 🌿। ডায়েট, রিপোর্ট-ভিত্তিক পরামর্শ আর দৈনিক চেক-ইনে সাহায্য করব।",
    noMessages: "আপনার ২০টি ফ্রি মেসেজ শেষ। চালাতে সাবস্ক্রাইব করুন।",
    casual: ["দারুণ! ছোট ছোট অভ্যাসেই বড় পরিবর্তন 💪", "জল খেলেন তো? 🥤", "এক ধাপ করে এগোন ✨"],
  }
};

const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const languageSelect = document.getElementById("languageSelect");
const usageInfo = document.getElementById("usageInfo");
const reportInput = document.getElementById("reportInput");
const reportStatus = document.getElementById("reportStatus");
const callBtn = document.getElementById("callBtn");
const notifyBtn = document.getElementById("notifyBtn");
const downloadPlanBtn = document.getElementById("downloadPlan");

languageSelect.value = state.language;

function updateUsageInfo() {
  const left = Math.max(0, 20 - state.freeMessagesUsed);
  usageInfo.textContent = state.subscribed
    ? `Subscribed (${state.subscriptionPlan}) • Unlimited messages`
    : `Free messages left: ${left}`;
}

function addMessage(text, sender = "bot") {
  const message = document.createElement("div");
  message.className = `message ${sender}`;
  message.innerHTML = `${text}<div class="meta">${new Date().toLocaleTimeString()}</div>`;
  chatArea.appendChild(message);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function canSendMessage() {
  return state.subscribed || state.freeMessagesUsed < 20;
}

function basicAssistantReply(text) {
  const lc = text.toLowerCase();
  if (state.reportText) {
    if (lc.includes("report") || lc.includes("sugar") || lc.includes("cholesterol") || lc.includes("thyroid")) {
      return `From your uploaded report, here's what I can infer:\n${state.reportText.slice(0, 450)}\n\nI can suggest meals based only on these details if you share your goal (weight loss, sugar control, etc.).`;
    }
    return `Based on your report details, I'd suggest balanced meals with protein + fiber in each meal. Ask me to build a report-specific day plan.`;
  }

  if (lc.includes("diet plan") || lc.includes("meal")) {
    return "Sure! Tell me your condition, days, and meal preferences. You can also use the PDF diet-plan generator on the left.";
  }

  if (lc.includes("fun") || lc.includes("motivate")) {
    const random = languageMap[state.language].casual[Math.floor(Math.random() * 3)];
    return random;
  }

  return "Got it! I can help with nutrition tips, habit tracking, hydration reminders, report-based guidance, and personalized meal swaps.";
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (!canSendMessage()) {
    addMessage(languageMap[state.language].noMessages, "bot");
    return;
  }

  addMessage(text, "user");
  messageInput.value = "";

  if (!state.subscribed) {
    state.freeMessagesUsed += 1;
    localStorage.setItem("jeevikaFreeMessagesUsed", String(state.freeMessagesUsed));
    updateUsageInfo();
  }

  setTimeout(() => {
    const reply = basicAssistantReply(text);
    addMessage(reply, "bot");
    speakText(reply);
  }, 400);
}

function speakText(text) {
  if (!("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  const voices = speechSynthesis.getVoices();
  const indianFemale = voices.find((v) => /en-in|hi-in/i.test(v.lang) && /female|zira|heera|sangeeta/i.test(v.name))
    || voices.find((v) => /en-in|hi-in/i.test(v.lang))
    || voices.find((v) => /female/i.test(v.name));
  if (indianFemale) utterance.voice = indianFemale;
  speechSynthesis.speak(utterance);
}

async function parseReportFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  if (file.type.startsWith("image/")) {
    state.reportText = `Image report uploaded: ${file.name}. OCR is browser-dependent, so please ask specific questions and I'll guide from visible findings you share.`;
    localStorage.setItem("jeevikaReportText", state.reportText);
    return;
  }

  if (ext === "pdf" && window.pdfjsLib) {
    const bytes = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
    let fullText = "";
    for (let i = 1; i <= Math.min(pdf.numPages, 4); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => item.str).join(" ");
      fullText += `Page ${i}: ${pageText}\n`;
    }
    state.reportText = fullText || `PDF uploaded (${file.name}), but no text was extracted.`;
    localStorage.setItem("jeevikaReportText", state.reportText);
    return;
  }

  state.reportText = `Report uploaded: ${file.name}.`;
  localStorage.setItem("jeevikaReportText", state.reportText);
}

function scheduleCheckIns() {
  if (!state.checkInEnabled) return;
  const ping = () => {
    const msg = languageMap[state.language].casual[Math.floor(Math.random() * 3)];
    addMessage(`Daily Check-in: ${msg}`, "bot");
    if (Notification.permission === "granted") {
      new Notification("Jeevika check-in", { body: msg });
    }
  };

  setInterval(ping, 24 * 60 * 60 * 1000);
  setTimeout(ping, 3000);
}

function downloadDietPlan() {
  if (!window.jspdf?.jsPDF) {
    alert("PDF library not loaded. Check internet and retry.");
    return;
  }
  const days = Number(document.getElementById("dietDays").value || 7);
  const condition = document.getElementById("dietCondition").value || "General wellness";
  const changes = document.getElementById("dietMealChanges").value || "No specific changes";

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("BalanceBite - Jeevika Diet Plan", 14, 20);
  doc.setFontSize(11);
  doc.text(`Days: ${days}`, 14, 30);
  doc.text(`Condition: ${condition}`, 14, 38);
  doc.text(`Meal change requests: ${changes}`, 14, 46, { maxWidth: 180 });

  let y = 60;
  for (let i = 1; i <= days; i++) {
    doc.text(`Day ${i}: Breakfast: Oats + nuts | Lunch: Dal + roti + salad | Dinner: Soup + paneer/tofu`, 14, y, { maxWidth: 180 });
    y += 12;
    if (y > 270 && i < days) {
      doc.addPage();
      y = 20;
    }
  }

  doc.save(`Jeevika_Diet_Plan_${days}_days.pdf`);
}

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => e.key === "Enter" && sendMessage());

languageSelect.addEventListener("change", (e) => {
  state.language = e.target.value;
  localStorage.setItem("jeevikaLanguage", state.language);
  addMessage(languageMap[state.language].welcome, "bot");
});

for (const btn of document.querySelectorAll(".plan-btn")) {
  btn.addEventListener("click", () => {
    state.subscribed = true;
    state.subscriptionPlan = btn.dataset.plan;
    localStorage.setItem("jeevikaSubscribed", "true");
    localStorage.setItem("jeevikaSubscriptionPlan", state.subscriptionPlan);
    addMessage(`Subscription activated (${state.subscriptionPlan}). Razorpay checkout hook can be attached once account credentials are provided.`, "bot");
    updateUsageInfo();
  });
}

reportInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  reportStatus.textContent = `Processing ${file.name}...`;
  try {
    await parseReportFile(file);
    reportStatus.textContent = `Uploaded: ${file.name}`;
    addMessage("Report received. I will prioritize report-based answers for health guidance.", "bot");
  } catch (err) {
    reportStatus.textContent = `Unable to parse ${file.name}`;
    addMessage("I couldn't fully read the report. Please retry or upload another file.", "bot");
  }
});

callBtn.addEventListener("click", () => {
  const response = "Hi, this is Jeevika. Great to hear from you! Tell me how your meals went today, and we can improve them together.";
  addMessage("Voice call connected. Jeevika is speaking...", "bot");
  speakText(response);
});

notifyBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    addMessage("Notifications not supported in this browser.", "bot");
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    state.checkInEnabled = true;
    localStorage.setItem("jeevikaCheckInEnabled", "true");
    addMessage("Daily check-ins enabled. I'll send fun casual nudges every day.", "bot");
    scheduleCheckIns();
  } else {
    addMessage("Notification permission denied.", "bot");
  }
});

downloadPlanBtn.addEventListener("click", downloadDietPlan);

updateUsageInfo();
addMessage(languageMap[state.language].welcome, "bot");
if (state.reportText) {
  reportStatus.textContent = "Previous report context loaded from device storage.";
}
scheduleCheckIns();
