const authForm = document.getElementById('authForm');
const authSubmit = document.getElementById('authSubmit');
const tabs = document.querySelectorAll('.tab[data-tab]');
const toolTabs = document.querySelectorAll('.tab[data-tool]');
const workspacePanel = document.getElementById('workspacePanel');
const billingPanel = document.getElementById('billingPanel');
const userBadge = document.getElementById('userBadge');
const usageStatus = document.getElementById('usageStatus');
const resultEl = document.getElementById('result');
const toast = document.getElementById('toast');
const paymentMethod = document.getElementById('paymentMethod');
const cardNumber = document.getElementById('cardNumber');
const paypalEmail = document.getElementById('paypalEmail');
const apiBaseInput = document.getElementById('apiBaseUrl');
const saveApiBaseBtn = document.getElementById('saveApiBaseBtn');

let authMode = 'register';
let token = localStorage.getItem('token') || null;
let apiBase = (localStorage.getItem('apiBaseUrl') || (window.HUMANIZER_API_BASE || '')).trim().replace(/\/$/, '');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

function setUsageText(user) {
  usageStatus.textContent = user.plan === 'premium'
    ? `Premium active until ${new Date(user.subscription.expiresAt).toLocaleDateString()}. Unlimited usage enabled.`
    : `Free plan: 1 trial/day. You used ${user.freeTrialsToday}/1 trial today.`;
}

function setAuthState(user) {
  workspacePanel.classList.remove('hidden');
  billingPanel.classList.remove('hidden');
  userBadge.textContent = `${user.email} • ${user.plan.toUpperCase()}`;
  setUsageText(user);
}

async function api(path, method = 'GET', body) {
  const url = `${apiBase}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();

  if (!contentType.includes('application/json')) {
    throw new Error('API response was HTML, not JSON. Open "API server settings" and set your backend URL.');
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Server returned invalid JSON.');
  }

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

async function loadSession() {
  if (!token) return;
  try {
    const { user } = await api('/api/me');
    setAuthState(user);
  } catch {
    localStorage.removeItem('token');
    token = null;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.remove('active'));
    tab.classList.add('active');
    authMode = tab.dataset.tab;
    authSubmit.textContent = authMode === 'register' ? 'Create account' : 'Login';
  });
});

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    if (authMode === 'register') {
      const { message } = await api('/api/auth/register', 'POST', { email, password });
      showToast(message);
      return;
    }

    const data = await api('/api/auth/login', 'POST', { email, password });
    token = data.token;
    localStorage.setItem('token', token);
    setAuthState(data.user);
    showToast('Welcome back!');
  } catch (error) {
    showToast(error.message);
  }
});

toolTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    toolTabs.forEach((x) => x.classList.remove('active'));
    tab.classList.add('active');
    const tool = tab.dataset.tool;
    document.getElementById('humanizeTool').classList.toggle('hidden', tool !== 'humanize');
    document.getElementById('detectTool').classList.toggle('hidden', tool !== 'detect');
  });
});

document.getElementById('humanizeBtn').addEventListener('click', async () => {
  try {
    const text = document.getElementById('humanizeInput').value;
    const data = await api('/api/tools/humanize', 'POST', { text });
    resultEl.textContent = `Mode: ${data.mode}\n\n${data.output}`;
    const { user } = await api('/api/me');
    setAuthState(user);
  } catch (error) {
    resultEl.textContent = error.message;
    showToast(error.message);
  }
});

document.getElementById('detectBtn').addEventListener('click', async () => {
  try {
    const text = document.getElementById('detectInput').value;
    const mediaName = document.getElementById('mediaName').value;
    const data = await api('/api/tools/detect', 'POST', { text, mediaName });
    resultEl.textContent = `Mode: ${data.mode}\nAI likelihood: ${data.aiLikelihood}%\nVerdict: ${data.verdict}\n${data.details}`;
    const { user } = await api('/api/me');
    setAuthState(user);
  } catch (error) {
    resultEl.textContent = error.message;
    showToast(error.message);
  }
});

paymentMethod.addEventListener('change', () => {
  const method = paymentMethod.value;
  cardNumber.classList.toggle('hidden', method !== 'visa');
  paypalEmail.classList.toggle('hidden', method !== 'paypal');
});

document.getElementById('payBtn').addEventListener('click', async () => {
  try {
    const method = paymentMethod.value;
    const body = {
      method,
      cardNumber: cardNumber.value,
      paypalEmail: paypalEmail.value
    };
    const data = await api('/api/subscription/checkout', 'POST', body);
    resultEl.textContent = JSON.stringify(data, null, 2);
    const { user } = await api('/api/me');
    setAuthState(user);
    showToast('Subscription activated.');
  } catch (error) {
    showToast(error.message);
    resultEl.textContent = error.message;
  }
});

if (apiBaseInput) {
  apiBaseInput.value = apiBase;
}

saveApiBaseBtn?.addEventListener('click', () => {
  apiBase = (apiBaseInput.value || '').trim().replace(/\/$/, '');
  localStorage.setItem('apiBaseUrl', apiBase);
  showToast(apiBase ? `API URL saved: ${apiBase}` : 'Using same-origin API (/api).');
});

loadSession();
