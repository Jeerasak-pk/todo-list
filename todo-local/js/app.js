'use strict';
const KEY='todo.v1', THEME='todo.theme';
const RP={none:'ไม่ซ้ำ',daily:'ทุกวัน',weekly:'ทุกสัปดาห์',monthly:'ทุกเดือน'};
const PN={1:'สำคัญสูง',2:'ปานกลาง',3:'ต่ำ'};
const CH=[['all','ทั้งหมด'],['today','วันนี้'],['pending','งานค้าง'],['soon','ใกล้ถึงกำหนด'],['overdue','เลยกำหนด'],['done','เสร็จแล้ว']];
let tasks=[], ui={f:'today',p:'',q:'',s:'due'}, editId=null;
const $=s=>document.querySelector(s);
const el=(t,a={},...c)=>{const e=document.createElement(t);for(const[k,v]of Object.entries(a)){if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(k==='checked'||k==='selected')e[k]=!!v;else if(v!==false&&v!=null)e.setAttribute(k,v)}e.append(...c);return e};
const pad=n=>String(n).padStart(2,'0');
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today=()=>ymd(new Date());
const parts=s=>s.split('-').map(Number);
const addDays=(s,n)=>{const[y,m,d]=parts(s);return ymd(new Date(y,m-1,d+n))};
const nowHM=()=>{const d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
function nextDue(s,r){const[y,m,d]=parts(s);if(r==='daily')return addDays(s,1);if(r==='weekly')return addDays(s,7);
  const n=new Date(y,m,d);return ymd(n.getDate()!==d?new Date(y,m+1,0):n)}
function toast(msg){const t=el('div',{},msg);$('#toast').append(t);setTimeout(()=>t.remove(),4500)}
function load(){let raw=null;try{raw=localStorage.getItem(KEY);const r=JSON.parse(raw||'[]');tasks=Array.isArray(r)?r:[]}
  catch{tasks=[];try{localStorage.setItem(KEY+'.corrupt',raw)}catch{}toast('อ่านข้อมูลไม่ได้ เก็บสำเนาไว้ที่ todo.v1.corrupt')}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(tasks))}catch{toast('⚠ บันทึกไม่ได้ (พื้นที่เต็มหรือเบราว์เซอร์บล็อก) กรุณาส่งออกไฟล์สำรอง')}}
const over=t=>!t.done&&t.due&&(t.due<today()||(t.due===today()&&t.time&&t.time<nowHM()));
const FL={all:()=>true,today:t=>t.due===today(),pending:t=>!t.done,done:t=>t.done,overdue:over,
  soon:t=>!t.done&&t.due&&t.due>=today()&&t.due<=addDays(today(),3)};
const key=t=>(t.due||'9999')+(t.time||'99:99');
const SO={due:(a,b)=>key(a).localeCompare(key(b)),pri:(a,b)=>a.priority-b.priority||SO.due(a,b),
  new:(a,b)=>b.created-a.created,title:(a,b)=>a.title.localeCompare(b.title,'th')};
function fmtDate(t){if(!t.due)return'ไม่มีกำหนด';const td=today();const[y,m,d]=parts(t.due);
  const s=t.due===td?'วันนี้':t.due===addDays(td,1)?'พรุ่งนี้':new Date(y,m-1,d).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'2-digit'});
  return t.time?s+' '+t.time:s}
