// Parenting-specific instructions
const parentingInfo = `
  Parenting Assistant Instructions:
  - You are NurtureAI, a warm, empathetic, and expert parenting assistant.
  - Begin with empathy.
  - Provide concise (50-100 words), step-by-step advice on topics like parenting, child development, sleep, nutrition, behavior, milestones, tantrums, discipline, potty training, sibling rivalry, and communication.
  - Include a practical example in each response, e.g., "Try this: sing a lullaby, then dim the lights for bedtime."
  - Tailor advice to the child's age if provided (e.g., 0-1, 1-3 years); if not, ask gently, e.g., "How old is your little one?"
  - Use simple, friendly language, avoiding jargon. Explain terms if needed, e.g., "A milestone is a skill like crawling."
  - Suggest professional help for serious issues, e.g., "For persistent issues, a pediatrician can guide you."
  - End with encouragement, e.g., "You've got this! Want more tips?"
  - Example: "Tantrums are tough! Try staying calm, get to their level, and offer a hug. For example, say, 'I see you're upset, let's breathe together.' This worked for my friend’s 2-year-old. You've got this!"
`;

// API Key
const GROQ_API_KEY = "YOUR_ACTUAL_GROQ_API_KEY_HERE"; // Replace with actual key or handle securely

// Maintain conversation history and saved tips
let messagesHistory = [];
let savedTips = JSON.parse(localStorage.getItem('savedTips') || '[]');
let childAge = '';

// Helper function to create and show modal
function showModal(content) {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
  modal.innerHTML = `
    <div class="bg-white p-8 rounded-2xl max-w-md w-full relative">
      ${content}
      <button class="absolute top-2 right-2 text-gray-600 hover:text-gray-800" onclick="this.parentElement.parentElement.remove()" aria-label="Close modal">
        <i class="fas fa-times"></i>
      </button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// Helper function to format markdown response to HTML
function formatResponse(text) {
  const preprocessedText = text.replace(/\*\*(.+?)\*\*/g, '### $1');
  return marked.parse(preprocessedText);
}

// Helper function to call Groq API
async function callGroqAPI(prompt, context = '') {
  if (!navigator.onLine) {
    const errorMsg = "You're offline! Please connect to get personalized advice.";
    return { text: errorMsg, suggestions: [], formattedText: `<p>${errorMsg}</p>` };
  }

  if (!GROQ_API_KEY || GROQ_API_KEY === "YOUR_ACTUAL_GROQ_API_KEY_HERE") {
    const errorMsg = "API key is missing. Please contact support to enable AI features.";
    return { text: errorMsg, suggestions: [], formattedText: `<p>${errorMsg}</p>` };
  }

  const fullPrompt = context ? `${context}\n${prompt}` : prompt;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: parentingInfo },
          ...messagesHistory,
          { role: 'user', content: fullPrompt }
        ],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices[0]?.message?.content || "Sorry, I couldn't generate a response. Try again!";
    const formattedText = formatResponse(text);
    const suggestions = getRelatedSuggestions(prompt);
    return { text, suggestions, formattedText };
  } catch (error) {
    console.error("Groq API Error:", error);
    const errorMsg = "Sorry, something went wrong with our AI service. Please try again later or contact support.";
    return { text: errorMsg, suggestions: [], formattedText: `<p>${errorMsg}</p>` };
  }
}

// Track Development Feature
function openTrackDevelopment() {
  const content = `
    <div class="max-h-[80vh] overflow-y-auto p-4">
      <h3 class="text-2xl font-bold mb-4">Track Milestones</h3>
      <select id="milestoneAge" class="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-orange-500 focus:outline-none" aria-label="Select child age group">
        <option value="">Select age group</option>
        <option value="0-1">0-1 years</option>
        <option value="1-3">1-3 years</option>
        <option value="3-5">3-5 years</option>
        <option value="5+">5+ years</option>
      </select>
      <textarea id="milestoneInput" class="w-full p-3 border rounded mb-4 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none h-32" placeholder="Describe your child's recent milestones (e.g., crawling, first words)" aria-label="Child milestone description"></textarea>
      <button id="analyzeMilestones" class="bg-orange-600 text-white px-4 py-2 rounded" aria-label="Analyze milestones">Analyze</button>
      <div id="milestoneResult" class="mt-4"></div>
    </div>
  `;
  showModal(content);
  document.getElementById('analyzeMilestones').addEventListener('click', async () => {
    const age = document.getElementById('milestoneAge').value;
    const input = document.getElementById('milestoneInput').value.trim();
    if (!age || !input) {
      document.getElementById('milestoneResult').innerHTML = '<p class="text-red-600">Please select an age and describe milestones.</p>';
      return;
    }
    const prompt = `Provide personalized milestone insights for a child aged ${age} years, based on the following reported milestones: "${input}".`;
    const context = `Child's age: ${age}.`;
    const { formattedText, suggestions } = await callGroqAPI(prompt, context);
    const suggestionButtons = suggestions.map(s => `<button class="suggestion-btn bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">${s}</button>`).join('');
    document.getElementById('milestoneResult').innerHTML = `
      ${formattedText}
      <div class="mt-4 flex flex-wrap gap-2">${suggestionButtons}</div>
    `;
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('milestoneInput').value = btn.textContent;
        document.getElementById('analyzeMilestones').click();
      });
    });
  });
}

