// ═══════════════════════════════════════════════════════════
// Curaah Recover — AI Companion Chat
// Context-aware health AI with anti-hallucination guardrails
// ═══════════════════════════════════════════════════════════

import { showToast, $, escapeHtml, skeletonLoader } from './utils.js';

let _state, _supabase, _navigate;
let chatHistory = [];

export function init(state, supabase, navigate) {
  _state = state;
  _supabase = supabase;
  _navigate = navigate;
}

export async function render(state, supabase) {
  if (state) _state = state;
  if (supabase) _supabase = supabase;

  const container = $('aiContainer');
  if (!container) return;

  container.innerHTML = `
    <div class="chat-wrapper">
      <!-- Chat Header -->
      <div class="chat-header">
        <div class="chat-avatar-ai">🤖</div>
        <div>
          <h2 class="chat-title">Curaah AI Companion</h2>
          <p class="chat-status">Your recovery intelligence assistant</p>
        </div>
        <div class="chat-badges">
          <span class="badge badge-green">AI-Powered</span>
        </div>
      </div>

      <!-- Context Banner -->
      <div class="chat-context-bar">
        <span class="chat-ctx-tag">🩺 Knows your conditions</span>
        <span class="chat-ctx-tag">💊 Knows your medicines</span>
        <span class="chat-ctx-tag">📊 Knows your vitals</span>
      </div>

      <!-- Chat Messages -->
      <div class="chat-messages" id="chatMessages">
        <div class="chat-bubble chat-ai">
          <div class="chat-bubble-avatar">🤖</div>
          <div class="chat-bubble-content">
            <p>Hello! I'm your Curaah AI Recovery Companion. I know about your health conditions, medicines, and vitals.</p>
            <p style="margin-top:8px;">I can help you with:</p>
            <ul style="margin:8px 0;padding-left:18px;color:var(--muted);font-size:13px;">
              <li>Understanding your medicines and their effects</li>
              <li>Nutrition advice specific to your conditions</li>
              <li>Explaining your lab report values</li>
              <li>Recovery tips and lifestyle guidance</li>
              <li>Product recommendations (supplements, equipment)</li>
            </ul>
            <p class="chat-disclaimer">⚕️ I'm an AI advisor, not a doctor. Always verify with your healthcare provider.</p>
          </div>
        </div>
      </div>

      <!-- Quick Prompts -->
      <div class="chat-quick-prompts" id="chatQuickPrompts">
        <button class="chat-prompt-chip" onclick="window._sendQuick('What should I eat today considering my conditions?')">🍱 Diet advice</button>
        <button class="chat-prompt-chip" onclick="window._sendQuick('Explain my current medicines and their purpose')">💊 My medicines</button>
        <button class="chat-prompt-chip" onclick="window._sendQuick('What exercises are safe for me?')">🏃 Exercise tips</button>
        <button class="chat-prompt-chip" onclick="window._sendQuick('What should I watch out for with my medications?')">⚠️ Side effects</button>
        <button class="chat-prompt-chip" onclick="window._sendQuick('How is my recovery progressing?')">📊 My progress</button>
      </div>

      <!-- Chat Input -->
      <div class="chat-input-bar">
        <input type="text" class="chat-input" id="chatInput" 
          placeholder="Ask me about your health, medicines, diet..."
          onkeydown="if(event.key==='Enter') window._sendChat()"/>
        <button class="chat-send-btn" id="chatSendBtn" onclick="window._sendChat()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/></svg>
        </button>
      </div>
    </div>
  `;

  // Load chat history
  await loadChatHistory();
}

async function loadChatHistory() {
  const patientId = _state.patient?.patient_id;
  if (!patientId) return;

  const { data } = await _supabase.query('recover_ai_conversations', {
    filter: `patient_id=eq.${patientId}`,
    order: 'created_at.asc',
    limit: 50,
  });

  if (data && data.length > 0) {
    chatHistory = data;
    const container = $('chatMessages');
    if (!container) return;

    // Keep welcome message, add history
    data.forEach(msg => {
      appendBubble(msg.role, msg.message, false);
    });
    scrollToBottom();
  }
}

function buildPatientContext() {
  const p = _state.patient || {};
  const meds = (_state.medicines || []).map(m => 
    `${m.medicine_name} (${m.dosage || ''}, ${m.frequency || ''}, ${m.purpose || ''})`
  ).join('; ');

  return {
    age: p.age,
    gender: p.gender,
    conditions: p.primary_conditions || [],
    allergies: p.allergies || [],
    medicines: meds,
    height_cm: p.height_cm,
    weight_kg: p.weight_kg,
    blood_group: p.blood_group,
    language: p.language || 'en',
  };
}