function render(){
  const td=tasks.filter(t=>t.due===today()),dn=td.filter(t=>t.done).length;
  $('#ptext').textContent=td.length?`${dn} / ${td.length} งาน`:'วันนี้ยังไม่มีงานที่กำหนด';
  $('#pbar').value=td.length?Math.round(dn/td.length*100):0;
  $('#pstat').textContent=`ค้างทั้งหมด ${tasks.filter(t=>!t.done).length} · เลยกำหนด ${tasks.filter(over).length}`;
  $('#chips').replaceChildren(...CH.map(([k,l])=>el('button',{class:'chip','aria-pressed':String(ui.f===k),onclick:()=>{ui.f=k;render()}},`${l} (${tasks.filter(FL[k]).length})`)));
  const ps=[...new Set(tasks.map(t=>t.project).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'th'));
  if(ui.p&&!ps.includes(ui.p))ui.p='';
  $('#proj').replaceChildren(el('option',{value:''},'ทุกโปรเจกต์'),...ps.map(p=>el('option',{value:p,selected:p===ui.p},p)));
  $('#plist').replaceChildren(...ps.map(p=>el('option',{value:p})));
  const q=ui.q.trim().toLowerCase();
  const rows=tasks.filter(FL[ui.f]).filter(t=>!ui.p||t.project===ui.p)
    .filter(t=>!q||(t.title+' '+t.notes+' '+t.project).toLowerCase().includes(q)).sort(SO[ui.s]);
  $('#list').replaceChildren(...rows.map(row));$('#empty').hidden=rows.length>0;
}
function row(t){
  const meta=el('div',{class:'meta'},el('span',{class:'tag'+(over(t)?' late':'')},'📅 '+fmtDate(t)),el('span',{class:'tag'},PN[t.priority]));
  if(t.project)meta.append(el('span',{class:'tag'},'📁 '+t.project));
  if(t.repeat!=='none')meta.append(el('span',{class:'tag'},'🔁 '+RP[t.repeat]));
  const body=el('div',{},el('div',{class:'t'},t.title));
  if(t.notes)body.append(el('p',{class:'n'},t.notes));
  body.append(meta);
  return el('li',{class:`item p${t.priority}${t.done?' done':''}`},
    el('input',{type:'checkbox',checked:t.done,'aria-label':'เสร็จแล้ว: '+t.title,onchange:()=>toggle(t.id)}),body,
    el('div',{class:'ia'},el('button',{class:'btn','aria-label':'แก้ไข '+t.title,onclick:()=>openForm(t.id)},'✏️'),
      el('button',{class:'btn dn','aria-label':'ลบ '+t.title,onclick:()=>del(t.id)},'🗑')));
}
function toggle(id){const t=tasks.find(x=>x.id===id);t.done=!t.done;t.doneAt=t.done?Date.now():null;
  if(t.done&&t.repeat!=='none'&&t.due&&!t.spawned){t.spawned=true;
    tasks.push({...t,id:uid(),done:false,doneAt:null,due:nextDue(t.due,t.repeat),notified:false,spawned:false,created:Date.now()});toast('สร้างงานรอบถัดไปให้แล้ว');}
  save();render()}
function del(id){const t=tasks.find(x=>x.id===id);if(confirm(`ลบ "${t.title}" ?`)){tasks=tasks.filter(x=>x.id!==id);save();render()}}
function mk(o){return{id:uid(),title:'',notes:'',due:'',time:'',priority:2,project:'',repeat:'none',done:false,doneAt:null,created:Date.now(),notified:false,spawned:false,...o}}
$('#quick').addEventListener('submit',e=>{e.preventDefault();const v=$('#qt').value.trim();if(!v)return;tasks.push(mk({title:v}));$('#qt').value='';save();ui.f='all';render();$('#qt').focus()});
const dlg=$('#dlg'),form=$('#form');
function openForm(id){editId=id||null;const t=id?tasks.find(x=>x.id===id):mk({});form.reset();
  $('#dt').textContent=id?'แก้ไขงาน':'เพิ่มงาน';
  for(const k of['title','due','time','priority','repeat','project','notes'])form.elements[k].value=t[k];dlg.showModal();form.elements.title.focus()}
$('#addFull').onclick=()=>openForm();$('#cancel').onclick=()=>dlg.close();
form.addEventListener('submit',e=>{e.preventDefault();const f=Object.fromEntries(new FormData(form));
  const o={title:f.title.trim(),due:f.due,time:f.time,priority:+f.priority,repeat:f.repeat,project:f.project.trim(),notes:f.notes.trim()};
  if(!o.title)return;if((o.repeat!=='none'||o.time)&&!o.due)o.due=today();
  if(editId){const t=tasks.find(x=>x.id===editId);if(t.due!==o.due||t.time!==o.time)o.notified=false;Object.assign(t,o)}else tasks.push(mk(o));
  save();dlg.close();render()});
