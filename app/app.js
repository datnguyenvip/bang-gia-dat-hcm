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
let rate=0.5;
const num=id=>parseFloat(($(id).value||'').replace(',','.'))||0;
const vnd=n=>Math.round(n).toLocaleString('vi-VN')+' đồng';
const pc=x=>Math.round(x*10000)/100+'%';
function calc(){
  const v=num('#area');
  const p=sel[1][type];
  $('#total').textContent=v>0&&p!=null?`≈ ${Math.round(v*p*1000).toLocaleString('vi-VN')} đồng`:'';
  calcVT();
}
// Xác định vị trí đất phi nông nghiệp theo Điều 4, Điều 6 và Phụ lục I NQ 87/2025/NQ-HĐND
function calcVT(){
  const out=$('#vtOut');
  const base=sel[1][type];
  if(base==null){out.innerHTML='<span class="note">Loại đất này chưa có giá trong bảng.</span>';return;}
  const loc=$('#vtLoc').value, front=loc=='1';
  $('#vtFrontBox').hidden=!front;
  $('#vtAlleyBox').hidden=front||loc=='boat';
  const notes=[];
  let pos,posName,mult=1;
  if(front){pos=1;posName='Vị trí 1 (mặt tiền)';}
  else if(loc=='boat'){pos=4;posName='Vị trí 4 (không có đường/hẻm vào)';notes.push('Giá không thấp hơn giá đất trồng cây lâu năm cùng khu vực, vị trí (mục 6.5) – cần đối chiếu thêm.');}
  else{
    const w=num('#vtWidth');
    if(w>0){pos=w>=5?2:w>=3?3:4;}else pos={h5:2,h3:3,h0:4}[loc];
    posName='Vị trí '+pos+' (hẻm'+(w>0?' '+w+'m':'')+')';
  }
  // hệ số vị trí: VT2=50% VT1; VT3=80% VT2; VT4=80% VT3
  const f=[1,1,0.5,0.4,0.32][pos];
  const rows=[['Giá vị trí 1 (bảng giá)',vnd(base*1000)+'/m²']];
  if(pos>1)rows.push([`Hệ số ${posName.split(' (')[0]} (so với VT1)`,pc(f)]);
  mult*=f;
  if(!front&&$('#vtDirt').checked){mult*=0.8;rows.push(['Hẻm đất',pc(0.8)]);}
  const depth=num(front?'#vtDepthF':'#vtDepth');
  if(depth>=100){mult*=0.9;rows.push(['Độ sâu ≥ 100m',pc(0.9)]);}
  if(front&&$('#vtMulti').checked){mult*=1.1;rows.push(['Từ 2 mặt tiền trở lên',pc(1.1)]);}
  const sp=parseFloat($('#vtSpecial').value);
  if(sp!=1){mult*=sp;rows.push(['Trường hợp đặc biệt',pc(sp)]);}
  const unit=base*1000*mult;
  rows.push(['Đơn giá áp dụng',vnd(unit)+'/m²']);
  // diện tích: hình thể
  const S=num('#area'),R=num('#vtR'),L=num('#vtL');
  let total=null;
  if(S>0){
    let hid=num('#vtHid');
    if(hid>0&&hid<15){notes.push('Phần khuất < 15m² không được giảm 80%.');hid=0;}
    if(hid>S)hid=0;
    const main=S-hid;
    let tiers=[[1,1]];
    if(R>0&&L>0&&L>R){
      const cm=type==3?[[5,1],[8,0.8],[Infinity,0.7]]:[[2,1],[4,0.6],[Infinity,0.4]];
      tiers=[];let prev=0;
      for(const [k,c] of cm){
        const end=Math.min(L,k*R);
        if(end>prev)tiers.push([(end-prev)/L,c]);
        prev=end;if(end>=L)break;
      }
      if(tiers.length>1)notes.push(`Thửa dài ${Math.round(L/R*10)/10} lần chiều rộng: tính theo từng phần (mục 6.1.b).`);
    }else if(R>0&&L>0&&L<=R){}
    total=0;
    for(const [share,c] of tiers){
      const a=main*share;
      total+=a*unit*c;
      if(tiers.length>1)rows.push([`  Phần ${Math.round(a*10)/10}m² × ${pc(c)}`,vnd(a*unit*c)]);
    }
    if(hid>0){total+=hid*unit*0.8;rows.push([`Phần khuất ${hid}m² × 80%`,vnd(hid*unit*0.8)]);}
    rows.push([`Tổng giá trị (${S}m²)`,vnd(total)]);
  }
  let h=`<div><b>${posName}</b></div>`+rows.map(r=>`<div class="row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  if(total!=null)h+=`<div class="row big"><span>Thành tiền</span><span>${vnd(total)}</span></div>`;
  else h+='<div class="note">Nhập diện tích ở ô phía trên để tính tiền.</div>';
  h+=notes.map(n=>`<div class="note">• ${n}</div>`).join('');
  out.innerHTML=h;
}
for(const id of ['#vtLoc','#vtWidth','#vtDirt','#vtDepth','#vtDepthF','#vtMulti','#vtSpecial','#vtR','#vtL','#vtHid'])$(id).oninput=calcVT;
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
