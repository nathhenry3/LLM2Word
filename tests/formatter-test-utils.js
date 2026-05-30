const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function escapeForHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function createElementStub() {
  return {
    innerHTML: '',
    innerText: '',
    textContent: '',
    value: '',
    disabled: false,
    listeners: {},
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    setAttribute(name, value) {
      this[name] = value;
    }
  };
}

function createDocumentStub(elements) {
  function createTemplateStub() {
    let html = '';

    return {
      set innerHTML(value) {
        html = value;
      },
      get innerHTML() {
        return html;
      },
      content: {
        querySelectorAll(selector) {
          if (selector === 'script, iframe, object, embed, link, meta') {
            return [{
              remove() {
                html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
                  .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
                  .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
                  .replace(/<\/?(?:script|iframe|object|embed|link|meta)\b[^>]*>/gi, '');
              }
            }];
          }

          if (selector !== '*') return [];

          const elementsWithAttributes = [];
          const tagPattern = /<([a-z][\w:-]*)([^>]*)>/gi;
          let tagMatch;
          while ((tagMatch = tagPattern.exec(html)) !== null) {
            const attributeText = tagMatch[2];
            const attributes = [];
            const attributePattern = /\s([:\w-]+)(?:=("[^"]*"|'[^']*'|[^\s>]+))?/g;
            let attributeMatch;
            while ((attributeMatch = attributePattern.exec(attributeText)) !== null) {
              attributes.push({
                name: attributeMatch[1],
                value: (attributeMatch[2] || '').replace(/^['"]|['"]$/g, '')
              });
            }

            elementsWithAttributes.push({
              attributes,
              removeAttribute(name) {
                const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                html = html.replace(new RegExp(`\\s${escapedName}(?:=("[^"]*"|'[^']*'|[^\\s>]+))?`, 'gi'), '');
              }
            });
          }

          return elementsWithAttributes;
        }
      }
    };
  }

  return {
    documentElement: { dataset: {} },
    createElement(tagName) {
      if (tagName === 'template') return createTemplateStub();
      return createElementStub();
    },
    getElementById(id) {
      if (!elements[id]) elements[id] = createElementStub();
      return elements[id];
    }
  };
}

function createMarkedStub() {
  return {
    parse(markdown) {
      const normalized = markdown.replace(/\r\n?/g, '\n').trim();
      if (!normalized) return '';

      return normalized.split(/\n{2,}/).map(block => {
        if (/^#{1,6}\s/.test(block)) {
          const level = block.match(/^#{1,6}/)[0].length;
          return `<h${level}>${escapeForHtml(block.replace(/^#{1,6}\s+/, ''))}</h${level}>`;
        }

        if (/^(?:[-+*]|\d+[.)])\s/m.test(block)) {
          const items = block.split('\n')
            .filter(line => /^(?:[-+*]|\d+[.)])\s/.test(line))
            .map(line => `<li>${escapeForHtml(line.replace(/^(?:[-+*]|\d+[.)])\s+/, ''))}</li>`)
            .join('');
          return `<ul>${items}</ul>`;
        }

        return `<p>${escapeForHtml(block)}</p>`;
      }).join('\n');
    }
  };
}

function loadFormatter() {
  const elements = {
    themeToggle: createElementStub(),
    formatterInput: createElementStub(),
    formatterPreview: createElementStub(),
    formatterStatus: createElementStub(),
    copyFormatterBtn: createElementStub()
  };

  const context = {
    console,
    setTimeout,
    clearTimeout,
    Blob,
    ClipboardItem: function ClipboardItem(items) { this.items = items; },
    localStorage: {
      data: new Map(),
      getItem(key) { return this.data.has(key) ? this.data.get(key) : null; },
      setItem(key, value) { this.data.set(key, String(value)); }
    },
    navigator: {
      clipboard: {
        writes: [],
        textWrites: [],
        async write(items) { this.writes.push(items); },
        async writeText(text) { this.textWrites.push(text); }
      }
    },
    document: createDocumentStub(elements),
    katex: {
      renderToString(tex, options) {
        if (tex === 'THROW') throw new Error('render failed');
        return `<math data-display="${options.displayMode ? 'true' : 'false'}">${escapeForHtml(tex)}</math>`;
      }
    },
    marked: createMarkedStub(),
    window: {
      matchMedia() {
        return { matches: false, addEventListener() {} };
      }
    },
    formatterInputEl: elements.formatterInput,
    formatterPreviewEl: elements.formatterPreview,
    formatterStatusEl: elements.formatterStatus,
    copyFormatterBtn: elements.copyFormatterBtn,
    themeToggle: elements.themeToggle,
    themeMedia: { matches: false, addEventListener() {} },
    formatterRenderTimer: null
  };
  context.globalThis = context;

  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const eventListenerMarker = '\n// Event listeners';
  const eventListenerIndex = indexHtml.indexOf(eventListenerMarker);
  const scriptStartIndex = indexHtml.lastIndexOf('<script>', eventListenerIndex);
  if (scriptStartIndex === -1 || eventListenerIndex === -1) {
    throw new Error('Unable to find formatter script functions in index.html');
  }

  const scriptFunctions = indexHtml.slice(scriptStartIndex + '<script>'.length, eventListenerIndex);

  vm.createContext(context);
  vm.runInContext(scriptFunctions, context);

  return { context, elements };
}

module.exports = { loadFormatter, escapeForHtml };
