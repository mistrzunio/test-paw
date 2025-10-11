
import { pad, randomAccent, tzNow as getTzNow, formatMonthTitle } from './utils.js';
import { loadNotables, saveNotables } from './storage.js';
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const monthsContainer = document.getElementById('monthsContainer');
// settings removed
const todayBtn = document.getElementById('todayBtn');

let currentDate = new Date();
let selectedTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
let notables = [];

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
  rem.addEventListener('click', ()=>{ notables.splice(idx,1); saveNotables(notables); renderNotables(); });
    // apply accent color via CSS variable
    pill.style.setProperty('--accent', it.color);
    pill.appendChild(label); pill.appendChild(daysEl); pill.appendChild(rem);
    container.appendChild(pill);
  });
}

// timezone selector UI was removed; selectedTZ is still respected if previously saved

// clock removed; using notables list instead

// Render a single month element for a given year/month
function renderMonth(year, month){
  const monthEl = document.createElement('div');
  monthEl.className = 'month';
  monthEl.dataset.year = year;
  monthEl.dataset.month = month;
  const monthTitle = formatMonthTitle(year, month);
  const h3 = document.createElement('h3'); h3.textContent = monthTitle;
  monthEl.appendChild(h3);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  // start week on Monday
  ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{const th=document.createElement('th');th.textContent=d;headerRow.appendChild(th)});
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  // compute first day index with Monday as the first column (0=Mon ... 6=Sun)
  let firstDay = new Date(year,month,1).getDay(); // JS: 0=Sun..6=Sat
  firstDay = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year,month+1,0).getDate();

  let row = document.createElement('tr');
  for(let i=0;i<firstDay;i++){const td=document.createElement('td');td.textContent='';row.appendChild(td)}

  for(let d=1;d<=daysInMonth;d++){
    if(row.children.length===7){tbody.appendChild(row);row=document.createElement('tr')}
    const td = document.createElement('td'); td.textContent = d;
    // mark notable days (user-defined dates and certain rules like 'newyear'), skip default 'weekend' rule
    try{
      const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
      // exact date match
      let notable = notables.find(it => it.type === 'date' && it.date === dateStr);
      // rule-based matches (only newyear for now; skip 'weekend')
      if(!notable){
        const nyRule = notables.find(it => it.type === 'rule' && it.id === 'newyear');
        if(nyRule && month === 0 && d === 1) notable = nyRule;
      }
      if(notable){
        // ensure color exists
        if(!notable.color) notable.color = randomAccent();
        td.classList.add('notable');
        td.style.setProperty('--notable-accent', notable.color);
      }
    }catch(e){ /* ignore */ }
    // mark today according to selectedTZ
  const local = getTzNow(selectedTZ);
    if(local.getFullYear()===year && local.getMonth()===month && local.getDate()===d){
      td.classList.add('today');
    }
    // make day clickable to add notable
    td.classList.add('clickable');
    td.dataset.day = d;
    td.addEventListener('click', (e)=>{
      e.stopPropagation();
      // open modal to request label instead of using prompt()
      openNotableModal(year, month, d, td);
    });
    row.appendChild(td);
  }
  while(row.children.length<7){const td=document.createElement('td');td.textContent='';row.appendChild(td)}
  tbody.appendChild(row);
  table.appendChild(tbody);
  monthEl.appendChild(table);
  return monthEl;
}

// Modal handling for adding notables
const modal = document.getElementById('notableModal');
const modalInput = document.getElementById('modalLabel');
const modalOk = document.getElementById('modalOk');
const modalCancel = document.getElementById('modalCancel');
let modalContext = null; // {year, month, day, cell}
let _modalKeyHandler = null;

