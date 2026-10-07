// Checklist state lives on the selected frame / section (shared plugin data).
// Since the data is stored in the file itself, every designer opening it sees the same status.
const NS = 'pydehandoff'; // namespace may only contain letters and digits
const KEY = 'checklist';

figma.showUI(__html__, { width: 340, height: 560, themeColors: true });

// Finds the node the checklist attaches to from a selection:
// a section, or a root frame (a frame directly on the page or inside a section).
// For inner elements it walks up to the owning frame / section.
function resolveTarget(node) {
  while (node && node.type !== 'PAGE' && node.type !== 'DOCUMENT') {
    if (node.type === 'SECTION') return node;
    if (node.type === 'FRAME' && node.parent &&
        (node.parent.type === 'PAGE' || node.parent.type === 'SECTION')) return node;
    node = node.parent;
  }
  return null;
}

function readData(node) {
  try {
    const raw = node.getSharedPluginData(NS, KEY);
    if (raw) {
      const d = JSON.parse(raw);
      return { done: Array.isArray(d.done) ? d.done : [], by: d.by || null, at: d.at || null };
    }
  } catch (e) {}
  return { done: [], by: null, at: null };
}

function writeData(node, done) {
  node.setSharedPluginData(NS, KEY, JSON.stringify({
    done,
    by: figma.currentUser ? figma.currentUser.name : null,
    at: Date.now()
  }));
}

function currentTargets() {
  const seen = new Set();
  const targets = [];
  for (const n of figma.currentPage.selection) {
    const t = resolveTarget(n);
    if (t && !seen.has(t.id)) { seen.add(t.id); targets.push(t); }
  }
  return targets;
}

function pushState() {
  const targets = currentTargets();
  if (targets.length === 0) {
    figma.ui.postMessage({ type: 'state', status: 'none' });
  } else if (targets.length > 1) {
    figma.ui.postMessage({ type: 'state', status: 'multiple', count: targets.length });
  } else {
    const t = targets[0];
    const data = readData(t);
    figma.ui.postMessage({
      type: 'state',
      status: 'ok',
      target: {
        id: t.id,
        name: t.name,
        kind: t.type === 'SECTION' ? 'Section' : 'Frame',
        section: t.parent && t.parent.type === 'SECTION' ? t.parent.name : null,
        page: figma.currentPage.name
      },
      done: data.done,
      by: data.by,
      at: data.at
    });
  }
}

figma.on('selectionchange', pushState);
figma.on('currentpagechange', pushState);

// UI language is a per-user preference, so it is kept in local clientStorage (not in the file).
const LANG_KEY = 'pyde-handoff-lang';
let lang = 'en';

figma.ui.onmessage = async (msg) => {
  if (msg.type === 'ready') {
    const saved = await figma.clientStorage.getAsync(LANG_KEY);
    if (saved === 'en' || saved === 'tr') lang = saved;
    figma.ui.postMessage({ type: 'prefs', lang });
    return pushState();
  }

  if (msg.type === 'setLang') {
    if (msg.lang === 'en' || msg.lang === 'tr') {
      lang = msg.lang;
      await figma.clientStorage.setAsync(LANG_KEY, lang);
    }
    return;
  }

  if (msg.type === 'refresh') return pushState();

  if (msg.type === 'toggle' || msg.type === 'reset') {
    const node = await figma.getNodeByIdAsync(msg.id);
    if (!node) return pushState();
    try {
      // Re-read the latest data and change only this item, so two designers working
      // at the same time don't overwrite each other. `legacy` is the item's old
      // (pre-id) key, removed too so old entries can still be unchecked.
      let done = msg.type === 'reset'
        ? []
        : readData(node).done.filter((x) => x !== msg.item && x !== msg.legacy);
      if (msg.type === 'toggle' && msg.value) done.push(msg.item);
      writeData(node, done);
    } catch (e) {
      figma.notify((lang === 'tr' ? 'Kaydedilemedi: ' : 'Could not save: ') + (e && e.message ? e.message : e), { error: true });
    }
    pushState();
  }
};
