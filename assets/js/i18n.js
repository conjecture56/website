const STORAGE_KEY = "conjecture56-language";
const COOKIE_NAME = "conjecture56_language";
const SUPPORTED_LANGUAGES = new Set(["en", "es"]);

const translations = {
  en: {
    "common.english": "English",
    "keys.show": "Show",
    "keys.showAria": "Show API key",
    "role.lead": "Lead",
    "role.contributor": "Contributor",
    "role.curator": "Curator",
    "details.status": "Status",
    "details.collaborationType": "Collaboration type",
    "details.role": "Conjecture 56 role",
    "details.lastVerified": "Last verified",
    "details.attribution": "Attribution",
    "details.deliveredWork": "Delivered work",
    "details.availableWork": "Available work",
    "details.skills": "Skills",
    "details.domains": "Domains",
    "details.beforeStarting": "Before starting",
    "details.noCaveats": "No additional caveats recorded.",
    "details.participation": "View participation information",
    "details.source": "View primary source",
    "details.unavailable": "unavailable",
    "status.backlog": "Backlog",
    "status.todo": "Todo",
    "status.in-progress": "In progress",
    "status.in-review": "In review",
    "status.done": "Done",
    "board.domains": "Domains",
    "board.viewDetails": "View details for {title} by {organization}",
    "board.emptyStage": "No collaborations in this stage.",
    "board.noMatches": "No collaborations match this search.",
    "board.noValid": "No valid collaborations are currently available.",
    "board.loaded": "{count} collaborations loaded.{invalid}",
    "board.matches": "{filtered} of {total} collaborations match.{invalid}",
    "board.invalidOne": " 1 invalid item was omitted.",
    "board.invalidMany": " {count} invalid items were omitted.",
    "board.unknownId": "No collaboration has the ID “{id}”. {count} collaborations remain available.",
    "board.loadError": "The collaboration data could not be loaded. Try again later.",
    "board.translationFallback": " {count} Spanish translation{suffix} could not be loaded; English content is shown instead.",
    "quota.currentCycle": "current cycle",
    "quota.second": "second",
    "quota.minute": "minute",
    "quota.hour": "hour",
    "quota.day": "day",
    "quota.week": "week",
    "quota.month": "month",
    "quota.secondPlural": "seconds",
    "quota.minutePlural": "minutes",
    "quota.hourPlural": "hours",
    "quota.dayPlural": "days",
    "quota.weekPlural": "weeks",
    "quota.monthPlural": "months",
    "quota.noFixedLimit": " No fixed limit",
    "quota.of": "{current} of {maximum}",
    "quota.resets": "Resets every {duration}",
    "quota.budgetUsage": "Budget usage",
    "quota.noRateLimit": "No request or token rate limit is attached to this key.",
    "quota.requests": "Requests",
    "quota.tokens": "Tokens",
    "quota.keyLevelLimits": "key-level limits",
    "quota.default": "default",
    "quota.keyConfig": "key config",
    "quota.available": "available",
    "quota.provider": "Provider",
    "quota.per": "per {duration}",
    "quota.spend": "Spend",
    "quota.limits": "Limits",
    "quota.usesKeyAllowance": "Uses the key-level allowance",
    "quota.authenticatedKey": "Authenticated key",
    "quota.defaultKeyName": "Conjecture 56 key",
    "quota.active": "Active",
    "quota.inactive": "Inactive",
    "quota.disabledWarning": "This key is recognized but currently disabled. Contact its issuer before making API requests.",
    "quota.currentAllowance": "Current allowance",
    "quota.budget": "Budget {number}",
    "quota.modelLimits": "Model limits",
    "quota.models": "Models ({count})",
    "quota.fallbackWarning": "This key does not advertise specific models, so the gateway default is shown and used in the configuration below. If requests with it fail, contact the key issuer.",
    "quota.allModels": "All models",
    "quota.noModels": "No models are currently available to this key. Contact its issuer to enable model access.",
    "quota.invalidKey": "We couldn't recognize that key. Check it and try again.",
    "quota.expiredKey": "This key is disabled or has expired. Contact its issuer for access.",
    "quota.rateLimit": "This key has reached its current rate limit. Wait for the next reset and try again.",
    "quota.serviceUnavailable": "The quota service is temporarily unavailable. Try again in a few minutes.",
    "quota.loadError": "The data could not be loaded. Please try again.",
    "quota.enterKey": "Enter your virtual API key first.",
    "quota.checking": "Checking your key, quota, and available models…",
    "quota.loadedFallback": "Quota loaded. No advertised models, so the installer below will configure the gateway default. Your key has not been stored.",
    "quota.loaded": "Quota loaded. Run the installer below to configure OpenCode. Your key has not been stored.",
    "quota.loadedNoModels": "Quota loaded, but no named models are advertised for this key.",
    "quota.hide": "Hide",
    "quota.hideAria": "Hide API key",
    "quota.copied": "Copied",
    "quota.copyBlocked": "Copy was blocked by the browser. Select the text and copy it manually."
  },
  es: {
    "common.skip": "Ir al contenido",
    "common.homeAria": "Inicio de Conjecture 56",
    "common.navigation": "Navegación principal",
    "common.home": "Inicio",
    "common.about": "Nosotros",
    "common.collaborations": "Colaboraciones",
    "common.apiAccess": "Acceso API",
    "common.footer": "Un laboratorio independiente de ciencia de datos.",
    "common.language": "Idioma",
    "common.english": "Inglés",

    "home.title": "Conjecture 56 — Inteligencia aplicada, medida",
    "home.description": "Conjecture 56 es un laboratorio independiente de ciencia de datos que trabaja con software, datos, infraestructura, investigación y comunicación.",
    "home.ogTitle": "Conjecture 56 — Inteligencia, descrita con precisión",
    "home.ogDescription": "Un laboratorio independiente de ciencia de datos: software, datos, infraestructura, investigación y comunicación.",
    "home.heroStart": "Inteligencia,",
    "home.heroEmphasis": "descrita con precisión",
    "home.kind": "Conjecture 56 es un laboratorio independiente de ciencia de datos.",
    "home.lede": "Software, sistemas de datos e infraestructura: construidos, medidos y documentados. Cada iniciativa se materializa en un repositorio abierto o en un trabajo privado.",
    "home.openApi": "Abrir acceso API",
    "keyword.software": "Software y automatización",
    "keyword.data": "Datos y aprendizaje automático",
    "keyword.infrastructure": "Sistemas e infraestructura",
    "keyword.research": "Investigación aplicada",
    "keyword.technicalCommunication": "Comunicación técnica",
    "keyword.businessCommunication": "Comunicación empresarial",

    "about.title": "Nosotros — Conjecture 56",
    "about.description": "Acerca de Conjecture 56: un laboratorio independiente de ciencia de datos cuyo nombre remite a la conjetura de Dartmouth de 1956.",
    "about.heroStart": "Sobre",
    "about.heroEmphasis": "nosotros",
    "about.lede": "Conjecture 56 es un laboratorio independiente de ciencia de datos.",
    "about.origin": "El nombre remite a la conjetura que dio origen a la Inteligencia Artificial como campo en aquella conferencia de 1956. En su propuesta, John McCarthy escribió:",
    "about.quote": "“Proceder sobre la base de la conjetura de que cada aspecto del aprendizaje o cualquier otra característica de la inteligencia puede, en principio, describirse con tal precisión que sea posible construir una máquina que lo simule.”",
    "about.cite": "John McCarthy — propuesta para el Proyecto de Investigación de Verano de Dartmouth sobre Inteligencia Artificial, 1956",

    "collaborations.title": "Colaboraciones — Conjecture 56",
    "collaborations.description": "Explorá colaboraciones abiertas de ciencia de datos, IA, ingeniería de datos y ciencia abierta investigadas por Conjecture 56.",
    "collaborations.heroStart": "Colaboraciones,",
    "collaborations.heroEmphasis": "seleccionadas cuidadosamente",
    "collaborations.intro": "Trabajo de ciencia de datos, IA, ingeniería de datos, datos abiertos y ciencia abierta que Conjecture 56 lidera, en el que contribuye o que investigó cuidadosamente.",
    "collaborations.boardTitle": "Tablero de colaboraciones",
    "collaborations.boardDescription": "Cada elemento indica si Conjecture 56 lidera, contribuye o realiza la curaduría del trabajo.",
    "collaborations.loading": "Cargando colaboraciones…",
    "collaborations.search": "Buscar colaboraciones",
    "collaborations.searchPlaceholder": "Organización, dominio, habilidad…",
    "collaborations.clear": "Limpiar",
    "collaborations.boardAria": "Tablero de colaboraciones con cinco columnas de estado.",
    "collaborations.noMatches": "Ninguna colaboración coincide con esta búsqueda.",
    "collaborations.noScript": "Se necesita JavaScript para cargar los datos editoriales de colaboraciones.",
    "collaborations.criteriaTitle": "Cómo se seleccionan las colaboraciones",
    "collaborations.criteriaLead": "El tablero contiene trabajo concreto centrado en datos, no un directorio de organizaciones interesantes. La evidencia y la atribución deben coincidir con el rol real de Conjecture 56.",
    "collaborations.currentLabel": "Actual:",
    "collaborations.currentText": "la evidencia reciente respalda el estado indicado, el trabajo disponible y los resultados entregados.",
    "collaborations.clearLabel": "Claro:",
    "collaborations.clearText": "la titularidad, la atribución, las condiciones de participación y el rol de Conjecture 56 son explícitos.",
    "collaborations.boundedLabel": "Acotado:",
    "collaborations.boundedText": "una contribución útil puede completarse aproximadamente en dos a cuatro semanas.",
    "collaborations.verifiableLabel": "Verificable:",
    "collaborations.verifiableText": "existe un resultado visible y se comprenden las restricciones de licencia, asignación, dominio y datos.",
    "collaborations.exclusions": "Se excluyen competencias, empleos formales, repositorios inactivos, comunidades genéricas y proyectos especulativos no solicitados.",
    "collaborations.details": "Detalles de la colaboración",
    "collaborations.closeAria": "Cerrar detalles de la colaboración",
    "collaborations.close": "Cerrar",

    "keys.title": "Acceso API — Conjecture 56",
    "keys.description": "Consultá tu cuota de API de Conjecture 56 y generá una configuración de OpenCode lista para usar.",
    "keys.heroStart": "Tu acceso,",
    "keys.heroEmphasis": "de un vistazo",
    "keys.intro": "Consultá los límites actuales asociados con tu clave API de Conjecture 56.",
    "keys.inspectStep": "01 / Consultar",
    "keys.quotaTitle": "Consultá tu cuota",
    "keys.virtualKey": "Clave API virtual",
    "keys.show": "Mostrar",
    "keys.showAria": "Mostrar clave API",
    "keys.inspectQuota": "Consultar cuota",
    "keys.clearData": "Borrar datos",
    "keys.connectStep": "02 / Conectar",
    "keys.configure": "Configurar OpenCode",
    "keys.configureLead": "El instalador guarda tu clave API dentro del archivo de configuración de OpenCode elegido en este equipo.",
    "keys.runInstaller": "Ejecutá el instalador",
    "keys.installerDescription": "Pegá tu clave cuando se solicite (la entrada permanece oculta). El instalador detecta tu versión de OpenCode (V1 o V2) y su archivo de configuración, agrega el proveedor con todos los modelos disponibles para tu clave y primero crea una copia de seguridad. Necesita python3, node, bun o jq.",
    "keys.terminal": "Terminal",
    "keys.copy": "Copiar",

    "notFound.title": "Página no encontrada — Conjecture 56",
    "notFound.description": "No se pudo encontrar la página solicitada.",
    "notFound.heroStart": "Este resultado es",
    "notFound.heroEmphasis": "inconcluso",
    "notFound.lede": "La página puede haberse movido o la dirección puede contener un error.",
    "notFound.signal": "404 / Sin señal",
    "notFound.return": "Volver al laboratorio",

    "role.lead": "Lidera",
    "role.contributor": "Contribuye",
    "role.curator": "Realiza curaduría",
    "details.status": "Estado",
    "details.collaborationType": "Tipo de colaboración",
    "details.role": "Rol de Conjecture 56",
    "details.lastVerified": "Última verificación",
    "details.attribution": "Atribución",
    "details.deliveredWork": "Trabajo entregado",
    "details.availableWork": "Trabajo disponible",
    "details.skills": "Habilidades",
    "details.domains": "Dominios",
    "details.beforeStarting": "Antes de comenzar",
    "details.noCaveats": "No se registraron advertencias adicionales.",
    "details.participation": "Ver información de participación",
    "details.source": "Ver fuente primaria",
    "details.unavailable": "no disponible",
    "status.backlog": "Pendiente",
    "status.todo": "Por hacer",
    "status.in-progress": "En curso",
    "status.in-review": "En revisión",
    "status.done": "Finalizado",
    "board.domains": "Dominios",
    "board.viewDetails": "Ver detalles de {title}, de {organization}",
    "board.emptyStage": "No hay colaboraciones en esta etapa.",
    "board.noMatches": "Ninguna colaboración coincide con esta búsqueda.",
    "board.noValid": "Actualmente no hay colaboraciones válidas disponibles.",
    "board.loaded": "Se cargaron {count} colaboraciones.{invalid}",
    "board.matches": "{filtered} de {total} colaboraciones coinciden.{invalid}",
    "board.invalidOne": " Se omitió 1 elemento inválido.",
    "board.invalidMany": " Se omitieron {count} elementos inválidos.",
    "board.unknownId": "Ninguna colaboración tiene el ID “{id}”. Quedan {count} colaboraciones disponibles.",
    "board.loadError": "No se pudieron cargar los datos de colaboraciones. Intentá nuevamente más tarde.",
    "board.translationFallback": " No se pudieron cargar {count} {noun} al español; se muestra el contenido en inglés.",

    "quota.currentCycle": "ciclo actual",
    "quota.second": "segundo",
    "quota.minute": "minuto",
    "quota.hour": "hora",
    "quota.day": "día",
    "quota.week": "semana",
    "quota.month": "mes",
    "quota.secondPlural": "segundos",
    "quota.minutePlural": "minutos",
    "quota.hourPlural": "horas",
    "quota.dayPlural": "días",
    "quota.weekPlural": "semanas",
    "quota.monthPlural": "meses",
    "quota.noFixedLimit": " Sin límite fijo",
    "quota.of": "{current} de {maximum}",
    "quota.resets": "Se reinicia cada {duration}",
    "quota.budgetUsage": "Uso del presupuesto",
    "quota.noRateLimit": "Esta clave no tiene asociado un límite de solicitudes o tokens.",
    "quota.requests": "Solicitudes",
    "quota.tokens": "Tokens",
    "quota.keyLevelLimits": "límites de la clave",
    "quota.default": "predeterminado",
    "quota.keyConfig": "configuración de la clave",
    "quota.available": "disponible",
    "quota.provider": "Proveedor",
    "quota.per": "por {duration}",
    "quota.spend": "Gasto",
    "quota.limits": "Límites",
    "quota.usesKeyAllowance": "Usa la asignación general de la clave",
    "quota.authenticatedKey": "Clave autenticada",
    "quota.defaultKeyName": "Clave de Conjecture 56",
    "quota.active": "Activa",
    "quota.inactive": "Inactiva",
    "quota.disabledWarning": "La clave fue reconocida, pero está desactivada. Contactá a quien la emitió antes de realizar solicitudes a la API.",
    "quota.currentAllowance": "Asignación actual",
    "quota.budget": "Presupuesto {number}",
    "quota.modelLimits": "Límites de modelos",
    "quota.models": "Modelos ({count})",
    "quota.fallbackWarning": "Esta clave no anuncia modelos específicos, por lo que se muestra y utiliza el modelo predeterminado de la puerta de enlace en la configuración siguiente. Si las solicitudes fallan, contactá a quien emitió la clave.",
    "quota.allModels": "Todos los modelos",
    "quota.noModels": "Actualmente esta clave no tiene modelos disponibles. Contactá a quien la emitió para habilitar el acceso.",
    "quota.invalidKey": "No pudimos reconocer esa clave. Revisala e intentá nuevamente.",
    "quota.expiredKey": "Esta clave está desactivada o venció. Contactá a quien la emitió para obtener acceso.",
    "quota.rateLimit": "Esta clave alcanzó su límite actual. Esperá al próximo reinicio e intentá nuevamente.",
    "quota.serviceUnavailable": "El servicio de cuotas no está disponible temporalmente. Intentá nuevamente en unos minutos.",
    "quota.loadError": "No se pudieron cargar los datos. Intentá nuevamente.",
    "quota.enterKey": "Ingresá primero tu clave API virtual.",
    "quota.checking": "Verificando tu clave, cuota y modelos disponibles…",
    "quota.loadedFallback": "Cuota cargada. No se anunciaron modelos, por lo que el instalador configurará el modelo predeterminado de la puerta de enlace. Tu clave no fue almacenada.",
    "quota.loaded": "Cuota cargada. Ejecutá el instalador para configurar OpenCode. Tu clave no fue almacenada.",
    "quota.loadedNoModels": "Cuota cargada, pero no se anuncian modelos para esta clave.",
    "quota.hide": "Ocultar",
    "quota.hideAria": "Ocultar clave API",
    "quota.copied": "Copiado",
    "quota.copyBlocked": "El navegador bloqueó la copia. Seleccioná el texto y copialo manualmente."
  },
};