function appendBubble(role, message, animate = true) {
  const container = $('chatMessages');
  if (!container) return;

  const isAI = role === 'assistant';
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${isAI ? 'chat-ai' : 'chat-user'}${animate ? ' chat-bubble-enter' : ''}`;

  if (isAI) {
    // Parse AI response - may be JSON or plain text
    let text = message;
    let confidence = '';
    let disclaimer = '';
    let actions = [];

    try {
      const parsed = JSON.parse(message);
      text = parsed.response || parsed.message || message;
      confidence = parsed.confidence || '';
      disclaimer = parsed.disclaimer || '';
      actions = parsed.suggested_actions || [];
    } catch(e) { /* plain text */ }

    bubble.innerHTML = `
      <div class="chat-bubble-avatar">🤖</div>
      <div class="chat-bubble-content">
        <div class="chat-text">${formatAIText(text)}</div>
        ${confidence ? `<span class="chat-confidence chat-conf-${confidence}">Confidence: ${confidence}</span>` : ''}
        ${disclaimer ? `<p class="chat-disclaimer">⚕️ ${escapeHtml(disclaimer)}</p>` : ''}
        ${actions.length ? `<div class="chat-actions">${actions.map(a => `<button class="chat-action-btn" onclick="window._sendQuick('${escapeHtml(a)}')">${escapeHtml(a)}</button>`).join('')}</div>` : ''}
      </div>
    `;
  } else {
    bubble.innerHTML = `
      <div class="chat-bubble-content">
        <div class="chat-text">${escapeHtml(message)}</div>
      </div>
    `;
  }

  container.appendChild(bubble);
  scrollToBottom();
}

function formatAIText(text) {
  // Convert basic markdown to HTML
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n- /g, '\n• ')
    .replace(/\n/g, '<br>');
}

function showTypingIndicator() {
  const container = $('chatMessages');
  if (!container) return;
  const typing = document.createElement('div');
  typing.className = 'chat-bubble chat-ai chat-bubble-enter';
  typing.id = 'typingIndicator';
  typing.innerHTML = `
    <div class="chat-bubble-avatar">🤖</div>
    <div class="chat-bubble-content">
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>
  `;
  container.appendChild(typing);
  scrollToBottom();
}

function removeTypingIndicator() {
  const el = $('typingIndicator');
  if (el) el.remove();
}

function scrollToBottom() {
  const container = $('chatMessages');
  if (container) {
    setTimeout(() => container.scrollTop = container.scrollHeight, 50);
  }
}

// ── Send Message ──
window._sendChat = async function() {
  const input = $('chatInput');
  const message = input?.value?.trim();
  if (!message) return;

  input.value = '';

  // Hide quick prompts after first message
  const prompts = $('chatQuickPrompts');
  if (prompts) prompts.style.display = 'none';

  // Show user bubble
  appendBubble('user', message);

  // Show typing
  showTypingIndicator();

  // Disable send
  const sendBtn = $('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  const patientId = _state.patient?.patient_id;
  const context = buildPatientContext();

  // Build conversation history for context (last 6 messages)
  const recentHistory = chatHistory.slice(-6).map(m => ({
    role: m.role, content: m.message
  }));

  // Call edge function
  const { data, error } = await _supabase.edgeFn('recover-backend', {
    action: 'chat',
    patient_id: patientId,
    message: message,
    patient_context: context,
    history: recentHistory,
  });

  removeTypingIndicator();
  if (sendBtn) sendBtn.disabled = false;

  if (error || !data) {
    // Fallback: try direct Gemini call or show error
    appendBubble('assistant', JSON.stringify({
      response: "I'm having trouble connecting right now. Please try again in a moment. If this persists, please check your internet connection.",
      confidence: "low",
      disclaimer: "Service temporarily unavailable."
    }));
    return;
  }

  // Save to history
  const aiResponse = typeof data === 'string' ? data : JSON.stringify(data.ai_response || data);
  chatHistory.push({ role: 'user', message });
  chatHistory.push({ role: 'assistant', message: aiResponse });

  appendBubble('assistant', aiResponse);
};

window._sendQuick = function(msg) {
  const input = $('chatInput');
  if (input) input.value = msg;
  window._sendChat();
};
