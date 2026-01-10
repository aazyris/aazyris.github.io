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
const settingsBtn = document.getElementById('settings-btn');
const socialLinks = document.getElementById('social-links');
const requestWindow = document.getElementById('script-request-window');

// --- LUA ELEMENTS ---
const luaBtn = document.getElementById('lua-btn');
const luaConsole = document.getElementById('lua-console');
const luaBootArea = document.getElementById('lua-boot-area');
const loadingContainer = document.getElementById('loading-container');
const loadingProgress = document.getElementById('loading-progress');
const loadingText = document.getElementById('loading-text');

let isStarted = false;
let luaStarted = false;

// --- EFFET REGARD (MOUSE LOOK) ---
document.addEventListener('mousemove', (e) => {
    if (isStarted) return;
    const rect = win.getBoundingClientRect();
    const rotateX = ((e.clientY - (rect.top + rect.height / 2)) / 60) * -1;
    const rotateY = ((e.clientX - (rect.left + rect.width / 2)) / 60) * 1;
    win.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
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
            requestWindow.style.display = 'flex';
            hiddenInput.focus();
        }, 600);
    }, 600);
}

// --- EVENT LISTENERS ---
btn.addEventListener('click', () => {
    isStarted = true;
    btn.classList.add('hide');
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
        menuContainer.classList.add('hide-menu');
    }
});

settingsBtn.addEventListener('click', () => {
    settingsBtn.style.display = 'none'; 
    socialLinks.style.display = 'flex'; 
});

document.getElementById('send-request').addEventListener('click', () => {
    const name = document.getElementById('script-name').value;
    if(name) {
        document.getElementById('send-request').textContent = "SENT!";
        setTimeout(() => { requestWindow.style.display = 'none'; }, 1000);
    }
});

document.addEventListener('click', () => { 
    if (isStarted && !hiddenInput.disabled) hiddenInput.focus(); 
});

// --- LUA FUNCTIONALITY ---
luaBtn.addEventListener('click', () => {
    luaStarted = true;
    
    console.log("LUA button clicked");
    
    // Hide button immediately
    luaBtn.style.display = 'none';
    
    // Hide search bar and settings immediately
    searchContainer.style.display = 'none';
    requestWindow.style.display = 'none';
    
    // NEW METHOD: First make window smaller, then do animations
    console.log("Making window smaller first...");
    
    // Remove fullscreen to make it smaller
    win.classList.remove('fullscreen');
    win.style.width = '400px';
    win.style.height = '250px';
    win.style.transform = 'scale(1)';
    win.style.transition = 'all 1s cubic-bezier(0.4, 0, 0.2, 1)';
    
    setTimeout(() => {
        console.log("Window is now smaller, starting animations...");
        
        // Step 2: Transform main window into console
        win.classList.add('resizing');
        win.classList.add('lua-console-style');
        
        console.log("Window classes added:", win.className);
        
        // Step 3: Change window content to console
        setTimeout(() => {
            // Change title
            win.querySelector('.cursor-title').textContent = 'Lua Environment — bash';
            
            // Replace boot area with Lua boot area
            bootArea.style.display = 'none';
            
            // Add Lua boot area
            const luaBootDiv = document.createElement('div');
            luaBootDiv.id = 'lua-boot-area-temp';
            luaBootDiv.innerHTML = `
                <div class="terminal-line">
                    <span class="lua-prompt">lua@environment ></span><span class="blinker"></span>
                </div>
            `;
            win.querySelector('.cursor-body').appendChild(luaBootDiv);
            
            console.log("Window content changed");
            
            // Step 4: Type commands and show loading
            setTimeout(() => {
                runLuaCommands();
            }, 1000);
        }, 800);
    }, 1000);
});

