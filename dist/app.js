import { supabase, SUPABASE_URL } from './supabase-config.js';

const STEP = 15;
const GROUP_HEIGHT = 34;
const ROW_HEIGHT = 58;
const EVENT_HEIGHT = 40;
const LANE_GAP = 6;
const ROW_PADDING = 8;
const STORAGE_KEY = 'volunteer-roster-system-static-v1';
const COLORS = ['#2f80ed','#32a875','#f59e42','#8a63d2','#e05263','#23a7b5'];

const seed = {
  volunteers: [
    {id:'v1',name:'陳小明',center:'東華三院',group:'青年組',phone:'9123 4567'},
    {id:'v2',name:'張家豪',center:'聖公會聖匠堂長者地區中心',group:'關懷組',phone:'9345 8821'},
    {id:'v3',name:'李美玲',center:'善導會龍澄坊',group:'活動組',phone:'9663 1128'},
    {id:'v4',name:'黃詠思',center:'香港聖公會樂民郭鳳軒綜合服務中心',group:'青年組',phone:'9882 3321'},
    {id:'v5',name:'林啟明',center:'東華三院',group:'物資組',phone:'9200 8452'},
    {id:'v6',name:'梁麗欣',center:'聖公會聖匠堂長者地區中心',group:'關懷組',phone:'6011 2200'},
    {id:'v7',name:'許文彬',center:'善導會龍澄坊',group:'活動組',phone:'6112 3300'},
    {id:'v8',name:'鄭志強',center:'香港聖公會樂民郭鳳軒綜合服務中心',group:'物資組',phone:'6223 4400'}
  ],
  events: [
    {
      id:'e1',name:'接得住的社區－義工服務日',date:'2026-09-12',start:480,end:1080,
      groups:[
        {id:'g1',name:'A組－接待及登記組',color:'#32a875'},
        {id:'g2',name:'B組－活動及場地組',color:'#2f80ed'},
        {id:'g3',name:'C組－物資及支援組',color:'#f59e42'},
        {id:'g4',name:'D組－清潔組',color:'#8a63d2'}
      ],
      positions:[
        {id:'p1',name:'接待處',required:4,groupId:'g1',color:'#32a875'},
        {id:'p2',name:'登記處',required:3,groupId:'g1',color:'#55b982'},
        {id:'p3',name:'活動組',required:6,groupId:'g2',color:'#2f80ed'},
        {id:'p4',name:'場地組',required:4,groupId:'g2',color:'#4d92ea'},
        {id:'p5',name:'物資組',required:3,groupId:'g3',color:'#f59e42'},
        {id:'p6',name:'支援組',required:2,groupId:'g3',color:'#f2a654'},
        {id:'p7',name:'清潔組',required:4,groupId:'g4',color:'#8a63d2'}
      ],
      shifts:[
        {id:'s1',volunteerId:'v1',positionId:'p1',groupId:'g1',start:480,end:720},
        {id:'s2',volunteerId:'v3',positionId:'p1',groupId:'g1',start:840,end:1080},
        {id:'s3',volunteerId:'v2',positionId:'p2',groupId:'g1',start:540,end:690},
        {id:'s4',volunteerId:'v4',positionId:'p2',groupId:'g1',start:840,end:1050},
        {id:'s5',volunteerId:'v5',positionId:'p3',groupId:'g2',start:480,end:720},
        {id:'s6',volunteerId:'v6',positionId:'p4',groupId:'g2',start:585,end:705},
        {id:'s7',volunteerId:'v8',positionId:'p3',groupId:'g2',start:840,end:1050},
        {id:'s8',volunteerId:'v5',positionId:'p5',groupId:'g3',start:495,end:720},
        {id:'s9',volunteerId:'v7',positionId:'p6',groupId:'g3',start:600,end:720},
        {id:'s10',volunteerId:'v8',positionId:'p5',groupId:'g3',start:840,end:1080},
        {id:'s11',volunteerId:'v6',positionId:'p7',groupId:'g4',start:480,end:720},
        {id:'s12',volunteerId:'v7',positionId:'p7',groupId:'g4',start:840,end:1050}
      ],
      lunch:{enabled:true,mode:'uniform',start:750,end:810,individual:{}}
    }
  ],
  activeEventId:'e1'
};

let state = normalizeState(loadState());
let view = 'events';
let selectedShiftId = currentEvent()?.shifts?.[0]?.id || '';
let volunteerSearch = '';
let volunteerCenterFilter = 'all';
let volunteerGroupFilter = 'all';
let volunteerDisplayMode = 'list';
let selectedVolunteerIds = new Set();
let statsMode = 'volunteer';
let statsSelection = '';
let statsSortKeys = ['date','memberGroup','center','start'];
let chartRosterScope = 'all';
let activeGroupFilter = 'all';
let unassignedSearch = '';
let mobileNavCollapsed=false,mobileGroupFilter='all',mobileScheduleFilter='all',mobileFiltersOpen=false;
const app = document.getElementById('app');
const WORKSPACE_ID = 'main';
let authSession = null;
let currentAdmin = null;
let cloudReady = false;
let cloudRevision = 0;
let cloudSaveTimer = null;
let cloudSaving = false;
let cloudSavePending = false;
let cloudStatus = 'connecting';
let cloudStatusText = '連接雲端中';

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function clamp(n,min,max){ return Math.min(Math.max(n,min),max); }
function snap(n){ return Math.round(n/STEP)*STEP; }
function formatTime(min){ const h=Math.floor(min/60),m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function inputTime(v){ const [h,m]=String(v||'00:00').split(':').map(Number); return h*60+m; }
function parseTime(v,fallback){
  if(typeof v==='number'&&Number.isFinite(v)){if(v>0&&v<1)return Math.round(v*24*60);if(v>=0&&v<=24)return Math.round(v*60);return Math.round(v);}
  const s=String(v??'').trim();if(!s)return fallback;const m=s.match(/^(\d{1,2})[:：](\d{1,2})$/);if(m)return Number(m[1])*60+Number(m[2]);const n=Number(s);return Number.isNaN(n)?fallback:(n<=24?n*60:n);
}
function hours(s,e){ return Math.max(0,e-s)/60; }
function esc(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function xmlEsc(v){ return String(v??'').replace(/[<>&'\"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c])); }
function csvCell(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function downloadBlob(blob,filename){ const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1200); }
function toast(message){ document.querySelector('.toast')?.remove();const el=document.createElement('div');el.className='toast';el.innerHTML=`<span>✓</span>${esc(message)}`;document.body.appendChild(el);setTimeout(()=>el.remove(),2200); }
function dateLabel(date){ try{return new Intl.DateTimeFormat('zh-HK',{year:'numeric',month:'long',day:'numeric',weekday:'short'}).format(new Date(`${date}T00:00:00`));}catch{return date;} }
function safeFileName(v){ return String(v||'更表').replace(/[\\/:*?"<>|]/g,'_').slice(0,80); }

function loadState(){
  try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):clone(seed);}catch{return clone(seed);}
}
function normalizeScheduleConfig(config,start,end,fallbackMode='flexible',fallbackTemplates=[]){
  const mode=['fixed','flexible','mixed'].includes(config?.scheduleMode)?config.scheduleMode:fallbackMode;
  const source=Array.isArray(config?.shiftTemplates)?config.shiftTemplates:fallbackTemplates;
  const shiftTemplates=source.map((t,i)=>({id:t.id||id(`period${i}`),name:String(t.name||`更期 ${i+1}`),start:clamp(Number(t.start??start),start,end-15),end:clamp(Number(t.end??Math.min(start+240,end)),start+15,end)})).filter(t=>t.end>t.start);
  return {scheduleMode:mode,shiftTemplates};
}
function normalizeEvent(evt,index=0){
  const start=Number(evt?.start??480),end=Number(evt?.end??1080),legacyDate=evt?.date||'2026-09-12';
  const dates=[...new Set((Array.isArray(evt?.dates)&&evt.dates.length?evt.dates:[legacyDate]).filter(Boolean))].sort();
  const activeDate=dates.includes(evt?.activeDate)?evt.activeDate:dates[0];
  const baseLunch={enabled:true,mode:'uniform',start:750,end:810,individual:{},...(evt?.lunch||{})};
  const lunchByDate={};
  for(const d of dates)lunchByDate[d]={...clone(baseLunch),...(evt?.lunchByDate?.[d]||{}),individual:{...(baseLunch.individual||{}),...(evt?.lunchByDate?.[d]?.individual||{})}};
  const shifts=(Array.isArray(evt?.shifts)?evt.shifts:[]).map(s=>({...s,date:dates.includes(s.date)?s.date:(dates.includes(legacyDate)?legacyDate:dates[0])}));
  const legacyMode=['fixed','flexible','mixed'].includes(evt?.scheduleMode)?evt.scheduleMode:'flexible';
  const legacyTemplates=Array.isArray(evt?.shiftTemplates)?evt.shiftTemplates:[];
  const scheduleConfigByDate={};
  for(const d of dates){
    const raw=evt?.scheduleConfigByDate?.[d]||{scheduleMode:legacyMode,shiftTemplates:clone(legacyTemplates)};
    scheduleConfigByDate[d]=normalizeScheduleConfig(raw,start,end,legacyMode,legacyTemplates);
  }
  const activeConfig=scheduleConfigByDate[activeDate]||normalizeScheduleConfig({},start,end);
  const normalized={
    id:evt?.id||id(`event${index}`),name:evt?.name||`活動 ${index+1}`,date:dates[0],dates,activeDate,
    start:clamp(start,0,1430),end:Math.max(clamp(end,15,1440),clamp(start,0,1430)+15),scheduleConfigByDate,
    scheduleMode:activeConfig.scheduleMode,shiftTemplates:activeConfig.shiftTemplates,
    groups:Array.isArray(evt?.groups)?evt.groups:[],positions:Array.isArray(evt?.positions)?evt.positions:[],shifts,lunchByDate
  };
  normalized.lunch=normalized.lunchByDate[normalized.activeDate];
  return normalized;
}
function normalizeVolunteer(v,index=0){
  return {
    id:v?.id||id(`vol${index}`),name:String(v?.name||'').trim(),center:String(v?.center||'').trim(),group:String(v?.group||'').trim(),phone:String(v?.phone||'').trim(),
    emergencyContact:String(v?.emergencyContact||'').trim(),emergencyRelation:String(v?.emergencyRelation||'').trim(),emergencyPhone:String(v?.emergencyPhone||'').trim()
  };
}
function getDayScheduleConfig(evt=currentEvent(),date=currentEventDate(evt)){
  if(!evt)return {scheduleMode:'flexible',shiftTemplates:[]};
  evt.scheduleConfigByDate=evt.scheduleConfigByDate||{};
  if(!evt.scheduleConfigByDate[date]){
    const fallback=normalizeScheduleConfig({scheduleMode:evt.scheduleMode,shiftTemplates:evt.shiftTemplates},evt.start,evt.end);
    evt.scheduleConfigByDate[date]=fallback;
  }
  return evt.scheduleConfigByDate[date];
}
function dayScheduleSummary(evt){
  const dates=evt?.dates||[];if(!dates.length)return '浮動時段';
  const configs=dates.map(d=>getDayScheduleConfig(evt,d));
  const modes=[...new Set(configs.map(c=>c.scheduleMode))];
  if(modes.length===1){const total=configs.reduce((n,c)=>n+(c.shiftTemplates?.length||0),0);return `${scheduleModeLabel(modes[0])}${modes[0]!=='flexible'?` · ${total} 個每日更期設定`:''}`;}
  return '每日獨立編更模式';
}
function normalizeState(data){
  const next=data&&typeof data==='object'?clone(data):clone(seed);
  next.volunteers=(Array.isArray(next.volunteers)?next.volunteers:clone(seed.volunteers)).map(normalizeVolunteer).filter(v=>v.name);
  if(!Array.isArray(next.events)){
    const migrated={id:'event-migrated',name:'原有活動更表',date:next.eventDate||'2026-09-12',start:480,end:1080,groups:next.groups||[],positions:next.positions||[],shifts:next.shifts||[],lunch:next.lunch||{enabled:true,mode:'uniform',start:750,end:810,individual:{}}};
    next.events=[normalizeEvent(migrated)];
  }else next.events=next.events.map(normalizeEvent);
  if(!next.events.length)next.events=clone(seed.events);
  if(!next.activeEventId||!next.events.some(e=>e.id===next.activeEventId))next.activeEventId=next.events[0].id;
  return {volunteers:next.volunteers,events:next.events,activeEventId:next.activeEventId};
}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  if(cloudReady&&currentAdmin)scheduleCloudSave();
}
function cloudStatusLabel(){
  if(cloudStatus==='synced')return '● 雲端已同步';
  if(cloudStatus==='syncing')return '● 同步中';
  if(cloudStatus==='error')return '● 同步失敗';
  return '● 連接中';
}
function setCloudStatus(status,text=''){
  cloudStatus=status;cloudStatusText=text||cloudStatusLabel().replace(/^●\s*/,'');
  const el=document.getElementById('cloudStatus');
  if(el){el.className=`cloud-status ${status}`;el.textContent=cloudStatusLabel();el.title=cloudStatusText;}
}
function scheduleCloudSave(delay=450){
  clearTimeout(cloudSaveTimer);setCloudStatus('syncing','正在將最新資料儲存至 Supabase');
  cloudSaveTimer=setTimeout(()=>flushCloudSave(),delay);
}
async function flushCloudSave(showToast=false){
  clearTimeout(cloudSaveTimer);cloudSaveTimer=null;
  if(!cloudReady||!currentAdmin||!authSession)return false;
  if(cloudSaving){cloudSavePending=true;return false;}
  cloudSaving=true;setCloudStatus('syncing','正在同步雲端資料');
  const snapshot=clone(state),nextRevision=Math.max(1,cloudRevision+1);
  try{
    const {data,error}=await supabase.from('volunteer_roster_state').upsert({workspace_id:WORKSPACE_ID,data:snapshot,revision:nextRevision,updated_at:new Date().toISOString(),updated_by:authSession.user.id},{onConflict:'workspace_id'}).select('revision,updated_at').single();
    if(error)throw error;
    cloudRevision=Number(data?.revision||nextRevision);localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));setCloudStatus('synced',`已同步至 Supabase｜版本 ${cloudRevision}`);
    if(showToast)toast('已同步到雲端');
    return true;
  }catch(err){console.error('Cloud save failed',err);setCloudStatus('error',err?.message||'雲端同步失敗，已保留本機備份');if(showToast)alert(`雲端儲存失敗：${err?.message||'未知錯誤'}
本機備份仍然保留。`);return false;}
  finally{cloudSaving=false;if(cloudSavePending){cloudSavePending=false;scheduleCloudSave(80);}}
}
async function recordAudit(action,entityType='',entityId='',details={}){
  if(!authSession||!currentAdmin)return;
  try{await supabase.from('volunteer_roster_audit_logs').insert({user_id:authSession.user.id,action,entity_type:entityType||null,entity_id:entityId||null,details});}catch(err){console.warn('Audit log failed',err);}
}
function renderAuthLoading(){
  app.innerHTML=`<div class="auth-shell"><div class="auth-card auth-loading"><div class="auth-brand-mark">♥</div><h1>義工編更系統</h1><p>正在連接 Supabase 雲端資料…</p><div class="auth-spinner"></div></div></div>`;
}
function renderLogin(message=''){
  currentAdmin=null;cloudReady=false;setCloudStatus('connecting','尚未登入');
  app.innerHTML=`<div class="auth-shell"><div class="auth-card"><div class="auth-brand"><div class="auth-brand-mark">♥</div><div><h1>義工編更系統</h1><p>Supabase 雲端管理員模式</p></div></div>${message?`<div class="auth-message">${esc(message)}</div>`:''}<form id="adminLoginForm" class="auth-form"><label>管理員電郵<input id="adminEmail" type="email" autocomplete="username" required placeholder="name@example.com"></label><label>密碼<input id="adminPassword" type="password" autocomplete="current-password" required placeholder="輸入 Supabase 帳戶密碼"></label><button class="primary-button auth-submit" type="submit">登入管理員模式</button><p class="auth-help">只有已獲授權的管理員帳戶可以存取義工、緊急聯絡資料及更表。登入後所有修改會自動同步至 Supabase。</p><div id="authError"></div></form></div></div>`;
  document.getElementById('adminLoginForm')?.addEventListener('submit',handleAdminLogin);
}
async function handleAdminLogin(e){
  e.preventDefault();const button=e.currentTarget.querySelector('button'),errorEl=document.getElementById('authError');button.disabled=true;button.textContent='登入中…';errorEl.textContent='';
  const email=document.getElementById('adminEmail').value.trim(),password=document.getElementById('adminPassword').value;
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error||!data.session){errorEl.innerHTML=`<div class="auth-error">電郵或密碼不正確，請再試一次。</div>`;button.disabled=false;button.textContent='登入管理員模式';return;}
  await activateAdminSession(data.session);
}
async function activateAdminSession(session){
  authSession=session;renderAuthLoading();
  const {data:admin,error}=await supabase.from('volunteer_roster_admins').select('user_id,display_name,is_active').eq('user_id',session.user.id).maybeSingle();
  if(error||!admin?.is_active){await supabase.auth.signOut();authSession=null;renderLogin('此帳戶未獲義工編更系統管理員權限。');return;}
  currentAdmin=admin;await loadCloudWorkspace();
}
async function loadCloudWorkspace(){
  setCloudStatus('connecting','正在讀取 Supabase 資料');
  const {data,error}=await supabase.from('volunteer_roster_state').select('data,revision,updated_at').eq('workspace_id',WORKSPACE_ID).maybeSingle();
  const queryError=error;
  if(queryError){console.error(queryError);renderLogin(`無法讀取雲端資料：${queryError.message||'連線失敗'}`);return;}
  if(data?.data&&typeof data.data==='object'&&(Array.isArray(data.data.events)||Array.isArray(data.data.volunteers))){
    state=normalizeState(data.data);cloudRevision=Number(data.revision||0);cloudReady=true;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setCloudStatus('synced',`雲端資料已載入｜版本 ${cloudRevision}`);view='events';render();return;
  }
  state=normalizeState(loadState());cloudRevision=0;cloudReady=true;await flushCloudSave(false);await recordAudit('bootstrap','workspace',WORKSPACE_ID,{source:localStorage.getItem(STORAGE_KEY)?'local_backup':'seed'});view='events';render();toast('已將原有資料建立為 Supabase 雲端資料');
}
async function reloadCloudWorkspace(){
  if(!currentAdmin)return;setCloudStatus('connecting','正在重新載入雲端資料');
  const {data,error}=await supabase.from('volunteer_roster_state').select('data,revision').eq('workspace_id',WORKSPACE_ID).single();
  if(error)return alert(`重新載入失敗：${error.message}`);
  state=normalizeState(data.data);cloudRevision=Number(data.revision||0);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));setCloudStatus('synced',`已重新載入｜版本 ${cloudRevision}`);view='events';render();toast('已重新載入雲端資料');
}
async function logoutAdmin(){
  if(cloudReady)await flushCloudSave(false);await supabase.auth.signOut();authSession=null;currentAdmin=null;cloudReady=false;renderLogin('已安全登出管理員模式。');
}
async function bootstrapApp(){
  renderAuthLoading();
  try{const {data,error}=await supabase.auth.getSession();if(error)throw error;if(data.session)await activateAdminSession(data.session);else renderLogin();}catch(err){console.error(err);renderLogin('無法連接 Supabase，請檢查網絡後重新整理。');}
}
function currentEvent(){ return state.events.find(e=>e.id===state.activeEventId)||state.events[0]||null; }
function currentEventDate(evt=currentEvent()){ return evt?.activeDate||evt?.dates?.[0]||evt?.date||''; }
function syncEventDayState(evt=currentEvent()){
  if(!evt)return;
  if(!Array.isArray(evt.dates)||!evt.dates.length)evt.dates=[evt.date||'2026-09-12'];
  if(!evt.dates.includes(evt.activeDate))evt.activeDate=evt.dates[0];
  evt.date=evt.dates[0];evt.lunchByDate=evt.lunchByDate||{};
  if(!evt.lunchByDate[evt.activeDate])evt.lunchByDate[evt.activeDate]={enabled:true,mode:'uniform',start:clamp(720,evt.start,evt.end-15),end:clamp(780,evt.start+15,evt.end),individual:{}};
  evt.lunch=evt.lunchByDate[evt.activeDate];
  const cfg=getDayScheduleConfig(evt,evt.activeDate);evt.scheduleMode=cfg.scheduleMode;evt.shiftTemplates=cfg.shiftTemplates;
}
function currentDayShifts(evt=currentEvent()){ const d=currentEventDate(evt);return (evt?.shifts||[]).filter(s=>(s.date||evt?.dates?.[0]||evt?.date)===d); }
function dayStart(){ return currentEvent()?.start??480; }
function dayEnd(){ return currentEvent()?.end??1080; }
function dayDuration(){ return Math.max(15,dayEnd()-dayStart()); }
function selectEvent(eventId,targetView='schedule'){
  if(!state.events.some(e=>e.id===eventId))return;
  state.activeEventId=eventId;syncEventDayState();activeGroupFilter='all';statsSelection='';selectedShiftId=currentDayShifts()[0]?.id||'';saveState();view=targetView;render();
}
function selectEventDate(date){ const evt=currentEvent();if(!evt?.dates?.includes(date))return;evt.activeDate=date;syncEventDayState(evt);activeGroupFilter='all';selectedShiftId=currentDayShifts(evt)[0]?.id||'';saveState();render(); }
function eventUsage(evt){ const shifts=evt?.shifts||[];return {volunteers:new Set(shifts.map(s=>s.volunteerId)).size,hours:shifts.reduce((n,s)=>n+hours(s.start,s.end),0)}; }
function groupUsage(groupId){ const shifts=currentDayShifts().filter(s=>s.groupId===groupId);return {volunteers:new Set(shifts.map(s=>s.volunteerId)).size,hours:shifts.reduce((n,s)=>n+hours(s.start,s.end),0)}; }
function scheduleModeLabel(mode){ return mode==='fixed'?'固定時段':mode==='mixed'?'混合模式':'浮動時段'; }
function unassignedVolunteers(evt=currentEvent()){ const assigned=new Set(currentDayShifts(evt).map(s=>s.volunteerId));return state.volunteers.filter(v=>!assigned.has(v.id)); }
function nearestShiftTemplate(evt,time,date=currentEventDate(evt)){ const list=(getDayScheduleConfig(evt,date).shiftTemplates||[]).filter(t=>t.end>t.start);if(!list.length)return null;return list.reduce((best,t)=>Math.abs(((t.start+t.end)/2)-time)<Math.abs(((best.start+best.end)/2)-time)?t:best,list[0]); }
function matchingShiftTemplate(evt,time,date=currentEventDate(evt)){ return (getDayScheduleConfig(evt,date).shiftTemplates||[]).find(t=>time>=t.start&&time<=t.end)||null; }
function viewTitle(){
  const evt=currentEvent();
  return ({events:['活動管理','建立單日或多日活動，再進行分組、崗位及義工編更'],schedule:[evt?.name||'更表編排',evt?`${dateLabel(currentEventDate(evt))}　${formatTime(evt.start)}–${formatTime(evt.end)}　•　共 ${evt.dates?.length||1} 日`:''],volunteers:['義工管理','管理義工及緊急聯絡資料；服務時段於活動編更時設定'],stats:['專屬更表','按個人、所屬中心或所屬組別輸出更表'],settings:['系統設定','本機資料及示範資料管理']}[view]||['義工編更系統','']);
}
function topActionsHTML(){
  if(view==='events')return `<button class="secondary-button" id="topImport">⇧ Excel 匯入義工</button><button class="primary-button" id="topAddEvent">＋ 新增活動</button>`;
  if(view==='schedule')return `<button class="secondary-button" id="backEvents">← 活動列表</button><button class="secondary-button" id="topEditEvent">⚙ 活動設定</button><button class="primary-button" id="topSave">▣ 儲存變更</button>`;
  if(view==='volunteers')return `<button class="secondary-button" id="topImport">⇧ Excel 匯入</button><button class="primary-button" id="topAddVolunteer">＋ 新增義工</button>`;
  if(view==='stats')return `<button class="secondary-button" id="backSchedule">← 返回更表</button>`;
  return `<button class="primary-button" id="topSave">▣ 儲存變更</button>`;
}
function isMobileUI(){return window.matchMedia('(max-width: 700px)').matches;}
function render(){
  if(!currentAdmin)return renderLogin();
  if(isMobileUI())return renderMobile();
  const [title,subtitle]=viewTitle();
  app.innerHTML=`<div class="app-shell">${sidebarHTML()}<main class="main-area"><header class="topbar"><div><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="top-actions"><span id="cloudStatus" class="cloud-status ${cloudStatus}" title="${esc(cloudStatusText)}">${cloudStatusLabel()}</span>${topActionsHTML()}</div></header>${renderContent()}</main></div>`;
  bindBase();
  if(view==='events')bindEventsPage();
  if(view==='schedule')bindSchedule();
  if(view==='volunteers')bindVolunteerPage();
  if(view==='stats')bindStats();
  if(view==='settings')bindSettings();
}