// Chat Now Feature
function openChatNow() {
  document.getElementById('chatModal').classList.add('active');
  document.getElementById('chatModal').setAttribute('aria-hidden', 'false');
  document.getElementById('userInput').focus();
}

// Safety Checklist Feature
function openSafetyChecklist() {
  const content = `
    <div class="max-h-[80vh] overflow-y-auto p-4">
      <h3 class="text-2xl font-bold mb-4">Safety Tips</h3>
      <select id="safetyAge" class="w-full p-2 border rounded mb-4" aria-label="Select child age group">
        <option value="">Select age group</option>
        <option value="0-1">0-1 years</option>
        <option value="1-3">1-3 years</option>
        <option value="3-5">3-5 years</option>
        <option value="5+">5+ years</option>
      </select>
      <textarea id="safetyInput" class="w-full p-2 border rounded mb-4" placeholder="Describe your home environment (e.g., apartment, backyard, pets)" aria-label="Home environment description"></textarea>
      <button id="generateSafetyTips" class="bg-orange-600 text-white px-4 py-2 rounded" aria-label="Generate safety tips">Generate Tips</button>
      <div id="safetyResult" class="mt-4"></div>
    </div>
  `;
  showModal(content);
  document.getElementById('generateSafetyTips').addEventListener('click', async () => {
    const age = document.getElementById('safetyAge').value;
    const input = document.getElementById('safetyInput').value.trim();
    if (!age || !input) {
      document.getElementById('safetyResult').innerHTML = '<p class="text-red-600">Please select an age and describe your environment.</p>';
      return;
    }
    const prompt = `Generate a personalized safety checklist for a child aged ${age} years, based on this home environment: "${input}".`;
    const context = `Child's age: ${age}.`;
    const { formattedText, suggestions } = await callGroqAPI(prompt, context);
    const suggestionButtons = suggestions.map(s => `<button class="suggestion-btn bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">${s}</button>`).join('');
    document.getElementById('safetyResult').innerHTML = `
      ${formattedText}
      <div class="mt-4 flex flex-wrap gap-2">${suggestionButtons}</div>
    `;
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('safetyInput').value = btn.textContent;
        document.getElementById('generateSafetyTips').click();
      });
    });
  });
}

