/* =====================================================================
 * config.js  —  CONFIGURAÇÃO DO SITE TNE
 * ---------------------------------------------------------------------
 * Planilha Google Sheets do TNE:
 *   (cole o link da planilha TNE aqui)
 *
 * Passos para colocar no ar:
 *   1. Abra a planilha TNE
 *   2. Extensões > Apps Script > cole o conteúdo de TNE_apps_script.gs
 *   3. Execute configurarTudo() uma vez para criar as abas
 *   4. Implantar > Novo implante > App da Web > acesso "Qualquer pessoa"
 *   5. Copie a URL gerada (termina em /exec) e cole em APPS_SCRIPT_URL abaixo
 * ===================================================================== */
(function (TNE) {
  TNE.config = {
    // >>>>>>>>>>>>>>  COLE A URL DO SEU APPS SCRIPT AQUI (termina em /exec)  <<<<<<<<<<<<<<
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwSPcNv-9o5xNf__chQquuhIGJyn2ff4BNYb8iPCnS2rOq2GClb3sfRrY2_j9JX8mgoOA/exec",

    // Referência da planilha (apenas documentação — não é usada pelo sistema)
    SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/1BANEy-_Us1FunUFlHYv7mmbdo331qqGB3jvsUAtPPww/edit",

    // Nome exibido no topo
    APP_NAME: "CONTROLE TNE",
    APP_SUB: "Operacional",

    // Intervalo de auto-atualização do dashboard (segundos). 0 = desligado.
    AUTO_REFRESH_SEG: 0
  };
})(window.TNE = window.TNE || {});