function mobileBottomNavHTML(){
  const items=[['events','⌂','活動'],['schedule','▦','更表'],['volunteers','♙','義工'],['stats','▥','專屬更表'],['settings','⚙','設定']];
  return `<div class="mobile-nav-wrap ${mobileNavCollapsed?'collapsed':''}"><button class="mobile-nav-collapse" id="mobileNavCollapse">${mobileNavCollapsed?'⌃ 展開目錄':'⌄ 收起目錄'}</button><nav class="mobile-bottom-nav">${items.map(([key,icon,label])=>`<button data-mobile-nav="${key}" class="${view===key?'active':''}" ${key==='schedule'&&!currentEvent()?'disabled':''}><b>${icon}</b><span>${label}</span></button>`).join('')}</nav></div>`;
}
function mobileHeaderHTML(title,back=false){
  return `<header class="mobile-topbar">${back?'<button class="mobile-icon-btn" id="mobileBack">‹</button>':'<div class="mobile-brand-mini">♥</div>'}<div class="mobile-title"><strong>${esc(title)}</strong><small>${cloudStatus==='synced'?'● 雲端已同步':cloudStatus==='saving'?'● 正在同步':'● 雲端狀態'}</small></div><button class="mobile-icon-btn" id="mobileQuickMenu">⋯</button></header>`;
}
function renderMobile(){
  const [title]=viewTitle();
  app.innerHTML=`<div class="mobile-app">${mobileHeaderHTML(title,view==='schedule'&&!!currentEvent())}<main class="mobile-main">${mobileContentHTML()}</main>${mobileBottomNavHTML()}</div>`;
  bindMobileBase();
  if(view==='events')bindMobileEvents();
  if(view==='schedule')bindMobileSchedule();
  if(view==='volunteers')bindMobileVolunteers();
  if(view==='stats')bindStats();
  if(view==='settings')bindSettings();
}
function mobileContentHTML(){
  if(view==='events')return mobileEventsHTML();
  if(view==='schedule')return mobileScheduleHTML();
  if(view==='volunteers')return mobileVolunteersHTML();
  if(view==='stats')return `<div class="mobile-standard-page mobile-stats-page">${statsPanelHTML()}</div>`;
  return `<div class="mobile-standard-page">${settingsHTML()}</div>`;
}
function bindMobileBase(){
  document.querySelectorAll('[data-mobile-nav]').forEach(b=>b.addEventListener('click',()=>{const target=b.dataset.mobileNav;if(target==='schedule'&&!currentEvent())return alert('請先建立活動。');if(target==='stats'&&!currentEvent())return alert('請先建立活動。');view=target;render();}));
  document.getElementById('mobileNavCollapse')?.addEventListener('click',()=>{mobileNavCollapsed=!mobileNavCollapsed;render();});
  document.getElementById('mobileBack')?.addEventListener('click',()=>{view='events';render();});
  document.getElementById('mobileQuickMenu')?.addEventListener('click',()=>showMobileQuickMenu());
}
function showMobileQuickMenu(){
  const body=`<div class="mobile-action-sheet"><button id="mqSync">☁ 立即同步雲端</button>${view==='events'?'<button id="mqAddEvent">＋ 新增活動</button>':''}${view==='volunteers'?'<button id="mqAddVolunteer">＋ 新增義工</button><button id="mqImport">⇧ Excel 匯入</button>':''}${view==='schedule'?'<button id="mqEditEvent">⚙ 活動設定</button>':''}<button id="mqLogout" class="danger-text">⇥ 登出管理員</button></div>`;
  const modal=showModal('快速操作',body);modal.querySelector('#mqSync')?.addEventListener('click',async()=>{saveState();await flushCloudSave(true);modal.remove();});modal.querySelector('#mqAddEvent')?.addEventListener('click',()=>{modal.remove();openEventModal();});modal.querySelector('#mqAddVolunteer')?.addEventListener('click',()=>{modal.remove();openVolunteerModal();});modal.querySelector('#mqImport')?.addEventListener('click',()=>{modal.remove();openImportModal();});modal.querySelector('#mqEditEvent')?.addEventListener('click',()=>{modal.remove();openEventModal(currentEvent());});modal.querySelector('#mqLogout')?.addEventListener('click',()=>{modal.remove();logoutAdmin();});
}
function mobileEventsHTML(){
  const totalHours=state.events.reduce((n,e)=>n+eventUsage(e).hours,0),upcoming=state.events.slice().sort((a,b)=>(a.dates?.[0]||a.date).localeCompare(b.dates?.[0]||b.date));
  return `<section class="mobile-home"><div class="mobile-hero"><div><small>管理員模式</small><h1>早安，${esc(currentAdmin?.display_name||'管理員')} 👋</h1><p>一齊編好今日嘅義工更表。</p></div><span class="mobile-cloud-dot ${cloudStatus}">☁</span></div><div class="mobile-primary-actions"><button id="mobileAddEvent">＋ 新增活動</button><button id="mobileImport">⇧ 匯入義工</button></div><h2>今日摘要</h2><div class="mobile-summary-grid"><article><b>${state.events.length}</b><span>已建立活動</span></article><article><b>${state.volunteers.length}</b><span>義工資料</span></article><article><b>${state.events.reduce((n,e)=>n+e.shifts.length,0)}</b><span>所有活動班次</span></article><article><b>${totalHours.toFixed(1)}</b><span>累計服務時數</span></article></div><div class="mobile-section-head"><h2>活動</h2><button id="mobileSeeAll">${upcoming.length} 個</button></div><div class="mobile-event-list">${upcoming.length?upcoming.map(evt=>{const u=eventUsage(evt),d=evt.dates?.[0]||evt.date;return `<article class="mobile-event-card"><div class="mobile-date-badge"><b>${d?.slice(8,10)||'--'}</b><span>${d?.slice(5,7)||'--'}月</span></div><div class="mobile-event-info"><div><h3>${esc(evt.name)}</h3><p>${dateLabel(d)} · ${formatTime(evt.start)}–${formatTime(evt.end)}</p></div><span class="mobile-status-pill">${evt.shifts.length?'編更中':'未編更'}</span><div class="mobile-event-metrics"><span>${evt.dates.length} 日</span><span>${u.volunteers} 已編義工</span><span>${u.hours.toFixed(1)} 小時</span></div><button class="mobile-wide-btn" data-mobile-open-event="${evt.id}">檢視更表</button></div></article>`}).join(''):'<div class="mobile-empty">尚未建立活動</div>'}</div></section>`;
}
function bindMobileEvents(){
  document.getElementById('mobileAddEvent')?.addEventListener('click',()=>openEventModal());document.getElementById('mobileImport')?.addEventListener('click',openImportModal);document.querySelectorAll('[data-mobile-open-event]').forEach(b=>b.addEventListener('click',()=>selectEvent(b.dataset.mobileOpenEvent,'schedule')));
}
function mobileScheduleHTML(){
  const evt=currentEvent();if(!evt)return `<div class="mobile-empty">請先建立活動。</div>`;syncEventDayState(evt);const date=currentEventDate(evt),cfg=getDayScheduleConfig(evt,date);const dates=evt.dates||[evt.date];const shifts=currentDayShifts(evt);const groups=mobileGroupFilter==='all'?evt.groups:evt.groups.filter(g=>g.id===mobileGroupFilter);const unassigned=unassignedVolunteers(evt).filter(v=>`${v.name} ${v.center} ${v.group}`.toLowerCase().includes(unassignedSearch.toLowerCase()));
  const groupCards=groups.map(g=>{const gs=shifts.filter(s=>s.groupId===g.id).sort((a,b)=>a.start-b.start);if(mobileScheduleFilter==='assigned'&&!gs.length)return'';const positions=evt.positions.filter(p=>p.groupId===g.id);return `<section class="mobile-group-card"><button class="mobile-group-head" data-mobile-group-toggle="${g.id}"><span class="group-dot" style="background:${g.color}"></span><strong>${esc(g.name)}</strong><span>${gs.length} 個班次</span><b>⌄</b></button><div class="mobile-shift-list">${gs.length?gs.map(s=>{const v=state.volunteers.find(x=>x.id===s.volunteerId),p=evt.positions.find(x=>x.id===s.positionId),l=getVolunteerLunch(s.volunteerId);return `<button class="mobile-shift-card" data-mobile-edit-shift="${s.id}"><div class="mobile-avatar">${esc(v?.name?.slice(0,1)||'?')}</div><div><strong>${esc(v?.name||'未找到義工')} <small>（${esc(v?.center||'未填中心')}）</small></strong><span>${esc(p?.name||'未設定崗位')}</span><em>${formatTime(s.start)}–${formatTime(s.end)}${l&&s.start<l.end&&s.end>l.start?' · 🍴 午膳':' '}</em></div><i>修改</i></button>`}).join(''):'<div class="mobile-empty-line">此組尚未編配班次</div>'}<button class="mobile-add-shift" data-mobile-add-group="${g.id}">＋ 新增班次</button></div></section>`}).join('');
  return `<section class="mobile-schedule"><div class="mobile-event-context"><h2>${esc(evt.name)}</h2><p>${formatTime(evt.start)}–${formatTime(evt.end)} · ${scheduleModeLabel(cfg.scheduleMode)}</p></div><div class="mobile-date-strip">${dates.map(d=>`<button data-mobile-date="${d}" class="${d===date?'active':''}"><b>${d.slice(8,10)}</b><span>${['日','一','二','三','四','五','六'][new Date(d+'T00:00:00').getDay()]}</span></button>`).join('')}</div><div class="mobile-filter-row"><button class="${mobileGroupFilter==='all'?'active':''}" data-mobile-group-filter="all">全部組別</button>${evt.groups.map(g=>`<button class="${mobileGroupFilter===g.id?'active':''}" data-mobile-group-filter="${g.id}">${esc(g.name.replace(/組.*$/,'組'))}</button>`).join('')}<button id="mobileFiltersBtn">☷ 篩選</button></div>${mobileFiltersOpen?`<div class="mobile-filter-panel"><button class="${mobileScheduleFilter==='all'?'active':''}" data-mobile-status-filter="all">全部</button><button class="${mobileScheduleFilter==='assigned'?'active':''}" data-mobile-status-filter="assigned">已編配</button><button id="mobileShowUnassigned">未編配 ${unassigned.length}</button><button id="mobileLunchBtn">🍴 午膳設定</button></div>`:''}<div class="mobile-schedule-summary"><span><b>${shifts.length}</b> 班次</span><span><b>${new Set(shifts.map(s=>s.volunteerId)).size}</b> 義工</span><span><b>${unassigned.length}</b> 未編配</span></div>${groupCards}<section class="mobile-unassigned-section" id="mobileUnassigned"><div class="mobile-section-head"><h2>未編配義工</h2><span>${unassigned.length} 人</span></div><div class="mobile-search"><span>⌕</span><input id="mobileUnassignedSearch" value="${esc(unassignedSearch)}" placeholder="搜尋姓名／中心／組別"></div><div class="mobile-unassigned-list">${unassigned.length?unassigned.map(v=>`<article><div class="mobile-avatar">${esc(v.name.slice(0,1))}</div><div><strong>${esc(v.name)}</strong><span>${esc(v.center||'未填中心')} · ${esc(v.group||'未填組別')}</span></div><button data-mobile-assign-volunteer="${v.id}">編配</button></article>`).join(''):'<div class="mobile-empty-line">此日所有義工已安排崗位</div>'}</div></section></section>`;
}
function openMobileAssign(volunteerId,groupId=''){
  const evt=currentEvent();if(!evt)return;const positions=evt.positions.filter(p=>!groupId||p.groupId===groupId);if(!positions.length)return alert('此分組未有崗位。');const body=`<div class="mobile-assign-picker"><label>選擇崗位<select id="mobileAssignPosition">${positions.map(p=>`<option value="${p.id}">${esc(evt.groups.find(g=>g.id===p.groupId)?.name||'')}｜${esc(p.name)}</option>`).join('')}</select></label><p>下一步會按此活動日期的編更模式選擇固定更期或自訂服務時間。</p><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="mobileAssignNext">下一步</button></div></div>`;const modal=showModal('編配義工',body);modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#mobileAssignNext').onclick=()=>{const pid=modal.querySelector('#mobileAssignPosition').value;modal.remove();openShiftModal(null,pid,evt.start,volunteerId);};
}
function bindMobileSchedule(){
  document.querySelectorAll('[data-mobile-date]').forEach(b=>b.addEventListener('click',()=>selectEventDate(b.dataset.mobileDate)));document.querySelectorAll('[data-mobile-group-filter]').forEach(b=>b.addEventListener('click',()=>{mobileGroupFilter=b.dataset.mobileGroupFilter;render();}));document.getElementById('mobileFiltersBtn')?.addEventListener('click',()=>{mobileFiltersOpen=!mobileFiltersOpen;render();});document.querySelectorAll('[data-mobile-status-filter]').forEach(b=>b.addEventListener('click',()=>{mobileScheduleFilter=b.dataset.mobileStatusFilter;render();}));document.querySelectorAll('[data-mobile-edit-shift]').forEach(b=>b.addEventListener('click',()=>{const s=currentDayShifts().find(x=>x.id===b.dataset.mobileEditShift);if(s)openShiftModal(s);}));document.querySelectorAll('[data-mobile-add-group]').forEach(b=>b.addEventListener('click',()=>{const evt=currentEvent(),p=evt.positions.find(p=>p.groupId===b.dataset.mobileAddGroup);if(!p)return alert('此分組未有崗位。');openShiftModal(null,p.id,evt.start);}));document.querySelectorAll('[data-mobile-assign-volunteer]').forEach(b=>b.addEventListener('click',()=>openMobileAssign(b.dataset.mobileAssignVolunteer,mobileGroupFilter==='all'?'':mobileGroupFilter)));document.getElementById('mobileShowUnassigned')?.addEventListener('click',()=>document.getElementById('mobileUnassigned')?.scrollIntoView({behavior:'smooth'}));document.getElementById('mobileUnassignedSearch')?.addEventListener('input',e=>{unassignedSearch=e.target.value;render();setTimeout(()=>document.getElementById('mobileUnassignedSearch')?.focus(),0);});document.getElementById('mobileLunchBtn')?.addEventListener('click',()=>{document.querySelector('[data-lunch-mode]')?.click();openLunchSettingsMobile();});
}
function openLunchSettingsMobile(){
  const evt=currentEvent();if(!evt)return;const l=evt.lunch;const body=`<div class="form-grid"><label class="full-field">午膳安排<select id="mlMode"><option value="uniform" ${l.mode==='uniform'?'selected':''}>統一時段</option><option value="staggered" ${l.mode==='staggered'?'selected':''}>分段安排</option></select></label><label>開始<input id="mlStart" type="time" value="${formatTime(l.start)}"></label><label>結束<input id="mlEnd" type="time" value="${formatTime(l.end)}"></label></div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="mlSave">儲存</button></div>`;const modal=showModal('午膳設定',body);modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#mlSave').onclick=()=>{l.enabled=true;l.mode=modal.querySelector('#mlMode').value;l.start=inputTime(modal.querySelector('#mlStart').value);l.end=inputTime(modal.querySelector('#mlEnd').value);saveState();modal.remove();render();toast('午膳設定已更新');};
}
function mobileVolunteersHTML(){
  const vols=state.volunteers.slice().sort((a,b)=>compareText(a.center,b.center)||compareText(a.name,b.name));const centers=[...new Set(vols.map(v=>v.center||'未填中心'))];return `<section class="mobile-volunteers"><div class="mobile-primary-actions"><button id="mobileAddVolunteer">＋ 新增義工</button><button id="mobileImportVolunteer">⇧ Excel 匯入</button></div><div class="mobile-search"><span>⌕</span><input id="mobileVolunteerSearch" placeholder="搜尋姓名／中心／組別"></div><div id="mobileVolunteerCards">${centers.map(c=>`<section class="mobile-vol-center"><h3>${esc(c)} <span>${vols.filter(v=>(v.center||'未填中心')===c).length}</span></h3>${vols.filter(v=>(v.center||'未填中心')===c).map(v=>`<button class="mobile-vol-card" data-mobile-edit-volunteer="${v.id}"><div class="mobile-avatar">${esc(v.name.slice(0,1))}</div><div><strong>${esc(v.name)}</strong><span>${esc(v.group||'未填組別')} · ${esc(v.phone||'未填電話')}</span></div><i>›</i></button>`).join('')}</section>`).join('')}</div><button class="mobile-secondary-wide" id="mobileExportVolunteers">⇩ 輸出義工名單</button></section>`;
}
function bindMobileVolunteers(){
  document.getElementById('mobileAddVolunteer')?.addEventListener('click',()=>openVolunteerModal());document.getElementById('mobileImportVolunteer')?.addEventListener('click',openImportModal);document.getElementById('mobileExportVolunteers')?.addEventListener('click',downloadVolunteerListExcel);document.querySelectorAll('[data-mobile-edit-volunteer]').forEach(b=>b.addEventListener('click',()=>openVolunteerModal(state.volunteers.find(v=>v.id===b.dataset.mobileEditVolunteer))));document.getElementById('mobileVolunteerSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.mobile-vol-card').forEach(card=>{const v=state.volunteers.find(x=>x.id===card.dataset.mobileEditVolunteer);card.style.display=`${v?.name} ${v?.center} ${v?.group}`.toLowerCase().includes(q)?'flex':'none';});});
}

