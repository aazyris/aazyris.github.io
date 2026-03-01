let currentPage = 'mirfayel';

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
    const filename = 'mirfayel';
    
    switch(format) {
        case 'pdf':
            // Pour PDF, vous pouvez utiliser une librairie comme jsPDF
            alert('Téléchargement PDF - À implémenter avec jsPDF\n\nPour l\'instant, vous pouvez utiliser l\'impression et choisir "Enregistrer en PDF" dans les options d\'impression.');
            break;
        case 'word':
            downloadTextFile(content, `${filename}.docx`);
            break;
        case 'latex':
            downloadTextFile(`\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage[T1]{fontenc}\n\\title{Rapport de Stage - Animation périscolaire}\n\\author{Mirfayel}\n\\date{\\today}\n\n\\begin{document}\n\n\\maketitle\n\n${content.replace(/\n/g, '\n\n')}\n\n\\end{document}`, `${filename}.tex`);
            break;
        case 'markdown':
            downloadTextFile(`# Rapport de Stage - Animation périscolaire\n\n${content}`, `${filename}.md`);
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

// Smooth scroll pour les liens du sommaire
document.addEventListener('DOMContentLoaded', function() {
    const sommaireLinks = document.querySelectorAll('.sommaire a');
    sommaireLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