function storedLanguage() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED_LANGUAGES.has(value)) return value;
  } catch {
    // Fall back to browser preferences when storage is unavailable.
  }
  try {
    const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
    const cookieValue = cookie?.split("=")[1];
    if (SUPPORTED_LANGUAGES.has(cookieValue)) return cookieValue;
  } catch {
    // Continue to the primary browser preference when cookies are unavailable.
  }
  return navigator.languages?.[0]?.toLowerCase().startsWith("es") ? "es" : "en";
}

let language = storedLanguage();

export function getLanguage() {
  return language;
}

export function t(key, replacements = {}) {
  let value = translations[language]?.[key] ?? null;
  if (value === null) return key;
  for (const [name, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{${name}}`, String(replacement));
  }
  return value;
}

export function localized(value) {
  if (language === "es" && value?.es !== undefined) return value.es;
  return value?.en ?? value;
}

export function numberFormatter(options = {}) {
  return new Intl.NumberFormat(language === "es" ? "es-AR" : "en-US", options);
}

function translateDocument() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const value = t(node.dataset.i18n);
    if (value !== node.dataset.i18n) node.textContent = value;
  });
  document.querySelectorAll("[data-i18n-content]").forEach((node) => {
    const value = t(node.dataset.i18nContent);
    if (value !== node.dataset.i18nContent) node.setAttribute("content", value);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    const value = t(node.dataset.i18nAriaLabel);
    if (value !== node.dataset.i18nAriaLabel) node.setAttribute("aria-label", value);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const value = t(node.dataset.i18nPlaceholder);
    if (value !== node.dataset.i18nPlaceholder) node.setAttribute("placeholder", value);
  });

  const selector = document.querySelector("#language-selector");
  if (selector) selector.value = language;
}

function persistLanguage(value) {
  language = value;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // A first-party cookie keeps the preference across static routes as a fallback.
  }
  try {
    document.cookie = `${COOKIE_NAME}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
  } catch {
    // The current page still uses the selection even if persistence is unavailable.
  }
}

translateDocument();

document.querySelector("#language-selector")?.addEventListener("change", (event) => {
  const value = event.currentTarget.value;
  if (!SUPPORTED_LANGUAGES.has(value) || value === language) return;
  persistLanguage(value);
  window.location.reload();
});
