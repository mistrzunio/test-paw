const clockEl = document.getElementById('clock');
const tzSelect = document.getElementById('tz');
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const monthsContainer = document.getElementById('monthsContainer');
const settingsPanel = document.getElementById('settings');
const openSettingsBtn = document.getElementById('openSettings');
const closeSettingsBtn = document.getElementById('closeSettings');

let currentDate = new Date();
let selectedTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

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

function updateClock(){
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:selectedTZ});
  clockEl.textContent = fmt.format(now);
}

// Render a single month element for a given year/month
function renderMonth(year, month){
  const monthEl = document.createElement('div');
  monthEl.className = 'month';
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
    row.appendChild(td);
  }
  while(row.children.length<7){const td=document.createElement('td');td.textContent='';row.appendChild(td)}
  tbody.appendChild(row);
  table.appendChild(tbody);
  monthEl.appendChild(table);
  return monthEl;
}

// Infinite months buffer management
const MONTH_BUFFER = 6; // number of months before/after current to keep
let earliest = new Date(currentDate.getFullYear(), currentDate.getMonth()-MONTH_BUFFER, 1);
let latest = new Date(currentDate.getFullYear(), currentDate.getMonth()+MONTH_BUFFER, 1);
const MAX_MONTHS = 30; // keep DOM bounded to this many month elements

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

// navigation buttons removed; using infinite scroll instead

// timezone change (guarded) - re-render months buffer when timezone changes
if(tzSelect){
  tzSelect.addEventListener('change', e => {
    selectedTZ = e.target.value;
    localStorage.setItem('selectedTZ', selectedTZ);
    updateClock();
    // re-render months to update 'today' marking in the new timezone
    if(typeof initMonths === 'function' && monthsContainer) initMonths();
  });
}

// settings open/close
if(openSettingsBtn){
  openSettingsBtn.addEventListener('click', ()=>{
    settingsPanel.style.display = '';
    settingsPanel.setAttribute('aria-hidden','false');
  });
}
if(closeSettingsBtn){
  closeSettingsBtn.addEventListener('click', ()=>{
    settingsPanel.style.display = 'none';
    settingsPanel.setAttribute('aria-hidden','true');
  });
}

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
  updateClock();
  setInterval(updateClock,1000);
  
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
