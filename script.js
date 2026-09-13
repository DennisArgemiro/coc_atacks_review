// ============================================
// CONFIGURAÇÃO DO SUPABASE
// ============================================
// SUBSTITUA PELAS SUAS CREDENCIAIS DO SUPABASE
const SUPABASE_URL = 'https://gjwaftqhdxiashismuwi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqd2FmdHFoZHhpYXNoaXNtdXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4MjY1OTUsImV4cCI6MjEwNDQwMjU5NX0.lIDhHppRP4WEqmkDUKb7KabW6zadubU2O4UkXVPiyxA';

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// ESTADO GLOBAL
// ============================================
let currentUser = null;
let userRole = null; // 'admin', 'analista', ou null
let allCriteria = [];
let uploadedVideoPath = null;

// ============================================
// AUTH / LOGIN
// ============================================
function openLoginModal() {
  document.getElementById('login-modal').style.display = 'flex';
}
function closeLoginModal() {
  document.getElementById('login-modal').style.display = 'none';
  document.getElementById('login-form').reset();
  document.getElementById('register-form').style.display = 'none';
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('login-message').style.display = 'none';
}

function toggleRegister() {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  if (regForm.style.display === 'none') {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
  } else {
    regForm.style.display = 'none';
    loginForm.style.display = 'block';
  }
}

// Login
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msgEl = document.getElementById('login-message');
  const btn = document.getElementById('login-submit-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-inline"></span> Entrando...';

  const { data, error } = await db.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.innerHTML = 'Entrar';

  if (error) {
    showMessage(msgEl, error.message, 'error');
  } else {
    closeLoginModal();
    handleAuth(data.user);
  }
});

// Registro
document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const msgEl = document.getElementById('login-message');
  const btn = document.getElementById('reg-submit-btn');

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-inline"></span> Criando...';

  const { data, error } = await db.auth.signUp({ email, password });

  btn.disabled = false;
  btn.innerHTML = 'Criar Conta';

  if (error) {
    showMessage(msgEl, error.message, 'error');
  } else {
    showMessage(msgEl, 'Conta criada! Verifique seu e-mail para confirmação.', 'success');
    setTimeout(() => {
      document.getElementById('register-form').style.display = 'none';
      document.getElementById('login-form').style.display = 'block';
    }, 2000);
  }
});

async function logout() {
  await db.auth.signOut();
  currentUser = null;
  userRole = null;
  updateUI();
}

function getRoleFromEmail(email) {
  if (!email) return null;
  const domain = email.split('@')[1];
  if (domain === 'admin.com') return 'admin';
  if (domain === 'analista.com') return 'analista';
  return null;
}

function handleAuth(user) {
  currentUser = user;
  userRole = getRoleFromEmail(user.email);
  updateUI();
}

function updateUI() {
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userEmail = document.getElementById('user-email');
  const navAnalyzer = document.getElementById('nav-analyzer');
  const navAdmin = document.getElementById('nav-admin');

  if (currentUser) {
    loginBtn.style.display = 'none';
    logoutBtn.style.display = 'block';
    userEmail.textContent = currentUser.email;
    userEmail.style.display = 'inline';

    if (userRole === 'analista' || userRole === 'admin') {
      navAnalyzer.style.display = 'block';
    } else {
      navAnalyzer.style.display = 'none';
    }

    if (userRole === 'admin') {
      navAdmin.style.display = 'block';
    } else {
      navAdmin.style.display = 'none';
    }
  } else {
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    userEmail.style.display = 'none';
    navAnalyzer.style.display = 'none';
    navAdmin.style.display = 'none';
  }

  // Voltar para view de submit se a view atual não está disponível
  const activeNav = document.querySelector('.nav-btn.active');
  if (activeNav) {
    const targetView = activeNav.dataset.view;
    if (targetView === 'analyzer' && !currentUser) {
      switchView('submit');
    } else if (targetView === 'admin' && userRole !== 'admin') {
      switchView('submit');
    }
  }
}

// Checar sessão ao carregar
(async () => {
  const { data: { session } } = await db.auth.getSession();
  if (session?.user) {
    handleAuth(session.user);
  }
})();

// Escutar mudanças de auth
db.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    handleAuth(session.user);
  } else {
    currentUser = null;
    userRole = null;
    updateUI();
  }
});