function sidebarHTML(){
  const items=[['events','▦','活動'],['volunteers','♙','義工管理'],['stats','▥','專屬更表'],['settings','⚙','設定']];
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">♥</div><div><strong>義工編更系統</strong><span>Volunteer Roster</span></div></div><nav>${items.map(([key,icon,label])=>`<button class="nav-item ${view===key?'active':''}" data-nav="${key}"><b>${icon}</b><span>${label}</span></button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="admin-box"><span class="admin-mode-label">管理員模式</span><strong>${esc(currentAdmin?.display_name||'管理員')}</strong><small>${esc(authSession?.user?.email||'')}</small><button id="logoutAdmin" class="sidebar-logout">登出</button></div><div class="sidebar-status cloud-sidebar">☁ <span>Supabase 雲端儲存<br><b>${esc(SUPABASE_URL.replace('https://',''))}</b></span></div></aside>`;
}
function renderContent(){ if(view==='events')return eventsPageHTML();if(view==='schedule')return schedulePageHTML();if(view==='volunteers')return volunteerPageHTML();if(view==='stats')return `<div class="content-page">${statsPanelHTML()}</div>`;return settingsHTML(); }
function bindBase(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.nav==='stats'&&!currentEvent())return alert('請先建立活動。');view=b.dataset.nav;render();}));
  document.getElementById('topImport')?.addEventListener('click',openImportModal);
  document.getElementById('topAddEvent')?.addEventListener('click',()=>openEventModal());
  document.getElementById('topEditEvent')?.addEventListener('click',()=>openEventModal(currentEvent()));
  document.getElementById('topAddVolunteer')?.addEventListener('click',()=>openVolunteerModal());
  document.getElementById('topSave')?.addEventListener('click',async()=>{saveState();await flushCloudSave(true);});
  document.getElementById('logoutAdmin')?.addEventListener('click',()=>logoutAdmin());
  document.getElementById('backEvents')?.addEventListener('click',()=>{view='events';render();});
  document.getElementById('backSchedule')?.addEventListener('click',()=>{view='schedule';render();});
}

