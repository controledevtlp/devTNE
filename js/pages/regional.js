/* Página: Visão Regional */
(function (TNE) {
  TNE.pages = TNE.pages || {};
  var U = TNE.ui, C = TNE.constants, Comp = TNE.compute;

  TNE.pages.regional = function (container, ctx) {
    var data = ctx.data, app = ctx.app;
    if (!data) { container.appendChild(U.h('div', { class: 'tne-card p-6', text: 'Sem dados.' })); return; }
    var d = Comp.regionalPage(data.tasksEnriched);

    container.appendChild(U.pageHeader('Visão Regional', 'Backlog e aderência por região — clique em qualquer métrica para detalhar'));

    var grid = U.h('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' }, d.resumo.map(function (r) {
      var cor = r.aderencia >= 90 ? C.CORES_TNE.green : r.aderencia >= 70 ? C.CORES_TNE.orange : C.CORES_TNE.red;

      // barra de aderência — visual, não só número
      var barraFundo = U.h('div', { style: { background: 'rgba(255,255,255,.07)', borderRadius: '999px', height: '7px', overflow: 'hidden', marginTop: '4px' } });
      var barraFill = U.h('div', { style: { width: Math.min(100, Math.max(0, r.aderencia)) + '%', height: '100%', borderRadius: '999px', background: cor, boxShadow: '0 0 8px ' + cor, transition: 'width .4s ease' } });
      barraFundo.appendChild(barraFill);

      var card = U.h('div', { class: 'tne-card tne-kpi p-5', style: { position: 'relative' } }, [
        U.h('div', { style: { position: 'absolute', top: '0', left: '0', right: '0', height: '3px', background: cor, borderRadius: '14px 14px 0 0' } }),
        U.h('div', { class: 'flex items-center justify-between mb-1' }, [
          U.h('h3', { class: 'font-bold tne-heading', style: { color: 'var(--tne-primary)', fontSize: '16px' }, text: r.label }),
          U.h('span', { class: 'tne-badge', style: { color: cor, background: U.hexToRgba(cor, .15), fontWeight: '700' }, text: r.aderencia + '% aderência' })
        ]),
        barraFundo,
        U.h('div', { class: 'grid grid-cols-2 gap-2 mt-4' }, [
          metricTile('📋', 'Total', U.fmtNum(r.total), C.CORES_TNE.blue, function () { app.openDrillTasks({ tipo: 'regiaoTotal', arg: r.regiao }, {}, 'Total: ' + r.label); }),
          metricTile('🗂', 'Backlog', U.fmtNum(r.backlog), C.CORES_TNE.orange, function () { app.openDrillTasks({ tipo: 'regiaoBacklog', arg: r.regiao }, {}, 'Backlog: ' + r.label); }),
          metricTile('✅', 'Dentro SLA', U.fmtNum(r.dentroSla), C.CORES_TNE.green, function () { app.openDrillTasks({ tipo: 'regiaoSla', arg: r.regiao + '|dentro' }, {}, 'Dentro SLA: ' + r.label); }),
          metricTile('⛔', 'Fora SLA', U.fmtNum(r.foraSla), C.CORES_TNE.red, function () { app.openDrillTasks({ tipo: 'regiaoSla', arg: r.regiao + '|fora' }, {}, 'Fora SLA: ' + r.label); })
        ])
      ]);
      return card;
    }));
    container.appendChild(grid);
  };

  function metricTile(icone, label, value, cor, onClick) {
    var box = TNE.ui.h('div', { class: 'tne-metric-tile' }, [
      TNE.ui.h('div', { class: 'flex items-center gap-1 text-xs', style: { color: 'var(--tne-muted)' } }, [
        TNE.ui.h('span', { class: 'ic', text: icone }),
        TNE.ui.h('span', { text: label })
      ]),
      TNE.ui.h('div', { class: 'font-bold text-lg mt-1', style: { color: cor || 'var(--tne-fg)' }, text: value })
    ]);
    if (onClick) box.addEventListener('click', onClick);
    return box;
  }
})(window.TNE = window.TNE || {});
