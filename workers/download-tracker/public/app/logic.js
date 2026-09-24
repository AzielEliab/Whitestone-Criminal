(function () {
  "use strict";

  /**
   * Allowlist checked 2026-09-24. Each URL returned HTTP 200.
   * Court, public-defender, and self-help pages only.
   */
  var LINKS = [
    {
      id: "uscourts",
      title: "United States Courts",
      href: "https://www.uscourts.gov/",
      note: "Federal court site.",
    },
    {
      id: "defenders",
      title: "Defender Services",
      href: "https://www.uscourts.gov/about-federal-courts/defender-services",
      note: "United States Courts page on federal appointed counsel.",
    },
    {
      id: "forms",
      title: "Forms and rules",
      href: "https://www.uscourts.gov/forms-rules",
      note: "Federal forms and rules published by United States Courts.",
    },
    {
      id: "ca",
      title: "California Courts self-help: criminal court",
      href: "https://selfhelp.courts.ca.gov/criminal-court",
      note: "California Courts self-help guide. California only.",
    },
    {
      id: "tx",
      title: "Texas Judicial Branch",
      href: "https://www.txcourts.gov/",
      note: "Texas state courts.",
    },
    {
      id: "il",
      title: "Illinois Courts",
      href: "https://www.illinoiscourts.gov/",
      note: "Illinois state courts.",
    },
    {
      id: "fl",
      title: "Florida Courts",
      href: "https://www.flcourts.gov/",
      note: "Florida state courts.",
    },
    {
      id: "wa",
      title: "Washington State Courts",
      href: "https://www.courts.wa.gov/",
      note: "Washington state courts.",
    },
    {
      id: "az",
      title: "Arizona Judicial Branch",
      href: "https://www.azcourts.gov/",
      note: "Arizona state courts.",
    },
    {
      id: "pa",
      title: "Pennsylvania Unified Judicial System",
      href: "https://www.pacourts.us/",
      note: "Pennsylvania state courts.",
    },
  ];

  var ROUTES = [
    {
      id: "lawyer",
      label: "I need a lawyer and cannot pay",
      text: "Defender Services, on the United States Courts site, describes appointed counsel in federal court. State courts list their own public defender offices. This page does not appoint a lawyer.",
      linkIds: ["defenders", "uscourts", "ca", "tx", "il", "fl", "wa", "az", "pa"],
    },
    {
      id: "papers",
      label: "I have papers from the court",
      text: "The court name, case number, and dates printed on those papers are the court's record. You can type them into the notes here. Wipe clears the notes. Closing the tab clears them too.",
      linkIds: ["uscourts", "forms"],
    },
    {
      id: "rules",
      label: "I want the public rules and forms",
      text: "United States Courts publishes federal forms and rules. A state link is only for that state.",
      linkIds: ["forms", "ca", "tx", "il", "fl", "wa", "az", "pa"],
    },
  ];

  var NOTE_LIMIT = 8000;
  var UPLOAD_BYTES = 256 * 1024;
  var UPLOAD_CHARS = 32000;

  function linkById(id) {
    for (var i = 0; i < LINKS.length; i++) {
      if (LINKS[i].id === id) return LINKS[i];
    }
    return null;
  }

  function isAllowlisted(href) {
    for (var i = 0; i < LINKS.length; i++) {
      if (LINKS[i].href === href) return true;
    }
    return false;
  }

  function emptySession() {
    return { note: "", routeId: "lawyer", upload: null };
  }

  function wipe() {
    return emptySession();
  }

  function normalizeSession(value) {
    var base = emptySession();
    if (!value || typeof value !== "object") return base;
    base.note = typeof value.note === "string" ? value.note.slice(0, NOTE_LIMIT) : "";
    if (typeof value.routeId === "string" && routeById(value.routeId)) base.routeId = value.routeId;
    if (value.upload && typeof value.upload === "object" && typeof value.upload.name === "string") {
      base.upload = {
        name: value.upload.name.slice(0, 240),
        text: typeof value.upload.text === "string" ? value.upload.text.slice(0, UPLOAD_CHARS) : "",
        truncated: value.upload.truncated === true,
        message: typeof value.upload.message === "string" ? value.upload.message.slice(0, 400) : "",
      };
    }
    return base;
  }

  function routeById(id) {
    for (var i = 0; i < ROUTES.length; i++) {
      if (ROUTES[i].id === id) return ROUTES[i];
    }
    return null;
  }

  function withNote(session, note) {
    var next = normalizeSession(session);
    next.note = String(note == null ? "" : note).slice(0, NOTE_LIMIT);
    return next;
  }

  function selectRoute(session, routeId) {
    var next = normalizeSession(session);
    if (routeById(routeId)) next.routeId = routeId;
    return next;
  }

  function textFile(name, type) {
    var lower = String(name || "").toLowerCase();
    var mime = String(type || "").toLowerCase();
    return mime.indexOf("text/") === 0 || lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".csv");
  }

  function readUpload(file) {
    if (!file || typeof file.name !== "string" || !file.name) {
      return { ok: false, message: "Choose a file on this computer." };
    }
    var size = Number(file.size);
    if (!Number.isFinite(size) || size < 0) size = 0;
    if (size > UPLOAD_BYTES) {
      return {
        ok: false,
        message: "This page reads text files up to 256 KB. That file was not uploaded.",
      };
    }
    if (!textFile(file.name, file.type)) {
      return {
        ok: false,
        message: "This page shows .txt, .md, and .csv files. That file stayed on this computer and was not uploaded.",
      };
    }
    var text = String(file.text == null ? "" : file.text);
    var truncated = text.length > UPLOAD_CHARS;
    return {
      ok: true,
      upload: {
        name: file.name.slice(0, 240),
        text: text.slice(0, UPLOAD_CHARS),
        truncated: truncated,
        message: truncated
          ? "Showing the first part of the file. It was not uploaded."
          : "Showing the file here. It was not uploaded.",
      },
    };
  }

  function withUploadResult(session, result) {
    var next = normalizeSession(session);
    if (!result || result.ok !== true) {
      next.upload = {
        name: "",
        text: "",
        truncated: false,
        message: result && result.message ? String(result.message) : "Choose a file on this computer.",
      };
      return next;
    }
    next.upload = result.upload;
    return next;
  }

  function linksForRoute(routeId) {
    var route = routeById(routeId) || ROUTES[0];
    var out = [];
    for (var i = 0; i < route.linkIds.length; i++) {
      var link = linkById(route.linkIds[i]);
      if (link && isAllowlisted(link.href)) out.push(link);
    }
    return out;
  }

  globalThis.WhitestoneCriminal = {
    LINKS: LINKS,
    ROUTES: ROUTES,
    NOTE_LIMIT: NOTE_LIMIT,
    UPLOAD_BYTES: UPLOAD_BYTES,
    emptySession: emptySession,
    wipe: wipe,
    normalizeSession: normalizeSession,
    withNote: withNote,
    selectRoute: selectRoute,
    readUpload: readUpload,
    withUploadResult: withUploadResult,
    isAllowlisted: isAllowlisted,
    linksForRoute: linksForRoute,
    routeById: routeById,
  };
})();
