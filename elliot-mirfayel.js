let currentPage = null;

// Gérer l'URL pour afficher la bonne page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const page = urlParams.get('page');
    
    if (page === 'elliot') {
        showPage('elliot-page');
    } else if (page === 'mirfayel') {
        showPage('mirfayel-page');
    } else {
        // Page par défaut si non spécifié
        showPage('elliot-page');
    }
});

function showPage(pageId) {
    hideAllPages();
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'flex';
        page.classList.add('show');
        currentPage = pageId;
    }
}

function hideAllPages() {
    const pages = document.querySelectorAll('.content-page');
    pages.forEach(page => {
        page.style.display = 'none';
        page.classList.remove('show');
    });
}

function returnToMain() {
    window.location.href = 'index.html';
}

function printPage() {
    window.print();
}

function toggleDownloadMenu() {
    const menu = document.getElementById('download-menu');
    if (menu) {
        menu.classList.toggle('show');
    }
}

function downloadAs(format) {
    const content = document.querySelector('.page-content').innerText;
    const filename = currentPage === 'elliot-page' ? 'elliot' : 'mirfayel';
    
    switch(format) {
        case 'pdf':
            // Pour PDF, vous pouvez utiliser une librairie comme jsPDF
            alert('Téléchargement PDF - À implémenter avec jsPDF\n\nPour l\'instant, vous pouvez utiliser l\'impression et choisir "Enregistrer en PDF" dans les options d\'impression.');
            break;
        case 'word':
            downloadTextFile(content, `${filename}.docx`);
            break;
        case 'latex':
            downloadTextFile(`\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\title{${filename.charAt(0).toUpperCase() + filename.slice(1)}}\n\\author{Document généré}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n${content.replace(/\n/g, '\n\n')}\n\n\\end{document}`, `${filename}.tex`);
            break;
        case 'markdown':
            downloadTextFile(`# ${filename.charAt(0).toUpperCase() + filename.slice(1)}\n\n${content}`, `${filename}.md`);
            break;
    }
    
    // Fermer le menu
    const menu = document.getElementById('download-menu');
    if (menu) {
        menu.classList.remove('show');
    }
}

function downloadTextFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Fermer le menu déroulant quand on clique ailleurs
document.addEventListener('click', function(event) {
    const dropdown = document.querySelector('.download-dropdown');
    if (dropdown && !dropdown.contains(event.target)) {
        const menu = document.getElementById('download-menu');
        if (menu) {
            menu.classList.remove('show');
        }
    }
});

// Gestion des raccourcis clavier
document.addEventListener('keydown', function(event) {
    // Échap pour retourner au menu principal
    if (event.key === 'Escape') {
        returnToMain();
    }
    
    // Ctrl+P pour imprimer
    if (event.ctrlKey && event.key === 'p') {
        event.preventDefault();
        printPage();
    }
    
    // Ctrl+S pour télécharger (format par défaut: markdown)
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        downloadAs('markdown');
    }
});
