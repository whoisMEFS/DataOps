/* ==========================================================
   DATAOPS | TELA DE CONFIGURAÇÕES
   Arquivo: JS/configuracoes.js
   Carregue DEPOIS do dashboard.js e do relatorios-configuracoes.js:
     <script src="../JS/configuracoes.js" defer></script>

   Recursos:
   - Perfil (editar/salvar) refletido no menu lateral
   - Tema claro / escuro / automático
   - Reduzir animações
   - Atualização automática (60 s)
   - Período e formato padrão
   - Restaurar preferências
   - Informações do sistema
   As notificações (data-notif) continuam no relatorios-configuracoes.js.
========================================================== */
document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  const root = document.getElementById('settings');
  if (!root) return;

  const $ = (id) => document.getElementById(id);

  const KEYS = {
    prefs: 'dataops_prefs',                        // lido também pelo <head>
    profile: 'dataops_profile',
    notifPrefs: 'dataops_notification_preferences_v1',
    notifList: 'dataops_notifications_v1',
    imported: 'dataops_registros_importados'
  };

  const DEFAULT_PREFS = {
    theme: 'dark',
    reduceMotion: false,
    autoRefresh: false,
    defaultPeriod: 'week',
    defaultFormat: 'csv'
  };

  const THEMES = ['light', 'dark', 'auto'];
  const PERIODS = ['week', 'month', 'year'];
  const FORMATS = ['csv'];

  const DEPARTMENTS = {
    finance: 'Financeiro',
    commercial: 'Comercial',
    logistics: 'Logística',
    it: 'TI',
    other: 'Outro'
  };

  /* ---------- Armazenamento seguro ---------- */

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      const value = JSON.parse(raw);
      return value && typeof value === 'object' ? value : fallback;
    } catch (erro) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (erro) {
      console.warn('DataOps: não foi possível salvar', key, erro);
      return false;
    }
  }

  function removeKey(key) {
    try { localStorage.removeItem(key); } catch (erro) { /* ignora */ }
  }

  /* ---------- Mensagem de status ---------- */

  let messageTimer = null;

  function say(text, isError) {
    const box = $('settingsMessage');
    if (!box) return;

    box.textContent = text;
    box.classList.toggle('error', Boolean(isError));
    box.classList.toggle('success', !isError);

    clearTimeout(messageTimer);
    messageTimer = setTimeout(function () {
      box.textContent = '';
      box.classList.remove('success', 'error');
    }, 4000);
  }

  /* ==========================================================
     PREFERÊNCIAS
  ========================================================== */

  function sanitizePrefs(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};

    return {
      theme: THEMES.includes(src.theme) ? src.theme : DEFAULT_PREFS.theme,
      reduceMotion: src.reduceMotion === true,
      autoRefresh: src.autoRefresh === true,
      defaultPeriod: PERIODS.includes(src.defaultPeriod)
        ? src.defaultPeriod
        : DEFAULT_PREFS.defaultPeriod,
      defaultFormat: FORMATS.includes(src.defaultFormat)
        ? src.defaultFormat
        : DEFAULT_PREFS.defaultFormat
    };
  }

  let prefs = sanitizePrefs(readJSON(KEYS.prefs, {}));

  function savePrefs() {
    // Mantém outras chaves que existam no mesmo objeto.
    const stored = readJSON(KEYS.prefs, {});
    return writeJSON(KEYS.prefs, Object.assign({}, stored, prefs));
  }

  /* ---------- Tema ---------- */

  const lightQuery = window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

  function resolvedTheme() {
    if (prefs.theme === 'auto') {
      return lightQuery && lightQuery.matches ? 'light' : 'dark';
    }
    return prefs.theme;
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', resolvedTheme());
  }

  if (lightQuery && lightQuery.addEventListener) {
    lightQuery.addEventListener('change', function () {
      if (prefs.theme === 'auto') applyTheme();
    });
  }

  /* ---------- Animações ---------- */

  function applyMotion() {
    document.documentElement.classList.toggle('reduce-motion', prefs.reduceMotion);
  }

  /* ---------- Atualização automática ---------- */

  let refreshTimer = null;

  function refreshDashboard() {
    // O dashboard.js escuta "change" neste filtro e recalcula tudo.
    const filtro = $('periodFilter');
    if (filtro) filtro.dispatchEvent(new Event('change'));
  }

  function applyAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = null;

    if (!prefs.autoRefresh) return;

    refreshTimer = setInterval(function () {
      if (!document.hidden) refreshDashboard();
    }, 60000);
  }

  /* ---------- Período e formato padrão ---------- */

  function applyDefaultPeriod() {
    const filtro = $('periodFilter');
    if (!filtro || filtro.value === prefs.defaultPeriod) return;

    filtro.value = prefs.defaultPeriod;
    refreshDashboard();
  }

  function applyDefaultFormat() {
    const formato = $('reportFormat');
    if (!formato) return;

    const existe = Array.from(formato.options).some(function (opcao) {
      return opcao.value === prefs.defaultFormat;
    });

    if (existe) formato.value = prefs.defaultFormat;
  }

  function applyAll() {
    applyTheme();
    applyMotion();
    applyAutoRefresh();
    applyDefaultFormat();
  }

  /* ---------- Controles da tela ---------- */

  function updateControls() {
    root.querySelectorAll('input[name="theme"]').forEach(function (radio) {
      const ativo = radio.value === prefs.theme;
      radio.checked = ativo;
      radio.closest('.theme-card')?.classList.toggle('selected', ativo);
    });

    if ($('reduceMotion')) $('reduceMotion').checked = prefs.reduceMotion;
    if ($('autoRefresh')) $('autoRefresh').checked = prefs.autoRefresh;
    if ($('defaultPeriod')) $('defaultPeriod').value = prefs.defaultPeriod;
    if ($('defaultFormat')) $('defaultFormat').value = prefs.defaultFormat;
  }

  function commit(message) {
    const ok = savePrefs();
    applyAll();
    updateControls();

    if (ok) {
      say(message);
    } else {
      say('Não foi possível salvar no navegador (armazenamento indisponível).', true);
    }
  }

  root.querySelectorAll('input[name="theme"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (!radio.checked) return;
      prefs.theme = radio.value;
      commit('Tema atualizado.');
    });
  });

  $('reduceMotion')?.addEventListener('change', function (evento) {
    prefs.reduceMotion = evento.target.checked;
    commit(prefs.reduceMotion ? 'Animações reduzidas.' : 'Animações ativadas.');
  });

  $('autoRefresh')?.addEventListener('change', function (evento) {
    prefs.autoRefresh = evento.target.checked;
    commit(
      prefs.autoRefresh
        ? 'Atualização automática ativada (a cada 60 s).'
        : 'Atualização automática desativada.'
    );
  });

  $('defaultPeriod')?.addEventListener('change', function (evento) {
    prefs.defaultPeriod = PERIODS.includes(evento.target.value)
      ? evento.target.value
      : DEFAULT_PREFS.defaultPeriod;

    applyDefaultPeriod();
    commit('Período padrão salvo.');
  });

  $('defaultFormat')?.addEventListener('change', function (evento) {
    prefs.defaultFormat = FORMATS.includes(evento.target.value)
      ? evento.target.value
      : DEFAULT_PREFS.defaultFormat;

    commit('Formato padrão salvo.');
  });

  // Feedback das notificações (a gravação é feita no relatorios-configuracoes.js).
  root.querySelectorAll('[data-notif]').forEach(function (checkbox) {
    checkbox.addEventListener('change', function () {
      say('Preferência de notificação salva.');
    });
  });

  /* ---------- Restaurar preferências ---------- */

  $('restoreSettings')?.addEventListener('click', function () {
    if (!window.confirm('Restaurar todas as preferências desta tela para o padrão?')) {
      return;
    }

    prefs = Object.assign({}, DEFAULT_PREFS);

    removeKey(KEYS.prefs);
    removeKey(KEYS.notifPrefs);

    // Notificações: padrão = tudo ligado, exceto e-mail.
    root.querySelectorAll('[data-notif]').forEach(function (checkbox) {
      checkbox.checked = checkbox.dataset.notif !== 'email';
    });

    applyAll();
    applyDefaultPeriod();
    updateControls();

    if (window.DataOpsNotifications && window.DataOpsNotifications.refresh) {
      window.DataOpsNotifications.refresh();
    }

    say('Preferências restauradas para o padrão.');
  });

  /* ==========================================================
     PERFIL
  ========================================================== */

  const profileFields = {
    name: $('profileName'),
    email: $('profileEmail'),
    role: $('profileRole'),
    dept: $('profileDept')
  };

  function sanitizeProfile(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const text = (valor, max) => String(valor || '').trim().slice(0, max);

    return {
      name: text(src.name, 60),
      email: text(src.email, 80),
      role: text(src.role, 40),
      dept: Object.prototype.hasOwnProperty.call(DEPARTMENTS, src.dept) ? src.dept : ''
    };
  }

  let profile = sanitizeProfile(readJSON(KEYS.profile, {}));

  function sidebarName() {
    const el = $('userName');
    return el ? el.textContent.trim() : '';
  }

  function updateSidebar() {
    const nome = profile.name;
    if (!nome) return;

    const rotulo = $('userName');
    if (rotulo) rotulo.textContent = nome;

    const avatar = document.querySelector('.sidebar-bottom .user-avatar');
    if (avatar) avatar.textContent = nome.charAt(0).toUpperCase();
  }

  function renderProfile() {
    const nomeExibido = profile.name || sidebarName() || 'Usuário';

    $('profileDisplayName').textContent = nomeExibido;
    $('profileDisplayRole').textContent = profile.role || 'Cargo não informado';
    $('profileAvatar').textContent = nomeExibido.charAt(0).toUpperCase();

    profileFields.name.value = profile.name;
    profileFields.email.value = profile.email;
    profileFields.role.value = profile.role;
    profileFields.dept.value = profile.dept;
  }

  function setEditing(editando) {
    Object.keys(profileFields).forEach(function (chave) {
      profileFields[chave].disabled = !editando;
    });

    $('profileEdit').hidden = editando;
    $('profileSave').hidden = !editando;
    $('profileCancel').hidden = !editando;

    if (editando) profileFields.name.focus();
  }

  $('profileEdit')?.addEventListener('click', function () {
    if (!profile.name) profileFields.name.value = sidebarName() === 'Usuário' ? '' : sidebarName();
    setEditing(true);
  });

  $('profileCancel')?.addEventListener('click', function () {
    renderProfile();
    setEditing(false);
  });

  $('profileForm')?.addEventListener('submit', function (evento) {
    evento.preventDefault();

    const novo = sanitizeProfile({
      name: profileFields.name.value,
      email: profileFields.email.value,
      role: profileFields.role.value,
      dept: profileFields.dept.value
    });

    if (!novo.name) {
      say('Informe o nome completo.', true);
      profileFields.name.focus();
      return;
    }

    if (novo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo.email)) {
      say('Informe um e-mail válido.', true);
      profileFields.email.focus();
      return;
    }

    profile = novo;

    if (!writeJSON(KEYS.profile, profile)) {
      say('Não foi possível salvar o perfil neste navegador.', true);
      return;
    }

    updateSidebar();
    renderProfile();
    setEditing(false);
    say('Perfil salvo.');
  });

  /* ==========================================================
     INFORMAÇÕES DO SISTEMA
  ========================================================== */

  function countStored(key) {
    const lista = readJSON(key, []);
    return Array.isArray(lista) ? lista.length : 0;
  }

  function buildSystemInfo() {
    const lista = $('systemInfo');
    if (!lista) return;

    const temas = { light: 'Claro', dark: 'Escuro', auto: 'Automático' };

    const itens = [
      ['Versão', '1.0.0'],
      ['Tema', temas[prefs.theme] + (prefs.theme === 'auto'
        ? ' (agora: ' + (resolvedTheme() === 'light' ? 'claro' : 'escuro') + ')'
        : '')],
      ['Animações', prefs.reduceMotion ? 'Reduzidas' : 'Ativadas'],
      ['Atualização automática', prefs.autoRefresh ? 'Ligada (60 s)' : 'Desligada'],
      ['Registros importados', String(countStored(KEYS.imported))],
      ['Notificações guardadas', String(countStored(KEYS.notifList))],
      ['Armazenamento', 'Navegador local (localStorage)'],
      ['Consultado em', new Date().toLocaleString('pt-BR')]
    ];

    lista.replaceChildren();

    itens.forEach(function (par) {
      const linha = document.createElement('div');
      const termo = document.createElement('dt');
      const valor = document.createElement('dd');

      termo.textContent = par[0];
      valor.textContent = par[1];

      linha.append(termo, valor);
      lista.appendChild(linha);
    });
  }

  $('systemInfoToggle')?.addEventListener('click', function (evento) {
    const lista = $('systemInfo');
    const botao = evento.currentTarget;
    const abrir = lista.hidden;

    if (abrir) buildSystemInfo();

    lista.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
  });

  /* ==========================================================
     INICIALIZAÇÃO
  ========================================================== */

  applyAll();
  applyDefaultPeriod();
  updateControls();
  updateSidebar();
  renderProfile();
  setEditing(false);
});