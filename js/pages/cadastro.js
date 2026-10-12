/* =====================================================================
 * Página: Cadastro de Cidades / Sites
 * ---------------------------------------------------------------------
 * Formulário para cadastrar sites encontrados sem região no VALID_CAD.
 *
 * Mapeamento de colunas (novo):
 *   A = Cidade   B = END_ID   C = Site
 *   D/E/F = dinâmicos (valores únicos já existentes na planilha)
 *   G = cópia de B (END_ID)   H = cópia de A (Cidade)
 *
 * As opções dos selects D, E, F são carregadas via getValidCadOptions
 * (action do Apps Script que lê os valores únicos das colunas reais).
 * ===================================================================== */
(function (TMG) {
  TMG.pages = TMG.pages || {};
  var U = TMG.ui;

  var LS_SITES = 'tmg_sites';

  // Cache de opções dinâmicas — carregado uma vez por sessão de navegação.
  // Estrutura: { headers: {D,E,F}, options: {D:[...], E:[...], F:[...]} }
  var _cadOptions = null;

  function lerSites() {
    try { return JSON.parse(localStorage.getItem(LS_SITES) || '[]') || []; }
    catch (e) { return []; }
  }

  // ---- Carrega opções dinâmicas (D, E, F) do backend ----
  async function carregarOpcoes() {
    if (_cadOptions) return _cadOptions;
    try {
      var res = await TMG.api.getValidCadOptions();
      _cadOptions = res || { headers: { D: 'Coluna D', E: 'Coluna E', F: 'Coluna F' }, options: { D: [], E: [], F: [] } };
    } catch (e) {
      _cadOptions = { headers: { D: 'Coluna D', E: 'Coluna E', F: 'Coluna F' }, options: { D: [], E: [], F: [] } };
    }
    return _cadOptions;
  }

  // Monta um <select> com os valores da coluna (mais opção "— em branco —")
  function selectDinamico(id, valores, cls) {
    var opts = [U.h('option', { value: '', text: '— em branco —' })].concat(
      (valores || []).map(function (v) { return U.h('option', { value: v, text: v }); })
    );
    return U.h('select', { id: id, class: cls || 'tmg-select w-full' }, opts);
  }

  // ---- Varredura de sites sem cadastro (regiao = OTHERS) ----
  function coletarSemCadastro(data) {
    var vistos = {}, lista = [];
    function add(endId, site, cidade, origem) {
      var key = (endId || '').toString().trim().toUpperCase();
      if (!key || vistos[key]) return;
      vistos[key] = true;
      lista.push({ end_id: key, site: (site || '').toString().trim(), cidade: (cidade || '').toString().trim(), origem: origem });
    }
    ((data && data.tasksEnriched) || []).forEach(function (t) {
      if ((t.regiao || 'OTHERS') !== 'OTHERS') return;
      if (!TMG.domain.isTicketCorretiva(t.tipoAtividade)) return;
      add(t.enderecoId, t.siteId, t.cidade, 'Tarefa');
    });
    ((data && data.incidentsEnriched) || []).forEach(function (i) {
      if ((i.regiao || 'OTHERS') !== 'OTHERS') return;
      if ((i.statusTrat || '').toUpperCase() === 'RESOLVIDO') return;
      add(i.enderecoId, i.site, i.cidade || i.cidadeUf, 'Incidente');
    });
    return lista.sort(function (a, b) { return a.end_id.localeCompare(b.end_id); });
  }

  // ---- Card: varredura + cadastro em lote ----
  function buildScanCard(ctx, opts) {
    var data = ctx.data, app = ctx.app;
    var headers = opts.headers || {};
    var options = opts.options || {};

    var card = U.h('div', { class: 'tmg-card p-5 mb-5' });
    card.appendChild(U.h('h3', { class: 'text-base font-bold mb-1', text: '🔍 Sites sem cadastro (classificados como "Outros")' }));
    card.appendChild(U.h('p', { class: 'text-xs mb-3', style: { color: 'var(--tmg-muted)' }, text: 'Busca tarefas e incidentes ativos sem região cadastrada. Marque os que quer cadastrar, preencha D/E/F e cadastre em lote.' }));

    // Selects D, E, F compartilhados para o cadastro em lote
    var selD = selectDinamico('scan-sel-d', options.D, 'tmg-select');
    var selE = selectDinamico('scan-sel-e', options.E, 'tmg-select');
    var selF = selectDinamico('scan-sel-f', options.F, 'tmg-select');

    var resultWrap = U.h('div', { class: 'mt-3' });
    var statusTxt = U.h('span', { class: 'text-xs', style: { color: 'var(--tmg-muted)' } });
    var btnBuscar = U.h('button', {
      class: 'tmg-btn tmg-btn-primary clickable', text: '🔍 Buscar sites sem cadastro',
      onclick: function () { renderResultado(); }
    });
    card.appendChild(U.h('div', { class: 'flex items-center gap-2 flex-wrap' }, [btnBuscar, statusTxt]));
    card.appendChild(resultWrap);

    var checkboxes = [];

    function renderResultado() {
      var lista = coletarSemCadastro(data);
      resultWrap.innerHTML = '';
      checkboxes = [];
      if (!lista.length) {
        statusTxt.textContent = '';
        resultWrap.appendChild(U.h('div', { class: 'text-sm py-6 text-center', style: { color: 'var(--tmg-green)' }, text: '✓ Nenhum site sem cadastro encontrado — tudo classificado!' }));
        return;
      }
      statusTxt.textContent = lista.length + ' site(s) sem cadastro encontrado(s)';

      // Barra de ferramentas com os selects D/E/F
      var colsDEF = U.h('div', { class: 'flex flex-wrap items-center gap-2 flex-1' }, [
        U.h('div', null, [
          U.h('div', { class: 'text-xs mb-1', style: { color: 'var(--tmg-muted)' }, text: headers.D || 'Coluna D' }),
          selD
        ]),
        U.h('div', null, [
          U.h('div', { class: 'text-xs mb-1', style: { color: 'var(--tmg-muted)' }, text: headers.E || 'Coluna E' }),
          selE
        ]),
        U.h('div', null, [
          U.h('div', { class: 'text-xs mb-1', style: { color: 'var(--tmg-muted)' }, text: headers.F || 'Coluna F' }),
          selF
        ])
      ]);
      var toolbar = U.h('div', { class: 'flex items-start gap-3 flex-wrap mt-3 mb-3 p-3 tmg-card', style: { borderRadius: '10px' } }, [
        U.h('div', { class: 'flex flex-col gap-2' }, [
          U.h('button', { class: 'tmg-btn tmg-btn-ghost clickable', style: { fontSize: '12px' }, text: 'Marcar todos', onclick: function () { checkboxes.forEach(function (c) { c.cb.checked = true; }); atualizarContagem(); } }),
          U.h('button', { class: 'tmg-btn tmg-btn-ghost clickable', style: { fontSize: '12px' }, text: 'Desmarcar todos', onclick: function () { checkboxes.forEach(function (c) { c.cb.checked = false; }); atualizarContagem(); } })
        ]),
        colsDEF
      ]);
      resultWrap.appendChild(toolbar);

      var thSt = { textAlign: 'left', padding: '7px 9px', fontSize: '11px', color: 'var(--tmg-muted)', borderBottom: '1px solid var(--tmg-border)', textTransform: 'uppercase' };
      var tdSt = { padding: '7px 9px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,.05)' };
      var head = U.h('tr', null, ['', 'Cidade', 'END_ID', 'Site', 'Origem'].map(function (t) { return U.h('th', { style: thSt, text: t }); }));
      var body = lista.map(function (item) {
        var cb = U.h('input', { type: 'checkbox' });
        checkboxes.push({ item: item, cb: cb });
        cb.addEventListener('change', atualizarContagem);
        return U.h('tr', null, [
          U.h('td', { style: tdSt }, cb),
          U.h('td', { style: tdSt, text: item.cidade || '—' }),
          U.h('td', { style: Object.assign({ fontFamily: 'ui-monospace, monospace' }, tdSt), text: item.end_id }),
          U.h('td', { style: tdSt, text: item.site || '—' }),
          U.h('td', { style: tdSt, text: item.origem })
        ]);
      });
      resultWrap.appendChild(U.h('div', { style: { maxHeight: '360px', overflow: 'auto' } }, [
        U.h('table', { style: { width: '100%', borderCollapse: 'collapse' } }, [U.h('thead', null, [head]), U.h('tbody', null, body)])
      ]));

      var btnCad = U.h('button', {
        class: 'tmg-btn tmg-btn-primary clickable', text: 'Cadastrar selecionados (0)',
        style: { marginTop: '12px' }, disabled: true,
        onclick: async function () {
          var sel = checkboxes.filter(function (c) { return c.cb.checked; }).map(function (c) { return c.item; });
          if (!sel.length) return;
          btnCad.disabled = true;
          var ok = 0, falhas = 0;
          for (var i = 0; i < sel.length; i++) {
            var it = sel[i];
            try {
              await TMG.api.saveSite({
                cidade: it.cidade || '',
                end_id: it.end_id,
                site: it.site || '',
                colD: selD.value,
                colE: selE.value,
                colF: selF.value
              });
              ok++;
            } catch (e) { falhas++; }
          }
          U.toast(ok + ' site(s) cadastrado(s)' + (falhas ? ' · ' + falhas + ' falha(s)' : '') + '.', falhas ? 'err' : 'ok');
          if (app && app.refresh) await app.refresh(true);
          if (app && app.render) app.render();
        }
      });
      resultWrap.appendChild(btnCad);

      function atualizarContagem() {
        var n = checkboxes.filter(function (c) { return c.cb.checked; }).length;
        btnCad.textContent = 'Cadastrar selecionados (' + n + ')';
        btnCad.disabled = n === 0;
      }
    }

    return card;
  }

  // bloco label + campo
  function campo(labelTxt, inputEl, full) {
    return U.h('div', { class: full ? 'col-span-2' : '' }, [
      U.h('label', { class: 'text-xs font-bold block mb-1', style: { color: 'var(--tmg-muted)' }, text: labelTxt }),
      inputEl
    ]);
  }

  // ---- Card: pesquisa por END_ID para edição em lote ----
  function buildEditCard(args) {
    var ctx = args.ctx, opts = args.opts;
    var headers = (opts && opts.headers) || {};
    var options = (opts && opts.options) || {};
    var app = ctx.app;

    var card = U.h('div', { class: 'tmg-card p-5 mb-5' });
    card.appendChild(U.h('h3', { class: 'text-base font-bold mb-1', text: '✏️ Editar por END_ID' }));
    card.appendChild(U.h('p', { class: 'text-xs mb-3', style: { color: 'var(--tmg-muted)' }, text: 'Busque um END_ID para editar todas as linhas correspondentes na planilha de uma vez.' }));

    var inBusca = U.h('input', { class: 'tmg-input', style: { width: '220px' }, placeholder: 'Ex.: MGBHO_001' });
    var btnBuscar = U.h('button', { class: 'tmg-btn tmg-btn-primary clickable', text: '🔍 Buscar' });
    var statusMsg = U.h('span', { class: 'text-xs', style: { color: 'var(--tmg-muted)' } });
    card.appendChild(U.h('div', { class: 'flex items-center gap-2 flex-wrap mb-3' }, [inBusca, btnBuscar, statusMsg]));

    var formWrap = U.h('div');
    card.appendChild(formWrap);

    var endIdBuscado = '';

    async function executarBusca() {
      var key = (inBusca.value || '').trim();
      if (!key) { statusMsg.textContent = 'Digite um END_ID.'; statusMsg.style.color = 'var(--tmg-red, #e74c3c)'; return; }
      statusMsg.textContent = 'Buscando...'; statusMsg.style.color = 'var(--tmg-muted)';
      formWrap.innerHTML = '';
      try {
        var res = await TMG.api.searchSite(key);
        var rows = (res && res.rows) || [];
        if (!rows.length) { statusMsg.textContent = 'Nenhum site encontrado com esse END_ID.'; statusMsg.style.color = 'var(--tmg-red, #e74c3c)'; return; }
        endIdBuscado = key;
        statusMsg.textContent = rows.length + ' linha(s) encontrada(s) — edite os campos e salve.';
        statusMsg.style.color = 'var(--tmg-green, #2ecc71)';
        var first = rows[0];
        var inCid  = U.h('input', { class: 'tmg-input w-full', value: first.cidade || '' });
        var inEndD = U.h('input', { class: 'tmg-input w-full', value: first.end_id || key, disabled: true });
        var inSite = U.h('input', { class: 'tmg-input w-full', value: first.site || '' });
        var selD   = selectDinamico('edit-sel-d', options.D);
        var selE   = selectDinamico('edit-sel-e', options.E);
        var selF   = selectDinamico('edit-sel-f', options.F);
        if (first.colD) selD.value = first.colD;
        if (first.colE) selE.value = first.colE;
        if (first.colF) selF.value = first.colF;
        var msgEdit = U.h('div', { class: 'text-sm mt-1', style: { minHeight: '20px' } });
        var btnSalvar = U.h('button', { class: 'tmg-btn tmg-btn-primary clickable', text: 'Salvar alterações',
          onclick: async function () {
            var row = { cidade: (inCid.value || '').trim(), site: (inSite.value || '').trim(), colD: selD.value, colE: selE.value, colF: selF.value };
            btnSalvar.disabled = true;
            try {
              var upRes = await TMG.api.updateSite(endIdBuscado, row);
              msgEdit.textContent = (upRes.updated || rows.length) + ' linha(s) atualizada(s).';
              msgEdit.style.color = 'var(--tmg-green, #2ecc71)';
              U.toast('Site(s) atualizado(s) com sucesso.', 'ok');
            } catch (e) {
              msgEdit.textContent = e.message || 'Erro ao salvar.';
              msgEdit.style.color = 'var(--tmg-red, #e74c3c)';
            } finally { btnSalvar.disabled = false; }
          }
        });
        var btnCancelar = U.h('button', { class: 'tmg-btn tmg-btn-ghost clickable', text: 'Cancelar',
          onclick: function () { formWrap.innerHTML = ''; inBusca.value = ''; statusMsg.textContent = ''; endIdBuscado = ''; }
        });
        var grid = U.h('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4 mt-2' }, [
          campo('CIDADE', inCid), campo('END_ID', inEndD),
          campo('SITE', inSite, true),
          campo(headers.D || 'Coluna D', selD), campo(headers.E || 'Coluna E', selE), campo(headers.F || 'Coluna F', selF)
        ]);
        formWrap.appendChild(grid);
        formWrap.appendChild(U.h('div', { class: 'flex gap-2 flex-wrap mt-4' }, [btnSalvar, btnCancelar]));
        formWrap.appendChild(msgEdit);
      } catch (e) {
        statusMsg.textContent = e.message || 'Erro ao buscar.';
        statusMsg.style.color = 'var(--tmg-red, #e74c3c)';
      }
    }

    btnBuscar.addEventListener('click', executarBusca);
    inBusca.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') executarBusca(); });
    return card;
  }

  TMG.pages.cadastro = async function (container, ctx) {
    container.appendChild(U.pageHeader('Cadastro de Cidades',
      'Gerencie os sites encontrados sem região no VALID_CAD.'));

    // Mostra um spinner enquanto carrega as opções do backend
    var loadingEl = U.h('div', { class: 'tmg-card p-6 mb-5 text-sm', style: { color: 'var(--tmg-muted)' }, text: '⏳ Carregando opções do banco de dados...' });
    container.appendChild(loadingEl);

    var opts = await carregarOpcoes();
    loadingEl.remove();

    container.appendChild(buildScanCard(ctx, opts));

    // ---- Card: pesquisa por END_ID para edição ----
    container.appendChild(buildEditCard({ ctx: ctx, opts: opts }));

    // ---- Formulário de cadastro manual ----
    var headers = opts.headers || {};
    var options = opts.options || {};

    var inCidade = U.h('input', { class: 'tmg-input w-full', placeholder: 'Ex.: Rio de Janeiro' });
    var inEndId  = U.h('input', { class: 'tmg-input w-full', placeholder: 'Ex.: RJCEN_001' });
    var inSite   = U.h('input', { class: 'tmg-input w-full', placeholder: 'Nome / identificação do site' });
    var selD     = selectDinamico('form-sel-d', options.D);
    var selE     = selectDinamico('form-sel-e', options.E);
    var selF     = selectDinamico('form-sel-f', options.F);

    var msg = U.h('div', { class: 'text-sm mt-1', style: { color: 'var(--tmg-muted)', minHeight: '20px' } });

    var btnSalvar = U.h('button', { class: 'tmg-btn tmg-btn-primary clickable', text: 'Salvar',
      onclick: async function () {
        var row = {
          cidade: (inCidade.value || '').trim(),
          end_id: (inEndId.value || '').trim(),
          site: (inSite.value || '').trim(),
          colD: selD.value,
          colE: selE.value,
          colF: selF.value
        };
        if (!row.end_id && !row.site && !row.cidade) {
          msg.textContent = 'Preencha ao menos Cidade, END_ID ou Site.';
          msg.style.color = 'var(--tmg-red, #e74c3c)'; return;
        }
        btnSalvar.disabled = true;
        try {
          await TMG.api.saveSite(row);
          msg.textContent = 'Site salvo com sucesso.';
          msg.style.color = 'var(--tmg-green, #2ecc71)';
          U.toast('Site cadastrado.', 'ok');
          inCidade.value = ''; inEndId.value = ''; inSite.value = '';
          selD.selectedIndex = 0; selE.selectedIndex = 0; selF.selectedIndex = 0;
          msg.textContent = '';
        } catch (e) {
          msg.textContent = e && e.message ? e.message : 'Erro ao salvar o site.';
          msg.style.color = 'var(--tmg-red, #e74c3c)';
          U.toast('Erro ao salvar o site.', 'err');
        } finally { btnSalvar.disabled = false; }
      }
    });
    var btnLimpar = U.h('button', { class: 'tmg-btn tmg-btn-ghost clickable', text: 'Limpar',
      onclick: function () { inCidade.value = ''; inEndId.value = ''; inSite.value = ''; selD.selectedIndex = 0; selE.selectedIndex = 0; selF.selectedIndex = 0; msg.textContent = ''; }
    });

    var form = U.h('div', { class: 'tmg-card p-5 mb-5' }, [
      U.h('h3', { class: 'text-base font-bold mb-3', text: 'Cadastro manual' }),
      U.h('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' }, [
        campo('CIDADE', inCidade),
        campo('END_ID', inEndId),
        campo('SITE', inSite, true),
        campo(headers.D || 'Coluna D', selD),
        campo(headers.E || 'Coluna E', selE),
        campo(headers.F || 'Coluna F', selF)
      ]),
      U.h('div', { class: 'flex gap-2 flex-wrap mt-4' }, [btnSalvar, btnLimpar]),
      msg
    ]);
    container.appendChild(form);
  };
})(window.TMG = window.TMG || {});