// Growth Chart Feature
function openGrowthChart() {
  const content = `
    <div class="max-h-[80vh] overflow-y-auto p-4">
      <h3 class="text-2xl font-bold mb-4">Growth Chart</h3>
      <div class="mb-4">
        <label class="block text-gray-700">Age (months)</label>
        <input type="number" id="growthAge" class="w-full p-2 border rounded" min="0" max="60" aria-label="Child age in months">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700">Height (cm)</label>
        <input type="number" id="growthHeight" class="w-full p-2 border rounded" min="0" aria-label="Child height in cm">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700">Weight (kg)</label>
        <input type="number" id="growthWeight" class="w-full p-2 border rounded" min="0" aria-label="Child weight in kg">
      </div>
      <button id="generateChart" class="bg-orange-600 text-white px-4 py-2 rounded" aria-label="Analyze and view growth chart">Analyze & View Chart</button>
      <div id="growthResult" class="mt-4"></div>
      <canvas id="growthChartCanvas" class="mt-4" aria-label="Growth chart"></canvas>
    </div>
  `;
  showModal(content);
  document.getElementById('generateChart').addEventListener('click', async () => {
    const age = document.getElementById('growthAge').value;
    const height = document.getElementById('growthHeight').value;
    const weight = document.getElementById('growthWeight').value;
    if (!age || !height || !weight) {
      document.getElementById('growthResult').innerHTML = '<p class="text-red-600">Please fill in all fields.</p>';
      return;
    }
    const prompt = `Analyze the growth data for a child aged ${age} months with height ${height} cm and weight ${weight} kg. Provide insights on their growth trends compared to typical ranges.`;
    const { formattedText, suggestions } = await callGroqAPI(prompt);
    const suggestionButtons = suggestions.map(s => `<button class="suggestion-btn bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">${s}</button>`).join('');
    document.getElementById('growthResult').innerHTML = `
      ${formattedText}
      <div class="mt-4 flex flex-wrap gap-2">${suggestionButtons}</div>
    `;
    const ctx = document.getElementById('growthChartCanvas').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Height', 'Weight'],
        datasets: [
          { label: 'Your Child', data: [height, weight], backgroundColor: 'rgba(255, 107, 107, 0.5)' },
          { label: 'Average', data: [age * 2 + 50, age * 0.5 + 5], backgroundColor: 'rgba(54, 162, 235, 0.5)' }
        ]
      },
      options: { scales: { y: { beginAtZero: true } } }
    });
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.getElementById('growthResult').innerHTML = `<p>Analyzing: ${btn.textContent}...</p>`;
        const { formattedText } = await callGroqAPI(btn.textContent);
        document.getElementById('growthResult').innerHTML = `<div>${formattedText}</div>`;
      });
    });
  });
}

// Meal Plan Feature
function openMealPlan() {
  const content = `
    <div class="max-h-[80vh] overflow-y-auto p-4">
      <h3 class="text-2xl font-bold mb-4">Generate Meal Plan</h3>
      <select id="mealPlanAge" class="w-full p-2 border rounded mb-4" aria-label="Select child age group">
        <option value="">Select age group</option>
        <option value="0-1">0-1 years</option>
        <option value="1-3">1-3 years</option>
        <option value="3-5">3-5 years</option>
        <option value="5+">5+ years</option>
      </select>
      <textarea id="mealPlanInput" class="w-full p-2 border rounded mb-4" placeholder="Describe dietary needs or preferences (e.g., vegetarian, allergies, picky eater)" aria-label="Dietary needs description"></textarea>
      <button id="generateMealPlan" class="bg-orange-600 text-white px-4 py-2 rounded" aria-label="Generate meal plan">Generate Plan</button>
      <div id="mealPlanResult" class="mt-4"></div>
    </div>
  `;
  showModal(content);
  document.getElementById('generateMealPlan').addEventListener('click', async () => {
    const age = document.getElementById('mealPlanAge').value;
    const input = document.getElementById('mealPlanInput').value.trim();
    if (!age || !input) {
      document.getElementById('mealPlanResult').innerHTML = '<p class="text-red-600">Please select an age and describe dietary needs.</p>';
      return;
    }
    const prompt = `Create a daily meal plan for a child aged ${age} years, considering these dietary needs: "${input}". Include breakfast, lunch, dinner, and snacks.`;
    const context = `Child's age: ${age}.`;
    const { formattedText, suggestions } = await callGroqAPI(prompt, context);
    const suggestionButtons = suggestions.map(s => `<button class="suggestion-btn bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">${s}</button>`).join('');
    document.getElementById('mealPlanResult').innerHTML = `
      ${formattedText}
      <div class="mt-4 flex flex-wrap gap-2">${suggestionButtons}</div>
    `;
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('mealPlanInput').value = btn.textContent;
        document.getElementById('generateMealPlan').click();
      });
    });
  });
}

