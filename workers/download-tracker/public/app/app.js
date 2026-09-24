(function () {
  "use strict";

  var api = globalThis.WhitestoneCriminal;
  var KEY = "whitestone-criminal-session";
  var noteEl = document.getElementById("note");
  var wipeEl = document.getElementById("wipe");
  var routesEl = document.getElementById("routes");
  var detailEl = document.getElementById("detail");
  var fileEl = document.getElementById("file");
  var uploadEl = document.getElementById("upload-out");
  var linksEl = document.getElementById("links");
  var statusEl = document.getElementById("status");

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (!raw) return api.emptySession();
      return api.normalizeSession(JSON.parse(raw));
    } catch (err) {
      return api.emptySession();
    }
  }

  function save(session) {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(session));
    } catch (err) {
      statusEl.textContent = "This browser did not keep the latest notes.";
    }
  }

  var session = load();

  function addLink(parent, link) {
    var li = document.createElement("li");
    var a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.title;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    li.appendChild(a);
    var note = document.createElement("span");
    note.className = "link-note";
    note.textContent = " " + link.note;
    li.appendChild(note);
    parent.appendChild(li);
  }

  function renderLinks() {
    linksEl.replaceChildren();
    for (var i = 0; i < api.LINKS.length; i++) addLink(linksEl, api.LINKS[i]);
  }

  function renderRoutes() {
    routesEl.replaceChildren();
    for (var i = 0; i < api.ROUTES.length; i++) {
      var route = api.ROUTES[i];
      var label = document.createElement("label");
      label.className = "choice";
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "route";
      input.value = route.id;
      input.checked = session.routeId === route.id;
      label.appendChild(input);
      var span = document.createElement("span");
      span.textContent = route.label;
      label.appendChild(span);
      routesEl.appendChild(label);
    }
  }

  function renderDetail() {
    var route = api.routeById(session.routeId) || api.ROUTES[0];
    detailEl.replaceChildren();
    var p = document.createElement("p");
    p.textContent = route.text;
    detailEl.appendChild(p);
    var list = document.createElement("ul");
    var links = api.linksForRoute(route.id);
    for (var i = 0; i < links.length; i++) addLink(list, links[i]);
    detailEl.appendChild(list);
  }

  function renderUpload() {
    uploadEl.replaceChildren();
    if (!session.upload) return;
    var msg = document.createElement("p");
    msg.textContent = session.upload.message || "";
    uploadEl.appendChild(msg);
    if (session.upload.name) {
      var name = document.createElement("p");
      name.className = "file-name";
      name.textContent = session.upload.name;
      uploadEl.appendChild(name);
    }
    if (session.upload.text) {
      var pre = document.createElement("pre");
      pre.textContent = session.upload.text;
      uploadEl.appendChild(pre);
    }
  }

  function render() {
    if (document.activeElement !== noteEl) noteEl.value = session.note;
    renderRoutes();
    renderDetail();
    renderUpload();
  }

  routesEl.addEventListener("change", function (event) {
    var target = event.target;
    if (!target || target.name !== "route") return;
    session = api.selectRoute(session, target.value);
    save(session);
    renderDetail();
  });

  noteEl.addEventListener("input", function () {
    session = api.withNote(session, noteEl.value);
    save(session);
  });

  wipeEl.addEventListener("click", function () {
    session = api.wipe();
    save(session);
    fileEl.value = "";
    statusEl.textContent = "Notes cleared in this tab.";
    render();
    noteEl.focus();
  });

  fileEl.addEventListener("change", function () {
    var file = fileEl.files && fileEl.files[0];
    if (!file) return;
    var result = api.readUpload({
      name: file.name,
      type: file.type || "",
      size: file.size,
      text: "",
    });
    if (!result.ok) {
      session = api.withUploadResult(session, result);
      save(session);
      statusEl.textContent = result.message;
      renderUpload();
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var read = api.readUpload({
        name: file.name,
        type: file.type || "",
        size: file.size,
        text: String(reader.result || ""),
      });
      session = api.withUploadResult(session, read);
      save(session);
      statusEl.textContent = read.ok ? read.upload.message : read.message;
      renderUpload();
    };
    reader.onerror = function () {
      statusEl.textContent = "This browser could not read that file. It was not uploaded.";
    };
    reader.readAsText(file);
  });

  renderLinks();
  render();
})();
