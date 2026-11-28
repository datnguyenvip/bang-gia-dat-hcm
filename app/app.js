const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>!(n>0)?'—':Math.round(n*1000).toLocaleString('vi-VN');
const norm=VT.norm;
const TYPES=[['Đất ở',3],['Thương mại DV',4],['SXKD',5]];
const TNAME={3:'đất ở',4:'đất thương mại, dịch vụ',5:'đất sản xuất kinh doanh'};
let DATA=[],region='Tất cả',type=3,curArea=null,sel=null,selKey='',sheetType=3,lastResult=null;
const FORMS={}; // dữ liệu biểu mẫu riêng cho từng đường/đoạn

function load(){
  $('#areaHint').textContent='Đang tải bảng giá…';
  $('#areaList').innerHTML='';
  fetch('data/data.json').then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(d=>{
    if(!Array.isArray(d)||!d.length)throw new Error('Dữ liệu rỗng');
    d.forEach(a=>{a.k=norm(a.name);a.rows.forEach(r=>{r.k=norm(r[0]+' '+r[1]+' '+r[2]+' '+(r[6]||''));r.n=norm(r[0]);});});
    DATA=d;init();
  }).catch(e=>{
    $('#areaHint').textContent='';
    $('#areaList').innerHTML=`<div class="empty">Không tải được bảng giá (${esc(e.message)}).<br><br><button id="retry" class="copy">Thử lại</button></div>`;
    $('#retry').onclick=load;
  });
}
load();

function init(){
  const regs=['Tất cả',...new Set(DATA.map(a=>a.region))];
  $('#regions').innerHTML=regs.map(r=>`<button class="${r==region?'on':''}" data-r="${esc(r)}">${esc(r)}</button>`).join('');
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
  if(q)return renderSearch();
  if(curArea)return renderStreets();
  const as=areasF();
  $('#areaHint').textContent=`${as.length} phường/xã/khu vực · chọn để xem bảng giá đường`;
  $('#areaList').innerHTML=as.map(a=>`<div class="item" data-a="${a.id}"><div><div class="n">${esc(a.name)}</div><div class="s">${esc(a.region)}</div></div><div class="p"><b>${a.rows.length}</b><small>đường</small></div></div>`).join('')||'<div class="empty">Không tìm thấy</div>';
}
$('#qa').oninput=render;
$('#areaList').onclick=e=>{const el=e.target.closest('[data-a]');if(!el)return;curArea=DATA[+el.dataset.a];$('#sort').value='name';render();scrollTo(0,0);};
$('#back').onclick=()=>{curArea=null;render();};
$('#q').oninput=render;
$('#sort').onchange=render;

function row(a,r,i){
  const range=VT.rangeText(r);
  const sub=[r[6]?esc(r[6]):'',range?esc(range):''].filter(Boolean).join('<br>');
  return `<div class="item" data-a="${a.id}" data-i="${i}"><div><div class="n">${esc(r[0])}</div><div class="s">${sub}</div></div><div class="p"><b>${fmt(r[type])}</b><small>${!(r[type]>0)?'chưa có giá':'đ/m²'}</small></div></div>`;
}
function renderStreets(){
  $('#areaTitle').textContent=curArea.name;
  let rs=curArea.rows.map((r,i)=>[r,i]);
  const s=$('#sort').value;
  const has=r=>r[type]>0;
  rs.sort((a,b)=>{
    if(has(a[0])!==has(b[0]))return has(a[0])?-1:1; // dòng thiếu giá luôn xuống cuối
    if(s=='desc')return b[0][type]-a[0][type];
    if(s=='asc')return a[0][type]-b[0][type];
    return a[0][0].localeCompare(b[0][0],'vi',{numeric:true,sensitivity:'base'});
  });
  $('#count').textContent=`${rs.length} dòng`;
  $('#streetList').innerHTML=rs.map(([r,i])=>row(curArea,r,i)).join('');
}
function renderSearch(){
  const res=VT.searchRows(DATA,$('#q').value,region,300);
  $('#count2').textContent=res.total>300?`${res.total} kết quả (hiển thị 300 kết quả khớp nhất, hãy gõ cụ thể hơn)`:`${res.total} kết quả`;
  $('#searchList').innerHTML=res.items.map(([a,r,i])=>row(a,r,i).replace('<div class="s">',`<div class="s" style="color:var(--g)">${esc(a.name)}</div><div class="s">`)).join('')||'<div class="empty">Không tìm thấy kết quả</div>';
}
for(const id of ['#streetList','#searchList'])$(id).onclick=e=>{
  const el=e.target.closest('[data-i]');if(!el)return;
  const a=DATA[+el.dataset.a];sel=[a,a.rows[+el.dataset.i]];selKey=a.id+':'+el.dataset.i;sheetType=type;openSheet();
};