// Sleep Routine Feature
function openSleepRoutine() {
  const content = `
    <div class="max-h-[80vh] overflow-y-auto p-4">
      <h3 class="text-2xl font-bold mb-4">Log Sleep Data</h3>
      <div class="mb-4">
        <label class="block text-gray-700">Bedtime (e.g., 20:00)</label>
        <input type="time" id="sleepBedtime" class="w-full p-2 border rounded" aria-label="Child bedtime">
      </div>
      <div class="mb-4">
        <label class="block text-gray-700">Wake Time (e.g., 06:00)</label>
        <input type="time" id="sleepWake" class="w-full p-2 border rounded" aria-label="Child wake time">
      </div>
      <textarea id="sleepInput" class="w-full p-2 border rounded mb-4" placeholder="Describe sleep issues (e.g., frequent waking, trouble falling asleep)" aria-label="Sleep issues description"></textarea>
      <button id="analyzeSleep" class="bg-orange-600 text-white px-4 py-2 rounded" aria-label="Analyze sleep data">Analyze & Get Tips</button>
      <div id="sleepResult" class="mt-4"></div>
    </div>
  `;
  showModal(content);
  document.getElementById('analyzeSleep').addEventListener('click', async () => {
    const bedtime = document.getElementById('sleepBedtime').value;
    const wake = document.getElementById('sleepWake').value;
    const input = document.getElementById('sleepInput').value.trim();
    if (!bedtime || !wake || !input) {
      document.getElementById('sleepResult').innerHTML = '<p class="text-red-600">Please enter times and describe sleep issues.</p>';
      return;
    }
    const bed = new Date(`2000-01-01T${bedtime}:00`);
    let wakeDate = new Date(`2000-01-01T${wake}:00`);
    if (wakeDate < bed) wakeDate.setDate(2);
    const hours = (wakeDate - bed) / 3600000;
    const prompt = `Analyze sleep data for a child with bedtime at ${bedtime}, wake time at ${wake}, sleeping ${hours} hours, and these issues: "${input}". Provide personalized sleep improvement tips.`;
    const { formattedText, suggestions } = await callGroqAPI(prompt);
    const suggestionButtons = suggestions.map(s => `<button class="suggestion-btn bg-orange-100 text-orange-600 px-3 py-1 rounded-full hover:bg-orange-200">${s}</button>`).join('');
    document.getElementById('sleepResult').innerHTML = `
      <p><strong>Sleep Duration:</strong> ${hours} hours</p>
      ${formattedText}
      <div class="mt-4 flex flex-wrap gap-2">${suggestionButtons}</div>
    `;
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('sleepInput').value = btn.textContent;
        document.getElementById('analyzeSleep').click();
      });
    });
  });
}

// Event Listeners for Features
document.getElementById('trackDevelopmentBtn').addEventListener('click', openTrackDevelopment);
document.getElementById('chatNowBtn').addEventListener('click', openChatNow);
document.getElementById('safetyChecklistBtn').addEventListener('click', openSafetyChecklist);
document.getElementById('growthChartBtn').addEventListener('click', openGrowthChart);
document.getElementById('mealPlanBtn').addEventListener('click', openMealPlan);
document.getElementById('sleepRoutineBtn').addEventListener('click', openSleepRoutine);

// Helper function to update progress bar
function updateProgressBar(progress) {
  const progressBar = document.getElementById('progressBar');
  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }
}

// Helper function to get related suggestions
function getRelatedSuggestions(message) {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes('sleep') || lowerMsg.includes('bedtime')) {
    return ['Nighttime routines?', 'Nap schedules?', 'Sleep regression?'];
  } else if (lowerMsg.includes('eat') || lowerMsg.includes('food')) {
    return ['Picky eater tips?', 'Meal planning?', 'Healthy snacks?'];
  } else if (lowerMsg.includes('tantrum') || lowerMsg.includes('behavior')) {
    return ['Calming techniques?', 'Discipline ideas?', 'Sibling conflicts?'];
  } else if (lowerMsg.includes('milestone') || lowerMsg.includes('development')) {
    return ['Next milestones?', 'Skill-building activities?', 'Development delays?'];
  } else if (lowerMsg.includes('safety')) {
    return ['Home safety tips?', 'Outdoor safety?', 'Emergency preparedness?'];
  } else {
    return ['Milestones?', 'Potty training?', 'Parenting stress?'];
  }
}

