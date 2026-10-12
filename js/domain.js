/* Logica de dominio TMG (adaptado do controle-operacional TMG) */
(function (TMG) {
  var C = TMG.constants;
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

  // ===================== REGIAO (region.ts) — adaptado para TMG =====================
  // Mapeamento direto de coordenador (campo da planilha) → ANF
  var ANF_COORDENADOR = {
    'ANF31': 'ANF31', 'anf31': 'ANF31',
    'ANF32': 'ANF32', 'anf32': 'ANF32',
    'ANF33': 'ANF33', 'anf33': 'ANF33',
    'ANF34': 'ANF34', 'anf34': 'ANF34',
    'ANF35': 'ANF35', 'anf35': 'ANF35',
    'ANF37': 'ANF37', 'anf37': 'ANF37',
    'ANF38': 'ANF38', 'anf38': 'ANF38'
  };

  // Lookup por nome de cidade (fonte: VALID_CAD da planilha TMG)
  var CIDADE_PARA_REGIAO = {
    "ABRE CAMPO": "ANF31",
    "ACAIACA": "ANF31",
    "ALVINOPOLIS": "ANF31",
    "ALVORADA DE MINAS": "ANF31",
    "AMPARO DA SERRA": "ANF31",
    "ANTONIO DIAS": "ANF31",
    "ARACAI": "ANF31",
    "ARAPONGA": "ANF31",
    "BALDIM": "ANF31",
    "BARAO DE COCAIS": "ANF31",
    "BARRA LONGA": "ANF31",
    "BELA VISTA DE MINAS": "ANF31",
    "BELO HORIZONTE": "ANF31",
    "BELO ORIENTE": "ANF31",
    "BELO VALE": "ANF31",
    "BETIM": "ANF31",
    "BOM JESUS DO AMPARO": "ANF31",
    "BONFIM": "ANF31",
    "BRUMADINHO": "ANF31",
    "CACHOEIRA DA PRATA": "ANF31",
    "CAETE": "ANF31",
    "CAJURI": "ANF31",
    "CANAA": "ANF31",
    "CAPELA NOVA": "ANF31",
    "CAPIM BRANCO": "ANF31",
    "CAPUTIRA": "ANF31",
    "CARANAIBA": "ANF31",
    "CARMESIA": "ANF31",
    "CASA GRANDE": "ANF31",
    "CATAS ALTAS": "ANF31",
    "CATAS ALTAS DA NORUEGA": "ANF31",
    "CONCEICAO DO MATO DENTRO": "ANF31",
    "CONFINS": "ANF31",
    "CONGONHAS": "ANF31",
    "CONGONHAS DO NORTE": "ANF31",
    "CONQUISTA": "ANF31",
    "CONSELHEIRO LAFAIETE": "ANF31",
    "CONTAGEM": "ANF31",
    "CORDISBURGO": "ANF31",
    "CORONEL FABRICIANO": "ANF31",
    "CRISTIANO OTONI": "ANF31",
    "CRUCILANDIA": "ANF31",
    "DESTERRO DE ENTRE RIOS": "ANF31",
    "DIOGO DE VASCONCELOS": "ANF31",
    "DIONISIO": "ANF31",
    "DOM JOAQUIM": "ANF31",
    "DOM SILVERIO": "ANF31",
    "ENTRE RIOS DE MINAS": "ANF31",
    "ESMERALDAS": "ANF31",
    "FERROS": "ANF31",
    "FLORESTAL": "ANF31",
    "FORTUNA DE MINAS": "ANF31",
    "FUNILANDIA": "ANF31",
    "GUARACIABA": "ANF31",
    "IBIRITE": "ANF31",
    "IGARAPE": "ANF31",
    "INHAUMA": "ANF31",
    "IPATINGA": "ANF31",
    "ITABIRA": "ANF31",
    "ITABIRITO": "ANF31",
    "ITAMBE DO MATO DENTRO": "ANF31",
    "ITATIAIUCU": "ANF31",
    "ITAVERAVA": "ANF31",
    "JABOTICATUBAS": "ANF31",
    "JAGUARACU": "ANF31",
    "JECEABA": "ANF31",
    "JEQUERI": "ANF31",
    "JEQUITIBA": "ANF31",
    "JOAO MONLEVADE": "ANF31",
    "JUATUBA": "ANF31",
    "LAGOA SANTA": "ANF31",
    "LAMIM": "ANF31",
    "MANHUACU": "ANF31",
    "MARIANA": "ANF31",
    "MARIO CAMPOS": "ANF31",
    "MARLIERIA": "ANF31",
    "MATEUS LEME": "ANF31",
    "MATIPO": "ANF31",
    "MATOZINHOS": "ANF31",
    "MOEDA": "ANF31",
    "MORRO DO PILAR": "ANF31",
    "NOVA ERA": "ANF31",
    "NOVA LIMA": "ANF31",
    "NOVA UNIAO": "ANF31",
    "ORATORIOS": "ANF31",
    "OURO BRANCO": "ANF31",
    "OURO PRETO": "ANF31",
    "PARAOPEBA": "ANF31",
    "PASSABEM": "ANF31",
    "PEDRA BONITA": "ANF31",
    "PEDRA DO ANTA": "ANF31",
    "PEDRO LEOPOLDO": "ANF31",
    "PIEDADE DE PONTE NOVA": "ANF31",
    "PIEDADE DOS GERAIS": "ANF31",
    "PIRANGA": "ANF31",
    "POMPEU": "ANF31",
    "PONTE NOVA": "ANF31",
    "PORTO FIRME": "ANF31",
    "PRUDENTE DE MORAIS": "ANF31",
    "QUELUZITO": "ANF31",
    "RAPOSOS": "ANF31",
    "RIBEIRAO DAS NEVES": "ANF31",
    "RIO ACIMA": "ANF31",
    "RIO CASCA": "ANF31",
    "RIO DOCE": "ANF31",
    "RIO ESPERA": "ANF31",
    "RIO MANSO": "ANF31",
    "RIO PIRACICABA": "ANF31",
    "SABARA": "ANF31",
    "SANTA BARBARA": "ANF31",
    "SANTA CRUZ DO ESCALVADO": "ANF31",
    "SANTA LUZIA": "ANF31",
    "SANTA MARGARIDA": "ANF31",
    "SANTA MARIA DE ITABIRA": "ANF31",
    "SANTANA DE PIRAPAMA": "ANF31",
    "SANTANA DO PARAISO": "ANF31",
    "SANTANA DO RIACHO": "ANF31",
    "SANTANA DOS MONTES": "ANF31",
    "SANTO ANTONIO DO GRAMA": "ANF31",
    "SANTO ANTONIO DO RIO ABAIXO": "ANF31",
    "SAO BRAS DO SUACUI": "ANF31",
    "SAO DOMINGOS DO PRATA": "ANF31",
    "SAO GONCALO DO RIO ABAIXO": "ANF31",
    "SAO JOAQUIM DE BICAS": "ANF31",
    "SAO JOSE DA LAPA": "ANF31",
    "SAO JOSE DO GOIABAL": "ANF31",
    "SAO MIGUEL DO ANTA": "ANF31",
    "SAO SEBASTIAO DO RIO PRETO": "ANF31",
    "SARZEDO": "ANF31",
    "SEM PEIXE": "ANF31",
    "SENHORA DE OLIVEIRA": "ANF31",
    "SERICITA": "ANF31",
    "SETE LAGOAS": "ANF31",
    "TAQUARACU DE MINAS": "ANF31",
    "TEIXEIRAS": "ANF31",
    "TIMOTEO": "ANF31",
    "URUCANIA": "ANF31",
    "VESPASIANO": "ANF31",
    "VICOSA": "ANF31",
    "ALEM PARAIBA": "ANF32",
    "ALFREDO VASCONCELOS": "ANF32",
    "ALTO CAPARAO": "ANF32",
    "ALTO RIO DOCE": "ANF32",
    "ANTONIO CARLOS": "ANF32",
    "ANTONIO PRADO DE MINAS": "ANF32",
    "ARACITABA": "ANF32",
    "ARANTINA": "ANF32",
    "ARGIRITA": "ANF32",
    "ASTOLFO DUTRA": "ANF32",
    "BARAO DE MONTE ALTO": "ANF32",
    "BARBACENA": "ANF32",
    "BARROSO": "ANF32",
    "BELMIRO BRAGA": "ANF32",
    "BIAS FORTES": "ANF32",
    "BICAS": "ANF32",
    "BOCAINA DE MINAS": "ANF32",
    "BOM JARDIM DE MINAS": "ANF32",
    "BRAS PIRES": "ANF32",
    "CAIANA": "ANF32",
    "CAPARAO": "ANF32",
    "CARANDAI": "ANF32",
    "CARANGOLA": "ANF32",
    "CATAGUASES": "ANF32",
    "CHACARA": "ANF32",
    "CHIADOR": "ANF32",
    "CIPOTANEA": "ANF32",
    "COIMBRA": "ANF32",
    "CONCEICAO DA BARRA DE MINAS": "ANF32",
    "CORONEL PACHECO": "ANF32",
    "CORONEL XAVIER CHAVES": "ANF32",
    "DESCOBERTO": "ANF32",
    "DESTERRO DO MELO": "ANF32",
    "DIVINESIA": "ANF32",
    "DIVINO": "ANF32",
    "DONA EUZEBIA": "ANF32",
    "DORES DE CAMPOS": "ANF32",
    "DORES DO TURVO": "ANF32",
    "ERVALIA": "ANF32",
    "ESPERA FELIZ": "ANF32",
    "ESTRELA DALVA": "ANF32",
    "EUGENOPOLIS": "ANF32",
    "EWBANK DA CAMARA": "ANF32",
    "FARIA LEMOS": "ANF32",
    "FERVEDOURO": "ANF32",
    "FRANCISCO BADARO": "ANF32",
    "GOIANA": "ANF32",
    "GUARANI": "ANF32",
    "GUARARA": "ANF32",
    "GUIDOVAL": "ANF32",
    "GUIRICEMA": "ANF32",
    "IBERTIOGA": "ANF32",
    "IBIAI": "ANF32",
    "ITAMARATI DE MINAS": "ANF32",
    "JUIZ DE FORA": "ANF32",
    "LAGOA DOURADA": "ANF32",
    "LARANJAL": "ANF32",
    "LEOPOLDINA": "ANF32",
    "LIBERDADE": "ANF32",
    "LIMA DUARTE": "ANF32",
    "MADRE DE DEUS DE MINAS": "ANF32",
    "MAR DE ESPANHA": "ANF32",
    "MARIPA DE MINAS": "ANF32",
    "MATIAS BARBOSA": "ANF32",
    "MERCES": "ANF32",
    "MIRADOURO": "ANF32",
    "MIRAI": "ANF32",
    "MURIAE": "ANF32",
    "OLARIA": "ANF32",
    "OLIVEIRA FORTES": "ANF32",
    "ORIZANIA": "ANF32",
    "PAIVA": "ANF32",
    "PALMA": "ANF32",
    "PASSA VINTE": "ANF32",
    "PATROCINIO DO MURIAE": "ANF32",
    "PAULA CANDIDO": "ANF32",
    "PEDRA DOURADA": "ANF32",
    "PEDRO TEIXEIRA": "ANF32",
    "PEQUERI": "ANF32",
    "PERDIZES": "ANF32",
    "PIAU": "ANF32",
    "PIEDADE DO RIO GRANDE": "ANF32",
    "PIRAPETINGA": "ANF32",
    "PIRAUBA": "ANF32",
    "PRADOS": "ANF32",
    "PRESIDENTE BERNARDES": "ANF32",
    "RECREIO": "ANF32",
    "RESENDE COSTA": "ANF32",
    "RESSAQUINHA": "ANF32",
    "RIO NOVO": "ANF32",
    "RIO POMBA": "ANF32",
    "RIO PRETO": "ANF32",
    "RITAPOLIS": "ANF32",
    "ROCHEDO DE MINAS": "ANF32",
    "RODEIRO": "ANF32",
    "ROSARIO DA LIMEIRA": "ANF32",
    "SANTA BARBARA DO MONTE VERDE": "ANF32",
    "SANTA BARBARA DO TUGURIO": "ANF32",
    "SANTA RITA DE IBITIPOCA": "ANF32",
    "SANTA RITA DE JACUTINGA": "ANF32",
    "SANTANA DE CATAGUASES": "ANF32",
    "SANTANA DO DESERTO": "ANF32",
    "SANTANA DO GARAMBEU": "ANF32",
    "SANTANA DO JACARE": "ANF32",
    "SANTO ANTONIO DO AVENTUREIRO": "ANF32",
    "SANTOS DUMONT": "ANF32",
    "SAO FRANCISCO DO GLORIA": "ANF32",
    "SAO GERALDO": "ANF32",
    "SAO GERALDO DA PIEDADE": "ANF32",
    "SAO JOAO DEL REI": "ANF32",
    "SAO JOAO DO MANHUACU": "ANF32",
    "SAO JOAO NEPOMUCENO": "ANF32",
    "SAO SEBASTIAO DA VARGEM ALEGRE": "ANF32",
    "SAO TIAGO": "ANF32",
    "SENADOR CORTES": "ANF32",
    "SENADOR FIRMINO": "ANF32",
    "SENHORA DOS REMEDIOS": "ANF32",
    "SILVEIRANIA": "ANF32",
    "SIMAO PEREIRA": "ANF32",
    "TABULEIRO": "ANF32",
    "TIRADENTES": "ANF32",
    "TOCANTINS": "ANF32",
    "TOMBOS": "ANF32",
    "UBA": "ANF32",
    "VIEIRAS": "ANF32",
    "VISCONDE DO RIO BRANCO": "ANF32",
    "VOLTA GRANDE": "ANF32",
    "ACUCENA": "ANF33",
    "AGUA BOA": "ANF33",
    "AGUAS FORMOSAS": "ANF33",
    "AGUAS VERMELHAS": "ANF33",
    "AIMORES": "ANF33",
    "ALMENARA": "ANF33",
    "ALPERCATA": "ANF33",
    "ALTO JEQUITIBA": "ANF33",
    "ALVARENGA": "ANF33",
    "ANGELANDIA": "ANF33",
    "ARACUAI": "ANF33",
    "ATALEIA": "ANF33",
    "BANDEIRA": "ANF33",
    "BERILO": "ANF33",
    "BERTOPOLIS": "ANF33",
    "BOM JESUS DO GALHO": "ANF33",
    "BRAUNAS": "ANF33",
    "BUGRE": "ANF33",
    "CACHOEIRA DE PAJEU": "ANF33",
    "CAMPANARIO": "ANF33",
    "CANTAGALO": "ANF33",
    "CAPELINHA": "ANF33",
    "CAPITAO ANDRADE": "ANF33",
    "CARAI": "ANF33",
    "CARATINGA": "ANF33",
    "CARLOS CHAGAS": "ANF33",
    "CATUJI": "ANF33",
    "CENTRAL DE MINAS": "ANF33",
    "CHALE": "ANF33",
    "CHAPADA DO NORTE": "ANF33",
    "COLUNA": "ANF33",
    "COMERCINHO": "ANF33",
    "CONCEICAO DE IPANEMA": "ANF33",
    "CONSELHEIRO PENA": "ANF33",
    "COROACI": "ANF33",
    "CORONEL MURTA": "ANF33",
    "CORREGO NOVO": "ANF33",
    "CRISOLITA": "ANF33",
    "CUPARAQUE": "ANF33",
    "CURRAL DE DENTRO": "ANF33",
    "DIVINO DAS LARANJEIRAS": "ANF33",
    "DIVINOLANDIA DE MINAS": "ANF33",
    "DIVISA ALEGRE": "ANF33",
    "DIVISOPOLIS": "ANF33",
    "DOM CAVATI": "ANF33",
    "DORES DE GUANHAES": "ANF33",
    "DURANDE": "ANF33",
    "ENGENHEIRO CALDAS": "ANF33",
    "ENTRE FOLHAS": "ANF33",
    "FELISBURGO": "ANF33",
    "FERNANDES TOURINHO": "ANF33",
    "FRANCISCOPOLIS": "ANF33",
    "FREI GASPAR": "ANF33",
    "FREI LAGONEGRO": "ANF33",
    "FRONTEIRA DOS VALES": "ANF33",
    "GALILEIA": "ANF33",
    "GOIABEIRA": "ANF33",
    "GONZAGA": "ANF33",
    "GOVERNADOR VALADARES": "ANF33",
    "GUANHAES": "ANF33",
    "IAPU": "ANF33",
    "ICARAI DE MINAS": "ANF33",
    "IMBE DE MINAS": "ANF33",
    "INHAPIM": "ANF33",
    "IPABA": "ANF33",
    "IPANEMA": "ANF33",
    "ITABIRINHA": "ANF33",
    "ITAIPE": "ANF33",
    "ITAMARANDIBA": "ANF33",
    "ITAMBACURI": "ANF33",
    "ITANHOMI": "ANF33",
    "ITAOBIM": "ANF33",
    "ITINGA": "ANF33",
    "ITUETA": "ANF33",
    "JACINTO": "ANF33",
    "JAMPRUCA": "ANF33",
    "JENIPAPO DE MINAS": "ANF33",
    "JEQUITINHONHA": "ANF33",
    "JOAIMA": "ANF33",
    "JOANESIA": "ANF33",
    "JORDANIA": "ANF33",
    "JOSE GONCALVES DE MINAS": "ANF33",
    "JOSE RAYDAN": "ANF33",
    "LADAINHA": "ANF33",
    "LAJINHA": "ANF33",
    "LEME DO PRADO": "ANF33",
    "LUISBURGO": "ANF33",
    "MACHACALIS": "ANF33",
    "MALACACHETA": "ANF33",
    "MANHUMIRIM": "ANF33",
    "MANTENA": "ANF33",
    "MARILAC": "ANF33",
    "MARTINS SOARES": "ANF33",
    "MATA VERDE": "ANF33",
    "MATERLANDIA": "ANF33",
    "MATHIAS LOBATO": "ANF33",
    "MEDINA": "ANF33",
    "MENDES PIMENTEL": "ANF33",
    "MESQUITA": "ANF33",
    "MINAS NOVAS": "ANF33",
    "MONTE FORMOSO": "ANF33",
    "MUTUM": "ANF33",
    "NACIP RAYDAN": "ANF33",
    "NANUQUE": "ANF33",
    "NAQUE": "ANF33",
    "NOVA BELEM": "ANF33",
    "NOVA MODICA": "ANF33",
    "NOVO CRUZEIRO": "ANF33",
    "NOVO ORIENTE DE MINAS": "ANF33",
    "OURO VERDE DE MINAS": "ANF33",
    "PADRE PARAISO": "ANF33",
    "PALMOPOLIS": "ANF33",
    "PAULISTAS": "ANF33",
    "PAVAO": "ANF33",
    "PECANHA": "ANF33",
    "PEDRA AZUL": "ANF33",
    "PERIQUITO": "ANF33",
    "PESCADOR": "ANF33",
    "PIEDADE DE CARATINGA": "ANF33",
    "PINGO-D'AGUA": "ANF33",
    "POCRANE": "ANF33",
    "PONTO DOS VOLANTES": "ANF33",
    "POTE": "ANF33",
    "RAUL SOARES": "ANF33",
    "REDUTO": "ANF33",
    "RESPLENDOR": "ANF33",
    "RIO DO PRADO": "ANF33",
    "RIO VERMELHO": "ANF33",
    "RUBIM": "ANF33",
    "SABINOPOLIS": "ANF33",
    "SALTO DA DIVISA": "ANF33",
    "SANTA BARBARA DO LESTE": "ANF33",
    "SANTA EFIGENIA DE MINAS": "ANF33",
    "SANTA HELENA DE MINAS": "ANF33",
    "SANTA MARIA DO SALTO": "ANF33",
    "SANTA MARIA DO SUACUI": "ANF33",
    "SANTA RITA DE MINAS": "ANF33",
    "SANTA RITA DO ITUETO": "ANF33",
    "SANTANA DO MANHUACU": "ANF33",
    "SANTO ANTONIO DO ITAMBE": "ANF33",
    "SANTO ANTONIO DO JACINTO": "ANF33",
    "SAO DOMINGOS DAS DORES": "ANF33",
    "SAO FELIX DE MINAS": "ANF33",
    "SAO GERALDO DO BAIXIO": "ANF33",
    "SAO JOAO DO MANTENINHA": "ANF33",
    "SAO JOAO DO ORIENTE": "ANF33",
    "SAO JOAO EVANGELISTA": "ANF33",
    "SAO JOSE DA SAFIRA": "ANF33",
    "SAO JOSE DO DIVINO": "ANF33",
    "SAO JOSE DO JACURI": "ANF33",
    "SAO JOSE DO MANTIMENTO": "ANF33",
    "SAO PEDRO DO SUACUI": "ANF33",
    "SAO PEDRO DOS FERROS": "ANF33",
    "SAO SEBASTIAO DO ANTA": "ANF33",
    "SAO SEBASTIAO DO MARANHAO": "ANF33",
    "SARDOA": "ANF33",
    "SENHORA DO PORTO": "ANF33",
    "SERRA DOS AIMORES": "ANF33",
    "SETUBINHA": "ANF33",
    "SIMONESIA": "ANF33",
    "SOBRALIA": "ANF33",
    "TAPARUBA": "ANF33",
    "TARUMIRIM": "ANF33",
    "TEOFILO OTONI": "ANF33",
    "TUMIRITINGA": "ANF33",
    "UBAPORANGA": "ANF33",
    "UMBURATIBA": "ANF33",
    "VARGEM ALEGRE": "ANF33",
    "VERMELHO NOVO": "ANF33",
    "VIRGEM DA LAPA": "ANF33",
    "VIRGINOPOLIS": "ANF33",
    "VIRGOLANDIA": "ANF33",
    "ABADIA DOS DOURADOS": "ANF34",
    "AGUA COMPRIDA": "ANF34",
    "ARAGUARI": "ANF34",
    "ARAPORA": "ANF34",
    "ARAPUA": "ANF34",
    "ARAXA": "ANF34",
    "CACHOEIRA DOURADA": "ANF34",
    "CAMPINA VERDE": "ANF34",
    "CAMPO FLORIDO": "ANF34",
    "CANAPOLIS": "ANF34",
    "CAPINOPOLIS": "ANF34",
    "CARMO DO PARANAIBA": "ANF34",
    "CARNEIRINHO": "ANF34",
    "CASCALHO RICO": "ANF34",
    "CENTRALINA": "ANF34",
    "CLARAVAL": "ANF34",
    "COMENDADOR GOMES": "ANF34",
    "CONCEICAO DAS ALAGOAS": "ANF34",
    "COROMANDEL": "ANF34",
    "CRUZEIRO DA FORTALEZA": "ANF34",
    "DELTA": "ANF34",
    "DOURADOQUARA": "ANF34",
    "ESTRELA DO SUL": "ANF34",
    "FRONTEIRA": "ANF34",
    "FRUTAL": "ANF34",
    "GRUPIARA": "ANF34",
    "GUIMARANIA": "ANF34",
    "GURINHATA": "ANF34",
    "IBIA": "ANF34",
    "INDIANOPOLIS": "ANF34",
    "IPIACU": "ANF34",
    "IRAI DE MINAS": "ANF34",
    "ITAPAGIPE": "ANF34",
    "ITUIUTABA": "ANF34",
    "ITURAMA": "ANF34",
    "LAGAMAR": "ANF34",
    "LAGOA FORMOSA": "ANF34",
    "LAGOA GRANDE": "ANF34",
    "LIMEIRA DO OESTE": "ANF34",
    "MATUTINA": "ANF34",
    "MONTE ALEGRE DE MINAS": "ANF34",
    "MONTE CARMELO": "ANF34",
    "NOVA PONTE": "ANF34",
    "PATOS DE MINAS": "ANF34",
    "PATROCINIO": "ANF34",
    "PEDRINOPOLIS": "ANF34",
    "PIRAJUBA": "ANF34",
    "PLANURA": "ANF34",
    "PRATA": "ANF34",
    "PRATINHA": "ANF34",
    "PRESIDENTE OLEGARIO": "ANF34",
    "RIO PARANAIBA": "ANF34",
    "ROMARIA": "ANF34",
    "SACRAMENTO": "ANF34",
    "SANTA JULIANA": "ANF34",
    "SANTA ROSA DA SERRA": "ANF34",
    "SANTA VITORIA": "ANF34",
    "SAO FRANCISCO DE SALES": "ANF34",
    "SAO GOTARDO": "ANF34",
    "SERRA DO SALITRE": "ANF34",
    "TAPIRA": "ANF34",
    "TIROS": "ANF34",
    "TUPACIGUARA": "ANF34",
    "UBERABA": "ANF34",
    "UBERLANDIA": "ANF34",
    "UNIAO DE MINAS": "ANF34",
    "VAZANTE": "ANF34",
    "VERISSIMO": "ANF34",
    "AGUANIL": "ANF35",
    "AIURUOCA": "ANF35",
    "ALAGOA": "ANF35",
    "ALBERTINA": "ANF35",
    "ALFENAS": "ANF35",
    "ALPINOPOLIS": "ANF35",
    "ALTEROSA": "ANF35",
    "ANDRADAS": "ANF35",
    "ANDRELANDIA": "ANF35",
    "ARCEBURGO": "ANF35",
    "AREADO": "ANF35",
    "BAEPENDI": "ANF35",
    "BANDEIRA DO SUL": "ANF35",
    "BOA ESPERANCA": "ANF35",
    "BOM JESUS DA PENHA": "ANF35",
    "BOM REPOUSO": "ANF35",
    "BOM SUCESSO": "ANF35",
    "BORDA DA MATA": "ANF35",
    "BOTELHOS": "ANF35",
    "BRASOPOLIS": "ANF35",
    "BUENO BRANDAO": "ANF35",
    "CABO VERDE": "ANF35",
    "CACHOEIRA DE MINAS": "ANF35",
    "CALDAS": "ANF35",
    "CAMANDUCAIA": "ANF35",
    "CAMBUI": "ANF35",
    "CAMBUQUIRA": "ANF35",
    "CAMPANHA": "ANF35",
    "CAMPESTRE": "ANF35",
    "CAMPO BELO": "ANF35",
    "CAMPO DO MEIO": "ANF35",
    "CAMPOS GERAIS": "ANF35",
    "CANA VERDE": "ANF35",
    "CANDEIAS": "ANF35",
    "CAPETINGA": "ANF35",
    "CAPITOLIO": "ANF35",
    "CAREACU": "ANF35",
    "CARMO DA CACHOEIRA": "ANF35",
    "CARMO DE MINAS": "ANF35",
    "CARMO DO RIO CLARO": "ANF35",
    "CARRANCAS": "ANF35",
    "CARVALHOPOLIS": "ANF35",
    "CARVALHOS": "ANF35",
    "CASSIA": "ANF35",
    "CAXAMBU": "ANF35",
    "CONCEICAO DA APARECIDA": "ANF35",
    "CONCEICAO DAS PEDRAS": "ANF35",
    "CONCEICAO DO RIO VERDE": "ANF35",
    "CONCEICAO DOS OUROS": "ANF35",
    "CONGONHAL": "ANF35",
    "CONSOLACAO": "ANF35",
    "COQUEIRAL": "ANF35",
    "CORDISLANDIA": "ANF35",
    "CORREGO DO BOM JESUS": "ANF35",
    "CRISTAIS": "ANF35",
    "CRISTINA": "ANF35",
    "CRUZILIA": "ANF35",
    "DELFIM MOREIRA": "ANF35",
    "DELFINOPOLIS": "ANF35",
    "DIVISA NOVA": "ANF35",
    "DOM VICOSO": "ANF35",
    "ELOI MENDES": "ANF35",
    "ESPIRITO SANTO DO DOURADO": "ANF35",
    "ESTIVA": "ANF35",
    "EXTREMA": "ANF35",
    "FAMA": "ANF35",
    "FORTALEZA DE MINAS": "ANF35",
    "GONCALVES": "ANF35",
    "GUAPE": "ANF35",
    "GUARANESIA": "ANF35",
    "GUAXUPE": "ANF35",
    "HELIODORA": "ANF35",
    "IBIRACI": "ANF35",
    "IBITIURA DE MINAS": "ANF35",
    "IBITURUNA": "ANF35",
    "IJACI": "ANF35",
    "ILICINEA": "ANF35",
    "INCONFIDENTES": "ANF35",
    "INGAI": "ANF35",
    "IPUIUNA": "ANF35",
    "ITAJUBA": "ANF35",
    "ITAMOGI": "ANF35",
    "ITAMONTE": "ANF35",
    "ITANHANDU": "ANF35",
    "ITAPEVA": "ANF35",
    "ITAU DE MINAS": "ANF35",
    "ITUMIRIM": "ANF35",
    "ITUTINGA": "ANF35",
    "JACUI": "ANF35",
    "JACUTINGA": "ANF35",
    "JESUANIA": "ANF35",
    "JURUAIA": "ANF35",
    "LAMBARI": "ANF35",
    "LAVRAS": "ANF35",
    "LUMINARIAS": "ANF35",
    "MACHADO": "ANF35",
    "MARIA DA FE": "ANF35",
    "MARMELOPOLIS": "ANF35",
    "MINDURI": "ANF35",
    "MONSENHOR PAULO": "ANF35",
    "MONTE BELO": "ANF35",
    "MONTE SANTO DE MINAS": "ANF35",
    "MONTE SIAO": "ANF35",
    "MUNHOZ": "ANF35",
    "MUZAMBINHO": "ANF35",
    "NATERCIA": "ANF35",
    "NAZARENO": "ANF35",
    "NEPOMUCENO": "ANF35",
    "NOVA RESENDE": "ANF35",
    "OLIMPIO NORONHA": "ANF35",
    "OURO FINO": "ANF35",
    "PARAGUACU": "ANF35",
    "PARAISOPOLIS": "ANF35",
    "PASSA QUATRO": "ANF35",
    "PASSOS": "ANF35",
    "PEDRALVA": "ANF35",
    "PERDOES": "ANF35",
    "PIRANGUCU": "ANF35",
    "PIRANGUINHO": "ANF35",
    "POCO FUNDO": "ANF35",
    "POCOS DE CALDAS": "ANF35",
    "POUSO ALEGRE": "ANF35",
    "POUSO ALTO": "ANF35",
    "PRATAPOLIS": "ANF35",
    "RIBEIRAO VERMELHO": "ANF35",
    "SANTA RITA DE CALDAS": "ANF35",
    "SANTA RITA DO SAPUCAI": "ANF35",
    "SANTANA DA VARGEM": "ANF35",
    "SANTO ANTONIO DO AMPARO": "ANF35",
    "SAO BENTO ABADE": "ANF35",
    "SAO GONCALO DO SAPUCAI": "ANF35",
    "SAO JOAO BATISTA DO GLORIA": "ANF35",
    "SAO JOAO DA MATA": "ANF35",
    "SAO JOSE DA BARRA": "ANF35",
    "SAO JOSE DO ALEGRE": "ANF35",
    "SAO LOURENCO": "ANF35",
    "SAO PEDRO DA UNIAO": "ANF35",
    "SAO SEBASTIAO DA BELA VISTA": "ANF35",
    "SAO SEBASTIAO DO PARAISO": "ANF35",
    "SAO SEBASTIAO DO RIO VERDE": "ANF35",
    "SAO THOME DAS LETRAS": "ANF35",
    "SAO TOMAS DE AQUINO": "ANF35",
    "SAO VICENTE DE MINAS": "ANF35",
    "SAPUCAI-MIRIM": "ANF35",
    "SENADOR AMARAL": "ANF35",
    "SENADOR JOSE BENTO": "ANF35",
    "SERITINGA": "ANF35",
    "SERRANIA": "ANF35",
    "SERRANOS": "ANF35",
    "SILVIANOPOLIS": "ANF35",
    "SOLEDADE DE MINAS": "ANF35",
    "TOCOS DO MOJI": "ANF35",
    "TOLEDO": "ANF35",
    "TRES CORACOES": "ANF35",
    "TRES PONTAS": "ANF35",
    "TURVOLANDIA": "ANF35",
    "VARGINHA": "ANF35",
    "VIRGINIA": "ANF35",
    "WENCESLAU BRAZ": "ANF35",
    "ABAETE": "ANF37",
    "ARAUJOS": "ANF37",
    "ARCOS": "ANF37",
    "BAMBUI": "ANF37",
    "BIQUINHAS": "ANF37",
    "BOM DESPACHO": "ANF37",
    "CAMACHO": "ANF37",
    "CAMPOS ALTOS": "ANF37",
    "CARMO DA MATA": "ANF37",
    "CARMO DO CAJURU": "ANF37",
    "CARMOPOLIS DE MINAS": "ANF37",
    "CEDRO DO ABAETE": "ANF37",
    "CLAUDIO": "ANF37",
    "CONCEICAO DO PARA": "ANF37",
    "CORREGO DANTA": "ANF37",
    "CORREGO FUNDO": "ANF37",
    "DIVINOPOLIS": "ANF37",
    "DORES DO INDAIA": "ANF37",
    "DORESOPOLIS": "ANF37",
    "ESTRELA DO INDAIA": "ANF37",
    "FORMIGA": "ANF37",
    "IGARATINGA": "ANF37",
    "IGUATAMA": "ANF37",
    "ITAGUARA": "ANF37",
    "ITAPECERICA": "ANF37",
    "ITAUNA": "ANF37",
    "JAPARAIBA": "ANF37",
    "LAGOA DA PRATA": "ANF37",
    "LEANDRO FERREIRA": "ANF37",
    "LUZ": "ANF37",
    "MARAVILHAS": "ANF37",
    "MARTINHO CAMPOS": "ANF37",
    "MEDEIROS": "ANF37",
    "MOEMA": "ANF37",
    "NOVA SERRANA": "ANF37",
    "OLIVEIRA": "ANF37",
    "ONCA DE PITANGUI": "ANF37",
    "PAINEIRAS": "ANF37",
    "PAINS": "ANF37",
    "PAPAGAIOS": "ANF37",
    "PARA DE MINAS": "ANF37",
    "PASSA TEMPO": "ANF37",
    "PEDRA DO INDAIA": "ANF37",
    "PEQUI": "ANF37",
    "PERDIGAO": "ANF37",
    "PIMENTA": "ANF37",
    "PIRACEMA": "ANF37",
    "PITANGUI": "ANF37",
    "PIUMHI": "ANF37",
    "QUARTEL GERAL": "ANF37",
    "SANTO ANTONIO DO MONTE": "ANF37",
    "SAO FRANCISCO DE PAULA": "ANF37",
    "SAO GONCALO DO PARA": "ANF37",
    "SAO JOSE DA VARGINHA": "ANF37",
    "SAO ROQUE DE MINAS": "ANF37",
    "SAO SEBASTIAO DO OESTE": "ANF37",
    "SERRA DA SAUDADE": "ANF37",
    "TAPIRAI": "ANF37",
    "VARGEM BONITA": "ANF37",
    "ARICANDUVA": "ANF38",
    "ARINOS": "ANF38",
    "AUGUSTO DE LIMA": "ANF38",
    "BERIZAL": "ANF38",
    "BOCAIUVA": "ANF38",
    "BONFINOPOLIS DE MINAS": "ANF38",
    "BONITO DE MINAS": "ANF38",
    "BOTUMIRIM": "ANF38",
    "BRASILANDIA DE MINAS": "ANF38",
    "BRASILIA DE MINAS": "ANF38",
    "BUENOPOLIS": "ANF38",
    "BURITIS": "ANF38",
    "BURITIZEIRO": "ANF38",
    "CABECEIRA GRANDE": "ANF38",
    "CAMPO AZUL": "ANF38",
    "CAPITAO ENEAS": "ANF38",
    "CARBONITA": "ANF38",
    "CATUTI": "ANF38",
    "CHAPADA GAUCHA": "ANF38",
    "CLARO DOS POCOES": "ANF38",
    "CONEGO MARINHO": "ANF38",
    "CORACAO DE JESUS": "ANF38",
    "CORINTO": "ANF38",
    "COUTO DE MAGALHAES DE MINAS": "ANF38",
    "CRISTALIA": "ANF38",
    "CURVELO": "ANF38",
    "DATAS": "ANF38",
    "DIAMANTINA": "ANF38",
    "DOM BOSCO": "ANF38",
    "ENGENHEIRO NAVARRO": "ANF38",
    "ESPINOSA": "ANF38",
    "FELICIO DOS SANTOS": "ANF38",
    "FELIXLANDIA": "ANF38",
    "FORMOSO": "ANF38",
    "FRANCISCO DUMONT": "ANF38",
    "FRANCISCO SA": "ANF38",
    "FRUTA DE LEITE": "ANF38",
    "GAMELEIRAS": "ANF38",
    "GLAUCILANDIA": "ANF38",
    "GOUVEIA": "ANF38",
    "GRAO MOGOL": "ANF38",
    "GUARACIAMA": "ANF38",
    "GUARDA-MOR": "ANF38",
    "IBIRACATU": "ANF38",
    "INDAIABIRA": "ANF38",
    "INIMUTABA": "ANF38",
    "ITACAMBIRA": "ANF38",
    "ITACARAMBI": "ANF38",
    "JAIBA": "ANF38",
    "JANAUBA": "ANF38",
    "JANUARIA": "ANF38",
    "JAPONVAR": "ANF38",
    "JEQUITAI": "ANF38",
    "JOAO PINHEIRO": "ANF38",
    "JOAQUIM FELICIO": "ANF38",
    "JOSENOPOLIS": "ANF38",
    "JURAMENTO": "ANF38",
    "JUVENILIA": "ANF38",
    "LAGOA DOS PATOS": "ANF38",
    "LASSANCE": "ANF38",
    "LONTRA": "ANF38",
    "LUISLANDIA": "ANF38",
    "MAMONAS": "ANF38",
    "MANGA": "ANF38",
    "MATIAS CARDOSO": "ANF38",
    "MATO VERDE": "ANF38",
    "MIRABELA": "ANF38",
    "MIRAVANIA": "ANF38",
    "MONJOLOS": "ANF38",
    "MONTALVANIA": "ANF38",
    "MONTE AZUL": "ANF38",
    "MONTES CLAROS": "ANF38",
    "MONTEZUMA": "ANF38",
    "MORADA NOVA DE MINAS": "ANF38",
    "MORRO DA GARCA": "ANF38",
    "NATALANDIA": "ANF38",
    "NINHEIRA": "ANF38",
    "NOVA PORTEIRINHA": "ANF38",
    "NOVORIZONTE": "ANF38",
    "OLHOS D'AGUA": "ANF38",
    "PADRE CARVALHO": "ANF38",
    "PAI PEDRO": "ANF38",
    "PARACATU": "ANF38",
    "PATIS": "ANF38",
    "PEDRAS DE MARIA DA CRUZ": "ANF38",
    "PINTOPOLIS": "ANF38",
    "PIRAPORA": "ANF38",
    "PONTO CHIQUE": "ANF38",
    "PORTEIRINHA": "ANF38",
    "PRESIDENTE JUSCELINO": "ANF38",
    "PRESIDENTE KUBITSCHEK": "ANF38",
    "RIACHINHO": "ANF38",
    "RIACHO DOS MACHADOS": "ANF38",
    "RIO PARDO DE MINAS": "ANF38",
    "RUBELITA": "ANF38",
    "SALINAS": "ANF38",
    "SANTA CRUZ DE SALINAS": "ANF38",
    "SANTA FE DE MINAS": "ANF38",
    "SANTO ANTONIO DO RETIRO": "ANF38",
    "SANTO HIPOLITO": "ANF38",
    "SAO FRANCISCO": "ANF38",
    "SAO GONCALO DO ABAETE": "ANF38",
    "SAO GONCALO DO RIO PRETO": "ANF38",
    "SAO JOAO DA LAGOA": "ANF38",
    "SAO JOAO DA PONTE": "ANF38",
    "SAO JOAO DAS MISSOES": "ANF38",
    "SAO JOAO DO PACUI": "ANF38",
    "SAO JOAO DO PARAISO": "ANF38",
    "SAO ROMAO": "ANF38",
    "SENADOR MODESTINO GONCALVES": "ANF38",
    "SERRA AZUL DE MINAS": "ANF38",
    "SERRANOPOLIS DE MINAS": "ANF38",
    "SERRO": "ANF38",
    "TAIOBEIRAS": "ANF38",
    "TRES MARIAS": "ANF38",
    "TURMALINA": "ANF38",
    "UBAI": "ANF38",
    "UNAI": "ANF38",
    "URUANA DE MINAS": "ANF38",
    "URUCUIA": "ANF38",
    "VARGEM GRANDE DO RIO PARDO": "ANF38",
    "VARJAO DE MINAS": "ANF38",
    "VARZEA DA PALMA": "ANF38",
    "VARZELANDIA": "ANF38",
    "VERDELANDIA": "ANF38",
    "VEREDINHA": "ANF38",
  };

  function mapearPorCodigoFila(texto) {
    var s = up(texto);
    if (!s) return null;
    // Padrão: "ANF31", "ANF32" … no código da fila
    var m = s.match(/ANF(3[12345678])/);
    if (m) return 'ANF' + m[1];
    return null;
  }

  function mapearRegiaoPorArea(novaArea) {
    var s = up(novaArea);
    if (!s) return 'OTHERS';
    var m = s.match(/ANF(3[12345678])/);
    if (m) return 'ANF' + m[1];
    return 'OTHERS';
  }

  function mapearRegiaoPorCoordenador(coordenador) {
    if (!coordenador) return 'OTHERS';
    var s = String(coordenador).trim().toUpperCase();
    // Correspondência direta: "ANF31" → 'ANF31'
    if (ANF_COORDENADOR[s]) return ANF_COORDENADOR[s];
    var m = s.match(/ANF(3[12345678])/);
    if (m) return 'ANF' + m[1];
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
    // Filas CCI do TMG:
    //   CENTRALIZADO TLP, CENTRALIZADO_FMT_TMG, CENTRALIZADO_TLP_(TMG_2/3)
    //   COMMAND_CENTER_FMMT_31/32/33/34/35/37/38
    var n = normalize(filaAtual);
    return (n.indexOf('CENTRALIZADO') >= 0 || n.indexOf('COMMAND_CENTER') >= 0) ? 'CCI' : 'Campo';
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

  TMG.domain = D;
})(window.TMG = window.TMG || {});
