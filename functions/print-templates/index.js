// functions/print-templates/index.js
// Re-exportiert alle Seiten-Vorlagen für das SocialFlow Pro Magazin-System.
//
// Verwendung in print-generate.js:
//   import {
//     buildCoverPage, buildEditorialPage, buildTOCPage,
//     buildOpenerPage, buildIntroPage, buildStandardPage, buildNewsPage,
//   } from './print-templates/index.js';

// Bestehende Templates (Cover, Editorial, Inhaltsverzeichnis)
export { buildCoverPage }    from './cover.js';
export { buildEditorialPage } from './editorial.js';
export { buildTOCPage }      from './toc.js';

// Artikel-Templates (Opener, Intro, Feature, Kurzmeldungen)
export { buildOpenerPage }   from './opener.js';
export { buildIntroPage }    from './intro.js';
export { buildStandardPage } from './standard.js';
export { buildNewsPage }     from './news.js';