// Helper function to add messages to the chat
function addMessage(text, sender, relatedSuggestions = [], quickReplies = []) {
  const messagesDiv = document.getElementById('chatMessages');
  if (!messagesDiv) return;
  const messageContainer = document.createElement('div');
  messageContainer.className = `message-bubble ${sender === 'user' ? 'user' : 'bot'}`;
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user text-orange-600"></i>' : '<i class="fas fa-heart text-orange-600"></i>';
  const msgContent = document.createElement('div');
  msgContent.className = `message-content ${sender === 'user' ? 'user' : 'bot'}`;
  msgContent.innerHTML = text + `<div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
  
  if (sender === 'bot') {
    if (relatedSuggestions.length) {
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'related-suggestions';
      relatedSuggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.textContent = suggestion;
        btn.setAttribute('aria-label', `Ask about ${suggestion}`);
        suggestionsDiv.appendChild(btn);
      });
      msgContent.appendChild(suggestionsDiv);
    }
    if (quickReplies.length) {
      const repliesDiv = document.createElement('div');
      repliesDiv.className = 'quick-replies';
      quickReplies.forEach(reply => {
        const btn = document.createElement('button');
        btn.textContent = reply;
        btn.setAttribute('aria-label', `Quick reply: ${reply}`);
        repliesDiv.appendChild(btn);
      });
      msgContent.appendChild(repliesDiv);
    }
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    actionsDiv.innerHTML = `
      <button class="save-tip" aria-label="Save this tip"><i class="fas fa-bookmark"></i></button>
      <button class="share-tip" aria-label="Share this tip"><i class="fas fa-share"></i></button>
    `;
    msgContent.appendChild(actionsDiv);
  }

  messageContainer.appendChild(sender === 'user' ? msgContent : avatar);
  messageContainer.appendChild(sender === 'user' ? avatar : msgContent);
  messagesDiv.appendChild(messageContainer);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Save tip to localStorage
function saveTip(text) {
  savedTips.push({ text, timestamp: new Date().toISOString() });
  localStorage.setItem('savedTips', JSON.stringify(savedTips));
  addMessage('Tip saved! Check it in Saved Tips.', 'bot');
}

// Share tip using Web Share API
function shareTip(text) {
  if (navigator.share) {
    navigator.share({
      title: 'NurtureAI Parenting Tip',
      text: text,
      url: window.location.href
    }).catch(() => addMessage('Sharing not supported on this device.', 'bot'));
  } else {
    addMessage('Copy this tip: ' + text, 'bot');
  }
}

// Display Tip of the Day
async function displayTipOfDay() {
  const prompt = 'Generate a concise, practical parenting tip for the day, suitable for any age group.';
  const { formattedText, suggestions } = await callGroqAPI(prompt);
  const tipHtml = `
    <div class="tip-of-day">
      <h4>Tip of the Day</h4>
      ${formattedText}
    </div>
  `;
  addMessage(tipHtml, 'bot', suggestions, ['Try it!', 'Save Tip']);
}

// Voice Input
function initVoiceInput() {
  const voiceButton = document.getElementById('voiceInputButton');
  if (!voiceButton) return;

  if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    voiceButton.addEventListener('click', () => {
      recognition.start();
      voiceButton.style.background = '#ffa726';
      addMessage('Listening... Speak your question!', 'bot');
    });

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('userInput').value = transcript;
      sendMessage(transcript);
      voiceButton.style.background = '#fff';
    };

    recognition.onerror = () => {
      addMessage('Sorry, I couldn’t hear you. Try typing instead.', 'bot');
      voiceButton.style.background = '#fff';
    };

    recognition.onend = () => {
      voiceButton.style.background = '#fff';
    };
  } else {
    voiceButton.style.display = 'none';
    addMessage('Voice input is not supported in your browser.', 'bot');
  }
}

// Send message using Groq
async function sendMessage(userMessage, retry = false) {
  if (!userMessage.trim()) {
    addMessage("Please enter a message to send!", 'bot');
    return;
  }

  if (!navigator.onLine) {
    const lastResponse = JSON.parse(localStorage.getItem('lastResponse') || '{}');
    if (lastResponse.question && lastResponse.answer) {
      addMessage(`You're offline! Here's your last tip:<br><strong>${lastResponse.question}</strong><br>${formatResponse(lastResponse.answer)}`, 'bot');
    } else {
      addMessage('You’re offline and no tips are cached. Connect to ask more!', 'bot');
    }
    return;
  }

  const context = childAge ? `Child's age: ${childAge}. ` : '';
  const fullMessage = `${context}${userMessage}`;
  addMessage(userMessage, 'user');
  const typingIndicator = document.getElementById('typingIndicator');
  if (typingIndicator) {
    typingIndicator.classList.remove('hidden');
  }
  let progress = 0;
  updateProgressBar(progress);

  try {
    let accumulatedText = '';
    const messagesDiv = document.getElementById('chatMessages');
    const botContainer = document.createElement('div');
    botContainer.className = 'message-bubble bot';
    const botAvatar = document.createElement('div');
    botAvatar.className = 'message-avatar';
    botAvatar.innerHTML = '<i class="fas fa-heart text-orange-600"></i>';
    const botMessageDiv = document.createElement('div');
    botMessageDiv.className = 'message-content bot';
    botContainer.appendChild(botAvatar);
    botContainer.appendChild(botMessageDiv);
    messagesDiv.appendChild(botContainer);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    const messages = [
      { role: 'system', content: parentingInfo },
      ...messagesHistory,
      { role: 'user', content: fullMessage }
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        messages,
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 1024,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        if (line === 'data: [DONE]') continue;
        try {
          const json = JSON.parse(line.replace('data: ', ''));
          const chunkText = json.choices[0]?.delta?.content || '';
          accumulatedText += chunkText;
          botMessageDiv.innerHTML = accumulatedText + `<div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
          messagesDiv.scrollTop = messagesDiv.scrollHeight;
          progress += 10;
          updateProgressBar(Math.min(progress, 100));
        } catch (e) {
          console.warn("Error parsing chunk:", e);
        }
      }
    }

    const formattedText = formatResponse(accumulatedText);
    messagesHistory.push({ role: 'user', content: fullMessage });
    messagesHistory.push({ role: 'assistant', content: accumulatedText });

    const relatedSuggestions = getRelatedSuggestions(userMessage);
    const quickReplies = ['Try it!', 'More details?', 'Save Tip'];
    botMessageDiv.innerHTML = formattedText + `<div class="message-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>`;
    if (relatedSuggestions.length) {
      const suggestionsDiv = document.createElement('div');
      suggestionsDiv.className = 'related-suggestions';
      relatedSuggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.textContent = suggestion;
        btn.setAttribute('aria-label', `Ask about ${suggestion}`);
        suggestionsDiv.appendChild(btn);
      });
      botMessageDiv.appendChild(suggestionsDiv);
    }
    if (quickReplies.length) {
      const repliesDiv = document.createElement('div');
      repliesDiv.className = 'quick-replies';
      quickReplies.forEach(reply => {
        const btn = document.createElement('button');
        btn.textContent = reply;
        btn.setAttribute('aria-label', `Quick reply: ${reply}`);
        repliesDiv.appendChild(btn);
      });
      botMessageDiv.appendChild(repliesDiv);
    }

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    actionsDiv.innerHTML = `
      <button class="save-tip" aria-label="Save this tip"><i class="fas fa-bookmark"></i></button>
      <button class="share-tip" aria-label="Share this tip"><i class="fas fa-share"></i></button>
    `;
    botMessageDiv.appendChild(actionsDiv);

    localStorage.setItem('lastResponse', JSON.stringify({ question: userMessage, answer: accumulatedText }));
  } catch (error) {
    console.error("Send Message Error:", error);
    if (!retry) {
      return sendMessage(userMessage, true);
    }
    addMessage("Sorry, something went wrong. Try again or check your saved tips!", 'bot');
  }
  if (typingIndicator) {
    typingIndicator.classList.add('hidden');
  }
  updateProgressBar(0);
}

