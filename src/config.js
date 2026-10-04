// Первая строка обязана быть комментарием.
//
// Автоскрытие панелей Firefox — в полноэкранном и в обычном оконном режиме.
//
// Адресная строка (сверху):
//  • появляется, если подержать курсор у верхнего края, плавно выезжает
//    и плавно уезжает, когда курсор уходит вниз на страницу;
//  • сама появляется при Cmd+L, Cmd+T и т. п., пока в ней печатаешь;
//  • хоткей закрепляет её (видна всегда) / открепляет.
//
// Боковая панель (вкладки):
//  • появляется, если подержать курсор у бокового края, плавно выезжает
//    и так же плавно уезжает, когда курсор уходит на страницу;
//  • свой хоткей закрепляет / открепляет её.
//
// В полноэкранном режиме «край» — граница экрана, в окне — полоска
// в несколько пикселей внутри окна у его границы. Закрепление запоминается
// и у каждого режима своё.
//
// Настройки в about:config (создать, если нужно поменять):
//   uc.autohide.windowed         логический автоскрытие в окне              (true)
//   uc.autohide.reveal_delay     число  задержка у края, мс                (300)
//   uc.autohide.window_edge      число  ширина «края» в окне, px            (6)
//   uc.autohide.sidebar_anim_ms  число  выезд боковой панели, мс           (450)
//   uc.autohide.sidebar_hide_ms  число  скрытие боковой панели, мс         (300)
//   uc.autohide.key_modifiers    строка модификаторы хоткеев               (control)
//   uc.autohide.urlbar_key       строка буква хоткея адресной строки       (L)
//   uc.autohide.sidebar_key      строка буква хоткея боковой панели        (S)
// В полноэкранном режиме автоскрытие включает галочка Firefox
// «Скрыть панели инструментов». Хоткеи читаются при запуске Firefox,
// остальное — сразу. Параметры *_pinned скрипт ведёт сам.