// ============================================
// NAVEGAÇÃO
// ============================================
function switchView(target) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelector(`[data-view="${target}"]`).classList.add('active');
  document.getElementById(`view-${target}`).classList.add('active');

  if (target === 'analyzer') loadAttacks();
  if (target === 'admin') loadAdmin();
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchView(btn.dataset.view));
});

// ============================================
// VIDEO: UPLOAD / URL TOGGLE
// ============================================
function switchVideoSource(source) {
  document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`[data-source="${source}"]`).classList.add('active');

  document.getElementById('video-upload-area').style.display = source === 'upload' ? 'block' : 'none';
  document.getElementById('video-url-area').style.display = source === 'url' ? 'block' : 'none';
}

// Upload de vídeo
const uploadZone = document.getElementById('upload-zone');
const videoFileInput = document.getElementById('video-file');
const uploadPreview = document.getElementById('upload-preview');
const uploadProgress = document.getElementById('upload-progress');

uploadZone.addEventListener('click', () => videoFileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('video/')) {
    handleVideoFile(file);
  }
});

videoFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleVideoFile(file);
});

async function handleVideoFile(file) {
  if (file.size > 50 * 1024 * 1024) {
    alert('Arquivo muito grande. Máximo 50MB.');
    return;
  }

  // Verificar se está logado para upload
  if (!currentUser) {
    alert('Faça login para enviar vídeos.');
    return;
  }

  // Preview local
  const url = URL.createObjectURL(file);
  uploadPreview.innerHTML = `<video controls src="${url}"></video>`;
  uploadPreview.style.display = 'block';
  uploadZone.querySelector('p').style.display = 'none';

  // Upload para Supabase Storage
  const ext = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${ext}`;
  const filePath = `videos/${fileName}`;

  uploadProgress.style.display = 'flex';

  const { data, error } = await db.storage
    .from('attack-videos')
    .upload(filePath, file, {
      onUploadProgress: (progress) => {
        const pct = Math.round((progress.loaded / progress.total) * 100);
        document.getElementById('progress-fill').style.width = pct + '%';
        document.getElementById('progress-text').textContent = pct + '%';
      }
    });

  if (error) {
    alert('Erro no upload: ' + error.message);
    uploadProgress.style.display = 'none';
    return;
  }

  const { data: urlData } = db.storage
    .from('attack-videos')
    .getPublicUrl(filePath);

  uploadedVideoPath = urlData.publicUrl;
  uploadProgress.style.display = 'none';
}

// ============================================
// FORMULÁRIO DE SUBMISSÃO
// ============================================
const attackForm = document.getElementById('attack-form');
const attackTypeSelect = document.getElementById('attack-type');
const friendlyTypeGroup = document.getElementById('friendly-type-group');
const friendlyTypeSelect = document.getElementById('friendly-type');
const submitMessage = document.getElementById('submit-message');

attackTypeSelect.addEventListener('change', () => {
  if (attackTypeSelect.value === 'Amistoso') {
    friendlyTypeGroup.style.display = 'block';
    loadFriendlyTypes();
  } else {
    friendlyTypeGroup.style.display = 'none';
  }
});

// Verificar se jogador está na lista de elenco
async function validatePlayerForType() {
  const playerTag = cleanPlayerTag(document.getElementById('player-id').value);
  const attackType = attackTypeSelect.value;
  const playerTagInput = document.getElementById('player-id');

  if (!playerTag) return;

  const { data } = await db
    .from('players')
    .select('player_name, clan_name')
    .ilike('player_tag', playerTag)
    .single();

  const isPlayerRegistered = !!data;

  // Feedback visual no campo
  if (isPlayerRegistered) {
    playerTagInput.style.borderColor = 'var(--success)';
    showMessage(submitMessage, `✓ ${data.player_name} (${data.clan_name}) - Jogador no elenco`, 'success');
  } else {
    playerTagInput.style.borderColor = 'var(--error)';
    showMessage(submitMessage, '✗ Jogador não encontrado. Só é permitido replays "A Vulso".', 'error');
    // Forçar tipo para "A Vulso" se jogador não está no elenco
    if (attackType !== 'A Vulso') {
      attackTypeSelect.value = 'A Vulso';
    }
  }
}

// Limpar tag do jogador (remover #, espaços, etc)
function cleanPlayerTag(value) {
  return value.replace(/[^a-zA-Z0-9]/g, '').trim();
}

// Ao digitar o ID, limpar automaticamente
document.getElementById('player-id').addEventListener('input', (e) => {
  const pos = e.target.selectionStart;
  const cleaned = cleanPlayerTag(e.target.value);
  e.target.value = cleaned;
  e.target.setSelectionRange(pos, pos);
});

// Checar jogador ao selecionar tipo ou sair do campo ID
attackTypeSelect.addEventListener('change', validatePlayerForType);
document.getElementById('player-id').addEventListener('blur', validatePlayerForType);

async function loadFriendlyTypes() {
  const { data, error } = await db
    .from('friendly_types')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) { console.error(error); return; }

  friendlyTypeSelect.innerHTML = '<option value="">Selecione...</option>';
  data.forEach(type => {
    friendlyTypeSelect.innerHTML += `<option value="${type.name}">${type.name}</option>`;
  });
}

// ============================================
// FORMULÁRIO DE SUBMISSÃO
// ============================================

function generateShortId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

attackForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const isUpload = document.querySelector('[data-source="upload"]').classList.contains('active');
  const videoUrl = isUpload ? uploadedVideoPath : document.getElementById('video-url').value.trim();

  if (!videoUrl) {
    showMessage(submitMessage, 'Selecione ou envie um vídeo.', 'error');
    return;
  }

  // Validar jogador no elenco para tipo de ataque
  const playerTag = cleanPlayerTag(document.getElementById('player-id').value);
  const attackType = attackTypeSelect.value;

  if (attackType && attackType !== 'A Vulso') {
    const { data: playerExists } = await db
      .from('players')
      .select('id')
      .ilike('player_tag', playerTag)
      .single();

    if (!playerExists) {
      showMessage(submitMessage, 'Jogador não está no elenco. Só é permitido replays "A Vulso".', 'error');
      return;
    }
  }

  const attack = {
    short_id: generateShortId(),
    player_name: document.getElementById('player-name').value.trim(),
    player_id: playerTag,
    clan: document.getElementById('clan').value.trim(),
    attack_type: attackTypeSelect.value,
    video_url: videoUrl,
    video_source: isUpload ? 'upload' : 'url',
    status: 'Aguardando'
  };

  // Mostrar loading
  document.getElementById('loading-overlay').style.display = 'flex';
  document.getElementById('submit-btn').disabled = true;
  document.getElementById('submit-btn').innerHTML = '<span class="spinner-btn"></span> Submetendo...';

  const { data, error } = await db.from('attacks').insert([attack]).select();

  // Esconder loading
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('submit-btn').disabled = false;
  document.getElementById('submit-btn').innerHTML = 'Submeter';

  if (error) {
    showMessage(submitMessage, 'Erro ao submeter: ' + error.message, 'error');
  } else {
    // Mostrar modal de sucesso com short_id
    const shortId = data[0].short_id;
    document.getElementById('submitted-id').value = shortId;
    document.getElementById('success-modal').style.display = 'flex';

    // Reset form
    attackForm.reset();
    friendlyTypeGroup.style.display = 'none';
    uploadPreview.style.display = 'none';
    uploadPreview.innerHTML = '';
    uploadZone.querySelector('p').style.display = 'block';
    uploadedVideoPath = null;
    switchVideoSource('upload');
  }
});

function copyId() {
  const id = document.getElementById('submitted-id').value;
  const fb = document.getElementById('copy-feedback');

  // Fallback para contextos sem HTTPS
  const textarea = document.createElement('textarea');
  textarea.value = id;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);

  fb.textContent = 'Copiado!';
  fb.style.display = 'inline';
  setTimeout(() => { fb.style.display = 'none'; }, 2000);
}

function closeSuccessModal() {
  document.getElementById('success-modal').style.display = 'none';
}

function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className = `message ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 5000);
}