function eventsPageHTML(){
  const totalHours=state.events.reduce((n,e)=>n+eventUsage(e).hours,0),upcoming=state.events.slice().sort((a,b)=>(a.dates?.[0]||a.date).localeCompare(b.dates?.[0]||b.date));
  return `<div class="content-page events-page"><div class="overview-grid event-overview"><div class="overview-card"><span>已建立活動</span><strong>${state.events.length}</strong><small>個</small></div><div class="overview-card"><span>義工資料</span><strong>${state.volunteers.length}</strong><small>人</small></div><div class="overview-card"><span>所有活動班次</span><strong>${state.events.reduce((n,e)=>n+e.shifts.length,0)}</strong><small>班</small></div><div class="overview-card"><span>累計服務時數</span><strong>${totalHours.toFixed(1)}</strong><small>小時</small></div></div>
    <section class="events-section"><div class="events-section-head"><div><h2>已生成的活動</h2><p>支援自訂多個活動日期；所有活動日共用分組、崗位及義工名單；每個日期可有不同編更模式、更期及獨立更表。</p></div><button class="primary-button" id="pageAddEvent">＋ 新增活動</button></div>
      <div class="event-card-grid">${upcoming.map(eventCardHTML).join('')}</div>
    </section>
  </div>`;
}
function eventCardHTML(evt){
  const u=eventUsage(evt),positions=evt.positions.length,needed=evt.positions.reduce((n,p)=>n+Number(p.required||0),0),dates=evt.dates||[evt.date],first=dates[0],last=dates.at(-1),dateSummary=dates.length===1?dateLabel(first):`${dateLabel(first)} 至 ${dateLabel(last)}（共 ${dates.length} 日）`;
  return `<article class="event-card ${evt.id===state.activeEventId?'current':''}" data-event-card="${evt.id}"><div class="event-card-date multi-day"><strong>${dates.length}</strong><span>${dates.length===1?'日':'活動日'}</span></div><div class="event-card-main"><div class="event-card-title"><div><h3>${esc(evt.name)}</h3><p>${dateSummary}　${formatTime(evt.start)}–${formatTime(evt.end)}</p></div><span class="event-status">${evt.shifts.length?'編更中':'未編更'}</span></div><div class="event-card-metrics"><span><b>${dates.length}</b> 日</span><span><b>${evt.groups.length}</b> 分組</span><span><b>${positions}</b> 崗位</span><span><b>${needed}</b> 每日需求人次</span><span><b>${u.volunteers}</b> 已編義工</span><span><b>${u.hours.toFixed(1)}</b> 小時</span><span><b>${esc(dayScheduleSummary(evt))}</b></span></div><div class="event-card-actions"><button class="primary-button" data-open-event="${evt.id}">管理更表</button><button class="secondary-button" data-event-stats="${evt.id}">專屬更表</button><button class="secondary-button" data-edit-event="${evt.id}">修改</button><button class="danger-ghost" data-delete-event="${evt.id}">刪除</button></div></div></article>`;
}
function bindEventsPage(){
  document.getElementById('pageAddEvent')?.addEventListener('click',()=>openEventModal());
  document.querySelectorAll('[data-open-event]').forEach(b=>b.addEventListener('click',()=>selectEvent(b.dataset.openEvent,'schedule')));
  document.querySelectorAll('[data-event-stats]').forEach(b=>b.addEventListener('click',()=>selectEvent(b.dataset.eventStats,'stats')));
  document.querySelectorAll('[data-edit-event]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();openEventModal(state.events.find(x=>x.id===b.dataset.editEvent));}));
  document.querySelectorAll('[data-delete-event]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();deleteEvent(b.dataset.deleteEvent);}));
}
function deleteEvent(eventId){
  const evt=state.events.find(e=>e.id===eventId);if(!evt)return;
  if(!confirm(`確定刪除「${evt.name}」？活動內所有分組、崗位、班次及午膳設定會一併刪除。`))return;
  recordAudit('delete','event',eventId,{name:evt.name});state.events=state.events.filter(e=>e.id!==eventId);if(!state.events.length)state.activeEventId='';else if(state.activeEventId===eventId)state.activeEventId=state.events[0].id;saveState();render();toast('活動已刪除');
}

function allocateLanes(positionId){
  const evt=currentEvent();const shifts=currentDayShifts(evt).filter(s=>s.positionId===positionId).slice().sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id));const laneEnds=[],laneMap={};
  for(const shift of shifts){let lane=laneEnds.findIndex(end=>end<=shift.start);if(lane<0){lane=laneEnds.length;laneEnds.push(shift.end);}else laneEnds[lane]=shift.end;laneMap[shift.id]=lane;}
  return {laneMap,laneCount:Math.max(1,laneEnds.length)};
}
function buildLayout(){
  const evt=currentEvent();let y=0;const items=[],positionRows=[],laneMap={};if(!evt)return {items,positionRows,laneMap,totalHeight:0};
  const groups=activeGroupFilter==='all'?evt.groups:evt.groups.filter(g=>g.id===activeGroupFilter);
  for(const group of groups){items.push({type:'group',id:group.id,y,height:GROUP_HEIGHT,group});y+=GROUP_HEIGHT;for(const position of evt.positions.filter(p=>p.groupId===group.id)){const lanes=allocateLanes(position.id);Object.assign(laneMap,lanes.laneMap);const height=lanes.laneCount>1?ROW_PADDING*2+lanes.laneCount*EVENT_HEIGHT+(lanes.laneCount-1)*LANE_GAP:ROW_HEIGHT;const row={type:'position',id:position.id,y,height,group,position,laneCount:lanes.laneCount};items.push(row);positionRows.push(row);y+=height;}}
  return {items,positionRows,laneMap,totalHeight:y};
}
function getVolunteerLunch(volunteerId){ const lunch=currentEvent()?.lunch;if(!lunch?.enabled)return null;if(lunch.mode==='staggered')return lunch.individual?.[volunteerId]||null;return {start:lunch.start,end:lunch.end}; }
function timelineMarks(){
  const start=dayStart(),end=dayEnd(),marks=[start];let next=Math.ceil(start/60)*60;if(next===start)next+=60;for(let t=next;t<end;t+=60)marks.push(t);if(end!==marks.at(-1))marks.push(end);return marks;
}
function schedulePageHTML(){
  const evt=currentEvent();if(!evt)return `<div class="content-page"><div class="empty-chart">請先建立活動。</div></div>`;syncEventDayState(evt);const activeDate=currentEventDate(evt),dayConfig=getDayScheduleConfig(evt,activeDate);
  const layout=buildLayout(),marks=timelineMarks();
  const hoursLabels=marks.map((t,i)=>`<div class="hour-label ${i===0?'first':''} ${i===marks.length-1?'last':''}" style="left:${((t-dayStart())/dayDuration())*100}%">${formatTime(t)}</div>`).join('');
  const rowLabels=layout.items.map(item=>item.type==='group'?`<div class="group-label" style="height:${item.height}px"><span class="group-dot" style="background:${item.group.color}"></span>${esc(item.group.name)}</div>`:`<div class="position-label" style="height:${item.height}px"><span>${esc(item.position.name)}</span><small>所需 ${item.position.required} 人</small></div>`).join('');
  const rowBg=layout.items.map(item=>`<div class="${item.type==='group'?'canvas-group-row':'canvas-position-row'}" ${item.type==='position'?`data-position-row="${item.position.id}"`:''} style="top:${item.y}px;height:${item.height}px"></div>`).join('');
  const verticals=marks.map(t=>`<div class="vertical-grid" style="left:${((t-dayStart())/dayDuration())*100}%"></div>`).join('');
  const lunch=evt.lunch.enabled&&evt.lunch.mode!=='staggered'?`<div class="lunch-zone" style="left:${((evt.lunch.start-dayStart())/dayDuration())*100}%;width:${((evt.lunch.end-evt.lunch.start)/dayDuration())*100}%"><div class="lunch-tag">🍴 午膳 ${formatTime(evt.lunch.start)}–${formatTime(evt.lunch.end)}</div></div>`:'';
  const visibleShifts=currentDayShifts(evt).filter(s=>activeGroupFilter==='all'||s.groupId===activeGroupFilter),shifts=visibleShifts.map(s=>shiftBlockHTML(s,layout)).join('');
  const selected=currentDayShifts(evt).find(s=>s.id===selectedShiftId),vol=state.volunteers.find(v=>v.id===selected?.volunteerId),pos=evt.positions.find(p=>p.id===selected?.positionId),selectedLunch=vol?getVolunteerLunch(vol.id):null;
  const personalLunchEntries=Object.entries(evt.lunch.individual||{}).map(([vid,l])=>({vol:state.volunteers.find(v=>v.id===vid),l})).filter(x=>x.vol);
  const unassigned=unassignedVolunteers(evt).filter(v=>`${v.name} ${v.center} ${v.group}`.toLowerCase().includes(unassignedSearch.toLowerCase()));
  const fixedStrip=dayConfig.scheduleMode!=='flexible'&&dayConfig.shiftTemplates.length?`<div class="fixed-period-strip"><span><strong>${scheduleModeLabel(dayConfig.scheduleMode)}</strong><small>${dateLabel(activeDate)} 固定更期</small></span>${dayConfig.shiftTemplates.map(t=>`<div class="fixed-period-pill"><b>${esc(t.name)}</b><small>${formatTime(t.start)}–${formatTime(t.end)}</small></div>`).join('')}</div>`:'';
  return `<div class="schedule-page"><section class="event-context-bar"><div><span class="event-context-date">${dateLabel(activeDate)}　•　活動共 ${evt.dates.length} 日</span><h2>${esc(evt.name)}</h2><p>${formatTime(evt.start)}–${formatTime(evt.end)}　•　${evt.groups.length} 分組　•　${evt.positions.length} 崗位　•　<strong>${scheduleModeLabel(dayConfig.scheduleMode)}</strong></p></div><button class="secondary-button" id="editEventStructure">⚙ 修改活動／每日編更模式／分組崗位</button></section>
    <div class="feature-strip"><div><span class="feature-icon blue">♙</span><p><strong>未編配義工池</strong><small>拖到崗位後選擇當日服務時段</small></p></div><div><span class="feature-icon cyan">◷</span><p><strong>每日獨立更期</strong><small>不同日期可用不同編更模式</small></p></div><div><span class="feature-icon indigo">↔</span><p><strong>互動編更</strong><small>拖拉、伸縮及跨崗位調動</small></p></div><div><span class="feature-icon pink">🍴</span><p><strong>午膳時間</strong><small>紅色標示統一或分段安排</small></p></div><div><span class="feature-icon blue">▥</span><p><strong>多人同時段</strong><small>重疊班次自動增高欄目</small></p></div><div><span class="feature-icon cyan">◷</span><p><strong>專屬更表</strong><small>個人／中心／組別匯出</small></p></div></div>
    <div class="event-date-tabs"><span>活動日期</span>${evt.dates.map((d,i)=>{const c=getDayScheduleConfig(evt,d);return `<button class="event-date-tab ${d===activeDate?'active':''}" data-event-date="${d}"><b>Day ${i+1} · ${scheduleModeLabel(c.scheduleMode)}</b><small>${dateLabel(d)}</small></button>`;}).join('')}</div>${fixedStrip}<div class="schedule-toolbar"><div class="date-display">▣ ${esc(activeDate)}　${formatTime(evt.start)}–${formatTime(evt.end)}　｜　${scheduleModeLabel(dayConfig.scheduleMode)}</div><div class="toolbar-spacer"></div><button class="secondary-button" id="addShift">＋ 新增編更</button><button class="secondary-button" id="exportSchedule">⇩ 匯出多日活動 Excel</button><button class="publish-button" id="openStats">▥ 專屬更表</button></div>
    <div class="group-filter-bar"><span class="filter-label">顯示分組</span><button class="group-filter-button ${activeGroupFilter==='all'?'active':''}" data-filter-group="all">全部</button>${evt.groups.map(g=>`<button class="group-filter-button ${activeGroupFilter===g.id?'active':''}" data-filter-group="${g.id}"><span class="group-dot" style="background:${g.color}"></span>${esc(g.name)}</button>`).join('')}</div>
    <section class="group-usage-section"><div class="group-usage-heading"><strong>各組編更概況</strong><small>獨立義工人數及已編配時數</small></div><div class="group-usage-grid">${evt.groups.map(g=>{const u=groupUsage(g.id);return `<button class="group-usage-card ${activeGroupFilter===g.id?'active':''}" data-summary-group="${g.id}"><span class="group-dot large" style="background:${g.color}"></span><span class="group-usage-name">${esc(g.name)}</span><span class="group-usage-metric"><b>${u.volunteers}</b> 人</span><span class="group-usage-metric"><b>${u.hours.toFixed(1)}</b> 小時</span></button>`}).join('')}</div></section>
    <div class="schedule-workspace"><div class="left-rail unassigned-rail"><div class="rail-section"><div class="rail-title"><strong>未編配崗位義工</strong><span class="rail-count">${unassigned.length}</span></div><div class="unassigned-help">按當日計算。拖拉義工到右方崗位後，系統會要求你選擇固定更期或自訂服務時間。</div><div class="pool-search">⌕<input id="unassignedSearch" value="${esc(unassignedSearch)}" placeholder="搜尋姓名／中心／組別"></div><div class="unassigned-list">${unassigned.length?unassigned.map(v=>`<button class="unassigned-volunteer-card" data-drag-volunteer="${v.id}"><span class="pool-avatar">${esc(v.name.slice(0,1))}</span><span><strong>${esc(v.name)}</strong><small>${esc(v.center||'未填中心')}</small><em>${esc(v.group||'未填組別')}　｜　拖放後選擇時段</em></span><b>⋮⋮</b></button>`).join(''):'<div class="pool-empty">此日所有義工已安排崗位</div>'}</div></div></div>
      <div class="board-column"><div class="schedule-shell"><div class="timeline-header"><div class="timeline-corner">崗位／時間</div><div class="timeline-hours">${hoursLabels}</div></div><div class="schedule-body" id="scheduleBody" style="height:${layout.totalHeight}px"><div class="row-labels">${rowLabels}</div><div class="timeline-canvas" id="timelineCanvas" style="height:${layout.totalHeight}px">${verticals}${rowBg}${lunch}${shifts}</div></div><div class="schedule-hint">由左側拖義工到崗位後選擇服務時段；固定模式必須選擇當日固定更期，浮動模式自行輸入時間，混合模式兩者均可。</div></div></div>
      <aside class="inspector"><h3>義工資訊</h3>${vol&&selected&&pos?`<div class="person-header"><span class="avatar">${esc(vol.name.slice(0,1))}</span><div><strong>${esc(vol.name)}</strong><small>${esc(vol.center)}</small></div></div><dl><dt>所屬組別</dt><dd>${esc(vol.group||'—')}</dd><dt>電話</dt><dd>${esc(vol.phone||'—')}</dd><dt>緊急聯絡人</dt><dd>${esc(vol.emergencyContact||'—')} ${vol.emergencyRelation?`（${esc(vol.emergencyRelation)}）`:''}</dd><dt>緊急電話</dt><dd>${esc(vol.emergencyPhone||'—')}</dd><dt>當日編更模式</dt><dd>${esc(scheduleModeLabel(dayConfig.scheduleMode))}</dd><dt>午膳</dt><dd>${selectedLunch?`${formatTime(selectedLunch.start)}–${formatTime(selectedLunch.end)}`:'未設定'}</dd></dl><hr><h3>已選班次</h3><div class="selected-shift-card"><span class="group-dot" style="background:${pos.color}"></span><div><strong>${esc(pos.name)}</strong><small>${formatTime(selected.start)}–${formatTime(selected.end)}（${hours(selected.start,selected.end).toFixed(1)} 小時）</small></div></div><button class="secondary-button button-wide" id="editSelectedShift">編輯班次</button><button class="danger-button button-wide" id="deleteSelectedShift">⌫ 刪除班次</button>`:`<div class="empty-inspector">選擇更表上的班次查看義工資料。</div>`}</aside></div>
    <div class="lunch-settings-inline lunch-config-panel"><label class="switch-label"><input id="lunchEnabled" type="checkbox" ${evt.lunch.enabled?'checked':''}> 顯示午膳時間</label><div class="lunch-mode-switch"><button class="${evt.lunch.mode!=='staggered'?'active':''}" data-lunch-mode="uniform">統一時段</button><button class="${evt.lunch.mode==='staggered'?'active':''}" data-lunch-mode="staggered">分段安排</button></div>${evt.lunch.mode==='staggered'?`<button class="secondary-button compact" id="addVolunteerLunch">＋ 新增義工午膳</button><div class="personal-lunch-list">${personalLunchEntries.length?personalLunchEntries.map(({vol,l})=>`<button class="personal-lunch-chip" data-edit-lunch="${vol.id}"><strong>${esc(vol.name)}</strong><span>${formatTime(l.start)}–${formatTime(l.end)}</span></button>`).join(''):'<span class="lunch-empty">尚未設定個別午膳時間</span>'}</div>`:`<label>由 <input id="lunchStart" type="time" min="${formatTime(evt.start)}" max="${formatTime(evt.end)}" value="${formatTime(evt.lunch.start)}"></label><label>至 <input id="lunchEnd" type="time" min="${formatTime(evt.start)}" max="${formatTime(evt.end)}" value="${formatTime(evt.lunch.end)}"></label>`}</div>
  </div>`;
}
function groupStructureRailHTML(g){
  const evt=currentEvent(),positions=evt.positions.filter(p=>p.groupId===g.id);
  return `<div class="rail-group"><div class="rail-group-head"><span class="group-dot" style="background:${g.color}"></span><strong>${esc(g.name)}</strong><span class="rail-group-spacer"></span><button title="編輯分組" data-edit-group="${g.id}">✎</button><button title="刪除分組" class="danger-text" data-delete-group="${g.id}">×</button></div><div class="rail-position-list">${positions.map(p=>`<div class="rail-position-row"><span>${esc(p.name)}</span><small>${p.required} 人</small><button data-edit-position="${p.id}" title="編輯崗位">✎</button><button data-delete-position="${p.id}" class="danger-text" title="刪除崗位">×</button></div>`).join('')}<button class="rail-add-position" data-add-position-group="${g.id}">＋ 在此組新增崗位</button></div></div>`;
}
function shiftBlockHTML(shift,layout){
  const evt=currentEvent(),vol=state.volunteers.find(v=>v.id===shift.volunteerId),pos=evt.positions.find(p=>p.id===shift.positionId);if(!vol||!pos)return '';
  const left=((shift.start-dayStart())/dayDuration())*100,width=((shift.end-shift.start)/dayDuration())*100,row=layout.positionRows.find(r=>r.position.id===shift.positionId);if(!row)return '';
  const lane=layout.laneMap[shift.id]||0,top=row.y+(row.laneCount>1?ROW_PADDING+lane*(EVENT_HEIGHT+LANE_GAP):(row.height-EVENT_HEIGHT)/2),lunch=getVolunteerLunch(vol.id),overlap=lunch&&shift.start<lunch.end&&shift.end>lunch.start;
  const lunchSegment=lunch&&overlap?`<span class="shift-lunch-segment" style="left:${((Math.max(shift.start,lunch.start)-shift.start)/(shift.end-shift.start))*100}%;width:${((Math.min(shift.end,lunch.end)-Math.max(shift.start,lunch.start))/(shift.end-shift.start))*100}%"></span>`:'';
  const cfg=getDayScheduleConfig(evt,shift.date||currentEventDate(evt)),template=cfg.shiftTemplates?.find(t=>t.id===shift.templateId),templateTag=template?`<span class="shift-template-label">${esc(template.name)}</span>`:'';
  return `<div class="shift-block ${selectedShiftId===shift.id?'selected':''} ${shift.templateId?'fixed-template-shift':''} ${evt.lunch.mode!=='staggered'&&overlap?'lunch-overlap':''}" data-shift="${shift.id}" style="left:${left}%;width:${width}%;top:${top}px;background:${pos.color}"><i class="resize-handle left" data-resize="left"></i>${lunchSegment}<strong title="${esc(vol.name)}（${esc(vol.center)}）">${esc(vol.name)}（${esc(vol.center||'未填中心')}）</strong><span class="shift-time">${formatTime(shift.start)}–${formatTime(shift.end)}</span>${templateTag}<i class="resize-handle right" data-resize="right"></i></div>`;
}
function bindSchedule(){
  const evt=currentEvent();if(!evt)return;
  document.querySelectorAll('[data-event-date]').forEach(b=>b.addEventListener('click',()=>selectEventDate(b.dataset.eventDate)));document.getElementById('editEventStructure')?.addEventListener('click',()=>openEventModal(evt));document.getElementById('addShift')?.addEventListener('click',()=>openShiftModal());document.getElementById('exportSchedule')?.addEventListener('click',downloadFullEventExcel);document.getElementById('openStats')?.addEventListener('click',()=>{view='stats';render();});
  document.querySelectorAll('[data-filter-group],[data-summary-group]').forEach(b=>b.addEventListener('click',()=>{activeGroupFilter=b.dataset.filterGroup||b.dataset.summaryGroup;const candidate=currentDayShifts(evt).find(s=>activeGroupFilter==='all'||s.groupId===activeGroupFilter);selectedShiftId=candidate?.id||'';render();}));
  document.getElementById('unassignedSearch')?.addEventListener('input',e=>{unassignedSearch=e.target.value;render();const input=document.getElementById('unassignedSearch');input?.focus();input?.setSelectionRange(input.value.length,input.value.length);});
  document.getElementById('editSelectedShift')?.addEventListener('click',()=>openShiftModal(evt.shifts.find(s=>s.id===selectedShiftId)));document.getElementById('deleteSelectedShift')?.addEventListener('click',()=>{if(confirm('確定刪除此班次？')){evt.shifts=evt.shifts.filter(s=>s.id!==selectedShiftId);selectedShiftId=currentDayShifts(evt)[0]?.id||'';saveState();render();}});
  document.getElementById('lunchEnabled')?.addEventListener('change',e=>{evt.lunch.enabled=e.target.checked;saveState();render();});document.querySelectorAll('[data-lunch-mode]').forEach(b=>b.addEventListener('click',()=>{evt.lunch.mode=b.dataset.lunchMode;evt.lunch.enabled=true;saveState();render();}));document.getElementById('lunchStart')?.addEventListener('change',e=>{evt.lunch.start=inputTime(e.target.value);saveState();render();});document.getElementById('lunchEnd')?.addEventListener('change',e=>{evt.lunch.end=inputTime(e.target.value);saveState();render();});document.getElementById('addVolunteerLunch')?.addEventListener('click',()=>openVolunteerLunchModal());document.querySelectorAll('[data-edit-lunch]').forEach(b=>b.addEventListener('click',()=>openVolunteerLunchModal(b.dataset.editLunch)));
  document.getElementById('timelineCanvas')?.addEventListener('dblclick',timelineDoubleClick);bindVolunteerPoolDrag();bindShiftInteractions();
}
function deleteGroup(groupId){ const evt=currentEvent(),g=evt.groups.find(x=>x.id===groupId);if(!g)return;if(!confirm(`刪除「${g.name}」？此分組內的所有崗位及相關班次會一併刪除。`))return;const pids=new Set(evt.positions.filter(p=>p.groupId===groupId).map(p=>p.id));evt.positions=evt.positions.filter(p=>p.groupId!==groupId);evt.shifts=evt.shifts.filter(s=>!pids.has(s.positionId)&&s.groupId!==groupId);evt.groups=evt.groups.filter(x=>x.id!==groupId);if(activeGroupFilter===groupId)activeGroupFilter='all';saveState();render();toast('分組及相關崗位已刪除'); }
function deletePosition(positionId){ const evt=currentEvent(),p=evt.positions.find(x=>x.id===positionId);if(!p)return;if(!confirm(`刪除崗位「${p.name}」？相關班次會一併刪除。`))return;evt.positions=evt.positions.filter(x=>x.id!==positionId);evt.shifts=evt.shifts.filter(s=>s.positionId!==positionId);saveState();render();toast('崗位及相關班次已刪除'); }
function timelineDoubleClick(e){ if(e.target.closest('.shift-block'))return;const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),layout=buildLayout(),x=e.clientX-rect.left,y=e.clientY-rect.top,row=layout.positionRows.find(r=>y>=r.y&&y<r.y+r.height);if(!row)return;const start=clamp(snap(dayStart()+(x/rect.width)*dayDuration()),dayStart(),dayEnd()-30);openShiftModal(null,row.position.id,start); }
function bindShiftInteractions(){
  const evt=currentEvent(),canvas=document.getElementById('timelineCanvas');if(!evt||!canvas)return;const layout=buildLayout();document.querySelectorAll('.shift-block').forEach(block=>{block.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const shift=evt.shifts.find(s=>s.id===block.dataset.shift);if(!shift)return;const cfg=getDayScheduleConfig(evt,shift.date||currentEventDate(evt)),hasFixedTemplate=!!shift.templateId&&cfg.shiftTemplates?.some(t=>t.id===shift.templateId);if(hasFixedTemplate&&e.target.dataset.resize){toast('固定更期不可直接伸縮；如需改成浮動時間，請編輯班次。');return;}selectedShiftId=shift.id;document.querySelectorAll('.shift-block.selected').forEach(x=>x.classList.remove('selected'));block.classList.add('selected');const rect=canvas.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,initialLeft=block.offsetLeft,initialTop=block.offsetTop,initialWidth=block.offsetWidth,mode=e.target.dataset.resize||'drag';let moved=false,last={};block.setPointerCapture?.(e.pointerId);
      const move=ev=>{const dx=ev.clientX-startX,dy=ev.clientY-startY;if(Math.abs(dx)+Math.abs(dy)>2)moved=true;if(mode==='drag'){const center=initialTop+dy+EVENT_HEIGHT/2,row=nearestRow(center,layout.positionRows);if(!row)return;if(hasFixedTemplate||cfg.scheduleMode==='fixed'){const centerX=clamp(initialLeft+initialWidth/2+dx,0,rect.width),dropTime=dayStart()+(centerX/rect.width)*dayDuration(),t=nearestShiftTemplate(evt,dropTime,shift.date);if(!t)return;const x=((t.start-dayStart())/dayDuration())*rect.width,w=((t.end-t.start)/dayDuration())*rect.width;block.style.left=`${x}px`;block.style.width=`${w}px`;block.style.top=`${row.y+(row.height-EVENT_HEIGHT)/2}px`;block.querySelector('.shift-time').textContent=`${formatTime(t.start)}–${formatTime(t.end)}`;last={start:t.start,end:t.end,row,templateId:t.id};}else{const duration=shift.end-shift.start;let x=clamp(initialLeft+dx,0,rect.width-initialWidth);let start=clamp(snap(dayStart()+(x/rect.width)*dayDuration()),dayStart(),dayEnd()-duration);x=((start-dayStart())/dayDuration())*rect.width;block.style.left=`${x}px`;block.style.top=`${row.y+(row.height-EVENT_HEIGHT)/2}px`;block.querySelector('.shift-time').textContent=`${formatTime(start)}–${formatTime(start+duration)}`;last={start,end:start+duration,row,templateId:''};}}else if(mode==='left'){let x=clamp(initialLeft+dx,0,initialLeft+initialWidth-28);let start=clamp(snap(dayStart()+(x/rect.width)*dayDuration()),dayStart(),shift.end-30);x=((start-dayStart())/dayDuration())*rect.width;const endX=((shift.end-dayStart())/dayDuration())*rect.width;block.style.left=`${x}px`;block.style.width=`${Math.max(28,endX-x)}px`;block.querySelector('.shift-time').textContent=`${formatTime(start)}–${formatTime(shift.end)}`;last={start,end:shift.end,templateId:''};}else{let end=clamp(snap(dayStart()+((initialLeft+initialWidth+dx)/rect.width)*dayDuration()),shift.start+30,dayEnd());const endX=((end-dayStart())/dayDuration())*rect.width;block.style.width=`${Math.max(28,endX-initialLeft)}px`;block.querySelector('.shift-time').textContent=`${formatTime(shift.start)}–${formatTime(end)}`;last={start:shift.start,end,templateId:''};}};
      const up=()=>{document.removeEventListener('pointermove',move);if(moved&&last.start!==undefined){shift.start=last.start;shift.end=last.end;if(last.templateId!==undefined)shift.templateId=last.templateId;if(last.row){shift.positionId=last.row.position.id;shift.groupId=last.row.group.id;}saveState();}render();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});});});
}
function createShiftFromPool(volunteerId,row,dropTime){
  const evt=currentEvent();if(!evt||!row)return;const v=state.volunteers.find(x=>x.id===volunteerId);if(!v)return;
  openShiftModal(null,row.position.id,dropTime,volunteerId);
}
function bindVolunteerPoolDrag(){
  const evt=currentEvent(),body=document.getElementById('scheduleBody'),canvas=document.getElementById('timelineCanvas');if(!evt||!body||!canvas)return;const layout=buildLayout();
  document.querySelectorAll('[data-drag-volunteer]').forEach(card=>card.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();const volunteerId=card.dataset.dragVolunteer,v=state.volunteers.find(x=>x.id===volunteerId);if(!v)return;const ghost=document.createElement('div');ghost.className='pool-drag-ghost';ghost.innerHTML=`<strong>${esc(v.name)}</strong><small>${esc(v.center||'未填中心')}</small>`;document.body.appendChild(ghost);card.classList.add('dragging');let hoverRow=null,dropTime=evt.start;
    const move=ev=>{ghost.style.left=`${ev.clientX+14}px`;ghost.style.top=`${ev.clientY+14}px`;const bodyRect=body.getBoundingClientRect(),canvasRect=canvas.getBoundingClientRect(),y=ev.clientY-bodyRect.top;hoverRow=layout.positionRows.find(r=>y>=r.y&&y<r.y+r.height)||null;document.querySelectorAll('.canvas-position-row.drag-hover').forEach(x=>x.classList.remove('drag-hover'));if(hoverRow)document.querySelector(`[data-position-row="${hoverRow.position.id}"]`)?.classList.add('drag-hover');const x=clamp(ev.clientX-canvasRect.left,0,canvasRect.width);dropTime=snap(evt.start+(x/canvasRect.width)*dayDuration());};
    const up=()=>{document.removeEventListener('pointermove',move);document.querySelectorAll('.canvas-position-row.drag-hover').forEach(x=>x.classList.remove('drag-hover'));ghost.remove();card.classList.remove('dragging');if(hoverRow)createShiftFromPool(volunteerId,hoverRow,dropTime);};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});move(e);
  }));
}
function nearestRow(y,rows){ if(!rows.length)return null;return rows.reduce((best,row)=>Math.abs(y-(row.y+row.height/2))<Math.abs(y-(best.y+best.height/2))?row:best,rows[0]); }