$('#q').oninput=e=>{ui.q=e.target.value;render()};$('#sort').onchange=e=>{ui.s=e.target.value;render()};$('#proj').onchange=e=>{ui.p=e.target.value;render()};
function setTheme(t){document.documentElement.dataset.theme=t;try{localStorage.setItem(THEME,t)}catch{}$('#theme').textContent=t==='dark'?'☀️':'🌙'}
$('#theme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
function notify(t){const m=`⏰ ${t.title} (${fmtDate(t)})`;toast(m);
  if('Notification' in window&&Notification.permission==='granted'){const fb=()=>{try{new Notification('งานของฉัน',{body:m})}catch{}};
    if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(r=>r.showNotification('งานของฉัน',{body:m})).catch(fb);else fb()}}
function check(){let ch=false;const now=Date.now();
  for(const t of tasks){if(t.done||t.notified||!t.due||!t.time)continue;const[y,m,d]=parts(t.due),[h,mi]=t.time.split(':').map(Number);
    const at=new Date(y,m-1,d,h,mi).getTime();if(at<=now){t.notified=true;ch=true;if(now-at<864e5)notify(t)}}
  if(ch){save();render()}}
$('#bell').onclick=async()=>{if(!('Notification' in window))return toast('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน จะแสดงในแอปแทน');
  const p=await Notification.requestPermission();toast(p==='granted'?'เปิดแจ้งเตือนแล้ว (ต้องเปิดแอป/แท็บค้างไว้)':'ไม่ได้อนุญาต จะแสดงข้อความในแอปแทน')};
$('#helpBtn').onclick=()=>$('#help').showModal();$('#hclose').onclick=()=>$('#help').close();
$('#exp').onclick=()=>{const b=new Blob([JSON.stringify({app:'todo-local',version:1,exportedAt:new Date().toISOString(),tasks},null,2)],{type:'application/json'});
  const a=el('a',{href:URL.createObjectURL(b),download:`todo-backup-${today()}.json`});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1e3);toast('ส่งออกแล้ว เก็บไฟล์ไว้ที่ปลอดภัย')};
$('#impBtn').onclick=()=>$('#imp').click();
const clean=x=>({id:String(x.id||uid()),title:String(x.title).slice(0,200),notes:String(x.notes||'').slice(0,2000),
  due:/^\d{4}-\d\d-\d\d$/.test(x.due)?x.due:'',time:/^\d\d:\d\d$/.test(x.time)?x.time:'',priority:[1,2,3].includes(+x.priority)?+x.priority:2,
  project:String(x.project||'').slice(0,50),repeat:Object.hasOwn(RP,x.repeat)?x.repeat:'none',done:!!x.done,doneAt:+x.doneAt||null,
  created:+x.created||Date.now(),notified:!!x.notified,spawned:!!x.spawned});
$('#imp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;
  try{const j=JSON.parse(await f.text());const a=Array.isArray(j)?j:j.tasks;
    if(!Array.isArray(a)||!a.every(x=>x&&typeof x.title==='string'))throw 0;
    if(!confirm(`นำเข้า ${a.length} งาน และ "แทนที่" ข้อมูลเดิม ${tasks.length} งานทั้งหมด\nต้องการดำเนินการต่อหรือไม่?`))return;
    try{localStorage.setItem(KEY+'.prev',JSON.stringify(tasks))}catch{}
    tasks=a.map(clean);save();render();toast('นำเข้าสำเร็จ')}
  catch{toast('ไฟล์ไม่ถูกต้อง ข้อมูลเดิมไม่ถูกเปลี่ยน')}};
const secure=location.protocol==='https:'||['localhost','127.0.0.1'].includes(location.hostname);
$('#envinfo').textContent=location.protocol==='file:'?'โหมดไฟล์ (file://): ใช้งานได้ แต่ติดตั้งเป็นแอปและออฟไลน์เต็มรูปแบบไม่ได้ แนะนำเปิดผ่าน serve.py (http://localhost:8080)'
  :secure?'โหมดปลอดภัย: ติดตั้งเป็นแอปและใช้ออฟไลน์ได้ (เมนูเบราว์เซอร์ → ติดตั้งแอป)':'ไม่ใช่ HTTPS/localhost: ฟีเจอร์ติดตั้งและออฟไลน์อาจใช้ไม่ได้';
if(location.protocol==='file:'){$('#envnote').hidden=false;$('#envnote').textContent='เปิดแบบ file:// — ข้อมูลจะแยกจาก localhost ดูรายละเอียดที่ปุ่ม ?'}
if(secure&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
addEventListener('storage',e=>{if(e.key===KEY){load();render()}});
load();setTheme(document.documentElement.dataset.theme||'light');render();check();setInterval(check,15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
