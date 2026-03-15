// Shared dark/light mode toggle used by all pages except homepage (which uses app.js)
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = 'Light Mode';
        logo.src = 'bowl_iq_darkmode.png';
    } else {
        document.body.classList.remove('dark-mode');
        themeToggle.textContent = 'Dark Mode';
        logo.src = 'bowl_iq_lightmode.png';
    }
}

themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        themeToggle.textContent = 'Light Mode';
        logo.src = 'bowl_iq_darkmode.png';
        localStorage.setItem('theme', 'dark');
    } else {
        themeToggle.textContent = 'Dark Mode';
        logo.src = 'bowl_iq_lightmode.png';
        localStorage.setItem('theme', 'light');
    }
});

initializeTheme();