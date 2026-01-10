// --- DOM ELEMENTS ---
const win = document.getElementById('window');
const btn = document.getElementById('start-btn');
const bootArea = document.getElementById('boot-area');
const searchContainer = document.getElementById('search-container');
const hiddenInput = document.getElementById('hidden-input');
const visualText = document.getElementById('visual-text');
const searchBarWrap = document.getElementById('search-bar-wrap');
const searchBlinker = document.getElementById('search-blinker');
const menuContainer = document.getElementById('menu-container');
const menuToggle = document.getElementById('menu-toggle');
const menuActions = document.getElementById('menu-actions');
const socialBtn = document.getElementById('social-btn');
const socialLinks = document.getElementById('social-links');

// --- LUA ELEMENTS ---
const luaBtn = document.getElementById('lua-btn');
const luaConsole = document.getElementById('lua-console');
const luaBootArea = document.getElementById('lua-boot-area');
const loadingContainer = document.getElementById('loading-container');
const loadingProgress = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');

let isStarted = false;
let luaStarted = false;

const LUA_PROJECT_STORAGE_KEY = 'lua_project_v1';
let luaProject = null;
let luaActiveFileId = null;
let luaSelectedFolderId = null;
let luaEditorInstance = null;
let luaMonacoSetupDone = false;
let luaDraggedNodeId = null;

let stackWindows = [];
let stackGap = 900;
let stackWheelBound = false;
let stackIndex = 0;
let stackWheelAccum = 0;
let stackAnimating = false;
const STACK_TRANSITION_MS = 1200;

function stackIsEnabled() {
    return isStarted && win.classList.contains('fullscreen') && !win.classList.contains('lua-ide-mode') && searchContainer && searchContainer.style.display === 'flex';
}

function stackRecalcGap() {
    stackGap = Math.max(700, Math.floor(window.innerHeight * 0.98));
}

function stackEnsureInit() {
    if (stackWindows.length > 0) return;
    stackRecalcGap();
    stackWindows = [win];
    stackIndex = 0;
    stackWheelAccum = 0;
    stackAnimating = false;
    win.classList.add('stack-window', 'stack-active');
    win.style.setProperty('--stack-y', '0px');
    win.style.setProperty('--stack-opacity', '1');
    win.style.setProperty('--stack-scale', '1');
}

function stackCreateEmptyWindow() {
    const el = document.createElement('div');
    el.className = 'cursor-window fullscreen stack-window';
    el.style.setProperty('--stack-y', `${stackGap}px`);

    const header = win.querySelector('.cursor-header');
    const headerHtml = header ? header.innerHTML : '<div></div>';
    el.innerHTML = `
        <div class="cursor-header">${headerHtml}</div>
        <div class="cursor-body"></div>
    `;

    document.body.appendChild(el);
    stackWindows.push(el);
    return el;
}

function stackSetWindowState(w, y, opacity, scale) {
    w.style.setProperty('--stack-y', `${y}px`);
    w.style.setProperty('--stack-opacity', String(opacity));
    w.style.setProperty('--stack-scale', String(scale));
}

function stackActivateIndex(idx) {
    for (let i = 0; i < stackWindows.length; i += 1) {
        const w = stackWindows[i];
        const y = (i - idx) * stackGap;
        if (i === idx) {
            w.classList.add('stack-active');
            stackSetWindowState(w, 0, 1, 1);
        } else {
            w.classList.remove('stack-active');
            stackSetWindowState(w, y, 0, 0.97);
        }
    }
}

function stackSwitch(direction) {
    if (stackAnimating) return;
    const nextIndex = stackIndex + direction;
    if (nextIndex < 0) return;

    stackRecalcGap();

    while (stackWindows.length <= nextIndex) {
        stackCreateEmptyWindow();
    }

    const current = stackWindows[stackIndex];
    const next = stackWindows[nextIndex];

    stackAnimating = true;

    // Only animate two windows, hide the rest
    for (let i = 0; i < stackWindows.length; i += 1) {
        const w = stackWindows[i];
        w.classList.remove('stack-active');
        if (w !== current && w !== next) {
            stackSetWindowState(w, (i - stackIndex) * stackGap, 0, 0.98);
        }
    }

    // Prepare positions (page-like)
    const incomingStartY = direction > 0 ? stackGap : -stackGap;
    const outgoingEndY = direction > 0 ? -stackGap : stackGap;

    stackSetWindowState(current, 0, 1, 1);
    stackSetWindowState(next, incomingStartY, 0, 1);

    // force layout so transition triggers
    void next.offsetHeight;

    current.style.transitionDuration = `${STACK_TRANSITION_MS}ms`;
    next.style.transitionDuration = `${STACK_TRANSITION_MS}ms`;

    // Animate
    stackSetWindowState(current, outgoingEndY, 0, 0.96);
    stackSetWindowState(next, 0, 1, 1);

    stackIndex = nextIndex;

    setTimeout(() => {
        stackActivateIndex(stackIndex);
        const active = stackWindows[stackIndex];
        if (active) {
            active.classList.remove('stack-flash');
            void active.offsetHeight;
            active.classList.add('stack-flash');
        }
        stackAnimating = false;
    }, STACK_TRANSITION_MS + 20);
}

function stackBindWheelOnce() {
    if (stackWheelBound) return;
    stackWheelBound = true;

    document.addEventListener('wheel', (e) => {
        if (!stackIsEnabled()) return;
        stackEnsureInit();

        // prevent page scroll / overscroll while stacking
        e.preventDefault();

        if (stackAnimating) return;

        stackWheelAccum += e.deltaY;
        const threshold = 40;
        if (Math.abs(stackWheelAccum) < threshold) return;
        const direction = stackWheelAccum > 0 ? 1 : -1;
        stackWheelAccum = 0;
        stackSwitch(direction);
    }, { passive: false });
}

