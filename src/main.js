const tzSelect = document.getElementById('tz');
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const monthsContainer = document.getElementById('monthsContainer');
// settings removed
const todayBtn = document.getElementById('todayBtn');

let currentDate = new Date();
let selectedTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let notables = [];

function pad(n){return n<10? '0'+n: String(n)}

function randomAccent(){
  // pick very light, low-saturation pastel with alpha for subtle background
  const h = Math.floor(Math.random()*360);
  const s = 30; // lower saturation for subtlety
  const l = 94; // very light
  const a = 0.54; // low alpha
  // return as HSL with alpha (CSS color syntax)
  return `hsl(${h} ${s}% ${l}% / ${a})`;
}

function loadNotables(){
  try{
    const raw = localStorage.getItem('notables');
    if(raw){ notables = JSON.parse(raw); }
  }catch(e){notables = []}
  if(!Array.isArray(notables) || notables.length===0){
    // defaults: weekend and new year (rules)
    notables = [
      {type:'rule', id:'weekend', label:'Weekend', color: randomAccent()},
      {type:'rule', id:'newyear', label:'New Year', color: randomAccent()}
    ];
    saveNotables();
  }
  // backfill missing colors
  let changed = false;
  for(const it of notables){ if(!it.color){ it.color = randomAccent(); changed = true } }
  if(changed) saveNotables();
}

function saveNotables(){
  localStorage.setItem('notables', JSON.stringify(notables));
}

function computeDaysLeft(item){
  // get today's date in selected timezone
  const tzNowStr = new Date().toLocaleString('en-US',{timeZone:selectedTZ});
  const tzNow = new Date(tzNowStr);
  const today = new Date(tzNow.getFullYear(), tzNow.getMonth(), tzNow.getDate());
  const MS_DAY = 24*60*60*1000;
  if(item.type === 'date'){
    const parts = item.date.split('-').map(Number);
    const target = new Date(parts[0], parts[1]-1, parts[2]);
    const diff = Math.ceil((target - today)/MS_DAY);
    return diff;
  }
  if(item.type === 'rule'){
    if(item.id === 'weekend'){
      const day = today.getDay(); // 0=Sun..6=Sat
      // next Saturday as start of weekend
      const daysUntilSat = (6 - day + 7) % 7;
      return daysUntilSat;
    }
    if(item.id === 'newyear'){
      const year = today.getFullYear();
      const nextNY = new Date(year + (today.getMonth()===0 && today.getDate()===1 ? 0 : 1),0,1);
      const diff = Math.ceil((nextNY - today)/MS_DAY);
      return diff;
    }
  }
  return null;
}

function renderNotables(){
  const container = document.getElementById('notableList');
  if(!container) return;
  // Preserve the actions block (Today button) if present, then clear the rest
  const actions = container.querySelector('.notable-actions');
  // Remove existing children but keep a reference to actions so we can re-append it
  container.innerHTML = '';
  if(actions) container.appendChild(actions);
  notables.forEach((it,idx)=>{
    const days = computeDaysLeft(it);
    const pill = document.createElement('div'); pill.className = 'notable-pill';
    // ensure color
    if(!it.color) it.color = randomAccent();
    const label = document.createElement('div'); label.className='label'; label.textContent = it.label + ': ';
    const daysEl = document.createElement('div'); daysEl.className='days';
    if(days===0) daysEl.textContent = 'Today';
    else if(days>0) daysEl.textContent = `${days}d`;
    else daysEl.textContent = `${Math.abs(days)} days ago`;
    const rem = document.createElement('button'); rem.className='remove'; rem.textContent='✕';
    rem.addEventListener('click', ()=>{ notables.splice(idx,1); saveNotables(); renderNotables(); });
    // apply accent color via CSS variable
    pill.style.setProperty('--accent', it.color);
    pill.appendChild(label); pill.appendChild(daysEl); pill.appendChild(rem);
    container.appendChild(pill);
  });
}

function populateTimezones(){
  // Minimal list to avoid huge DOM — add common zones
  const zones = ['UTC','Europe/London','Europe/Warsaw','America/New_York','America/Los_Angeles','Asia/Tokyo','Asia/Kolkata'];
  for(const z of zones){
    const opt = document.createElement('option');
    opt.value = z; opt.textContent = z;
    if(z===selectedTZ) opt.selected = true;
    if(tzSelect) tzSelect.appendChild(opt);
  }
}

// clock removed; using notables list instead

