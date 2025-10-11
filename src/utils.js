// Small utility helpers used across the app
export function pad(n){return n<10? '0'+n: String(n)}

export function randomAccent(){
  // pick very light, low-saturation pastel with alpha for subtle background
  const h = Math.floor(Math.random()*360);
  const s = 30; // lower saturation for subtlety
  const l = 94; // very light
  const a = 0.54; // low alpha
  return `hsl(${h} ${s}% ${l}% / ${a})`;
}

export function formatMonthTitle(year, month){
  return new Date(year, month, 1).toLocaleString(undefined,{month:'long',year:'numeric'});
}

export function tzNow(selectedTZ){
  const tzNowStr = new Date().toLocaleString('en-US',{timeZone:selectedTZ});
  return new Date(tzNowStr);
}