window.addEventListener('resize', () => {
    if (!stackWindows.length) return;
    stackRecalcGap();
    stackActivateIndex(stackIndex);
});

function luaMakeId() {
    return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function luaDetachNodeById(rootNode, id) {
    const parent = luaFindParentOf(rootNode, id);
    if (!parent || !Array.isArray(parent.children)) return null;
    const idx = parent.children.findIndex(c => c.id === id);
    if (idx < 0) return null;
    return parent.children.splice(idx, 1)[0];
}

function luaNodeContainsId(node, id) {
    if (!node) return false;
    if (node.id === id) return true;
    if (node.type === 'folder' && Array.isArray(node.children)) {
        return node.children.some(c => luaNodeContainsId(c, id));
    }
    return false;
}

function luaDownloadTextFile(fileName, content) {
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function luaDefaultProject() {
    const mainId = luaMakeId();
    return {
        root: {
            id: 'root',
            type: 'folder',
            name: 'Project',
            collapsed: false,
            children: [
                {
                    id: mainId,
                    type: 'file',
                    name: 'main.lua',
                    content: "print('Hello from Luau!')\n",
                },
            ],
        },
        activeFileId: mainId,
    };
}

function luaLoadProject() {
    try {
        const raw = localStorage.getItem(LUA_PROJECT_STORAGE_KEY);
        if (!raw) return luaDefaultProject();
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.root || parsed.root.type !== 'folder') return luaDefaultProject();
        return parsed;
    } catch {
        return luaDefaultProject();
    }
}

function luaSaveProject() {
    try {
        localStorage.setItem(LUA_PROJECT_STORAGE_KEY, JSON.stringify(luaProject));
    } catch {
        // ignore
    }
}

function luaFindNodeById(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.type === 'folder' && Array.isArray(node.children)) {
        for (const child of node.children) {
            const found = luaFindNodeById(child, id);
            if (found) return found;
        }
    }
    return null;
}

function luaFindParentOf(node, childId) {
    if (!node || node.type !== 'folder' || !Array.isArray(node.children)) return null;
    for (const child of node.children) {
        if (child.id === childId) return node;
        if (child.type === 'folder') {
            const found = luaFindParentOf(child, childId);
            if (found) return found;
        }
    }
    return null;
}

function luaNormalizeFileName(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    if (!trimmed.includes('.')) return trimmed + '.lua';
    return trimmed;
}

function luaCountFiles(node) {
    if (!node) return 0;
    if (node.type === 'file') return 1;
    if (node.type === 'folder' && Array.isArray(node.children)) {
        return node.children.reduce((acc, c) => acc + luaCountFiles(c), 0);
    }
    return 0;
}

function luaZipAddTree(zip, node, basePath) {
    if (!node) return;
    if (node.type === 'file') {
        const name = node.name || 'script.lua';
        const path = basePath ? `${basePath}/${name}` : name;
        zip.file(path, node.content || '');
        return;
    }
    if (node.type === 'folder' && Array.isArray(node.children)) {
        const folderPath = node.id === 'root' ? basePath : (basePath ? `${basePath}/${node.name}` : node.name);
        for (const child of node.children) luaZipAddTree(zip, child, folderPath);
    }
}

function luaEnsureUniqueChildName(folder, desiredName) {
    const existing = new Set((folder.children || []).map(c => (c.name || '').toLowerCase()));
    if (!existing.has(desiredName.toLowerCase())) return desiredName;
    const dot = desiredName.lastIndexOf('.');
    const base = dot >= 0 ? desiredName.slice(0, dot) : desiredName;
    const ext = dot >= 0 ? desiredName.slice(dot) : '';
    let i = 2;
    while (existing.has((`${base} (${i})${ext}`).toLowerCase())) i += 1;
    return `${base} (${i})${ext}`;
}

function luaAppendOutput(type, text) {
    const body = document.getElementById('lua-output-body');
    if (!body) return;
    const div = document.createElement('div');
    div.className = `lua-out-line lua-out-${type}`;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
}

function luaClearOutput() {
    const body = document.getElementById('lua-output-body');
    if (body) body.innerHTML = '';
}