// ============================================
// BUSCAR ATaque (público)
// ============================================
document.getElementById('search-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('search-attack-id').value.trim();
  const resultEl = document.getElementById('search-result');
  const msgEl = document.getElementById('search-message');

  if (!id) return;

  resultEl.style.display = 'none';
  msgEl.style.display = 'none';

  const { data, error } = await db
    .from('attacks')
    .select('*')
    .eq('short_id', id.toUpperCase())
    .single();

  if (error || !data) {
    showMessage(msgEl, 'Ataque não encontrado. Verifique o ID.', 'error');
    return;
  }

  const statusClass = `status-${data.status}`;

  // Se respondido, buscar avaliações
  let evalsHtml = '';
  if (data.status === 'Respondido') {
    const { data: evals } = await db
      .from('evaluations')
      .select('*')
      .eq('attack_id', data.id)
      .order('created_at', { ascending: false });

    if (evals && evals.length > 0) {
      // Deduplicar por id
      const seen = new Set();
      const uniqueEvals = evals.filter(ev => {
        if (seen.has(ev.id)) return false;
        seen.add(ev.id);
        return true;
      });

      evalsHtml = uniqueEvals.map(ev => {
        const criteria = [];
        if (ev.strategy) criteria.push({ label: 'Estratégia', value: ev.strategy });
        if (ev.funneling) criteria.push({ label: 'Afunilamento', value: ev.funneling });
        if (ev.improvisation) criteria.push({ label: 'Improviso', value: ev.improvisation });
        if (ev.spell_usage) criteria.push({ label: 'Feitiços', value: ev.spell_usage });
        if (ev.hero_skills) criteria.push({ label: 'Heróis', value: ev.hero_skills });

        return `
          <div class="eval-card">
            <div class="eval-card-header">
              <strong>${ev.evaluator_name || 'Anônimo'}</strong>
              <span>${new Date(ev.created_at).toLocaleString('pt-BR')}</span>
            </div>
            <div class="eval-stars">
              ${criteria.map(c => `
                <span class="eval-star-item">
                  ${c.label} <span class="number-score">${c.value}/10</span>
                </span>
              `).join('')}
            </div>
            ${ev.feedback ? `<div class="eval-feedback-text">${ev.feedback}</div>` : ''}
          </div>
        `;
      }).join('');
    }
  }

  resultEl.innerHTML = `
    <div class="search-result-card">
      <div class="search-result-header">
        <span class="attack-player">${data.player_name || data.player_id}</span>
        <span class="status-badge ${statusClass}">${data.status}</span>
      </div>
      <div class="search-result-info">
        <div><strong>ID:</strong> ${data.player_id}</div>
        <div><strong>Clã:</strong> ${data.clan}</div>
        <div><strong>Tipo:</strong> ${data.attack_type}</div>
        <div><strong>Submetido em:</strong> ${new Date(data.created_at).toLocaleString('pt-BR')}</div>
      </div>
      <div id="search-video-container" class="search-video"></div>
      ${evalsHtml ? `<div class="evaluations-section"><h3>Avaliações</h3>${evalsHtml}</div>` : ''}
    </div>
  `;
  resultEl.style.display = 'block';

  // Renderizar vídeo
  renderVideo('search-video-container', data.video_url, data.video_source);
});