// Render a single month element for a given year/month
function renderMonth(year, month){
  const monthEl = document.createElement('div');
  monthEl.className = 'month';
  monthEl.dataset.year = year;
  monthEl.dataset.month = month;
  const monthTitle = new Date(year, month, 1).toLocaleString(undefined,{month:'long',year:'numeric'});
  const h3 = document.createElement('h3'); h3.textContent = monthTitle;
  monthEl.appendChild(h3);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{const th=document.createElement('th');th.textContent=d;headerRow.appendChild(th)});
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();

  let row = document.createElement('tr');
  for(let i=0;i<firstDay;i++){const td=document.createElement('td');td.textContent='';row.appendChild(td)}

  for(let d=1;d<=daysInMonth;d++){
    if(row.children.length===7){tbody.appendChild(row);row=document.createElement('tr')}
    const td = document.createElement('td'); td.textContent = d;
    // mark today according to selectedTZ
    const tzNow = new Date().toLocaleString('en-US',{timeZone:selectedTZ});
    const local = new Date(tzNow);
    if(local.getFullYear()===year && local.getMonth()===month && local.getDate()===d){
      td.classList.add('today');
    }
    // make day clickable to add notable
    td.classList.add('clickable');
    td.dataset.day = d;
    td.addEventListener('click', (e)=>{
      e.stopPropagation();
      const label = prompt('Label for notable day (leave empty to cancel):');
      if(!label) return;
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
      notables.push({type:'date', date:dateStr, label:label});
      saveNotables();
      renderNotables();
      // add a quick visual mark to the cell
      td.classList.add('today-flash');
      setTimeout(()=>td.classList.remove('today-flash'),1400);
    });
    row.appendChild(td);
  }
  while(row.children.length<7){const td=document.createElement('td');td.textContent='';row.appendChild(td)}
  tbody.appendChild(row);
  table.appendChild(tbody);
  monthEl.appendChild(table);
  return monthEl;
}

// Infinite months buffer management
const MONTH_BUFFER_BACK = 3; // number of months before current to keep
const MONTH_BUFFER_FWD = 12; // number of months after current to keep
let earliest = new Date(currentDate.getFullYear(), currentDate.getMonth()-MONTH_BUFFER_BACK, 1);
let latest = new Date(currentDate.getFullYear(), currentDate.getMonth()+MONTH_BUFFER_FWD, 1);
const MAX_MONTHS = 300; // keep DOM bounded to this many month elements

function initMonths(){
  monthsContainer.innerHTML = '';
  // populate months from earliest to latest but cap at MAX_MONTHS
  const start = new Date(earliest.getFullYear(), earliest.getMonth(), 1);
  let m = new Date(start);
  let count = 0;
  while(m <= latest && count < MAX_MONTHS){
    monthsContainer.appendChild(renderMonth(m.getFullYear(), m.getMonth()));
    m = new Date(m.getFullYear(), m.getMonth()+1, 1);
    count++;
  }
  // adjust 'latest' to reflect actual rendered months
  if(count>0){
    const last = monthsContainer.lastChild.querySelector('h3').textContent;
    // compute latest from the last child's text by parsing month/year
    const parsed = new Date(last);
    if(!isNaN(parsed)){
      latest = new Date(parsed.getFullYear(), parsed.getMonth(), 1);
    }
  }
  // scroll to the current month roughly in the middle
  // find index of current month
  const children = Array.from(monthsContainer.children);
  const idx = children.findIndex(c => c.querySelector('h3').textContent.includes(currentDate.toLocaleString(undefined,{month:'long',year:'numeric'})));
  if(idx>-1){
    const el = children[idx];
    // center element
    el.scrollIntoView({block:'center'});
  }
}

function prependMonth(){
  earliest = new Date(earliest.getFullYear(), earliest.getMonth()-1, 1);
  const el = renderMonth(earliest.getFullYear(), earliest.getMonth());
  monthsContainer.insertBefore(el, monthsContainer.firstChild);
  pruneMonthsIfNeeded();
}

function appendMonth(){
  latest = new Date(latest.getFullYear(), latest.getMonth()+1, 1);
  const el = renderMonth(latest.getFullYear(), latest.getMonth());
  monthsContainer.appendChild(el);
  pruneMonthsIfNeeded();
}

