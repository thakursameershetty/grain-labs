// v6 is served at the site root (/, /articles, /articles/<slug>) and still at /version6 (…/version6/articles). HOME is
// whichever base the page was opened on, so every internal link stays on it.
export const HOME = /^\/version6(\/|$)/.test(window.location.pathname) ? "/version6" : "";
