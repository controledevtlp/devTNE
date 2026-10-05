/* Logica de dominio TNE (adaptado do controle-operacional TNE) */
(function (TNE) {
  var C = TNE.constants;
  var D = {};

  function up(s) { return (s == null ? '' : s).toString().toUpperCase().trim(); }
  function normalize(s) {
    return (s == null ? '' : s).toString()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toUpperCase().replace(/\s+/g, ' ').trim();
  }

  // ===================== CORREÇÃO DE ACENTOS BAGUNÇADOS (mojibake) =====================
  // O painel de origem às vezes entrega texto corrompido tipo "IntervenûÏûÈo"
  // em vez de "Intervenção". Isso é texto UTF-8 que foi mal-lido como a
  // codificação "HP Roman-8" (um charset antigo de impressoras/terminais HP)
  // em algum ponto da cadeia de origem. A correção é o caminho inverso:
  // reinterpreta cada caractere como um byte HP Roman-8 e decodifica o
  // resultado como UTF-8. Se o texto já estiver correto, o passo de
  // decodificação falha (não é uma sequência UTF-8 válida) e devolvemos o
  // texto original sem alterar nada — por isso é seguro aplicar sempre.
  var HP_ROMAN8_CHAR_TO_BYTE = {
    'À': 161, 'Â': 162, 'È': 163, 'Ê': 164, 'Ë': 165, 'Î': 166, 'Ï': 167, '´': 168, 'ˋ': 169, 'ˆ': 170,
    '¨': 171, '˜': 172, 'Ù': 173, 'Û': 174, '₤': 175, '¯': 176, 'Ý': 177, 'ý': 178, '°': 179, 'Ç': 180,
    'ç': 181, 'Ñ': 182, 'ñ': 183, '¡': 184, '¿': 185, '¤': 186, '£': 187, '¥': 188, '§': 189, 'ƒ': 190,
    '¢': 191, 'â': 192, 'ê': 193, 'ô': 194, 'û': 195, 'á': 196, 'é': 197, 'ó': 198, 'ú': 199, 'à': 200,
    'è': 201, 'ò': 202, 'ù': 203, 'ä': 204, 'ë': 205, 'ö': 206, 'ü': 207, 'Å': 208, 'î': 209, 'Ø': 210,
    'Æ': 211, 'å': 212, 'í': 213, 'ø': 214, 'æ': 215, 'Ä': 216, 'ì': 217, 'Ö': 218, 'Ü': 219, 'É': 220,
    'ï': 221, 'ß': 222, 'Ô': 223, 'Á': 224, 'Ã': 225, 'ã': 226, 'Ð': 227, 'ð': 228, 'Í': 229, 'Ì': 230,
    'Ó': 231, 'Ò': 232, 'Õ': 233, 'õ': 234, 'Š': 235, 'š': 236, 'Ú': 237, 'Ÿ': 238, 'ÿ': 239, 'Þ': 240,
    'þ': 241, '·': 242, 'µ': 243, '¶': 244, '¾': 245, '—': 246, '¼': 247, '½': 248, 'ª': 249, 'º': 250,
    '«': 251, '■': 252, '»': 253, '±': 254
  };
  var CP1253_CHAR_TO_BYTE = {
    '΅': 161, 'Ά': 162, '£': 163, '¤': 164, '¥': 165, '¦': 166, '§': 167, '¨': 168, '©': 169, '«': 171,
    '¬': 172, '­': 173, '®': 174, '―': 175, '°': 176, '±': 177, '²': 178, '³': 179, '΄': 180, 'µ': 181,
    '¶': 182, '·': 183, 'Έ': 184, 'Ή': 185, 'Ί': 186, '»': 187, 'Ό': 188, '½': 189, 'Ύ': 190, 'Ώ': 191,
    'ΐ': 192, 'Α': 193, 'Β': 194, 'Γ': 195, 'Δ': 196, 'Ε': 197, 'Ζ': 198, 'Η': 199, 'Θ': 200, 'Ι': 201,
    'Κ': 202, 'Λ': 203, 'Μ': 204, 'Ν': 205, 'Ξ': 206, 'Ο': 207, 'Π': 208, 'Ρ': 209, 'Σ': 211, 'Τ': 212,
    'Υ': 213, 'Φ': 214, 'Χ': 215, 'Ψ': 216, 'Ω': 217, 'Ϊ': 218, 'Ϋ': 219, 'ά': 220, 'έ': 221, 'ή': 222,
    'ί': 223, 'ΰ': 224, 'α': 225, 'β': 226, 'γ': 227, 'δ': 228, 'ε': 229, 'ζ': 230, 'η': 231, 'θ': 232,
    'ι': 233, 'κ': 234, 'λ': 235, 'μ': 236, 'ν': 237, 'ξ': 238, 'ο': 239, 'π': 240, 'ρ': 241, 'ς': 242,
    'σ': 243, 'τ': 244, 'υ': 245, 'φ': 246, 'χ': 247, 'ψ': 248, 'ω': 249, 'ϊ': 250, 'ϋ': 251, 'ό': 252,
    'ύ': 253, 'ώ': 254
  };

  // Mapeamento ISO-8859-10 → caractere UTF-8 correto.
  // Quando a Genesis page serve UTF-8 mas o browser interpreta os bytes de
  // continuação (0xA0-0xBF) usando ISO-8859-10 em vez de Latin-1, os
  // caracteres acentuados do português ficam corrompidos com este padrão:
  //   á (UTF-8: C3 A1) → "Ã" + "Ą" (U+0104, porque 0xA1 em ISO-8859-10 = Ą)
  //   ã (UTF-8: C3 A3) → "Ã" + "Ģ" (U+0122, porque 0xA3 em ISO-8859-10 = Ģ)
  //   ç (UTF-8: C3 A7) → "Ã" + "§" (U+00A7, § é igual em ISO-8859-10 e Latin-1)
  //   é (UTF-8: C3 A9) → "Ã" + "Đ" (U+0110, porque 0xA9 em ISO-8859-10 = Đ)
  // Mapeamento ISO-8859-2 → char UTF-8 correto (trigger = Ă U+0102).
  // O Genesis está a servir UTF-8 mas o browser interpreta 0xC3 como Ă (ISO-8859-2)
  // em vez de Ã (Latin-1/ISO-8859-10). Por isso "á" aparece como "ĂĄ", "ã" como "ĂŁ", etc.
  var ISO8859_2_C3_MAP = {
    // C1 range (0x80-0x9F) → maiúsculas acentuadas
    '\u0080':'À','\u0081':'Á','\u0082':'Â','\u0083':'Ã','\u0084':'Ä','\u0085':'Å',
    '\u0086':'Æ','\u0087':'Ç','\u0088':'È','\u0089':'É','\u008A':'Ê','\u008B':'Ë',
    '\u008C':'Ì','\u008D':'Í','\u008E':'Î','\u008F':'Ï','\u0090':'Ð','\u0091':'Ñ',
    '\u0092':'Ò','\u0093':'Ó','\u0094':'Ô','\u0095':'Õ','\u0096':'Ö','\u0097':'×',
    '\u0098':'Ø','\u0099':'Ù','\u009A':'Ú','\u009B':'Û','\u009C':'Ü','\u009D':'Ý',
    '\u009E':'Þ','\u009F':'ß',
    // 0xA0-0xBF → minúsculas e outros acentuados (mapeamento ISO-8859-2)
    '\u00A0':'à',  // 0xA0 NBSP   → à
    '\u0104':'á',  // 0xA1 Ą     → á
    '\u02D8':'â',  // 0xA2 ˘     → â
    '\u0141':'ã',  // 0xA3 Ł     → ã  ← chave: Ł ≠ Ģ (ISO-8859-10)
    '\u00A4':'ä',  // 0xA4 ¤     → ä
    '\u013D':'å',  // 0xA5 Ľ     → å
    '\u015A':'æ',  // 0xA6 Ś     → æ
    '\u00A7':'ç',  // 0xA7 §     → ç  (igual em ambos codecs)
    '\u00A8':'è',  // 0xA8 ¨     → è
    '\u0160':'é',  // 0xA9 Š     → é  ← chave: Š ≠ Đ (ISO-8859-10)
    '\u015E':'ê',  // 0xAA Ş     → ê
    '\u0164':'ë',  // 0xAB Ť     → ë
    '\u0179':'ì',  // 0xAC Ź     → ì
    '\u00AD':'í',  // 0xAD soft  → í  (igual)
    '\u017D':'î',  // 0xAE Ž     → î
    '\u017B':'ï',  // 0xAF Ż     → ï
    '\u00B0':'ð',  // 0xB0 °     → ð  (igual)
    '\u0105':'ñ',  // 0xB1 ą     → ñ  (igual)
    '\u02DB':'ò',  // 0xB2 ˛     → ò
    '\u0142':'ó',  // 0xB3 ł     → ó  ← chave: ł ≠ ģ (ISO-8859-10)
    '\u00B4':'ô',  // 0xB4 ´     → ô
    '\u013E':'õ',  // 0xB5 ľ     → õ
    '\u015B':'ö',  // 0xB6 ś     → ö
    '\u02C7':'÷',  // 0xB7 ˇ     → ÷
    '\u00B8':'ø',  // 0xB8 ¸     → ø
    '\u0161':'ù',  // 0xB9 š     → ù
    '\u015F':'ú',  // 0xBA ş     → ú
    '\u0165':'û',  // 0xBB ť     → û
    '\u017A':'ü',  // 0xBC ź     → ü
    '\u02DD':'ý',  // 0xBD ˝     → ý
    '\u017E':'þ',  // 0xBE ž     → þ  (igual)
    '\u017C':'ÿ'   // 0xBF ż     → ÿ
  };

  var ISO8859_10_C3_MAP = {
    // Range C1 (0x80-0x9F) — maiúsculas acentuadas (Á,Â,Ã,Ç,É,Ó,Ú,Ü,etc.)
    // UTF-8 [0xC3, 0x8X] lido como 'Ã' + char-controle U+008X/U+009X
    '\u0080': 'À',  // U+00C0
    '\u0081': 'Á',  // U+00C1
    '\u0082': 'Â',  // U+00C2
    '\u0083': 'Ã',  // U+00C3
    '\u0084': 'Ä',  // U+00C4
    '\u0085': 'Å',  // U+00C5
    '\u0086': 'Æ',  // U+00C6
    '\u0087': 'Ç',  // U+00C7
    '\u0088': 'È',  // U+00C8
    '\u0089': 'É',  // U+00C9
    '\u008A': 'Ê',  // U+00CA
    '\u008B': 'Ë',  // U+00CB
    '\u008C': 'Ì',  // U+00CC
    '\u008D': 'Í',  // U+00CD
    '\u008E': 'Î',  // U+00CE
    '\u008F': 'Ï',  // U+00CF
    '\u0090': 'Ð',  // U+00D0
    '\u0091': 'Ñ',  // U+00D1
    '\u0092': 'Ò',  // U+00D2
    '\u0093': 'Ó',  // U+00D3
    '\u0094': 'Ô',  // U+00D4
    '\u0095': 'Õ',  // U+00D5
    '\u0096': 'Ö',  // U+00D6
    '\u0097': '×',  // U+00D7
    '\u0098': 'Ø',  // U+00D8
    '\u0099': 'Ù',  // U+00D9
    '\u009A': 'Ú',  // U+00DA ← "Última" estava quebrando aqui
    '\u009B': 'Û',  // U+00DB
    '\u009C': 'Ü',  // U+00DC
    '\u009D': 'Ý',  // U+00DD
    '\u009E': 'Þ',  // U+00DE
    '\u009F': 'ß',  // U+00DF
    // Range 0xA0-0xBF — minúsculas/outros acentuados via ISO-8859-10
    '\u00A0': 'à',  // 0xA0 NBSP  → à
    '\u0104': 'á',  // 0xA1 Ą    → á
    '\u0112': 'â',  // 0xA2 Ē    → â
    '\u0122': 'ã',  // 0xA3 Ģ    → ã
    '\u012A': 'ä',  // 0xA4 Ī    → ä
    '\u0128': 'å',  // 0xA5 Ĩ    → å
    '\u0136': 'æ',  // 0xA6 Ķ    → æ
    '\u00A7': 'ç',  // 0xA7 §    → ç
    '\u013B': 'è',  // 0xA8 Ļ    → è
    '\u0110': 'é',  // 0xA9 Đ    → é
    '\u0160': 'ê',  // 0xAA Š    → ê
    '\u0166': 'ë',  // 0xAB Ŧ    → ë
    '\u017D': 'ì',  // 0xAC Ž    → ì
    '\u00AD': 'í',  // 0xAD soft hyphen → í
    '\u016A': 'î',  // 0xAE Ū    → î
    '\u014A': 'ï',  // 0xAF Ŋ    → ï
    '\u00B0': 'ð',  // 0xB0 °    → ð
    '\u0105': 'ñ',  // 0xB1 ą    → ñ
    '\u0113': 'ò',  // 0xB2 ē    → ò
    '\u0123': 'ó',  // 0xB3 ģ    → ó
    '\u012B': 'ô',  // 0xB4 ī    → ô
    '\u0129': 'õ',  // 0xB5 ĩ    → õ
    '\u0137': 'ö',  // 0xB6 ķ    → ö
    '\u013C': 'ø',  // 0xB8 ļ    → ø
    '\u0111': 'ù',  // 0xB9 đ    → ù
    '\u0161': 'ú',  // 0xBA š    → ú
    '\u0167': 'û',  // 0xBB ŧ    → û
    '\u017E': 'ü',  // 0xBC ž    → ü
    '\u2015': 'ý',  // 0xBD ―   → ý
    '\u016B': 'þ',  // 0xBE ū    → þ
    '\u014B': 'ÿ'   // 0xBF ŋ    → ÿ
  };

  var _decoderUtf8Strict = (typeof TextDecoder !== 'undefined') ? new TextDecoder('utf-8', { fatal: true }) : null;

  function corrigirAcentos(texto) {
    if (!texto || typeof texto !== 'string') return texto;

    // 1ª tentativa: ISO-8859-2 (trigger = Ă U+0102) — padrão atual do Genesis
    if (texto.indexOf('\u0102') >= 0) {
      var hasIso2 = false;
      for (var i2 = 0; i2 < texto.length - 1; i2++) {
        if (texto[i2] === '\u0102' && ISO8859_2_C3_MAP[texto[i2 + 1]] !== undefined) {
          hasIso2 = true; break;
        }
      }
      if (hasIso2) {
        return texto.replace(/\u0102(.)/g, function (m, c) {
          return ISO8859_2_C3_MAP[c] !== undefined ? ISO8859_2_C3_MAP[c] : m;
        });
      }
    }

    // 2ª tentativa: ISO-8859-10 (trigger = Ã U+00C3) — padrão anterior do Genesis
    if (texto.indexOf('Ã') >= 0) {
      var hasIso10 = false;
      for (var ci = 0; ci < texto.length - 1; ci++) {
        if (texto[ci] === 'Ã' && ISO8859_10_C3_MAP[texto[ci + 1]] !== undefined) {
          hasIso10 = true; break;
        }
      }
      if (hasIso10) {
        return texto.replace(/Ã(.)/g, function(m, c) {
          return ISO8859_10_C3_MAP[c] !== undefined ? ISO8859_10_C3_MAP[c] : m;
        });
      }
    }

    if (!_decoderUtf8Strict) return texto;

    // 3ª tentativa: UTF-8 lido como Latin-1 simples (0xC2/0xC3 + byte < 0xFF)
    var temMojibake = false;
    for (var mi = 0; mi < texto.length - 1; mi++) {
      var mc = texto.charCodeAt(mi);
      if ((mc === 0xC2 || mc === 0xC3) && texto.charCodeAt(mi + 1) >= 0x80 && texto.charCodeAt(mi + 1) <= 0xBF) {
        temMojibake = true; break;
      }
    }
    if (temMojibake) {
      var bytes = []; var todoLatin1 = true;
      for (var li = 0; li < texto.length; li++) {
        var lc = texto.charCodeAt(li);
        if (lc > 0xFF) { todoLatin1 = false; break; }
        bytes.push(lc);
      }
      if (todoLatin1) {
        try { return _decoderUtf8Strict.decode(new Uint8Array(bytes)); }
        catch (e) { /* não é UTF-8 válido */ }
      }
    }

    // 4ª tentativa: HP Roman-8
    // IMPORTANTE: inclui passthrough de C1 (0x80-0x9F) — quando o byte HP
    // Roman-8 original é 0xC3 (→'û') seguido de 0x89 (C1 control), o par
    // forma UTF-8 [0xC3,0x89] = 'É'. Sem o passthrough, tentarTabela
    // retornaria null ao encontrar chr(0x89) fora da tabela, e o texto
    // permaneceria corrompido (ex.: "TûC." em vez de "TÉC.").
    function tentarTabela(t, tabela, c1passthrough) {
      var bs = [], k, cod, b;
      for (k = 0; k < t.length; k++) {
        cod = t.charCodeAt(k);
        if (cod < 0x80) { bs.push(cod); continue; }
        if (c1passthrough && cod >= 0x80 && cod <= 0x9F) { bs.push(cod); continue; }
        b = tabela[t[k]];
        if (b == null) return null;
        bs.push(b);
      }
      try { return _decoderUtf8Strict.decode(new Uint8Array(bs)); }
      catch (e) { return null; }
    }
    var r1 = tentarTabela(texto, HP_ROMAN8_CHAR_TO_BYTE, true);  // c1passthrough=true
    if (r1 != null) return r1;

    // 5ª tentativa: CP1253 (Windows-1253 / Grego)
    var r2 = tentarTabela(texto, CP1253_CHAR_TO_BYTE, false);
    if (r2 != null) return r2;

    return texto;
  }
  D.corrigirAcentos = corrigirAcentos;

  // ===================== REGIAO (region.ts) — adaptado para TNE =====================
  // Regiao = estado (PE, PB, CE, RN, PI, SE, AL, BA) extraído da "Nova área" (TNE-XX-...)

  // Lookup por nome de cidade (fonte: VALID_CAD da planilha TNE — 1521 cidades)
  var CIDADE_PARA_REGIAO = {
    "ANADIA": "AL",
    "ARAPIRACA": "AL",
    "ATALAIA": "AL",
    "BARRA DE SANTO ANTONIO": "AL",
    "BELO MONTE": "AL",
    "BOCA DA MATA": "AL",
    "BRANQUINHA": "AL",
    "CACIMBINHAS": "AL",
    "CAJUEIRO": "AL",
    "CAMPESTRE": "AL",
    "CAMPO ALEGRE": "AL",
    "CAMPO GRANDE": "AL",
    "CANAPI": "AL",
    "CAPELA": "AL",
    "CARNEIROS": "AL",
    "CHA PRETA": "AL",
    "COITE DO NOIA": "AL",
    "COLONIA LEOPOLDINA": "AL",
    "COQUEIRO SECO": "AL",
    "CORURIPE": "AL",
    "CRAIBAS": "AL",
    "DELMIRO GOUVEIA": "AL",
    "DOIS RIACHOS": "AL",
    "ESTRELA DE ALAGOAS": "AL",
    "FEIRA GRANDE": "AL",
    "FELIZ DESERTO": "AL",
    "FLEXEIRAS": "AL",
    "GIRAU DO PONCIANO": "AL",
    "IBATEGUARA": "AL",
    "IGACI": "AL",
    "IGREJA NOVA": "AL",
    "INHAPI": "AL",
    "JACARE DOS HOMENS": "AL",
    "JACUIPE": "AL",
    "JAPARATINGA": "AL",
    "JARAMATAIA": "AL",
    "JEQUIA DA PRAIA": "AL",
    "JOAQUIM GOMES": "AL",
    "JUNQUEIRO": "AL",
    "LAGOA DA CANOA": "AL",
    "LIMOEIRO DE ANADIA": "AL",
    "MACEIO": "AL",
    "MAJOR ISIDORO": "AL",
    "MAR VERMELHO": "AL",
    "MARAGOGI": "AL",
    "MARAVILHA": "AL",
    "MARECHAL DEODORO": "AL",
    "MARIBONDO": "AL",
    "MATA GRANDE": "AL",
    "MATRIZ DE CAMARAGIBE": "AL",
    "MESSIAS": "AL",
    "MINADOR DO NEGRAO": "AL",
    "MONTEIROPOLIS": "AL",
    "MURICI": "AL",
    "NOVO LINO": "AL",
    "OLHO D'AGUA DAS FLORES": "AL",
    "OLHO D'AGUA DO CASADO": "AL",
    "OLHO D'AGUA GRANDE": "AL",
    "OLIVENCA": "AL",
    "PALESTINA": "AL",
    "PALMEIRA DOS INDIOS": "AL",
    "PAO DE ACUCAR": "AL",
    "PARICONHA": "AL",
    "PARIPUEIRA": "AL",
    "PASSO DE CAMARAGIBE": "AL",
    "PAULO JACINTO": "AL",
    "PENEDO": "AL",
    "PIACABUCU": "AL",
    "PINDOBA": "AL",
    "PIRANHAS": "AL",
    "POCO DAS TRINCHEIRAS": "AL",
    "PORTO CALVO": "AL",
    "PORTO DE PEDRAS": "AL",
    "PORTO REAL DO COLEGIO": "AL",
    "QUEBRANGULO": "AL",
    "RIO LARGO": "AL",
    "ROTEIRO": "AL",
    "SANTA LUZIA DO NORTE": "AL",
    "SANTANA DO IPANEMA": "AL",
    "SANTANA DO MUNDAU": "AL",
    "SAO BRAS": "AL",
    "SAO JOSE DA LAJE": "AL",
    "SAO JOSE DA TAPERA": "AL",
    "SAO LUIS DO QUITUNDE": "AL",
    "SAO MIGUEL DOS CAMPOS": "AL",
    "SAO MIGUEL DOS MILAGRES": "AL",
    "SAO SEBASTIAO": "AL",
    "SATUBA": "AL",
    "SENADOR RUI PALMEIRA": "AL",
    "TANQUE D'ARCA": "AL",
    "TAQUARANA": "AL",
    "TEOTONIO VILELA": "AL",
    "TRAIPU": "AL",
    "UNIAO DOS PALMARES": "AL",
    "ABAIRA": "BA",
    "ABARE": "BA",
    "ACAJUTIBA": "BA",
    "ADUSTINA": "BA",
    "AGUA FRIA": "BA",
    "AIQUARA": "BA",
    "ALAGOINHAS": "BA",
    "ALCOBACA": "BA",
    "ALMADINA": "BA",
    "AMARGOSA": "BA",
    "AMELIA RODRIGUES": "BA",
    "AMERICA DOURADA": "BA",
    "ANAGE": "BA",
    "ANDARAI": "BA",
    "ANDORINHA": "BA",
    "ANGICAL": "BA",
    "ANGUERA": "BA",
    "ANTARI": "BA",
    "ANTAS": "BA",
    "ANTONIO CARDOSO": "BA",
    "ANTONIO GONCALVES": "BA",
    "APORA": "BA",
    "APUAREMA": "BA",
    "ARACAS": "BA",
    "ARACATU": "BA",
    "ARACI": "BA",
    "ARAMARI": "BA",
    "ARATACA": "BA",
    "ARATUIPE": "BA",
    "AURELINO LEAL": "BA",
    "BAIANOPOLIS": "BA",
    "BAIXA GRANDE": "BA",
    "BANZAE": "BA",
    "BARRA": "BA",
    "BARRA DA ESTIVA": "BA",
    "BARRA DO CHOCA": "BA",
    "BARRA DO MENDES": "BA",
    "BARRA DO ROCHA": "BA",
    "BARREIRAS": "BA",
    "BARRO ALTO": "BA",
    "BARRO PRETO": "BA",
    "BARROCAS": "BA",
    "BELMONTE": "BA",
    "BELO CAMPO": "BA",
    "BIRITINGA": "BA",
    "BOA NOVA": "BA",
    "BOA VISTA DO TUPIM": "BA",
    "BOM JESUS DA LAPA": "BA",
    "BOM JESUS DA SERRA": "BA",
    "BONINAL": "BA",
    "BONITO": "BA",
    "BOQUIRA": "BA",
    "BOTUPORA": "BA",
    "BREJOES": "BA",
    "BREJOLANDIA": "BA",
    "BROTAS DE MACAUBAS": "BA",
    "BRUMADO": "BA",
    "BUERAREMA": "BA",
    "BURITIRAMA": "BA",
    "CAATIBA": "BA",
    "CABACEIRAS DO PARAGUACU": "BA",
    "CACHOEIRA": "BA",
    "CACULE": "BA",
    "CAEM": "BA",
    "CAETANOS": "BA",
    "CAETITE": "BA",
    "CAFARNAUM": "BA",
    "CAIRU": "BA",
    "CALDEIRAO GRANDE": "BA",
    "CAMACAN": "BA",
    "CAMACARI": "BA",
    "CAMAMU": "BA",
    "CAMPO ALEGRE DE LOURDES": "BA",
    "CAMPO FORMOSO": "BA",
    "CANAPOLIS": "BA",
    "CANARANA": "BA",
    "CANAVIEIRAS": "BA",
    "CANDEAL": "BA",
    "CANDEIAS": "BA",
    "CANDIBA": "BA",
    "CANDIDO SALES": "BA",
    "CANSANCAO": "BA",
    "CANUDOS": "BA",
    "CAPELA DO ALTO ALEGRE": "BA",
    "CAPIM GROSSO": "BA",
    "CARAIBAS": "BA",
    "CARAVELAS": "BA",
    "CARDEAL DA SILVA": "BA",
    "CARINHANHA": "BA",
    "CASA NOVA": "BA",
    "CASTRO ALVES": "BA",
    "CATOLANDIA": "BA",
    "CATU": "BA",
    "CATURAMA": "BA",
    "CENTRAL": "BA",
    "CHORROCHO": "BA",
    "CICERO DANTAS": "BA",
    "CIPO": "BA",
    "COARACI": "BA",
    "COCOS": "BA",
    "CONCEICAO DA FEIRA": "BA",
    "CONCEICAO DO ALMEIDA": "BA",
    "CONCEICAO DO COITE": "BA",
    "CONCEICAO DO JACUIPE": "BA",
    "CONDEUBA": "BA",
    "CONTENDAS DO SINCORA": "BA",
    "CORACAO DE MARIA": "BA",
    "CORDEIROS": "BA",
    "CORIBE": "BA",
    "CORONEL JOAO SA": "BA",
    "CORRENTINA": "BA",
    "COTEGIPE": "BA",
    "CRAVOLANDIA": "BA",
    "CRISOPOLIS": "BA",
    "CRISTOPOLIS": "BA",
    "CRUZ DAS ALMAS": "BA",
    "CURACA": "BA",
    "DARIO MEIRA": "BA",
    "DIAS D'AVILA": "BA",
    "DOM BASILIO": "BA",
    "DOM MACEDO COSTA": "BA",
    "ELISIO MEDRADO": "BA",
    "ENCRUZILHADA": "BA",
    "ENTRE RIOS": "BA",
    "ERICO CARDOSO": "BA",
    "ESPLANADA": "BA",
    "EUCLIDES DA CUNHA": "BA",
    "EUNAPOLIS": "BA",
    "FATIMA": "BA",
    "FEIRA DA MATA": "BA",
    "FEIRA DE SANTANA": "BA",
    "FILADELFIA": "BA",
    "FIRMINO ALVES": "BA",
    "FLORESTA AZUL": "BA",
    "FORMOSA DO RIO PRETO": "BA",
    "GANDU": "BA",
    "GAVIAO": "BA",
    "GENTIO DO OURO": "BA",
    "GLORIA": "BA",
    "GONGOGI": "BA",
    "GOVERNADOR MANGABEIRA": "BA",
    "GUAJERU": "BA",
    "GUANAMBI": "BA",
    "GUARATINGA": "BA",
    "HELIOPOLIS": "BA",
    "IACU": "BA",
    "IBIASSUCE": "BA",
    "IBICARAI": "BA",
    "IBICOARA": "BA",
    "IBICUI": "BA",
    "IBIPEBA": "BA",
    "IBIPITANGA": "BA",
    "IBIQUERA": "BA",
    "IBIRAPITANGA": "BA",
    "IBIRAPUA": "BA",
    "IBIRATAIA": "BA",
    "IBITIARA": "BA",
    "IBITITA": "BA",
    "IBOTIRAMA": "BA",
    "ICHU": "BA",
    "IGAPORA": "BA",
    "IGRAPIUNA": "BA",
    "IGUAI": "BA",
    "ILHEUS": "BA",
    "INHAMBUPE": "BA",
    "IPECAETA": "BA",
    "IPIAU": "BA",
    "IPIRA": "BA",
    "IPUPIARA": "BA",
    "IRAJUBA": "BA",
    "IRAMAIA": "BA",
    "IRAQUARA": "BA",
    "IRARA": "BA",
    "IRECE": "BA",
    "ITABELA": "BA",
    "ITABERABA": "BA",
    "ITABUNA": "BA",
    "ITACARE": "BA",
    "ITAETE": "BA",
    "ITAGI": "BA",
    "ITAGIBA": "BA",
    "ITAGIMIRIM": "BA",
    "ITAGUACU DA BAHIA": "BA",
    "ITAJU DO COLONIA": "BA",
    "ITAJUIPE": "BA",
    "ITAMARAJU": "BA",
    "ITAMARI": "BA",
    "ITANAGRA": "BA",
    "ITANHEM": "BA",
    "ITAPARICA": "BA",
    "ITAPE": "BA",
    "ITAPEBI": "BA",
    "ITAPETINGA": "BA",
    "ITAPICURU": "BA",
    "ITAPITANGA": "BA",
    "ITAQUARA": "BA",
    "ITARANTIM": "BA",
    "ITATIM": "BA",
    "ITIRUCU": "BA",
    "ITIUBA": "BA",
    "ITORORO": "BA",
    "ITUACU": "BA",
    "ITUBERA": "BA",
    "IUIU": "BA",
    "JABORANDI": "BA",
    "JACARACI": "BA",
    "JACOBINA": "BA",
    "JAGUAQUARA": "BA",
    "JAGUARARI": "BA",
    "JAGUARIPE": "BA",
    "JANDAIRA": "BA",
    "JEQUIE": "BA",
    "JEQUIRICA": "BA",
    "JEREMOABO": "BA",
    "JITAUNA": "BA",
    "JOAO DOURADO": "BA",
    "JUAZEIRO": "BA",
    "JUCURUCU": "BA",
    "JUSSARA": "BA",
    "JUSSARI": "BA",
    "JUSSIAPE": "BA",
    "LAFAIETE COUTINHO": "BA",
    "LAGOA REAL": "BA",
    "LAJE": "BA",
    "LAJEDAO": "BA",
    "LAJEDINHO": "BA",
    "LAJEDO DO TABOCAL": "BA",
    "LAMARAO": "BA",
    "LAPAO": "BA",
    "LAURO DE FREITAS": "BA",
    "LENCOIS": "BA",
    "LICINIO DE ALMEIDA": "BA",
    "LIVRAMENTO DE NOSSA SENHORA": "BA",
    "LUIS EDUARDO MAGALHAES": "BA",
    "MACAJUBA": "BA",
    "MACARANI": "BA",
    "MACAUBAS": "BA",
    "MACURURE": "BA",
    "MADRE DE DEUS": "BA",
    "MAETINGA": "BA",
    "MAIQUINIQUE": "BA",
    "MAIRI": "BA",
    "MALHADA": "BA",
    "MALHADA DE PEDRAS": "BA",
    "MANOEL VITORINO": "BA",
    "MANSIDAO": "BA",
    "MARACAS": "BA",
    "MARAGOGIPE": "BA",
    "MARAU": "BA",
    "MARCIONILIO SOUZA": "BA",
    "MASCOTE": "BA",
    "MATA DE SAO JOAO": "BA",
    "MATINA": "BA",
    "MEDEIROS NETO": "BA",
    "MIGUEL CALMON": "BA",
    "MILAGRES": "BA",
    "MIRANGABA": "BA",
    "MIRANTE": "BA",
    "MONTE SANTO": "BA",
    "MORPARA": "BA",
    "MORRO DO CHAPEU": "BA",
    "MORTUGABA": "BA",
    "MUCUGE": "BA",
    "MUCURI": "BA",
    "MULUNGU DO MORRO": "BA",
    "MUNDO NOVO": "BA",
    "MUNIZ FERREIRA": "BA",
    "MUQUEM DE SAO FRANCISCO": "BA",
    "MURITIBA": "BA",
    "MUTUIPE": "BA",
    "NAZARE": "BA",
    "NILO PECANHA": "BA",
    "NORDESTINA": "BA",
    "NOVA CANAA": "BA",
    "NOVA FATIMA": "BA",
    "NOVA IBIA": "BA",
    "NOVA ITARANA": "BA",
    "NOVA REDENCAO": "BA",
    "NOVA SOURE": "BA",
    "NOVA VICOSA": "BA",
    "NOVO HORIZONTE": "BA",
    "NOVO TRIUNFO": "BA",
    "OLINDINA": "BA",
    "OLIVEIRA DOS BREJINHOS": "BA",
    "OURICANGAS": "BA",
    "OUROLANDIA": "BA",
    "PALMAS DE MONTE ALTO": "BA",
    "PALMEIRAS": "BA",
    "PARAMIRIM": "BA",
    "PARATINGA": "BA",
    "PARIPIRANGA": "BA",
    "PAU BRASIL": "BA",
    "PAULO AFONSO": "BA",
    "PE DE SERRA": "BA",
    "PEDRAO": "BA",
    "PEDRO ALEXANDRE": "BA",
    "PIATA": "BA",
    "PILAO ARCADO": "BA",
    "PINDAI": "BA",
    "PINDOBACU": "BA",
    "PINTADAS": "BA",
    "PIRAI DO NORTE": "BA",
    "PIRIPA": "BA",
    "PIRITIBA": "BA",
    "PLANALTINO": "BA",
    "PLANALTO": "BA",
    "POCOES": "BA",
    "POJUCA": "BA",
    "PONTO NOVO": "BA",
    "PORTO SEGURO": "BA",
    "POTIRAGUA": "BA",
    "PRADO": "BA",
    "PRESIDENTE DUTRA": "BA",
    "PRESIDENTE JANIO QUADROS": "BA",
    "PRESIDENTE TANCREDO NEVES": "BA",
    "QUIJINGUE": "BA",
    "QUIXABEIRA": "BA",
    "RAFAEL JAMBEIRO": "BA",
    "REMANSO": "BA",
    "RETIROLANDIA": "BA",
    "RIACHAO DAS NEVES": "BA",
    "RIACHAO DO JACUIPE": "BA",
    "RIACHO DE SANTANA": "BA",
    "RIBEIRA DO AMPARO": "BA",
    "RIBEIRA DO POMBAL": "BA",
    "RIBEIRAO DO LARGO": "BA",
    "RIO DE CONTAS": "BA",
    "RIO DO ANTONIO": "BA",
    "RIO DO PIRES": "BA",
    "RIO REAL": "BA",
    "RODELAS": "BA",
    "RUY BARBOSA": "BA",
    "SALINAS DA MARGARIDA": "BA",
    "SALVADOR": "BA",
    "SANTA BARBARA": "BA",
    "SANTA BRIGIDA": "BA",
    "SANTA CRUZ CABRALIA": "BA",
    "SANTA CRUZ DA VITORIA": "BA",
    "SANTA MARIA DA VITORIA": "BA",
    "SANTA RITA DE CASSIA": "BA",
    "SANTA TEREZINHA": "BA",
    "SANTALUZ": "BA",
    "SANTANA": "BA",
    "SANTANOPOLIS": "BA",
    "SANTO AMARO": "BA",
    "SANTO ANTONIO DE JESUS": "BA",
    "SANTO ESTEVAO": "BA",
    "SAO DESIDERIO": "BA",
    "SAO FELIPE": "BA",
    "SAO FELIX": "BA",
    "SAO FELIX DO CORIBE": "BA",
    "SAO FRANCISCO DO CONDE": "BA",
    "SAO GABRIEL": "BA",
    "SAO GONCALO DOS CAMPOS": "BA",
    "SAO JOSE DA VITORIA": "BA",
    "SAO JOSE DO JACUIPE": "BA",
    "SAO MIGUEL DAS MATAS": "BA",
    "SAO SEBASTIAO DO PASSE": "BA",
    "SAPEACU": "BA",
    "SATIRO DIAS": "BA",
    "SAUBARA": "BA",
    "SAUDE": "BA",
    "SEABRA": "BA",
    "SEBASTIAO LARANJEIRAS": "BA",
    "SENHOR DO BONFIM": "BA",
    "SENTO SE": "BA",
    "SERRA DO RAMALHO": "BA",
    "SERRA DOURADA": "BA",
    "SERRA PRETA": "BA",
    "SERRINHA": "BA",
    "SERROLANDIA": "BA",
    "SIMOES FILHO": "BA",
    "SITIO DO MATO": "BA",
    "SITIO DO QUINTO": "BA",
    "SOBRADINHO": "BA",
    "SOUTO SOARES": "BA",
    "TABOCAS DO BREJO VELHO": "BA",
    "TANHACU": "BA",
    "TANQUE NOVO": "BA",
    "TANQUINHO": "BA",
    "TAPIRAMUTA": "BA",
    "TEIXEIRA DE FREITAS": "BA",
    "TEODORO SAMPAIO": "BA",
    "TEOFILANDIA": "BA",
    "TEOLANDIA": "BA",
    "TERRA NOVA": "BA",
    "TREMEDAL": "BA",
    "TUCANO": "BA",
    "UAUA": "BA",
    "UBAIRA": "BA",
    "UBAITABA": "BA",
    "UBATA": "BA",
    "UIBAI": "BA",
    "UMBURANAS": "BA",
    "UNA": "BA",
    "URANDI": "BA",
    "URUCUCA": "BA",
    "UTINGA": "BA",
    "VALENCA": "BA",
    "VALENTE": "BA",
    "VARZEA DA ROCA": "BA",
    "VARZEA DO POCO": "BA",
    "VARZEA NOVA": "BA",
    "VARZEDO": "BA",
    "VERA CRUZ": "BA",
    "VEREDA": "BA",
    "VITORIA DA CONQUISTA": "BA",
    "WAGNER": "BA",
    "WANDERLEY": "BA",
    "WENCESLAU GUIMARAES": "BA",
    "XIQUE-XIQUE": "BA",
    "ABAIARA": "CE",
    "ACARAPE": "CE",
    "ACARAU": "CE",
    "ACOPIARA": "CE",
    "AIUABA": "CE",
    "ALCANTARAS": "CE",
    "ALTANEIRA": "CE",
    "ALTO SANTO": "CE",
    "AMONTADA": "CE",
    "ANTONINA DO NORTE": "CE",
    "APUIARES": "CE",
    "AQUIRAZ": "CE",
    "ARACATI": "CE",
    "ARARENDA": "CE",
    "ARARIPE": "CE",
    "ARATUBA": "CE",
    "ARNEIROZ": "CE",
    "ASSARE": "CE",
    "AURORA": "CE",
    "BAIXIO": "CE",
    "BANABUIU": "CE",
    "BARBALHA": "CE",
    "BARREIRA": "CE",
    "BARRO": "CE",
    "BARROQUINHA": "CE",
    "BATURITE": "CE",
    "BEBERIBE": "CE",
    "BELA CRUZ": "CE",
    "BOA VIAGEM": "CE",
    "BREJO SANTO": "CE",
    "CAMOCIM": "CE",
    "CAMPOS SALES": "CE",
    "CANINDE": "CE",
    "CAPISTRANO": "CE",
    "CARIDADE": "CE",
    "CARIRE": "CE",
    "CARIRIACU": "CE",
    "CARIUS": "CE",
    "CARNAUBAL": "CE",
    "CASCAVEL": "CE",
    "CATARINA": "CE",
    "CATUNDA": "CE",
    "CAUCAIA": "CE",
    "CHAVAL": "CE",
    "CHORO": "CE",
    "CHOROZINHO": "CE",
    "COREAU": "CE",
    "CRATEUS": "CE",
    "CRATO": "CE",
    "CROATA": "CE",
    "CRUZ": "CE",
    "DEPUTADO IRAPUAN PINHEIRO": "CE",
    "ERERE": "CE",
    "EUSEBIO": "CE",
    "FARIAS BRITO": "CE",
    "FORQUILHA": "CE",
    "FORTALEZA": "CE",
    "FORTIM": "CE",
    "FRECHEIRINHA": "CE",
    "GENERAL SAMPAIO": "CE",
    "GRACA": "CE",
    "GRANJA": "CE",
    "GRANJEIRO": "CE",
    "GROAIRAS": "CE",
    "GUAIUBA": "CE",
    "GUARACIABA DO NORTE": "CE",
    "GUARAMIRANGA": "CE",
    "HIDROLANDIA": "CE",
    "HORIZONTE": "CE",
    "IBARETAMA": "CE",
    "IBIAPINA": "CE",
    "IBICUITINGA": "CE",
    "ICAPUI": "CE",
    "ICO": "CE",
    "IGUATU": "CE",
    "INDEPENDENCIA": "CE",
    "IPAPORANGA": "CE",
    "IPAUMIRIM": "CE",
    "IPU": "CE",
    "IPUEIRAS": "CE",
    "IRACEMA": "CE",
    "IRAUCUBA": "CE",
    "ITAICABA": "CE",
    "ITAITINGA": "CE",
    "ITAPAJE": "CE",
    "ITAPIPOCA": "CE",
    "ITAPIUNA": "CE",
    "ITAREMA": "CE",
    "ITATIRA": "CE",
    "JAGUARETAMA": "CE",
    "JAGUARIBARA": "CE",
    "JAGUARIBE": "CE",
    "JAGUARUANA": "CE",
    "JARDIM": "CE",
    "JATI": "CE",
    "JIJOCA DE JERICOACOARA": "CE",
    "JUAZEIRO DO NORTE": "CE",
    "JUCAS": "CE",
    "LAVRAS DA MANGABEIRA": "CE",
    "LIMOEIRO DO NORTE": "CE",
    "MADALENA": "CE",
    "MARACANAU": "CE",
    "MARANGUAPE": "CE",
    "MARCO": "CE",
    "MARTINOPOLE": "CE",
    "MASSAPE": "CE",
    "MAURITI": "CE",
    "MERUOCA": "CE",
    "MILHA": "CE",
    "MIRAIMA": "CE",
    "MISSAO VELHA": "CE",
    "MOMBACA": "CE",
    "MONSENHOR TABOSA": "CE",
    "MORADA NOVA": "CE",
    "MORAUJO": "CE",
    "MORRINHOS": "CE",
    "MUCAMBO": "CE",
    "NOVA RUSSAS": "CE",
    "NOVO ORIENTE": "CE",
    "OCARA": "CE",
    "OROS": "CE",
    "PACAJUS": "CE",
    "PACOTI": "CE",
    "PACUJA": "CE",
    "PALHANO": "CE",
    "PALMACIA": "CE",
    "PARACURU": "CE",
    "PARAIPABA": "CE",
    "PARAMBU": "CE",
    "PARAMOTI": "CE",
    "PENAFORTE": "CE",
    "PENTECOSTE": "CE",
    "PEREIRO": "CE",
    "PINDORETAMA": "CE",
    "PIQUET CARNEIRO": "CE",
    "PIRES FERREIRA": "CE",
    "PORANGA": "CE",
    "PORTEIRAS": "CE",
    "POTENGI": "CE",
    "POTIRETAMA": "CE",
    "QUITERIANOPOLIS": "CE",
    "QUIXADA": "CE",
    "QUIXELO": "CE",
    "QUIXERAMOBIM": "CE",
    "QUIXERE": "CE",
    "REDENCAO": "CE",
    "RERIUTABA": "CE",
    "RUSSAS": "CE",
    "SABOEIRO": "CE",
    "SALITRE": "CE",
    "SANTA QUITERIA": "CE",
    "SANTANA DO ACARAU": "CE",
    "SANTANA DO CARIRI": "CE",
    "SAO BENEDITO": "CE",
    "SAO JOAO DO JAGUARIBE": "CE",
    "SAO LUIS DO CURU": "CE",
    "SENADOR POMPEU": "CE",
    "SENADOR SA": "CE",
    "SOBRAL": "CE",
    "SOLONOPOLE": "CE",
    "SUMARE": "CE",
    "TABULEIRO DO NORTE": "CE",
    "TAMBORIL": "CE",
    "TARRAFAS": "CE",
    "TAUA": "CE",
    "TEJUCUOCA": "CE",
    "TIANGUA": "CE",
    "TRAIRI": "CE",
    "TURURU": "CE",
    "UBAJARA": "CE",
    "UMARI": "CE",
    "UMIRIM": "CE",
    "URUBURETAMA": "CE",
    "URUOCA": "CE",
    "VARJOTA": "CE",
    "VARZEA ALEGRE": "CE",
    "VICOSA DO CEARA": "CE",
    "AGUA BRANCA": "PB",
    "AGUIAR": "PB",
    "ALAGOA GRANDE": "PB",
    "ALAGOA NOVA": "PB",
    "ALAGOINHA": "PB",
    "ALCANTIL": "PB",
    "ALGODAO DE JANDAIRA": "PB",
    "ALHANDRA": "PB",
    "AMPARO": "PB",
    "APARECIDA": "PB",
    "ARACAGI": "PB",
    "ARARA": "PB",
    "ARARUNA": "PB",
    "AREIA": "PB",
    "AREIA DE BARAUNAS": "PB",
    "AREIAL": "PB",
    "AROEIRAS": "PB",
    "ASSUNCAO": "PB",
    "BAIA DA TRAICAO": "PB",
    "BANANEIRAS": "PB",
    "BARAUNA": "PB",
    "BARRA DE SANTA ROSA": "PB",
    "BARRA DE SANTANA": "PB",
    "BARRA DE SAO MIGUEL": "PB",
    "BAYEUX": "PB",
    "BELEM": "PB",
    "BELEM DO BREJO DO CRUZ": "PB",
    "BERNARDINO BATISTA": "PB",
    "BOA VENTURA": "PB",
    "BOA VISTA": "PB",
    "BOM JESUS": "PB",
    "BOM SUCESSO": "PB",
    "BONITO DE SANTA FE": "PB",
    "BOQUEIRAO": "PB",
    "BORBOREMA": "PB",
    "BREJO DO CRUZ": "PB",
    "BREJO DOS SANTOS": "PB",
    "CAAPORA": "PB",
    "CABACEIRAS": "PB",
    "CABEDELO": "PB",
    "CACHOEIRA DOS INDIOS": "PB",
    "CACIMBA DE AREIA": "PB",
    "CACIMBA DE DENTRO": "PB",
    "CACIMBAS": "PB",
    "CAICARA": "PB",
    "CAJAZEIRAS": "PB",
    "CAJAZEIRINHAS": "PB",
    "CALDAS BRANDAO": "PB",
    "CAMALAU": "PB",
    "CAMPINA GRANDE": "PB",
    "CAMPO DE SANTANA": "PB",
    "CAPIM": "PB",
    "CARAUBAS": "PB",
    "CARRAPATEIRA": "PB",
    "CASSERENGUE": "PB",
    "CATINGUEIRA": "PB",
    "CATOLE DO ROCHA": "PB",
    "CATURITE": "PB",
    "CONCEICAO": "PB",
    "CONDADO": "PB",
    "CONDE": "PB",
    "CONGO": "PB",
    "COREMAS": "PB",
    "COXIXOLA": "PB",
    "CRUZ DO ESPIRITO SANTO": "PB",
    "CUBATI": "PB",
    "CUITE": "PB",
    "CUITE DE MAMANGUAPE": "PB",
    "CUITEGI": "PB",
    "CURRAL DE CIMA": "PB",
    "CURRAL VELHO": "PB",
    "DAMIAO": "PB",
    "DESTERRO": "PB",
    "DIAMANTE": "PB",
    "DONA INES": "PB",
    "DUAS ESTRADAS": "PB",
    "EMAS": "PB",
    "ESPERANCA": "PB",
    "FAGUNDES": "PB",
    "FREI MARTINHO": "PB",
    "GADO BRAVO": "PB",
    "GUARABIRA": "PB",
    "GURINHEM": "PB",
    "GURJAO": "PB",
    "IBIARA": "PB",
    "IGARACY": "PB",
    "IMACULADA": "PB",
    "INGA": "PB",
    "ITABAIANA": "PB",
    "ITAPORANGA": "PB",
    "ITAPOROROCA": "PB",
    "ITATUBA": "PB",
    "JACARAU": "PB",
    "JERICO": "PB",
    "JOAO PESSOA": "PB",
    "JOCA CLAUDINO": "PB",
    "JUAREZ TAVORA": "PB",
    "JUAZEIRINHO": "PB",
    "JUNCO DO SERIDO": "PB",
    "JURIPIRANGA": "PB",
    "JURU": "PB",
    "LAGOA": "PB",
    "LAGOA DE DENTRO": "PB",
    "LAGOA SECA": "PB",
    "LASTRO": "PB",
    "LIVRAMENTO": "PB",
    "LOGRADOURO": "PB",
    "LUCENA": "PB",
    "MAE D'AGUA": "PB",
    "MALTA": "PB",
    "MAMANGUAPE": "PB",
    "MANAIRA": "PB",
    "MARCACAO": "PB",
    "MARI": "PB",
    "MARIZOPOLIS": "PB",
    "MASSARANDUBA": "PB",
    "MATARACA": "PB",
    "MATINHAS": "PB",
    "MATO GROSSO": "PB",
    "MATUREIA": "PB",
    "MOGEIRO": "PB",
    "MONTADAS": "PB",
    "MONTE HOREBE": "PB",
    "MONTEIRO": "PB",
    "MULUNGU": "PB",
    "NATUBA": "PB",
    "NAZAREZINHO": "PB",
    "NOVA FLORESTA": "PB",
    "NOVA OLINDA": "PB",
    "NOVA PALMEIRA": "PB",
    "OLHO D'AGUA": "PB",
    "OLIVEDOS": "PB",
    "OURO VELHO": "PB",
    "PARARI": "PB",
    "PASSAGEM": "PB",
    "PATOS": "PB",
    "PAULISTA": "PB",
    "PEDRA BRANCA": "PB",
    "PEDRA LAVRADA": "PB",
    "PEDRAS DE FOGO": "PB",
    "PEDRO REGIS": "PB",
    "PIANCO": "PB",
    "PICUI": "PB",
    "PILAR": "PB",
    "PILOES": "PB",
    "PILOEZINHOS": "PB",
    "PIRPIRITUBA": "PB",
    "PITIMBU": "PB",
    "POCINHOS": "PB",
    "POCO DANTAS": "PB",
    "POCO DE JOSE DE MOURA": "PB",
    "POMBAL": "PB",
    "PRATA": "PB",
    "PRINCESA ISABEL": "PB",
    "PUXINANA": "PB",
    "QUEIMADAS": "PB",
    "QUIXABA": "PB",
    "REMIGIO": "PB",
    "RIACHAO": "PB",
    "RIACHAO DO BACAMARTE": "PB",
    "RIACHAO DO POCO": "PB",
    "RIACHO DE SANTO ANTONIO": "PB",
    "RIACHO DOS CAVALOS": "PB",
    "RIO TINTO": "PB",
    "SALGADINHO": "PB",
    "SALGADO DE SAO FELIX": "PB",
    "SANTA CECILIA": "PB",
    "SANTA CRUZ": "PB",
    "SANTA HELENA": "PB",
    "SANTA INES": "PB",
    "SANTA LUZIA": "PB",
    "SANTA RITA": "PB",
    "SANTA TERESINHA": "PB",
    "SANTANA DE MANGUEIRA": "PB",
    "SANTANA DOS GARROTES": "PB",
    "SANTO ANDRE": "PB",
    "SAO BENTINHO": "PB",
    "SAO BENTO": "PB",
    "SAO DOMINGOS": "PB",
    "SAO DOMINGOS DO CARIRI": "PB",
    "SAO FRANCISCO": "PB",
    "SAO JOAO DO CARIRI": "PB",
    "SAO JOAO DO RIO DO PEIXE": "PB",
    "SAO JOAO DO TIGRE": "PB",
    "SAO JOSE DA LAGOA TAPADA": "PB",
    "SAO JOSE DE CAIANA": "PB",
    "SAO JOSE DE ESPINHARAS": "PB",
    "SAO JOSE DE PIRANHAS": "PB",
    "SAO JOSE DE PRINCESA": "PB",
    "SAO JOSE DO BONFIM": "PB",
    "SAO JOSE DO BREJO DO CRUZ": "PB",
    "SAO JOSE DO SABUGI": "PB",
    "SAO JOSE DOS CORDEIROS": "PB",
    "SAO JOSE DOS RAMOS": "PB",
    "SAO MAMEDE": "PB",
    "SAO MIGUEL DE TAIPU": "PB",
    "SAO SEBASTIAO DE LAGOA DE ROCA": "PB",
    "SAO SEBASTIAO DO UMBUZEIRO": "PB",
    "SAO VICENTE DO SERIDO": "PB",
    "SAPE": "PB",
    "SERRA BRANCA": "PB",
    "SERRA DA RAIZ": "PB",
    "SERRA GRANDE": "PB",
    "SERRA REDONDA": "PB",
    "SERRARIA": "PB",
    "SERTAOZINHO": "PB",
    "SOBRADO": "PB",
    "SOLANEA": "PB",
    "SOLEDADE": "PB",
    "SOSSEGO": "PB",
    "SOUSA": "PB",
    "SUME": "PB",
    "TAPEROA": "PB",
    "TAVARES": "PB",
    "TEIXEIRA": "PB",
    "TENORIO": "PB",
    "TRIUNFO": "PB",
    "UIRAUNA": "PB",
    "UMBUZEIRO": "PB",
    "VARZEA": "PB",
    "VIEIROPOLIS": "PB",
    "VISTA SERRANA": "PB",
    "ZABELE": "PB",
    "ABREU E LIMA": "PE",
    "AFOGADOS DA INGAZEIRA": "PE",
    "AFRANIO": "PE",
    "AGRESTINA": "PE",
    "AGUA PRETA": "PE",
    "AGUAS BELAS": "PE",
    "ALIANCA": "PE",
    "ALTINHO": "PE",
    "AMARAJI": "PE",
    "ANGELIM": "PE",
    "ARACOIABA": "PE",
    "ARARIPINA": "PE",
    "ARCOVERDE": "PE",
    "BARRA DE GUABIRABA": "PE",
    "BARREIROS": "PE",
    "BELEM DE MARIA": "PE",
    "BELEM DO SAO FRANCISCO": "PE",
    "BELO JARDIM": "PE",
    "BETANIA": "PE",
    "BEZERROS": "PE",
    "BODOCO": "PE",
    "BOM CONSELHO": "PE",
    "BOM JARDIM": "PE",
    "BREJAO": "PE",
    "BREJINHO": "PE",
    "BREJO DA MADRE DE DEUS": "PE",
    "BUENOS AIRES": "PE",
    "BUIQUE": "PE",
    "CABO DE SANTO AGOSTINHO": "PE",
    "CABROBO": "PE",
    "CACHOEIRINHA": "PE",
    "CAETES": "PE",
    "CALCADO": "PE",
    "CALUMBI": "PE",
    "CAMARAGIBE": "PE",
    "CAMOCIM DE SAO FELIX": "PE",
    "CAMUTANGA": "PE",
    "CANHOTINHO": "PE",
    "CAPOEIRAS": "PE",
    "CARNAIBA": "PE",
    "CARNAUBEIRA DA PENHA": "PE",
    "CARPINA": "PE",
    "CARUARU": "PE",
    "CASINHAS": "PE",
    "CATENDE": "PE",
    "CEDRO": "PE",
    "CHA DE ALEGRIA": "PE",
    "CHA GRANDE": "PE",
    "CORRENTES": "PE",
    "CORTES": "PE",
    "CUMARU": "PE",
    "CUPIRA": "PE",
    "CUSTODIA": "PE",
    "DORMENTES": "PE",
    "ESCADA": "PE",
    "EXU": "PE",
    "FEIRA NOVA": "PE",
    "FERNANDO DE NORONHA": "PE",
    "FERREIROS": "PE",
    "FLORES": "PE",
    "FLORESTA": "PE",
    "FREI MIGUELINHO": "PE",
    "GAMELEIRA": "PE",
    "GARANHUNS": "PE",
    "GLORIA DO GOITA": "PE",
    "GOIANA": "PE",
    "GRANITO": "PE",
    "GRAVATA": "PE",
    "IATI": "PE",
    "IBIMIRIM": "PE",
    "IBIRAJUBA": "PE",
    "IGARASSU": "PE",
    "IGUARACI": "PE",
    "ILHA DE ITAMARACA": "PE",
    "INAJA": "PE",
    "INGAZEIRA": "PE",
    "IPOJUCA": "PE",
    "IPUBI": "PE",
    "ITACURUBA": "PE",
    "ITAIBA": "PE",
    "ITAMBE": "PE",
    "ITAPETIM": "PE",
    "ITAPISSUMA": "PE",
    "ITAQUITINGA": "PE",
    "JABOATAO DOS GUARARAPES": "PE",
    "JAQUEIRA": "PE",
    "JATAUBA": "PE",
    "JATOBA": "PE",
    "JOAO ALFREDO": "PE",
    "JOAQUIM NABUCO": "PE",
    "JUCATI": "PE",
    "JUPI": "PE",
    "LAGOA DO CARRO": "PE",
    "LAGOA DO ITAENGA": "PE",
    "LAGOA DO OURO": "PE",
    "LAGOA DOS GATOS": "PE",
    "LAGOA GRANDE": "PE",
    "LAJEDO": "PE",
    "LIMOEIRO": "PE",
    "MACAPARANA": "PE",
    "MACHADOS": "PE",
    "MANARI": "PE",
    "MARAIAL": "PE",
    "MIRANDIBA": "PE",
    "MOREILANDIA": "PE",
    "MORENO": "PE",
    "NAZARE DA MATA": "PE",
    "OLINDA": "PE",
    "OROBO": "PE",
    "OROCO": "PE",
    "OURICURI": "PE",
    "PALMARES": "PE",
    "PALMEIRINA": "PE",
    "PANELAS": "PE",
    "PARANATAMA": "PE",
    "PARNAMIRIM": "PE",
    "PASSIRA": "PE",
    "PAUDALHO": "PE",
    "PEDRA": "PE",
    "PESQUEIRA": "PE",
    "PETROLANDIA": "PE",
    "PETROLINA": "PE",
    "POCAO": "PE",
    "POMBOS": "PE",
    "PRIMAVERA": "PE",
    "QUIPAPA": "PE",
    "RECIFE": "PE",
    "RIACHO DAS ALMAS": "PE",
    "RIBEIRAO": "PE",
    "RIO FORMOSO": "PE",
    "SAIRE": "PE",
    "SALGUEIRO": "PE",
    "SALOA": "PE",
    "SANHARO": "PE",
    "SANTA CRUZ DA BAIXA VERDE": "PE",
    "SANTA CRUZ DO CAPIBARIBE": "PE",
    "SANTA MARIA DA BOA VISTA": "PE",
    "SANTA MARIA DO CAMBUCA": "PE",
    "SAO BENEDITO DO SUL": "PE",
    "SAO BENTO DO UNA": "PE",
    "SAO CAITANO": "PE",
    "SAO JOAO": "PE",
    "SAO JOAQUIM DO MONTE": "PE",
    "SAO JOSE DA COROA GRANDE": "PE",
    "SAO JOSE DO BELMONTE": "PE",
    "SAO JOSE DO EGITO": "PE",
    "SAO LOURENCO DA MATA": "PE",
    "SAO VICENTE FERRER": "PE",
    "SERRA TALHADA": "PE",
    "SERRITA": "PE",
    "SERTANIA": "PE",
    "SIRINHAEM": "PE",
    "SOLIDAO": "PE",
    "SURUBIM": "PE",
    "TABIRA": "PE",
    "TACAIMBO": "PE",
    "TACARATU": "PE",
    "TAMANDARE": "PE",
    "TAQUARITINGA DO NORTE": "PE",
    "TEREZINHA": "PE",
    "TIMBAUBA": "PE",
    "TORITAMA": "PE",
    "TRACUNHAEM": "PE",
    "TRINDADE": "PE",
    "TUPANATINGA": "PE",
    "TUPARETAMA": "PE",
    "VENTUROSA": "PE",
    "VERDEJANTE": "PE",
    "VERTENTE DO LERIO": "PE",
    "VERTENTES": "PE",
    "VICENCIA": "PE",
    "VITORIA DE SANTO ANTAO": "PE",
    "XEXEU": "PE",
    "ACAUA": "PI",
    "AGRICOLANDIA": "PI",
    "ALAGOINHA DO PIAUI": "PI",
    "ALEGRETE DO PIAUI": "PI",
    "ALTO LONGA": "PI",
    "ALTOS": "PI",
    "ALVORADA DO GURGUEIA": "PI",
    "AMARANTE": "PI",
    "ANGICAL DO PIAUI": "PI",
    "ANISIO DE ABREU": "PI",
    "ANTONIO ALMEIDA": "PI",
    "AROAZES": "PI",
    "AROEIRAS DO ITAIM": "PI",
    "ARRAIAL": "PI",
    "ASSUNCAO DO PIAUI": "PI",
    "AVELINO LOPES": "PI",
    "BAIXA GRANDE DO RIBEIRO": "PI",
    "BARRA D'ALCANTARA": "PI",
    "BARRAS": "PI",
    "BARREIRAS DO PIAUI": "PI",
    "BARRO DURO": "PI",
    "BATALHA": "PI",
    "BELA VISTA DO PIAUI": "PI",
    "BELEM DO PIAUI": "PI",
    "BENEDITINOS": "PI",
    "BERTOLINIA": "PI",
    "BETANIA DO PIAUI": "PI",
    "BOA HORA": "PI",
    "BOCAINA": "PI",
    "BOM PRINCIPIO DO PIAUI": "PI",
    "BONFIM DO PIAUI": "PI",
    "BOQUEIRAO DO PIAUI": "PI",
    "BRASILEIRA": "PI",
    "BREJO DO PIAUI": "PI",
    "BURITI DOS LOPES": "PI",
    "BURITI DOS MONTES": "PI",
    "CABECEIRAS DO PIAUI": "PI",
    "CAJAZEIRAS DO PIAUI": "PI",
    "CAJUEIRO DA PRAIA": "PI",
    "CALDEIRAO GRANDE DO PIAUI": "PI",
    "CAMPINAS DO PIAUI": "PI",
    "CAMPO ALEGRE DO FIDALGO": "PI",
    "CAMPO GRANDE DO PIAUI": "PI",
    "CAMPO LARGO DO PIAUI": "PI",
    "CAMPO MAIOR": "PI",
    "CANAVIEIRA": "PI",
    "CANTO DO BURITI": "PI",
    "CAPITAO DE CAMPOS": "PI",
    "CAPITAO GERVASIO OLIVEIRA": "PI",
    "CARACOL": "PI",
    "CARAUBAS DO PIAUI": "PI",
    "CARIDADE DO PIAUI": "PI",
    "CASTELO DO PIAUI": "PI",
    "CAXINGO": "PI",
    "COCAL": "PI",
    "COCAL DE TELHA": "PI",
    "COCAL DOS ALVES": "PI",
    "COIVARAS": "PI",
    "COLONIA DO GURGUEIA": "PI",
    "COLONIA DO PIAUI": "PI",
    "CONCEICAO DO CANINDE": "PI",
    "CORONEL JOSE DIAS": "PI",
    "CORRENTE": "PI",
    "CRISTALANDIA DO PIAUI": "PI",
    "CRISTINO CASTRO": "PI",
    "CURIMATA": "PI",
    "CURRAIS": "PI",
    "CURRAL NOVO DO PIAUI": "PI",
    "CURRALINHOS": "PI",
    "DEMERVAL LOBAO": "PI",
    "DIRCEU ARCOVERDE": "PI",
    "DOM EXPEDITO LOPES": "PI",
    "DOM INOCENCIO": "PI",
    "DOMINGOS MOURAO": "PI",
    "ELESBAO VELOSO": "PI",
    "ELISEU MARTINS": "PI",
    "ESPERANTINA": "PI",
    "FARTURA DO PIAUI": "PI",
    "FLORES DO PIAUI": "PI",
    "FLORESTA DO PIAUI": "PI",
    "FLORIANO": "PI",
    "FRANCINOPOLIS": "PI",
    "FRANCISCO AYRES": "PI",
    "FRANCISCO MACEDO": "PI",
    "FRANCISCO SANTOS": "PI",
    "FRONTEIRAS": "PI",
    "GEMINIANO": "PI",
    "GILBUES": "PI",
    "GUADALUPE": "PI",
    "GUARIBAS": "PI",
    "HUGO NAPOLEAO": "PI",
    "ILHA GRANDE": "PI",
    "INHUMA": "PI",
    "IPIRANGA DO PIAUI": "PI",
    "ISAIAS COELHO": "PI",
    "ITAINOPOLIS": "PI",
    "ITAUEIRA": "PI",
    "JACOBINA DO PIAUI": "PI",
    "JAICOS": "PI",
    "JARDIM DO MULATO": "PI",
    "JATOBA DO PIAUI": "PI",
    "JERUMENHA": "PI",
    "JOAO COSTA": "PI",
    "JOAQUIM PIRES": "PI",
    "JOCA MARQUES": "PI",
    "JOSE DE FREITAS": "PI",
    "JUAZEIRO DO PIAUI": "PI",
    "JULIO BORGES": "PI",
    "JUREMA": "PI",
    "LAGOA ALEGRE": "PI",
    "LAGOA DE SAO FRANCISCO": "PI",
    "LAGOA DO BARRO DO PIAUI": "PI",
    "LAGOA DO PIAUI": "PI",
    "LAGOA DO SITIO": "PI",
    "LAGOINHA DO PIAUI": "PI",
    "LANDRI SALES": "PI",
    "LUIS CORREIA": "PI",
    "LUZILANDIA": "PI",
    "MADEIRO": "PI",
    "MANOEL EMIDIO": "PI",
    "MARCOLANDIA": "PI",
    "MARCOS PARENTE": "PI",
    "MASSAPE DO PIAUI": "PI",
    "MATIAS OLIMPIO": "PI",
    "MIGUEL ALVES": "PI",
    "MIGUEL LEAO": "PI",
    "MILTON BRANDAO": "PI",
    "MONSENHOR GIL": "PI",
    "MONSENHOR HIPOLITO": "PI",
    "MONTE ALEGRE DO PIAUI": "PI",
    "MORRO CABECA NO TEMPO": "PI",
    "MORRO DO CHAPEU DO PIAUI": "PI",
    "MURICI DOS PORTELAS": "PI",
    "NAZARE DO PIAUI": "PI",
    "NAZARIA": "PI",
    "NOSSA SENHORA DE NAZARE": "PI",
    "NOSSA SENHORA DOS REMEDIOS": "PI",
    "NOVA SANTA RITA": "PI",
    "NOVO ORIENTE DO PIAUI": "PI",
    "NOVO SANTO ANTONIO": "PI",
    "OEIRAS": "PI",
    "OLHO D'AGUA DO PIAUI": "PI",
    "PADRE MARCOS": "PI",
    "PAES LANDIM": "PI",
    "PAJEU DO PIAUI": "PI",
    "PALMEIRA DO PIAUI": "PI",
    "PALMEIRAIS": "PI",
    "PAQUETA": "PI",
    "PARNAGUA": "PI",
    "PARNAIBA": "PI",
    "PASSAGEM FRANCA DO PIAUI": "PI",
    "PATOS DO PIAUI": "PI",
    "PAU D'ARCO DO PIAUI": "PI",
    "PAULISTANA": "PI",
    "PAVUSSU": "PI",
    "PEDRO II": "PI",
    "PEDRO LAURENTINO": "PI",
    "PICOS": "PI",
    "PIMENTEIRAS": "PI",
    "PIO IX": "PI",
    "PIRACURUCA": "PI",
    "PIRIPIRI": "PI",
    "PORTO": "PI",
    "PORTO ALEGRE DO PIAUI": "PI",
    "PRATA DO PIAUI": "PI",
    "QUEIMADA NOVA": "PI",
    "REDENCAO DO GURGUEIA": "PI",
    "REGENERACAO": "PI",
    "RIACHO FRIO": "PI",
    "RIBEIRA DO PIAUI": "PI",
    "RIBEIRO GONCALVES": "PI",
    "RIO GRANDE DO PIAUI": "PI",
    "SANTA CRUZ DO PIAUI": "PI",
    "SANTA CRUZ DOS MILAGRES": "PI",
    "SANTA FILOMENA": "PI",
    "SANTA LUZ": "PI",
    "SANTA ROSA DO PIAUI": "PI",
    "SANTANA DO PIAUI": "PI",
    "SANTO ANTONIO DE LISBOA": "PI",
    "SANTO ANTONIO DOS MILAGRES": "PI",
    "SANTO INACIO DO PIAUI": "PI",
    "SAO BRAZ DO PIAUI": "PI",
    "SAO FELIX DO PIAUI": "PI",
    "SAO FRANCISCO DE ASSIS DO PIAUI": "PI",
    "SAO FRANCISCO DO PIAUI": "PI",
    "SAO GONCALO DO GURGUEIA": "PI",
    "SAO GONCALO DO PIAUI": "PI",
    "SAO JOAO DA CANABRAVA": "PI",
    "SAO JOAO DA FRONTEIRA": "PI",
    "SAO JOAO DA SERRA": "PI",
    "SAO JOAO DA VARJOTA": "PI",
    "SAO JOAO DO ARRAIAL": "PI",
    "SAO JOAO DO PIAUI": "PI",
    "SAO JOSE DO DIVINO": "PI",
    "SAO JOSE DO PEIXE": "PI",
    "SAO JOSE DO PIAUI": "PI",
    "SAO JULIAO": "PI",
    "SAO LOURENCO DO PIAUI": "PI",
    "SAO LUIS DO PIAUI": "PI",
    "SAO MIGUEL DA BAIXA GRANDE": "PI",
    "SAO MIGUEL DO FIDALGO": "PI",
    "SAO MIGUEL DO TAPUIO": "PI",
    "SAO PEDRO DO PIAUI": "PI",
    "SAO RAIMUNDO NONATO": "PI",
    "SEBASTIAO BARROS": "PI",
    "SEBASTIAO LEAL": "PI",
    "SIGEFREDO PACHECO": "PI",
    "SIMOES": "PI",
    "SIMPLICIO MENDES": "PI",
    "SOCORRO DO PIAUI": "PI",
    "SUSSUAPARA": "PI",
    "TAMBORIL DO PIAUI": "PI",
    "TANQUE DO PIAUI": "PI",
    "TERESINA": "PI",
    "UNIAO": "PI",
    "URUCUI": "PI",
    "VALENCA DO PIAUI": "PI",
    "VARZEA BRANCA": "PI",
    "VARZEA GRANDE": "PI",
    "VERA MENDES": "PI",
    "VILA NOVA DO PIAUI": "PI",
    "WALL FERRAZ": "PI",
    "ACARI": "RN",
    "ACU": "RN",
    "AFONSO BEZERRA": "RN",
    "AGUA NOVA": "RN",
    "ALEXANDRIA": "RN",
    "ALMINO AFONSO": "RN",
    "ALTO DO RODRIGUES": "RN",
    "ANGICOS": "RN",
    "ANTONIO MARTINS": "RN",
    "APODI": "RN",
    "AREZ": "RN",
    "AUGUSTO SEVERO": "RN",
    "BAIA FORMOSA": "RN",
    "BARCELONA": "RN",
    "BENTO FERNANDES": "RN",
    "BOA SAUDE": "RN",
    "BODO": "RN",
    "CAICARA DO NORTE": "RN",
    "CAICARA DO RIO DO VENTO": "RN",
    "CAICO": "RN",
    "CAMPO REDONDO": "RN",
    "CANGUARETAMA": "RN",
    "CARNAUBA DOS DANTAS": "RN",
    "CARNAUBAIS": "RN",
    "CEARA-MIRIM": "RN",
    "CERRO CORA": "RN",
    "CORONEL EZEQUIEL": "RN",
    "CORONEL JOAO PESSOA": "RN",
    "CRUZETA": "RN",
    "CURRAIS NOVOS": "RN",
    "DOUTOR SEVERIANO": "RN",
    "ENCANTO": "RN",
    "EQUADOR": "RN",
    "ESPIRITO SANTO": "RN",
    "EXTREMOZ": "RN",
    "FELIPE GUERRA": "RN",
    "FERNANDO PEDROZA": "RN",
    "FLORANIA": "RN",
    "FRANCISCO DANTAS": "RN",
    "FRUTUOSO GOMES": "RN",
    "GALINHOS": "RN",
    "GOIANINHA": "RN",
    "GOVERNADOR DIX-SEPT ROSADO": "RN",
    "GROSSOS": "RN",
    "GUAMARE": "RN",
    "IELMO MARINHO": "RN",
    "IPANGUACU": "RN",
    "IPUEIRA": "RN",
    "ITAJA": "RN",
    "ITAU": "RN",
    "JACANA": "RN",
    "JANDUIS": "RN",
    "JAPI": "RN",
    "JARDIM DE ANGICOS": "RN",
    "JARDIM DE PIRANHAS": "RN",
    "JARDIM DO SERIDO": "RN",
    "JOAO CAMARA": "RN",
    "JOAO DIAS": "RN",
    "JOSE DA PENHA": "RN",
    "JUCURUTU": "RN",
    "JUNDIA": "RN",
    "LAGOA D'ANTA": "RN",
    "LAGOA DE PEDRAS": "RN",
    "LAGOA DE VELHOS": "RN",
    "LAGOA NOVA": "RN",
    "LAGOA SALGADA": "RN",
    "LAJES": "RN",
    "LAJES PINTADAS": "RN",
    "LUCRECIA": "RN",
    "LUIS GOMES": "RN",
    "MACAIBA": "RN",
    "MACAU": "RN",
    "MAJOR SALES": "RN",
    "MARCELINO VIEIRA": "RN",
    "MARTINS": "RN",
    "MAXARANGUAPE": "RN",
    "MESSIAS TARGINO": "RN",
    "MONTANHAS": "RN",
    "MONTE ALEGRE": "RN",
    "MONTE DAS GAMELEIRAS": "RN",
    "MOSSORO": "RN",
    "NATAL": "RN",
    "NISIA FLORESTA": "RN",
    "NOVA CRUZ": "RN",
    "OLHO-D'AGUA DO BORGES": "RN",
    "OURO BRANCO": "RN",
    "PARANA": "RN",
    "PARAU": "RN",
    "PARAZINHO": "RN",
    "PARELHAS": "RN",
    "PASSA E FICA": "RN",
    "PATU": "RN",
    "PAU DOS FERROS": "RN",
    "PEDRA GRANDE": "RN",
    "PEDRA PRETA": "RN",
    "PEDRO AVELINO": "RN",
    "PEDRO VELHO": "RN",
    "PENDENCIAS": "RN",
    "POCO BRANCO": "RN",
    "PORTALEGRE": "RN",
    "PORTO DO MANGUE": "RN",
    "PUREZA": "RN",
    "RAFAEL FERNANDES": "RN",
    "RAFAEL GODEIRO": "RN",
    "RIACHO DA CRUZ": "RN",
    "RIO DO FOGO": "RN",
    "RODOLFO FERNANDES": "RN",
    "SANTA MARIA": "RN",
    "SANTANA DO MATOS": "RN",
    "SANTANA DO SERIDO": "RN",
    "SANTO ANTONIO": "RN",
    "SAO BENTO DO NORTE": "RN",
    "SAO BENTO DO TRAIRI": "RN",
    "SAO FERNANDO": "RN",
    "SAO FRANCISCO DO OESTE": "RN",
    "SAO GONCALO DO AMARANTE": "RN",
    "SAO JOAO DO SABUGI": "RN",
    "SAO JOSE DE MIPIBU": "RN",
    "SAO JOSE DO CAMPESTRE": "RN",
    "SAO JOSE DO SERIDO": "RN",
    "SAO MIGUEL": "RN",
    "SAO MIGUEL DE TOUROS": "RN",
    "SAO PAULO DO POTENGI": "RN",
    "SAO PEDRO": "RN",
    "SAO RAFAEL": "RN",
    "SAO TOME": "RN",
    "SAO VICENTE": "RN",
    "SENADOR ELOI DE SOUZA": "RN",
    "SENADOR GEORGINO AVELINO": "RN",
    "SERRA CAIADA": "RN",
    "SERRA DE SAO BENTO": "RN",
    "SERRA DO MEL": "RN",
    "SERRA NEGRA DO NORTE": "RN",
    "SERRINHA DOS PINTOS": "RN",
    "SEVERIANO MELO": "RN",
    "SITIO NOVO": "RN",
    "TABOLEIRO GRANDE": "RN",
    "TAIPU": "RN",
    "TANGARA": "RN",
    "TENENTE ANANIAS": "RN",
    "TENENTE LAURENTINO CRUZ": "RN",
    "TIBAU": "RN",
    "TIBAU DO SUL": "RN",
    "TIMBAUBA DOS BATISTAS": "RN",
    "TOUROS": "RN",
    "TRIUNFO POTIGUAR": "RN",
    "UMARIZAL": "RN",
    "UPANEMA": "RN",
    "VENHA-VER": "RN",
    "VICOSA": "RN",
    "VILA FLOR": "RN",
    "AMPARO DE SAO FRANCISCO": "SE",
    "AQUIDABA": "SE",
    "ARACAJU": "SE",
    "ARAUA": "SE",
    "AREIA BRANCA": "SE",
    "BARRA DOS COQUEIROS": "SE",
    "BOQUIM": "SE",
    "BREJO GRANDE": "SE",
    "CAMPO DO BRITO": "SE",
    "CANHOBA": "SE",
    "CANINDE DE SAO FRANCISCO": "SE",
    "CARIRA": "SE",
    "CARMOPOLIS": "SE",
    "CEDRO DE SAO JOAO": "SE",
    "CRISTINAPOLIS": "SE",
    "CUMBE": "SE",
    "DIVINA PASTORA": "SE",
    "ESTANCIA": "SE",
    "FREI PAULO": "SE",
    "GARARU": "SE",
    "GENERAL MAYNARD": "SE",
    "GRACCHO CARDOSO": "SE",
    "ILHA DAS FLORES": "SE",
    "INDIAROBA": "SE",
    "ITABAIANINHA": "SE",
    "ITABI": "SE",
    "ITAPORANGA D'AJUDA": "SE",
    "JAPARATUBA": "SE",
    "JAPOATA": "SE",
    "LAGARTO": "SE",
    "LARANJEIRAS": "SE",
    "MACAMBIRA": "SE",
    "MALHADA DOS BOIS": "SE",
    "MALHADOR": "SE",
    "MARUIM": "SE",
    "MOITA BONITA": "SE",
    "MONTE ALEGRE DE SERGIPE": "SE",
    "MURIBECA": "SE",
    "NEOPOLIS": "SE",
    "NOSSA SENHORA APARECIDA": "SE",
    "NOSSA SENHORA DA GLORIA": "SE",
    "NOSSA SENHORA DAS DORES": "SE",
    "NOSSA SENHORA DE LOURDES": "SE",
    "NOSSA SENHORA DO SOCORRO": "SE",
    "PACATUBA": "SE",
    "PEDRA MOLE": "SE",
    "PEDRINHAS": "SE",
    "PINHAO": "SE",
    "PIRAMBU": "SE",
    "POCO REDONDO": "SE",
    "POCO VERDE": "SE",
    "PORTO DA FOLHA": "SE",
    "PROPRIA": "SE",
    "RIACHAO DO DANTAS": "SE",
    "RIACHUELO": "SE",
    "RIBEIROPOLIS": "SE",
    "ROSARIO DO CATETE": "SE",
    "SALGADO": "SE",
    "SANTA LUZIA DO ITANHY": "SE",
    "SANTA ROSA DE LIMA": "SE",
    "SANTANA DO SAO FRANCISCO": "SE",
    "SANTO AMARO DAS BROTAS": "SE",
    "SAO CRISTOVAO": "SE",
    "SAO MIGUEL DO ALEIXO": "SE",
    "SIMAO DIAS": "SE",
    "SIRIRI": "SE",
    "TELHA": "SE",
    "TOBIAS BARRETO": "SE",
    "TOMAR DO GERU": "SE",
    "UMBAUBA": "SE"
  };
  function mapearPorCodigoFila(texto) {
    var s = up(texto);
    if (!s) return null;
    // Padrão TNE: "TNE-PE-...", "TNE-PB-..." no código da fila ou microarea
    var m = s.match(/^TNE-([A-Z]{2})-/);
    if (m) return m[1];
    return null;
  }

  function mapearRegiaoPorArea(novaArea) {
    var s = up(novaArea);
    if (!s) return 'OTHERS';
    // Extrai estado do padrão TNE-XX-REGIAO
    var m = s.match(/^TNE-([A-Z]{2})-/);
    if (m) return m[1];
    return 'OTHERS';
  }

  function mapearRegiaoPorCoordenador(coordenador) {
    if (!coordenador) return 'OTHERS';
    var s = String(coordenador).trim().toUpperCase();
    // Campo "Coordenador" do VALID_CAD contém o código no padrão TNE-XX-...
    var m = s.match(/^TNE-([A-Z]{2})-/);
    if (m) return m[1];
    return 'OTHERS';
  }

  function mapearRegiaoPorCidade(cidade) {
    if (!cidade) return 'OTHERS';
    var s = String(cidade).trim().toUpperCase();
    return CIDADE_PARA_REGIAO[s] || 'OTHERS';
  }

  function determinarRegiao(filaAtual, microarea, valid) {
    var porFila = mapearPorCodigoFila(filaAtual || '') || mapearPorCodigoFila(microarea || '');
    if (porFila) return porFila;
    if (valid) {
      var porCoord = mapearRegiaoPorCoordenador(valid.coordenador);
      if (porCoord !== 'OTHERS') return porCoord;
      var porArea = mapearRegiaoPorArea(valid.novaArea);
      if (porArea !== 'OTHERS') return porArea;
      var porCidade = mapearRegiaoPorCidade(valid.cidade);
      if (porCidade !== 'OTHERS') return porCidade;
      // col A (Bairro) contém o município no VALID_CAD do TNE
      var porBairro = mapearRegiaoPorCidade(valid.bairro);
      if (porBairro !== 'OTHERS') return porBairro;
    }
    return 'OTHERS';
  }

  // ===================== DATETIME (datetime.ts) =====================
  function parsePlatformDate(valor, baseDate) {
    if (!valor) return null;
    var s = String(valor).trim();
    if (!s) return null;
    var m = s.match(/(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      var p1 = parseInt(m[1], 10);
      var p2 = parseInt(m[2], 10);
      var yy = m[3] ? parseInt(m[3], 10) : (baseDate || new Date()).getFullYear();
      if (yy < 100) yy += 2000;
      var hh = parseInt(m[4], 10);
      var mi = parseInt(m[5], 10);
      var ss = m[6] ? parseInt(m[6], 10) : 0;
      var dia, mes;
      if (p1 > 12) { dia = p1; mes = p2; }
      else if (p2 > 12) { mes = p1; dia = p2; }
      else { dia = p1; mes = p2; }
      var d = new Date(yy, mes - 1, dia, hh, mi, ss);
      if (!isNaN(d.getTime())) return d;
    }
    // Data SEM horário, ex.: "28/06/26" — é o formato da coluna "Data Base"
    // da planilha, que serve de data-base pra combinar com campos que só
    // trazem a hora (ex.: "Fim"/encerramento, que costuma vir só "10:17").
    var mDate = s.match(/^(\d{1,2})[/\-](\d{1,2})(?:[/\-](\d{2,4}))?$/);
    if (mDate) {
      var dp1 = parseInt(mDate[1], 10);
      var dp2 = parseInt(mDate[2], 10);
      var dyy = mDate[3] ? parseInt(mDate[3], 10) : (baseDate || new Date()).getFullYear();
      if (dyy < 100) dyy += 2000;
      var ddia, dmes;
      if (dp1 > 12) { ddia = dp1; dmes = dp2; }
      else if (dp2 > 12) { dmes = dp1; ddia = dp2; }
      else { ddia = dp1; dmes = dp2; }
      var d0 = new Date(dyy, dmes - 1, ddia, 0, 0, 0);
      if (!isNaN(d0.getTime())) return d0;
    }
    var mh = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (mh && baseDate) {
      var d2 = new Date(baseDate);
      d2.setHours(parseInt(mh[1], 10), parseInt(mh[2], 10), mh[3] ? parseInt(mh[3], 10) : 0, 0);
      return d2;
    }
    var iso = new Date(s);
    if (!isNaN(iso.getTime())) return iso;
    return null;
  }

  function toDate(d) {
    if (!d) return null;
    var date = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : d;
    return isNaN(date.getTime()) ? null : date;
  }

  function formatarDuracao(totalMin) {
    var abs = Math.abs(Math.round(totalMin));
    var dias = Math.floor(abs / 1440);
    var horas = Math.floor((abs % 1440) / 60);
    var min = abs % 60;
    var out = '';
    if (dias > 0) out += dias + 'd ';
    if (horas > 0 || dias > 0) out += horas + 'h';
    out += String(min).padStart(2, '0') + 'min';
    return out.trim();
  }

  function formatarDataBR(d) {
    if (!d) return '—';
    var date = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
    }).format(date);
  }

  // Data compacta pro espaço apertado dos drills: "28/06 14:30" (sem ano).
  function formatarDataCompacta(d) {
    if (!d) return '—';
    var date = (typeof d === 'string' || typeof d === 'number') ? new Date(d) : d;
    if (isNaN(date.getTime())) return '—';
    var parts = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo'
    }).formatToParts(date);
    var map = {}; parts.forEach(function (p) { map[p.type] = p.value; });
    return map.day + '/' + map.month + ' ' + map.hour + ':' + map.minute;
  }

  // Vencimento em linguagem simples: "VENCE EM 30min" / "VENCE EM 1h30" /
  // "VENCIDO A 1h30" — junto com a cor sugerida (verde = ainda dentro do
  // prazo, vermelho = já venceu), pra usar direto nos drills.
  function formatarVencimentoSimples(vencimentoCalc, now) {
    if (!vencimentoCalc) return { texto: '—', cor: null };
    var venc = (typeof vencimentoCalc === 'string' || typeof vencimentoCalc === 'number') ? new Date(vencimentoCalc) : vencimentoCalc;
    if (isNaN(venc.getTime())) return { texto: '—', cor: null };
    now = now || new Date();
    var diffMin = Math.round((venc.getTime() - now.getTime()) / 60000);
    var venceu = diffMin < 0;
    var abs = Math.abs(diffMin);
    var horas = Math.floor(abs / 60);
    var min = abs % 60;
    var txt;
    if (horas > 0 && min > 0) txt = horas + 'h' + String(min).padStart(2, '0');
    else if (horas > 0) txt = horas + 'h';
    else txt = min + 'min';
    return { texto: (venceu ? 'VENCIDO A ' : 'VENCE EM ') + txt, cor: venceu ? '#e74c3c' : '#2ecc71', venceu: venceu };
  }

  function getAgingBucket(minutos) {
    for (var i = 0; i < C.AGING_BUCKETS.length; i++) {
      var b = C.AGING_BUCKETS[i];
      if (minutos >= b.min && minutos < b.max) return b.label;
    }
    return C.AGING_BUCKETS[C.AGING_BUCKETS.length - 1].label;
  }

  // ===================== SLA (sla.ts) =====================
  var STATUS_BACKLOG = ['NÃO INICIADO', 'NAO INICIADO', 'INICIADO', 'PENDENTE'];
  var STATUS_FECHADO = ['CONCLUÍDA', 'CONCLUIDA', 'CANCELADA', 'CANCELADO'];

  function isBacklogStatus(status) {
    var s = up(status);
    if (STATUS_FECHADO.indexOf(s) >= 0) return false;
    if (STATUS_BACKLOG.indexOf(s) >= 0) return true;
    return s !== '';
  }

  function computeSla(task, prazoMap, now) {
    var criacao = toDate(task.dataCriacao);
    var isBacklog = isBacklogStatus(task.status);
    var falha = up(task.tipoFalha);
    var agingMinutos = criacao ? Math.round((now.getTime() - criacao.getTime()) / 60000) : null;

    if (falha.indexOf('PREDICAO INDISP') >= 0 || falha.indexOf('PREDIÇÃO INDISP') >= 0) {
      return { vencimentoCalc: null, fonteSla: 'PREDITIVA', statusSla: 'PREDITIVA', minutosRestantes: null, agingMinutos: agingMinutos, isBacklog: isBacklog };
    }

    var vencimento = null;
    var fonte = 'SEM DADOS';
    var venPlat = parsePlatformDate(task.vencimentoSla, criacao);
    if (venPlat) {
      vencimento = venPlat; fonte = 'SLA CONT';
    } else if (criacao) {
      var prazo = prazoMap[up(task.prioridade)] || 0;
      if (prazo > 0) {
        vencimento = new Date(criacao.getTime() + prazo * 3600 * 1000);
        fonte = 'SLA CAL';
      }
    }

    if (!vencimento) {
      return { vencimentoCalc: null, fonteSla: 'SEM DADOS', statusSla: isBacklog ? 'INDEFINIDO' : 'CONCLUIDO', minutosRestantes: null, agingMinutos: agingMinutos, isBacklog: isBacklog };
    }

    var minutosRestantes = Math.round((vencimento.getTime() - now.getTime()) / 60000);
    var statusSla;
    if (!isBacklog) statusSla = 'CONCLUIDO';
    else statusSla = minutosRestantes < 0 ? 'FORA DO SLA' : 'DENTRO DO SLA';

    return { vencimentoCalc: vencimento, fonteSla: fonte, statusSla: statusSla, minutosRestantes: minutosRestantes, agingMinutos: agingMinutos, isBacklog: isBacklog };
  }

  function montarPrazoMap(override) {
    var m = {};
    for (var k in C.SLA_PADRAO_HORAS) if (C.SLA_PADRAO_HORAS.hasOwnProperty(k)) m[k] = C.SLA_PADRAO_HORAS[k];
    if (override) for (var k2 in override) if (override.hasOwnProperty(k2)) {
      var v = parseFloat(override[k2]);
      if (!isNaN(v)) m[k2] = v;
    }
    return m;
  }

  // ===================== TICKETS (tickets.ts) =====================
  function isTicketCorretiva(tipoAtividade) {
    return normalize(tipoAtividade).indexOf('CORRETIV') >= 0;
  }

  function categoriaManual(tipoAtividade) {
    var t = normalize(tipoAtividade);
    if (t.indexOf('PREVENT') >= 0) return 'prev';
    if (t.indexOf('CONJUNT') >= 0) return 'conj';
    if (t.indexOf('WO') >= 0 || t.indexOf('WORK ORDER') >= 0) return 'wo';
    return 'outras';
  }

  function classificarCciCampo(filaAtual) {
    return normalize(filaAtual).indexOf('OPERADOR_') >= 0 ? 'CCI' : 'Campo';
  }

  function dedupPorTsk(rows) {
    var best = {};
    var semOs = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var k = ((r.osNumero == null ? '' : r.osNumero).toString()).trim();
      if (!k) { semOs.push(r); continue; }
      var cur = best[k];
      var sid = (r.sequenciaId == null ? -1 : Number(r.sequenciaId));
      if (!cur || sid > (cur.sequenciaId == null ? -1 : Number(cur.sequenciaId))) best[k] = r;
    }
    var out = [];
    for (var kk in best) if (best.hasOwnProperty(kk)) out.push(best[kk]);
    return out.concat(semOs);
  }

  function separarTicketsManuais(rows, jaDeduplicado) {
    var base = jaDeduplicado ? rows : dedupPorTsk(rows);
    var tickets = [], manuais = [];
    for (var i = 0; i < base.length; i++) {
      if (isTicketCorretiva(base[i].tipoAtividade)) tickets.push(base[i]);
      else manuais.push(base[i]);
    }
    return { tickets: tickets, manuais: manuais };
  }

  // ===================== CAUSA (causa.ts) =====================
  function agruparCausa(causa) {
    var s = up(causa);
    if (!s) return 'Outros';
    if (s.indexOf('FURTO') >= 0 || s.indexOf('VANDAL') >= 0 || s.indexOf('ROUBO') >= 0) return 'Furto';
    if (s.indexOf('ENERGIA') >= 0 || s.indexOf('ENERG') >= 0) return 'Energia';
    if (s.indexOf('FO') >= 0 || s.indexOf('FIBRA') >= 0 || s.indexOf('ROMPIMENTO') >= 0) return 'Fibra';
    if (s.indexOf('TX') >= 0 || s.indexOf('TRANSMISS') >= 0 || s.indexOf('PROVEDOR') >= 0 || s.indexOf('MW') >= 0 || s.indexOf('BACKHAUL') >= 0) return 'Transmissão';
    return 'Outros';
  }

  D.up = up;
  D.normalize = normalize;
  D.determinarRegiao = determinarRegiao;
  D.mapearRegiaoPorArea = mapearRegiaoPorArea;
  D.mapearRegiaoPorCoordenador = mapearRegiaoPorCoordenador;
  D.parsePlatformDate = parsePlatformDate;
  D.toDate = toDate;
  D.formatarDuracao = formatarDuracao;
  D.formatarDataBR = formatarDataBR;
  D.formatarDataCompacta = formatarDataCompacta;
  D.formatarVencimentoSimples = formatarVencimentoSimples;
  D.getAgingBucket = getAgingBucket;
  D.isBacklogStatus = isBacklogStatus;
  D.computeSla = computeSla;
  D.montarPrazoMap = montarPrazoMap;
  D.isTicketCorretiva = isTicketCorretiva;
  D.categoriaManual = categoriaManual;
  D.classificarCciCampo = classificarCciCampo;
  D.dedupPorTsk = dedupPorTsk;
  D.separarTicketsManuais = separarTicketsManuais;
  D.agruparCausa = agruparCausa;

  TNE.domain = D;
})(window.TNE = window.TNE || {});