try {
  const P = "uc.autohide.";

  // Перенос настроек из прошлой версии (uc.fullscreen.*)
  try {
    const OLD = "uc.fullscreen.";
    const RENAME = { urlbar_pinned: "fullscreen.urlbar_pinned", sidebar_pinned: "fullscreen.sidebar_pinned" };
    for (const name of Services.prefs.getChildList(OLD)) {
      if (!Services.prefs.prefHasUserValue(name)) continue;
      const short = name.slice(OLD.length);
      const target = P + (RENAME[short] || short);
      if (!Services.prefs.prefHasUserValue(target)) {
        switch (Services.prefs.getPrefType(name)) {
          case Services.prefs.PREF_INT:
            Services.prefs.setIntPref(target, Services.prefs.getIntPref(name));
            break;
          case Services.prefs.PREF_BOOL:
            Services.prefs.setBoolPref(target, Services.prefs.getBoolPref(name));
            break;
          case Services.prefs.PREF_STRING:
            Services.prefs.setStringPref(target, Services.prefs.getStringPref(name));
            break;
        }
      }
      Services.prefs.clearUserPref(name);
    }
  } catch (e) {
    Cu.reportError(e);
  }

  const int = (name, def) => Services.prefs.getIntPref(P + name, def);
  const str = (name, def) => Services.prefs.getStringPref(P + name, def);
  const bool = (name, def) => Services.prefs.getBoolPref(P + name, def);

  const EASE_IN = "cubic-bezier(0.33, 1, 0.68, 1)"; // выезд: плавное замедление до упора
  const EASE_OUT = "cubic-bezier(0.4, 0, 0.2, 1)"; // скрытие: мягко трогается и мягко уходит
  const FS_EDGE = 2; // полноэкранный режим: край экрана, px
  const ZONE = 12; // насколько курсор может «дрожать» у края во время задержки, px
  const BAND = 40; // запас под адресной строкой, прежде чем она уедет, px
  const SIDE_BAND = 8; // запас справа от боковой панели, px

  // Стили, которые прячут панели по пометкам скрипта. Подключаются к окну
  // браузера на уровне userChrome.css, но сам userChrome.css не нужен.
  const CSS = `
  :root {
    --uc-ah-show: 0.38s; /* выезд адресной строки */
    --uc-ah-hide: 0.3s;  /* скрытие адресной строки */
    --uc-ah-ease: cubic-bezier(0.33, 1, 0.68, 1);   /* выезд: плавное замедление */
    --uc-ah-ease-out: cubic-bezier(0.4, 0, 0.2, 1); /* скрытие: мягко с обеих сторон */
  }

  /* ---------- Адресная строка ---------- */

  /* Спрятана за верхним краем, пока скрипт её не покажет */
  :root[ucAutohide]:not([inDOMFullscreen]) #navigator-toolbox {
    margin-top: calc(-1 * var(--uc-toolbox-h, 0px)) !important;
    transition: margin-top var(--uc-ah-hide) var(--uc-ah-ease-out) !important;
  }

  :root[ucAutohide][ucUrlbarOpen]:not([inDOMFullscreen]) #navigator-toolbox {
    margin-top: 0 !important;
    transition: margin-top var(--uc-ah-show) var(--uc-ah-ease) !important;
  }

  /* После выхода из видео во весь экран — без анимации (атрибут повторён,
     чтобы правило было сильнее двух правил выше) */
  :root[ucNoTransition][ucNoTransition][ucNoTransition][ucNoTransition] #navigator-toolbox {
    transition: none !important;
  }

  /* ---------- Боковая панель ---------- */

  /* Спрятана (во время анимации скрытия правило не действует — ширину
     плавно сводит к нулю скрипт) */
  :root[ucAutohide][ucSidebarHidden]:not([ucSidebarAnimating], [inDOMFullscreen]) #sidebar-container {
    content-visibility: hidden !important;
    flex-basis: 0 !important;
    min-width: 0 !important;
  }

  :root[ucAutohide][ucSidebarHidden]:not([inDOMFullscreen]) #sidebar-launcher-splitter {
    visibility: collapse !important;
  }

  /* Полоска Firefox у верхнего края не нужна: край отслеживает скрипт */
  :root[ucAutohide] #fullscr-toggler {
    display: none !important;
  }

  @media (prefers-reduced-motion: reduce) {
    :root {
      --uc-ah-show: 1ms;
      --uc-ah-hide: 1ms;
    }
  }
`;

  function patch(win) {
    const doc = win.document;
    const root = doc.documentElement;
    const FS = win.FullScreen;
    const MPT = win.MousePosTracker;
    const toolbox = win.gNavToolbox;
    if (!FS || !MPT || !toolbox || FS._ucPatched) return;
    FS._ucPatched = true;

    try {
      win.windowUtils.loadSheetUsingURIString(
        "data:text/css;charset=utf-8," + encodeURIComponent(CSS),
        win.windowUtils.USER_SHEET
      );
    } catch (e) {
      Cu.reportError(e);
    }

    const real = {
      show: FS.showNavToolbox,
      shift: FS.shiftMacToolbarDown,
      toggle: FS.toggle,
      expand: FS._expandCallback,
    };

    const reducedMotion = () => win.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointerIn = r =>
      !!r && MPT._x >= r.left && MPT._x <= r.right && MPT._y >= r.top && MPT._y <= r.bottom;
    const pointerInWindow = () =>
      win.fullScreen ||
      (MPT._x >= 0 && MPT._y >= 0 && MPT._x <= win.innerWidth && MPT._y <= win.innerHeight);
    const clampToWindow = r => ({
      top: Math.max(r.top, 0),
      bottom: Math.min(r.bottom, win.innerHeight),
      left: Math.max(r.left, 0),
      right: Math.min(r.right, win.innerWidth),
    });
    function deepActive() {
      let a = doc.activeElement;
      while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
      return a;
    }
    const isTextInput = a =>
      !!a && (a.localName === "input" || a.localName === "textarea" || a.isContentEditable);

    // Закрепление у каждого режима своё
    const pinPref = name => `${P}${win.fullScreen ? "fullscreen" : "window"}.${name}_pinned`;
    const getPin = name => Services.prefs.getBoolPref(pinPref(name), false);
    const setPin = (name, v) => Services.prefs.setBoolPref(pinPref(name), v);

    // ================================================================ режим

    const domFS = () => !!doc.fullscreenElement || root.hasAttribute("inDOMFullscreen");
    const specialWindow = () =>
      root.hasAttribute("popup-window") || root.hasAttribute("taskbartab") || !win.toolbar.visible;
    function computeActive() {
      if (specialWindow() || domFS()) return false;
      if (win.fullScreen) return Services.prefs.getBoolPref("browser.fullscreen.autohide", true);
      return bool("windowed", true);
    }
    let isActive = false;

    // Задержка у края: onFire сработает, только если курсор продержался
    // у края (с допуском ZONE) всё время задержки
    function edgeIntent(getEdgeRect, onFire) {
      let timer = null;
      const zone = {
        getMouseTargetRect() {
          const r = getEdgeRect();
          const z = { top: r.top - ZONE, bottom: r.bottom + ZONE, left: r.left - ZONE, right: r.right + ZONE };
          return win.fullScreen ? z : clampToWindow(z);
        },
        onMouseLeave: () => cancel(),
      };
      function cancel() {
        if (timer) win.clearTimeout(timer);
        timer = null;
        MPT.removeListener(zone);
      }
      function start() {
        if (timer) return;
        MPT.addListener(zone);
        timer = win.setTimeout(() => {
          const ok = pointerIn(zone.getMouseTargetRect());
          cancel();
          if (ok && isActive) onFire();
        }, int("reveal_delay", 300));
      }
      return { start, cancel };
    }

    // ======================================================= адресная строка

    // Высота панели нужна CSS, чтобы спрятать её ровно за верхний край
    let toolboxH = 0;
    const measureToolbox = () => {
      toolboxH = toolbox.getBoundingClientRect().height;
      root.style.setProperty("--uc-toolbox-h", `${toolboxH}px`);
    };
    measureToolbox();
    new win.ResizeObserver(measureToolbox).observe(toolbox);

    // Адресная строка видна, пока есть хоть одна причина
    const u = {
      pinned: false, // закреплена хоткеем
      hover: false, // курсор пришёл к краю и ещё не ушёл вниз
      focus: false, // в ней печатают (Cmd+L, Cmd+T, клик)
      hold: false, // Firefox попросил показать (поиск, F6, запросы сайтов)
      popups: new Set(), // открыто меню/панель из неё
      visible: true,
      hiddenAt: 0, // когда начала уезжать
      shift: 0, // сдвиг под строку меню macOS
    };
    let holdTimer = null;
    const toolboxBottom = () => toolboxH + u.shift;
    const inToolboxRegion = () => pointerInWindow() && MPT._y < toolboxBottom() + BAND;

    function urlbarWanted() {
      for (const p of u.popups) {
        if (!p.isConnected || p.state === "closed") u.popups.delete(p);
      }
      return !isActive || u.pinned || u.hover || u.focus || u.hold || u.popups.size > 0;
    }

    function updateUrlbar() {
      const vis = urlbarWanted();
      if (vis === u.visible) return;
      u.visible = vis;
      if (!vis) u.hiddenAt = Date.now();
      root.toggleAttribute("ucUrlbarOpen", vis);
      FS.updateMacToolbarShift();
    }

    // Курсор ушёл ниже строки (с запасом) — «наведение» закончилось
    const below = {
      getMouseTargetRect: () => ({ top: toolboxBottom() + BAND, bottom: 1e6, left: -1e6, right: 1e6 }),
      onMouseEnter: () => setHover(false),
    };
    function setHover(v) {
      if (u.hover === v) return;
      u.hover = v;
      if (v) MPT.addListener(below);
      else MPT.removeListener(below);
      updateUrlbar();
    }

    // Другая причина кончилась (фокус, меню), а курсор всё ещё над строкой —
    // оставляем её, пока курсор не уйдёт вниз
    function keepIfPointerOver() {
      if (isActive && inToolboxRegion()) setHover(true);
    }

    function topEdgeRect() {
      if (win.fullScreen) return { top: -1e6, bottom: 1, left: -1e6, right: 1e6 };
      return { top: 0, bottom: int("window_edge", 6), left: 0, right: win.innerWidth };
    }
    const topEdge = {
      _suppressEnter: false,
      getMouseTargetRect: topEdgeRect,
      onMouseEnter() {
        if (this._suppressEnter || !isActive || u.visible) return;
        // Ещё уезжает — значит, курсор только что ушёл и передумал: сразу назад
        if (Date.now() - u.hiddenAt < 300) setHover(true);
        else topIntent.start();
      },
    };
    const topIntent = edgeIntent(topEdgeRect, () => setHover(true));

    function syncFocus() {
      const f = isActive && toolbox.contains(doc.activeElement) && isTextInput(deepActive());
      if (f === u.focus) return;
      u.focus = f;
      if (!f) keepIfPointerOver();
      updateUrlbar();
    }
    toolbox.addEventListener("focusin", syncFocus);
    toolbox.addEventListener("focusout", () => win.setTimeout(syncFocus, 0));

    function toggleUrlbarPin() {
      if (!isActive) return;
      u.pinned = !u.pinned;
      setPin("urlbar", u.pinned);
      if (!u.pinned) {
        topIntent.cancel();
        u.hold = false;
        setHover(false);
        if (u.focus) win.gBrowser.selectedBrowser.focus();
      }
      updateUrlbar();
    }

    // ======================================================== боковая панель

    const s = {
      pinned: false,
      hover: false,
      focus: false, // печатают в поле на панели (например, имя группы вкладок)
      popups: new Set(), // открыто меню из панели (контекстное меню вкладки и т. п.)
      visible: true,
      anims: [],
      gen: 0, // номер текущей анимации, чтобы старая не сбила новую
      fullW: 0, // ширина полностью открытой панели
      mainW: 0,
    };

    const container = () => doc.getElementById("sidebar-container");
    const mainOf = c => c && c.querySelector("sidebar-main");
    const sidebarUsable = () => {
      const c = container();
      return !!c && !c.hidden;
    };
    const atEnd = () => !!container()?.hasAttribute("sidebar-positionend");
    const currentWidth = () => {
      const c = container();
      return c && !c.hidden ? c.getBoundingClientRect().width : 0;
    };
    const sidebarW = () => (s.anims.length ? s.fullW : currentWidth() || s.fullW);
    const inSidebarRegion = () => {
      if (!pointerInWindow()) return false;
      const w = sidebarW() + SIDE_BAND;
      return atEnd() ? MPT._x >= win.innerWidth - w : MPT._x <= w;
    };

    function sidebarWanted() {
      for (const p of s.popups) {
        if (!p.isConnected || p.state === "closed") s.popups.delete(p);
      }
      return !isActive || !sidebarUsable() || s.pinned || s.hover || s.focus || s.popups.size > 0;
    }

    function updateSidebar(animate = true) {
      const want = sidebarWanted();
      if (want === s.visible) return;
      s.visible = want;
      if (want) showSidebar(animate);
      else hideSidebar(animate);
      FS.updateMacToolbarShift();
    }

    // Курсор ушёл с панели на страницу (полоса под видимой адресной строкой
    // не считается — туда тянутся к адресной строке)
    const sideAway = {
      getMouseTargetRect() {
        const w = sidebarW() + SIDE_BAND;
        const top = u.visible ? toolboxBottom() : 0;
        return atEnd()
          ? { top, bottom: 1e6, left: -1e6, right: win.innerWidth - w }
          : { top, bottom: 1e6, left: w, right: 1e6 };
      },
      onMouseEnter: () => setSideHover(false),
    };
    function setSideHover(v) {
      if (s.hover === v) return;
      s.hover = v;
      if (v) MPT.addListener(sideAway);
      else MPT.removeListener(sideAway);
      updateSidebar();
    }
    function keepIfPointerOverSidebar() {
      if (isActive && inSidebarRegion()) setSideHover(true);
    }

    function sideEdgeRect() {
      const w = win.innerWidth;
      if (win.fullScreen) {
        return atEnd()
          ? { top: -1e6, bottom: 1e6, left: w - FS_EDGE, right: 1e6 }
          : { top: -1e6, bottom: 1e6, left: -1e6, right: FS_EDGE };
      }
      const e = int("window_edge", 6);
      return atEnd()
        ? { top: 0, bottom: win.innerHeight, left: w - e, right: w }
        : { top: 0, bottom: win.innerHeight, left: 0, right: e };
    }
    const sideEdge = {
      _suppressEnter: false,
      getMouseTargetRect: sideEdgeRect,
      onMouseEnter() {
        if (this._suppressEnter || !isActive || s.visible || !sidebarUsable()) return;
        // Ещё уезжает — курсор передумал: разворачиваем сразу, без задержки
        if (root.hasAttribute("ucSidebarAnimating")) setSideHover(true);
        else sideIntent.start();
      },
    };
    const sideIntent = edgeIntent(sideEdgeRect, () => setSideHover(true));

    function syncSideFocus() {
      const c = container();
      const f = isActive && !!c && c.contains(doc.activeElement) && isTextInput(deepActive());
      if (f === s.focus) return;
      s.focus = f;
      if (!f) keepIfPointerOverSidebar();
      updateSidebar();
    }
    container()?.addEventListener("focusin", syncSideFocus);
    container()?.addEventListener("focusout", () => win.setTimeout(syncSideFocus, 0));

    function toggleSidebarPin() {
      if (!isActive || !sidebarUsable()) return;
      sideIntent.cancel();
      s.pinned = !s.pinned;
      setPin("sidebar", s.pinned);
      if (!s.pinned) {
        s.popups.clear();
        setSideHover(false);
      }
      updateSidebar();
    }

    // ------------------------------------------------- анимация боковой панели

    // Та же пометка, что Firefox ставит на время своих анимаций панели:
    // прячет кнопку «ещё» (»), которая иначе мелькает, пока панель обрезана
    function markAnimating(c, on) {
      if (!c) return;
      if (on) c.setAttribute("sidebar-ongoing-animations", "true");
      else if (!win.SidebarController?._ongoingAnimations?.length) {
        c.removeAttribute("sidebar-ongoing-animations");
      }
    }

    function stopSidebarAnim() {
      s.gen++;
      const c = container();
      for (const a of s.anims) a.cancel();
      if (s.anims.length) markAnimating(c, false);
      s.anims = [];
      root.removeAttribute("ucSidebarAnimating");
    }

    // Одна анимация на оба направления: ширина контейнера from → to,
    // содержимое выезжает целиком, как ящик, а не сжимается
    function slide(c, from, to, duration, easing, fill) {
      const main = mainOf(c);
      const opts = { duration, easing, fill };
      markAnimating(c, true);
      s.anims.push(
        c.animate(
          [
            { maxWidth: `${from}px`, minWidth: "0px" },
            { maxWidth: `${to}px`, minWidth: "0px" },
          ],
          opts
        )
      );
      if (main && s.mainW) {
        const shiftAt = w => (atEnd() ? 0 : w - s.fullW);
        const fadeAt = w => 0.4 + 0.6 * (s.fullW ? w / s.fullW : 1);
        s.anims.push(
          main.animate(
            [
              { minWidth: `${s.mainW}px`, translate: `${shiftAt(from)}px 0`, opacity: fadeAt(from) },
              { minWidth: `${s.mainW}px`, translate: `${shiftAt(to)}px 0`, opacity: fadeAt(to) },
            ],
            opts
          )
        );
      }
      return s.anims[0];
    }

    function showSidebar(animate) {
      const c = container();
      // Ещё уезжала — разворачиваем с текущего места
      const from = root.hasAttribute("ucSidebarAnimating") ? currentWidth() : 0;
      stopSidebarAnim();
      root.removeAttribute("ucSidebarHidden");
      const dur = int("sidebar_anim_ms", 450);
      if (!animate || !c || c.hidden || dur <= 0 || reducedMotion()) return;
      s.fullW = c.getBoundingClientRect().width;
      const main = mainOf(c);
      s.mainW = main ? main.getBoundingClientRect().width : 0;
      if (!s.fullW || from >= s.fullW) return;
      const my = s.gen;
      const done = () => {
        if (my !== s.gen) return;
        markAnimating(c, false);
        s.anims = [];
      };
      slide(c, from, s.fullW, Math.max(120, dur * (1 - from / s.fullW)), EASE_IN).finished.then(done, () => {});
    }

    function hideSidebar(animate) {
      const c = container();
      const from = animate && c && !c.hidden ? currentWidth() : 0;
      if (from && !s.anims.length) {
        s.fullW = from;
        const main = mainOf(c);
        s.mainW = main ? main.getBoundingClientRect().width : 0;
      }
      stopSidebarAnim();
      root.setAttribute("ucSidebarHidden", "true");
      const dur = int("sidebar_hide_ms", 300);
      if (!from || !s.fullW || dur <= 0 || reducedMotion()) return;
      // Пока панель уезжает, CSS-правило скрытия не действует (ucSidebarAnimating)
      root.setAttribute("ucSidebarAnimating", "true");
      const my = s.gen;
      const done = () => {
        if (my !== s.gen) return;
        root.removeAttribute("ucSidebarAnimating"); // сначала вернуть правило скрытия,
        for (const a of s.anims) a.cancel(); // потом снять анимацию — в одном кадре
        s.anims = [];
        markAnimating(c, false);
      };
      slide(c, from, 0, Math.max(120, dur * (from / s.fullW)), EASE_OUT, "forwards").finished.then(done, () => {});
    }

    // ============================================== меню, открытые из панелей

    const countsAsPopup = t =>
      t.localName !== "tooltip" &&
      t.id !== "tab-preview-panel" &&
      t.getAttribute?.("nopreventnavboxhide") !== "true";
    const recheck = () => {
      updateUrlbar();
      updateSidebar();
    };
    doc.addEventListener(
      "popupshowing",
      e => {
        if (!isActive) return;
        const t = e.originalTarget;
        if (!countsAsPopup(t)) return;
        // Меню привязано к кнопке на панели — панель должна быть на месте
        const anchor = t.anchorNode || t.triggerNode;
        if (anchor && toolbox.contains(anchor)) {
          u.popups.add(t);
          updateUrlbar();
        } else if (anchor && container()?.contains(anchor)) {
          s.popups.add(t);
          updateSidebar();
        }
        win.setTimeout(recheck, 1000); // если показ меню отменили
      },
      true
    );
    doc.addEventListener(
      "popupshown",
      e => {
        if (!isActive) return;
        const t = e.originalTarget;
        if (!countsAsPopup(t) || u.popups.has(t) || s.popups.has(t)) return;
        if (u.visible && inToolboxRegion()) u.popups.add(t);
        else if (s.visible && inSidebarRegion()) s.popups.add(t);
      },
      true
    );
    doc.addEventListener(
      "popuphidden",
      e => {
        const t = e.originalTarget;
        if (u.popups.delete(t)) {
          keepIfPointerOver();
          updateUrlbar();
        }
        if (s.popups.delete(t)) {
          keepIfPointerOverSidebar();
          updateSidebar();
        }
      },
      true
    );

    // ===================================== встраивание в полноэкранный режим

    // Скрывает и показывает панели скрипт, а не Firefox
    FS.hideNavToolbox = function () {};

    // Полоска Firefox у верхнего края больше не нужна
    for (const type of ["mouseover", "dragenter", "touchmove"]) {
      FS.fullScreenToggler.removeEventListener(type, real.expand);
    }
    FS._expandCallback = function () {};

    // Firefox просит показать панель (фокус адресной строки, поиск, F6,
    // запросы сайтов): ненадолго показываем адресную строку
    function showWrapper(trackMouse = true) {
      if (!win.fullScreen) return real.show.call(FS, trackMouse);
      if (!isActive) return undefined;
      u.hold = true;
      updateUrlbar();
      win.clearTimeout(holdTimer);
      holdTimer = win.setTimeout(() => {
        u.hold = false;
        keepIfPointerOver();
        updateUrlbar();
      }, 600);
      return undefined;
    }
    FS.showNavToolbox = showWrapper;

    // macOS: строка меню сверху. Сама по себе панели не вытягивает (только
    // тем же наведением с задержкой), а видимую адресную строку сдвигает
    // вниз, чтобы меню её не закрывало
    FS.shiftMacToolbarDown = function (size) {
      this.showNavToolbox = () => {
        if (isActive && !u.visible) topIntent.start();
      };
      try {
        return real.shift.call(this, size);
      } finally {
        this.showNavToolbox = showWrapper;
      }
    };
    FS.updateMacToolbarShift = function () {
      const shift = Number((this._menubarShift || 0).toFixed(2));
      const tb = u.visible ? shift : 0;
      u.shift = tb;
      toolbox.classList.toggle("fullscreen-floating-toolbox", tb > 0);
      toolbox.style.translate = tb > 0 ? `0 ${tb}px` : "";
      const tabs = s.visible ? shift : 0;
      root.style.setProperty("--fullscreen-menubar-shift", tabs > 0 ? `${tabs}px` : "");
      this._currentToolbarShift = tb;
    };

    // Уведомления Firefox привязаны к адресной строке
    Object.defineProperty(FS, "navToolboxHidden", {
      configurable: true,
      get: () => isActive && !u.visible,
    });

    // ========================================================= смена режима

    function refresh({ reset = false, instant = false } = {}) {
      const now = computeActive();
      const changed = now !== isActive;
      isActive = now;
      topIntent.cancel();
      sideIntent.cancel();
      MPT.removeListener(topEdge);
      MPT.removeListener(sideEdge);
      if (changed || reset) {
        stopSidebarAnim();
        win.clearTimeout(holdTimer);
        u.hold = false;
        u.popups.clear();
        s.popups.clear();
        u.hover = s.hover = false;
        MPT.removeListener(below);
        MPT.removeListener(sideAway);
        u.pinned = getPin("urlbar");
        s.pinned = getPin("sidebar");
      }
      if (instant) {
        root.setAttribute("ucNoTransition", "true");
        win.requestAnimationFrame(() =>
          win.requestAnimationFrame(() => root.removeAttribute("ucNoTransition"))
        );
      }
      root.toggleAttribute("ucAutohide", now);
      if (now) {
        // Курсор, который уже лежит у края, не считается: панель появится,
        // когда к краю придут
        for (const l of [topEdge, sideEdge]) {
          l._suppressEnter = true;
          MPT.addListener(l);
          l._suppressEnter = false;
        }
      }
      syncFocus();
      syncSideFocus();
      updateUrlbar();
      updateSidebar(false); // при смене режима — без выезда
    }

    FS.toggle = function (...args) {
      const result = real.toggle.apply(this, args);
      refresh({ reset: true });
      return result;
    };

    // Видео во весь экран и обратно
    const mo = new win.MutationObserver(() => refresh({ instant: true }));
    mo.observe(root, { attributes: true, attributeFilter: ["inDOMFullscreen"] });

    const onPref = () => {
      try {
        refresh({ reset: true });
      } catch (e) {}
    };
    Services.prefs.addObserver("browser.fullscreen.autohide", onPref);
    Services.prefs.addObserver(P + "windowed", onPref);
    win.addEventListener("unload", () => {
      Services.prefs.removeObserver("browser.fullscreen.autohide", onPref);
      Services.prefs.removeObserver(P + "windowed", onPref);
      mo.disconnect();
    });

    // Окно открылось уже в полноэкранном режиме и Firefox успел спрятать
    // панели сам — возвращаем их, дальше управляет скрипт
    if (FS._isChromeCollapsed) real.show.call(FS, false);

    // ================================================================ хоткеи

    const mods = str("key_modifiers", "control");
    const keyset = doc.createXULElement("keyset");
    keyset.id = "ucAutohideKeyset";
    const commands = doc.getElementById("mainCommandSet") || root;
    function addHotkey(id, letter, fn) {
      if (!letter) return;
      const cmd = doc.createXULElement("command");
      cmd.id = `${id}-cmd`;
      cmd.addEventListener("command", fn);
      commands.appendChild(cmd);
      const key = doc.createXULElement("key");
      key.id = `${id}-key`;
      key.setAttribute("key", letter);
      key.setAttribute("modifiers", mods);
      key.setAttribute("command", cmd.id);
      key.setAttribute("reserved", "true");
      keyset.appendChild(key);
    }
    addHotkey("ucToggleUrlbar", str("urlbar_key", "L"), toggleUrlbarPin);
    addHotkey("ucToggleSidebar", str("sidebar_key", "S"), toggleSidebarPin);
    root.appendChild(keyset);

    root.toggleAttribute("ucUrlbarOpen", true);
    refresh({ reset: true });
  }

  Services.obs.addObserver(subject => {
    try {
      patch(subject);
    } catch (e) {
      Cu.reportError(e);
    }
  }, "browser-delayed-startup-finished");
} catch (e) {
  Cu.reportError(e);
}
