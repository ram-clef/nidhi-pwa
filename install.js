// Installation is optional. Native install prompts depend on browser support.
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const header = document.querySelector('#install');
let deferred, banner;
const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function hide() { if (banner) banner.remove(); banner = null; }
function dismiss() { localStorage.setItem('nidhi-install-dismissed', String(Date.now())); hide(); }
function instructions() {
  const modal = document.querySelector('#modal');
  if (modal.open) return;
  document.querySelector('#modal-body').innerHTML = `<h2>Keep Nidhi close</h2><p>Install Nidhi for a full-screen app experience and quick access from your home screen. You can also keep using it in this browser.</p>${ios ? '<div class="notice"><b>On iPhone or iPad</b><br>Open this link in Safari. Tap Share, then <b>Add to Home Screen</b> and confirm <b>Add</b>.</div>' : '<div class="notice"><b>On Android or desktop</b><br>Open your browser menu and choose <b>Install app</b>, <b>Install Nidhi</b>, or <b>Add to Home screen</b>. The wording depends on your browser. If these options are unavailable, try Chrome or Edge.</div>'}<p class="hint">Installation does not move records between devices or browsers. Use Excel export and import to transfer your data between devices. Your ledger stays in this browser until you export or share it.</p>`;
  document.querySelector('#modal-actions').innerHTML = '<button type="button" class="primary" data-close>Got it</button>';
  document.querySelector('#modal-error').textContent = '';
  document.querySelector('#modal-form').onsubmit = e => e.preventDefault();
  modal.showModal();
}
async function install() {
  if (standalone()) return;
  if (!deferred) { instructions(); return; }
  const event = deferred; deferred = null;
  try {
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === 'accepted') hide();
    else dismiss();
  } catch { instructions(); }
}
function showBanner() {
  if (standalone() || banner) return;
  const last = Number(localStorage.getItem('nidhi-install-dismissed') || 0);
  if (Date.now() - last < 7 * 86400000) return;
  banner = document.createElement('section');
  banner.className = 'install-banner';
  banner.setAttribute('aria-label', 'Install Nidhi');
  banner.innerHTML = '<img src="./icon.svg" alt=""><div><b>Your money, a tap away.</b><p>Install Nidhi for quick access and an app-like experience.</p></div><button class="primary" type="button">Install Nidhi</button><button class="install-later" type="button" aria-label="Remind me later">Later</button>';
  banner.querySelector('.primary').onclick = install;
  banner.querySelector('.install-later').onclick = dismiss;
  document.body.append(banner);
}
if (header) { header.hidden = standalone(); header.onclick = install; }
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (header) header.hidden = standalone(); showBanner(); });
window.addEventListener('appinstalled', () => { deferred = null; hide(); if (header) header.hidden = true; });
matchMedia('(display-mode: standalone)').addEventListener('change', e => { if (e.matches) { hide(); if (header) header.hidden = true; } });
if (!standalone()) setTimeout(showBanner, 1800);
