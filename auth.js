const encode=new TextEncoder(),decode=new TextDecoder();
export const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s)};
export const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
let db,key=null,epoch=0,meta,onUnlock,onLock,opening=false,systemPrompt=0;
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
async function database(){if(db)return db;db=await new Promise((resolve,reject)=>{const r=indexedDB.open('nidhi-web',1);r.onupgradeneeded=()=>r.result.createObjectStore('state');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return db}
export const isUnlocked=()=>key!==null;
export const sessionId=()=>epoch;
export function assertSession(id=epoch){if(!key||id!==epoch)throw Error('Nidhi is locked. Unlock and retry this action.')}
async function derive(pin,salt){const base=await crypto.subtle.importKey('raw',encode.encode(pin),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:210000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function seal(value,name,secret){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encode.encode(name)},secret,encode.encode(JSON.stringify(value)));return {nidhiEncrypted:1,iv:b64(iv),cipher:b64(new Uint8Array(cipher))}}
async function open(value,name,secret){return JSON.parse(decode.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(value.iv),additionalData:encode.encode(name)},secret,unb64(value.cipher))))}
async function serialize(value){if(value?.blob instanceof Blob)return {...value,blob:{nidhiBlob:1,type:value.blob.type,bytes:b64(new Uint8Array(await value.blob.arrayBuffer()))}};return value}
function deserialize(value){if(value?.blob?.nidhiBlob)return {...value,blob:new Blob([unb64(value.blob.bytes)],{type:value.blob.type})};return value}
export async function secureRead(name){assertSession();const id=epoch,secret=key;const store=(await database()).transaction('state').objectStore('state');const record=await request(store.get(name));assertSession(id);if(record===undefined)return undefined;if(record?.nidhiEncrypted!==1){await secureWrite(name,record);assertSession(id);return record;}const result=deserialize(await open(record,name,secret));assertSession(id);return result}
export async function secureWrite(name,value){assertSession();const id=epoch,secret=key;const encrypted=await seal(await serialize(value),name,secret);assertSession(id);await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(encrypted,name);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Local write failed'))});assertSession(id)}
export async function secureDelete(name){assertSession();await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').delete(name);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)})}
function show(){document.body.classList.add('app-locked');document.querySelector('main').inert=true;document.querySelector('.sidebar').inert=true;const gate=document.querySelector('#auth-gate');gate.hidden=false;const setup=!meta;
 gate.innerHTML=`<div class="auth-card"><img src="./icon.svg" alt="Nidhi"><h1>${setup?'Your Nidhi starts here':'Welcome back'}</h1><p>${setup?'Set your name and a six-digit PIN to protect this browser’s ledger.':'Enter your six-digit PIN to open your ledger.'}</p><form id="auth-form" class="fields">${setup?'<label>Your name<input name="name" autocomplete="given-name" required maxlength="60" placeholder="Your name"></label>':''}<label>${setup?'Create PIN':'PIN'}<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="${setup?'new-password':'current-password'}" required placeholder="Six digits"></label>${setup?'<label>Confirm PIN<input name="confirm" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="new-password" required placeholder="Enter PIN again"></label>':''}<button class="primary" type="submit">${setup?'Create my space':'Unlock Nidhi'}</button><span id="auth-error" role="alert"></span></form><p class="auth-build">UI build 27</p><p class="auth-note">${setup?'Keep a downloaded Excel copy. A forgotten PIN cannot decrypt this browser’s ledger. Daily Excel preparation is enabled automatically.':'Your PIN is local to this browser. It cannot be recovered. Use an Excel copy on a new browser profile if you forget it.'}</p></div>`;
 const existing=JSON.parse(localStorage.getItem('nidhi-prefs')||'{}').name;if(setup&&existing)gate.querySelector('[name=name]').value=existing;
 gate.querySelector('form').onsubmit=submit;
}
function failure(message){document.querySelector('#auth-error').textContent=message}
async function submit(e){e.preventDefault();if(opening)return;const fd=new FormData(e.target),pin=String(fd.get('pin'));if(!/^\d{6}$/.test(pin)){failure('Enter exactly six digits.');return}const blocked=Number(localStorage.getItem('nidhi-pin-until')||0);if(Date.now()<blocked){failure('Please wait '+Math.ceil((blocked-Date.now())/1000)+' seconds before retrying.');return}
 const id=epoch;opening=true;const button=e.target.querySelector('button');button.disabled=true;failure('Opening your local ledger…');
 try{
  let secret,name;
  if(!meta){name=String(fd.get('name')||'').trim();if(!name)throw Error('Enter your name.');if(pin!==fd.get('confirm'))throw Error('The PINs do not match.');const salt=crypto.getRandomValues(new Uint8Array(16));secret=await derive(pin,salt);const verifier=await seal({check:'nidhi-local-pin-v1'},'pin-verifier',secret);
   const existing={};for(const n of ['ledger','generated-export'])existing[n]=await request(db.transaction('state').objectStore('state').get(n));
   const writes={};for(const [n,value]of Object.entries(existing))if(value!==undefined){if(value?.nidhiEncrypted)throw Error('An encrypted ledger exists. Do not replace its PIN setup.');writes[n]=await seal(await serialize(value),n,secret)}
   const fresh={version:1,salt:b64(salt),verifier,name:name[0].toLocaleUpperCase()+name.slice(1)};
   if(id!==epoch)throw Error('Screen changed during setup. Please retry.');
   await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');const r=store.get('pin-auth');r.onsuccess=()=>{if(r.result){tx.abort();return}for(const [n,v]of Object.entries(writes))store.put(v,n);store.put(fresh,'pin-auth')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(Error('PIN setup changed in another tab. Reload this page.'))});meta=fresh;
  }else{secret=await derive(pin,unb64(meta.salt));try{const v=await open(meta.verifier,'pin-verifier',secret);if(v.check!=='nidhi-local-pin-v1')throw Error()}catch{const count=Number(localStorage.getItem('nidhi-pin-fails')||0)+1;localStorage.setItem('nidhi-pin-fails',String(count));if(count>=5)localStorage.setItem('nidhi-pin-until',String(Date.now()+Math.min(600000,30000*Math.pow(2,count-5))));throw Error('Incorrect PIN. Please try again.')}}
  if(id!==epoch)throw Error('The app went into the background. Enter your PIN again.');key=secret;localStorage.removeItem('nidhi-pin-fails');localStorage.removeItem('nidhi-pin-until');const profile=JSON.parse(localStorage.getItem('nidhi-prefs')||'{}');profile.name=meta.name;profile.namePrompted=true;localStorage.setItem('nidhi-prefs',JSON.stringify(profile));
  await onUnlock(meta.name);assertSession(id);document.body.classList.remove('app-locked');document.querySelector('main').inert=false;document.querySelector('.sidebar').inert=false;document.querySelector('#auth-gate').hidden=true;document.querySelector('#auth-gate').replaceChildren();window.dispatchEvent(new Event('nidhi-unlock'));
 }catch(error){key=null;failure(error.message||'Unable to unlock. Your original data was retained.')}finally{opening=false;button.disabled=false}
}
export function lock(){epoch++;key=null;onLock?.();if(db)show()}
export async function startAuth(callbacks){onUnlock=callbacks.unlock;onLock=callbacks.lock;if(!crypto.subtle)throw Error('A secure HTTPS connection is required.');await database();meta=await request(db.transaction('state').objectStore('state').get('pin-auth'));show();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')lock()});window.addEventListener('pagehide',lock);let windowBlurTimer;
const cancelWindowBlur=()=>{clearTimeout(windowBlurTimer);windowBlurTimer=null};
window.addEventListener('blur',event=>{
 // Focus changes inside the app (including rerendered inputs) are not window exits.
 if(event.target!==window||!isUnlocked()||systemPrompt)return;
 cancelWindowBlur();
 windowBlurTimer=setTimeout(()=>{
  windowBlurTimer=null;
  if(isUnlocked()&&!systemPrompt&&!document.hasFocus())lock();
 },150);
});
window.addEventListener('focus',cancelWindowBlur);window.addEventListener('pageshow',()=>{if(!isUnlocked()&&db)show()})}

export async function updateProfileName(name){assertSession();const updated={...meta,name};await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(updated,'pin-auth');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});meta=updated}

// Browser permission/file dialogs do not count as leaving the visible app; hidden/pagehide still lock immediately.
export async function withSystemPrompt(action){systemPrompt++;try{return await action()}finally{systemPrompt--}}

export async function secureWriteMany(values){assertSession();const id=epoch,secret=key,writes={};for(const [name,value]of Object.entries(values))writes[name]=await seal(await serialize(value),name,secret);assertSession(id);await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite'),store=tx.objectStore('state');for(const [name,value]of Object.entries(writes))store.put(value,name);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Batch import was not committed'))});assertSession(id)}