/* ---------- Biểu mẫu xác định vị trí ---------- */
const PT=['other','ref','floor'];               // trường giá: lưu riêng theo loại đất
const NUMF=['area','depthF','other','width','depthA','ref','floor','R','L','st1','st2','st3','h2','h3'];
const CHK=['multi','dirt','useCur'];
const MONEY=['other','ref','floor'];
function fld(id,label,ph){return `<div id="w-${id}"><label for="${id}">${label}</label><input id="${id}" type="text" inputmode="decimal" autocomplete="off" placeholder="${ph||''}"><small class="err" id="e-${id}"></small></div>`;}
function chk(id,label){return `<div id="w-${id}"><label class="ck"><input id="${id}" type="checkbox"> ${label}</label></div>`;}
$('#vtBox').innerHTML=`
  <h3>Xác định vị trí 1–4 (Phụ lục I)</h3>
  ${fld('area','Diện tích thửa đất (m²)','Ví dụ: 80')}
  <div id="quick"></div>
  <label>Vị trí thửa đất</label>
  <div class="seg" id="vtMode"><button data-m="front">Mặt tiền</button><button data-m="alley">Trong hẻm</button><button data-m="none">Không lối vào</button></div>
  <div data-mode="front">
    ${fld('depthF','Độ sâu từ mép trong lề đường (m) – nếu có','Từ 100m trở lên giảm 10%')}
    ${chk('multi','Giáp từ 2 mặt tiền đường trở lên (110% đường giá cao nhất)')}
    <div id="w-other-box">${fld('other','Giá vị trí 1 của đường giáp có giá cao nhất – <span class="tn"></span> (đồng/m²)','Ví dụ: 120000000')}</div>
    <label for="special">Trường hợp đặc biệt (70%)</label>
    <select id="special">
      <option value="1">Không</option>
      <option value="0.7">Dạ cầu / chân cầu vượt / đường nhánh lên cầu vượt</option>
      <option value="0.7">Trong hành lang đường điện cao thế</option>
      <option value="0.7">Cách lề đường bởi kênh, rạch chưa san lấp / phần đất phía trong cùng khuôn viên</option>
    </select><small class="err" id="e-special"></small>
  </div>
  <div data-mode="alley">
    ${fld('width','Bề rộng nhỏ nhất của hẻm phải đi qua (m)','Ví dụ: 4')}
    <div id="alleyPos" class="note"></div>
    ${chk('dirt','Hẻm đất (tính 80% hẻm trải đá/nhựa/bê tông)')}
    ${fld('depthA','Khoảng cách từ mép trong lề đường đến thửa (m)','Từ 100m trở lên giảm 10%')}
  </div>
  <div data-mode="none">
    <div class="note">Không có đường, hẻm vào / phải đi bằng thuyền, ghe, bờ đất: tính theo vị trí 4 của đường gần nhất đã có giá, không thấp hơn giá đất trồng cây lâu năm (mục 6.5).</div>
    ${chk('useCur','Đường đang xem là đường gần nhất dẫn đến thửa')}
    <div id="w-ref-box">${fld('ref','Giá vị trí 1 của đường gần nhất – <span class="tn"></span> (đồng/m²)','Ví dụ: 80000000')}</div>
    ${fld('floor','Giá đất trồng cây lâu năm cùng khu vực, vị trí (đồng/m²) – giá sàn','Ví dụ: 5000000')}
  </div>
  <label>Hình thể thửa đất (nếu méo / rất dài)</label>
  <div class="two"><div>${fld('R','','Rộng (m)')}</div><div>${fld('L','','Dài (m)')}</div></div>
  <div id="stripBox"><div class="note" id="stripNote"></div>${fld('st1','Diện tích thực dải 1 (m²)')}${fld('st2','Diện tích thực dải 2 (m²)')}${fld('st3','Diện tích thực dải 3 (m²)')}</div>
  <div>${fld('h2','Phần khuất S2 (m²) – tính 80% khi từ 15 m² trở lên','0')}</div>
  <div>${fld('h3','Phần khuất S3 (m²)','0')}</div>
  <div id="vtOut"></div>
  <div class="two"><button class="copy" id="copyCalc" style="margin-top:10px">Sao chép kết quả tính (ước tính)</button></div>`;