// ============================================
// ANALISADOR
// ============================================
async function loadAttacks() {
  const searchQuery = document.getElementById('search-id').value.trim().toLowerCase();
  const statusFilter = document.getElementById('filter-status').value;
  const typeFilter = document.getElementById('filter-type').value;
  const dateFilter = document.getElementById('filter-date').value;

  let query = db
    .from('attacks')
    .select('*')
    .order('created_at', { ascending: false });

  if (statusFilter) query = query.eq('status', statusFilter);
  if (typeFilter) query = query.eq('attack_type', typeFilter);
  if (dateFilter) {
    const start = new Date(dateFilter);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query.gte('created_at', start.toISOString()).lt('created_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error) { console.error(error); return; }

  let filtered = data;
  if (searchQuery) {
    filtered = data.filter(a =>
      (a.player_id && a.player_id.toLowerCase().includes(searchQuery)) ||
      (a.player_name && a.player_name.toLowerCase().includes(searchQuery))
    );
  }

  renderAttacks(filtered);
}

function renderAttacks(attacks) {
  const container = document.getElementById('attacks-list');

  if (!attacks || attacks.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum ataque encontrado.</p>';
    return;
  }

  container.innerHTML = attacks.map(attack => `
    <div class="attack-card" data-id="${attack.id}" onclick="openEvaluation('${attack.id}')">
      <div class="attack-header">
        <span class="attack-player">${attack.player_name || attack.player_id}</span>
        <span class="status-badge status-${attack.status}">${attack.status}</span>
      </div>
      <div class="attack-meta">
        <span>ID: ${attack.player_id}</span>
        <span>Clã: ${attack.clan}</span>
        <span>Tipo: ${attack.attack_type}</span>
        <span>${new Date(attack.created_at).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  `).join('');
}

document.getElementById('filter-status').addEventListener('change', loadAttacks);
document.getElementById('filter-type').addEventListener('change', loadAttacks);
document.getElementById('filter-date').addEventListener('change', loadAttacks);
document.getElementById('search-id').addEventListener('input', loadAttacks);

// ============================================
// MODAL DE AVALIAÇÃO
// ============================================
const evalModal = document.getElementById('eval-modal');
const evalForm = document.getElementById('eval-form');

document.getElementById('close-modal').addEventListener('click', () => {
  evalModal.style.display = 'none';
});

evalModal.addEventListener('click', (e) => {
  if (e.target === evalModal) evalModal.style.display = 'none';
});

async function openEvaluation(attackId) {
  const { data: criteria } = await db
    .from('criteria')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  allCriteria = criteria || [];

  const { data: attack } = await db
    .from('attacks')
    .select('*')
    .eq('id', attackId)
    .single();

  if (!attack) return;

  // Verificar se o usuário já avaliou este ataque
  let userEval = null;
  if (currentUser) {
    const { data: existingEvals } = await db
      .from('evaluations')
      .select('*')
      .eq('attack_id', attackId);

    if (existingEvals && existingEvals.length > 0) {
      // Procurar avaliação deste usuário (por email ou nome)
      userEval = existingEvals.find(ev =>
        ev.evaluator_name === currentUser.email ||
        ev.evaluator_name === currentUser.email.split('@')[0]
      );
    }
  }

  // Montar info do ataque
  document.getElementById('eval-attack-info').innerHTML = `
    <div class="eval-player-name">${attack.player_name || attack.player_id}</div>
    <div class="eval-info">
      ID: ${attack.player_id} | Clã: ${attack.clan} | Tipo: ${attack.attack_type} |
      ${new Date(attack.created_at).toLocaleDateString('pt-BR')}
    </div>
  `;

  renderVideo('eval-video-container', attack.video_url, attack.video_source);

  const criteriaContainer = document.getElementById('eval-criteria');

  if (userEval) {
    // Já avaliou - mostrar apenas os dados da avaliação
    const evalCriteria = [];
    if (userEval.strategy) evalCriteria.push({ label: 'Estratégia', value: userEval.strategy });
    if (userEval.funneling) evalCriteria.push({ label: 'Afunilamento', value: userEval.funneling });
    if (userEval.improvisation) evalCriteria.push({ label: 'Improviso', value: userEval.improvisation });
    if (userEval.spell_usage) evalCriteria.push({ label: 'Feitiços', value: userEval.spell_usage });
    if (userEval.hero_skills) evalCriteria.push({ label: 'Heróis', value: userEval.hero_skills });

    criteriaContainer.innerHTML = `
      <div class="already-evaluated">
        <div class="eval-badge">✓ Você já avaliou este ataque</div>
        <div class="eval-stars-read">
          ${evalCriteria.map(c => `
            <span class="eval-star-item">
              ${c.label} <span class="number-score">${c.value}/10</span>
            </span>
          `).join('')}
        </div>
        ${userEval.feedback ? `<div class="eval-feedback-text">${userEval.feedback}</div>` : ''}
      </div>
    `;

    // Esconder formulário
    evalForm.style.display = 'none';
  } else {
    // Não avaliou - mostrar formulário
    criteriaContainer.innerHTML = allCriteria.map(c => `
      <div class="criteria-item">
        <div class="criteria-label">${c.label}</div>
        <div class="number-rating">
          <input type="number" name="${c.name}" id="${c.name}" min="1" max="10" step="0.1" placeholder="1-10">
          <span class="rating-hint">/ 10</span>
        </div>
      </div>
    `).join('');

    evalForm.style.display = 'block';
  }

  evalForm.dataset.attackId = attackId;
  evalModal.style.display = 'flex';
}

function renderVideo(containerId, videoUrl, videoSource) {
  const container = document.getElementById(containerId);
  if (!videoUrl) {
    container.innerHTML = '<p>Vídeo não disponível</p>';
    return;
  }

  // Se veio do upload do Supabase Storage, reproduz direto
  if (videoSource === 'upload' || videoUrl.includes('supabase')) {
    container.innerHTML = `<video class="eval-video" controls src="${videoUrl}"></video>`;
    return;
  }

  // YouTube
  if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
    const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s?]+)/);
    if (match) {
      container.innerHTML = `<iframe class="eval-video" src="https://www.youtube.com/embed/${match[1]}" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
      return;
    }
  }

  // Streamable
  if (videoUrl.includes('streamable.com')) {
    const id = videoUrl.split('/').pop();
    container.innerHTML = `<iframe class="eval-video" src="https://streamable.com/e/${id}" frameborder="0" allowfullscreen allow="autoplay"></iframe>`;
    return;
  }

  // Clipchamp / outros com embed
  if (videoUrl.includes('clipchamp.com')) {
    container.innerHTML = `<iframe class="eval-video" src="${videoUrl.replace('/watch/', '/embed/')}" frameborder="0" allowfullscreen></iframe>`;
    return;
  }

  // Link direto de vídeo (mp4, webm, etc)
  container.innerHTML = `<video class="eval-video" controls src="${videoUrl}"></video>`;
}

evalForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const attackId = evalForm.dataset.attackId;

  // Verificar se está logado
  if (!currentUser) {
    showMessage(document.getElementById('eval-message'), 'Faça login para enviar avaliação.', 'error');
    return;
  }

  const evaluation = {
    attack_id: attackId,
    evaluator_name: document.getElementById('evaluator-name').value.trim() || currentUser?.email || 'Anônimo',
    feedback: document.getElementById('eval-feedback').value.trim()
  };

  allCriteria.forEach(c => {
    const input = document.querySelector(`input[name="${c.name}"]`);
    evaluation[c.name] = input && input.value ? parseFloat(input.value) : null;
  });

  const { error } = await db.from('evaluations').insert([evaluation]);

  const msgEl = document.getElementById('eval-message');
  if (error) {
    showMessage(msgEl, 'Erro ao enviar: ' + error.message, 'error');
  } else {
    await db
      .from('attacks')
      .update({ status: 'Respondido' })
      .eq('id', attackId);

    showMessage(msgEl, 'Avaliação enviada com sucesso!', 'success');
    setTimeout(() => {
      evalModal.style.display = 'none';
      loadAttacks();
    }, 1500);
  }
});

// ============================================
// ADMIN
// ============================================
async function loadAdmin() {
  await Promise.all([
    loadCriteriaAdmin(),
    loadFriendlyTypesAdmin(),
    loadStats(),
    loadPlayersCount(),
    loadPlayersList()
  ]);
}

async function loadCriteriaAdmin() {
  const { data } = await db
    .from('criteria')
    .select('*')
    .order('sort_order');

  document.getElementById('criteria-list').innerHTML = (data || []).map(c => `
    <div class="criteria-item-admin">
      <span>${c.label} <small style="color:var(--text-muted)">(${c.name})</small></span>
      <div>
        <button class="btn-toggle" onclick="toggleCriteria('${c.id}', ${!c.is_active})">
          ${c.is_active ? 'Ativo' : 'Inativo'}
        </button>
        <button class="btn-delete" onclick="deleteCriteria('${c.id}')">Remover</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('add-criteria-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-criteria-name').value.trim();
  const label = document.getElementById('new-criteria-label').value.trim();
  if (!name || !label) return;

  const { data: existing } = await db
    .from('criteria')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) { alert('Já existe um critério com esse nome.'); return; }

  await db.from('criteria').insert([{ name, label }]);
  document.getElementById('new-criteria-name').value = '';
  document.getElementById('new-criteria-label').value = '';
  loadCriteriaAdmin();
});

