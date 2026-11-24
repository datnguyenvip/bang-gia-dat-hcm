const $=s=>document.querySelector(s);
const fmt=n=>n==null?'—':Math.round(n*1000).toLocaleString('vi-VN');
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const TYPES=[['Đất ở',3],['Thương mại DV',4],['SXKD',5]];
let DATA=[],region='Tất cả',type=3,curArea=null,sel=null;

fetch('data/data.json').then(r=>r.json()).then(d=>{
  d.forEach(a=>a.rows.forEach(r=>r.k=norm(r[0]+' '+r[1]+' '+r[2])));
  d.forEach(a=>a.k=norm(a.name));
  DATA=d;init();
});

function init(){
  const regs=['Tất cả',...new Set(DATA.map(a=>a.region))];
  $('#regions').innerHTML=regs.map(r=>`<button class="${r==region?'on':''}" data-r="${r}">${r}</button>`).join('');
  $('#regions').onclick=e=>{const r=e.target.dataset.r;if(!r)return;region=r;init();showAreas();};
  for(const id of ['types','types2'])
    $('#'+id).innerHTML=TYPES.map(t=>`<button data-t="${t[1]}" class="${t[1]==type?'on':''}">${t[0]}</button>`).join('');
  for(const id of ['types','types2'])$('#'+id).onclick=e=>{const t=e.target.dataset.t;if(!t)return;type=+t;init();render();};
  render();
}

function areasF(){
  const q=norm($('#qa').value.trim());
  return DATA.filter(a=>(region=='Tất cả'||a.region==region)&&(!q||a.k.includes(q)));
}
function showAreas(){curArea=null;$('#q').value='';render();}
function render(){
  const q=norm($('#q').value.trim());
  $('#viewAreas').hidden=!!(curArea||q);
  $('#viewStreets').hidden=!curArea||!!q;
  $('#viewSearch').hidden=!q;
  if(q)return renderSearch(q);
  if(curArea)return renderStreets();
  const as=areasF();
  $('#areaHint').textContent=`${as.length} phường/xã/khu vực · chọn để xem bảng giá đường`;
  $('#areaList').innerHTML=as.map(a=>`<div class="item" data-a="${a.id}"><div><div class="n">${a.name}</div><div class="s">${a.region}</div></div><div class="p"><b>${a.rows.length}</b><small>đường</small></div></div>`).join('')||'<div class="empty">Không tìm thấy</div>';
}
$('#qa').oninput=render;
$('#areaList').onclick=e=>{const el=e.target.closest('[data-a]');if(!el)return;curArea=DATA[+el.dataset.a];$('#sort').value='name';render();scrollTo(0,0);};
$('#back').onclick=()=>{curArea=null;render();};
$('#q').oninput=render;
$('#sort').onchange=render;

function row(a,r,i){
  const range=r[1]?(r[2]?`${r[1]} → ${r[2]}`:r[1]):'';
  return `<div class="item" data-a="${a.id}" data-i="${i}"><div><div class="n">${r[0]}</div><div class="s">${range||''}</div></div><div class="p"><b>${fmt(r[type])}</b><small>đ/m²</small></div></div>`;
}
function renderStreets(){
  $('#areaTitle').textContent=curArea.name;
  let rs=curArea.rows.map((r,i)=>[r,i]);
  const s=$('#sort').value;
  if(s=='desc')rs.sort((a,b)=>(b[0][type]||0)-(a[0][type]||0));
  else if(s=='asc')rs.sort((a,b)=>(a[0][type]||0)-(b[0][type]||0));
  $('#count').textContent=`${rs.length} dòng`;
  $('#streetList').innerHTML=rs.map(([r,i])=>row(curArea,r,i)).join('');
}
function renderSearch(q){
  const ws=q.split(/\s+/);const out=[];
  for(const a of DATA){
    if(region!='Tất cả'&&a.region!=region)continue;
    a.rows.forEach((r,i)=>{if(ws.every(w=>(r.k+' '+a.k).includes(w)))out.push([a,r,i]);});
    if(out.length>300)break;
  }
  $('#count2').textContent=out.length>300?'300+ kết quả (hãy gõ cụ thể hơn)':`${out.length} kết quả`;
  $('#searchList').innerHTML=out.slice(0,300).map(([a,r,i])=>row(a,r,i).replace('<div class="s">',`<div class="s" style="color:var(--g)">${a.name}</div><div class="s">`)).join('')||'<div class="empty">Không tìm thấy kết quả</div>';
}
for(const id of ['#streetList','#searchList'])$(id).onclick=e=>{
  const el=e.target.closest('[data-i]');if(!el)return;
  const a=DATA[+el.dataset.a];sel=[a,a.rows[+el.dataset.i]];openSheet();
};

function openSheet(){
  const [a,r]=sel;
  $('#sArea').textContent=a.name+' · '+a.region;
  $('#sName').textContent=(r[6]?r[6]+' – ':'')+r[0];
  $('#sSeg').innerHTML='';
  const range=r[1]?`<div class="range">${r[1]}${r[2]?'<br>→ '+r[2]:''}</div>`:'';
  $('#sPrices').innerHTML=range+TYPES.map(t=>`<div class="pr ${t[1]==type?'on':''}" data-t="${t[1]}"><span>${t[0]}</span><b>${fmt(r[t[1]])} đ/m²</b></div>`).join('');
  $('#sPrices').onclick=e=>{const p=e.target.closest('[data-t]');if(!p)return;type=+p.dataset.t;openSheet();calc();};
  $('#sheet').hidden=false;calc();
}
function calc(){
  const v=parseFloat(($('#area').value||'').replace(',','.'));
  const p=sel[1][type];
  $('#total').textContent=v>0&&p!=null?`≈ ${Math.round(v*p*1000).toLocaleString('vi-VN')} đồng`:'';
}
$('#area').oninput=calc;
$('#closeSheet').onclick=()=>{$('#sheet').hidden=true;render();};
$('#sheet').onclick=e=>{if(e.target.id=='sheet')$('#closeSheet').click();};
$('#btnInfo').onclick=()=>$('#info').hidden=false;
$('#closeInfo').onclick=()=>$('#info').hidden=true;
$('#info').onclick=e=>{if(e.target.id=='info')$('#info').hidden=true;};
$('#copy').onclick=()=>{
  const [a,r]=sel;
  const t=`${r[0]}${r[1]?` (${r[1]}${r[2]?' → '+r[2]:''})`:''}\n${a.name}, ${a.region}\nĐất ở: ${fmt(r[3])} đ/m²\nThương mại DV: ${fmt(r[4])} đ/m²\nSXKD: ${fmt(r[5])} đ/m²`;
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>alert('Đã sao chép'),()=>prompt('Sao chép:',t));
};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
