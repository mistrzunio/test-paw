const clockEl = document.getElementById('clock');
const tzSelect = document.getElementById('tz');
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
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
    tzSelect.appendChild(opt);
  }
}

function updateClock(){
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:selectedTZ});
  clockEl.textContent = fmt.format(now);
}

function buildCalendar(date){
  // Show month containing `date`
  const year = date.getFullYear();
  const month = date.getMonth();
  monthYearEl.textContent = date.toLocaleString(undefined,{month:'long',year:'numeric'});

  // Build header
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>{const th=document.createElement('th');th.textContent=d;headerRow.appendChild(th)});
  head.appendChild(headerRow);

  const body = document.createElement('tbody');
  const firstDay = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();

  let row = document.createElement('tr');
  // empty cells before first day
  for(let i=0;i<firstDay;i++){const td=document.createElement('td');td.textContent='';row.appendChild(td)}

  for(let day=1;day<=daysInMonth;day++){
    if(row.children.length===7){body.appendChild(row);row=document.createElement('tr')}
    const td = document.createElement('td');
    td.textContent = day;

    // mark today in selected timezone
    const tzNow = new Date().toLocaleString('en-US',{timeZone:selectedTZ});
    const local = new Date(tzNow);
    if(local.getFullYear()===year && local.getMonth()===month && local.getDate()===day){
      td.classList.add('today');
    }

    row.appendChild(td);
  }

  // fill last row
  while(row.children.length<7){const td=document.createElement('td');td.textContent='';row.appendChild(td)}
  body.appendChild(row);

  // replace calendar
  calendarEl.innerHTML = '';
  calendarEl.appendChild(head);
  calendarEl.appendChild(body);
}

// navigation
prevBtn.addEventListener('click',()=>{currentDate = new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1);buildCalendar(currentDate)});
nextBtn.addEventListener('click',()=>{currentDate = new Date(currentDate.getFullYear(),currentDate.getMonth()+1,1);buildCalendar(currentDate)});

// timezone change
tzSelect.addEventListener('change',e=>{selectedTZ = e.target.value;localStorage.setItem('selectedTZ',selectedTZ);updateClock();buildCalendar(currentDate)});

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
  buildCalendar(currentDate);
  updateClock();
  setInterval(updateClock,1000);

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/sw.js').then(()=>console.log('sw registered')).catch(console.error);
  }
})();