function formOf(){
  if(!FORMS[selKey])FORMS[selKey]={mode:'front',special:'1',p:{3:{},4:{},5:{}}};
  return FORMS[selKey];
}
function syncForm(){
  const f=formOf();
  for(const id of NUMF)$('#'+id).value=PT.includes(id)?(f.p[sheetType][id]||''):(f[id]||'');
  for(const id of CHK)$('#'+id).checked=!!f[id];
  $('#special').value=f.special||'1';
  document.querySelectorAll('.tn').forEach(e=>e.textContent=TNAME[sheetType]);
  layout();
}
function layout(){
  const f=formOf();
  document.querySelectorAll('#vtMode button').forEach(b=>b.classList.toggle('on',b.dataset.m==f.mode));
  document.querySelectorAll('#vtBox [data-mode]').forEach(d=>d.hidden=d.dataset.mode!==f.mode);
  $('#w-other-box').hidden=!f.multi;
  $('#w-ref-box').hidden=!!f.useCur;
}
function readForm(){
  const f=formOf();
  for(const id of NUMF){const v=$('#'+id).value;if(PT.includes(id))f.p[sheetType][id]=v;else f[id]=v;}
  for(const id of CHK)f[id]=$('#'+id).checked;
  f.special=$('#special').value;
  return f;
}
$('#vtBox').addEventListener('input',()=>{readForm();layout();calc();});
$('#vtBox').addEventListener('change',()=>{readForm();layout();calc();});
$('#vtMode').onclick=e=>{const m=e.target.dataset.m;if(!m)return;formOf().mode=m;layout();calc();};

function openSheet(){
  const [a,r]=sel;
  $('#sArea').textContent=a.name+' · '+a.region;
  $('#sName').textContent=(r[6]?r[6]+' – ':'')+r[0];
  $('#sSeg').innerHTML='';
  const rt=VT.rangeText(r);
  $('#sRange').innerHTML=rt?`<div class="range">${esc(rt)}</div>`:'';
  renderPrices();
  syncForm();
  $('#sheet').hidden=false;
  calc();
}
function renderPrices(){
  const r=sel[1];
  $('#sPrices').innerHTML=TYPES.map(t=>`<div class="pr ${t[1]==sheetType?'on':''}" data-t="${t[1]}"><span>${t[0]}</span><b>${!(r[t[1]]>0)?'chưa có giá':fmt(r[t[1]])+' đ/m²'}</b></div>`).join('');
}
// Đổi loại đất trong chi tiết: chỉ đổi sheetType, KHÔNG đổi tab/sắp xếp của danh sách.
$('#sPrices').onclick=e=>{const p=e.target.closest('[data-t]');if(!p)return;readForm();sheetType=+p.dataset.t;renderPrices();syncForm();calc();};