// --- LUA COMMANDS AND LOADING ---
async function runLuaCommands() {
    console.log("Starting Lua commands...");
    
    // Skip commands and go directly to 180° rotation
    console.log("Skipping commands, starting 180° rotation...");
    
    // Step 1: 180° rotation immediately
    console.log("Current window classes before rotation:", win.className);
    console.log("Window computed style before rotation:", window.getComputedStyle(win).transform);
    
    win.classList.add('rotate-180');
    console.log("Added rotate-180 class");
    console.log("Window classes after rotation:", win.className);
    
    // Force the rotation style directly as backup (simple rotation without content flip)
    win.style.transform = 'scale(0.8) rotateY(180deg)';
    win.style.transition = 'transform 3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Wait for rotation to complete
    await new Promise(r => setTimeout(r, 3000));
    console.log("Rotation should be complete");
    console.log("Window computed style after rotation:", window.getComputedStyle(win).transform);
    
    // Step 2: Clear commands and show loading bar immediately after rotation
    const luaBootArea = document.getElementById('lua-boot-area-temp');
    if (luaBootArea) {
        luaBootArea.style.display = 'none';
    }
    
    console.log("Showing loading bar after rotation...");
    
    // Create and show loading bar
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'loading-container';
    loadingDiv.style.display = 'flex';
    loadingDiv.innerHTML = `
        <div class="loading-bar">
            <div class="loading-progress" id="loading-progress"></div>
        </div>
    `;
    win.querySelector('.cursor-body').appendChild(loadingDiv);
    
    console.log("Loading bar should be visible now");
    
    // Step 3: Animate loading bar
    const loadingProgress = document.getElementById('loading-progress');
    
    const loadingSteps = [25, 50, 75, 100];
    
    console.log("Starting loading animation...");
    
    // Animate each loading step
    for (let i = 0; i < loadingSteps.length; i++) {
        const progress = loadingSteps[i];
        loadingProgress.style.width = progress + '%';
        console.log(`Loading step ${i + 1}: ${progress}%`);
        await new Promise(r => setTimeout(r, 800));
    }
    
    console.log("Loading complete, going fullscreen without turn animation...");
    
    // Step 4: Go fullscreen immediately without turn animation
    loadingDiv.style.display = 'none';
    
    console.log("Going fullscreen immediately without turn animation...");
    
    // Make window go fullscreen (no rotation, just normal fullscreen)
    console.log("Current window classes before fullscreen:", win.className);
    win.classList.remove('rotate-180');
    win.classList.add('fullscreen');
    console.log("Added fullscreen class");
    console.log("Window classes after fullscreen:", win.className);
    
    // Force fullscreen styles (normal, no rotation)
    win.style.width = '100vw';
    win.style.height = '100vh';
    win.style.borderRadius = '0';
    win.style.border = 'none';
    win.style.transform = 'scale(1)'; // Normal scale, no rotation
    win.style.top = '0';
    win.style.left = '0';
    win.style.transition = 'all 3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    console.log("Forced fullscreen styles (normal, no rotation)");
    
    // Step 5: Transform current window body to code environment
    await new Promise(r => setTimeout(r, 1000));
    console.log("Transforming current window to code environment...");
    
    // Transform the existing window body
    const cursorBody = win.querySelector('.cursor-body');
    cursorBody.innerHTML = '';
    cursorBody.style.display = 'flex';
    cursorBody.style.flexDirection = 'column';
    cursorBody.style.position = 'relative';
    cursorBody.style.height = 'calc(100% - 35px)';
    
    // Create code editor in current window
    const editor = document.createElement('textarea');
    editor.id = 'lua-editor';
    editor.placeholder = '-- Write your Lua code here...';
    editor.style.cssText = `
        flex: 1;
        width: 100%;
        background: #1e1e1e;
        border: none;
        color: #d4d4d4;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 14px;
        padding: 20px;
        resize: none;
        outline: none;
        line-height: 1.5;
        tab-size: 4;
    `;
    cursorBody.appendChild(editor);
    
    // Create run button
    const runBtn = document.createElement('button');
    runBtn.id = 'lua-run-btn';
    runBtn.textContent = 'RUN';
    runBtn.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        padding: 10px 25px;
        background: #007acc;
        border: none;
        color: #fff;
        cursor: pointer;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-size: 12px;
        border-radius: 5px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0, 122, 204, 0.3);
        transition: all 0.3s ease;
    `;
    cursorBody.appendChild(runBtn);
    
    // Create output panel
    const output = document.createElement('div');
    output.id = 'lua-output';
    output.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 200px;
        background: #252526;
        border-top: 1px solid #3e3e42;
        color: #d4d4d4;
        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
        font-size: 13px;
        padding: 15px;
        overflow-y: auto;
        box-sizing: border-box;
    `;
    cursorBody.appendChild(output);
    
    // Add output label
    const outputLabel = document.createElement('div');
    outputLabel.style.cssText = `
        position: absolute;
        top: 2px;
        left: 15px;
        font-size: 11px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 1px;
    `;
    outputLabel.textContent = 'OUTPUT';
    output.appendChild(outputLabel);
    
    console.log("Current window transformed to code environment");
    
    // Add run functionality
    runBtn.addEventListener('click', () => {
        const code = editor.value;
        
        if (code.trim()) {
            output.innerHTML = '';
            output.appendChild(outputLabel);
            
            const runningDiv = document.createElement('div');
            runningDiv.className = 'terminal-line';
            runningDiv.textContent = '> Running Lua code...';
            output.appendChild(runningDiv);
            
            setTimeout(() => {
                const lines = code.split('\n');
                
                lines.forEach(line => {
                    if (line.trim()) {
                        if (line.includes('print')) {
                            const match = line.match(/print\(["'](.*)["']\)/);
                            if (match) {
                                const resultDiv = document.createElement('div');
                                resultDiv.className = 'terminal-line';
                                resultDiv.textContent = match[1];
                                output.appendChild(resultDiv);
                            }
                        } else {
                            const resultDiv = document.createElement('div');
                            resultDiv.className = 'terminal-line';
                            resultDiv.textContent = `> Executed: ${line.trim()}`;
                            output.appendChild(resultDiv);
                        }
                    }
                });
            }, 500);
        }
    });
    
    console.log("Lua environment fully loaded in current window");
}
