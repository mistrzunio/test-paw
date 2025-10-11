import { randomAccent } from './utils.js';

const KEY = 'notables';

export function loadNotables(){
  let notables = [];
  try{
    const raw = localStorage.getItem(KEY);
    if(raw) notables = JSON.parse(raw);
  }catch(e){ notables = [] }

  if(!Array.isArray(notables) || notables.length === 0){
    notables = [
      {type:'rule', id:'weekend', label:'Weekend', color: randomAccent()},
      {type:'rule', id:'newyear', label:'New Year', color: randomAccent()}
    ];
    saveNotables(notables);
  }

  // backfill missing colors
  let changed = false;
  for(const it of notables){ if(!it.color){ it.color = randomAccent(); changed = true } }
  if(changed) saveNotables(notables);
  return notables;
}

export function saveNotables(arr){
  localStorage.setItem(KEY, JSON.stringify(arr));
}
