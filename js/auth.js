/* =====================================================================
 * auth.js  —  AUTENTICAÇÃO (sessão no navegador)
 * ---------------------------------------------------------------------
 * Guarda o token e os dados do usuário no localStorage do navegador.
 * O login real é validado pelo Apps Script contra a aba USUARIOS.
 * ===================================================================== */
(function (TMG) {
  var KEY_TOKEN = 'tmg_token';
  var KEY_USER = 'tmg_user';
  var Au = {};

  Au.getToken = function () {
    try { return localStorage.getItem(KEY_TOKEN) || ''; } catch (e) { return ''; }
  };
  Au.getUser = function () {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); } catch (e) { return null; }
  };
  Au.isLogged = function () { return !!Au.getToken(); };

  Au.login = async function (email, pwd) {
    var res = await TMG.api.login(email, pwd);
    if (!res || !res.token) throw new Error('Login inválido.');
    try {
      localStorage.setItem(KEY_TOKEN, res.token);
      localStorage.setItem(KEY_USER, JSON.stringify(res.user || { email: email }));
    } catch (e) {}
    return res.user;
  };

  Au.logout = function () {
    try { localStorage.removeItem(KEY_TOKEN); localStorage.removeItem(KEY_USER); } catch (e) {}
  };

  TMG.auth = Au;
})(window.TMG = window.TMG || {});
