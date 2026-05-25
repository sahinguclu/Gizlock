/**
 * Gizlock — theme.js
 * Dark / light mode toggle, persisted via localStorage.
 * Runs on both index.html and page.html so the theme stays
 * consistent no matter which page you are on.
 *
 * Made by Şahin Güçlü with ❤️
 * https://github.com/sahinguclu/Gizlock
 */

function applyTheme() {
    const theme = localStorage.getItem("site_theme") || "light";
    if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
    } else {
        document.documentElement.removeAttribute("data-theme");
    }
}
applyTheme(); // Run immediately so there is no flash of the wrong theme on load

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    if (currentTheme === "dark") {
        document.documentElement.removeAttribute("data-theme");
        localStorage.setItem("site_theme", "light");
    } else {
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("site_theme", "dark");
    }
}