function openNotableModal(year, month, day, cell){
  modalContext = {year, month, day, cell};
  modal.setAttribute('aria-hidden','false');
  modal.style.display = 'flex';
  modalInput.value = '';
  // small timeout to avoid iOS restoring keyboard before styles apply
  setTimeout(()=>modalInput.focus(), 50);
  // attach keyboard handler to support Enter, Escape and Tab focus trap
  _modalKeyHandler = function(e){
    // Escape -> close
    if(e.key === 'Escape'){
      e.preventDefault();
      closeNotableModal();
      return;
    }
    // Enter -> submit when focus is in input (or anywhere in modal)
    if(e.key === 'Enter'){
      // Prevent accidental form submits elsewhere
      e.preventDefault();
      modalOk.click();
      return;
    }
    // Tab -> trap focus inside modal
    if(e.key === 'Tab'){
      const modalCard = modal.querySelector('.modal-card');
      if(!modalCard) return;
      const focusable = Array.from(modalCard.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.disabled && el.offsetParent !== null);
      if(focusable.length === 0) return;
      const idx = focusable.indexOf(document.activeElement);
      const direction = e.shiftKey ? -1 : 1;
      let next = 0;
      if(idx === -1){
        next = 0;
      } else {
        next = (idx + direction + focusable.length) % focusable.length;
      }
      e.preventDefault();
      focusable[next].focus();
    }
  };
  document.addEventListener('keydown', _modalKeyHandler);
}

function closeNotableModal(){
  modalContext = null;
  modal.setAttribute('aria-hidden','true');
  modal.style.display = 'none';
  try{ modalInput.blur(); }catch(e){}
  if(_modalKeyHandler){
    document.removeEventListener('keydown', _modalKeyHandler);
    _modalKeyHandler = null;
  }
}

modalCancel.addEventListener('click', ()=>{ closeNotableModal(); });
modalOk.addEventListener('click', ()=>{
  if(!modalContext) return;
  const label = modalInput.value.trim();
  if(!label) return;
  const {year, month, day, cell} = modalContext;
  const dateStr = `${year}-${pad(month+1)}-${pad(day)}`;
  notables.push({type:'date', date:dateStr, label});
  saveNotables(notables);
  renderNotables();
  // re-render calendar months to mark the new notable immediately
  if(typeof initMonths === 'function' && monthsContainer) initMonths();
  // add visual flash on the originating cell if still in DOM
  if(cell) cell.classList.add('today-flash');
  setTimeout(()=>{ if(cell) cell.classList.remove('today-flash') },1400);
  closeNotableModal();
});

// close modal on backdrop click
modal.addEventListener('click', (e)=>{ if(e.target === modal) closeNotableModal(); });


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
  const nowTz = getTzNow(selectedTZ);
  const targetYear = nowTz.getFullYear();
  const targetMonth = nowTz.getMonth();
  const targetDate = nowTz.getDate();

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

// timezone UI removed — selectedTZ can still be set via localStorage if present

// settings open/close
// settings handlers removed

// init
(function init(){
  const saved = localStorage.getItem('selectedTZ');
  if(saved) selectedTZ = saved;
  // load notables first so initial months render can mark notable cells
  notables = loadNotables();
  // build initial months buffer
  if(monthsContainer){
    initMonths();
    monthsContainer.addEventListener('scroll', onMonthsScroll);
  }
  if(todayBtn){
    todayBtn.addEventListener('click', goToToday);
  }
  // render notable list
  renderNotables();
    // refresh notables every minute to update counts
    setInterval(renderNotables,60*1000);
  
  // Hide the hint paragraph when running as an installed PWA / standalone
  const hint = document.querySelector('.hint');
  function isStandalone(){
    return 
  }
  function updateHintVisibility(){
    if(!hint) return;
    hint.style.display = isStandalone() ? 'none' : '';
  }
  // initial
  updateHintVisibility();
  // ensure modal is hidden on load to avoid Mobile Safari restoring it
  try{ if(modal){ modal.setAttribute('aria-hidden','true'); modal.style.display = 'none'; } if(document.activeElement) document.activeElement.blur(); }catch(e){}
  // listen for display-mode change
  if(window.matchMedia){
    window.matchMedia('(display-mode: standalone)').addEventListener('change', updateHintVisibility);
  }
  // some platforms set navigator.standalone when installed (iOS)
  window.addEventListener('resize', updateHintVisibility);

  if('serviceWorker' in navigator){
    // window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    navigator.serviceWorker.register('/howmanydays/sw.js').then(()=>console.log('sw registered')).catch(console.error);
  }
})();