// Initialize the chatbot
function initChatbot() {
  const chatModal = document.getElementById('chatModal');
  const chatButton = document.getElementById('chatButton');
  const closeChat = document.getElementById('closeChat');
  const sendButton = document.getElementById('sendButton');
  const userInput = document.getElementById('userInput');
  const feedbackButton = document.getElementById('feedbackButton');
  const childAgeSelect = document.getElementById('childAge');
  const tipOfDayButton = document.getElementById('tipOfDayButton');
  const savedTipsButton = document.getElementById('savedTipsButton');
  const clearChatButton = document.getElementById('clearChatButton');
  const chatMessages = document.getElementById('chatMessages');

  if (!chatButton || !chatModal) {
    console.error("Chat button or modal not found in DOM");
    return;
  }

  chatButton.addEventListener('click', () => {
    chatModal.classList.toggle('active');
    chatModal.setAttribute('aria-hidden', chatModal.classList.contains('active') ? 'false' : 'true');
    if (chatModal.classList.contains('active')) {
      userInput.focus();
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  });

  closeChat.addEventListener('click', () => {
    chatModal.classList.remove('active');
    chatModal.setAttribute('aria-hidden', 'true');
  });

  sendButton.addEventListener('click', () => {
    const message = userInput.value.trim();
    if (message) {
      sendMessage(message);
      userInput.value = '';
    }
  });

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const message = userInput.value.trim();
      if (message) {
        sendMessage(message);
        userInput.value = '';
      }
    }
  });

  childAgeSelect.addEventListener('change', () => {
    childAge = childAgeSelect.value;
    addMessage(`Got it! I'll tailor advice for a ${childAge} child. What's your question?`, 'bot');
  });

  tipOfDayButton.addEventListener('click', displayTipOfDay);

  savedTipsButton.addEventListener('click', () => {
    if (savedTips.length) {
      const tipsList = savedTips.map(tip => `<p><strong>${new Date(tip.timestamp).toLocaleDateString()}</strong>: ${formatResponse(tip.text)}</p>`).join('');
      addMessage(`Your Saved Tips:<br>${tipsList}`, 'bot');
    } else {
      addMessage('No saved tips yet. Save some tips first!', 'bot');
    }
  });

  clearChatButton.addEventListener('click', () => {
    messagesHistory = [];
    chatMessages.innerHTML = '';
    addMessage("Hello! I'm NurtureAI, here to support you with parenting tips. What's on your mind today?", 'bot', [], ['Sleep Training', 'Picky Eaters', 'Milestones', 'Tantrums']);
  });

  feedbackButton.addEventListener('click', () => {
    addMessage('We’d love your feedback! Email us at feedback@nurtureai.com.', 'bot');
  });

  chatMessages.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      if (e.target.closest('.quick-replies')) {
        const reply = e.target.textContent;
        if (reply === 'Save Tip') {
          const messageContent = e.target.closest('.message-content').childNodes[0].textContent;
          saveTip(messageContent);
        } else if (reply === 'Try it!') {
          addMessage('Great! Let me know how it works or if you need more tips.', 'bot');
        } else if (reply === 'More details?') {
          addMessage('Could you share more about your situation? I’ll dive deeper!', 'bot');
        } else {
          sendMessage(reply);
        }
      } else if (e.target.closest('.related-suggestions')) {
        sendMessage(e.target.textContent);
      } else if (e.target.closest('.save-tip')) {
        const messageContent = e.target.closest('.message-content').childNodes[0].textContent;
        saveTip(messageContent);
      } else if (e.target.closest('.share-tip')) {
        const messageContent = e.target.closest('.message-content').childNodes[0].textContent;
        shareTip(messageContent);
      }
    }
  });

  initVoiceInput();
}

// Carousel functionality with lazy loading
function initCarousel() {
  const images = document.querySelectorAll('.carousel-image');
  const dots = document.querySelectorAll('.carousel-dot');
  let currentIndex = 0;

  images.forEach(img => {
    img.setAttribute('loading', 'lazy');
  });

  function showImage(index) {
    images.forEach((img, i) => {
      img.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      currentIndex = i;
      showImage(currentIndex);
    });
  });

  setInterval(() => {
    currentIndex = (currentIndex + 1) % images.length;
    showImage(currentIndex);
  }, 5000);
}

// Mobile menu toggle
function initMobileMenu() {
  const mobileMenuToggle = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    mobileMenuToggle.querySelector('i').classList.toggle('fa-bars');
    mobileMenuToggle.querySelector('i').classList.toggle('fa-times');
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      mobileMenu.classList.add('hidden');
      mobileMenuToggle.querySelector('i').classList.add('fa-bars');
      mobileMenuToggle.querySelector('i').classList.remove('fa-times');
    }
  });
}

// Initialize everything on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initChatbot();
  initCarousel();
  initMobileMenu();
});
