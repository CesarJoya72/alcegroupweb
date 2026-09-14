/* =========================================================
   Alce — JavaScript vanilla, sin dependencias.
   1) Menú móvil accesible.
   2) Fade-in suave de secciones (IntersectionObserver).
   3) Resaltado del ítem de navegación activo.
   Todo degrada con elegancia: sin JS, la web se ve y se lee igual.
   ========================================================= */
(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ----------------------------------------------------------
     1) MENÚ MÓVIL
     ---------------------------------------------------------- */
  var nav = document.getElementById("site-nav");
  var toggle = nav ? nav.querySelector(".nav-toggle") : null;
  var navList = document.getElementById("nav-list");

  function closeMenu() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    if (!nav || !toggle) return;
    nav.classList.add("is-open");
    toggle.setAttribute("aria-expanded", "true");
  }

  if (toggle && nav && navList) {
    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      if (expanded) { closeMenu(); } else { openMenu(); }
    });

    // Al pulsar un enlace, cierra el menú (navegación en una sola página).
    navList.addEventListener("click", function (e) {
      if (e.target.closest("a")) { closeMenu(); }
    });

    // Escape cierra el menú y devuelve el foco al botón.
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });

    // Si se agranda la ventana por encima del breakpoint, asegúrate de dejarlo cerrado.
    var mq = window.matchMedia("(min-width: 761px)");
    var onChange = function () { if (mq.matches) { closeMenu(); } };
    if (mq.addEventListener) { mq.addEventListener("change", onChange); }
    else if (mq.addListener) { mq.addListener(onChange); }
  }

  /* ----------------------------------------------------------
     2) FADE-IN DE SECCIONES
     ---------------------------------------------------------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    // Sin animación: muestra todo de inmediato.
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     3) NAVEGACIÓN ACTIVA
     Marca aria-current en el enlace de la sección visible.
     ---------------------------------------------------------- */
  var navLinks = navList
    ? Array.prototype.slice.call(navList.querySelectorAll('a[href^="#"]'))
    : [];

  if (navLinks.length && "IntersectionObserver" in window) {
    var linkById = {};
    var sections = [];

    navLinks.forEach(function (link) {
      var id = link.getAttribute("href").slice(1);
      var section = document.getElementById(id);
      if (section) {
        linkById[id] = link;
        sections.push(section);
      }
    });

    function setCurrent(id) {
      navLinks.forEach(function (link) {
        var isCurrent = link.getAttribute("href") === "#" + id;
        if (isCurrent) { link.setAttribute("aria-current", "true"); }
        else { link.removeAttribute("aria-current"); }
      });
    }

    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { setCurrent(entry.target.id); }
      });
    }, {
      // La sección "activa" es la que cruza la banda central del viewport.
      rootMargin: "-45% 0px -50% 0px",
      threshold: 0
    });

    sections.forEach(function (section) { spy.observe(section); });
  }

  /* ----------------------------------------------------------
     4) TABLA COMPARATIVA: FILAS DE IGUAL ALTURA
     En escritorio, iguala todas las filas a la más alta.
     En móvil la tabla pasa a tarjetas y no se toca.
     ---------------------------------------------------------- */
  var cmpRows = Array.prototype.slice.call(document.querySelectorAll(".cmp tbody tr"));

  if (cmpRows.length) {
    var desktop = window.matchMedia("(min-width: 761px)");

    function equalizeRows() {
      cmpRows.forEach(function (row) { row.style.height = ""; });
      if (!desktop.matches) return;
      var max = 0;
      cmpRows.forEach(function (row) { max = Math.max(max, row.getBoundingClientRect().height); });
      cmpRows.forEach(function (row) { row.style.height = max + "px"; });
    }

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(equalizeRows, 100);
    });
    window.addEventListener("load", equalizeRows);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(equalizeRows); }
    equalizeRows();
  }

  /* ----------------------------------------------------------
     5) FORMULARIO DE CONTACTO
     El endpoint se configura en el atributo "action" del <form>
     (ver comentario FORM_ENDPOINT en cada index.html). Mientras el
     action sea un mailto:, no se intercepta: el navegador abre el
     correo del visitante con los campos (funciona también sin JS).
     Con una URL de servicio de formularios, se envía por fetch y
     se sustituye el formulario por la confirmación, sin salir de
     la página. Antispam: honeypot + rechazo de envíos en < 3 s.
     ---------------------------------------------------------- */
  var form = document.getElementById("contact-form");

  if (form && window.fetch && !/^mailto:/i.test(form.getAttribute("action") || "")) {
    var loadedAt = Date.now();
    var okMsg = document.querySelector(".form-status--ok");
    var errMsg = form.querySelector(".form-status--error");
    var submitBtn = form.querySelector('[type="submit"]');

    var showOk = function () {
      form.hidden = true;
      if (okMsg) {
        okMsg.hidden = false;
        okMsg.setAttribute("tabindex", "-1");
        okMsg.focus();
      }
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errMsg) { errMsg.hidden = true; }

      // Bots: campo trampa relleno o envío demasiado rápido. No se envía nada.
      var trap = form.querySelector('[name="_gotcha"]');
      if ((trap && trap.value) || Date.now() - loadedAt < 3000) { showOk(); return; }

      if (submitBtn) { submitBtn.disabled = true; }
      fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { "Accept": "application/json" }
      })
        .then(function (res) {
          if (!res.ok) { throw new Error(String(res.status)); }
          showOk();
        })
        .catch(function () {
          if (errMsg) { errMsg.hidden = false; }
          if (submitBtn) { submitBtn.disabled = false; }
        });
    });
  }
})();
