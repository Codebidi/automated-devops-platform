function n(r,t=7){return r?r.slice(0,t):"—"}function f(r){if(typeof r!="number"||isNaN(r))return"—";if(r<60)return`${r}s`;const t=Math.floor(r/60),i=r%60;return`${t}m ${i}s`}export{f as a,n as f};