function luaRenderTree() {
    const treeEl = document.getElementById('lua-tree');
    if (!treeEl || !luaProject) return;
    treeEl.innerHTML = '';

    function renderFolder(folder, depth) {
        const children = Array.isArray(folder.children) ? folder.children : [];
        for (const child of children) {
            const item = document.createElement('div');
            item.className = 'lua-tree-item';
            item.dataset.id = child.id;
            item.dataset.type = child.type;
            item.draggable = true;
            if (child.type === 'file' && child.id === luaActiveFileId) item.classList.add('active');

            const indent = document.createElement('span');
            indent.className = 'lua-tree-indent';
            indent.style.setProperty('--indent', `${depth * 14}px`);
            item.appendChild(indent);

            const icon = document.createElement('i');
            icon.className = child.type === 'folder'
                ? (child.collapsed ? 'fa-solid fa-folder' : 'fa-solid fa-folder-open')
                : 'fa-solid fa-file-code';
            item.appendChild(icon);

            const name = document.createElement('span');
            name.className = 'lua-tree-name';
            name.textContent = child.name;
            item.appendChild(name);

            item.addEventListener('click', () => {
                if (child.type === 'folder') {
                    luaSelectedFolderId = child.id;
                    child.collapsed = !child.collapsed;
                    luaSaveProject();
                    luaRenderTree();
                    return;
                }

                luaSelectedFolderId = (luaFindParentOf(luaProject.root, child.id) || luaProject.root).id;
                luaOpenFile(child.id);
            });

            item.addEventListener('dragstart', (e) => {
                luaDraggedNodeId = child.id;
                try {
                    e.dataTransfer.setData('text/plain', child.id);
                } catch {
                    // ignore
                }
                e.dataTransfer.effectAllowed = 'move';
            });

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                const sourceId = luaDraggedNodeId;
                if (!sourceId || sourceId === child.id) return;

                const sourceNode = luaFindNodeById(luaProject.root, sourceId);
                const targetNode = luaFindNodeById(luaProject.root, child.id);
                if (!sourceNode || !targetNode) return;
                if (sourceNode.type === 'folder' && luaNodeContainsId(sourceNode, targetNode.id)) return;

                const moved = luaDetachNodeById(luaProject.root, sourceId);
                if (!moved) return;

                if (targetNode.type === 'folder') {
                    targetNode.children = targetNode.children || [];
                    targetNode.children.push(moved);
                    targetNode.collapsed = false;
                } else {
                    const parent = luaFindParentOf(luaProject.root, targetNode.id) || luaProject.root;
                    parent.children = parent.children || [];
                    const idx = parent.children.findIndex(c => c.id === targetNode.id);
                    const insertAt = idx < 0 ? parent.children.length : idx;
                    parent.children.splice(insertAt, 0, moved);
                }

                luaSaveProject();
                luaRenderTree();
            });

            treeEl.appendChild(item);

            if (child.type === 'folder' && !child.collapsed) {
                renderFolder(child, depth + 1);
            }
        }
    }

    renderFolder(luaProject.root, 0);
}

function luaOpenFile(fileId) {
    const file = luaFindNodeById(luaProject.root, fileId);
    if (!file || file.type !== 'file') return;
    luaActiveFileId = fileId;
    luaProject.activeFileId = fileId;
    luaSaveProject();
    if (luaEditorInstance) luaEditorInstance.setValue(file.content || '');
    luaRenderTree();
}

function luaPersistEditorToActiveFile() {
    if (!luaEditorInstance || !luaProject || !luaActiveFileId) return;
    const file = luaFindNodeById(luaProject.root, luaActiveFileId);
    if (!file || file.type !== 'file') return;
    file.content = luaEditorInstance.getValue();
    luaSaveProject();
}

function luaEnsureMonacoReady() {
    return new Promise((resolve, reject) => {
        if (window.monaco && window.monaco.editor) {
            resolve(window.monaco);
            return;
        }
        if (!window.require) {
            reject(new Error('Monaco loader missing'));
            return;
        }
        const tryPaths = [
            'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs',
            'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs',
        ];

        let idx = 0;
        const tryLoad = () => {
            const vsPath = tryPaths[idx];
            window.require.config({ paths: { vs: vsPath } });
            window.require(
                ['vs/editor/editor.main'],
                () => resolve(window.monaco),
                () => {
                    idx += 1;
                    if (idx >= tryPaths.length) reject(new Error('Monaco failed to load'));
                    else tryLoad();
                },
            );
        };

        tryLoad();
    });
}

function luaSetupMonaco(monaco) {
    if (luaMonacoSetupDone) return;
    luaMonacoSetupDone = true;

    const hasLua = (monaco.languages.getLanguages() || []).some(l => l.id === 'lua');
    if (!hasLua) monaco.languages.register({ id: 'lua' });

    monaco.languages.setMonarchTokensProvider('lua', {
        keywords: [
            'and','break','do','else','elseif','end','false','for','function','goto','if','in','local',
            'nil','not','or','repeat','return','then','true','until','while',
        ],
        builtins: [
            'assert','collectgarbage','dofile','error','getmetatable','ipairs','load','loadfile','next','pairs',
            'pcall','print','rawequal','rawget','rawlen','rawset','require','select','setmetatable','tonumber',
            'tostring','type','xpcall','warn',
        ],
        tokenizer: {
            root: [
                [/--\[\[[\s\S]*?\]\]/, 'comment'],
                [/--.*$/, 'comment'],
                [/\b\d+\b/, 'number'],
                [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
                [/"([^"\\]|\\.)*"/, 'string'],
                [/'([^'\\]|\\.)*'/, 'string'],
                [/\[[=]*\[[\s\S]*?\][=]*\]/, 'string'],
                [/\b(@keywords)\b/, 'keyword'],
                [/\b(@builtins)\b/, 'type.identifier'],
                [/\b(game|workspace|script|player|Players|ReplicatedStorage|ServerScriptService|StarterPlayer|StarterGui)\b/, 'identifier'],
                [/\b(Instance|Vector3|CFrame|UDim2|Color3|Enum)\b/, 'type.identifier'],
                [/[a-zA-Z_][\w_]*/, 'identifier'],
                [/\.+/, 'delimiter'],
                [/[{}()\[\]]/, '@brackets'],
            ],
        },
    });

    monaco.languages.registerCompletionItemProvider('lua', {
        provideCompletionItems: () => {
            const suggestions = [];
            const kw = [
                'local','function','end','if','then','elseif','else','for','in','do','while','repeat','until','return',
                'true','false','nil','and','or','not',
            ];
            for (const k of kw) {
                suggestions.push({
                    label: k,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: k,
                });
            }

            const snippets = [
                {
                    label: 'print()',
                    insertText: "print('${1:text}')",
                    kind: monaco.languages.CompletionItemKind.Function,
                },
                {
                    label: 'warn()',
                    insertText: "warn('${1:text}')",
                    kind: monaco.languages.CompletionItemKind.Function,
                },
                {
                    label: 'Instance.new',
                    insertText: "local ${1:part} = Instance.new('${2:Part}')\n${1:part}.Parent = workspace\n",
                    kind: monaco.languages.CompletionItemKind.Snippet,
                },
                {
                    label: 'for ipairs',
                    insertText: "for ${1:i}, ${2:v} in ipairs(${3:t}) do\n\t${0}\nend",
                    kind: monaco.languages.CompletionItemKind.Snippet,
                },
                {
                    label: 'Connect event',
                    insertText: "${1:part}.Touched:Connect(function(${2:hit})\n\t${0}\nend)",
                    kind: monaco.languages.CompletionItemKind.Snippet,
                },
            ];

            for (const s of snippets) {
                suggestions.push({
                    label: s.label,
                    kind: s.kind,
                    insertText: s.insertText,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                });
            }

            return { suggestions };
        },
    });
}

