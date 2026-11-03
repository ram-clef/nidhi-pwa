import {isUnlocked,secureRead,secureWrite,secureDelete,withSystemPrompt} from './auth.js';
import {key,monthOf} from './ledger.js';
const defaults={enabled:false,frequency:'daily',time:'20:00',weekday:0,monthday:1,summaries:false,morning:'08:00',evening:'22:00',system:false};
let prefs={...defaults,...JSON.parse(localStorage.getItem('nidhi-reminders')||'{}')};
let inbox=[],seen=JSON.parse(localStorage.getItem('nidhi-reminder-seen')||'{}');
let getState,toast,renderApp,ticking=false;
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:0,maximumFractionDigits:2}).format((n||0)/100);
const dayId=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const start=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();
const total=rows=>rows.reduce((n,t)=>n+t.amount,0);
function save(){localStorage.setItem('nidhi-reminders',JSON.stringify(prefs))}
function permission(){return 'Notification'in window?Notification.permission:'unsupported'}
function timeField(name,label,value){return `<label class="reminder-field">${label}<input type="time" data-reminder="${name}" value="${esc(value)}" required></label>`}
export function reminderSettings(){return `<section class="card"><div class="card-head"><h2>Transaction reminder</h2><label class="app-switch"><input type="checkbox" data-reminder="enabled" ${prefs.enabled?'checked':''} aria-label="Enable transaction reminders"><span></span></label></div><p class="hint">A gentle nudge to enter any missing income or expenses.</p>${prefs.enabled?`<div class="reminder-fields"><label class="reminder-field">Repeat<select data-reminder="frequency">${['daily','weekly','monthly'].map(v=>`<option value="${v}" ${prefs.frequency===v?'selected':''}>${v[0].toUpperCase()+v.slice(1)}</option>`).join('')}</select></label>${timeField('time','Time',prefs.time)}${prefs.frequency==='weekly'?`<label class="reminder-field">Day<select data-reminder="weekday">${['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map((d,i)=>`<option value="${i}" ${Number(prefs.weekday)===i?'selected':''}>${d}</option>`).join('')}</select></label>`:''}${prefs.frequency==='monthly'?`<label class="reminder-field">Day of month<select data-reminder="monthday">${Array.from({length:31},(_,i)=>`<option value="${i+1}" ${Number(prefs.monthday)===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label><p class="hint full">For shorter months, the last day of the month is used.</p>`:''}</div>`:''}</section><section class="card"><div class="card-head"><h2>Daily spending summaries</h2><label class="app-switch"><input type="checkbox" data-reminder="summaries" ${prefs.summaries?'checked':''} aria-label="Enable daily spending summaries"><span></span></label></div><p class="hint">Morning: yesterday’s expenses and today’s allowance.<br>End of day: today’s income, expenses, net balance and next-day allowance.</p>${prefs.summaries?`<div class="reminder-fields">${timeField('morning','Morning summary',prefs.morning)}${timeField('evening','End-of-day summary',prefs.evening)}</div>`:''}</section><section class="card"><h2>Notification delivery</h2><p class="hint">This local-only app checks reminders while unlocked and open and catches up for today after unlocking. Exact-time notifications while the app is closed are not supported by this GitHub Pages package.</p><div class="settings-row"><div><b>Device notifications</b><small>${prefs.system&&permission()==='granted'?'Enabled — due messages can appear outside the app.':'Optional — reminders still appear inside Nidhi.'}</small></div><button class="secondary" id="reminder-permission">${prefs.system?'Turn off':'Enable'}</button></div><p class="hint">${permission()==='denied'?'Notifications are blocked. Change this site’s notification permission in your browser settings.':permission()==='unsupported'?'This browser does not support device notifications. Use the in-app reminder cards.':'Financial amounts may be visible on your notification or lock screen. Delivery also depends on browser and device settings.'}</p><div class="detail-actions"><button class="text-btn" id="preview-morning">Preview morning</button><button class="text-btn" id="preview-evening">Preview end of day</button></div><p class="hint">Previews use the latest records on this browser. No data is sent to a notification server.</p></section>`}
// Day-local boundaries avoid DST and month-length arithmetic errors.
export function daySnapshot(state,when=new Date()){
 const month=monthOf(when.getTime()),begin=start(when),asOf=when.getTime();
 const tx=state.transactions.filter(t=>monthOf(t.dateTime)===month&&t.dateTime<=asOf);
 const income=total(tx.filter(t=>t.type==='INCOME')),expenses=tx.filter(t=>t.type==='EXPENSE');
 const commitments=state.budget.commitments.filter(c=>c.month===month&&c.enabled),reserved=commitments.reduce((n,c)=>n+c.amount,0);
 const paidKeys=new Set(commitments.map(c=>c.paymentKey).filter(Boolean));
 const discretionary=expenses.filter(t=>!paidKeys.has(key(t)));
 const plan=state.budget.plans.find(p=>p.month===month),regular=(state.budget.incomeSources||[]).filter(x=>x.month===month&&x.enabled),base=Number.isSafeInteger(plan?.income)?plan.income:regular.length?regular.reduce((n,x)=>n+x.amount,0):income;
 const before=total(discretionary.filter(t=>t.dateTime<begin)),todayDiscretionary=total(discretionary.filter(t=>t.dateTime>=begin));
 const days=new Date(when.getFullYear(),when.getMonth()+1,0).getDate(),left=days-when.getDate()+1;
 const allowance=Math.max(0,Math.floor((base-reserved-before)/left));
 const todayIncome=total(tx.filter(t=>t.type==='INCOME'&&t.dateTime>=begin)),todayExpense=total(expenses.filter(t=>t.dateTime>=begin));
 const monthSpendable=base-reserved-before-todayDiscretionary;
 return {todayIncome,todayExpense,net:todayIncome-todayExpense,allowance,unspent:allowance-todayDiscretionary,monthSpendable,tomorrowAllowance:left>1?Math.max(0,Math.floor(monthSpendable/(left-1))):null,recordedBalance:income-total(expenses),base};
}
function summary(kind,now=new Date()){
 const state=getState(),s=daySnapshot(state,now);
 if(kind==='morning'){
  const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1),a=start(yesterday),b=start(now);
  const spent=total(state.transactions.filter(t=>t.type==='EXPENSE'&&t.dateTime>=a&&t.dateTime<b));
  return {title:'Good morning · Nidhi',body:`Yesterday you spent ${money(spent)}. Today’s spending allowance is ${money(s.allowance)}.${!s.base?' Add income or configure your monthly budget to calculate an allowance.':''}`,page:'notifications'};
 }
 const carry=s.unspent>=0?`${money(s.unspent)} of today’s allowance remains.`:`${money(-s.unspent)} over today’s allowance.`;
 const next=s.tomorrowAllowance===null?'Month ends today; your next month uses its own plan.':`Tomorrow’s recalculated allowance: ${money(s.tomorrowAllowance)}.`;
 return {title:'Your day, in numbers · Nidhi',body:`Today’s income: ${money(s.todayIncome)}. Expenses: ${money(s.todayExpense)}. Net today: ${money(s.net)}. Recorded balance: ${money(s.recordedBalance)}. ${carry} ${next}`,page:'notifications'};
}
async function systemNotification(entry){
 if(!isUnlocked()||!prefs.system||permission()!=='granted'||!('serviceWorker'in navigator))return;
 const reg=await navigator.serviceWorker.getRegistration(new URL('./',location.href).href);
 if(!reg?.active) return;
 await reg.showNotification(entry.title,{body:entry.body,icon:new URL('./icon-192.png',location.href).href,badge:new URL('./icon-192.png',location.href).href,tag:'nidhi-'+entry.id,data:{url:new URL('./#notifications',location.href).href}});
}
function paintInbox(){
 $('#reminder-inbox')?.remove();if(!inbox.length)return;
 const section=document.createElement('section');section.id='reminder-inbox';section.className='reminder-inbox';
 section.innerHTML=`<div class="card-head"><h2>For you</h2><button class="text-btn" id="dismiss-reminders">Dismiss all</button></div>${inbox.slice(0,3).map(e=>`<article class="reminder-message"><div class="notification-heading"><img src="./icon-192.png" alt="Nidhi"><b>${esc(e.title)}</b><small>${esc(new Date(e.created).toLocaleString())}${e.preview?' · Preview':''}</small></div><p>${esc(e.body)}</p><button class="text-btn" data-page="notifications">View summary ↗</button></article>`).join('')}`;
 $('#content').before(section);$('#dismiss-reminders').onclick=()=>{inbox=[];secureWrite('reminder-inbox',[]).catch(()=>{});section.remove()};
}
function add(entry){inbox=[entry,...inbox.filter(e=>e.id!==entry.id)].slice(0,12);secureWrite('reminder-inbox',inbox).catch(()=>{});paintInbox()}
function due(time,now){if(!/^\d{2}:\d{2}$/.test(time))return false;const [h,m]=time.split(':').map(Number);return now.getHours()*60+now.getMinutes()>=h*60+m}
async function check(){
 if(!isUnlocked()||!getState||!getState()||document.visibilityState!=='visible'||ticking)return;ticking=true;
 try{
  seen={...seen,...JSON.parse(localStorage.getItem('nidhi-reminder-seen')||'{}')};const now=new Date(),id=dayId(now),events=[];
  if(prefs.enabled&&due(prefs.time,now)){
   const weekday=(now.getDay()+6)%7,last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
   const matches=prefs.frequency==='daily'||prefs.frequency==='weekly'&&weekday===Number(prefs.weekday)||prefs.frequency==='monthly'&&now.getDate()===Math.min(Number(prefs.monthday),last);
   if(matches)events.push({id:'reminder:'+prefs.frequency+':'+id,title:'A moment for your money · Nidhi',body:'Record any missing income or expenses to keep your daily allowance up to date.',page:'history'});
  }
  if(prefs.summaries&&due(prefs.morning,now))events.push({id:'morning:'+id,...summary('morning',now)});
  if(prefs.summaries&&due(prefs.evening,now))events.push({id:'evening:'+id,...summary('evening',now)});
  const pending=events.filter(e=>!seen[e.id]);
  for(const e of pending){e.created=Date.now();seen[e.id]=e.created;add(e)}
  const cutoff=Date.now()-45*86400000;seen=Object.fromEntries(Object.entries(seen).filter(([,t])=>t>=cutoff));localStorage.setItem('nidhi-reminder-seen',JSON.stringify(seen));
  // Catch-up does not flood the notification tray: show the latest due message only.
  if(pending.length)try{await systemNotification(pending.at(-1))}catch{toast('Your reminder is ready inside Nidhi. Device notification delivery was unavailable.')}
 }finally{ticking=false}
}
export function bindReminders(){
 document.querySelectorAll('[data-reminder]').forEach(el=>el.onchange=()=>{
  const name=el.dataset.reminder,value=el.type==='checkbox'?el.checked:el.value;
  if(el.type==='time'&&!/^\d{2}:\d{2}$/.test(value))return;
  const next={...prefs,[name]:value};
  if(next.morning>=next.evening){el.value=prefs[name];toast('Choose an end-of-day time later than the morning summary.');return}
  prefs=next;save();renderApp();check();
 });
 const button=$('#reminder-permission');if(button)button.onclick=async()=>{
  if(prefs.system){prefs.system=false;save();renderApp();return}
  if(!('Notification'in window)){toast('Use the in-app reminders; device notifications are unsupported here.');return}
  try{const result=await withSystemPrompt(()=>Notification.requestPermission());prefs.system=result==='granted';save();renderApp();toast(prefs.system?'Device notifications enabled for due reminders while the app runs.':'In-app reminders remain available.')}catch{toast('Notification permission could not be requested. Try the installed app or browser site settings.')}
 };
 for(const kind of ['morning','evening']){const b=$('#preview-'+kind);if(b)b.onclick=async()=>{const entry={id:'preview:'+kind,...summary(kind),created:Date.now(),preview:true};add(entry);try{await systemNotification(entry)}catch{}document.querySelector('#reminder-inbox')?.scrollIntoView({block:'start',behavior:'smooth'})}}
}
let initialized=false;
export async function resumeReminders(){
 if(!isUnlocked())return;
 const legacy=JSON.parse(localStorage.getItem('nidhi-reminder-inbox')||'[]');
 inbox=await secureRead('reminder-inbox')||legacy;
 if(legacy.length){await secureWrite('reminder-inbox',inbox);localStorage.removeItem('nidhi-reminder-inbox')}
 if(!isUnlocked())return;paintInbox();check();
}
export async function initReminders(context){getState=context.getState;toast=context.toast;renderApp=context.render;await resumeReminders();if(!initialized){initialized=true;setInterval(check,30000);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()})}}
export function pauseReminderMessages(){inbox=[];$('#reminder-inbox')?.remove()}
export function clearReminderMessages(){inbox=[];seen={};localStorage.removeItem('nidhi-reminder-inbox');localStorage.removeItem('nidhi-reminder-seen');if(isUnlocked())secureDelete('reminder-inbox').catch(()=>{});paintInbox()}

export function notificationPage(){return `<section class="card"><h2>Notifications</h2>${inbox.length?inbox.map(e=>`<article class="reminder-message"><div class="notification-heading"><img src="./icon-192.png" alt="Nidhi"><b>${esc(e.title)}</b></div><small>${esc(new Date(e.created).toLocaleString())}</small><p>${esc(e.body)}</p></article>`).join(''):'<p class="hint">No saved reminders yet. Try a preview in Settings.</p>'}<button class="primary" data-page="home">Back to Home</button></section>`}
