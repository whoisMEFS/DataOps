/* ==========================================================
   DATAOPS | ANIMAÇÃO DE ABERTURA (logo 3D) - v2
   Arquivo: JS/intro.js
   Carregue com:  <script src="../JS/intro.js" defer></script>

   - Não depende de nenhum CSS (estilos inline).
   - Toca quando a página é aberta por navegação (ex.: depois do
     login). Não toca no F5 nem ao voltar/avançar.
   - Para forçar a animação, abra a página com  ?intro=1
     Ex.: dashboard.html?intro=1
========================================================== */
(function () {
  'use strict';

  // Inclinação em repouso da logo 3D (AJUSTE: mais ou menos perspectiva)
  const LOGO_INCLINADA = 'rotateX(-12deg) rotateY(-22deg)';

  const EASE = 'cubic-bezier(.45, 0, .2, 1)';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const log = (...args) => console.info('[DataOps intro]', ...args);

  const mixCor = (a, b, t) =>
    'rgb(' + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',') + ')';

  // Liga o contorno neon em volta de "D" + "ataOps" (CSS .brand.neon)
  function ligarNeon() {
    document.querySelector('.sidebar .brand')?.classList.add('neon');
  }

  // ----------------------------------------------------------
  // Monta a logo 3D: corpo com espessura + "D" em relevo
  // ----------------------------------------------------------
  function construirLogo3D(el, letra) {
    letra = letra || 'D';

    const camada = (css) => {
      const d = document.createElement('div');
      d.style.cssText = css;
      return d;
    };

    const cheio = 'position:absolute;inset:0;';
    const espessura = 24;
    const relevo = 10;
    const metade = espessura / 2;
    const fatias = espessura + 1;

    el.textContent = '';
    el.style.cssText =
      'position:relative;display:block;flex-shrink:0;width:96px;height:96px;' +
      'background:none;border-radius:0;box-shadow:none;font-size:0;perspective:700px;';

    const glow = camada(
      cheio + 'inset:-6px;border-radius:30px;background:rgba(59,108,246,.55);' +
      'filter:blur(24px);opacity:.8;pointer-events:none;'
    );
    const ground = camada(
      'position:absolute;left:8%;right:8%;bottom:-46px;height:22px;border-radius:50%;' +
      'background:radial-gradient(ellipse at center,rgba(4,12,50,.6),transparent 70%);' +
      'filter:blur(6px);pointer-events:none;'
    );

    const cubo = camada(cheio + 'transform-style:preserve-3d;');

    for (let i = 0; i < fatias; i++) {
      const fatia = camada(cheio + 'border-radius:24px;');
      fatia.style.transform = 'translateZ(' + (-metade + i) + 'px)';
      fatia.style.background = mixCor([24, 46, 140], [74, 114, 240], i / (fatias - 1));
      cubo.append(fatia);
    }

    const bisel =
      'inset 0 0 0 1.5px rgba(255,255,255,.28),' +
      'inset 0 12px 18px rgba(255,255,255,.14),' +
      'inset 0 -12px 18px rgba(0,0,0,.18)';

    const montarFace = (fundo, transform) => {
      const face = camada(
        cheio + 'border-radius:24px;backface-visibility:hidden;' +
        '-webkit-backface-visibility:hidden;' +
        'background:' + fundo + ';box-shadow:' + bisel + ';'
      );
      face.style.transform = transform;

      const brilho = camada(
        cheio + 'border-radius:inherit;pointer-events:none;' +
        'background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.65) 50%,transparent 60%);' +
        'background-size:300% 100%;background-position:0% 0;'
      );

      face.append(brilho);
      cubo.append(face);
      return { brilho };
    };

    const frente = montarFace(
      'linear-gradient(135deg,#3b6cf6,#5b7cff)',
      'translateZ(' + (metade + 0.5) + 'px)'
    );
    const verso = montarFace(
      'linear-gradient(135deg,#5b7cff,#3b6cf6)',
      'rotateY(180deg) translateZ(' + (metade + 0.5) + 'px)'
    );

    for (let k = 0; k <= relevo; k++) {
      const cor = k === relevo
        ? '#ffffff'
        : mixCor([22, 40, 120], [190, 210, 255], k / relevo);
      const z = metade + 1 + k;

      const estilo =
        cheio + 'display:flex;align-items:center;justify-content:center;padding-top:2px;' +
        'font:800 54px/1 system-ui,sans-serif;backface-visibility:hidden;' +
        '-webkit-backface-visibility:hidden;pointer-events:none;color:' + cor + ';';

      const frontal = camada(estilo);
      frontal.textContent = letra;
      frontal.style.transform = 'translateZ(' + z + 'px)';

      const traseira = camada(estilo);
      traseira.textContent = letra;
      traseira.style.transform = 'rotateY(180deg) translateZ(' + z + 'px)';

      cubo.append(frontal, traseira);
    }

    el.append(glow, ground, cubo);

    return {
      cubo,
      frontShine: frente.brilho,
      backShine: verso.brilho
    };
  }

  // ----------------------------------------------------------
  // Sequência da animação
  // ----------------------------------------------------------
  async function tocarIntro() {
    const marca =
      document.querySelector('.sidebar .brand') ||
      document.querySelector('.sidebar .logo, .sidebar .sidebar-logo, .sidebar .logo-container');
    const logoAlvo = marca?.querySelector('.brand-logo, .logo-icon, i, img') || null;
    const nomeAlvo = marca?.querySelector('.brand-name, span:last-child, h2') || null;
    const temAlvo = !!(marca && logoAlvo && nomeAlvo);
    const mostrarMarca = () => { if (marca) marca.style.visibility = ''; };

    if (!temAlvo) {
      log('Marca da sidebar não encontrada; a animação toca sem o voo final.');
    }

    // Esconde a marca da sidebar até a logo "pousar" nela
    if (marca) marca.style.visibility = 'hidden';

    // ----- Tela de abertura (tudo inline) -----
    const intro = document.createElement('div');
    intro.style.cssText =
      'position:fixed;inset:0;z-index:99999;display:grid;place-items:center;' +
      'background:rgba(11,18,32,.55);' +
      '-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);';

    const brand = document.createElement('div');
    brand.style.cssText = 'display:flex;align-items:center;opacity:0;';

    const logoEl = document.createElement('div');

    const nome = document.createElement('div');
    nome.style.cssText =
      'display:flex;align-items:center;width:0;margin-left:0;padding-block:.12em;' +
      'overflow:hidden;color:#fff;font:700 56px system-ui,sans-serif;';

    const texto = document.createElement('span');
    texto.style.cssText = 'display:block;flex-shrink:0;white-space:nowrap;';
    texto.textContent = 'ataOps';

    nome.append(texto);
    brand.append(logoEl, nome);
    intro.append(brand);
    document.body.append(intro);

    const L = construirLogo3D(logoEl, 'D');
    L.cubo.style.transform = LOGO_INCLINADA;

    // Segurança: se algo travar, limpa tudo depois de 12 s
    const trava = setTimeout(() => {
      log('Tempo limite atingido, encerrando a abertura.');
      mostrarMarca();
      ligarNeon();
      intro.remove();
    }, 12000);

    try {
      // 1) Entrada: a logo aparece crescendo
      brand.style.opacity = '1';
      await brand.animate(
        [
          { opacity: 0, transform: 'scale(.55)' },
          { opacity: 1, transform: 'scale(1)' }
        ],
        { duration: 700, easing: EASE }
      ).finished;

      // 2) Giro completo da moeda com brilho passando
      const brilho = [{ backgroundPosition: '100% 0' }, { backgroundPosition: '0% 0' }];
      L.frontShine.animate(brilho, { duration: 1400, easing: 'ease-in-out' });
      L.backShine.animate(brilho, { duration: 1400, easing: 'ease-in-out' });

      await L.cubo.animate(
        [
          { transform: 'rotateX(-12deg) rotateY(-22deg)' },
          { transform: 'rotateX(-12deg) rotateY(338deg)' }
        ],
        { duration: 1400, easing: EASE }
      ).finished;

      // 3) "ataOps" se abre a partir do D
      const larguraNome = texto.offsetWidth;
      await nome.animate(
        [
          { width: '0px', marginLeft: '0px' },
          { width: larguraNome + 'px', marginLeft: '10px' }
        ],
        { duration: 700, easing: EASE, fill: 'forwards' }
      ).finished;
      nome.style.width = larguraNome + 'px';
      nome.style.marginLeft = '10px';

      await sleep(450);

      // 4) Voo até a sidebar
      const ri = brand.getBoundingClientRect();
      const rl = temAlvo ? logoAlvo.getBoundingClientRect() : null;
      const rn = temAlvo ? nomeAlvo.getBoundingClientRect() : null;

      const alvoLarg = temAlvo ? rn.right - rl.left : 0;

      if (alvoLarg > 0 && ri.width > 0) {
        const escala = alvoLarg / ri.width;
        const dx = (rl.left + rn.right) / 2 - (ri.left + ri.width / 2);
        const dy = rl.top + rl.height / 2 - (ri.top + ri.height / 2);

        L.cubo.animate(
          [
            { transform: LOGO_INCLINADA },
            { transform: 'rotateX(0deg) rotateY(0deg)' }
          ],
          { duration: 900, easing: EASE, fill: 'forwards' }
        );

        await brand.animate(
          [
            { transform: 'translate(0,0) scale(1)' },
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + escala + ')' }
          ],
          { duration: 900, easing: EASE, fill: 'forwards' }
        ).finished;
      } else {
        log('Sidebar não visível, pulando o voo.');
      }

      // 5) Pouso: mostra a marca real, some com a voadora e abre o painel
      mostrarMarca();
      brand.style.visibility = 'hidden';
      ligarNeon();

      await intro.animate(
        [{ opacity: 1 }, { opacity: 0 }],
        { duration: 800, easing: 'ease-in-out', fill: 'forwards' }
      ).finished;
    } catch (erro) {
      console.warn('[DataOps intro] Animação interrompida:', erro);
      ligarNeon();
    } finally {
      clearTimeout(trava);
      mostrarMarca();
      intro.remove();
    }
  }

  // ----------------------------------------------------------
  // Decide se toca
  // ----------------------------------------------------------
  function iniciar() {
    const forcar = new URLSearchParams(location.search).has('intro');

    if (forcar) {
      log('Forçada por ?intro.');
      tocarIntro();
      return;
    }

    const nav = performance.getEntriesByType('navigation')[0];
    const tipo = nav ? nav.type : 'navigate';

    if (tipo === 'reload' || tipo === 'back_forward') {
      log('Pulada (a página foi recarregada). Use ?intro=1 para forçar.');
      ligarNeon();
      return;
    }

    if (document.documentElement.classList.contains('reduce-motion')) {
      log('Pulada: "Reduzir animações" está ativo em Configurações.');
      ligarNeon();
      return;
    }

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      log('Pulada: o sistema está com "reduzir movimento" ligado.');
      ligarNeon();
      return;
    }

    if (typeof Element.prototype.animate !== 'function') {
      log('Pulada: navegador sem Web Animations API.');
      ligarNeon();
      return;
    }

    tocarIntro();
  }

  // Para testar pelo Console:  DataOpsIntro.play()
  window.DataOpsIntro = { play: tocarIntro };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();