const DAY_START = 8 * 60;
const DAY_END = 18 * 60;
const DAY_DURATION = DAY_END - DAY_START;
const STEP = 15;
const GROUP_HEIGHT = 34;
const ROW_HEIGHT = 58;
const EVENT_HEIGHT = 40;
const STORAGE_KEY = 'volunteer-roster-system-static-v1';
const COLORS = ['#2f80ed','#32a875','#f59e42','#8a63d2','#e05263','#23a7b5'];

const seed = {
  volunteers: [
    {id:'v1',name:'陳小明',center:'社區中心A',group:'青年組',phone:'9123 4567',email:'chan@example.com',availabilityStart:480,availabilityEnd:1080},
    {id:'v2',name:'張家豪',center:'社區中心A',group:'關懷組',phone:'9345 8821',email:'cheung@example.com',availabilityStart:540,availabilityEnd:1020},
    {id:'v3',name:'李美玲',center:'社區中心B',group:'活動組',phone:'9663 1128',email:'lee@example.com',availabilityStart:600,availabilityEnd:1080},
    {id:'v4',name:'黃詠思',center:'社區中心B',group:'青年組',phone:'9882 3321',email:'wong@example.com',availabilityStart:540,availabilityEnd:1020},
    {id:'v5',name:'林啟明',center:'社區中心C',group:'物資組',phone:'9200 8452',email:'lam@example.com',availabilityStart:480,availabilityEnd:1080},
    {id:'v6',name:'梁麗欣',center:'社區中心C',group:'關懷組',phone:'6011 2200',email:'leung@example.com',availabilityStart:480,availabilityEnd:900},
    {id:'v7',name:'許文彬',center:'社區中心A',group:'活動組',phone:'6112 3300',email:'hui@example.com',availabilityStart:720,availabilityEnd:1080},
    {id:'v8',name:'鄭志強',center:'社區中心B',group:'物資組',phone:'6223 4400',email:'cheng@example.com',availabilityStart:780,availabilityEnd:1080}
  ],
  groups: [
    {id:'g1',name:'A組－接待及登記組',color:'#32a875'},
    {id:'g2',name:'B組－活動及場地組',color:'#2f80ed'},
    {id:'g3',name:'C組－物資及支援組',color:'#f59e42'},
    {id:'g4',name:'D組－清潔組',color:'#8a63d2'}
  ],
  positions: [
    {id:'p1',name:'接待處',required:4,groupId:'g1',color:'#32a875'},
    {id:'p2',name:'登記處',required:3,groupId:'g1',color:'#55b982'},
    {id:'p3',name:'活動組',required:6,groupId:'g2',color:'#2f80ed'},
    {id:'p4',name:'場地組',required:4,groupId:'g2',color:'#4d92ea'},
    {id:'p5',name:'物資組',required:3,groupId:'g3',color:'#f59e42'},
    {id:'p6',name:'支援組',required:2,groupId:'g3',color:'#f2a654'},
    {id:'p7',name:'清潔組',required:4,groupId:'g4',color:'#8a63d2'}
  ],
  shifts: [
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
  lunch:{enabled:true,start:750,end:810}
};

let state = loadState();
let view = 'schedule';
let eventDate = '2026-09-12';
let selectedShiftId = state.shifts[0]?.id || '';
let volunteerSearch = '';
let statsMode = 'volunteer';
let statsSelection = '';

const app = document.getElementById('app');

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); return raw ? {...clone(seed),...JSON.parse(raw)} : clone(seed); }
  catch{ return clone(seed); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function id(prefix){ return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`; }
function clamp(n,min,max){ return Math.min(Math.max(n,min),max); }
function snap(n){ return Math.round(n/STEP)*STEP; }
function formatTime(min){ const h=Math.floor(min/60),m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
function parseTime(v,fallback){
  if(typeof v==='number' && Number.isFinite(v)){ if(v>0&&v<1)return Math.round(v*24*60); if(v>=0&&v<=24)return Math.round(v*60); return Math.round(v); }
  const s=String(v??'').trim(); if(!s)return fallback;
  const m=s.match(/^(\d{1,2})[:：](\d{1,2})$/); if(m)return Number(m[1])*60+Number(m[2]);
  const n=Number(s); return Number.isNaN(n)?fallback:(n<=24?n*60:n);
}
function inputTime(v){ const [h,m]=v.split(':').map(Number); return h*60+m; }
function hours(s,e){ return Math.max(0,e-s)/60; }
function esc(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function csvCell(v){ const s=String(v??''); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }
function downloadBlob(blob,filename){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000); }
function toast(message){
  document.querySelector('.toast')?.remove();
  const el=document.createElement('div'); el.className='toast'; el.innerHTML=`<span>✓</span>${esc(message)}`; document.body.appendChild(el); setTimeout(()=>el.remove(),2200);
}
function viewTitle(){ return ({dashboard:['總覽','查看義工、崗位及服務時數概況'],schedule:['更表編排','自訂分組、崗位及互動拖拉編更'],volunteers:['義工管理','建立、修改或以 Excel 批量匯入義工資料'],positions:['崗位管理','設定崗位名稱、所需人數及所屬分組'],groups:['分組管理','自訂編更分組及管理團隊結構'],stats:['圖表統計','按義工、中心或組別製作專屬圖表'],settings:['系統設定','午膳顯示及本機資料設定']}[view]); }

function render(){
  const [title,subtitle]=viewTitle();
  app.innerHTML=`<div class="app-shell">
    ${sidebarHTML()}
    <main class="main-area">
      <header class="topbar"><div><h1>${title}</h1><p>${subtitle}</p></div><div class="top-actions">
        <button class="secondary-button" id="topImport">⇧ Excel 匯入</button>
        <button class="primary-button" id="topSave">▣ 儲存變更</button>
      </div></header>
      ${renderContent()}
    </main>
  </div>`;
  bindBase();
  if(view==='schedule') bindSchedule();
  if(view==='volunteers') bindVolunteerPage();
  if(view==='positions') bindPositionPage();
  if(view==='groups') bindGroupPage();
  if(view==='stats') bindStats();
  if(view==='settings') bindSettings();
}

function sidebarHTML(){
  const items=[['dashboard','⌂','總覽'],['schedule','▦','更表編排'],['volunteers','♙','義工管理'],['positions','◇','崗位管理'],['groups','♟','分組管理'],['stats','▥','圖表統計'],['settings','⚙','設定']];
  return `<aside class="sidebar"><div class="brand"><div class="brand-mark">♥</div><div><strong>義工編更系統</strong><span>Volunteer Roster</span></div></div><nav>${items.map(([key,icon,label])=>`<button class="nav-item ${view===key?'active':''}" data-nav="${key}"><b>${icon}</b><span>${label}</span></button>`).join('')}</nav><div class="sidebar-spacer"></div><div class="sidebar-status">◷ <span>資料自動儲存於此瀏覽器<br>支援 GitHub / Vercel</span></div></aside>`;
}

function renderContent(){
  if(view==='dashboard') return dashboardHTML();
  if(view==='schedule') return schedulePageHTML();
  if(view==='volunteers') return volunteerPageHTML();
  if(view==='positions') return positionPageHTML();
  if(view==='groups') return groupPageHTML();
  if(view==='stats') return `<div class="content-page">${statsPanelHTML()}</div>`;
  return settingsHTML();
}

function bindBase(){
  document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{view=b.dataset.nav;render();}));
  document.getElementById('topImport')?.addEventListener('click',openImportModal);
  document.getElementById('topSave')?.addEventListener('click',()=>{saveState();toast('已儲存最新資料');});
  document.getElementById('goSchedule')?.addEventListener('click',()=>{view='schedule';render();});
}

function buildLayout(){
  let y=0; const items=[],positionRows=[];
  for(const group of state.groups){
    items.push({type:'group',id:group.id,y,height:GROUP_HEIGHT,group}); y+=GROUP_HEIGHT;
    for(const position of state.positions.filter(p=>p.groupId===group.id)){
      const row={type:'position',id:position.id,y,height:ROW_HEIGHT,group,position}; items.push(row); positionRows.push(row); y+=ROW_HEIGHT;
    }
  }
  return {items,positionRows,totalHeight:y};
}

function schedulePageHTML(){
  const layout=buildLayout();
  const hoursLabels=Array.from({length:11},(_,i)=>DAY_START+i*60).map((t,i)=>`<div class="hour-label ${i===0?'first':''} ${i===10?'last':''}" style="left:${i*10}%">${formatTime(t)}</div>`).join('');
  const rowLabels=layout.items.map(item=>item.type==='group'?`<div class="group-label" style="height:${item.height}px"><span class="group-dot" style="background:${item.group.color}"></span>${esc(item.group.name)}</div>`:`<div class="position-label" style="height:${item.height}px"><span>${esc(item.position.name)}</span><small>所需 ${item.position.required} 人</small></div>`).join('');
  const rowBg=layout.items.map(item=>`<div class="${item.type==='group'?'canvas-group-row':'canvas-position-row'}" style="top:${item.y}px;height:${item.height}px"></div>`).join('');
  const verticals=Array.from({length:11},(_,i)=>`<div class="vertical-grid" style="left:${i*10}%"></div>`).join('');
  const lunch=state.lunch.enabled?`<div class="lunch-zone" style="left:${((state.lunch.start-DAY_START)/DAY_DURATION)*100}%;width:${((state.lunch.end-state.lunch.start)/DAY_DURATION)*100}%"><div class="lunch-tag">🍴 午膳時間</div></div>`:'';
  const shifts=state.shifts.map(shift=>shiftBlockHTML(shift,layout)).join('');
  const selected=state.shifts.find(s=>s.id===selectedShiftId),vol=state.volunteers.find(v=>v.id===selected?.volunteerId),pos=state.positions.find(p=>p.id===selected?.positionId);

  return `<div class="schedule-page">
    <div class="feature-strip">
      <div><span class="feature-icon blue">▤</span><p><strong>自訂崗位</strong><small>設定崗位名稱及所需人數</small></p></div>
      <div><span class="feature-icon cyan">♟</span><p><strong>分組功能</strong><small>自訂分組編更及管理團隊</small></p></div>
      <div><span class="feature-icon indigo">↔</span><p><strong>互動編更</strong><small>拖拉、伸縮及跨組別調動</small></p></div>
      <div><span class="feature-icon pink">🍴</span><p><strong>午膳時間</strong><small>更表清晰顯示休息時段</small></p></div>
      <div><span class="feature-icon blue">▥</span><p><strong>多維度圖表</strong><small>按義工／中心／組別統計</small></p></div>
      <div><span class="feature-icon cyan">◷</span><p><strong>時數統計</strong><small>自動統計服務時數及班次</small></p></div>
    </div>
    <div class="schedule-toolbar"><div class="date-controls"><button class="icon-button" id="prevDate">‹</button><input id="eventDate" type="date" value="${eventDate}"><button class="icon-button" id="nextDate">›</button></div><div class="toolbar-spacer"></div><button class="secondary-button" id="addShift">＋ 新增編更</button><button class="secondary-button" id="exportSchedule">⇩ 匯出 Excel CSV</button><button class="publish-button" id="publishSchedule">✓ 發布更表</button></div>
    <div class="schedule-workspace">
      <div class="left-rail">
        <div class="rail-section"><div class="rail-title"><strong>崗位列表</strong><button id="railAddPosition">＋ 新增</button></div>${state.positions.map(p=>`<button class="mini-row" data-edit-position="${p.id}"><span class="group-dot" style="background:${p.color}"></span><span>${esc(p.name)}</span><small>${p.required} 人</small></button>`).join('')}</div>
        <div class="rail-section"><div class="rail-title"><strong>分組管理</strong><button id="railAddGroup">＋ 新增</button></div>${state.groups.map(g=>`<button class="mini-row" data-edit-group="${g.id}"><span class="group-dot" style="background:${g.color}"></span><span>${esc(g.name)}</span><small>${state.positions.filter(p=>p.groupId===g.id).length} 崗位</small></button>`).join('')}</div>
      </div>
      <div class="board-column"><div class="schedule-shell">
        <div class="timeline-header"><div class="timeline-corner">時間</div><div class="timeline-hours">${hoursLabels}</div></div>
        <div class="schedule-body" style="height:${layout.totalHeight}px"><div class="row-labels">${rowLabels}</div><div class="timeline-canvas" id="timelineCanvas" style="height:${layout.totalHeight}px">${verticals}${rowBg}${lunch}${shifts}</div></div>
        <div class="schedule-hint">雙擊空白時段可新增編更；拖動班次可轉崗位／分組，左右拉伸可調整時間（每 15 分鐘吸附）。</div>
      </div></div>
      <aside class="inspector"><h3>義工資訊</h3>${vol&&selected&&pos?`<div class="person-header"><span class="avatar">${esc(vol.name.slice(0,1))}</span><div><strong>${esc(vol.name)}</strong><small>${esc(vol.center)}</small></div></div><dl><dt>所屬組別</dt><dd>${esc(vol.group||'—')}</dd><dt>電話</dt><dd>${esc(vol.phone||'—')}</dd><dt>電郵</dt><dd>${esc(vol.email||'—')}</dd></dl><hr><h3>已選班次</h3><div class="selected-shift-card"><span class="group-dot" style="background:${pos.color}"></span><div><strong>${esc(pos.name)}</strong><small>${formatTime(selected.start)}–${formatTime(selected.end)}（${hours(selected.start,selected.end).toFixed(1)} 小時）</small></div></div><button class="secondary-button button-wide" id="editSelectedShift">編輯班次</button><button class="danger-button button-wide" id="deleteSelectedShift">⌫ 刪除班次</button>`:`<div class="empty-inspector">選擇更表上的班次查看義工資料。</div>`}</aside>
    </div>
    <div class="lunch-settings-inline"><label class="switch-label"><input id="lunchEnabled" type="checkbox" ${state.lunch.enabled?'checked':''}> 顯示午膳時間</label><label>由 <input id="lunchStart" type="time" value="${formatTime(state.lunch.start)}"></label><label>至 <input id="lunchEnd" type="time" value="${formatTime(state.lunch.end)}"></label></div>
    ${statsPanelHTML()}
  </div>`;
}

function shiftBlockHTML(shift,layout){
  const row=layout.positionRows.find(r=>r.position.id===shift.positionId),vol=state.volunteers.find(v=>v.id===shift.volunteerId),pos=state.positions.find(p=>p.id===shift.positionId);
  if(!row||!vol||!pos)return '';
  const left=((shift.start-DAY_START)/DAY_DURATION)*100,width=((shift.end-shift.start)/DAY_DURATION)*100,top=row.y+(ROW_HEIGHT-EVENT_HEIGHT)/2;
  const overlap=state.lunch.enabled&&shift.start<state.lunch.end&&shift.end>state.lunch.start;
  return `<div class="shift-block ${selectedShiftId===shift.id?'selected':''} ${overlap?'lunch-overlap':''}" data-shift="${shift.id}" style="left:${left}%;width:${width}%;top:${top}px;background:${pos.color}"><i class="resize-handle left" data-resize="left"></i><strong>${esc(vol.name)}</strong><span class="shift-time">${formatTime(shift.start)}–${formatTime(shift.end)}</span><i class="resize-handle right" data-resize="right"></i></div>`;
}

function bindSchedule(){
  document.getElementById('eventDate')?.addEventListener('change',e=>eventDate=e.target.value);
  document.getElementById('prevDate')?.addEventListener('click',()=>changeDate(-1));
  document.getElementById('nextDate')?.addEventListener('click',()=>changeDate(1));
  document.getElementById('addShift')?.addEventListener('click',()=>openShiftModal());
  document.getElementById('exportSchedule')?.addEventListener('click',exportScheduleCSV);
  document.getElementById('publishSchedule')?.addEventListener('click',()=>toast('更表已標記為可發布版本'));
  document.getElementById('railAddPosition')?.addEventListener('click',()=>openPositionModal());
  document.getElementById('railAddGroup')?.addEventListener('click',()=>openGroupModal());
  document.querySelectorAll('[data-edit-position]').forEach(b=>b.addEventListener('click',()=>openPositionModal(state.positions.find(p=>p.id===b.dataset.editPosition))));
  document.querySelectorAll('[data-edit-group]').forEach(b=>b.addEventListener('click',()=>openGroupModal(state.groups.find(g=>g.id===b.dataset.editGroup))));
  document.getElementById('editSelectedShift')?.addEventListener('click',()=>openShiftModal(state.shifts.find(s=>s.id===selectedShiftId)));
  document.getElementById('deleteSelectedShift')?.addEventListener('click',()=>{ if(confirm('確定刪除此班次？')){state.shifts=state.shifts.filter(s=>s.id!==selectedShiftId);selectedShiftId=state.shifts[0]?.id||'';saveState();render();} });
  for(const [id,key] of [['lunchEnabled','enabled'],['lunchStart','start'],['lunchEnd','end']]){
    document.getElementById(id)?.addEventListener('change',e=>{state.lunch[key]=key==='enabled'?e.target.checked:inputTime(e.target.value);saveState();render();});
  }
  document.getElementById('timelineCanvas')?.addEventListener('dblclick',timelineDoubleClick);
  bindShiftInteractions();
  bindStats();
}

function changeDate(delta){ const d=new Date(`${eventDate}T00:00:00`); d.setDate(d.getDate()+delta); eventDate=d.toISOString().slice(0,10); render(); }
function timelineDoubleClick(e){
  if(e.target.closest('.shift-block'))return;
  const canvas=e.currentTarget,rect=canvas.getBoundingClientRect(),layout=buildLayout(),x=e.clientX-rect.left,y=e.clientY-rect.top;
  const row=layout.positionRows.find(r=>y>=r.y&&y<r.y+r.height); if(!row)return;
  const start=clamp(snap(DAY_START+(x/rect.width)*DAY_DURATION),DAY_START,DAY_END-30); openShiftModal(null,row.position.id,start);
}

function bindShiftInteractions(){
  const canvas=document.getElementById('timelineCanvas'); if(!canvas)return;
  const layout=buildLayout();
  document.querySelectorAll('.shift-block').forEach(block=>{
    block.addEventListener('pointerdown',e=>{
      if(e.button!==0)return; e.preventDefault();
      const shift=state.shifts.find(s=>s.id===block.dataset.shift); if(!shift)return;
      selectedShiftId=shift.id; document.querySelectorAll('.shift-block.selected').forEach(x=>x.classList.remove('selected')); block.classList.add('selected');
      const rect=canvas.getBoundingClientRect(),startX=e.clientX,startY=e.clientY,initialLeft=block.offsetLeft,initialTop=block.offsetTop,initialWidth=block.offsetWidth;
      const mode=e.target.dataset.resize||'drag'; let moved=false,last={};
      block.setPointerCapture?.(e.pointerId);
      const move=ev=>{
        const dx=ev.clientX-startX,dy=ev.clientY-startY; if(Math.abs(dx)+Math.abs(dy)>2)moved=true;
        if(mode==='drag'){
          const duration=shift.end-shift.start; let x=clamp(initialLeft+dx,0,rect.width-initialWidth); let start=clamp(snap(DAY_START+(x/rect.width)*DAY_DURATION),DAY_START,DAY_END-duration); x=((start-DAY_START)/DAY_DURATION)*rect.width;
          const center=initialTop+dy+EVENT_HEIGHT/2; const row=nearestRow(center,layout.positionRows); if(!row)return;
          block.style.left=`${x}px`; block.style.top=`${row.y+(ROW_HEIGHT-EVENT_HEIGHT)/2}px`; block.querySelector('.shift-time').textContent=`${formatTime(start)}–${formatTime(start+duration)}`; last={start,end:start+duration,row};
        }else if(mode==='left'){
          let x=clamp(initialLeft+dx,0,initialLeft+initialWidth-28); let start=clamp(snap(DAY_START+(x/rect.width)*DAY_DURATION),DAY_START,shift.end-30); x=((start-DAY_START)/DAY_DURATION)*rect.width; const endX=((shift.end-DAY_START)/DAY_DURATION)*rect.width;
          block.style.left=`${x}px`; block.style.width=`${Math.max(28,endX-x)}px`; block.querySelector('.shift-time').textContent=`${formatTime(start)}–${formatTime(shift.end)}`; last={start,end:shift.end};
        }else{
          let end=clamp(snap(DAY_START+((initialLeft+initialWidth+dx)/rect.width)*DAY_DURATION),shift.start+30,DAY_END); const endX=((end-DAY_START)/DAY_DURATION)*rect.width;
          block.style.width=`${Math.max(28,endX-initialLeft)}px`; block.querySelector('.shift-time').textContent=`${formatTime(shift.start)}–${formatTime(end)}`; last={start:shift.start,end};
        }
      };
      const up=()=>{
        document.removeEventListener('pointermove',move);
        if(moved&&last.start!==undefined){shift.start=last.start;shift.end=last.end;if(last.row){shift.positionId=last.row.position.id;shift.groupId=last.row.group.id;}saveState();}
        render();
      };
      document.addEventListener('pointermove',move); document.addEventListener('pointerup',up,{once:true});
    });
  });
}
function nearestRow(y,rows){ return rows.reduce((best,row)=>Math.abs(y-(row.y+row.height/2))<Math.abs(y-(best.y+best.height/2))?row:best,rows[0]); }

function statsPanelHTML(){
  const options=statsOptions(); if(!options.length)return `<section class="stats-panel"><div class="empty-chart">未有義工資料</div></section>`;
  if(!options.some(o=>o.value===statsSelection))statsSelection=options[0].value;
  const volunteerIds=statsVolunteerIds(),scoped=state.shifts.filter(s=>volunteerIds.has(s.volunteerId));
  const total=scoped.reduce((n,s)=>n+hours(s.start,s.end),0);
  const positionData=state.positions.map((p,i)=>({name:p.name,value:scoped.filter(s=>s.positionId===p.id).reduce((n,s)=>n+hours(s.start,s.end),0),color:COLORS[i%COLORS.length]})).filter(x=>x.value>0);
  const groupData=state.groups.map((g,i)=>({name:g.name.split('－')[0],value:scoped.filter(s=>s.groupId===g.id).reduce((n,s)=>n+hours(s.start,s.end),0),color:g.color||COLORS[i%COLORS.length]})).filter(x=>x.value>0);
  const totalPie=positionData.reduce((n,x)=>n+x.value,0); let angle=0; const stops=[]; for(const d of positionData){const start=angle,end=angle+(d.value/(totalPie||1))*100;stops.push(`${d.color} ${start}% ${end}%`);angle=end;} const donut=stops.length?`conic-gradient(${stops.join(',')})`:'#edf2f8';
  const maxBar=Math.max(1,...groupData.map(x=>x.value));
  return `<section class="stats-panel printable-area"><div class="stats-head"><div><h2>▥ 專屬圖表</h2><p>完成主更表後，可按義工本人、所屬中心或所屬組別生成專屬統計。</p></div><button class="secondary-button no-print" id="printStats">▣ 列印／儲存 PDF</button></div>
    <div class="stats-tabs no-print"><button class="tab-button ${statsMode==='volunteer'?'active':''}" data-stats-mode="volunteer">按義工</button><button class="tab-button ${statsMode==='center'?'active':''}" data-stats-mode="center">按中心</button><button class="tab-button ${statsMode==='group'?'active':''}" data-stats-mode="group">按組別</button><select id="statsSelection">${options.map(o=>`<option value="${esc(o.value)}" ${o.value===statsSelection?'selected':''}>${esc(o.label)}</option>`).join('')}</select></div>
    <div class="stats-grid"><div class="metric-card"><span>總服務時數</span><strong>${total.toFixed(1)}</strong><small>小時</small></div><div class="metric-card"><span>編更班次</span><strong>${scoped.length}</strong><small>班</small></div><div class="metric-card"><span>涉及義工</span><strong>${volunteerIds.size}</strong><small>人</small></div><div class="metric-card"><span>涉及崗位</span><strong>${positionData.length}</strong><small>個</small></div></div>
    <div class="chart-grid"><div class="chart-card"><h3>崗位時數分佈</h3>${positionData.length?`<div class="donut-wrap"><div class="donut" style="background:${donut}"><div class="donut-center"><div>${totalPie.toFixed(1)}<br>小時</div></div></div><div class="legend">${positionData.map(d=>`<div class="legend-row"><span class="group-dot" style="background:${d.color}"></span><span>${esc(d.name)}</span><b>${d.value.toFixed(1)}h</b></div>`).join('')}</div></div>`:`<div class="empty-chart">暫未有相關編更資料</div>`}</div>
    <div class="chart-card"><h3>編更分組服務時數</h3>${groupData.length?`<div class="bar-chart">${groupData.map(d=>`<div class="bar-row"><span>${esc(d.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${(d.value/maxBar)*100}%;background:${d.color}"></div></div><b>${d.value.toFixed(1)}h</b></div>`).join('')}</div>`:`<div class="empty-chart">暫未有相關編更資料</div>`}</div></div></section>`;
}
function statsOptions(){
  if(statsMode==='volunteer')return state.volunteers.map(v=>({value:v.id,label:v.name}));
  const vals=[...new Set(state.volunteers.map(v=>statsMode==='center'?v.center:v.group).filter(Boolean))]; return vals.map(v=>({value:v,label:v}));
}
function statsVolunteerIds(){ if(statsMode==='volunteer')return new Set([statsSelection]); return new Set(state.volunteers.filter(v=>(statsMode==='center'?v.center:v.group)===statsSelection).map(v=>v.id)); }
function bindStats(){
  document.querySelectorAll('[data-stats-mode]').forEach(b=>b.addEventListener('click',()=>{statsMode=b.dataset.statsMode;statsSelection='';render();}));
  document.getElementById('statsSelection')?.addEventListener('change',e=>{statsSelection=e.target.value;render();});
  document.getElementById('printStats')?.addEventListener('click',()=>window.print());
}

function dashboardHTML(){
  const used=new Set(state.shifts.map(s=>s.volunteerId)).size,totalHours=state.shifts.reduce((n,s)=>n+hours(s.start,s.end),0);
  const cards=[['已編配義工',used,'人'],['總服務時數',totalHours.toFixed(1),'小時'],['編更分組',state.groups.length,'組'],['自訂崗位',state.positions.length,'個']];
  return `<div class="content-page"><div class="overview-grid">${cards.map(c=>`<div class="overview-card"><span>${c[0]}</span><strong>${c[1]}</strong><small>${c[2]}</small></div>`).join('')}</div><div class="two-panel"><section class="panel"><h2>編更進度</h2>${state.groups.map(g=>{const need=state.positions.filter(p=>p.groupId===g.id).reduce((n,p)=>n+p.required,0),assigned=state.shifts.filter(s=>s.groupId===g.id).length;return `<div class="progress-row"><div><span class="group-dot" style="background:${g.color}"></span><strong>${esc(g.name)}</strong></div><span>${assigned} 班／需求參考 ${need} 人</span></div>`}).join('')}</section><section class="panel"><h2>快速開始</h2><p>先匯入義工資料，再建立分組及崗位，最後進入主更表以拖拉方式編排。所有變更會儲存在此瀏覽器。</p><button class="primary-button" id="goSchedule">進入更表編排</button><div class="mini-summary"><span>義工資料：${state.volunteers.length} 人</span><span>編更紀錄：${state.shifts.length} 班</span></div></section></div></div>`;
}

function volunteerPageHTML(){
  const list=state.volunteers.filter(v=>`${v.name} ${v.center} ${v.group}`.toLowerCase().includes(volunteerSearch.toLowerCase()));
  return `<div class="content-page"><div class="page-actions"><div class="search-box">⌕<input id="volSearch" value="${esc(volunteerSearch)}" placeholder="搜尋 ${state.volunteers.length} 位義工"></div><button class="secondary-button" id="pageImport">▤ Excel 匯入</button><button class="primary-button" id="addVolunteer">＋ 新增義工</button></div><div class="table-wrap"><table><thead><tr><th>姓名</th><th>所屬中心</th><th>所屬組別</th><th>可服務時間</th><th>電話</th><th>電郵</th><th></th></tr></thead><tbody>${list.map(v=>`<tr><td><strong>${esc(v.name)}</strong></td><td>${esc(v.center||'—')}</td><td>${esc(v.group||'—')}</td><td>${formatTime(v.availabilityStart??DAY_START)}–${formatTime(v.availabilityEnd??DAY_END)}</td><td>${esc(v.phone||'—')}</td><td>${esc(v.email||'—')}</td><td class="table-actions"><button data-edit-volunteer="${v.id}">編輯</button><button class="danger-text" data-delete-volunteer="${v.id}">刪除</button></td></tr>`).join('')}</tbody></table></div></div>`;
}
function bindVolunteerPage(){
  document.getElementById('volSearch')?.addEventListener('input',e=>{volunteerSearch=e.target.value;render();document.getElementById('volSearch')?.focus();});
  document.getElementById('pageImport')?.addEventListener('click',openImportModal); document.getElementById('addVolunteer')?.addEventListener('click',()=>openVolunteerModal());
  document.querySelectorAll('[data-edit-volunteer]').forEach(b=>b.addEventListener('click',()=>openVolunteerModal(state.volunteers.find(v=>v.id===b.dataset.editVolunteer))));
  document.querySelectorAll('[data-delete-volunteer]').forEach(b=>b.addEventListener('click',()=>{const vid=b.dataset.deleteVolunteer;if(confirm('確定刪除此義工及其所有編更？')){state.volunteers=state.volunteers.filter(v=>v.id!==vid);state.shifts=state.shifts.filter(s=>s.volunteerId!==vid);saveState();render();}}));
}

function positionPageHTML(){return `<div class="content-page"><div class="page-actions"><div class="page-note">每個崗位可自訂所需人數、所屬編更分組及顏色。</div><button class="primary-button" id="addPosition">＋ 新增崗位</button></div><div class="management-grid">${state.positions.map(p=>`<div class="management-card"><div class="management-card-head"><span class="group-dot large" style="background:${p.color}"></span><div><strong>${esc(p.name)}</strong><small>${esc(state.groups.find(g=>g.id===p.groupId)?.name||'未分組')}</small></div></div><div class="people-number"><strong>${p.required}</strong><span>所需人數</span></div><div class="card-actions"><button data-edit-position="${p.id}">編輯</button><button class="danger-text" data-delete-position="${p.id}">刪除</button></div></div>`).join('')}</div></div>`;}
function bindPositionPage(){document.getElementById('addPosition')?.addEventListener('click',()=>openPositionModal());document.querySelectorAll('[data-edit-position]').forEach(b=>b.addEventListener('click',()=>openPositionModal(state.positions.find(p=>p.id===b.dataset.editPosition))));document.querySelectorAll('[data-delete-position]').forEach(b=>b.addEventListener('click',()=>{const pid=b.dataset.deletePosition;if(confirm('確定刪除此崗位及相關編更？')){state.positions=state.positions.filter(p=>p.id!==pid);state.shifts=state.shifts.filter(s=>s.positionId!==pid);saveState();render();}}));}
function groupPageHTML(){return `<div class="content-page"><div class="page-actions"><div class="page-note">分組可代表工作隊、區域、場地或任何你需要的編更分類。</div><button class="primary-button" id="addGroup">＋ 新增分組</button></div><div class="management-grid">${state.groups.map(g=>`<div class="management-card"><div class="management-card-head"><span class="group-dot large" style="background:${g.color}"></span><div><strong>${esc(g.name)}</strong><small>${esc(state.positions.filter(p=>p.groupId===g.id).map(p=>p.name).join('、')||'未有崗位')}</small></div></div><div class="people-number"><strong>${state.positions.filter(p=>p.groupId===g.id).length}</strong><span>崗位</span></div><div class="card-actions"><button data-edit-group="${g.id}">編輯</button><button class="danger-text" data-delete-group="${g.id}">刪除</button></div></div>`).join('')}</div></div>`;}
function bindGroupPage(){document.getElementById('addGroup')?.addEventListener('click',()=>openGroupModal());document.querySelectorAll('[data-edit-group]').forEach(b=>b.addEventListener('click',()=>openGroupModal(state.groups.find(g=>g.id===b.dataset.editGroup))));document.querySelectorAll('[data-delete-group]').forEach(b=>b.addEventListener('click',()=>{const gid=b.dataset.deleteGroup;if(state.positions.some(p=>p.groupId===gid))return alert('此分組仍有崗位，請先移動或刪除相關崗位。');if(confirm('確定刪除此分組？')){state.groups=state.groups.filter(g=>g.id!==gid);saveState();render();}}));}

function settingsHTML(){return `<div class="content-page settings-stack"><section class="panel"><h2>午膳時間顯示</h2><p>在主更表以垂直色帶顯示午膳／休息時段，方便編更時避開或留意重疊。</p><div class="settings-row"><label class="switch-label"><input id="setLunchEnabled" type="checkbox" ${state.lunch.enabled?'checked':''}>啟用顯示</label><label>開始 <input id="setLunchStart" type="time" value="${formatTime(state.lunch.start)}"></label><label>結束 <input id="setLunchEnd" type="time" value="${formatTime(state.lunch.end)}"></label></div></section><section class="panel danger-panel"><h2>示範資料</h2><p>重設會清除目前瀏覽器儲存的資料，恢復初始示範義工、更表、分組及崗位。</p><button class="danger-button" id="resetData">重設全部資料</button></section></div>`;}
function bindSettings(){for(const [eid,key] of [['setLunchEnabled','enabled'],['setLunchStart','start'],['setLunchEnd','end']])document.getElementById(eid)?.addEventListener('change',e=>{state.lunch[key]=key==='enabled'?e.target.checked:inputTime(e.target.value);saveState();render();});document.getElementById('resetData')?.addEventListener('click',()=>{if(confirm('確定重設全部資料？此操作不可還原。')){state=clone(seed);selectedShiftId=state.shifts[0]?.id||'';localStorage.removeItem(STORAGE_KEY);render();toast('已重設示範資料');}});}

function showModal(title,body,wide=false){
  document.querySelector('.modal-backdrop')?.remove(); const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal ${wide?'wide':''}" role="dialog" aria-modal="true"><div class="modal-header"><h2>${esc(title)}</h2><button class="icon-button modal-close">×</button></div><div class="modal-body">${body}</div></div>`;document.body.appendChild(wrap);wrap.addEventListener('mousedown',e=>{if(e.target===wrap)wrap.remove();});wrap.querySelector('.modal-close').addEventListener('click',()=>wrap.remove());return wrap;
}

function openVolunteerModal(v){
  const x=v||{id:'',name:'',center:'',group:'',phone:'',email:'',availabilityStart:540,availabilityEnd:1080};
  const modal=showModal(v?'編輯義工資料':'新增義工',`<div class="form-grid"><label>姓名<input id="fName" value="${esc(x.name)}"></label><label>所屬中心<input id="fCenter" value="${esc(x.center)}"></label><label>所屬組別<input id="fGroup" value="${esc(x.group)}"></label><label>電話<input id="fPhone" value="${esc(x.phone||'')}"></label><label class="full-field">電郵<input id="fEmail" type="email" value="${esc(x.email||'')}"></label><label>可服務開始<input id="fStart" type="time" value="${formatTime(x.availabilityStart??540)}"></label><label>可服務結束<input id="fEnd" type="time" value="${formatTime(x.availabilityEnd??1080)}"></label></div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveVolunteer">儲存</button></div>`);
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove(); modal.querySelector('#saveVolunteer').onclick=()=>{const name=modal.querySelector('#fName').value.trim();if(!name)return alert('請輸入姓名。');const obj={...x,id:x.id||id('v'),name,center:modal.querySelector('#fCenter').value.trim(),group:modal.querySelector('#fGroup').value.trim(),phone:modal.querySelector('#fPhone').value.trim(),email:modal.querySelector('#fEmail').value.trim(),availabilityStart:inputTime(modal.querySelector('#fStart').value),availabilityEnd:inputTime(modal.querySelector('#fEnd').value)};if(v)state.volunteers=state.volunteers.map(i=>i.id===v.id?obj:i);else state.volunteers.push(obj);saveState();modal.remove();render();toast('義工資料已儲存');};
}

function openGroupModal(g){
  const x=g||{id:'',name:'',color:COLORS[state.groups.length%COLORS.length]};
  const modal=showModal(g?'編輯分組':'新增分組',`<div class="form-stack"><label>分組名稱<input id="gName" value="${esc(x.name)}" placeholder="例如：A組－接待及登記組"></label><label>分組顏色<div class="color-picker-row">${COLORS.map(c=>`<button class="color-swatch ${x.color===c?'selected':''}" data-color="${c}" style="background:${c}"></button>`).join('')}<input id="gColor" type="color" value="${x.color}"></div></label></div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveGroup">儲存</button></div>`);
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove(); modal.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{modal.querySelector('#gColor').value=b.dataset.color;modal.querySelectorAll('.color-swatch').forEach(s=>s.classList.toggle('selected',s===b));});modal.querySelector('#saveGroup').onclick=()=>{const name=modal.querySelector('#gName').value.trim();if(!name)return alert('請輸入分組名稱。');const obj={...x,id:x.id||id('g'),name,color:modal.querySelector('#gColor').value};if(g){state.groups=state.groups.map(i=>i.id===g.id?obj:i);}else state.groups.push(obj);saveState();modal.remove();render();toast('分組已儲存');};
}

function openPositionModal(p){
  if(!state.groups.length)return alert('請先建立至少一個分組。'); const x=p||{id:'',name:'',required:1,groupId:state.groups[0].id,color:state.groups[0].color};
  const modal=showModal(p?'編輯崗位':'新增崗位',`<div class="form-grid"><label>崗位名稱<input id="pName" value="${esc(x.name)}" placeholder="例如：接待處"></label><label>所需人數<input id="pRequired" type="number" min="1" max="99" value="${x.required}"></label><label class="full-field">所屬分組<select id="pGroup">${state.groups.map(g=>`<option value="${g.id}" ${x.groupId===g.id?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label class="full-field">崗位顏色<input id="pColor" type="color" value="${x.color}"></label></div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="savePosition">儲存</button></div>`);
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#pGroup').onchange=e=>{modal.querySelector('#pColor').value=state.groups.find(g=>g.id===e.target.value)?.color||x.color;};modal.querySelector('#savePosition').onclick=()=>{const name=modal.querySelector('#pName').value.trim();if(!name)return alert('請輸入崗位名稱。');const obj={...x,id:x.id||id('p'),name,required:Math.max(1,Number(modal.querySelector('#pRequired').value)||1),groupId:modal.querySelector('#pGroup').value,color:modal.querySelector('#pColor').value};if(p){state.positions=state.positions.map(i=>i.id===p.id?obj:i);for(const s of state.shifts.filter(s=>s.positionId===p.id))s.groupId=obj.groupId;}else state.positions.push(obj);saveState();modal.remove();render();toast('崗位已儲存');};
}

function openShiftModal(s,defaultPositionId,defaultStart){
  if(!state.volunteers.length)return alert('請先新增或匯入義工。');if(!state.positions.length)return alert('請先新增崗位。');
  const positionId=s?.positionId||defaultPositionId||state.positions[0].id,pos=state.positions.find(p=>p.id===positionId),start=s?.start??defaultStart??540;
  const x=s||{id:'',volunteerId:state.volunteers[0].id,positionId,groupId:pos.groupId,start,end:Math.min(start+180,DAY_END)};
  const modal=showModal(s?'編輯班次':'新增編更',`<div class="form-grid"><label class="full-field">義工<select id="sVolunteer">${state.volunteers.map(v=>`<option value="${v.id}" ${x.volunteerId===v.id?'selected':''}>${esc(v.name)}｜${esc(v.center)}｜${esc(v.group)}</option>`).join('')}</select></label><label class="full-field">崗位<select id="sPosition">${state.positions.map(p=>`<option value="${p.id}" ${x.positionId===p.id?'selected':''}>${esc(state.groups.find(g=>g.id===p.groupId)?.name||'')}｜${esc(p.name)}</option>`).join('')}</select></label><label>開始時間<input id="sStart" type="time" min="08:00" max="18:00" step="900" value="${formatTime(x.start)}"></label><label>結束時間<input id="sEnd" type="time" min="08:00" max="18:00" step="900" value="${formatTime(x.end)}"></label></div><div class="modal-actions"><button class="secondary-button modal-cancel">取消</button><button class="primary-button" id="saveShift">儲存班次</button></div>`);
  modal.querySelector('.modal-cancel').onclick=()=>modal.remove();modal.querySelector('#saveShift').onclick=()=>{const st=inputTime(modal.querySelector('#sStart').value),en=inputTime(modal.querySelector('#sEnd').value);if(en<=st)return alert('結束時間必須遲於開始時間。');const pid=modal.querySelector('#sPosition').value,p=state.positions.find(p=>p.id===pid),obj={...x,id:x.id||id('s'),volunteerId:modal.querySelector('#sVolunteer').value,positionId:pid,groupId:p.groupId,start:st,end:en};if(s)state.shifts=state.shifts.map(i=>i.id===s.id?obj:i);else state.shifts.push(obj);selectedShiftId=obj.id;saveState();modal.remove();render();toast('班次已儲存');};
}

function openImportModal(){
  let parsed=[];
  const modal=showModal('Excel 匯入義工資料',`<div class="import-toolbar"><button class="secondary-button" id="downloadTemplate">⇩ 下載 Excel/CSV 範本</button></div><div class="import-note">▤ 支援 <strong>.xlsx</strong> 及 <strong>.csv</strong>。欄位：姓名、所屬中心、所屬組別、電話、電郵、可服務開始、可服務結束。</div><div class="file-drop"><strong>選擇義工資料檔案</strong>系統會先顯示匯入預覽，不會立即寫入資料。<br><input id="importFile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div><div id="importStatus"></div><div id="importPreview"></div>`,true);
  modal.querySelector('#downloadTemplate').onclick=downloadTemplateCSV;
  modal.querySelector('#importFile').onchange=async e=>{const file=e.target.files?.[0];if(!file)return;const status=modal.querySelector('#importStatus'),preview=modal.querySelector('#importPreview');status.innerHTML=`<p class="file-name">正在讀取：${esc(file.name)}…</p>`;preview.innerHTML='';try{const rows=await readSpreadsheet(file);parsed=convertVolunteers(rows);if(!parsed.length)throw new Error('找不到「姓名」欄位或沒有可匯入資料。');status.innerHTML=`<div class="preview-heading"><strong>匯入預覽</strong><span>${parsed.length} 位義工</span></div>`;preview.innerHTML=`<div class="table-wrap import-preview"><table><thead><tr><th>姓名</th><th>所屬中心</th><th>所屬組別</th><th>電話</th><th>電郵</th></tr></thead><tbody>${parsed.slice(0,10).map(v=>`<tr><td>${esc(v.name)}</td><td>${esc(v.center||'—')}</td><td>${esc(v.group||'—')}</td><td>${esc(v.phone||'—')}</td><td>${esc(v.email||'—')}</td></tr>`).join('')}</tbody></table></div><div class="modal-actions"><button class="secondary-button modal-cancel2">取消</button><button class="primary-button" id="confirmImport">確認匯入 ${parsed.length} 位</button></div>`;preview.querySelector('.modal-cancel2').onclick=()=>modal.remove();preview.querySelector('#confirmImport').onclick=()=>{state.volunteers.push(...parsed);saveState();modal.remove();render();toast(`已匯入 ${parsed.length} 位義工`);};}catch(err){status.innerHTML=`<div class="error-box">${esc(err.message||'無法讀取檔案')}</div>`;}};
}

function downloadTemplateCSV(){
  const rows=[['姓名','所屬中心','所屬組別','電話','電郵','可服務開始','可服務結束'],['陳大文','社區中心A','青年組','91234567','example@email.com','09:00','18:00']];
  downloadBlob(new Blob(['\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'義工資料匯入範本.csv');
}
function exportScheduleCSV(){
  const header=['日期','義工姓名','所屬中心','所屬組別','編更分組','崗位','開始時間','結束時間','服務時數'];
  const rows=state.shifts.map(s=>{const v=state.volunteers.find(x=>x.id===s.volunteerId),p=state.positions.find(x=>x.id===s.positionId),g=state.groups.find(x=>x.id===s.groupId);return [eventDate,v?.name||'',v?.center||'',v?.group||'',g?.name||'',p?.name||'',formatTime(s.start),formatTime(s.end),hours(s.start,s.end).toFixed(2)];});
  downloadBlob(new Blob(['\ufeff'+[header,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),`義工更表_${eventDate}.csv`);
}

const aliases={name:['姓名','義工姓名','Name','name'],center:['所屬中心','中心','Center','center'],group:['所屬組別','組別','Group','group'],phone:['電話','聯絡電話','Phone','phone'],email:['電郵','Email','email'],availabilityStart:['可服務開始','可服務開始時間','開始時間','Available Start'],availabilityEnd:['可服務結束','可服務結束時間','結束時間','Available End']};
function pick(row,key){const k=aliases[key].find(a=>Object.prototype.hasOwnProperty.call(row,a));return k?row[k]:'';}
function convertVolunteers(rows){return rows.map((row,i)=>({id:id(`vimp${i}`),name:String(pick(row,'name')??'').trim(),center:String(pick(row,'center')??'').trim(),group:String(pick(row,'group')??'').trim(),phone:String(pick(row,'phone')??'').trim(),email:String(pick(row,'email')??'').trim(),availabilityStart:parseTime(pick(row,'availabilityStart'),480),availabilityEnd:parseTime(pick(row,'availabilityEnd'),1080)})).filter(v=>v.name);}

async function readSpreadsheet(file){
  const lower=file.name.toLowerCase(); if(lower.endsWith('.csv'))return parseCSV(await file.text()); if(lower.endsWith('.xlsx'))return parseXLSX(await file.arrayBuffer()); throw new Error('目前支援 .xlsx 或 .csv。舊式 .xls 請先另存為 .xlsx。');
}
function parseCSV(text){
  text=text.replace(/^\ufeff/,''); const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(q){if(c==='"'&&text[i+1]==='"'){cell+='"';i++;}else if(c==='"')q=false;else cell+=c;}else{if(c==='"')q=true;else if(c===','){row.push(cell);cell='';}else if(c==='\n'){row.push(cell.replace(/\r$/,''));rows.push(row);row=[];cell='';}else cell+=c;}}
  if(cell||row.length){row.push(cell);rows.push(row);} const header=(rows.shift()||[]).map(x=>String(x).trim());return rows.filter(r=>r.some(x=>String(x).trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,r[i]??''])));
}

async function parseXLSX(buffer){
  const files=await unzipXlsx(buffer); const decoder=new TextDecoder('utf-8');
  const xml=name=>{const bytes=files.get(name);return bytes?decoder.decode(bytes):'';};
  let shared=[]; const sharedXml=xml('xl/sharedStrings.xml'); if(sharedXml){const doc=new DOMParser().parseFromString(sharedXml,'application/xml');shared=[...doc.querySelectorAll('si')].map(si=>[...si.querySelectorAll('t')].map(t=>t.textContent||'').join(''));}
  let sheetPath='xl/worksheets/sheet1.xml'; const wbXml=xml('xl/workbook.xml'),relsXml=xml('xl/_rels/workbook.xml.rels');
  if(wbXml&&relsXml){const wb=new DOMParser().parseFromString(wbXml,'application/xml'),rels=new DOMParser().parseFromString(relsXml,'application/xml'),sheet=wb.querySelector('sheet');const rid=sheet?.getAttribute('r:id')||sheet?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');if(rid){const rel=[...rels.querySelectorAll('Relationship')].find(r=>r.getAttribute('Id')===rid),target=rel?.getAttribute('Target');if(target)sheetPath=target.startsWith('/')?target.slice(1):`xl/${target.replace(/^\.\//,'')}`;}}
  const sheetXml=xml(sheetPath); if(!sheetXml)throw new Error('無法讀取 Excel 第一個工作表。');
  const doc=new DOMParser().parseFromString(sheetXml,'application/xml'),grid=[];
  for(const c of doc.querySelectorAll('sheetData c')){const ref=c.getAttribute('r')||'',m=ref.match(/^([A-Z]+)(\d+)$/);if(!m)continue;const col=lettersToIndex(m[1]),row=Number(m[2])-1,t=c.getAttribute('t');let value='';if(t==='inlineStr')value=[...c.querySelectorAll('is t')].map(n=>n.textContent||'').join('');else{const raw=c.querySelector('v')?.textContent??'';value=t==='s'?(shared[Number(raw)]??''):raw;}if(!grid[row])grid[row]=[];grid[row][col]=value;}
  const rows=grid.filter(Boolean);if(!rows.length)return[];const header=(rows.shift()||[]).map(x=>String(x??'').trim());return rows.filter(r=>r?.some(x=>String(x??'').trim())).map(r=>Object.fromEntries(header.map((h,i)=>[h,r?.[i]??''])));
}
function lettersToIndex(s){let n=0;for(const c of s)n=n*26+(c.charCodeAt(0)-64);return n-1;}
async function unzipXlsx(buffer){
  const data=new Uint8Array(buffer),view=new DataView(buffer);let eocd=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){if(view.getUint32(i,true)===0x06054b50){eocd=i;break;}}if(eocd<0)throw new Error('Excel 檔案不是有效的 XLSX 壓縮格式。');
  const entries=view.getUint16(eocd+10,true),centralOffset=view.getUint32(eocd+16,true);let ptr=centralOffset;const files=new Map(),decoder=new TextDecoder();
  for(let i=0;i<entries;i++){
    if(view.getUint32(ptr,true)!==0x02014b50)break;const method=view.getUint16(ptr+10,true),compSize=view.getUint32(ptr+20,true),nameLen=view.getUint16(ptr+28,true),extraLen=view.getUint16(ptr+30,true),commentLen=view.getUint16(ptr+32,true),localOffset=view.getUint32(ptr+42,true),name=decoder.decode(data.slice(ptr+46,ptr+46+nameLen));
    const localNameLen=view.getUint16(localOffset+26,true),localExtraLen=view.getUint16(localOffset+28,true),start=localOffset+30+localNameLen+localExtraLen,compressed=data.slice(start,start+compSize);let content;
    if(method===0)content=compressed;else if(method===8)content=await inflateRaw(compressed);else throw new Error(`Excel 內含不支援的壓縮方式：${method}`);files.set(name,content);ptr+=46+nameLen+extraLen+commentLen;
  }
  return files;
}
async function inflateRaw(bytes){
  if(typeof DecompressionStream==='undefined')throw new Error('此瀏覽器不支援直接讀取 XLSX，請改用最新版 Chrome / Edge，或另存為 CSV。');
  try{const ds=new DecompressionStream('deflate-raw');const stream=new Blob([bytes]).stream().pipeThrough(ds);return new Uint8Array(await new Response(stream).arrayBuffer());}catch{throw new Error('解壓 XLSX 失敗；可嘗試將檔案另存為 CSV 後匯入。');}
}

render();