function statsOptions(){
  const evt=currentEvent();if(!evt)return[];const usedIds=[...new Set(evt.shifts.map(s=>s.volunteerId))],usedVols=usedIds.map(id=>state.volunteers.find(v=>v.id===id)).filter(Boolean);
  if(statsMode==='volunteer')return usedVols.map(v=>({value:v.id,label:`${v.name}（${v.center||'未填中心'}）`}));const vals=[...new Set(usedVols.map(v=>statsMode==='center'?v.center:v.group).filter(Boolean))];return vals.map(v=>({value:v,label:v}));
}
function statsVolunteerIds(){ const evt=currentEvent();if(!evt)return new Set();if(statsMode==='volunteer')return new Set([statsSelection]);return new Set(state.volunteers.filter(v=>(statsMode==='center'?v.center:v.group)===statsSelection).map(v=>v.id)); }
function statsSelectionLabel(){ if(statsMode!=='volunteer')return statsSelection;const v=state.volunteers.find(x=>x.id===statsSelection);return v?`${v.name}（${v.center||'未填中心'}）`:statsSelection; }
function baseStatsRows(){
  const evt=currentEvent(),ids=statsVolunteerIds();if(!evt)return[];return evt.shifts.filter(s=>ids.has(s.volunteerId)).map(s=>{const v=state.volunteers.find(x=>x.id===s.volunteerId),p=evt.positions.find(x=>x.id===s.positionId),g=evt.groups.find(x=>x.id===s.groupId);return {date:s.date||evt.dates[0],volunteer:v?.name||'',center:v?.center||'',memberGroup:v?.group||'',scheduleGroup:g?.name||'',position:p?.name||'',start:formatTime(s.start),end:formatTime(s.end),startMin:s.start,endMin:s.end,hours:hours(s.start,s.end)};});
}
const STATS_SORT_FIELDS={date:'服務日期',memberGroup:'所屬組別',center:'所屬中心',start:'服務時間',scheduleGroup:'編更分組',position:'崗位',volunteer:'義工姓名'};
function compareText(a,b){return String(a||'').localeCompare(String(b||''),'zh-HK',{numeric:true,sensitivity:'base'});}
function sortStatsRows(rows){
  const keys=(statsMode==='volunteer'||statsMode==='center')?statsSortKeys.filter(Boolean):['date','start','scheduleGroup','position'];
  return rows.slice().sort((a,b)=>{for(const key of keys){let c=0;if(key==='start')c=(a.startMin||0)-(b.startMin||0);else if(key==='date')c=compareText(a.date,b.date);else c=compareText(a[key],b[key]);if(c)return c;}return compareText(a.volunteer,b.volunteer)||compareText(a.position,b.position);});
}
function statsRows(){return sortStatsRows(baseStatsRows());}
function sortControlsHTML(){
  if(statsMode!=='volunteer'&&statsMode!=='center')return'';const opts=(value,allowBlank)=>`${allowBlank?'<option value="">不使用</option>':''}${Object.entries(STATS_SORT_FIELDS).map(([k,label])=>`<option value="${k}" ${value===k?'selected':''}>${label}</option>`).join('')}`;
  return `<div class="stats-sort-panel no-print"><div class="stats-sort-head"><div><strong>自訂輸出排序</strong><small>Excel 及 PDF 會依照以下優先次序排序；第一排序優先。</small></div><button class="secondary-button compact" id="resetStatsSort">重設排序</button></div><div class="stats-sort-grid">${statsSortKeys.map((key,i)=>`<label><span>第 ${i+1} 排序</span><select data-stats-sort="${i}">${opts(key,i>0)}</select></label>`).join('')}</div></div>`;
}
function chartRosterScopeOptions(evt){return `<option value="all" ${chartRosterScope==='all'?'selected':''}>全活動（全部編更分組）</option>${evt.groups.map(g=>`<option value="${g.id}" ${chartRosterScope===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}`;}
function statsPanelHTML(){
  const evt=currentEvent();if(!evt)return `<section class="stats-panel"><div class="empty-chart">請先建立活動</div></section>`;const options=statsOptions();if(!options.length)return `<section class="stats-panel"><div class="stats-head"><div><h2>▥ 專屬更表</h2><p>${esc(evt.name)}</p></div></div><div class="empty-chart">此活動尚未有已編配班次。</div></section>`;if(!options.some(o=>o.value===statsSelection))statsSelection=options[0].value;if(chartRosterScope!=='all'&&!evt.groups.some(g=>g.id===chartRosterScope))chartRosterScope='all';const rows=statsRows(),total=rows.reduce((n,r)=>n+r.hours,0),people=new Set(rows.map(r=>r.volunteer)).size;
  const modeLabel=statsMode==='volunteer'?'個人':statsMode==='center'?'所屬中心':'所屬組別',selectionLabel=statsSelectionLabel();
  return `<section class="stats-panel printable-area"><div class="stats-head"><div><h2>▥ ${modeLabel}專屬更表</h2><p>${esc(evt.name)}｜${evt.dates.length} 個活動日｜${formatTime(evt.start)}–${formatTime(evt.end)}</p></div><div class="stats-export-actions no-print"><button class="secondary-button" id="downloadStatsExcel">⇩ Excel</button><button class="primary-button" id="previewStatsPdf">👁 預覽 PDF</button></div></div><div class="stats-tabs no-print"><button class="tab-button ${statsMode==='volunteer'?'active':''}" data-stats-mode="volunteer">個人</button><button class="tab-button ${statsMode==='center'?'active':''}" data-stats-mode="center">所屬中心</button><button class="tab-button ${statsMode==='group'?'active':''}" data-stats-mode="group">所屬組別</button><select id="statsSelection">${options.map(o=>`<option value="${esc(o.value)}" ${o.value===statsSelection?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>
    ${sortControlsHTML()}
    <div class="stats-grid"><div class="metric-card"><span>服務時數</span><strong>${total.toFixed(1)}</strong><small>小時</small></div><div class="metric-card"><span>班次</span><strong>${rows.length}</strong><small>班</small></div><div class="metric-card"><span>義工</span><strong>${people}</strong><small>人</small></div><div class="metric-card"><span>選擇範圍</span><strong class="metric-text">${esc(selectionLabel)}</strong><small>${modeLabel}</small></div></div>
    <div class="roster-export-card"><div class="roster-export-head"><strong>${esc(selectionLabel)}</strong><span>${rows.length} 班｜${total.toFixed(1)} 小時</span></div><div class="table-wrap"><table class="roster-table"><thead><tr><th>日期</th><th>義工（中心）</th><th>所屬組別</th><th>編更分組</th><th>崗位</th><th>時間</th><th>時數</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.date)}</td><td><strong>${esc(r.volunteer)}（${esc(r.center||'未填中心')}）</strong></td><td>${esc(r.memberGroup||'—')}</td><td>${esc(r.scheduleGroup)}</td><td>${esc(r.position)}</td><td>${r.start}–${r.end}</td><td>${r.hours.toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="chart-roster-export no-print"><div class="chart-roster-copy"><strong>圖表式全活動更表</strong><p>以 A4 橫式時間軸顯示已編班次。可輸出全部編更分組，或只輸出指定分組；多日活動會逐日產生頁面。</p></div><div class="chart-roster-controls"><select id="chartRosterScope">${chartRosterScopeOptions(evt)}</select><button class="primary-button" id="previewChartPdf">👁 預覽橫式 PDF</button></div></div></section>`;
}
function bindStats(){
  document.querySelectorAll('[data-stats-mode]').forEach(b=>b.addEventListener('click',()=>{statsMode=b.dataset.statsMode;statsSelection='';render();}));document.getElementById('statsSelection')?.addEventListener('change',e=>{statsSelection=e.target.value;render();});
  document.querySelectorAll('[data-stats-sort]').forEach(sel=>sel.addEventListener('change',e=>{statsSortKeys[Number(e.target.dataset.statsSort)]=e.target.value;render();}));document.getElementById('resetStatsSort')?.addEventListener('click',()=>{statsSortKeys=['date','memberGroup','center','start'];render();});
  document.getElementById('chartRosterScope')?.addEventListener('change',e=>{chartRosterScope=e.target.value;});document.getElementById('downloadStatsExcel')?.addEventListener('click',downloadStatsExcel);document.getElementById('previewStatsPdf')?.addEventListener('click',previewStatsPDF);document.getElementById('previewChartPdf')?.addEventListener('click',previewChartRosterPDF);
}
function spreadsheetXml(rows,title){
  const headers=['日期','義工姓名','所屬中心','所屬組別','編更分組','崗位','開始時間','結束時間','服務時數'];const all=[headers,...rows.map(r=>[r.date,r.volunteer,r.center,r.memberGroup,r.scheduleGroup,r.position,r.start,r.end,r.hours.toFixed(2)])];
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>${xmlEsc(title)}</Title></DocumentProperties><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DDEBFF" ss:Pattern="Solid"/></Style><Style ss:ID="Hours"><NumberFormat ss:Format="0.00"/></Style></Styles><Worksheet ss:Name="更表"><Table>${all.map((row,ri)=>`<Row>${row.map((cell,ci)=>`<Cell${ri===0?' ss:StyleID="Header"':''}${ri>0&&ci===8?' ss:StyleID="Hours"':''}><Data ss:Type="${ri>0&&ci===8?'Number':'String'}">${xmlEsc(cell)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
}
function downloadStatsExcel(){ const evt=currentEvent(),rows=statsRows(),selectionLabel=statsSelectionLabel();const label=statsMode==='volunteer'?'個人':statsMode==='center'?'中心':'組別';downloadBlob(new Blob(['\ufeff'+spreadsheetXml(rows,`${evt.name}-${selectionLabel}`)],{type:'application/vnd.ms-excel;charset=utf-8'}),`${safeFileName(evt.name)}_${label}_${safeFileName(selectionLabel)}.xls`); }
function downloadFullEventExcel(){ const evt=currentEvent();const rows=evt.shifts.slice().sort((a,b)=>(a.date||evt.dates[0]).localeCompare(b.date||evt.dates[0])||a.start-b.start).map(s=>{const v=state.volunteers.find(x=>x.id===s.volunteerId),p=evt.positions.find(x=>x.id===s.positionId),g=evt.groups.find(x=>x.id===s.groupId);return {date:s.date||evt.dates[0],volunteer:v?.name||'',center:v?.center||'',memberGroup:v?.group||'',scheduleGroup:g?.name||'',position:p?.name||'',start:formatTime(s.start),end:formatTime(s.end),hours:hours(s.start,s.end)};});downloadBlob(new Blob(['\ufeff'+spreadsheetXml(rows,evt.name)],{type:'application/vnd.ms-excel;charset=utf-8'}),`${safeFileName(evt.name)}_多日全活動更表.xls`); }
function truncateText(ctx,text,maxWidth){ const s=String(text??'');if(ctx.measureText(s).width<=maxWidth)return s;let out=s;while(out.length>1&&ctx.measureText(out+'…').width>maxWidth)out=out.slice(0,-1);return out+'…'; }
function wrapCanvasText(ctx,text,maxWidth,maxLines=2){
  const chars=[...String(text??'')],lines=[];let line='';for(const ch of chars){const test=line+ch;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=ch;if(lines.length===maxLines-1)break;}else line=test;}if(lines.length<maxLines&&line)lines.push(line);const consumed=lines.join('').length;if(consumed<chars.length&&lines.length){let last=lines.at(-1);while(last.length&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);lines[lines.length-1]=last+'…';}return lines;
}
async function ensurePdfFonts(){try{if(document.fonts?.ready)await document.fonts.ready;}catch{}await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}
function pdfFont(size,weight='normal'){return `${weight} ${size}px "Microsoft JhengHei","PingFang HK","Noto Sans TC","Heiti TC",sans-serif`;}
function drawWrappedCell(ctx,text,x,y,width,lineHeight=19,maxLines=2){const lines=wrapCanvasText(ctx,text,width,maxLines);lines.forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));}
function drawFitLine(ctx,text,x,y,maxWidth,startSize,minSize=14,weight='normal'){let size=startSize;ctx.font=pdfFont(size,weight);while(size>minSize&&ctx.measureText(String(text??'')).width>maxWidth){size-=1;ctx.font=pdfFont(size,weight);}ctx.fillText(String(text??''),x,y);return size;}
function drawPdfHeader(ctx,{title,activity,subtitle,pageIndex,pageCount}){ctx.fillStyle='#17345f';drawFitLine(ctx,title,60,72,1500,42,24,'bold');drawFitLine(ctx,activity,60,116,1220,26,16,'bold');ctx.fillStyle='#66778e';drawFitLine(ctx,subtitle,60,152,1320,18,12,'normal');ctx.textAlign='right';ctx.font=pdfFont(18);ctx.fillText(`第 ${pageIndex+1} / ${pageCount} 頁`,1620,152);ctx.textAlign='left';}
function tablePdfCanvases(rows,{title,activity,subtitle}){
  const pageW=1684,pageH=1190,perPage=13,chunks=[];for(let i=0;i<Math.max(1,Math.ceil(rows.length/perPage));i++)chunks.push(rows.slice(i*perPage,(i+1)*perPage));const total=rows.reduce((n,r)=>n+r.hours,0),pages=[];
  chunks.forEach((pageRows,pageIndex)=>{const canvas=document.createElement('canvas');canvas.width=pageW;canvas.height=pageH;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,pageW,pageH);drawPdfHeader(ctx,{title,activity,subtitle,pageIndex,pageCount:chunks.length});const left=48,top=205,rowH=66;const widths=[145,380,170,205,205,205,100],headers=['日期','義工（中心）','所屬組別','編更分組','崗位','時間','時數'];const xs=[left];for(let i=0;i<widths.length;i++)xs.push(xs[i]+widths[i]);ctx.fillStyle='#eaf2fd';ctx.fillRect(left,top-34,widths.reduce((a,b)=>a+b,0),48);ctx.fillStyle='#244567';ctx.font=pdfFont(17,'bold');headers.forEach((h,i)=>ctx.fillText(h,xs[i]+8,top-4));ctx.strokeStyle='#dce5f0';ctx.lineWidth=1;pageRows.forEach((r,idx)=>{const y=top+22+idx*rowH;if(idx%2===1){ctx.fillStyle='#f8fafc';ctx.fillRect(left,y-27,xs.at(-1)-left,rowH);}ctx.fillStyle='#2f435e';ctx.font=pdfFont(16);const cells=[r.date,`${r.volunteer}（${r.center||'未填中心'}）`,r.memberGroup||'—',r.scheduleGroup||'—',r.position||'—',`${r.start}-${r.end}`,r.hours.toFixed(1)];cells.forEach((cell,i)=>drawWrappedCell(ctx,cell,xs[i]+8,y,widths[i]-16,18,2));ctx.beginPath();ctx.moveTo(left,y+34);ctx.lineTo(xs.at(-1),y+34);ctx.stroke();});ctx.fillStyle='#66778e';ctx.font=pdfFont(17);ctx.fillText(`共 ${rows.length} 班｜總服務時數 ${total.toFixed(1)} 小時`,60,1130);pages.push(canvas);});return pages;
}
function lanesForExport(shifts){const sorted=shifts.slice().sort((a,b)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id)),ends=[],map={};for(const s of sorted){let lane=ends.findIndex(v=>v<=s.start);if(lane<0){lane=ends.length;ends.push(s.end);}else ends[lane]=s.end;map[s.id]=lane;}return {map,count:Math.max(1,ends.length)};}
function chartRowsForExport(evt,date,scope){const groups=scope==='all'?evt.groups:evt.groups.filter(g=>g.id===scope),rows=[];for(const g of groups){rows.push({type:'group',group:g,height:34});for(const p of evt.positions.filter(p=>p.groupId===g.id)){const shifts=evt.shifts.filter(s=>(s.date||evt.dates[0])===date&&s.positionId===p.id),lanes=lanesForExport(shifts),height=Math.max(56,lanes.count*42+16);rows.push({type:'position',group:g,position:p,shifts,lanes,height});}}return rows;}
function splitChartRows(rows,maxHeight){const pages=[];let current=[],used=0,lastGroup=null;for(const row of rows){if(row.type==='group'){if(current.length&&used+row.height>maxHeight){pages.push(current);current=[];used=0;}current.push(row);used+=row.height;lastGroup=row.group;continue;}if(current.length&&used+row.height>maxHeight){pages.push(current);current=[];used=0;if(lastGroup){current.push({type:'group',group:lastGroup,height:34,continued:true});used+=34;}}current.push(row);used+=row.height;lastGroup=row.group;}if(current.length)pages.push(current);return pages.length?pages:[[]];}
function getLunchForExport(evt,date,volunteerId){const lunch=evt.lunchByDate?.[date]||evt.lunch;if(!lunch?.enabled)return null;if(lunch.mode==='staggered')return lunch.individual?.[volunteerId]||null;return {start:lunch.start,end:lunch.end};}
function chartPdfCanvases(evt,scope){
  const W=1684,H=1190,left=300,right=45,top=232,bottom=62,timelineW=W-left-right,usable=H-top-bottom,allPages=[];for(const date of evt.dates){const rows=chartRowsForExport(evt,date,scope),chunks=splitChartRows(rows,usable);chunks.forEach((chunk,chunkIndex)=>allPages.push({date,chunk,chunkIndex,chunkCount:chunks.length}));}const scopeLabel=scope==='all'?'全活動':(evt.groups.find(g=>g.id===scope)?.name||'指定分組');
  return allPages.map((page,pageIndex)=>{const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);drawPdfHeader(ctx,{title:`圖表式更表 - ${scopeLabel}`,activity:evt.name,subtitle:`${dateLabel(page.date)}　${formatTime(evt.start)}-${formatTime(evt.end)}${page.chunkCount>1?`　｜　本日第 ${page.chunkIndex+1}/${page.chunkCount} 頁`:''}`,pageIndex,pageCount:allPages.length});const start=evt.start,end=evt.end,duration=end-start||1,toX=t=>left+(clamp(t,start,end)-start)/duration*timelineW;ctx.font=pdfFont(14,'bold');ctx.fillStyle='#5f7188';const hourStart=Math.ceil(start/60)*60;for(let t=hourStart;t<=end;t+=60){const x=toX(t);ctx.strokeStyle='#e4eaf2';ctx.beginPath();ctx.moveTo(x,190);ctx.lineTo(x,H-bottom);ctx.stroke();ctx.fillText(formatTime(t),x+3,210);}ctx.strokeStyle='#ccd7e5';ctx.beginPath();ctx.moveTo(left,190);ctx.lineTo(left,H-bottom);ctx.stroke();let y=top;for(const row of page.chunk){if(row.type==='group'){ctx.fillStyle='#edf4fb';ctx.fillRect(48,y,W-93,row.height);ctx.fillStyle='#234667';ctx.font=pdfFont(17,'bold');ctx.fillText(`${row.continued?'續｜':''}${row.group.name}`,62,y+23);y+=row.height;continue;}const {position,shifts,lanes}=row;ctx.fillStyle='#fbfcfe';ctx.fillRect(48,y,left-48,row.height);ctx.strokeStyle='#e2e8f0';ctx.strokeRect(48,y,W-93,row.height);ctx.fillStyle='#314c6d';ctx.font=pdfFont(15,'bold');drawWrappedCell(ctx,position.name,62,y+22,170,17,2);ctx.fillStyle='#7a899c';ctx.font=pdfFont(12);ctx.fillText(`需求 ${position.required||0} 人`,220,y+22);for(const s of shifts){const lane=lanes.map[s.id]||0,x1=toX(s.start),x2=toX(s.end),h=34,sy=y+8+lane*42,w=Math.max(12,x2-x1);const v=state.volunteers.find(v=>v.id===s.volunteerId);const lunch=getLunchForExport(evt,page.date,s.volunteerId);ctx.fillStyle=position.color||row.group.color||'#2f80ed';ctx.globalAlpha=.9;ctx.fillRect(x1,sy,w,h);ctx.globalAlpha=1;if(lunch&&s.start<lunch.end&&s.end>lunch.start){const lx1=toX(Math.max(s.start,lunch.start)),lx2=toX(Math.min(s.end,lunch.end));ctx.fillStyle='#e05263';ctx.fillRect(lx1,sy,Math.max(2,lx2-lx1),h);}ctx.save();ctx.beginPath();ctx.rect(x1+4,sy+2,Math.max(1,w-8),h-4);ctx.clip();ctx.fillStyle='#fff';ctx.font=pdfFont(12,'bold');ctx.fillText(v?.name||'未找到義工',x1+7,sy+14);ctx.font=pdfFont(10);ctx.fillText(`${formatTime(s.start)}-${formatTime(s.end)}`,x1+7,sy+28);ctx.restore();}y+=row.height;}ctx.fillStyle='#7b899b';ctx.font=pdfFont(13);ctx.fillText('紅色區段＝午膳時間｜班次位置按實際服務時間比例顯示',60,H-25);return canvas;});
}
function canvasesToJpegs(canvases){return canvases.map(c=>c.toDataURL('image/jpeg',0.97));}
function openPdfPreview({title,description,canvases,filename}){const pages=canvasesToJpegs(canvases);const modal=showModal('PDF 預覽',`<div class="pdf-preview-summary"><div><strong>${esc(title)}</strong><small>${esc(description)}</small></div><span>${pages.length} 頁 · A4 橫式</span></div><div class="pdf-preview-pages">${pages.map((src,i)=>`<figure><figcaption>第 ${i+1} 頁</figcaption><img src="${src}" alt="PDF 第 ${i+1} 頁預覽"></figure>`).join('')}</div><div class="modal-actions pdf-preview-actions"><button class="secondary-button" id="cancelPdfPreview">取消</button><button class="primary-button" id="confirmPdfDownload">⇩ 下載 PDF</button></div>`,true);modal.querySelector('.modal')?.classList.add('pdf-preview-modal');modal.querySelector('#cancelPdfPreview').onclick=()=>modal.remove();modal.querySelector('#confirmPdfDownload').onclick=()=>{downloadBlob(pdfFromJpegs(pages,canvases[0]?.width||1684,canvases[0]?.height||1190),filename);modal.remove();toast('PDF 已下載');};return modal;}
async function previewStatsPDF(){
  const evt=currentEvent(),rows=statsRows(),modeLabel=statsMode==='volunteer'?'個人':statsMode==='center'?'所屬中心':'所屬組別',selectionLabel=statsSelectionLabel();await ensurePdfFonts();const sortText=(statsMode==='volunteer'||statsMode==='center')?statsSortKeys.filter(Boolean).map(k=>STATS_SORT_FIELDS[k]).join(' → '):'服務日期 → 服務時間';const canvases=tablePdfCanvases(rows,{title:`${modeLabel}專屬更表`,activity:evt.name,subtitle:`${selectionLabel}　｜　排序：${sortText}`});openPdfPreview({title:`${modeLabel}專屬更表｜${selectionLabel}`,description:`排序：${sortText}。預覽與下載 PDF 使用同一份固定版面圖像。`,canvases,filename:`${safeFileName(evt.name)}_${modeLabel}_${safeFileName(selectionLabel)}.pdf`});
}
async function previewChartRosterPDF(){const evt=currentEvent();if(!evt)return;chartRosterScope=document.getElementById('chartRosterScope')?.value||chartRosterScope;await ensurePdfFonts();const label=chartRosterScope==='all'?'全活動':(evt.groups.find(g=>g.id===chartRosterScope)?.name||'指定分組'),canvases=chartPdfCanvases(evt,chartRosterScope);openPdfPreview({title:`圖表式更表｜${label}`,description:`${evt.dates.length} 個活動日，以橫式時間軸輸出已編班次；紅色區段代表午膳時間。`,canvases,filename:`${safeFileName(evt.name)}_圖表式更表_${safeFileName(label)}.pdf`});}
function dataUrlBytes(url){const b64=url.split(',')[1],bin=atob(b64),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
function pdfFromJpegs(dataUrls,imgW,imgH){
  const encoder=new TextEncoder(),chunks=[],offsets=[0];let offset=0;const pushBytes=b=>{chunks.push(b);offset+=b.length;},pushText=s=>pushBytes(encoder.encode(s));pushText('%PDF-1.4\n%PDFGEN\n');const n=dataUrls.length,pageIds=[],imageIds=[],contentIds=[];for(let i=0;i<n;i++){pageIds.push(3+i*3);imageIds.push(4+i*3);contentIds.push(5+i*3);}const writeObj=(num,writer)=>{offsets[num]=offset;pushText(`${num} 0 obj\n`);writer();pushText('\nendobj\n');};writeObj(1,()=>pushText('<< /Type /Catalog /Pages 2 0 R >>'));writeObj(2,()=>pushText(`<< /Type /Pages /Count ${n} /Kids [${pageIds.map(x=>`${x} 0 R`).join(' ')}] >>`));for(let i=0;i<n;i++){const jpeg=dataUrlBytes(dataUrls[i]);writeObj(pageIds[i],()=>pushText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im${i} ${imageIds[i]} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`));writeObj(imageIds[i],()=>{pushText(`<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);pushBytes(jpeg);pushText('\nendstream');});const stream=`q\n842 0 0 595 0 0 cm\n/Im${i} Do\nQ\n`;writeObj(contentIds[i],()=>pushText(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`));}const xref=offset,maxObj=2+n*3;pushText(`xref\n0 ${maxObj+1}\n0000000000 65535 f \n`);for(let i=1;i<=maxObj;i++)pushText(`${String(offsets[i]||0).padStart(10,'0')} 00000 n \n`);pushText(`trailer\n<< /Size ${maxObj+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(chunks,{type:'application/pdf'});
}

function volunteerFilteredList(){
  const q=volunteerSearch.trim().toLowerCase();return state.volunteers.filter(v=>{
    const text=`${v.name} ${v.center} ${v.group} ${v.phone} ${v.emergencyContact} ${v.emergencyPhone}`.toLowerCase();
    return (!q||text.includes(q))&&(volunteerCenterFilter==='all'||v.center===volunteerCenterFilter)&&(volunteerGroupFilter==='all'||v.group===volunteerGroupFilter);
  });
}
function volunteerRowsHTML(list){return list.map(v=>`<tr><td class="select-cell"><input type="checkbox" data-select-volunteer="${v.id}" ${selectedVolunteerIds.has(v.id)?'checked':''}></td><td><strong>${esc(v.name)}</strong></td><td>${esc(v.center||'—')}</td><td>${esc(v.group||'—')}</td><td>${esc(v.phone||'—')}</td><td><strong>${esc(v.emergencyContact||'—')}</strong><small class="emergency-detail">${esc(v.emergencyRelation||'—')}｜${esc(v.emergencyPhone||'—')}</small></td><td class="table-actions"><button data-edit-volunteer="${v.id}">編輯</button><button class="danger-text" data-delete-volunteer="${v.id}">刪除</button></td></tr>`).join('');}
function volunteerTableHTML(list){return `<div class="table-wrap volunteer-table-wrap"><table class="volunteer-table"><thead><tr><th class="select-cell"><input type="checkbox" data-select-all-visible ${list.length&&list.every(v=>selectedVolunteerIds.has(v.id))?'checked':''}></th><th>姓名</th><th>所屬中心</th><th>所屬組別</th><th>電話</th><th>緊急聯絡</th><th></th></tr></thead><tbody>${list.length?volunteerRowsHTML(list):`<tr><td colspan="7"><div class="empty-table">沒有符合篩選條件的義工</div></td></tr>`}</tbody></table></div>`;}
function volunteerGroupedHTML(list){
  const key=volunteerDisplayMode==='center'?'center':'group',label=key==='center'?'中心':'組別',map=new Map();for(const v of list){const name=v[key]||`未填${label}`;if(!map.has(name))map.set(name,[]);map.get(name).push(v);}
  return `<div class="volunteer-grouped-view">${[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'zh-HK')).map(([name,items])=>`<section class="volunteer-group-section"><div class="volunteer-group-head"><div><strong>${esc(name)}</strong><small>${items.length} 位義工</small></div><button class="secondary-button compact" data-select-section="${esc(name)}" data-section-key="${key}">選取此${label}</button></div>${volunteerTableHTML(items)}</section>`).join('')||`<div class="empty-table panel">沒有符合篩選條件的義工</div>`}</div>`;
}
function volunteerPageHTML(){
  const list=volunteerFilteredList(),centers=[...new Set(state.volunteers.map(v=>v.center).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-HK')),groups=[...new Set(state.volunteers.map(v=>v.group).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-HK'));
  return `<div class="content-page volunteer-management-page"><div class="volunteer-summary-strip"><div><span>義工總數</span><strong>${state.volunteers.length}</strong></div><div><span>目前顯示</span><strong>${list.length}</strong></div><div><span>已選取</span><strong>${selectedVolunteerIds.size}</strong></div><div><span>中心</span><strong>${centers.length}</strong></div><div><span>組別</span><strong>${groups.length}</strong></div></div>
    <div class="volunteer-control-panel"><div class="volunteer-search-row"><div class="search-box">⌕<input id="volSearch" value="${esc(volunteerSearch)}" placeholder="搜尋姓名／中心／組別／電話"></div><button class="secondary-button" id="exportVolunteers">⇩ 輸出目前名單</button><button class="secondary-button" id="pageImport">▤ Excel 匯入</button><button class="primary-button" id="addVolunteer">＋ 新增義工</button></div>
    <div class="volunteer-filter-row"><label>中心<select id="volCenterFilter"><option value="all">全部中心</option>${centers.map(x=>`<option value="${esc(x)}" ${volunteerCenterFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>組別<select id="volGroupFilter"><option value="all">全部組別</option>${groups.map(x=>`<option value="${esc(x)}" ${volunteerGroupFilter===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label><label>顯示<select id="volDisplayMode"><option value="list" ${volunteerDisplayMode==='list'?'selected':''}>一般列表</option><option value="center" ${volunteerDisplayMode==='center'?'selected':''}>按中心分組</option><option value="group" ${volunteerDisplayMode==='group'?'selected':''}>按組別分組</option></select></label><div class="filter-spacer"></div><button class="danger-button compact" id="batchDeleteVolunteers" ${selectedVolunteerIds.size?'':'disabled'}>⌫ 批量刪除 ${selectedVolunteerIds.size?`(${selectedVolunteerIds.size})`:''}</button></div></div>
    <div class="hint-box volunteer-page-hint"><strong>服務時段改於編更時設定：</strong>義工主檔只保存個人及緊急聯絡資料。進入活動更表後，拖放或新增班次時再為該日選擇固定更期或自訂服務時間。</div>
    ${volunteerDisplayMode==='list'?volunteerTableHTML(list):volunteerGroupedHTML(list)}</div>`;
}
function removeVolunteers(ids){
  const set=new Set(ids);if(!set.size)return;state.volunteers=state.volunteers.filter(v=>!set.has(v.id));state.events.forEach(e=>{e.shifts=e.shifts.filter(s=>!set.has(s.volunteerId));Object.values(e.lunchByDate||{}).forEach(l=>{for(const vid of set)delete l.individual?.[vid];});});for(const vid of set)selectedVolunteerIds.delete(vid);saveState();render();
}
function bindVolunteerPage(){
  document.getElementById('volSearch')?.addEventListener('input',e=>{volunteerSearch=e.target.value;render();document.getElementById('volSearch')?.focus();});
  document.getElementById('volCenterFilter')?.addEventListener('change',e=>{volunteerCenterFilter=e.target.value;render();});document.getElementById('volGroupFilter')?.addEventListener('change',e=>{volunteerGroupFilter=e.target.value;render();});document.getElementById('volDisplayMode')?.addEventListener('change',e=>{volunteerDisplayMode=e.target.value;render();});
  document.getElementById('pageImport')?.addEventListener('click',openImportModal);document.getElementById('addVolunteer')?.addEventListener('click',()=>openVolunteerModal());document.getElementById('exportVolunteers')?.addEventListener('click',downloadVolunteerListExcel);
  document.querySelectorAll('[data-select-volunteer]').forEach(cb=>cb.addEventListener('change',()=>{cb.checked?selectedVolunteerIds.add(cb.dataset.selectVolunteer):selectedVolunteerIds.delete(cb.dataset.selectVolunteer);render();}));
  document.querySelectorAll('[data-select-all-visible]').forEach(cb=>cb.addEventListener('change',()=>{const scope=cb.closest('.volunteer-group-section');const ids=scope?[...scope.querySelectorAll('[data-select-volunteer]')].map(x=>x.dataset.selectVolunteer):volunteerFilteredList().map(v=>v.id);ids.forEach(vid=>cb.checked?selectedVolunteerIds.add(vid):selectedVolunteerIds.delete(vid));render();}));
  document.querySelectorAll('[data-select-section]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.sectionKey,name=b.dataset.selectSection;state.volunteers.filter(v=>(v[key]||`未填${key==='center'?'中心':'組別'}`)===name).forEach(v=>selectedVolunteerIds.add(v.id));render();}));
  document.getElementById('batchDeleteVolunteers')?.addEventListener('click',()=>{const n=selectedVolunteerIds.size;if(n&&confirm(`確定刪除已選取的 ${n} 位義工？其所有活動班次及個別午膳資料亦會刪除。`)){removeVolunteers([...selectedVolunteerIds]);toast(`已刪除 ${n} 位義工`);}});
  document.querySelectorAll('[data-edit-volunteer]').forEach(b=>b.addEventListener('click',()=>openVolunteerModal(state.volunteers.find(v=>v.id===b.dataset.editVolunteer))));document.querySelectorAll('[data-delete-volunteer]').forEach(b=>b.addEventListener('click',()=>{const vid=b.dataset.deleteVolunteer;if(confirm('確定刪除此義工？其所有活動內的相關班次亦會刪除。')){removeVolunteers([vid]);toast('義工已刪除');}}));
}
function volunteerSpreadsheetXml(list,title='義工名單'){
  const headers=['姓名','所屬中心','所屬組別','電話','緊急聯絡人','緊急聯絡人關係','緊急聯絡人電話'];
  const rows=[headers,...list.map(v=>[v.name,v.center,v.group,v.phone,v.emergencyContact,v.emergencyRelation,v.emergencyPhone])];
  return `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>${xmlEsc(title)}</Title></DocumentProperties><Styles><Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#DDEBFF" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="義工名單"><Table>${rows.map((row,ri)=>`<Row>${row.map(cell=>`<Cell${ri===0?' ss:StyleID="Header"':''}><Data ss:Type="String">${xmlEsc(cell)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
}
function downloadVolunteerListExcel(){const list=volunteerFilteredList();downloadBlob(new Blob(['\ufeff'+volunteerSpreadsheetXml(list,'義工名單')],{type:'application/vnd.ms-excel;charset=utf-8'}),`義工名單_${new Date().toISOString().slice(0,10)}.xls`);toast(`已輸出 ${list.length} 位義工`);}

function settingsHTML(){ return `<div class="content-page settings-stack"><section class="panel cloud-settings"><div class="settings-title-row"><div><h2>☁ Supabase 雲端儲存</h2><p>目前所有活動、義工、緊急聯絡資料及更表均由管理員帳戶透過 RLS 保護後儲存於 Supabase。</p></div><span class="cloud-status ${cloudStatus}">${cloudStatusLabel()}</span></div><div class="mini-summary"><span>管理員：${esc(currentAdmin?.display_name||'管理員')}</span><span>雲端版本：${cloudRevision}</span><span>活動：${state.events.length} 個</span><span>義工：${state.volunteers.length} 人</span></div><div class="settings-actions"><button class="primary-button" id="syncCloudNow">立即同步</button><button class="secondary-button" id="reloadCloud">從雲端重新載入</button></div></section><section class="panel"><h2>活動資料架構</h2><p>每個活動可包含多個日期；分組、崗位及義工名單共用，但每個活動日期可獨立設定固定／浮動／混合編更模式及自己的固定更期。班次及午膳亦按日期獨立儲存。</p></section><section class="panel danger-panel"><h2>重設雲端示範資料</h2><p>此操作會將目前 Supabase 雲端工作區重設為初始示範資料，所有管理員裝置都會見到更新後的內容。</p><button class="danger-button" id="resetData">重設全部資料</button></section></div>`; }
function bindSettings(){
  document.getElementById('syncCloudNow')?.addEventListener('click',async()=>{saveState();await flushCloudSave(true);});
  document.getElementById('reloadCloud')?.addEventListener('click',()=>{if(confirm('從雲端重新載入會放棄尚未同步的本機變更，確定繼續？'))reloadCloudWorkspace();});
  document.getElementById('resetData')?.addEventListener('click',()=>{if(confirm('確定重設全部雲端資料？此操作會影響所有管理員裝置，且不可還原。')){state=normalizeState(clone(seed));selectedShiftId=currentEvent()?.shifts?.[0]?.id||'';activeGroupFilter='all';saveState();recordAudit('reset','workspace',WORKSPACE_ID,{});view='events';render();toast('已重設資料，正在同步至雲端');}});
}

function showModal(title,body,wide=false){ document.querySelector('.modal-backdrop')?.remove();const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-header"><h2>${esc(title)}</h2><button class="icon-button modal-close">×</button></div><div class="modal-body">${body}</div></div>`;document.body.appendChild(wrap);wrap.addEventListener('mousedown',e=>{if(e.target===wrap)wrap.remove();});wrap.querySelector('.modal-close').addEventListener('click',()=>wrap.remove());return wrap; }
function openEventModal(evt){
  const today=new Date().toISOString().slice(0,10),draft=evt?clone(evt):{id:'',name:'',date:today,dates:[today],activeDate:today,start:540,end:1020,scheduleConfigByDate:{[today]:{scheduleMode:'flexible',shiftTemplates:[]}},groups:[{id:id('g'),name:'A組',color:COLORS[0]}],positions:[],shifts:[],lunchByDate:{}};
  draft.dates=[...new Set((draft.dates?.length?draft.dates:[draft.date]).filter(Boolean))].sort();draft.scheduleConfigByDate=draft.scheduleConfigByDate||{};
  const fallbackCfg=normalizeScheduleConfig({scheduleMode:draft.scheduleMode,shiftTemplates:draft.shiftTemplates},draft.start,draft.end);
  for(const d of draft.dates)draft.scheduleConfigByDate[d]=normalizeScheduleConfig(draft.scheduleConfigByDate[d]||clone(fallbackCfg),draft.start,draft.end,fallbackCfg.scheduleMode,fallbackCfg.shiftTemplates);
  let configDate=draft.dates.includes(draft.activeDate)?draft.activeDate:draft.dates[0];
  const modal=showModal(evt?'修改活動':'新增活動',`<div class="event-form"><div class="form-grid"><label class="full-field">活動名稱<input id="eName" value="${esc(draft.name)}" placeholder="例如：接得住的社區"></label><div class="full-field event-date-builder"><div class="event-date-builder-head"><span><strong>活動日期（支援多日）</strong><small>分組、崗位及義工名單共用；每個日期的編更模式及更期可以不同。</small></span><div><input id="eDateAdd" type="date" value="${draft.dates.at(-1)||today}"><button type="button" class="secondary-button compact" id="addEventDate">＋ 加入日期</button></div></div><div id="eventDateList"></div></div><label>每日活動時間<div class="inline-time-pair"><input id="eStart" type="time" step="900" value="${formatTime(draft.start)}"><span>至</span><input id="eEnd" type="time" step="900" value="${formatTime(draft.end)}"></div></label></div>
    <div class="schedule-mode-builder"><div class="structure-builder-head"><div><strong>各活動日編更模式及更期</strong><small>先選日期，再設定該日為固定時段、浮動時段或混合模式。</small></div></div><div id="dayScheduleEditor"></div></div>
    <div class="structure-builder-head"><div><strong>分組及崗位</strong><small>整個多日活動共用：先新增分組，再在每個分組下新增崗位及所需人數。</small></div><button class="secondary-button" id="builderAddGroup">＋ 新增分組</button></div><div id="structureBuilder"></div><div class="hint-box">義工主檔不再保存可服務時段。進入更表後，每次編配義工時按該日期的編更模式選擇固定更期或自訂時間。</div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveEvent">${evt?'儲存活動設定':'建立活動並編更'}</button></div></div>`,true);
  const ensureCfg=d=>{if(!draft.scheduleConfigByDate[d]){const source=draft.scheduleConfigByDate[configDate]||fallbackCfg;draft.scheduleConfigByDate[d]={scheduleMode:source.scheduleMode,shiftTemplates:(source.shiftTemplates||[]).map(t=>({...t,id:id('period')}))};}return draft.scheduleConfigByDate[d];};
  const renderDates=()=>{const box=modal.querySelector('#eventDateList');box.innerHTML=draft.dates.length?draft.dates.map((d,i)=>{const c=ensureCfg(d);return `<div class="event-date-row ${d===configDate?'selected-config-date':''}"><button type="button" class="date-config-select" data-config-date="${d}"><b>Day ${i+1}</b><span>${dateLabel(d)}</span><small>${scheduleModeLabel(c.scheduleMode)}${c.shiftTemplates.length?` · ${c.shiftTemplates.length} 更期`:''}</small></button><button type="button" class="danger-text" data-remove-event-date="${d}">×</button></div>`;}).join(''):'<div class="builder-empty">未有活動日期，請加入至少一日。</div>';modal.querySelectorAll('[data-config-date]').forEach(b=>b.onclick=()=>{configDate=b.dataset.configDate;renderDates();renderDaySchedule();});modal.querySelectorAll('[data-remove-event-date]').forEach(b=>b.onclick=()=>{const d=b.dataset.removeEventDate;draft.dates=draft.dates.filter(x=>x!==d);delete draft.scheduleConfigByDate[d];if(configDate===d)configDate=draft.dates[0]||'';renderDates();renderDaySchedule();});};
  const renderDaySchedule=()=>{const box=modal.querySelector('#dayScheduleEditor');if(!configDate||!draft.dates.length){box.innerHTML='<div class="builder-empty">請先加入活動日期。</div>';return;}const cfg=ensureCfg(configDate);box.innerHTML=`<div class="day-config-heading"><div><strong>${dateLabel(configDate)}</strong><small>此設定只影響這一日</small></div><span class="day-mode-pill">${scheduleModeLabel(cfg.scheduleMode)}</span></div><div class="schedule-mode-grid"><label class="schedule-mode-card"><input type="radio" name="dayScheduleMode" value="fixed" ${cfg.scheduleMode==='fixed'?'checked':''}><span><b>固定時段</b><small>所有班次跟預設更期</small></span></label><label class="schedule-mode-card"><input type="radio" name="dayScheduleMode" value="flexible" ${cfg.scheduleMode==='flexible'?'checked':''}><span><b>浮動時段</b><small>編更時自行選時間</small></span></label><label class="schedule-mode-card"><input type="radio" name="dayScheduleMode" value="mixed" ${cfg.scheduleMode==='mixed'?'checked':''}><span><b>混合模式</b><small>固定更期＋自由時間</small></span></label></div><div id="dayShiftTemplates"></div>`;box.querySelectorAll('input[name="dayScheduleMode"]').forEach(r=>r.onchange=()=>{cfg.scheduleMode=r.value;renderDates();renderDaySchedule();});renderDayTemplates();};
  const renderDayTemplates=()=>{const cfg=ensureCfg(configDate),box=modal.querySelector('#dayShiftTemplates');if(!box)return;if(cfg.scheduleMode==='flexible'){box.innerHTML='<div class="mode-note">此日為浮動時段，毋須預設更期；編配義工時直接選擇開始及結束時間。</div>';return;}box.innerHTML=`<div class="shift-template-head"><span><strong>${dateLabel(configDate)} 固定更期</strong><small>例如「上午更 09:00–13:00」。只會套用於這一日。</small></span><button type="button" class="secondary-button compact" id="addDayShiftTemplate">＋ 新增更期</button></div><div class="shift-template-list">${cfg.shiftTemplates.map(t=>`<div class="shift-template-row"><input data-template-name="${t.id}" value="${esc(t.name)}" placeholder="例如：上午更"><input data-template-start="${t.id}" type="time" step="900" value="${formatTime(t.start)}"><span>至</span><input data-template-end="${t.id}" type="time" step="900" value="${formatTime(t.end)}"><button type="button" class="danger-text" data-remove-template="${t.id}">刪除</button></div>`).join('')||'<div class="builder-empty">未有固定更期，請新增至少一個更期。</div>'}</div>`;box.querySelector('#addDayShiftTemplate')?.addEventListener('click',()=>{const n=cfg.shiftTemplates.length,currentStart=inputTime(modal.querySelector('#eStart').value),currentEnd=inputTime(modal.querySelector('#eEnd').value);cfg.shiftTemplates.push({id:id('period'),name:n?`更期 ${n+1}`:'上午更',start:currentStart,end:Math.min(currentStart+240,currentEnd)});renderDayTemplates();renderDates();});box.querySelectorAll('[data-template-name]').forEach(i=>i.addEventListener('input',()=>{const t=cfg.shiftTemplates.find(x=>x.id===i.dataset.templateName);if(t)t.name=i.value;renderDates();}));box.querySelectorAll('[data-template-start]').forEach(i=>i.addEventListener('change',()=>{const t=cfg.shiftTemplates.find(x=>x.id===i.dataset.templateStart);if(t)t.start=inputTime(i.value);}));box.querySelectorAll('[data-template-end]').forEach(i=>i.addEventListener('change',()=>{const t=cfg.shiftTemplates.find(x=>x.id===i.dataset.templateEnd);if(t)t.end=inputTime(i.value);}));box.querySelectorAll('[data-remove-template]').forEach(b=>b.addEventListener('click',()=>{cfg.shiftTemplates=cfg.shiftTemplates.filter(t=>t.id!==b.dataset.removeTemplate);renderDayTemplates();renderDates();}));};
  const renderBuilder=()=>{const box=modal.querySelector('#structureBuilder');box.innerHTML=draft.groups.map(g=>`<section class="builder-group" data-builder-group="${g.id}"><div class="builder-group-head"><span class="group-dot large" style="background:${g.color}"></span><input data-group-name="${g.id}" value="${esc(g.name)}" placeholder="分組名稱"><input data-group-color="${g.id}" type="color" value="${g.color}"><button class="danger-ghost compact-button" data-remove-builder-group="${g.id}">刪除分組</button></div><div class="builder-position-list">${draft.positions.filter(p=>p.groupId===g.id).map(p=>`<div class="builder-position-row"><input data-position-name="${p.id}" value="${esc(p.name)}" placeholder="崗位名稱"><label>所需 <input data-position-required="${p.id}" type="number" min="1" max="99" value="${p.required}"> 人</label><button class="danger-text" data-remove-builder-position="${p.id}">刪除</button></div>`).join('')}<button class="builder-add-position" data-builder-add-position="${g.id}">＋ 新增崗位</button></div></section>`).join('')||'<div class="builder-empty">未有分組，請先新增分組。</div>';bindBuilder();};
  const bindBuilder=()=>{modal.querySelectorAll('[data-group-name]').forEach(i=>i.addEventListener('input',()=>{const g=draft.groups.find(x=>x.id===i.dataset.groupName);if(g)g.name=i.value;}));modal.querySelectorAll('[data-group-color]').forEach(i=>i.addEventListener('input',()=>{const g=draft.groups.find(x=>x.id===i.dataset.groupColor);if(g){g.color=i.value;draft.positions.filter(p=>p.groupId===g.id).forEach(p=>p.color=i.value);}}));modal.querySelectorAll('[data-position-name]').forEach(i=>i.addEventListener('input',()=>{const p=draft.positions.find(x=>x.id===i.dataset.positionName);if(p)p.name=i.value;}));modal.querySelectorAll('[data-position-required]').forEach(i=>i.addEventListener('input',()=>{const p=draft.positions.find(x=>x.id===i.dataset.positionRequired);if(p)p.required=Math.max(1,Number(i.value)||1);}));modal.querySelectorAll('[data-builder-add-position]').forEach(b=>b.addEventListener('click',()=>{const g=draft.groups.find(x=>x.id===b.dataset.builderAddPosition);draft.positions.push({id:id('p'),name:'新崗位',required:1,groupId:g.id,color:g.color});renderBuilder();}));modal.querySelectorAll('[data-remove-builder-position]').forEach(b=>b.addEventListener('click',()=>{draft.positions=draft.positions.filter(p=>p.id!==b.dataset.removeBuilderPosition);renderBuilder();}));modal.querySelectorAll('[data-remove-builder-group]').forEach(b=>b.addEventListener('click',()=>{const gid=b.dataset.removeBuilderGroup;draft.groups=draft.groups.filter(g=>g.id!==gid);draft.positions=draft.positions.filter(p=>p.groupId!==gid);renderBuilder();}));};
  modal.querySelector('#addEventDate').onclick=()=>{const d=modal.querySelector('#eDateAdd').value;if(!d)return alert('請先選擇日期。');if(!draft.dates.includes(d)){draft.dates.push(d);draft.dates.sort();ensureCfg(d);}configDate=d;renderDates();renderDaySchedule();};
  modal.querySelector('#builderAddGroup').onclick=()=>{draft.groups.push({id:id('g'),name:`${String.fromCharCode(65+draft.groups.length)}組`,color:COLORS[draft.groups.length%COLORS.length]});renderBuilder();};renderDates();renderDaySchedule();renderBuilder();modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#saveEvent').onclick=()=>{const name=modal.querySelector('#eName').value.trim(),start=inputTime(modal.querySelector('#eStart').value),end=inputTime(modal.querySelector('#eEnd').value);if(!name)return alert('請輸入活動名稱。');if(!draft.dates.length)return alert('請至少加入一個活動日期。');if(end<=start)return alert('活動結束時間必須遲於開始時間。');if(!draft.groups.length)return alert('請至少新增一個分組。');if(!draft.positions.length)return alert('請至少在分組下新增一個崗位。');if(draft.groups.some(g=>!g.name.trim()))return alert('請填寫所有分組名稱。');if(draft.positions.some(p=>!p.name.trim()))return alert('請填寫所有崗位名稱。');
    for(const d of draft.dates){const cfg=ensureCfg(d);if(cfg.scheduleMode!=='flexible'&&!cfg.shiftTemplates.length)return alert(`${dateLabel(d)} 為固定／混合模式，請至少新增一個固定更期。`);if(cfg.shiftTemplates.some(t=>!String(t.name).trim()||t.end<=t.start||t.start<start||t.end>end))return alert(`請檢查 ${dateLabel(d)} 的固定更期名稱及時間；所有更期必須位於活動時間內。`);cfg.shiftTemplates=cfg.shiftTemplates.map(t=>({...t,name:String(t.name).trim(),start:clamp(t.start,start,end-15),end:clamp(t.end,start+15,end)}));}
    draft.name=name;draft.dates=[...new Set(draft.dates)].sort();draft.date=draft.dates[0];draft.activeDate=draft.dates.includes(draft.activeDate)?draft.activeDate:draft.dates[0];draft.start=start;draft.end=end;const validDates=new Set(draft.dates);Object.keys(draft.scheduleConfigByDate).forEach(d=>{if(!validDates.has(d))delete draft.scheduleConfigByDate[d];});const firstCfg=ensureCfg(draft.dates[0]);draft.scheduleMode=firstCfg.scheduleMode;draft.shiftTemplates=clone(firstCfg.shiftTemplates);draft.groups.forEach((g,i)=>{g.name=g.name.trim();g.color=g.color||COLORS[i%COLORS.length];});draft.positions.forEach(p=>{p.name=p.name.trim();p.required=Math.max(1,Number(p.required)||1);p.color=draft.groups.find(g=>g.id===p.groupId)?.color||p.color||COLORS[0];});const validP=new Set(draft.positions.map(p=>p.id)),validG=new Set(draft.groups.map(g=>g.id));draft.shifts=(draft.shifts||[]).filter(s=>validP.has(s.positionId)&&validG.has(s.groupId)&&validDates.has(s.date||draft.date)).map(s=>{const date=s.date||draft.date,cfg=ensureCfg(date),validTemplates=new Set(cfg.shiftTemplates.map(t=>t.id));return {...s,date,start:clamp(s.start,start,end-15),end:clamp(s.end,start+15,end),templateId:validTemplates.has(s.templateId)?s.templateId:''};}).filter(s=>s.end>s.start);draft.lunchByDate=draft.lunchByDate||{};const fallbackLunch=draft.lunch||{enabled:true,mode:'uniform',start:720,end:780,individual:{}};for(const d of draft.dates){const prev=draft.lunchByDate[d]||clone(fallbackLunch);draft.lunchByDate[d]={...prev,enabled:prev.enabled!==false,mode:prev.mode||'uniform',start:clamp(prev.start??720,start,end-15),end:clamp(prev.end??780,start+15,end),individual:prev.individual||{}};}Object.keys(draft.lunchByDate).forEach(d=>{if(!validDates.has(d))delete draft.lunchByDate[d];});draft.lunch=draft.lunchByDate[draft.activeDate];
    if(evt){state.events=state.events.map(e=>e.id===evt.id?{...draft,id:evt.id}:e);state.activeEventId=evt.id;recordAudit('update','event',evt.id,{name});}else{draft.id=id('event');state.events.push(draft);state.activeEventId=draft.id;recordAudit('create','event',draft.id,{name});}syncEventDayState(currentEvent());saveState();modal.remove();activeGroupFilter='all';unassignedSearch='';selectedShiftId=currentDayShifts()[0]?.id||'';view='schedule';render();toast(evt?'活動設定已更新':'活動已建立');};
}
function openVolunteerModal(v){
  const x=normalizeVolunteer(v||{id:'',name:'',center:'',group:'',phone:'',emergencyContact:'',emergencyRelation:'',emergencyPhone:''});
  const modal=showModal(v?'編輯義工資料':'新增義工',`<div class="form-grid"><label>姓名<input id="fName" value="${esc(x.name)}"></label><label>所屬中心<input id="fCenter" value="${esc(x.center)}"></label><label>所屬組別<input id="fGroup" value="${esc(x.group)}"></label><label>電話<input id="fPhone" value="${esc(x.phone||'')}"></label><label>緊急聯絡人<input id="fEmergencyContact" value="${esc(x.emergencyContact||'')}"></label><label>緊急聯絡人關係<input id="fEmergencyRelation" value="${esc(x.emergencyRelation||'')}"></label><label class="full-field">緊急聯絡人電話<input id="fEmergencyPhone" value="${esc(x.emergencyPhone||'')}"></label></div><div class="hint-box"><strong>服務時段不在義工主檔設定。</strong> 進入活動編更頁後，拖放或新增班次時再按當日編更模式選擇固定更期或自訂時間。</div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveVolunteer">儲存</button></div>`);
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#saveVolunteer').onclick=()=>{const name=modal.querySelector('#fName').value.trim();if(!name)return alert('請輸入姓名。');const obj={...x,id:x.id||id('v'),name,center:modal.querySelector('#fCenter').value.trim(),group:modal.querySelector('#fGroup').value.trim(),phone:modal.querySelector('#fPhone').value.trim(),emergencyContact:modal.querySelector('#fEmergencyContact').value.trim(),emergencyRelation:modal.querySelector('#fEmergencyRelation').value.trim(),emergencyPhone:modal.querySelector('#fEmergencyPhone').value.trim()};if(v)state.volunteers=state.volunteers.map(i=>i.id===v.id?obj:i);else state.volunteers.push(obj);saveState();modal.remove();render();toast('義工資料已儲存');};
}
function openShiftModal(s,defaultPositionId,defaultStart,presetVolunteerId=''){
  const evt=currentEvent();if(!evt)return;syncEventDayState(evt);const shiftDate=currentEventDate(evt),cfg=getDayScheduleConfig(evt,shiftDate);if(!state.volunteers.length)return alert('請先新增或匯入義工。');if(!evt.positions.length)return alert('請先在活動設定新增崗位。');const filtered=activeGroupFilter==='all'?evt.positions:evt.positions.filter(p=>p.groupId===activeGroupFilter),positionId=s?.positionId||defaultPositionId||filtered[0]?.id||evt.positions[0].id,pos=evt.positions.find(p=>p.id===positionId),start=s?.start??defaultStart??evt.start,preset=state.volunteers.find(v=>v.id===presetVolunteerId),x=s||{id:'',volunteerId:presetVolunteerId||state.volunteers[0].id,positionId,groupId:pos.groupId,start,end:Math.min(start+180,evt.end),templateId:''};
  const volunteerField=s?`<label class="full-field">義工<select id="sVolunteer">${state.volunteers.map(v=>`<option value="${v.id}" ${x.volunteerId===v.id?'selected':''}>${esc(v.name)}（${esc(v.center||'未填中心')}）｜${esc(v.group)}</option>`).join('')}</select></label>`:preset?`<div class="full-field assignment-person"><span>義工</span><div class="selected-person-pill"><strong>${esc(preset.name)}（${esc(preset.center||'未填中心')}）</strong><small>${esc(preset.group||'未填組別')}</small></div></div>`:`<div class="full-field multi-volunteer-field"><span>義工（可同時選擇多位）</span><div class="volunteer-multi-list">${state.volunteers.map((v,i)=>`<label><input type="checkbox" name="sVolunteers" value="${v.id}" ${i===0?'checked':''}><span><strong>${esc(v.name)}（${esc(v.center||'未填中心')}）</strong><small>${esc(v.group)}</small></span></label>`).join('')}</div></div>`;
  const templateField=cfg.scheduleMode!=='flexible'&&cfg.shiftTemplates.length?`<label class="full-field">${cfg.scheduleMode==='fixed'?'固定更期':'服務時段類型'}<select id="sTemplate">${cfg.scheduleMode==='mixed'?'<option value="">浮動／自訂時間</option>':''}${cfg.shiftTemplates.map(t=>`<option value="${t.id}" ${x.templateId===t.id||(!s&&cfg.scheduleMode==='fixed'&&t===nearestShiftTemplate(evt,start,shiftDate))?'selected':''}>${esc(t.name)}｜${formatTime(t.start)}–${formatTime(t.end)}</option>`).join('')}</select></label>`:'';
  const modal=showModal(s?'編輯班次':preset?'選擇義工服務時段':'新增編更',`<div class="assignment-date-banner"><strong>${dateLabel(shiftDate)}</strong><span>${scheduleModeLabel(cfg.scheduleMode)}</span></div><div class="form-grid">${volunteerField}<label class="full-field">崗位<select id="sPosition">${evt.positions.map(p=>`<option value="${p.id}" ${x.positionId===p.id?'selected':''}>${esc(evt.groups.find(g=>g.id===p.groupId)?.name||'')}｜${esc(p.name)}</option>`).join('')}</select></label>${templateField}<label>開始時間<input id="sStart" type="time" min="${formatTime(evt.start)}" max="${formatTime(evt.end)}" step="900" value="${formatTime(x.start)}"></label><label>結束時間<input id="sEnd" type="time" min="${formatTime(evt.start)}" max="${formatTime(evt.end)}" step="900" value="${formatTime(x.end)}"></label></div><div class="hint-box">${cfg.scheduleMode==='fixed'?'此日為固定時段模式，請選擇一個固定更期。':cfg.scheduleMode==='mixed'?'此日為混合模式，可選固定更期或選「浮動／自訂時間」後自行輸入時間。':'此日為浮動時段模式，請自行輸入服務開始及結束時間。'}</div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveShift">${s?'儲存班次':'建立班次'}</button></div>`,!s);
  const tSelect=modal.querySelector('#sTemplate'),startInput=modal.querySelector('#sStart'),endInput=modal.querySelector('#sEnd');const applyTemplate=()=>{const t=cfg.shiftTemplates.find(t=>t.id===tSelect?.value);if(t){startInput.value=formatTime(t.start);endInput.value=formatTime(t.end);startInput.disabled=true;endInput.disabled=true;}else{startInput.disabled=false;endInput.disabled=false;}};if(tSelect){tSelect.addEventListener('change',applyTemplate);applyTemplate();}
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#saveShift').onclick=()=>{let st=inputTime(startInput.value),en=inputTime(endInput.value),templateId=tSelect?.value||'';const t=cfg.shiftTemplates.find(x=>x.id===templateId);if(cfg.scheduleMode==='fixed'){if(!t)return alert('請選擇固定更期。');st=t.start;en=t.end;}else if(t){st=t.start;en=t.end;}if(en<=st)return alert('結束時間必須遲於開始時間。');if(st<evt.start||en>evt.end)return alert('服務時間必須位於活動時間內。');const pid=modal.querySelector('#sPosition').value,p=evt.positions.find(p=>p.id===pid);if(s){const obj={...x,id:x.id,date:shiftDate,volunteerId:modal.querySelector('#sVolunteer').value,positionId:pid,groupId:p.groupId,start:st,end:en,templateId};evt.shifts=evt.shifts.map(i=>i.id===s.id?obj:i);selectedShiftId=obj.id;}else{const volunteerIds=presetVolunteerId?[presetVolunteerId]:[...modal.querySelectorAll('input[name="sVolunteers"]:checked')].map(i=>i.value);if(!volunteerIds.length)return alert('請至少選擇一名義工。');const created=volunteerIds.map(vid=>({id:id('s'),date:shiftDate,volunteerId:vid,positionId:pid,groupId:p.groupId,start:st,end:en,templateId}));evt.shifts.push(...created);selectedShiftId=created[0].id;}saveState();modal.remove();render();toast(s?'班次已儲存':'班次已建立');};
}
function openImportModal(){ let parsed=[];const modal=showModal('Excel 匯入義工資料',`<div class="import-toolbar"><button class="secondary-button" id="downloadTemplate">⇩ 下載 Excel/CSV 範本</button></div><div class="import-note">▤ 支援 <strong>.xlsx</strong> 及 <strong>.csv</strong>。義工主檔只匯入個人、中心／組別、電話及緊急聯絡資料；服務時段改於編更頁按活動日期設定。</div><div class="file-drop"><strong>選擇義工資料檔案</strong>系統會先顯示匯入預覽，不會立即寫入資料。<br><input id="importFile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div><div id="importStatus"></div><div id="importPreview"></div>`,true);modal.querySelector('#downloadTemplate').onclick=downloadTemplateCSV;modal.querySelector('#importFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const status=modal.querySelector('#importStatus'),preview=modal.querySelector('#importPreview');status.innerHTML=`<p class="file-name">正在讀取：${esc(file.name)}…</p>`;preview.innerHTML='';try{const rows=await readSpreadsheet(file);parsed=convertVolunteers(rows);if(!parsed.length)throw new Error('找不到「姓名」欄位或沒有可匯入資料。');status.innerHTML=`<div class="preview-heading"><strong>匯入預覽</strong><span>${parsed.length} 位義工</span></div>`;preview.innerHTML=`<div class="table-wrap import-preview"><table><thead><tr><th>姓名</th><th>中心／組別</th><th>電話</th><th>緊急聯絡</th></tr></thead><tbody>${parsed.slice(0,10).map(v=>`<tr><td><strong>${esc(v.name)}</strong></td><td>${esc(v.center||'—')}<br><small>${esc(v.group||'—')}</small></td><td>${esc(v.phone||'—')}</td><td>${esc(v.emergencyContact||'—')}<br><small>${esc(v.emergencyRelation||'—')}｜${esc(v.emergencyPhone||'—')}</small></td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button class="secondary-button modal-cancel2">取消</button><button class="primary-button" id="confirmImport">確認匯入 ${parsed.length} 位</button></div>`;preview.querySelector('.modal-cancel2').onclick=()=>modal.remove();preview.querySelector('#confirmImport').onclick=()=>{state.volunteers.push(...parsed);saveState();modal.remove();render();toast(`已匯入 ${parsed.length} 位義工`);};}catch(err){status.innerHTML=`<div class="error-box">${esc(err.message||'無法讀取檔案')}</div>`;}}; }
function downloadTemplateCSV(){ const rows=[['姓名','所屬中心','所屬組別','電話','緊急聯絡人','緊急聯絡人關係','緊急聯絡人電話'],['陳大文','東華三院','青年組','91234567','陳太','配偶','98765432'],['李小美','聖公會','活動組','92345678','李先生','父親','97654321'],['王志明','善導會','支援組','93456789','王小姐','姊妹','96543210']];downloadBlob(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'義工資料匯入範本.csv'); }
function pick(row,key){const k=aliases[key].find(a=>Object.prototype.hasOwnProperty.call(row,a));return k?row[k]:'';}
function convertVolunteers(rows){return rows.map((row,i)=>normalizeVolunteer({id:id(`vimp${i}`),name:String(pick(row,'name')??'').trim(),center:String(pick(row,'center')??'').trim(),group:String(pick(row,'group')??'').trim(),phone:String(pick(row,'phone')??'').trim(),emergencyContact:String(pick(row,'emergencyContact')??'').trim(),emergencyRelation:String(pick(row,'emergencyRelation')??'').trim(),emergencyPhone:String(pick(row,'emergencyPhone')??'').trim()})).filter(v=>v.name);}
function parseCSV(text){text=text.replace(/^\ufeff/,'');const rows=[];let row=[],cell='',q=false;for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}}if(cell||row.length){row.push(cell);rows.push(row);}const header=(rows.shift()||[]).map(x=>String(x).trim());return rows.filter(r=>r.some(x=>String(x).trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));}
async function parseXLSX(buffer){const files=await unzipXlsx(buffer),decoder=new TextDecoder('utf-8'),xml=name=>{const bytes=files.get(name);return bytes?decoder.decode(bytes):'';};let shared=[];const sharedXml=xml('xl/sharedStrings.xml');if(sharedXml){const doc=new DOMParser().parseFromString(sharedXml,'application/xml');shared=[...doc.querySelectorAll('si')].map(si=>[...si.querySelectorAll('t')].map(t=>t.textContent||'').join(''));}let sheetPath='xl/worksheets/sheet1.xml';const wbXml=xml('xl/workbook.xml'),relsXml=xml('xl/_rels/workbook.xml.rels');if(wbXml&&relsXml){const wb=new DOMParser().parseFromString(wbXml,'application/xml'),rels=new DOMParser().parseFromString(relsXml,'application/xml'),sheet=wb.querySelector('sheet'),rid=sheet?.getAttribute('r:id')||sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');if(rid){const rel=[...rels.querySelectorAll('Relationship')].find(r=>r.getAttribute('Id')===rid),target=rel?.getAttribute('Target');if(target)sheetPath=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`;}}const sheetXml=xml(sheetPath);if(!sheetXml)throw new Error('無法讀取 Excel 第一個工作表。');const doc=new DOMParser().parseFromString(sheetXml,'application/xml'),grid=[];for(const c of doc.querySelectorAll('sheetData c')){const ref=c.getAttribute('r')||'',m=ref.match(/^([A-Z]+)(\d+)$/);if(!m)continue;const col=lettersToIndex(m[1]),row=Number(m[2])-1,t=c.getAttribute('t');let value='';if(t==='inlineStr')value=[...c.querySelectorAll('is t')].map(n=>n.textContent||'').join('');else{const raw=c.querySelector('v')?.textContent??'';value=t==='s'?(shared[Number(raw)]??''):raw;}if(!grid[row])grid[row]=[];grid[row][col]=value;}const rows=grid.filter(Boolean);if(!rows.length)return[];const header=(rows.shift()||[]).map(x=>String(x??'').trim());return rows.filter(r=>r?.some(x=>String(x??'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,r?.[i]??''])));}
function lettersToIndex(s){let n=0;for(const c of s)n=n*26+(c.charCodeAt(0)-64);return n-1;}
async function unzipXlsx(buffer){const data=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}}if(eocd<0)throw new Error('Excel 檔案不是有效的 XLSX 壓縮格式。');const entries=view.getUint16(eocd+10,true),centralOffset=view.getUint32(eocd+16,true);let ptr=centralOffset;const files=new Map(),decoder=new TextDecoder();for(let i=0;i<entries;i++){if(view.getUint32(ptr,true)!==0x02014b50)break;const method=view.getUint16(ptr+10,true),compSize=view.getUint32(ptr+20,true),nameLen=view.getUint16(ptr+28,true),extraLen=view.getUint16(ptr+30,true),commentLen=view.getUint16(ptr+32,true),localOffset=view.getUint32(ptr+42,true),name=decoder.decode(data.slice(ptr+46,ptr+46+nameLen)),localNameLen=view.getUint16(localOffset+26,true),localExtraLen=view.getUint16(localOffset+28,true),start=localOffset+30+localNameLen+localExtraLen,compressed=data.slice(start,start+compSize);let content;if(method===0)content=compressed;else if(method===8)content=await inflateRaw(compressed);else throw new Error(`Excel 內含不支援的壓縮方式：${method}`);files.set(name,content);ptr+=46+nameLen+extraLen+commentLen;}return files;}
async function inflateRaw(bytes){if(typeof DecompressionStream==='undefined')throw new Error('此瀏覽器不支援直接讀取 XLSX，請改用最新版 Chrome / Edge，或另存為 CSV。');try{const ds=new DecompressionStream('deflate-raw'),stream=new Blob([bytes]).stream().pipeThrough(ds);return new Uint8Array(await new Response(stream).arrayBuffer());}catch{throw new Error('解壓 XLSX 失敗；可嘗試將檔案另存為 CSV 後匯入。');}}

let lastMobileUI=isMobileUI();window.addEventListener('resize',()=>{const now=isMobileUI();if(now!==lastMobileUI){lastMobileUI=now;render();}});

bootstrapApp();
