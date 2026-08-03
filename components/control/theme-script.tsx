/**
 * Applies the stored theme before the browser paints.
 *
 * Without this, every control surface renders dark, hydrates, and *then*
 * flips to light — a full-screen flash on every navigation for anyone who
 * chose light mode. The toggle itself cannot fix that: React effects run
 * after paint, by definition.
 *
 * It is inline and synchronous on purpose. It reads its own parent from
 * `document.currentScript`, so it colours the surface it sits inside without
 * needing to know a selector or wait for the rest of the document.
 *
 * Server component — no "use client". It emits a string; nothing hydrates.
 */
const SRC = `(function(){try{
  var s=document.currentScript;var p=s&&s.parentElement;if(!p)return;
  if(localStorage.getItem('suth.theme')==='light')p.setAttribute('data-theme','light');
}catch(e){}})();`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: SRC }} />;
}
