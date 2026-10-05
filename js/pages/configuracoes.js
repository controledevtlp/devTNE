/* Página: Configurações (prazos de SLA) */
(function (TNE) {
  TNE.pages = TNE.pages || {};
  var U = TNE.ui, C = TNE.constants;

  TNE.pages.configuracoes = function (container, ctx) {
    var data = ctx.data, app = ctx.app;
    container.appendChild(U.pageHeader('Configurações', 'Prazos de SLA por prioridade (em horas)'));

    var inputs = {};
    var rows = C.PRIORIDADES.map(function (p) {
      var val = (data && data.prazoMap && data.prazoMap[p]) != null ? data.prazoMap[p] : C.SLA_PADRAO_HORAS[p];
      var inp = U.h('input', { class: 'tne-input', type: 'number', min: '0', step: '0.5', value: val, style: { width: '120px' } });
      inputs[p] = inp;
      return U.h('div', { class: 'flex items-center gap-4' }, [
        U.h('label', { class: 'font-semibold', style: { width: '60px', color: 'var(--tne-primary)' }, text: p }),
        inp, U.h('span', { class: 'text-sm', style: { color: 'var(--tne-muted)' }, text: 'horas' })
      ]);
    });

    var btn = U.h('button', { class: 'tne-btn tne-btn-primary', text: 'Salvar prazos', onclick: async function () {
      var cfg = {};
      C.PRIORIDADES.forEach(function (p) { cfg['sla_' + p] = String(inputs[p].value || C.SLA_PADRAO_HORAS[p]); });
      try {
        U.loading(true);
        await TNE.api.setConfig(cfg);
        U.toast('Prazos salvos. Recarregando dados...', 'ok');
        await app.loadAll();
        app.render();
      } catch (e) { U.toast(e.message || 'Erro ao salvar.', 'err'); }
      finally { U.loading(false); }
    } });

    container.appendChild(U.h('div', { class: 'tne-card p-6 flex flex-col gap-4', style: { maxWidth: '460px' } }, rows.concat([U.h('div', { class: 'pt-2' }, btn)])));

    container.appendChild(U.h('div', { class: 'tne-card p-4 mt-4 text-sm', style: { maxWidth: '640px', color: 'var(--tne-muted)' } }, [
      U.h('p', { html: '<b style="color:var(--tne-fg)">Como funciona:</b> os prazos definem o vencimento do SLA quando a plataforma não informa uma data específica. Após salvar, o cálculo é refeito automaticamente.' })
    ]));
  };
})(window.TNE = window.TNE || {});
