window.__ModuleLoader__.load({
  id: '@local/dsh-backdrop-lead',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    // ---------------------------------------------------------------------
    // Constants
    // ---------------------------------------------------------------------

    const NS = 'dshBackdrop';
    // The image and the two slider values are stored separately on purpose:
    // writing them together means re-serializing the whole multi-megabyte data
    // URL on every slider tick, which blocks the main thread and is exactly what
    // made live feedback feel sluggish.
    const STORE_IMAGE_KEY = 'dsh-backdrop-lead/image/v1';
    const STORE_CONTROLS_KEY = 'dsh-backdrop-lead/controls/v1';
    const LEGACY_STORE_KEY = 'dsh-backdrop-lead/v1';
    const STYLE_ID = 'dsh-backdrop-lead';
    const CONTROLS_WRITE_DELAY = 250;

    const DEFAULTS = { image: '', maskOpacity: 0.35, blur: 0, composerOpaque: true, fit: 'cover' };
    // How the artwork fills the window. `cover` fills without gaps, `contain`
    // shows the whole picture (letterboxed), `tile` repeats it at natural size.
    const FIT_MODES = ['cover', 'contain', 'tile'];
    // A full-screen 40px blur turns any photo into a flat wash, which reads as
    // "the background is gone". 24px is still a strong soft focus while keeping
    // the image recognisable; stored values above it are clamped on load.
    const MAX_BLUR = 24;
    // A full-screen backdrop is decoration: 1920px on the long edge is plenty
    // and keeps both the stored blob and the first paint small. The old 2560px
    // ceiling produced multi-megabyte base64 strings whose decode delayed the
    // artwork by seconds after a restart.
    const MAX_EDGE = 1920;
    const JPEG_QUALITY = 0.82;

    // Marker attribute the plugin puts on every element whose own fill would
    // cover the artwork. The stylesheet keys off THIS, not off CSS-module class
    // names: a marker survives React re-renders and theme changes, and the
    // rules win over the host's own inline styles because they are `!important`.
    const SURFACE_ATTR = 'data-dsh-backdrop-surface';

    // The frame and the three columns are opaque on every platform. The artwork
    // is painted on a body-level layer behind them, so these surfaces must become
    // translucent for it to show through.
    const CSS = [
      // The artwork paints behind the document, so the document itself must not
      // paint an opaque fill over it. The base theme leaves html/body
      // transparent, but an applied skin may set a solid body background — that
      // would hide the artwork (not cover the UI), so make it explicit here.
      'html, body {',
      '  background-color: transparent !important;',
      '}',
      // Marked surfaces: the plugin sets this attribute on the real AppFrame and
      // column elements once it can see them.
      '[' + SURFACE_ATTR + '] {',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '}',
      // The Windows title bar strip is a pseudo element of the frame, and some
      // fade bars are painted by ::after — clear both on marked surfaces.
      '[' + SURFACE_ATTR + ']::before,',
      '[' + SURFACE_ATTR + ']::after {',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '}',
      // The sidebar fading strip inside the workspaces region.
      '[data-slot="sidebar.workspaces"] {',
      '  background-color: transparent !important;',
      '  background-image: none !important;',
      '}',
    ].join('\n');

    const DICT = {
      en: {
        section: 'Background',
        title: 'Background image',
        hint: 'Pick a local image. It is stored in this browser only.',
        upload: 'Choose image',
        uploadBusy: 'Processing...',
        replace: 'Replace',
        remove: 'Remove background',
        reset: 'Reset to default',
        preview: 'Preview',
        empty: 'No background image yet.',
        maskOpacity: 'Overlay opacity',
        maskOpacityHint: 'Dims the image behind the interface. 0% shows it at full strength.',
        blur: 'Blur',
        blurHint: 'Softens the image behind the interface.',
        composerOpaque: 'Solid input box',
        composerOpaqueHint: 'The chat input keeps its own solid background instead of showing the image through it.',
        errRead: 'That file could not be read as an image.',
        errQuota: 'Not enough browser storage for this image. Try a smaller one.',
        errWrite: 'The background could not be saved.',
        diagTitle: 'Diagnostics',
        diagImage: 'Stored image',
        diagLayer: 'Backdrop layer',
        diagSurfaces: 'Cleared surfaces',
        diagZ: 'Resolved z-index',
        diagSize: 'Layer size',
        diagMask: 'Overlay colour',
        diagBg: 'Resolved background',
        diagFilter: 'Resolved filter',
        diagProbeBtn: 'Probe what covers the artwork',
        diagReportBtn: 'Self-check report',
        diagCopyBtn: 'Copy self-check report',
        diagCopied: 'Copied to clipboard',
        diagCopyFailed: 'Copy failed — select the text below instead',
        fit: 'Image fit',
        fitHint: 'Cover fills the window, contain shows the whole picture, tile repeats it.',
        fit_cover: 'Cover',
        fit_contain: 'Contain',
        fit_tile: 'Tile',
        diagHost: 'Artwork host',
        diagMissing: 'not set',
        diagMounted: 'mounted',
        diagUnmounted: 'NOT mounted',
      },
      zh: {
        section: '背景',
        title: '背景图片',
        hint: '选择一张本地图片，仅保存在本浏览器中。',
        upload: '选择图片',
        uploadBusy: '处理中…',
        replace: '更换图片',
        remove: '移除背景',
        reset: '恢复默认',
        preview: '预览',
        empty: '尚未设置背景图片。',
        maskOpacity: '遮罩不透明度',
        maskOpacityHint: '压暗界面背后的图片，0% 时图片最清晰。',
        blur: '模糊度',
        blurHint: '柔化界面背后的图片。',
        composerOpaque: '输入框实心不透明',
        composerOpaqueHint: '对话输入框使用自己的实心底色，不再透出背景图片。',
        errRead: '无法把这个文件读成图片。',
        errQuota: '浏览器存储空间不足，请换一张更小的图片。',
        errWrite: '背景保存失败。',
        diagTitle: '诊断信息',
        diagImage: '已存图片',
        diagLayer: '背景层',
        diagSurfaces: '已透明表面',
        diagZ: '实际 z-index',
        diagSize: '层尺寸',
        diagMask: '遮罩颜色',
        diagBg: '实际背景值',
        diagFilter: '实际 filter',
        diagProbeBtn: '探测遮挡元素',
        diagReportBtn: '导出自检报告',
        diagCopyBtn: '复制自检报告',
        diagCopied: '已复制到剪贴板',
        diagCopyFailed: '复制失败，请手动选中下方文本',
        fit: '图片适应方式',
        fitHint: '铺满＝填满窗口可能裁剪；完整＝显示整张图；平铺＝按原尺寸重复。',
        fit_cover: '铺满',
        fit_contain: '完整',
        fit_tile: '平铺',
        diagHost: '背景宿主',
        diagMissing: '未设置',
        diagMounted: '已挂载',
        diagUnmounted: '未挂载',
      },
    };

    // ---------------------------------------------------------------------
    // Small DOM utilities
    // ---------------------------------------------------------------------

    function cssVar(name, host) {
      const scope = host || (typeof document !== 'undefined' ? document.body : null);
      if (!scope || typeof window === 'undefined') return '';
      try {
        return window.getComputedStyle(scope).getPropertyValue(name).trim();
      } catch (error) {
        return '';
      }
    }

    /** '#abc' | '#aabbcc' | 'rgb(a)(...)' -> [r, g, b] */
    function parseColor(value) {
      if (typeof value !== 'string') return null;
      const text = value.trim();
      if (text === '') return null;
      if (text.charAt(0) === '#') {
        const hex = text.slice(1);
        if (hex.length === 3) {
          return [
            parseInt(hex.charAt(0) + hex.charAt(0), 16),
            parseInt(hex.charAt(1) + hex.charAt(1), 16),
            parseInt(hex.charAt(2) + hex.charAt(2), 16),
          ];
        }
        if (hex.length >= 6) {
          return [
            parseInt(hex.slice(0, 2), 16),
            parseInt(hex.slice(2, 4), 16),
            parseInt(hex.slice(4, 6), 16),
          ];
        }
        return null;
      }
      const match = text.match(/rgba?\(([^)]+)\)/i);
      if (!match) return null;
      const parts = match[1].split(/[,\s/]+/).filter((part) => part !== '');
      if (parts.length < 3) return null;
      const channel = (part) => {
        const value2 = parseFloat(part);
        return Number.isFinite(value2) ? Math.max(0, Math.min(255, Math.round(value2))) : 0;
      };
      return [channel(parts[0]), channel(parts[1]), channel(parts[2])];
    }

    function withAlpha(rgb, alpha) {
      return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + alpha + ')';
    }

    /**
     * Object URL for the stored image, rebuilt only when the image changes.
     *
     * The artwork lives in localStorage as a base64 data URL that can be several
     * megabytes. Assigning that string to `background-image` (once per repaint,
     * and once per preview render while a slider is dragged) makes the browser
     * re-invalidate style and re-decode each time, which delayed the first paint
     * by seconds. A short `blob:` URL keeps the style value tiny; the decode then
     * happens once and the browser can cache it.
     */
    let imageObjectUrl = null;
    let imageObjectUrlKey = null;

    /**
     * Retired object URLs are revoked later, not immediately.
     *
     * The layer and the host background are painted by two different code paths.
     * Revoking a URL the moment a new one is created could leave the other path
     * holding a revoked URL — it then keeps showing the previously decoded frame,
     * which looks exactly like "the old picture is stuck under the new one".
     */
    const retiredObjectUrls = [];
    const RETIRED_URL_DELAY = 15000;

    function retireObjectUrl(url) {
      if (!url) return;
      retiredObjectUrls.push(url);
      if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
      window.setTimeout(() => {
        const index = retiredObjectUrls.indexOf(url);
        if (index >= 0) retiredObjectUrls.splice(index, 1);
        try {
          if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
        } catch (error) {
          // best-effort cleanup
        }
      }, RETIRED_URL_DELAY);
    }

    function imageUrl(dataUrl) {
      if (typeof dataUrl !== 'string' || dataUrl === '') return '';
      if (dataUrl === imageObjectUrlKey) return imageObjectUrl;
      try {
        const canBuild = typeof URL !== 'undefined'
          && typeof URL.createObjectURL === 'function'
          && typeof Blob !== 'undefined'
          && typeof atob === 'function';
        if (!canBuild) return dataUrl;
        const comma = dataUrl.indexOf(',');
        if (comma < 0) return dataUrl;
        const header = dataUrl.slice(5, comma); // strip the leading "data:"
        const mime = header.split(';')[0] || 'image/jpeg';
        const binary = atob(dataUrl.slice(comma + 1));
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
        const next = URL.createObjectURL(new Blob([bytes], { type: mime }));
        const previous = imageObjectUrl;
        imageObjectUrl = next;
        imageObjectUrlKey = dataUrl;
        if (previous) retireObjectUrl(previous);
        return next;
      } catch (error) {
        // Fall back to the data URL: correctness over speed.
        return dataUrl;
      }
    }

    /**
     * How opaque the app's own surfaces stay above the artwork. This is
     * deliberately independent of the mask slider: the mask dims the image, the
     * surface alpha keeps text legible, and letting one value drive both would
     * make the image disappear as soon as the user asked for a stronger mask.
     */
    const SURFACE_ALPHA = 0.72;
    const SIDEBAR_ALPHA = 0.82;

    // ---------------------------------------------------------------------
    // Host-background rendering
    //
    // Besides the body-level layer, the artwork is painted onto the app host
    // element's OWN background, under a mask gradient. A host's background paints
    // behind all of its children by definition, so it cannot lose a stacking
    // contest the way a negative-z body layer can — that contest is what kept the
    // artwork invisible on cold starts while a module reload showed it.
    // ---------------------------------------------------------------------
    const HOST_ATTR = 'data-dsh-backdrop-host';
    // Remember the element we painted: clearing must not depend on finding it
    // again by selector, which can fail after a re-render.
    let paintedHost = null;
    // html/body painted for full-viewport coverage, with their original values.
    const paintedRoots = [];

    function findHostElement() {
      if (typeof document === 'undefined') return null;
      try {
        return document.querySelector('[data-slot="root"]')
          || document.querySelector('[class*="_frame"]')
          || document.getElementById('root')
          || null;
      } catch (error) {
        return null;
      }
    }

    // Pre-blurred copies are cached per (image, radius): the browser then paints a
    // plain image instead of running a GPU blur over the whole viewport, and the
    // host background can carry the blur at all (a background-image cannot be
    // filtered on its own).
    let hostBlurCache = { key: null, url: null };
    let hostBlurPending = null;

    function blurredImageUrl(image, blur, onReady) {
      const key = String(blur) + '|' + String(image ? image.length : 0);
      if (hostBlurCache.key === key) return hostBlurCache.url;
      if (hostBlurPending === key) return null;
      hostBlurPending = key;
      try {
        const img = new Image();
        img.onload = () => {
          hostBlurPending = null;
          try {
            const naturalWidth = img.naturalWidth || 1600;
            const naturalHeight = img.naturalHeight || 900;
            const width = Math.min(1600, naturalWidth);
            const height = Math.max(1, Math.round(naturalHeight * (width / naturalWidth)));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const context = canvas.getContext('2d');
            if (!context) return;
            // Scale the radius with the downscale so the result matches the
            // on-screen blur rather than looking stronger.
            context.filter = 'blur(' + Math.max(0.5, blur * (width / Math.max(1, naturalWidth))) + 'px)';
            context.drawImage(img, 0, 0, width, height);
            hostBlurCache = { key, url: canvas.toDataURL('image/jpeg', 0.82) };
            if (typeof onReady === 'function') onReady(hostBlurCache.url);
          } catch (error) {
            // Keep the unblurred artwork instead of showing nothing.
          }
        };
        img.onerror = () => {
          hostBlurPending = null;
        };
        img.src = imageUrl(image);
      } catch (error) {
        hostBlurPending = null;
      }
      return null;
    }

    /** Paint (or refresh) the artwork on the app host element's background. */
    function paintHost(snapshot, sampled) {
      const host = findHostElement();
      diagnostics.hostFound = host !== null;
      if (!host || !host.style) return false;
      if (!snapshot || !snapshot.image) {
        clearHost();
        return false;
      }
      const mask = withAlpha(sampled || baseRgb(), snapshot.maskOpacity);
      // The exact background value being painted, shared by every target.
      let paintedBackground = '';
      // Resolved fit mode for this paint pass (guarded in case of a bad value).
      const paintedFit = FIT_MODES.indexOf(String(snapshot.fit)) !== -1 ? String(snapshot.fit) : DEFAULTS.fit;
      // Paint with `!important`: the surface-clearing pass writes
      // `background-image: none !important` on document roots, and a plain
      // assignment would lose to it, leaving `img=none` while claiming success.
      // With `contain` the letterboxed margin must be the theme base colour, not
      // the window's black: the document roots get an opaque fill, the host stays
      // transparent so it shows that fill instead of stacking another copy.
      const solidBase = 'rgb(' + (sampled || baseRgb()).join(', ') + ')';
      const paintElement = (node, isRoot) => {
        if (!node || !node.style) return;
        const size = paintedFit === 'contain'
          ? 'contain, contain'
          : (paintedFit === 'tile' ? 'auto, auto' : 'cover, cover');
        const repeat = paintedFit === 'tile' ? 'repeat, repeat' : 'no-repeat, no-repeat';
        const color = paintedFit === 'contain' && isRoot === true ? solidBase : 'transparent';
        try {
          if (typeof node.style.setProperty === 'function') {
            node.style.setProperty('background-image', paintedBackground, 'important');
            node.style.setProperty('background-size', size, 'important');
            node.style.setProperty('background-position', 'center center, center center', 'important');
            node.style.setProperty('background-repeat', repeat, 'important');
            node.style.setProperty('background-color', color, 'important');
          } else {
            node.style.backgroundImage = paintedBackground;
            node.style.backgroundSize = size;
            node.style.backgroundPosition = 'center center, center center';
            node.style.backgroundRepeat = repeat;
            node.style.backgroundColor = color;
          }
        } catch (error) {
          // A locked-down element keeps its own paint.
        }
      };
      const applyBackground = (url) => {
        paintedBackground = 'linear-gradient(' + mask + ', ' + mask + '), url("' + url + '")';
        // The app shell can swap the host element mid-session (React re-render).
        // The previous host would keep its old picture forever, which reads as
        // "the old image is stuck under the new one" — so wipe it first.
        if (paintedHost && paintedHost !== host) resetHostElement(paintedHost);
        // Belt and braces: any other element still marked as a painted host is
        // stale, so take the artwork off it as well.
        try {
          const marked = document.querySelectorAll ? document.querySelectorAll('[' + HOST_ATTR + ']') : [];
          for (const candidate of marked) {
            if (candidate !== host) resetHostElement(candidate);
          }
        } catch (error) {
          // ignore: selector unsupported
        }
        try {
          paintedHost = host;
          host.setAttribute(HOST_ATTR, '');
          paintElement(host);
          diagnostics.hostBg = String(mask) + ' + image';
          diagnostics.fit = paintedFit;
          paintStats.hostToken = imageToken(snapshot.image);
          diagnostics.hostLabel = String(host.tagName || '').toLowerCase()
            + (host.id ? '#' + host.id : '')
            + (typeof host.className === 'string' && host.className ? '.' + host.className.split(' ')[0] : '');
          recordTarget(host, 'host ' + diagnostics.hostLabel, paintStats.hostToken);
        } catch (error) {
          diagnostics.hostBg = 'write failed';
        }
        // Any other element still marked as a host holds a picture from an earlier
        // paint (the shell swapped the host element). Take the artwork off it so a
        // stale frame can never show under the current one.
        try {
          const marked = document.querySelectorAll ? document.querySelectorAll('[' + HOST_ATTR + ']') : [];
          for (const candidate of marked) {
            if (candidate === host) continue;
            resetHostElement(candidate);
            recordTarget(candidate, 'stale host', 'cleared');
          }
        } catch (error) {
          // ignore: selector unsupported
        }
        // Also cover the whole viewport. The host box does not always reach the
        // window edges, and a transparent document would show the window's own
        // background there — the black bars along the bottom edges.
        for (const root of [document.documentElement, document.body]) {
          if (!root || !root.style) continue;
          try {
            if (!paintedRoots.some((saved) => saved.node === root)) {
              paintedRoots.push({
                node: root,
                image: root.style.getPropertyValue ? root.style.getPropertyValue('background-image') : '',
                color: root.style.getPropertyValue ? root.style.getPropertyValue('background-color') : '',
              });
            }
            paintElement(root, true);
          } catch (error) {
            // A locked-down root keeps its own paint.
          }
        }
      };
      if (snapshot.blur > 0) {
        const cached = blurredImageUrl(snapshot.image, snapshot.blur, applyBackground);
        applyBackground(cached || imageUrl(snapshot.image));
      } else {
        applyBackground(imageUrl(snapshot.image));
      }
      return true;
    }

    /** Remove every trace of the artwork from one host element. */
    function resetHostElement(host) {
      if (!host) return;
      try {
        if (host.removeAttribute) host.removeAttribute(HOST_ATTR);
        if (!host.style) return;
        host.style.backgroundImage = '';
        host.style.backgroundSize = '';
        host.style.backgroundPosition = '';
        host.style.backgroundRepeat = '';
        if (host.style.removeProperty) host.style.removeProperty('background-color');
      } catch (error) {
        // ignore: element already detached
      }
    }

    function clearHost() {
      if (typeof document === 'undefined') return;
      const remember = resetHostElement;
      // Prefer the element we actually painted.
      remember(paintedHost);
      paintedHost = null;
      try {
        const hosts = document.querySelectorAll ? document.querySelectorAll('[' + HOST_ATTR + ']') : [];
        for (const host of hosts) remember(host);
      } catch (error) {
        // ignore: selector unsupported
      }
      diagnostics.hostBg = 'none';
      // Restore the document roots exactly as they were.
      while (paintedRoots.length > 0) {
        const saved = paintedRoots.pop();
        try {
          if (!saved.node || !saved.node.style) continue;
          if (saved.image) saved.node.style.backgroundImage = saved.image;
          else saved.node.style.backgroundImage = '';
          if (saved.node.style) {
            saved.node.style.backgroundSize = '';
            saved.node.style.backgroundPosition = '';
            saved.node.style.backgroundRepeat = '';
          }
          if (saved.color) saved.node.style.backgroundColor = saved.color;
          else if (saved.node.style.removeProperty) saved.node.style.removeProperty('background-color');
        } catch (error) {
          // ignore: element already detached
        }
      }
    }

    /** The host base colour of the running palette, without its own alpha. */
    function baseRgb() {
      const current = parseColor(cssVar('--dsw-alias-bg-base'));
      if (current !== null) return current;
      // No host stylesheet yet (or a theme that does not define the alias).
      const dark = typeof document !== 'undefined' && document.body
        ? document.body.hasAttribute('data-ds-dark-theme')
        : false;
      return dark ? [16, 22, 42] : [255, 255, 255];
    }

    /**
     * Copy text to the clipboard, with a textarea fallback for pages where the
     * async clipboard API is unavailable (or refuses without a user gesture).
     */
    function copyText(text) {
      const value = String(text === null || text === undefined ? '' : text);
      const fallback = () => {
        if (typeof document === 'undefined' || !document.body || !document.createElement) {
          return Promise.reject(new Error('clipboard unavailable'));
        }
        return new Promise((resolve, reject) => {
          try {
            const area = document.createElement('textarea');
            area.value = value;
            area.setAttribute('readonly', '');
            area.style.position = 'fixed';
            area.style.top = '-1000px';
            area.style.opacity = '0';
            document.body.appendChild(area);
            if (area.select) area.select();
            const copied = typeof document.execCommand === 'function' && document.execCommand('copy');
            if (area.remove) area.remove();
            else if (area.parentNode) area.parentNode.removeChild(area);
            if (copied) resolve();
            else reject(new Error('copy rejected'));
          } catch (error) {
            reject(error);
          }
        });
      };
      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(value).catch(fallback);
      }
      return Promise.resolve().then(fallback);
    }

    /**
     * Short token for an image payload, so the self-check can prove whether the
     * desktop repainted with the *new* picture after an upload.
     */
    function imageToken(text) {
      const value = String(text || '');
      if (value === '') return 'none';
      let hash = 2166136261;
      for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(16).slice(0, 8) + ':' + value.length;
    }

    /** Repaint hook, wired by apply() so uploads can force a fresh paint. */
    let requestRepaint = () => {};
    const paintStats = { paints: 0, paintToken: 'none', hostToken: 'none', targets: [] };

    /** Record which element received which picture, for the self-check. */
    function recordTarget(node, label, token) {
      if (!node) return;
      for (const entry of paintStats.targets) {
        if (entry.node === node) {
          entry.label = label;
          entry.token = token;
          return;
        }
      }
      paintStats.targets.push({ node, label, token });
      if (paintStats.targets.length > 8) paintStats.targets.shift();
    }

    /** Human-readable list of painted targets, newest picture first. */
    function describeTargets() {
      return paintStats.targets.map((entry) => entry.label + '=' + entry.token).join(' | ');
    }

    /**
     * Force the compositor to redraw an element.
     *
     * Writing the same background value twice is a no-op for the browser, so a
     * repaint that happened while the element was covered (settings dialog open)
     * can leave the layer stale until something else touches it. A momentary
     * floating-point opacity change invalidates the layer without any visual
     * difference.
     */
    function nudgeRepaint(node) {
      if (!node || !node.style) return;
      try {
        const previous = node.style.opacity;
        node.style.opacity = '0.999';
        const restore = () => {
          try {
            node.style.opacity = previous === undefined ? '' : previous;
          } catch (error) {
            // element went away
          }
        };
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(restore);
        } else if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
          window.setTimeout(restore, 16);
        }
      } catch (error) {
        // best-effort
      }
    }

    function readAsDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('read failed'));
        reader.readAsDataURL(file);
      });
    }

    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('decode failed'));
        image.src = src;
      });
    }

    function encodeJpeg(canvas, quality) {
      return new Promise((resolve, reject) => {
        try {
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('encode failed'));
              return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('read failed'));
            reader.readAsDataURL(blob);
          }, 'image/jpeg', quality);
        } catch (error) {
          reject(error);
        }
      });
    }

    /**
     * Downscale to `maxEdge` and re-encode as JPEG so one photo does not exceed
     * the browser storage budget. Returns the original data URL when the browser
     * cannot run the canvas path, so the feature degrades instead of failing.
     */
    async function normalizeImage(dataUrl, maxEdge, quality) {
      if (typeof document === 'undefined') return dataUrl;
      const image = await loadImage(dataUrl);
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return dataUrl;
      const scale = Math.min(1, maxEdge / Math.max(width, height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(width * scale));
      canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext('2d');
      if (!context) return dataUrl;
      // JPEG has no alpha channel; a flat fill keeps transparent PNGs from
      // turning black.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      try {
        return await encodeJpeg(canvas, quality);
      } catch (error) {
        return dataUrl;
      }
    }

    // ---------------------------------------------------------------------
    // Store: one module-level record shared by both slot entries
    // ---------------------------------------------------------------------

    function clampNumber(value, fallback, min, max) {
      const parsed = typeof value === 'number' ? value : Number.parseFloat(value);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    }

    function loadFromStorage() {
      const state = Object.assign({}, DEFAULTS);
      if (typeof localStorage === 'undefined') return state;
      try {
        // Slider values: tiny payload, read first so a huge image never blocks it.
        const controlsRaw = localStorage.getItem(STORE_CONTROLS_KEY);
        if (controlsRaw) {
          const controls = JSON.parse(controlsRaw);
          if (controls && typeof controls === 'object') {
            state.maskOpacity = clampNumber(controls.maskOpacity, DEFAULTS.maskOpacity, 0, 1);
            state.blur = clampNumber(controls.blur, DEFAULTS.blur, 0, MAX_BLUR);
            if (typeof controls.composerOpaque === 'boolean') state.composerOpaque = controls.composerOpaque;
            if (typeof controls.fit === 'string' && FIT_MODES.indexOf(controls.fit) !== -1) {
              state.fit = controls.fit;
            }
          }
        }
        const image = localStorage.getItem(STORE_IMAGE_KEY);
        if (typeof image === 'string' && image !== '') state.image = image;
      } catch (error) {
        return Object.assign({}, DEFAULTS);
      }
      // Migrate the single-record layout written by earlier builds.
      if (state.image === '') {
        try {
          const legacy = localStorage.getItem(LEGACY_STORE_KEY);
          if (legacy) {
            const parsed = JSON.parse(legacy);
            if (parsed && typeof parsed === 'object') {
              if (typeof parsed.image === 'string' && parsed.image !== '') state.image = parsed.image;
              state.maskOpacity = clampNumber(parsed.maskOpacity, state.maskOpacity, 0, 1);
              state.blur = clampNumber(parsed.blur, state.blur, 0, MAX_BLUR);
            }
          }
        } catch (error) {
          // A broken legacy record is simply ignored.
        }
      }
      return state;
    }

    function isQuotaError(error) {
      if (!error) return false;
      const name = error.name || '';
      const message = String(error.message || '');
      return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        /quota/i.test(message)
      );
    }

    function Store() {
      this.state = loadFromStorage();
      this.listeners = new Set();
      this.controlsTimer = null;
    }

    Store.prototype.get = function get() {
      return this.state;
    };

    Store.prototype.subscribe = function subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    };

    Store.prototype.emit = function emit() {
      for (const listener of Array.from(this.listeners)) {
        try {
          listener();
        } catch (error) {
          // A broken subscriber must not stop the others.
        }
      }
    };

    /** Write the artwork alone. Returns null on success, else a copy key. */
    Store.prototype.writeImage = function writeImage(image) {
      if (typeof localStorage === 'undefined') return null;
      try {
        if (image === '') localStorage.removeItem(STORE_IMAGE_KEY);
        else localStorage.setItem(STORE_IMAGE_KEY, image);
        return null;
      } catch (error) {
        return isQuotaError(error) ? 'errQuota' : 'errWrite';
      }
    };

    /**
     * Schedule the tiny slider record. Dragging a range fires many events per
     * second; writing each one synchronously competes with the repaint the user
     * is watching, so the durable copy trails by a quarter second.
     */
    Store.prototype.scheduleControlsPersist = function scheduleControlsPersist() {
      if (typeof localStorage === 'undefined') return;
      const self = this;
      if (this.controlsTimer !== null) {
        try {
          window.clearTimeout(this.controlsTimer);
        } catch (error) {
          // ignore: no timer carrier
        }
      }
      this.controlsTimer = (typeof window !== 'undefined' && typeof window.setTimeout === 'function')
        ? window.setTimeout(() => {
          self.controlsTimer = null;
          try {
            localStorage.setItem(STORE_CONTROLS_KEY, JSON.stringify({
              maskOpacity: self.state.maskOpacity,
              blur: self.state.blur,
              composerOpaque: self.state.composerOpaque !== false,
              fit: self.state.fit || DEFAULTS.fit,
            }));
          } catch (error) {
            // Slider durability is best-effort; the live value still applies.
          }
        }, CONTROLS_WRITE_DELAY)
        : null;
    };

    Store.prototype.set = function set(patch) {
      const previous = this.state;
      const next = Object.assign({}, previous, patch);
      const imageChanged = patch.image !== undefined && patch.image !== previous.image;
      // Publish first: the artwork repaints on the next frame, and only then
      // does the durable image write run. A slider tick never touches the image.
      this.state = next;
      this.emit();
      const failure = imageChanged ? this.writeImage(next.image) : null;
      if (patch.maskOpacity !== undefined || patch.blur !== undefined
        || patch.composerOpaque !== undefined || patch.fit !== undefined) {
        this.scheduleControlsPersist();
      }
      return failure;
    };

    const store = new Store();

    /**
     * Last upload attempt, reported by the self-check. "The image will not
     * change" can mean four different things (no file, decode failure, encode
     * fallback, storage rejection); recording the outcome tells them apart
     * without guessing.
     */
    const lastUpload = { phase: 'none', kb: 0, failure: '', detail: '' };

    /**
     * Self-check helper: list the large opaque surfaces that could sit between
     * the artwork and the user. Used by the settings self-check report.
     */
    function probeOcclusion() {
      try {
        if (typeof document === 'undefined' || typeof document.body === 'undefined') {
          return ['document unavailable'];
        }
        const viewportWidth = (typeof window !== 'undefined' && window.innerWidth) || 1280;
        const viewportHeight = (typeof window !== 'undefined' && window.innerHeight) || 800;
        const viewportArea = viewportWidth * viewportHeight;
        const nodes = [];
        try {
          nodes.push(document.documentElement, document.body);
        } catch (error) {
          // ignore
        }
        try {
          nodes.push(...document.querySelectorAll('body *'));
        } catch (error) {
          // ignore
        }
        const suspects = [];
        for (const node of nodes) {
          if (!node || !node.getBoundingClientRect) continue;
          const rect = node.getBoundingClientRect();
          const area = rect.width * rect.height;
          // Big surfaces hide the artwork; long thin strips (a bottom bar) are
          // too small by area but show up as black bars, so include them too.
          const large = area >= viewportArea * 0.35;
          const wideStrip = rect.height <= 160 && rect.width >= viewportWidth * 0.35;
          const tallStrip = rect.width <= 160 && rect.height >= viewportHeight * 0.35;
          if (!large && !wideStrip && !tallStrip) continue;
          const computed = window.getComputedStyle(node);
          const background = String(computed.backgroundColor || '');
          const image = String(computed.backgroundImage || '');
          const opaque = background !== '' && background !== 'transparent' && background !== 'rgba(0, 0, 0, 0)';
          if (!opaque && (image === '' || image === 'none')) continue;
          // Our own layer and the settings modal are expected above/below.
          const className = typeof node.className === 'string' ? node.className : '';
          if (className.indexOf(STYLE_ID) !== -1) continue;
          suspects.push({
            label: String(node.tagName || '').toLowerCase()
              + (node.id ? '#' + node.id : '')
              + (className ? '.' + className.split(' ')[0] : '')
              + ' [' + Math.round(rect.width) + 'x' + Math.round(rect.height) + ']',
            background,
            image: image.slice(0, 22),
            position: computed.position,
            zIndex: computed.zIndex,
            opacity: computed.opacity,
            coverage: Math.round((area / viewportArea) * 100),
          });
        }
        suspects.sort((a, b) => b.coverage - a.coverage);
        if (suspects.length === 0) return ['no full-viewport opaque surface found'];
        return suspects.slice(0, 10).map((s) => (
          s.label
          + ' {bg:' + s.background + '; img:' + s.image + '}'
          + ' pos=' + s.position + ' z=' + s.zIndex + ' op=' + s.opacity + ' cov=' + s.coverage + '%'
        ));
      } catch (error) {
        return ['probe failed: ' + String((error && error.message) || error)];
      }
    }

    /**
     * Self-check: one copyable block describing exactly how the artwork is
     * (or is not) rendered right now. This is the fastest way to report a defect
     * without DevTools.
     */
    function buildSelfCheck() {
      const lines = [];
      const push = (label, value) => lines.push(label + ': ' + value);
      try {
        const state = store.get();
        push('plugin', '@local/dsh-backdrop-lead');
        push('image', state.image ? Math.round(state.image.length / 1024) + ' KB' : 'none');
        push('last upload', lastUpload.phase + (lastUpload.failure ? ' (' + lastUpload.failure + ')' : '')
          + (lastUpload.kb ? ' ' + lastUpload.kb + ' KB' : '')
          + (lastUpload.detail ? ' — ' + lastUpload.detail : ''));
        push('mask', Math.round(state.maskOpacity * 100) + '%');
        push('blur', state.blur + 'px');
        push('layer', diagnostics.mounted ? 'mounted' : 'not mounted');
        push('layer z-index', diagnostics.zIndex);
        push('layer size', diagnostics.mediaPx);
        push('layer bg', diagnostics.mediaBg);
        push('layer filter', diagnostics.mediaFilter);
        push('surfaces cleared', diagnostics.surfaces + ' (measured=' + diagnostics.measured
          + ' sidebar=' + diagnostics.sidebarMarked
          + ' strip=' + diagnostics.stripMarked
          + ' bars=' + diagnostics.barsMarked
          + ' css=' + (diagnostics.cssActive ? '1' : '0')
          + ' token=' + (diagnostics.tokensActive ? '1' : '0') + ')');
        push('host element', diagnostics.hostFound ? diagnostics.hostLabel : 'NOT FOUND');
        push('host background', diagnostics.hostBg);
        push('composer card', diagnostics.composer + ' (switch ' + (state.composerOpaque !== false ? 'on' : 'off') + ')');
        push('image fit', state.fit || DEFAULTS.fit);
        push('paints', paintStats.paints
          + ' | paint ' + paintStats.paintToken
          + ' | host ' + paintStats.hostToken
          + ' | stored ' + imageToken(state.image));
        push('paint targets', describeTargets() || 'none');
      } catch (error) {
        push('state', 'read failed: ' + String((error && error.message) || error));
      }
      const describe = (label, node) => {
        if (!node) return push(label, 'absent');
        try {
          const computed = window.getComputedStyle(node);
          return push(label, 'pos=' + computed.position + ' z=' + computed.zIndex
            + ' bg=' + computed.backgroundColor + ' img=' + String(computed.backgroundImage).slice(0, 24));
        } catch (error) {
          return push(label, 'unreadable');
        }
      };
      try {
        describe('html', document.documentElement);
        describe('body', document.body);
        describe('#root', document.getElementById ? document.getElementById('root') : null);
        describe('host', findHostElement());
        push('style tags', String((document.head && document.head.querySelectorAll ? document.head.querySelectorAll('style').length : 'n/a')));
      } catch (error) {
        push('dom', 'probe failed: ' + String((error && error.message) || error));
      }
      lines.push('--- large opaque surfaces ---');
      for (const line of probeOcclusion()) lines.push(line);
      return lines;
    }

    /**
     * Live diagnostics surfaced in the settings page. The renderer has no
     * DevTools in the Desktop shell, so the page itself is the only channel that
     * can tell a user (or a supporter) whether the artwork is stored, mounted,
     * and stacked where it belongs.
     */
    const diagnostics = {
      mounted: false,
      zIndex: 'n/a',
      mediaPx: 'n/a',
      sampled: '',
      surfaces: 0,
      cssActive: false,
      tokensActive: false,
      mediaBg: 'n/a',
      mediaFilter: 'n/a',
      hostFound: false,
      hostBg: 'n/a',
      hostLabel: 'n/a',
      measured: 0,
      sidebarMarked: 0,
      stripMarked: 0,
      barsMarked: 0,
      composer: 'off',
      fit: 'cover',
    };

    /**
     * Colour-scheme revision. The artwork's overlay is a sampled colour, so a
     * palette switch has to re-render the entries that compose it. The Client
     * half arms this from `theme/change`; outside a mounted plugin it never
     * fires, which keeps the module inert.
     */
    const themeListeners = new Set();
    let themeRevision = 0;

    function onThemeChanged() {
      themeRevision += 1;
      for (const listener of Array.from(themeListeners)) {
        try {
          listener();
        } catch (error) {
          // One failing subscriber must not stop the others.
        }
      }
    }

    function subscribeTheme(listener) {
      themeListeners.add(listener);
      return () => {
        themeListeners.delete(listener);
      };
    }

    function getThemeRevision() {
      return themeRevision;
    }

    function subscribeStore(listener) {
      return store.subscribe(listener);
    }

    function getStoreSnapshot() {
      return store.get();
    }

    function useSnapshot() {
      if (typeof React.useSyncExternalStore === 'function') {
        React.useSyncExternalStore(subscribeTheme, getThemeRevision, getThemeRevision);
        return React.useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
      }
      // Fallback for a React without useSyncExternalStore.
      const [snapshot, setSnapshot] = React.useState(getStoreSnapshot);
      React.useEffect(() => store.subscribe(() => setSnapshot(store.get())), []);
      return snapshot;
    }

    // ---------------------------------------------------------------------
    // Host-surface adaptation
    // ---------------------------------------------------------------------

    /**
     * One shared effect for "what the page looks like while a backdrop exists".
     * It owns exactly two things and disposes both on teardown:
     *   1. the injected column rules (`styles.insert` removes the tag), and
     *   2. the theme token override that turns the base surface translucent.
     *
     * The token layer is also refreshed on `theme/change`, because the sampled
     * base colour differs per palette: a layer built for the light theme would
     * keep a light surface after the user switches to dark.
     */
    function createSurfaceController(theme) {
      let styleDisposer = null;
      let tokenDisposer = null;
      // Elements whose own background paints over the artwork, with the inline
      // values to restore on release.
      let clearedSurfaces = [];

      /**
       * Insert the plugin stylesheet ourselves.
       *
       * `styles.insert` is only a binding of the dynamic-half evaluator; in this
       * bundle shape `ctx.get('styles')` resolves to nothing, which silently left
       * `css=0` and skipped the `html, body` transparency rule that the artwork
       * depends on. Owning the tag keeps the contract explicit.
       */
      function insertStyleTag() {
        if (typeof document === 'undefined' || !document.head) return null;
        try {
          const tag = document.createElement('style');
          tag.setAttribute('data-dsh-backdrop', 'style');
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            try {
              if (tag.parentNode) tag.parentNode.removeChild(tag);
            } catch (error) {
              // ignore: already detached
            }
          };
        } catch (error) {
          return null;
        }
      }

      function releaseTokens() {
        if (tokenDisposer) {
          tokenDisposer();
          tokenDisposer = null;
        }
      }

      /**
       * Mark the opaque surfaces above the artwork.
       *
       * Two mechanisms, on purpose:
       *  - a marker attribute read by the injected stylesheet (`!important`), so
       *    the rule survives React re-renders and theme swaps, and
       *  - an inline clear, so the very first frame is already transparent.
       *
       * Marking is re-run from a DOM observer because a cold start renders the
       * app shell AFTER this plugin activates: at activation time the frame may
       * not exist yet, and a one-shot pass left the artwork mounted but covered
       * until the next module reload.
       */
      /** Mark one element transparent (idempotent) and remember its inline values. */
      function markElement(element) {
        if (!element) return;
        // Never clear an element the artwork is painted ON: its background-image
        // is the artwork, and a `none !important` here would erase it.
        if (element === paintedHost) return;
        // The opaque composer card is an explicit user choice; keep its fill.
        if (opaqueComposer && element === opaqueComposer.element) return;
        try {
          if (element.hasAttribute && element.hasAttribute(HOST_ATTR)) return;
        } catch (error) {
          // ignore: keep going
        }
        try {
          if (element.getAttribute && element.getAttribute(SURFACE_ATTR) === null) {
            element.setAttribute(SURFACE_ATTR, '');
          }
        } catch (error) {
          // A locked-down element simply keeps its fill.
        }
        if (clearedSurfaces.some((saved) => saved.element === element)) return;
        const inline = element.style;
        if (!inline) return;
        clearedSurfaces.push({
          element,
          color: inline.backgroundColor,
          image: inline.backgroundImage,
          importantColor: inline.getPropertyPriority ? inline.getPropertyPriority('background-color') : '',
        });
        try {
          if (typeof inline.setProperty === 'function') {
            inline.setProperty('background-color', 'transparent', 'important');
            inline.setProperty('background-image', 'none', 'important');
          } else {
            inline.backgroundColor = 'transparent';
            inline.backgroundImage = 'none';
          }
        } catch (error) {
          // Marked via CSS even when the inline write is refused.
        }
      }

      /** True for a fully opaque computed colour (alpha >= 0.99). */
      function isFullyOpaque(color) {
        const text = String(color || '').trim();
        if (text === '' || text === 'transparent') return false;
        const alphaMatch = text.match(/rgba?\(([^)]+)\)/i);
        if (!alphaMatch) return true; // hex / named colour
        const parts = alphaMatch[1].split(/[,\s/]+/).filter(Boolean);
        if (parts.length < 4) return true;
        const alpha = Number.parseFloat(parts[3]);
        return !Number.isFinite(alpha) || alpha >= 0.99;
      }

      /** True when the element itself declares a dialog/modal role. */
      function isDialogElement(element) {
        try {
          if (!element || !element.getAttribute) return false;
          if (element.getAttribute('role') === 'dialog') return true;
          if (element.getAttribute('aria-modal') === 'true') return true;
        } catch (error) {
          return false;
        }
        return false;
      }

      /**
       * True when the element is, contains, or sits inside a settings section.
       * Those surfaces belong to the settings panel and must keep their fill.
       */
      function containsSettings(element) {
        try {
          if (!element) return false;
          const slot = '[data-slot="settings.section"]';
          if (element.closest && element.closest(slot)) return true;
          if (element.querySelector && element.querySelector(slot)) return true;
        } catch (error) {
          return false;
        }
        return false;
      }

      /** True when the element lives inside a floating layer (dialog, overlay). */
      function isInsideFloatingLayer(element) {
        let node = element ? element.parentElement : null;
        let depth = 0;
        while (node && depth < 10) {
          try {
            const computed = window.getComputedStyle(node);
            if (computed.position === 'fixed') return true;
          } catch (error) {
            // ignore: keep walking
          }
          try {
            if (node.getAttribute) {
              if (node.getAttribute('role') === 'dialog') return true;
              if (node.getAttribute('aria-modal') === 'true') return true;
            }
          } catch (error) {
            // ignore: keep walking
          }
          node = node.parentElement;
          depth += 1;
        }
        return false;
      }

      /**
       * Mark every large, fully opaque, non-floating surface.
       *
       * Selector guessing failed: the real cover in this build is a CSS-module
       * class (`…_root`, 79% of the viewport) that no name-based rule matched.
       * Measuring the elements instead is name-independent — and the filters keep
       * dialogs (z-index >= 1, fixed/shadow roots) and translucent scrims
       * (alpha < 1) untouched, so the settings panel itself never goes see-through.
       */
      function markLargeOpaqueSurfaces() {
        if (typeof document === 'undefined' || !document.body) return 0;
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 0;
        const viewportWidth = window.innerWidth || 1280;
        const viewportHeight = window.innerHeight || 800;
        const viewportArea = viewportWidth * viewportHeight;
        let candidates = [];
        try {
          candidates = Array.from(document.querySelectorAll('body *'));
        } catch (error) {
          candidates = [];
        }
        let marked = 0;
        // A bounded scan: enough to cover a normal shell, cheap enough to repeat.
        const limit = Math.min(candidates.length, 4000);
        for (let index = 0; index < limit; index += 1) {
          const element = candidates[index];
          if (!element || !element.getBoundingClientRect) continue;
          let rect;
          try {
            rect = element.getBoundingClientRect();
          } catch (error) {
            continue;
          }
          if (rect.width * rect.height < viewportArea * 0.4) continue;
          let computed;
          try {
            computed = window.getComputedStyle(element);
          } catch (error) {
            continue;
          }
          if (!isFullyOpaque(computed.backgroundColor)) continue;
          // Protection comes from identity, not z-index: a large opaque strip can
          // legitimately carry a z-index (the empty-tab host does, and excluding it
          // left a black bar at the bottom edge).
          if (isDialogElement(element)) continue;
          if (isInsideFloatingLayer(element)) continue;
          // Settings content (Account, Models, Plugins, ...) lives in the panel;
          // clearing a container that holds it made Account unreachable. Skip any
          // element that contains or belongs to the settings section.
          if (containsSettings(element)) continue;
          if (computed.opacity !== '' && Number.parseFloat(computed.opacity) < 0.99) continue;
          markElement(element);
          marked += 1;
        }
        return marked;
      }

      /**
       * Clear the sidebar column and the fills inside it.
       *
       * The sidebar is its own narrow column (roughly a fifth of the viewport), so
       * the "large surface" measurement never reaches it, and it paints its own
       * fill plus a fading strip inside the workspaces region.
       */
      function markSidebarSurfaces() {
        if (typeof document === 'undefined') return 0;
        let sidebar = null;
        try {
          sidebar = document.querySelector('[data-slot="sidebar"]')
            || document.querySelector('[class*="sidebarCol"]')
            || null;
        } catch (error) {
          sidebar = null;
        }
        if (!sidebar) return 0;
        markElement(sidebar);
        let marked = 1;
        let nodes = [];
        try {
          nodes = Array.from(sidebar.querySelectorAll('*'));
        } catch (error) {
          nodes = [];
        }
        const limit = Math.min(nodes.length, 1500);
        for (let index = 0; index < limit; index += 1) {
          const element = nodes[index];
          let computed;
          try {
            computed = window.getComputedStyle(element);
          } catch (error) {
            continue;
          }
          if (!isFullyOpaque(computed.backgroundColor)) continue;
          if (isDialogElement(element)) continue;
          if (isInsideFloatingLayer(element)) continue;
          // Keep interactive rows: hover/focus fills belong to the control.
          try {
            if (element.closest && element.closest('button')) continue;
            if (element.tagName && String(element.tagName).toLowerCase() === 'button') continue;
          } catch (error) {
            // keep going
          }
          markElement(element);
          marked += 1;
        }
        // The bottom bar of the workspace list is often semi-transparent, a
        // gradient, or painted by a pseudo element — so it survives the opaque
        // check above. Sweep it by geometry instead: any short band near the
        // sidebar's bottom edge loses its paint (interactive rows are kept).
        try {
          const sidebarRect = sidebar.getBoundingClientRect ? sidebar.getBoundingClientRect() : null;
          const sidebarBottom = sidebarRect ? sidebarRect.bottom : 0;
          const sidebarWidth = sidebarRect ? sidebarRect.width : 0;
          const viewportHeight = (typeof window !== 'undefined' && window.innerHeight) || 800;
          for (let index = 0; index < limit; index += 1) {
            const element = nodes[index];
            if (!element.getBoundingClientRect) continue;
            let rect;
            try {
              rect = element.getBoundingClientRect();
            } catch (error) {
              continue;
            }
            if (rect.height > 90) continue;
            if (sidebarWidth > 0 && rect.width < sidebarWidth * 0.5) continue;
            const nearBottom = sidebarBottom > 0
              ? rect.bottom >= sidebarBottom - 160
              : rect.bottom >= viewportHeight - 200;
            if (!nearBottom) continue;
            if (isDialogElement(element)) continue;
            if (isInsideFloatingLayer(element)) continue;
            // Never strip an interactive row: it needs its own hover/focus fill.
            try {
              if (element.closest && element.closest('button')) continue;
              if (element.tagName && String(element.tagName).toLowerCase() === 'button') continue;
            } catch (error) {
              // keep going: geometry rules still apply
            }
            markElement(element);
            marked += 1;
          }
        } catch (error) {
          // ignore: geometry sweep is best-effort
        }
        return marked;
      }

      /**
       * Clear long thin opaque strips.
       *
       * A bottom bar is only a few percent of the viewport by area, so the
       * "large surface" rule never sees it — yet it shows as a black bar across
       * the workspace and conversation bottoms. Width/height thresholds are kept
       * conservative (60% of the viewport on the long axis) so ordinary controls
       * and the composer are not touched.
       */
      function markStripSurfaces() {
        if (typeof document === 'undefined' || !document.body) return 0;
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 0;
        const viewportWidth = window.innerWidth || 1280;
        const viewportHeight = window.innerHeight || 800;
        let candidates = [];
        try {
          candidates = Array.from(document.querySelectorAll('body *'));
        } catch (error) {
          candidates = [];
        }
        let marked = 0;
        const limit = Math.min(candidates.length, 4000);
        for (let index = 0; index < limit; index += 1) {
          const element = candidates[index];
          if (!element || !element.getBoundingClientRect) continue;
          let rect;
          try {
            rect = element.getBoundingClientRect();
          } catch (error) {
            continue;
          }
          const wideStrip = rect.height <= 160 && rect.width >= viewportWidth * 0.6;
          const tallStrip = rect.width <= 160 && rect.height >= viewportHeight * 0.6;
          if (!wideStrip && !tallStrip) continue;
          let computed;
          try {
            computed = window.getComputedStyle(element);
          } catch (error) {
            continue;
          }
          if (!isFullyOpaque(computed.backgroundColor)) continue;
          if (isDialogElement(element)) continue;
          if (isInsideFloatingLayer(element)) continue;
          if (containsSettings(element)) continue;
          markElement(element);
          marked += 1;
        }
        return marked;
      }

      /**
       * Clear the gradient fade bars that sit at the bottom of a column.
       *
       * The composer seat and the sidebar footer draw a `linear-gradient` that
       * fades to the theme base colour. With the artwork behind them, that fade
       * reads as a hard-edged black bar along the workspace and conversation
       * bottoms. Only the gradient is removed (layout and the composer's own
       * solid card stay), so text keeps its contrast.
       */
      function markBottomGradientBars() {
        if (typeof document === 'undefined' || !document.body) return 0;
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return 0;
        const viewportWidth = window.innerWidth || 1280;
        const viewportHeight = window.innerHeight || 800;
        let candidates = [];
        try {
          candidates = Array.from(document.querySelectorAll('body *'));
        } catch (error) {
          candidates = [];
        }
        let marked = 0;
        const limit = Math.min(candidates.length, 4000);
        for (let index = 0; index < limit; index += 1) {
          const element = candidates[index];
          if (!element || !element.getBoundingClientRect) continue;
          let rect;
          try {
            rect = element.getBoundingClientRect();
          } catch (error) {
            continue;
          }
          // A bar: wide enough to read as a band, short enough to be a fade, and
          // anchored to the bottom edge of the viewport.
          if (rect.width < viewportWidth * 0.2) continue;
          if (rect.height > 260) continue;
          if (rect.bottom < viewportHeight - 300) continue;
          let computed;
          try {
            computed = window.getComputedStyle(element);
          } catch (error) {
            continue;
          }
          const image = String(computed.backgroundImage || '');
          if (image === '' || image === 'none' || image.indexOf('gradient') === -1) continue;
          if (isDialogElement(element)) continue;
          if (isInsideFloatingLayer(element)) continue;
          if (containsSettings(element)) continue;
          markElement(element);
          marked += 1;
        }
        return marked;
      }

      function markOpaqueSurfaces() {
        if (typeof document === 'undefined' || !document.body) return;
        const selector = [
          // `html` / `body` are the plugin's own full-viewport paint targets, so
          // they are not scrubbed here.
          '#root',
          '[data-slot="root"]',
          '[class*="_frame"]',
          '[class*="sidebarCol"]',
          '[class*="centerCol"]',
          '[class*="rightbarCol"]',
        ].join(',');
        let found = [];
        try {
          found = Array.from(document.querySelectorAll(selector));
        } catch (error) {
          found = [];
        }
        for (const element of found) markElement(element);
        const measured = markLargeOpaqueSurfaces();
        const sidebarMarked = markSidebarSurfaces();
        const stripMarked = markStripSurfaces();
        const barsMarked = markBottomGradientBars();
        // Anything that ended up inside an open dialog is given back immediately.
        const restoredFromDialog = restoreInsideDialogs();
        // The composer switch is applied after every scrub pass: the card looks
        // like a wide strip to the scrubbers, so it must be re-solided last.
        const current = store.get();
        if (current && current.composerOpaque !== false) {
          markComposerOpaque();
        }
        diagnostics.surfaces = found.length + measured + sidebarMarked + stripMarked + barsMarked - restoredFromDialog;
        diagnostics.measured = measured;
        diagnostics.sidebarMarked = sidebarMarked;
        diagnostics.stripMarked = stripMarked;
        diagnostics.barsMarked = barsMarked;
        // The app shell can be replaced wholesale by a re-render; the painted host
        // then no longer exists, so re-resolve and repaint onto the live element.
        if (typeof paintHost === 'function') {
          const snapshot = store.get();
          if (snapshot && snapshot.image) paintHost(snapshot, baseRgb());
        }
      }

      let surfaceObserver = null;
      let observerTimer = null;
      // Cold start converges like a reload does: the shell keeps re-rendering
      // (and replacing) its surfaces for the first seconds after boot, so a
      // one-shot pass loses its marks. Re-assert for a bounded window.
      let settleTimer = null;
      let settleTicks = 0;
      const SETTLE_MS = 400;
      const SETTLE_TICKS = 30;

      function startSettling() {
        if (settleTimer !== null || typeof window === 'undefined' || typeof window.setInterval !== 'function') return;
        settleTicks = 0;
        settleTimer = window.setInterval(() => {
          settleTicks += 1;
          if (!watchedActive || settleTicks > SETTLE_TICKS) {
            stopSettling();
            return;
          }
          markOpaqueSurfaces();
        }, SETTLE_MS);
      }

      function stopSettling() {
        if (settleTimer === null) return;
        try {
          window.clearInterval(settleTimer);
        } catch (error) {
          // ignore: no timer carrier
        }
        settleTimer = null;
        settleTicks = 0;
      }

      function watchSurfaces() {
        if (surfaceObserver || typeof MutationObserver === 'undefined') return;
        const target = document.documentElement || document.body;
        if (!target) return;
        surfaceObserver = new MutationObserver(() => {
          if (observerTimer !== null) return;
          observerTimer = (typeof window !== 'undefined' && typeof window.setTimeout === 'function')
            ? window.setTimeout(() => {
              observerTimer = null;
              if (clearedSurfaces.length === 0 && !watchedActive) return;
              markOpaqueSurfaces();
            }, 120)
            : null;
          if (observerTimer === null) markOpaqueSurfaces();
        });
        try {
          surfaceObserver.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'data-slot'] });
        } catch (error) {
          surfaceObserver = null;
        }
        // Belt and braces for the boot window, where the observer can coalesce
        // away the only mutation that mattered.
        startSettling();
      }

      function unwatchSurfaces() {
        stopSettling();
        if (surfaceObserver) {
          try {
            surfaceObserver.disconnect();
          } catch (error) {
            // ignore: already disconnected
          }
          surfaceObserver = null;
        }
        if (observerTimer !== null) {
          try {
            window.clearTimeout(observerTimer);
          } catch (error) {
            // ignore: no timer carrier
          }
          observerTimer = null;
        }
      }

      /** Undo one marked element, in isolation from the others. */
      function restoreElement(saved) {
        if (!saved || !saved.element) return;
        try {
          if (saved.element.getAttribute && saved.element.getAttribute(SURFACE_ATTR) !== null) {
            saved.element.removeAttribute(SURFACE_ATTR);
          }
        } catch (error) {
          // ignore: the marker is harmless on its own
        }
        try {
          const inline = saved.element.style;
          if (!inline) return;
          if (saved.color) inline.setProperty('background-color', saved.color, saved.importantColor || '');
          else inline.removeProperty('background-color');
          if (saved.image) inline.setProperty('background-image', saved.image);
          else inline.removeProperty('background-image');
        } catch (error) {
          // Restoration is best-effort per element.
        }
      }

      /**
       * Self-heal: give back anything that was scrubbed inside a dialog.
       *
       * The settings panel opens on top of a running artwork; if a markup change
       * ever made a panel element look like a background layer, this puts it back
       * as soon as the dialog exists, so settings content (Account included) is
       * never left transparent.
       */
      function restoreInsideDialogs() {
        if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return 0;
        let dialog = null;
        try {
          dialog = document.querySelector('[role="dialog"]')
            || document.querySelector('[aria-modal="true"]')
            || null;
        } catch (error) {
          dialog = null;
        }
        if (!dialog || typeof dialog.contains !== 'function') return 0;
        let restored = 0;
        const keep = [];
        for (const saved of clearedSurfaces) {
          let inside = false;
          try {
            inside = dialog.contains(saved.element);
          } catch (error) {
            inside = false;
          }
          if (inside) {
            restoreElement(saved);
            restored += 1;
          } else {
            keep.push(saved);
          }
        }
        clearedSurfaces = keep;
        return restored;
      }

      function restoreSurfaces() {
        for (const saved of clearedSurfaces) restoreElement(saved);
        clearedSurfaces = [];
        diagnostics.surfaces = 0;
        restoreOpaqueComposer();
      }

      // ---- opaque composer card ----------------------------------------------
      // The chat composer inherits the translucent surface tokens, so the
      // artwork shows through the input card. When the user wants a solid card,
      // find the card by walking up from the text field and give it an opaque
      // fill of the current base colour.
      let opaqueComposer = null;

      function findComposerCard() {
        if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return null;
        if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
        const viewportWidth = window.innerWidth || 1280;
        const viewportHeight = window.innerHeight || 800;
        let fields = [];
        try {
          fields = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]'));
        } catch (error) {
          return null;
        }
        for (const field of fields) {
          if (!field || !field.getBoundingClientRect) continue;
          let fieldRect;
          try {
            fieldRect = field.getBoundingClientRect();
          } catch (error) {
            continue;
          }
          // Only the composer lives in the lower part of the window.
          if (fieldRect.top < viewportHeight * 0.4) continue;
          let node = field;
          for (let depth = 0; depth < 10; depth += 1) {
            node = node.parentElement;
            if (!node || node === document.body || !node.getBoundingClientRect) break;
            let rect;
            try {
              rect = node.getBoundingClientRect();
            } catch (error) {
              continue;
            }
            if (rect.width < viewportWidth * 0.3) continue;
            if (rect.height < 44 || rect.height > 360) continue;
            if (rect.bottom > viewportHeight + 8) continue;
            return node;
          }
        }
        return null;
      }

      function markComposerOpaque() {
        const card = findComposerCard();
        if (!card) {
          diagnostics.composer = 'not found';
          return 0;
        }
        if (opaqueComposer && opaqueComposer.element !== card) restoreOpaqueComposer();
        if (opaqueComposer && opaqueComposer.element === card) {
          diagnostics.composer = 'opaque';
          return 1;
        }
        const inline = card.style;
        if (!inline) return 0;
        const rgb = baseRgb();
        const solid = 'rgb(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ')';
        opaqueComposer = {
          element: card,
          color: inline.backgroundColor || '',
          image: inline.backgroundImage || '',
        };
        try {
          inline.setProperty('background-color', solid, 'important');
          inline.setProperty('background-image', 'none', 'important');
          diagnostics.composer = 'opaque';
        } catch (error) {
          diagnostics.composer = 'write failed';
        }
        return 1;
      }

      function restoreOpaqueComposer() {
        const saved = opaqueComposer;
        opaqueComposer = null;
        diagnostics.composer = 'off';
        if (!saved || !saved.element) return;
        try {
          const inline = saved.element.style;
          if (!inline) return;
          if (saved.color) inline.setProperty('background-color', saved.color, 'important');
          else inline.removeProperty('background-color');
          if (saved.image) inline.setProperty('background-image', saved.image, 'important');
          else inline.removeProperty('background-image');
        } catch (error) {
          // best-effort restore
        }
      }

      function applyTokens() {
        if (theme && typeof theme.overrideTokens === 'function') {
          const rgb = baseRgb();
          const tokens = {
            '--dsw-alias-bg-base': {
              light: withAlpha(rgb, SURFACE_ALPHA),
              dark: withAlpha(rgb, SURFACE_ALPHA),
            },
            '--dsw-specific-sidebar-fill': {
              light: withAlpha(rgb, SIDEBAR_ALPHA),
              dark: withAlpha(rgb, SIDEBAR_ALPHA),
            },
          };
          // Re-registering the same source replaces the whole layer.
          releaseTokens();
          tokenDisposer = theme.overrideTokens('dsh-backdrop-lead', tokens);
        }
      }

      let watchedActive = false;

      return {
        /** Turn the solid composer card on or off without re-running the scrubs. */
        setComposerOpaque(enabled) {
          try {
            if (enabled) markComposerOpaque();
            else restoreOpaqueComposer();
          } catch (error) {
            // best-effort: the toggle never breaks the rest of the surface pass
          }
        },
        setActive(active) {
          if (active) {
            if (!styleDisposer) styleDisposer = insertStyleTag();
            if (!tokenDisposer) applyTokens();
            watchedActive = true;
            markOpaqueSurfaces();
            watchSurfaces();
            diagnostics.cssActive = styleDisposer !== null;
            diagnostics.tokensActive = tokenDisposer !== null;
          } else {
            watchedActive = false;
            unwatchSurfaces();
            if (styleDisposer) {
              styleDisposer();
              styleDisposer = null;
            }
            releaseTokens();
            restoreSurfaces();
            diagnostics.cssActive = false;
            diagnostics.tokensActive = false;
          }
        },
        /** Re-sample the palette and re-mark surfaces a re-render may restore. */
        refresh() {
          if (tokenDisposer) applyTokens();
          if (!watchedActive) return;
          markOpaqueSurfaces();
        },
        dispose() {
          watchedActive = false;
          unwatchSurfaces();
          if (styleDisposer) {
            styleDisposer();
            styleDisposer = null;
          }
          releaseTokens();
          restoreSurfaces();
        },
      };
    }

    // ---------------------------------------------------------------------
    // Slot entries
    // ---------------------------------------------------------------------

    /**
     * The artwork itself: one fixed layer pinned behind the app with a negative
     * z-index and appended as the first child of <body>, so it can never sit
     * above the shell's overlay stack or intercept input. `pointer-events:none`
     * is set inline on every node as a second line of defence.
     */
    function createBackdropController() {
      let nodes = null;
      // Once the app boots, `apply` can run before `document.body` is ready. The
      // artwork then has nowhere to mount, and a plain "return" would leave it
      // missing until something else happened to repaint — observed as the
      // background vanishing after a restart and only reappearing later.
      let pending = null;
      let retryTimer = null;
      let retries = 0;
      const MAX_RETRIES = 40;
      const RETRY_MS = 50;

      /** Resolved z-index, for the diagnostics line (raw string, never throws). */
      function resolveZIndex(layer) {
        try {
          return String(window.getComputedStyle(layer).zIndex);
        } catch (error) {
          return 'n/a';
        }
      }

      /**
       * Fail-safe: keep the layer only while it actually stacks behind content.
       * The earlier incident came from artwork painted above the shell, so this
       * re-checks the resolved z-index after insertion and tears the layer down
       * rather than risk ever covering the UI again.
       */
      function isBehindContent(layer) {
        try {
          const resolved = window.getComputedStyle(layer).zIndex;
          const value = Number.parseInt(resolved, 10);
          if (!Number.isFinite(value)) return true; // unresolved: inline -1 stands
          return value < 0;
        } catch (error) {
          return true; // computed style unavailable; inline style still applies
        }
      }

      function ensure() {
        if (nodes) return nodes;
        if (typeof document === 'undefined' || !document.body) return null;
        try {
          const layer = document.createElement('div');
          layer.className = STYLE_ID + '-layer';
          layer.setAttribute('aria-hidden', 'true');
          layer.style.position = 'fixed';
          layer.style.top = '0';
          layer.style.right = '0';
          layer.style.bottom = '0';
          layer.style.left = '0';
          layer.style.width = '100%';
          layer.style.height = '100%';
          layer.style.zIndex = '-1';
          layer.style.overflow = 'hidden';
          layer.style.pointerEvents = 'none';
          const media = document.createElement('div');
          media.className = STYLE_ID + '-media';
          media.style.position = 'absolute';
          media.style.backgroundPosition = 'center center';
          media.style.backgroundRepeat = 'no-repeat';
          media.style.backgroundSize = 'cover';
          media.style.pointerEvents = 'none';
          // Promote the artwork to its own compositor layer: the blur then
          // re-composites instead of repainting the whole viewport on every
          // slider step.
          media.style.willChange = 'filter';
          media.style.transform = 'translateZ(0)';
          const mask = document.createElement('div');
          mask.className = STYLE_ID + '-mask';
          mask.style.position = 'absolute';
          mask.style.inset = '0';
          mask.style.pointerEvents = 'none';
          layer.appendChild(media);
          layer.appendChild(mask);
          document.body.insertBefore(layer, document.body.firstChild);
          if (!isBehindContent(layer)) {
            // Something restacked it above content: never keep that layer.
            if (layer.parentNode) layer.parentNode.removeChild(layer);
            return null;
          }
          nodes = { layer, media, mask };
          return nodes;
        } catch (error) {
          return null;
        }
      }

      function clearRetry() {
        if (retryTimer !== null) {
          try {
            window.clearTimeout(retryTimer);
          } catch (error) {
            // ignore: no timer carrier
          }
          retryTimer = null;
        }
        retries = 0;
      }

      /** Retry a paint that could not mount yet, a bounded number of times. */
      function scheduleRetry() {
        if (retryTimer !== null || retries >= MAX_RETRIES) return;
        if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
        retries += 1;
        retryTimer = window.setTimeout(() => {
          retryTimer = null;
          const snapshot = pending;
          if (snapshot) render(snapshot);
        }, RETRY_MS);
      }

      /**
       * Coalesce repaints to one per animation frame. A slider drag emits many
       * events per second; painting each one synchronously multiplies style work
       * for no visible gain, because the compositor only shows one frame anyway.
       */
      let frame = null;
      let frameScheduled = false;
      // Last values actually written, so unchanged properties stay untouched.
      const applied = { image: null, blur: null, mask: null, bleed: null, fit: null };

      function scheduleFrame() {
        if (frameScheduled) return;
        frameScheduled = true;
        const request = typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
          ? (callback) => window.requestAnimationFrame(callback)
          : (callback) => setTimeout(callback, 16);
        const run = () => {
          frameScheduled = false;
          frame = null;
          const snapshot = pending;
          if (snapshot) paint(snapshot);
        };
        frame = request(run);
      }

      function render(snapshot) {
        pending = snapshot;
        if (!snapshot.image) {
          teardown();
          return;
        }
        // Mount synchronously when possible so the first frame is immediate; the
        // expensive style writes below are still frame-coalesced.
        if (!ensure()) {
          scheduleRetry();
          return;
        }
        scheduleFrame();
      }

      function paint(snapshot) {
        const current = ensure();
        if (!current) {
          scheduleRetry();
          return;
        }
        clearRetry();
        paintStats.paints += 1;
        paintStats.paintToken = imageToken(snapshot.image);
        const blur = snapshot.blur;
        // The blur samples outside the viewport edge; growing the media layer by
        // three times the radius hides the transparent fringe.
        const bleed = blur > 0 ? Math.ceil(blur * 3) : 0;
        if (applied.bleed !== bleed) {
          applied.bleed = bleed;
          current.media.style.top = -bleed + 'px';
          current.media.style.right = -bleed + 'px';
          current.media.style.bottom = -bleed + 'px';
          current.media.style.left = -bleed + 'px';
        }
        // Feeding a multi-megabyte base64 string into `background-image` on every
        // repaint (each slider drag) forces repeated style invalidation and image
        // decode, which is what made the artwork take seconds to appear. Hand the
        // browser a short object URL instead, and only when the image changes.
        if (applied.image !== snapshot.image) {
          applied.image = snapshot.image;
          current.media.style.backgroundImage = 'url("' + imageUrl(snapshot.image) + '")';
          recordTarget(current.media, 'layer', imageToken(snapshot.image));
        }
        if (applied.blur !== blur) {
          applied.blur = blur;
          current.media.style.filter = blur > 0 ? 'blur(' + blur + 'px)' : '';
        }
        // The layer must use the same fit as the host background. With `contain`
        // and a mismatched cover, the layer showed a zoomed copy of the same
        // picture around the letterboxed one — two overlapping images.
        const fit = FIT_MODES.indexOf(String(snapshot.fit)) !== -1 ? String(snapshot.fit) : DEFAULTS.fit;
        if (applied.fit !== fit) {
          applied.fit = fit;
          current.media.style.backgroundSize = fit === 'contain' ? 'contain' : (fit === 'tile' ? 'auto' : 'cover');
          current.media.style.backgroundRepeat = fit === 'tile' ? 'repeat' : 'no-repeat';
        }
        const sampled = baseRgb();
        const mask = withAlpha(sampled, snapshot.maskOpacity);
        if (applied.mask !== mask) {
          applied.mask = mask;
          current.mask.style.background = mask;
        }
        // Publish what the last paint actually did, for the settings diagnostics.
        diagnostics.mounted = true;
        diagnostics.zIndex = resolveZIndex(current.layer);
        diagnostics.sampled = 'rgb(' + sampled.join(', ') + ')';
        // Belt and braces: ALSO paint the artwork on the app host element's own
        // background (image under a mask gradient). That background is painted
        // behind every child of the host by definition, so it cannot lose a
        // stacking-context contest the way a body-level layer can — which is what
        // kept the artwork invisible on cold starts while a module reload (when
        // the shell is already settled) showed it.
        paintHost(snapshot, sampled);
        try {
          const rect = current.layer.getBoundingClientRect();
          diagnostics.mediaPx = Math.round(rect.width) + ' x ' + Math.round(rect.height);
        } catch (error) {
          diagnostics.mediaPx = 'n/a';
        }
        // Read back what the browser actually resolved for the media layer: this
        // distinguishes "styles never applied" from "painted but covered".
        try {
          const computed = window.getComputedStyle(current.media);
          const image = String(computed.backgroundImage || '');
          diagnostics.mediaBg = image === '' || image === 'none' ? 'none' : image.slice(0, 26);
          diagnostics.mediaFilter = String(computed.filter || 'none');
        } catch (error) {
          diagnostics.mediaBg = 'n/a';
          diagnostics.mediaFilter = 'n/a';
        }
        // Re-assert the safety property on every repaint: if anything restacked
        // the layer above content, drop it instead of covering the UI.
        if (!isBehindContent(current.layer)) teardown();
      }

      function teardown() {
        clearRetry();
        if (frame !== null) {
          const cancel = typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function'
            ? (handle) => window.cancelAnimationFrame(handle)
            : (handle) => clearTimeout(handle);
          try {
            cancel(frame);
          } catch (error) {
            // ignore: no frame carrier
          }
          frame = null;
        }
        pending = null;
        applied.image = null;
        applied.blur = null;
        applied.mask = null;
        applied.bleed = null;
        clearHost();
        if (nodes && nodes.layer.parentNode) {
          nodes.layer.parentNode.removeChild(nodes.layer);
        }
        nodes = null;
        diagnostics.mounted = false;
        diagnostics.zIndex = 'n/a';
        diagnostics.mediaPx = 'n/a';
      }

      /**
       * Forget what the last paint applied, so the next frame rewrites every
       * property even if the snapshot looks unchanged. Used after an upload: the
       * layer and the host background must never disagree about which picture is
       * current, or the old frame shows through the new one.
       */
      function invalidate() {
        applied.image = null;
        applied.blur = null;
        applied.mask = null;
        applied.bleed = null;
        applied.fit = null;
      }

      return { render, teardown, invalidate };
    }

    function Field(props) {
      return h(
        'label',
        { style: { display: 'block', marginBottom: '18px' } },
        h(
          'span',
          {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: '12px',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-primary)',
            },
          },
          h('span', null, props.label),
          h(
            'span',
            { style: { color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' } },
            props.value,
          ),
        ),
        h('input', {
          type: 'range',
          min: String(props.min),
          max: String(props.max),
          step: String(props.step),
          value: String(props.current),
          onChange: (event) => props.onChange(Number.parseFloat(event.target.value)),
          style: { width: '100%', margin: '8px 0 0', accentColor: 'var(--dsw-alias-brand-primary)' },
        }),
        props.hint
          ? h(
              'span',
              {
                style: {
                  display: 'block',
                  marginTop: '4px',
                  fontSize: '12px',
                  color: 'var(--dsw-alias-label-secondary)',
                },
              },
              props.hint,
            )
          : null,
      );
    }

    function Button(props) {
      return h(
        'button',
        {
          type: 'button',
          disabled: props.disabled === true,
          onClick: props.onClick,
          style: {
            appearance: 'none',
            font: 'inherit',
            fontSize: '13px',
            padding: '7px 14px',
            borderRadius: '8px',
            border: '1px solid var(--dsw-alias-border-l2)',
            background: props.primary ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-bg-layer-2)',
            color: props.primary
              ? 'var(--dsw-alias-label-primary-foreground)'
              : 'var(--dsw-alias-label-primary)',
            cursor: props.disabled === true ? 'default' : 'pointer',
            opacity: props.disabled === true ? 0.5 : 1,
          },
        },
        props.children,
      );
    }

    function SettingsSection(props) {
      const snapshot = useSnapshot();
      const t = (key) => (props.dict && props.dict[key]) || key;
      const inputRef = React.useRef(null);
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState('');
      const [probeLines, setProbeLines] = React.useState([]);
      const [copyState, setCopyState] = React.useState('');

      const pick = () => {
        if (inputRef.current) inputRef.current.click();
      };

      const onFile = async (event) => {
        const input = event.target;
        const file = input.files && input.files[0];
        // Reset first so picking the same file twice still fires a change event.
        input.value = '';
        if (!file) {
          lastUpload.phase = 'no-file';
          lastUpload.detail = 'file input produced no File';
          return;
        }
        lastUpload.phase = 'reading';
        lastUpload.failure = '';
        lastUpload.detail = String(file.name || '') + ' ' + Math.round((file.size || 0) / 1024) + ' KB';
        setBusy(true);
        setError('');
        try {
          const raw = await readAsDataUrl(file);
          lastUpload.phase = 'read-ok';
          const normalized = await normalizeImage(raw, MAX_EDGE, JPEG_QUALITY);
          lastUpload.phase = 'encoded';
          lastUpload.kb = Math.round(normalized.length / 1024);
          lastUpload.detail = 'raw ' + Math.round(raw.length / 1024) + ' KB -> stored ' + lastUpload.kb + ' KB';
          const failure = store.set({ image: normalized });
          if (failure) {
            lastUpload.phase = 'write-failed';
            lastUpload.failure = failure;
            setError(t(failure));
          } else {
            lastUpload.phase = 'applied';
            requestRepaint();
          }
        } catch (readError) {
          lastUpload.phase = 'read-failed';
          lastUpload.failure = 'errRead';
          lastUpload.detail = String((readError && readError.message) || readError);
          setError(t('errRead'));
        } finally {
          setBusy(false);
        }
      };

      const remove = () => {
        setError('');
        const failure = store.set({ image: '' });
        if (failure) setError(t(failure));
        else requestRepaint();
      };

      const reset = () => {
        setError('');
        const failure = store.set({
          image: '',
          maskOpacity: DEFAULTS.maskOpacity,
          blur: DEFAULTS.blur,
          composerOpaque: DEFAULTS.composerOpaque,
          fit: DEFAULTS.fit,
        });
        if (failure) setError(t(failure));
        else requestRepaint();
      };

      const hiddenInput = h('input', {
        ref: inputRef,
        type: 'file',
        accept: 'image/*',
        onChange: onFile,
        style: { display: 'none' },
      });

      // Live composed preview: the same image, the same overlay colour and a
      // proportionally scaled blur, so dragging either slider shows its effect
      // inside the settings panel immediately (the panel covers the desktop).
      const PREVIEW_W = 180;
      const PREVIEW_H = 101;
      const VIEWPORT_W = (typeof window !== 'undefined' && window.innerWidth) || 1280;
      const blurScale = Math.min(1, PREVIEW_W / Math.max(1, VIEWPORT_W));
      const previewBlur = Math.round(snapshot.blur * blurScale);

      const preview = snapshot.image
        ? h(
            'div',
            {
              'aria-label': t('preview'),
              role: 'img',
              style: {
                width: PREVIEW_W + 'px',
                height: PREVIEW_H + 'px',
                flex: 'none',
                borderRadius: '8px',
                border: '1px solid var(--dsw-alias-border-l1)',
                overflow: 'hidden',
                position: 'relative',
              },
            },
            h('div', {
              style: {
                position: 'absolute',
                // Grow by the blur radius so the blur has no transparent fringe.
                top: -Math.ceil(previewBlur * 3) + 'px',
                right: -Math.ceil(previewBlur * 3) + 'px',
                bottom: -Math.ceil(previewBlur * 3) + 'px',
                left: -Math.ceil(previewBlur * 3) + 'px',
                backgroundImage: 'url("' + imageUrl(snapshot.image) + '")',
                backgroundSize: snapshot.fit === 'contain' ? 'contain' : (snapshot.fit === 'tile' ? 'auto' : 'cover'),
                backgroundRepeat: snapshot.fit === 'tile' ? 'repeat' : 'no-repeat',
                backgroundPosition: 'center',
                filter: previewBlur > 0 ? 'blur(' + previewBlur + 'px)' : '',
              },
            }),
            h('div', {
              style: {
                position: 'absolute',
                inset: '0',
                background: withAlpha(baseRgb(), snapshot.maskOpacity),
              },
            }),
          )
        : h(
            'div',
            {
              style: {
                width: '180px',
                height: '101px',
                flex: 'none',
                borderRadius: '8px',
                border: '1px dashed var(--dsw-alias-border-l2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '8px',
                boxSizing: 'border-box',
                fontSize: '12px',
                color: 'var(--dsw-alias-label-secondary)',
              },
            },
            t('empty'),
          );

      return h(
        'div',
        { style: { padding: '4px 0 24px', color: 'var(--dsw-alias-label-primary)' } },
        hiddenInput,
        h('h3', { style: { margin: '0 0 4px', fontSize: '15px', fontWeight: 600 } }, t('title')),
        h(
          'p',
          { style: { margin: '0 0 16px', fontSize: '13px', color: 'var(--dsw-alias-label-secondary)' } },
          t('hint'),
        ),
        h(
          'div',
          { style: { display: 'flex', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' } },
          preview,
          h(
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
            h(Button, { primary: true, disabled: busy, onClick: pick }, busy ? t('uploadBusy') : (snapshot.image ? t('replace') : t('upload'))),
            h(Button, { disabled: busy || !snapshot.image, onClick: remove }, t('remove')),
            h(Button, { disabled: busy, onClick: reset }, t('reset')),
          ),
        ),
        error
          ? h(
              'p',
              {
                role: 'alert',
                style: { margin: '12px 0 0', fontSize: '13px', color: 'var(--dsw-alias-state-error-primary)' },
              },
              error,
            )
          : null,
        h(
          'div',
          { style: { marginTop: '24px', maxWidth: '420px' } },
          h(Field, {
            label: t('maskOpacity'),
            hint: t('maskOpacityHint'),
            min: 0,
            max: 100,
            step: 1,
            current: Math.round(snapshot.maskOpacity * 100),
            value: Math.round(snapshot.maskOpacity * 100) + '%',
            onChange: (next) => store.set({ maskOpacity: next / 100 }),
          }),
          h(Field, {
            label: t('blur'),
            hint: t('blurHint'),
            min: 0,
            max: MAX_BLUR,
            step: 1,
            current: snapshot.blur,
            value: snapshot.blur + 'px',
            onChange: (next) => store.set({ blur: next }),
          }),
        ),
        h(
          'div',
          { style: { marginTop: '4px', maxWidth: '420px' } },
          h(
            'span',
            { style: { display: 'block', fontSize: '13px', color: 'var(--dsw-alias-label-primary)' } },
            t('fit'),
          ),
          h(
            'div',
            { role: 'group', 'aria-label': t('fit'), style: { display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' } },
            ...FIT_MODES.map((mode) => h(
              Button,
              {
                key: mode,
                onClick: () => store.set({ fit: mode }),
                'aria-pressed': (snapshot.fit || DEFAULTS.fit) === mode,
                style: (snapshot.fit || DEFAULTS.fit) === mode
                  ? { outline: '2px solid var(--dsw-alias-border-active, var(--dsw-alias-label-primary))', outlineOffset: '1px' }
                  : undefined,
              },
              t('fit_' + mode),
            )),
          ),
          h(
            'span',
            { style: { display: 'block', marginTop: '6px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
            t('fitHint'),
          ),
        ),
        h(
          'label',
          {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginTop: '18px',
              maxWidth: '420px',
              cursor: 'pointer',
              fontSize: '13px',
              color: 'var(--dsw-alias-label-primary)',
            },
          },
          h('input', {
            type: 'checkbox',
            checked: snapshot.composerOpaque !== false,
            onChange: (event) => store.set({ composerOpaque: !!event.target.checked }),
            style: { marginTop: '2px', flex: 'none' },
          }),
          h(
            'span',
            null,
            h('span', { style: { display: 'block' } }, t('composerOpaque')),
            h(
              'span',
              { style: { display: 'block', marginTop: '2px', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } },
              t('composerOpaqueHint'),
            ),
          ),
        ),
        h(
          'details',
          { open: true, style: { marginTop: '20px', maxWidth: '620px', fontSize: '12px' } },
          h(
            'summary',
            { style: { cursor: 'pointer', color: 'var(--dsw-alias-label-secondary)' } },
            t('diagTitle'),
          ),
          h(
            'ul',
            {
              style: {
                margin: '8px 0 0',
                paddingLeft: '18px',
                lineHeight: '20px',
                color: 'var(--dsw-alias-label-secondary)',
                fontFamily: 'ui-monospace, Consolas, monospace',
              },
            },
            h('li', null, t('diagImage') + ': ' + (snapshot.image ? Math.round(snapshot.image.length / 1024) + ' KB' : t('diagMissing'))),
            h('li', null, t('diagLayer') + ': ' + (diagnostics.mounted ? t('diagMounted') : t('diagUnmounted'))),
            h('li', null, t('diagSurfaces') + ': ' + diagnostics.surfaces + ' (measured=' + diagnostics.measured + ') / css=' + (diagnostics.cssActive ? '1' : '0') + ' token=' + (diagnostics.tokensActive ? '1' : '0')),
            h('li', null, t('diagZ') + ': ' + diagnostics.zIndex),
            h('li', null, t('diagSize') + ': ' + diagnostics.mediaPx),
            h('li', null, t('diagBg') + ': ' + diagnostics.mediaBg),
            h('li', null, t('diagFilter') + ': ' + diagnostics.mediaFilter),
            h('li', null, t('diagMask') + ': ' + diagnostics.sampled + ' @ ' + Math.round(snapshot.maskOpacity * 100) + '%'),
            h('li', null, t('diagHost') + ': ' + (diagnostics.hostFound ? diagnostics.hostLabel : 'not found') + ' / ' + diagnostics.hostBg),
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' } },
            h(Button, { onClick: () => setProbeLines(buildSelfCheck()) }, t('diagReportBtn')),
            h(
              Button,
              {
                onClick: () => {
                  const text = buildSelfCheck().join('\n');
                  setProbeLines(text.split('\n'));
                  copyText(text)
                    .then(() => {
                      setCopyState('ok');
                      if (typeof window !== 'undefined' && window.setTimeout) {
                        window.setTimeout(() => setCopyState(''), 2500);
                      }
                    })
                    .catch(() => setCopyState('fail'));
                },
              },
              t('diagCopyBtn'),
            ),
            copyState === 'ok' ? h('span', { role: 'status', style: { alignSelf: 'center', fontSize: '12px', color: 'var(--dsw-alias-label-secondary)' } }, t('diagCopied')) : null,
            copyState === 'fail' ? h('span', { role: 'status', style: { alignSelf: 'center', fontSize: '12px', color: 'var(--dsw-alias-state-error-primary)' } }, t('diagCopyFailed')) : null,
          ),
          probeLines.length > 0
            ? h(
                'ul',
                {
                  style: {
                    margin: '8px 0 0',
                    paddingLeft: '18px',
                    lineHeight: '18px',
                    color: 'var(--dsw-alias-label-secondary)',
                    fontFamily: 'ui-monospace, Consolas, monospace',
                    wordBreak: 'break-all',
                  },
                },
                ...probeLines.map((line) => h('li', { key: line }, line)),
              )
            : null,
        ),
      );
    }

    // ---------------------------------------------------------------------
    // Plugin half
    // ---------------------------------------------------------------------

    /**
     * The active locale id, or null when no carrier reports one.
     *
     * `LocaleSnapshot.active` is a bare `LocaleId` string (`"zh"` / `"en"`), not
     * an object: reading `.id` off it silently yielded `undefined` and left the
     * settings entry labelled in English. An object shape is still tolerated for
     * other carriers. Returning null (instead of guessing) lets the caller decide
     * what to do when the locale service is unavailable at this moment.
     */
    function pickLocaleId(locale) {
      if (!locale) return null;
      try {
        const snapshot = typeof locale.getSnapshot === 'function'
          ? locale.getSnapshot()
          : typeof locale.getLocale === 'function'
            ? locale.getLocale()
            : null;
        const active = snapshot && snapshot.active;
        if (typeof active === 'string' && active !== '') return active;
        // Tolerate an object-shaped snapshot from another carrier.
        if (active && typeof active.id === 'string' && active.id !== '') return active.id;
      } catch (error) {
        // fall through: the carrier does not expose a readable locale here
      }
      return null;
    }

    /**
     * Dictionary for the active locale.
     *
     * Only an explicit English id selects English. Everything else resolves to
     * Chinese, this plugin's authoring locale: the web shell hard-codes
     * `<html lang="en">` regardless of the active UI language, so neither the
     * document language nor a missing locale service is evidence of English.
     */
    function dictFor(locale) {
      const id = pickLocaleId(locale);
      if (id === null) return DICT.zh;
      return String(id).toLowerCase().indexOf('en') === 0 ? DICT.en : DICT.zh;
    }

    function apply(ctx) {
      const slots = ctx.get('slots');
      const locale = ctx.get('locale');
      // `theme` is read lazily too: the token override is what keeps the host
      // surfaces translucent, and a captured `undefined` would silently leave the
      // artwork behind an opaque fill.
      const readTheme = () => {
        try {
          const live = ctx.get('theme');
          return live !== undefined ? live : ctx.theme;
        } catch (error) {
          return undefined;
        }
      };
      const theme = readTheme() || {
        // Deferred accessor: the controller calls through this on every write.
        overrideTokens: (...args) => {
          const live = readTheme();
          if (!live || typeof live.overrideTokens !== 'function') return () => {};
          return live.overrideTokens(...args);
        },
      };

      /**
       * Read the locale service lazily: it may not be mounted when `apply` runs,
       * and a captured `undefined` would pin the copy to the fallback forever.
       * The label thunk and the section body both go through this.
       */
      const readLocale = () => {
        try {
          const live = typeof ctx.get === 'function' ? ctx.get('locale') : undefined;
          return live !== undefined ? live : locale;
        } catch (error) {
          return locale;
        }
      };

      const surface = createSurfaceController(theme);
      const backdrop = createBackdropController();
      ctx.effect(() => () => surface.dispose(), 'dsh-backdrop-surface');

      // Uploads must reach the desktop immediately. The painter normally reacts to
      // the store, but a skipped frame would leave the old picture on screen until
      // restart — so the upload path invalidates the paint state and repaints.
      requestRepaint = () => {
        const paintOnce = () => {
          try {
            const snapshot = store.get();
            surface.setActive(snapshot.image !== '');
            surface.setComposerOpaque(snapshot.composerOpaque !== false);
            surface.refresh();
            backdrop.invalidate();
            backdrop.render(snapshot);
            // Same-value background writes are no-ops; nudge the compositor so the
            // layer really repaints even if it was covered when the image changed.
            nudgeRepaint(findHostElement());
            nudgeRepaint(document.body);
            nudgeRepaint(document.documentElement);
          } catch (error) {
            // Never let a forced repaint break the caller (the upload already applied).
          }
        };
        paintOnce();
        // The upload happens while the settings dialog covers the desktop, and a
        // background layer behind an open modal is repainted lazily — which is why
        // the wallpaper only appeared after some unrelated DOM change (opening
        // settings again, taking a screenshot). Re-assert for a little while so the
        // new picture lands without any further interaction.
        if (typeof window === 'undefined' || typeof window.setTimeout !== 'function') return;
        for (const delay of [120, 500, 1500]) {
          window.setTimeout(paintOnce, delay);
        }
      };
      ctx.effect(() => () => { requestRepaint = () => {}; }, 'dsh-backdrop-repaint');

      // A palette switch changes the sampled surface colour and the mask colour;
      // rebuild the token layer and repaint the backdrop.
      ctx.effect(
        () =>
          ctx.on('theme/change', () => {
            surface.refresh();
            backdrop.render(store.get());
          }),
        'dsh-backdrop-theme',
      );

      // The presence of artwork -- not the slider values -- drives the surface
      // adaptation, so removing the image restores the stock opaque chrome.
      const initial = store.get();
      let hadImage = initial.image !== '';
      surface.setActive(hadImage);
      surface.setComposerOpaque(initial.composerOpaque !== false);

      ctx.effect(
        () =>
          store.subscribe(() => {
            const next = store.get();
            const active = next.image !== '';
            if (active || hadImage) surface.setActive(active);
            hadImage = active;
            surface.setComposerOpaque(next.composerOpaque !== false);
          }),
        'dsh-backdrop-surface-sync',
      );

      // Paint / remove the body-level artwork. Kept as its own effect so the
      // layer is torn down cleanly when the bundle is disposed.
      ctx.effect(
        () => {
          const render = () => backdrop.render(store.get());
          render();
          const unsubscribe = store.subscribe(render);
          return () => {
            unsubscribe();
            backdrop.teardown();
          };
        },
        'dsh-backdrop-layer',
      );

      if (locale && typeof locale.register === 'function') {
        ctx.effect(() => locale.register(NS, DICT), 'dsh-backdrop-locale');
      }

      if (slots) {
        // The label is a thunk so the settings navigation re-reads it on every
        // projection: localized text then follows the active locale without
        // re-registering, and it tolerates the locale service arriving late.
        // The section body resolves its own dictionary at render time for the
        // same reason.
        ctx.effect(
          () =>
            ctx.slots.inject('settings.section', () =>
              ctx.slots.register(
                {
                  name: 'settings.section',
                  id: 'dsh-backdrop',
                  order: 135,
                  label: () => dictFor(readLocale()).section,
                  locale: NS,
                },
                (props) => h(SettingsSection, Object.assign({}, props, { dict: dictFor(readLocale()) })),
              ),
            ),
          'dsh-backdrop-section',
        );
      }
    }

    return { inject: ['slots'], apply };
  },
});