async function toggleCriteria(id, isActive) {
  await db.from('criteria').update({ is_active: isActive }).eq('id', id);
  loadCriteriaAdmin();
}

async function deleteCriteria(id) {
  if (!confirm('Remover este critério?')) return;
  await db.from('criteria').delete().eq('id', id);
  loadCriteriaAdmin();
}

async function loadFriendlyTypesAdmin() {
  const { data } = await db
    .from('friendly_types')
    .select('*')
    .order('name');

  document.getElementById('friendly-types-list').innerHTML = (data || []).map(t => `
    <div class="criteria-item-admin">
      <span>${t.name}</span>
      <button class="btn-delete" onclick="deleteFriendlyType('${t.id}')">Remover</button>
    </div>
  `).join('');
}

document.getElementById('add-friendly-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-friendly-type').value.trim();
  if (!name) return;
  await db.from('friendly_types').insert([{ name }]);
  document.getElementById('new-friendly-type').value = '';
  loadFriendlyTypesAdmin();
});

async function deleteFriendlyType(id) {
  if (!confirm('Remover este tipo?')) return;
  await db.from('friendly_types').delete().eq('id', id);
  loadFriendlyTypesAdmin();
}

async function loadStats() {
  const [total, pending, inProgress, responded, evals] = await Promise.all([
    db.from('attacks').select('*', { count: 'exact', head: true }),
    db.from('attacks').select('*', { count: 'exact', head: true }).eq('status', 'Aguardando'),
    db.from('attacks').select('*', { count: 'exact', head: true }).eq('status', 'Em andamento'),
    db.from('attacks').select('*', { count: 'exact', head: true }).eq('status', 'Respondido'),
    db.from('evaluations').select('*', { count: 'exact', head: true })
  ]);

  document.getElementById('stats-container').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${total.count || 0}</div>
      <div class="stat-label">Total de Ataques</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:var(--warning)">${pending.count || 0}</div>
      <div class="stat-label">Aguardando</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:var(--info)">${inProgress.count || 0}</div>
      <div class="stat-label">Em Andamento</div>
    </div>
    <div class="stat-card">
      <div class="stat-value" style="color:var(--success)">${responded.count || 0}</div>
      <div class="stat-label">Respondidos</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${evals.count || 0}</div>
      <div class="stat-label">Avaliações</div>
    </div>
  `;
}

// ============================================
// ADMIN: JOGADORES (CSV)
// ============================================
let csvData = null;

document.getElementById('csv-file-input').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  document.getElementById('csv-file-name').textContent = file.name;
  document.getElementById('process-csv-btn').style.display = 'inline-block';

  const reader = new FileReader();
  reader.onload = (event) => {
    csvData = parseCSV(event.target.result);
  };
  reader.readAsText(file);
});

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const header = lines[0].split(';');
  const players = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(';');
    if (cols.length < 6) continue;

    // Limpar # do tag antes de salvar
    const tag = cols[4]?.trim().replace(/[^a-zA-Z0-9]/g, '') || '';

    players.push({
      clan_number: parseInt(cols[1]) || 0,
      clan_name: cols[2]?.trim() || '',
      player_name: cols[3]?.trim() || '',
      player_tag: tag,
      town_hall: parseInt(cols[5]) || 0,
      role: cols[6]?.trim() || ''
    });
  }

  return players;
}

document.getElementById('process-csv-btn').addEventListener('click', async () => {
  if (!csvData || csvData.length === 0) {
    showMessage(document.getElementById('csv-message'), 'Nenhum dado válido no CSV.', 'error');
    return;
  }

  const btn = document.getElementById('process-csv-btn');
  const playersList = document.getElementById('players-list');
  btn.disabled = true;
  btn.textContent = 'Processando...';
  playersList.innerHTML = '<div class="loading-players"><span class="spinner-btn"></span> Importando jogadores...</div>';

  let inserted = 0;
  let skipped = 0;

  for (const player of csvData) {
    const { error } = await db.from('players').upsert(player, { onConflict: 'player_tag', ignoreDuplicates: false });
    if (error) {
      skipped++;
    } else {
      inserted++;
    }
  }

  btn.disabled = false;
  btn.textContent = 'Processar';
  csvData = null;
  document.getElementById('csv-file-input').value = '';
  document.getElementById('csv-file-name').textContent = '';
  btn.style.display = 'none';

  showMessage(document.getElementById('csv-message'), `${inserted} jogadores importados. ${skipped} erros.`, 'success');
  loadPlayersCount();
  loadPlayersList();
});

async function loadPlayersCount() {
  const { count } = await db.from('players').select('*', { count: 'exact', head: true });
  document.getElementById('players-count').textContent = `${count || 0} jogadores cadastrados`;
}

async function loadPlayersList() {
  const { data } = await db.from('players').select('*').order('clan_name').order('player_name').limit(50);
  const container = document.getElementById('players-list');

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-state">Nenhum jogador cadastrado.</p>';
    return;
  }

  container.innerHTML = data.map(p => `
    <div class="player-item">
      <span class="player-name">${p.player_name}</span>
      <span class="player-tag">${p.player_tag}</span>
      <span class="player-clan">${p.clan_name}</span>
      <span class="player-th">TH${p.town_hall}</span>
      <span class="player-role">${p.role}</span>
    </div>
  `).join('');
}

async function clearPlayers() {
  if (!confirm('Remover todos os jogadores do elenco?')) return;
  await db.from('players').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  loadPlayersCount();
  loadPlayersList();
}

// ============================================
// INICIALIZAÇÃO
// ============================================
loadFriendlyTypes();