function calc(){
  const f=readForm();
  const r=sel[1],price=r[sheetType]>0?r[sheetType]:null;
  const a=VT.parseNum(f.area);
  const q=$('#quick');
  q.textContent=(!a.err&&a.v>0&&price!=null)?`Tạm tính theo giá VT1 (chưa xét vị trí, hình thể): ≈ ${Math.round(a.v*price*1000).toLocaleString('vi-VN')} đồng`:'';
  const inp={type:sheetType,base:price,mode:f.mode,area:f.area,R:f.R,L:f.L,st1:f.st1,st2:f.st2,st3:f.st3,h2:f.h2,h3:f.h3,
    depthF:f.depthF,multi:f.multi,other:f.p[sheetType].other,special:f.special,
    width:f.width,dirt:f.dirt,depthA:f.depthA,
    useCur:f.useCur,ref:f.p[sheetType].ref,floor:f.p[sheetType].floor};
  const res=VT.compute(inp);
  lastResult=null;
  // dải diện tích chỉ hiện khi cần
  const sc=res.stripCount;
  $('#stripBox').hidden=sc<2;
  for(let k=1;k<=3;k++)$('#w-st'+k).hidden=k>sc;
  const si=VT.stripInfo(sheetType,+f.R,+f.L);
  if(sc>=2)$('#stripNote').textContent=`Thửa dài ${Math.round(si.ratio*10)/10} lần chiều rộng. Nhập diện tích thực từng dải: dải 1 trong ${si.k[0]} lần chiều rộng${sc==2?', dải 2 phần còn lại':`, dải 2 từ ${si.k[0]} đến ${si.k[1]} lần, dải 3 trên ${si.k[1]} lần`}.`;
  // hẻm: hiển thị vị trí suy ra từ bề rộng
  $('#alleyPos').textContent=(f.mode==='alley'&&res.pos&&!res.errors.width)?'→ '+res.posName:'';
  // thông báo lỗi từng ô
  for(const id of NUMF){
    const m=res.errors[id]||'';
    const el=$('#e-'+id);if(el)el.textContent=m;
    $('#'+id).classList.toggle('bad',!!m);
  }
  const out=$('#vtOut');
  const errs=Object.keys(res.errors);
  $('#copyCalc').disabled=true;
  if(errs.length){
    out.innerHTML=`<div class="bad-box"><b>Kiểm tra lại dữ liệu nhập</b>${errs.map(k=>`<div>• ${esc(res.errors[k])}</div>`).join('')}<div class="note">Chưa tính tiền.</div></div>`;
    return;
  }
  let h=res.posName?`<div><b>${esc(res.posName)}</b></div>`:'';
  h+=res.rows.map(x=>`<div class="row"><span>${esc(x[0])}</span><b>${esc(x[1])}</b></div>`).join('');
  if(res.total!=null){
    h+=`<div class="row big"><span>Thành tiền (ước tính)</span><span>${VT_vnd(res.total)}</span></div>`;
    lastResult={res,f,r};$('#copyCalc').disabled=false;
  }else if(res.missing.length)h+=`<div class="miss"><b>Chưa chốt thành tiền – còn thiếu:</b>${res.missing.map(m=>`<div>• ${esc(m)}</div>`).join('')}</div>`;
  h+=res.notes.map(n=>`<div class="note">• ${esc(n)}</div>`).join('');
  out.innerHTML=h;
}
const VT_vnd=n=>Math.round(n).toLocaleString('vi-VN')+' đồng';
$('#closeSheet').onclick=()=>{$('#sheet').hidden=true;render();};
$('#sheet').onclick=e=>{if(e.target.id=='sheet')$('#closeSheet').click();};
$('#btnInfo').onclick=()=>$('#info').hidden=false;
$('#closeInfo').onclick=()=>$('#info').hidden=true;
$('#info').onclick=e=>{if(e.target.id=='info')$('#info').hidden=true;};
function copyText(t){
  (navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>alert('Đã sao chép'),()=>prompt('Sao chép:',t));
}
$('#copy').onclick=()=>{
  const [a,r]=sel;const rt=VT.rangeText(r);
  copyText(`${r[0]}${rt?` (${rt})`:''}\n${a.name}, ${a.region}\nGiá gốc theo bảng (vị trí 1)\nĐất ở: ${fmt(r[3])} đ/m²\nThương mại DV: ${fmt(r[4])} đ/m²\nSXKD: ${fmt(r[5])} đ/m²`);
};
$('#copyCalc').onclick=()=>{
  if(!lastResult)return;
  const {res,r}=lastResult,[a]=sel;
  copyText(`ƯỚC TÍNH (tham khảo, không phải giá chính thức)\n${r[0]} – ${a.name}, ${a.region}\nLoại đất: ${TNAME[sheetType]}\n${res.posName}\n`+res.rows.map(x=>`${x[0].trim()}: ${x[1]}`).join('\n')+`\nThành tiền ước tính: ${VT_vnd(res.total)}`);
};
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js');