async function luaBuildIDE(cursorBody) {
    win.classList.add('lua-ide-mode');
    cursorBody.innerHTML = '';

    const ide = document.createElement('div');
    ide.className = 'lua-ide';
    ide.innerHTML = `
        <div class="lua-toolbar">
            <button class="lua-btn-small" id="lua-new-file">New File</button>
            <button class="lua-btn-small" id="lua-new-folder">New Folder</button>
            <button class="lua-btn-small" id="lua-import">Import</button>
            <button class="lua-btn-small" id="lua-export">Export</button>
            <button class="lua-btn-small" id="lua-search">Search</button>
            <div class="lua-spacer"></div>
            <button class="lua-btn-small lua-btn-primary" id="lua-run">Run</button>
        </div>
        <div class="lua-main">
            <div class="lua-sidebar">
                <div class="lua-sidebar-header">Explorer</div>
                <div class="lua-tree" id="lua-tree"></div>
            </div>
            <div class="lua-editor-wrap">
                <div class="lua-editor" id="lua-editor"></div>
                <div class="lua-output">
                    <div class="lua-output-header">
                        <span>Output</span>
                        <button class="lua-btn-small" id="lua-clear-output">Clear</button>
                    </div>
                    <div class="lua-output-body" id="lua-output-body"></div>
                </div>
            </div>
        </div>
    `;

    const importInput = document.createElement('input');
    importInput.type = 'file';
    importInput.id = 'lua-import-input';
    importInput.accept = '.json,.lua';
    importInput.style.position = 'fixed';
    importInput.style.left = '-9999px';
    importInput.style.top = '0';
    importInput.style.opacity = '0';
    ide.appendChild(importInput);

    const ctxMenu = document.createElement('div');
    ctxMenu.id = 'lua-explorer-menu';
    ctxMenu.style.display = 'none';
    ctxMenu.style.position = 'fixed';
    ctxMenu.style.flexDirection = 'column';
    ctxMenu.style.gap = '6px';
    ctxMenu.style.padding = '8px';
    ctxMenu.style.background = 'rgba(10, 10, 10, 0.96)';
    ctxMenu.style.border = '1px solid #2a2a2a';
    ctxMenu.style.borderRadius = '10px';
    ctxMenu.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.8)';
    ctxMenu.style.zIndex = '2000';
    ctxMenu.innerHTML = `
        <button type="button" id="lua-ctx-new-file">Create File</button>
        <button type="button" id="lua-ctx-new-folder">Create Folder</button>
    `;
    ide.appendChild(ctxMenu);

    // Inline styles for context menu buttons (so it works even if CSS isn't loaded)
    const styleCtxButtons = () => {
        const btns = ctxMenu.querySelectorAll('button');
        btns.forEach(b => {
            b.style.padding = '10px 12px';
            b.style.background = 'transparent';
            b.style.border = '1px solid #333';
            b.style.color = '#d4d4d4';
            b.style.cursor = 'pointer';
            b.style.textTransform = 'uppercase';
            b.style.letterSpacing = '1px';
            b.style.fontSize = '11px';
            b.style.borderRadius = '8px';
        });
    };
    styleCtxButtons();

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'lua-modal-overlay';
    modalOverlay.innerHTML = `
        <div class="lua-modal" role="dialog" aria-modal="true">
            <div class="lua-modal-header">
                <span id="lua-modal-title">Name</span>
                <button type="button" class="lua-modal-close" id="lua-modal-close">X</button>
            </div>
            <div class="lua-modal-body">
                <div class="lua-modal-subtitle" id="lua-modal-subtitle"></div>
                <input class="lua-modal-input" id="lua-modal-input" />
                <div class="lua-modal-error" id="lua-modal-error">Please enter a name.</div>
                <div class="lua-modal-actions">
                    <button type="button" class="lua-btn-small" id="lua-modal-cancel">Cancel</button>
                    <button type="button" class="lua-btn-small lua-btn-primary" id="lua-modal-ok">Create</button>
                </div>
            </div>
        </div>
    `;
    ide.appendChild(modalOverlay);

    cursorBody.appendChild(ide);

    luaProject = luaLoadProject();
    luaActiveFileId = luaProject.activeFileId;
    luaSelectedFolderId = 'root';

    const editorEl = document.getElementById('lua-editor');
    editorEl.innerHTML = '';

    const fallbackHighlight = document.createElement('div');
    fallbackHighlight.className = 'lua-fallback-layer';
    fallbackHighlight.style.display = 'none';
    editorEl.appendChild(fallbackHighlight);

    const fallbackSuggest = document.createElement('div');
    fallbackSuggest.className = 'lua-fallback-suggest';
    fallbackSuggest.style.display = 'none';
    editorEl.appendChild(fallbackSuggest);

    const fallbackTextarea = document.createElement('textarea');
    fallbackTextarea.id = 'lua-fallback-editor';
    fallbackTextarea.spellcheck = false;
    fallbackTextarea.style.cssText = `
        width: 100%;
        height: 100%;
        background: transparent;
        border: none;
        color: transparent;
        caret-color: #d4d4d4;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        padding: 14px;
        resize: none;
        outline: none;
        line-height: 1.6;
        tab-size: 4;
        box-sizing: border-box;
        position: absolute;
        inset: 0;
    `;
    editorEl.appendChild(fallbackTextarea);

    function luaEscapeHtml(s) {
        return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    const luaKeywords = new Set([
        'and','break','do','else','elseif','end','false','for','function','goto','if','in','local','nil','not','or',
        'repeat','return','then','true','until','while',
    ]);
    const luaBuiltins = new Set([
        'print','warn','error','require','pairs','ipairs','next','type','tostring','tonumber','assert','pcall','xpcall',
        'Instance','Vector3','CFrame','UDim2','Color3','Enum','game','workspace','script','Players','ReplicatedStorage',
    ]);

    function luaRenderFallbackHighlight() {
        const text = fallbackTextarea.value || '';
        const tokenRe = /--.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][\w_]*\b/gm;
        let out = '';
        let last = 0;
        for (const m of text.matchAll(tokenRe)) {
            const idx = m.index ?? 0;
            out += luaEscapeHtml(text.slice(last, idx));
            const tok = m[0];
            let cls = '';
            if (tok.startsWith('--')) cls = 't-com';
            else if (tok.startsWith('"') || tok.startsWith("'")) cls = 't-str';
            else if (/^\d/.test(tok)) cls = 't-num';
            else if (luaKeywords.has(tok)) cls = 't-kw';
            else if (luaBuiltins.has(tok)) cls = 't-fn';
            out += cls ? `<span class="${cls}">${luaEscapeHtml(tok)}</span>` : luaEscapeHtml(tok);
            last = idx + tok.length;
        }
        out += luaEscapeHtml(text.slice(last));
        fallbackHighlight.innerHTML = out + '\n';
        fallbackHighlight.scrollTop = fallbackTextarea.scrollTop;
        fallbackHighlight.scrollLeft = fallbackTextarea.scrollLeft;
    }

    function luaHideSuggest() {
        fallbackSuggest.style.display = 'none';
        fallbackSuggest.innerHTML = '';
    }

    function luaShowSuggest() {
        const suggestions = [
            { label: 'local', insert: 'local ' },
            { label: 'function', insert: 'function ' },
            { label: 'end', insert: 'end' },
            { label: 'if then end', insert: 'if  then\n\t\nend' },
            { label: 'print("...")', insert: 'print("\")' },
            { label: 'warn("...")', insert: 'warn("\")' },
            { label: 'Instance.new', insert: 'local part = Instance.new("Part")\npart.Parent = workspace\n' },
        ];

        fallbackSuggest.innerHTML = '';
        suggestions.forEach(s => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'lua-btn-small';
            b.textContent = s.label;
            b.addEventListener('click', () => {
                const start = fallbackTextarea.selectionStart;
                const end = fallbackTextarea.selectionEnd;
                const val = fallbackTextarea.value;
                const insertText = s.insert;
                fallbackTextarea.value = val.slice(0, start) + insertText + val.slice(end);
                const pos = start + insertText.length;
                fallbackTextarea.setSelectionRange(pos, pos);
                fallbackTextarea.focus();
                luaHideSuggest();
                luaRenderFallbackHighlight();
            });
            fallbackSuggest.appendChild(b);
        });
        fallbackSuggest.style.display = 'flex';
    }

    fallbackTextarea.addEventListener('scroll', () => {
        fallbackHighlight.scrollTop = fallbackTextarea.scrollTop;
        fallbackHighlight.scrollLeft = fallbackTextarea.scrollLeft;
    });

    fallbackTextarea.addEventListener('input', () => {
        luaRenderFallbackHighlight();
    });

    fallbackTextarea.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.code === 'Space') {
            e.preventDefault();
            if (fallbackSuggest.style.display === 'flex') luaHideSuggest();
            else luaShowSuggest();
            return;
        }
        if (e.key === 'Escape') {
            luaHideSuggest();
        }
    });

    luaEditorInstance = {
        getValue: () => fallbackTextarea.value,
        setValue: (v) => { fallbackTextarea.value = v || ''; },
        getAction: () => null,
        onDidChangeModelContent: (cb) => {
            fallbackTextarea.addEventListener('input', cb);
            return { dispose: () => fallbackTextarea.removeEventListener('input', cb) };
        },
    };

    let saveTimer = null;
    const bindAutosave = () => {
        luaEditorInstance.onDidChangeModelContent(() => {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                luaPersistEditorToActiveFile();
            }, 250);
        });
    };
    bindAutosave();

    luaRenderTree();
    if (luaActiveFileId) luaOpenFile(luaActiveFileId);

    fallbackHighlight.style.display = 'block';
    luaRenderFallbackHighlight();

    function hideExplorerMenu() {
        ctxMenu.style.display = 'none';
    }

    function showExplorerMenu(x, y) {
        ctxMenu.style.left = `${x}px`;
        ctxMenu.style.top = `${y}px`;
        ctxMenu.style.display = 'flex';
    }

    function luaAskName({ title, subtitle, placeholder, defaultValue, okText }) {
        return new Promise((resolve) => {
            const titleEl = modalOverlay.querySelector('#lua-modal-title');
            const subEl = modalOverlay.querySelector('#lua-modal-subtitle');
            const inputEl = modalOverlay.querySelector('#lua-modal-input');
            const errorEl = modalOverlay.querySelector('#lua-modal-error');
            const okBtn = modalOverlay.querySelector('#lua-modal-ok');
            const cancelBtn = modalOverlay.querySelector('#lua-modal-cancel');
            const closeBtn = modalOverlay.querySelector('#lua-modal-close');

            titleEl.textContent = title || 'Name';
            subEl.textContent = subtitle || '';
            inputEl.placeholder = placeholder || '';
            inputEl.value = defaultValue || '';
            okBtn.textContent = okText || 'Create';
            inputEl.classList.remove('invalid');
            errorEl.classList.remove('show');

            const close = (val) => {
                modalOverlay.style.display = 'none';
                cleanup();
                resolve(val);
            };

            const onOk = () => {
                const v = (inputEl.value || '').trim();
                if (!v) {
                    inputEl.classList.add('invalid');
                    errorEl.classList.add('show');
                    inputEl.focus();
                    return;
                }
                close(v);
            };
            const onCancel = () => close(null);
            const onOverlayClick = (e) => {
                if (e.target === modalOverlay) close(null);
            };
            const onKey = (e) => {
                if (e.key === 'Escape') close(null);
                if (e.key === 'Enter') onOk();
            };

            const cleanup = () => {
                okBtn.removeEventListener('click', onOk);
                cancelBtn.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
                modalOverlay.removeEventListener('click', onOverlayClick);
                document.removeEventListener('keydown', onKey);
                inputEl.removeEventListener('input', onInput);
            };

            const onInput = () => {
                if ((inputEl.value || '').trim()) {
                    inputEl.classList.remove('invalid');
                    errorEl.classList.remove('show');
                }
            };

            okBtn.addEventListener('click', onOk);
            cancelBtn.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);
            modalOverlay.addEventListener('click', onOverlayClick);
            document.addEventListener('keydown', onKey);
            inputEl.addEventListener('input', onInput);

            modalOverlay.style.display = 'flex';
            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 0);
        });
    }

    async function createFolder() {
        const name = await luaAskName({
            title: 'Create Folder',
            subtitle: 'Choose a name for the new folder.',
            placeholder: 'Folder name...',
            defaultValue: '',
            okText: 'Create',
        });
        if (!name) return;
        const parent = luaFindNodeById(luaProject.root, luaSelectedFolderId) || luaProject.root;
        const folder = parent.type === 'folder' ? parent : luaProject.root;

        const newFolderName = luaEnsureUniqueChildName(folder, name);
        folder.children = folder.children || [];
        folder.children.push({
            id: luaMakeId(),
            type: 'folder',
            name: newFolderName,
            collapsed: false,
            children: [],
        });
        luaSaveProject();
        luaRenderTree();
    }

    async function createFile() {
        const raw = await luaAskName({
            title: 'Create File',
            subtitle: 'Choose a file name (example: main.lua).',
            placeholder: 'File name (example: script.lua)...',
            defaultValue: 'script.lua',
            okText: 'Create',
        });
        const fileName = luaNormalizeFileName(raw);
        if (!fileName) return;
        const parent = luaFindNodeById(luaProject.root, luaSelectedFolderId) || luaProject.root;
        const folder = parent.type === 'folder' ? parent : luaProject.root;

        const finalName = luaEnsureUniqueChildName(folder, fileName);
        const newId = luaMakeId();
        folder.children = folder.children || [];
        folder.children.push({
            id: newId,
            type: 'file',
            name: finalName,
            content: '',
        });
        luaSaveProject();
        luaRenderTree();
        luaOpenFile(newId);
    }

    document.getElementById('lua-clear-output').addEventListener('click', () => {
        luaClearOutput();
    });

    document.getElementById('lua-search').addEventListener('click', async () => {
        if (!luaEditorInstance) return;
        const action = luaEditorInstance.getAction('actions.find');
        if (action) {
            action.run();
            return;
        }

        const term = await luaAskName({
            title: 'Search',
            subtitle: 'Find text in the editor.',
            placeholder: 'Search...',
            defaultValue: '',
            okText: 'Find',
        });
        if (!term) return;

        const text = fallbackTextarea.value;
        const from = fallbackTextarea.selectionEnd || 0;
        let idx = text.indexOf(term, from);
        if (idx === -1) idx = text.indexOf(term, 0);
        if (idx === -1) return;
        fallbackTextarea.focus();
        fallbackTextarea.setSelectionRange(idx, idx + term.length);
    });

    document.getElementById('lua-new-folder').addEventListener('click', async (e) => {
        e.stopPropagation();
        await createFolder();
    });

    document.getElementById('lua-new-file').addEventListener('click', async (e) => {
        e.stopPropagation();
        await createFile();
    });

    document.getElementById('lua-ctx-new-folder').addEventListener('click', async () => {
        hideExplorerMenu();
        await createFolder();
    });

    document.getElementById('lua-ctx-new-file').addEventListener('click', async () => {
        hideExplorerMenu();
        await createFile();
    });

    const treeEl = document.getElementById('lua-tree');
    treeEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const item = e.target.closest('.lua-tree-item');
        if (item) {
            const id = item.dataset.id;
            const type = item.dataset.type;
            if (type === 'folder') {
                luaSelectedFolderId = id;
            } else if (type === 'file') {
                const parent = luaFindParentOf(luaProject.root, id);
                luaSelectedFolderId = (parent || luaProject.root).id;
            }
        }

        showExplorerMenu(e.clientX, e.clientY);
    });

    ide.addEventListener('click', (e) => {
        if (e.target.closest('#lua-explorer-menu')) return;
        hideExplorerMenu();
    });

    document.getElementById('lua-import').addEventListener('click', (e) => {
        e.stopPropagation();
        importInput.value = '';
        importInput.click();
    });

    importInput.addEventListener('change', async () => {
        const file = importInput.files && importInput.files[0];
        if (!file) return;

        const text = await file.text();
        if (file.name.toLowerCase().endsWith('.json')) {
            try {
                const parsed = JSON.parse(text);
                if (!parsed || !parsed.root || parsed.root.type !== 'folder') throw new Error('Invalid project');
                luaProject = parsed;
                luaActiveFileId = luaProject.activeFileId || null;
                luaSelectedFolderId = 'root';
                luaSaveProject();
                luaRenderTree();
                if (luaActiveFileId) luaOpenFile(luaActiveFileId);
                luaAppendOutput('log', `Imported project: ${file.name}`);
            } catch {
                luaAppendOutput('error', 'Import failed: invalid JSON project');
            }
            return;
        }

        if (file.name.toLowerCase().endsWith('.lua')) {
            const folder = luaProject.root;
            const finalName = luaEnsureUniqueChildName(folder, file.name);
            const newId = luaMakeId();
            folder.children = folder.children || [];
            folder.children.push({ id: newId, type: 'file', name: finalName, content: text });
            luaSaveProject();
            luaRenderTree();
            luaOpenFile(newId);
            luaAppendOutput('log', `Imported file: ${finalName}`);
        }
    });

    document.getElementById('lua-export').addEventListener('click', async () => {
        luaPersistEditorToActiveFile();

        const totalFiles = luaCountFiles(luaProject.root);
        if (totalFiles <= 1) {
            const file = luaFindNodeById(luaProject.root, luaActiveFileId);
            const name = file && file.type === 'file' ? luaNormalizeFileName(file.name) : 'script.lua';
            const content = file && file.type === 'file' ? (file.content || '') : '';
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            luaAppendOutput('log', `Exported file: ${name}`);
            return;
        }

        if (!window.JSZip) {
            // Fallback: export each file as a separate .lua download
            const files = [];
            const walk = (node, prefix) => {
                if (!node) return;
                if (node.type === 'file') {
                    const name = luaNormalizeFileName(node.name) || 'script.lua';
                    const safePrefix = prefix ? `${prefix}__` : '';
                    files.push({
                        name: safePrefix + name,
                        content: node.content || '',
                    });
                    return;
                }
                if (node.type === 'folder' && Array.isArray(node.children)) {
                    const nextPrefix = node.id === 'root'
                        ? prefix
                        : (prefix ? `${prefix}__${node.name}` : node.name);
                    node.children.forEach(c => walk(c, nextPrefix));
                }
            };
            walk(luaProject.root, '');

            for (let i = 0; i < files.length; i += 1) {
                const f = files[i];
                luaDownloadTextFile(f.name, f.content);
                await new Promise(r => setTimeout(r, 150));
            }
            luaAppendOutput('log', `Exported ${files.length} file(s)`);
            return;
        }

        const zip = new window.JSZip();
        luaZipAddTree(zip, luaProject.root, '');
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lua-project.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        luaAppendOutput('log', 'Exported project: lua-project.zip');
    });

    document.getElementById('lua-run').addEventListener('click', () => {
        luaPersistEditorToActiveFile();
        luaClearOutput();
        const file = luaFindNodeById(luaProject.root, luaActiveFileId);
        const code = file && file.type === 'file' ? (file.content || '') : '';
        const lines = code.split('\n');

        let printed = 0;
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('--')) continue;

            const printMatch = trimmed.match(/^print\((['"])(.*)\1\)\s*;?$/);
            if (printMatch) {
                luaAppendOutput('log', printMatch[2]);
                printed += 1;
                continue;
            }

            const warnMatch = trimmed.match(/^warn\((['"])(.*)\1\)\s*;?$/);
            if (warnMatch) {
                luaAppendOutput('warn', warnMatch[2]);
                printed += 1;
                continue;
            }

            const errorMatch = trimmed.match(/^error\((['"])(.*)\1\)\s*;?$/);
            if (errorMatch) {
                luaAppendOutput('error', errorMatch[2]);
                printed += 1;
                continue;
            }
        }

        if (printed === 0) luaAppendOutput('log', 'No output');
    });

    try {
        const monaco = await luaEnsureMonacoReady();
        luaSetupMonaco(monaco);
        editorEl.innerHTML = '';
        luaEditorInstance = monaco.editor.create(editorEl, {
            value: '',
            language: 'lua',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineHeight: 20,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            suggestOnTriggerCharacters: true,
            quickSuggestions: { other: true, comments: false, strings: false },
        });
        bindAutosave();
        if (luaActiveFileId) luaOpenFile(luaActiveFileId);
    } catch {
        // Silent: fallback editor is already active
    }
}

// --- EFFET REGARD (MOUSE LOOK) ---
document.addEventListener('mousemove', (e) => {
    if (isStarted || win.classList.contains('fullscreen')) return;
    const rect = win.getBoundingClientRect();
    const rotateX = ((e.clientY - (rect.top + rect.height / 2)) / 60) * -1;
    const rotateY = ((e.clientX - (rect.left + rect.width / 2)) / 60) * 1;
    win.style.transform = `translate(-50%, -50%) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
});

// --- BOOT SEQUENCE ---
async function runBoot() {
    const logs = ["[ OK ] Initializing...", "[ OK ] System Secure.", "aazyris@login:~$ mount /ui", "Status: CONNECTED"];
    bootArea.innerHTML = "";
    for (const text of logs) {
        const div = document.createElement('div');
        div.className = "terminal-line";
        div.innerHTML = text.includes('[ OK ]') ? `<span class="ok">[ OK ]</span> ${text.replace('[ OK ]', '')}` : `> ${text}`;
        bootArea.appendChild(div);
        await new Promise(r => setTimeout(r, 100));
    }
    setTimeout(() => {
        bootArea.style.display = 'none';
        win.classList.remove('active'); // Retire la rotation Look
        win.classList.add('fullscreen');
        setTimeout(() => {
            searchContainer.style.display = 'flex';
            hiddenInput.focus();

            stackBindWheelOnce();
            stackEnsureInit();
            stackActivateIndex(stackIndex);
        }, 600);
    }, 600);
}

// --- EVENT LISTENERS ---
btn.addEventListener('click', () => {
    isStarted = true;
    btn.classList.add('hide');
    win.style.transform = '';
    win.classList.add('active');
    setTimeout(runBoot, 800);
});

hiddenInput.addEventListener('input', (e) => {
    visualText.textContent = e.target.value;
});

hiddenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && visualText.textContent.trim() !== "") {
        hiddenInput.disabled = true;
        searchBlinker.style.display = 'none';
        searchBarWrap.classList.add('submitted');
    }
});

if (menuToggle && menuActions) {
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        menuActions.classList.toggle('open');
        if (!menuActions.classList.contains('open')) {
            socialLinks.style.display = 'none';
        }
    });
}

if (socialBtn) {
    socialBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        socialLinks.style.display = (socialLinks.style.display === 'flex') ? 'none' : 'flex';
    });
}

document.addEventListener('click', () => {
    if (menuActions && menuActions.classList.contains('open')) {
        menuActions.classList.remove('open');
        socialLinks.style.display = 'none';
    }
    if (!win.classList.contains('lua-ide-mode') && isStarted && !hiddenInput.disabled) hiddenInput.focus();
});

// --- LUA FUNCTIONALITY ---
luaBtn.addEventListener('click', () => {
    luaStarted = true;

    // Hide button immediately
    luaBtn.style.display = 'none';
    hiddenInput.disabled = true;

    // Hide search immediately
    searchContainer.style.display = 'none';

    // Reset stacked windows when entering Lua mode
    if (stackWindows.length > 1) {
        for (let i = 1; i < stackWindows.length; i += 1) {
            try { stackWindows[i].remove(); } catch { /* ignore */ }
        }
    }
    stackWindows = [];
    stackIndex = 0;
    stackWheelAccum = 0;
    stackAnimating = false;
    win.classList.remove('stack-window');
    win.classList.remove('stack-active');
    win.style.removeProperty('--stack-y');
    win.style.removeProperty('--stack-opacity');
    win.style.removeProperty('--stack-scale');

    // Step 1: Make window smaller first
    win.classList.remove('fullscreen');
    win.style.width = '400px';
    win.style.height = '250px';
    win.style.transform = 'translate(-50%, -50%) scale(1)';
    win.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';

    setTimeout(() => {
        // Step 2: Transform main window style
        win.classList.add('resizing');
        win.classList.add('lua-console-style');

        // Step 3: Start the rotation and loading sequence
        setTimeout(() => {
            runLuaCommands();
        }, 1000);
    }, 1000);
});

// --- LUA COMMANDS AND LOADING ---
async function runLuaCommands() {
    // Step 1: Clear any existing content and show loading bar immediately
    const cursorBody = win.querySelector('.cursor-body');
    cursorBody.innerHTML = '';

    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-container';
    loadingDiv.style.display = 'flex';
    loadingDiv.innerHTML = `
        <div class="loading-bar">
            <div class="loading-progress" id="loading-progress"></div>
        </div>
    `;
    cursorBody.appendChild(loadingDiv);

    const loadingProgress = document.getElementById('loading-progress');
    const loadingSteps = [25, 50, 75, 100];
    for (let i = 0; i < loadingSteps.length; i++) {
        loadingProgress.style.width = loadingSteps[i] + '%';
        await new Promise(r => setTimeout(r, 800));
    }

    // Hide loading bar
    loadingDiv.style.display = 'none';

    // Flip 180 degrees
    win.classList.add('rotate-180');
    await new Promise(r => setTimeout(r, 900));

    // Command-style intro
    cursorBody.style.transition = '';
    cursorBody.style.opacity = '1';
    cursorBody.innerHTML = `
        <div class="terminal-line" style="padding: 30px;">
            <span class="prompt-static">aazyris@login &gt;</span>
            <span id="lua-intro-text"></span>
            <span class="blinker"></span>
        </div>
    `;

    const introEl = document.getElementById('lua-intro-text');
    const textToType = ' hello user';
    for (let i = 0; i < textToType.length; i += 1) {
        introEl.textContent += textToType[i];
        await new Promise(r => setTimeout(r, 70));
    }

    await new Promise(r => setTimeout(r, 700));

    cursorBody.style.transition = 'opacity 600ms ease';
    cursorBody.style.opacity = '0';
    await new Promise(r => setTimeout(r, 650));
    cursorBody.style.opacity = '1';
    cursorBody.style.transition = '';

    // Go fullscreen and load IDE
    win.classList.add('fullscreen');
    await new Promise(r => setTimeout(r, 900));
    await luaBuildIDE(cursorBody);
}