function pruneMonthsIfNeeded(){
  if(!monthsContainer) return;
  const children = monthsContainer.children;
  if(children.length <= MAX_MONTHS) return;

  // If too many months, remove from the far side depending on scroll position
  // If user is near top, remove from bottom; if near bottom, remove from top; otherwise remove both ends evenly.
  const scrollTop = monthsContainer.scrollTop;
  const nearTop = scrollTop < monthsContainer.clientHeight;
  const nearBottom = monthsContainer.scrollHeight - monthsContainer.clientHeight - scrollTop < monthsContainer.clientHeight;

  if(nearTop){
    // remove from bottom until under limit
    while(monthsContainer.children.length > MAX_MONTHS){
      monthsContainer.removeChild(monthsContainer.lastChild);
      // adjust latest pointer backward
      latest = new Date(latest.getFullYear(), latest.getMonth()-1, 1);
    }
  } else if(nearBottom){
    // remove from top and adjust scrollTop to avoid jump
    let removedHeight = 0;
    while(monthsContainer.children.length > MAX_MONTHS){
      const first = monthsContainer.firstChild;
      removedHeight += first.getBoundingClientRect().height;
      monthsContainer.removeChild(first);
      earliest = new Date(earliest.getFullYear(), earliest.getMonth()+1, 1);
    }
    // adjust scroll to account for removed height so visual position is stable
    monthsContainer.scrollTop = Math.max(0, monthsContainer.scrollTop - removedHeight);
  } else {
    // balanced removal: remove half from top and half from bottom
    const toRemove = monthsContainer.children.length - MAX_MONTHS;
    const removeTop = Math.ceil(toRemove/2);
    let removedHeight = 0;
    for(let i=0;i<removeTop;i++){
      const first = monthsContainer.firstChild;
      removedHeight += first.getBoundingClientRect().height;
      monthsContainer.removeChild(first);
      earliest = new Date(earliest.getFullYear(), earliest.getMonth()+1, 1);
    }
    for(let i=0;i<toRemove-removeTop;i++){
      monthsContainer.removeChild(monthsContainer.lastChild);
      latest = new Date(latest.getFullYear(), latest.getMonth()-1, 1);
    }
    monthsContainer.scrollTop = Math.max(0, monthsContainer.scrollTop - removedHeight);
  }
}

// attach scroll listener to keep buffer
function onMonthsScroll(){
  const threshold = 200; // px
  if(monthsContainer.scrollTop < threshold){
    // near top, prepend several months to keep buffer
    for(let i=0;i<3;i++) prependMonth();
  }
  if(monthsContainer.scrollHeight - monthsContainer.clientHeight - monthsContainer.scrollTop < threshold){
    for(let i=0;i<3;i++) appendMonth();
  }
}

// scroll to current month/day and flash today's cell
function goToToday(){
  if(!monthsContainer) return;
  const now = new Date();
  // use selectedTZ to compute today's year/month/day in that TZ
  const tzNowStr = new Date().toLocaleString('en-US',{timeZone:selectedTZ});
  const tzNow = new Date(tzNowStr);
  const targetYear = tzNow.getFullYear();
  const targetMonth = tzNow.getMonth();
  const targetDate = tzNow.getDate();

  // find matching month element
  const children = Array.from(monthsContainer.children);
  let targetEl = children.find(c => Number(c.dataset.year)===targetYear && Number(c.dataset.month)===targetMonth);
  if(!targetEl){
    // if not present, try appending months until it's within buffer
    let tries = 0;
    while(!targetEl && tries<120){ // safety cap
      appendMonth();
      tries++;
      targetEl = Array.from(monthsContainer.children).find(c=>Number(c.dataset.year)===targetYear && Number(c.dataset.month)===targetMonth);
    }
  }
  if(targetEl){
    targetEl.scrollIntoView({block:'center'});
    // highlight the date cell if present
    const cell = targetEl.querySelector(`td:nth-child(n)`); // placeholder
    // locate the cell with the date text
    const tds = targetEl.querySelectorAll('td');
    for(const td of tds){
      if(td.textContent.trim() === String(targetDate)){
        td.classList.add('today-flash');
        setTimeout(()=>td.classList.remove('today-flash'), 1800);
        break;
      }
    }
  }
}

// navigation buttons removed; using infinite scroll instead

// timezone change (guarded) - re-render months buffer when timezone changes
if(tzSelect){
  tzSelect.addEventListener('change', e => {
    selectedTZ = e.target.value;
    localStorage.setItem('selectedTZ', selectedTZ);
    // re-render months to update 'today' marking in the new timezone
    if(typeof initMonths === 'function' && monthsContainer) initMonths();
    renderNotables();
  });
}

// settings open/close
// settings handlers removed

// init
(function init(){
  const saved = localStorage.getItem('selectedTZ');
  if(saved) selectedTZ = saved;
  populateTimezones();
  // build initial months buffer
  if(monthsContainer){
    initMonths();
    monthsContainer.addEventListener('scroll', onMonthsScroll);
  }
  if(todayBtn){
    todayBtn.addEventListener('click', goToToday);
  }
    // load and render notable days
    loadNotables();
    renderNotables();
    // refresh notables every minute to update counts
    setInterval(renderNotables,60*1000);
  
  // Hide the hint paragraph when running as an installed PWA / standalone
  const hint = document.querySelector('.hint');
  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }
  function updateHintVisibility(){
    if(!hint) return;
    hint.style.display = isStandalone() ? 'none' : '';
  }
  // initial
  updateHintVisibility();
  // listen for display-mode change
  if(window.matchMedia){
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateHintVisibility);
  }
  // some platforms set navigator.standalone when installed (iOS)
  window.addEventListener('resize', updateHintVisibility);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(()=>console.log('sw registered')).catch(console.error);
  }
})();
