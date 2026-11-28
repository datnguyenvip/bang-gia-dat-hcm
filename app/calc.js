/* Logic thuần (không đụng DOM) cho: xác định vị trí đất phi nông nghiệp + tìm kiếm.
   Căn cứ: Điều 4, Điều 6 và Phụ lục I, NQ 87/2025/NQ-HĐND. Chạy được cả trình duyệt lẫn Node (tools/test_calc.js). */
(function(root){
const POS_F=[1,1,0.5,0.4,0.32]; // so với VT1: VT2=50%, VT3=80%×VT2, VT4=80%×VT3
const norm=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
const pc=x=>Math.round(x*10000)/100+'%';
const vnd=n=>Math.round(n).toLocaleString('vi-VN')+' đồng';

// Đọc số nhập tay. Trả {v:số|undefined, err:chuỗi|undefined}; ô trống -> v=null.
function parseNum(raw,opt){
  opt=opt||{};
  if(raw==null)return {v:null};
  let s=String(raw).trim();
  if(s==='')return {v:null};
  if(opt.money&&/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  else s=s.replace(',','.');
  if(!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(s))return {err:'Số không hợp lệ'};
  const v=Number(s);
  if(!Number.isFinite(v)||Math.abs(v)>1e12)return {err:'Số quá lớn'};
  if(v<0)return {err:'Không được là số âm'};
  return {v};
}

// Số dải cần khi thửa dài: đất ở 5/8 lần chiều rộng; TMDV & SXKD 2/4 lần (Phụ lục I, 6.1.b)
function stripInfo(type,R,L){
  if(!(R>0&&L>0))return {n:1};
  const k=type===3?[5,8]:[2,4], coef=type===3?[1,0.8,0.7]:[1,0.6,0.4];
  const ratio=L/R;
  const n=ratio<=k[0]?1:ratio<=k[1]?2:3;
  return {n,k,coef,ratio};
}

/* i: {type,base(nghìn đ/m² hoặc null),mode:'front'|'alley'|'none',area,R,L,st1,st2,st3,h2,h3,
       depthF,multi,other,special, width,dirt,depthA, useCur,ref,floor}
   Chỉ đọc các trường thuộc đúng chế độ đang chọn. */
function compute(i){
  const errors={},missing=[],notes=[],rows=[];
  const g=(id,money)=>{const r=parseNum(i[id],{money});if(r.err)errors[id]=r.err;return r.v==null?null:r.v;};
  const pos0=(id,money)=>{const v=g(id,money);if(v!=null&&v<=0){errors[id]='Phải lớn hơn 0';return null;}return v;};
  const type=i.type, mode=i.mode;
  const hasPrice=i.base!=null&&Number.isFinite(i.base)&&i.base>0;
  const base=hasPrice?i.base*1000:null;

  const S=pos0('area');
  if(S==null&&!errors.area)missing.push('diện tích thửa đất');
  const R=pos0('R'),L=pos0('L');
  if(i.R!=null&&String(i.R).trim()!==''&&!errors.R&&R!=null&&L==null&&!errors.L)errors.L='Nhập đủ cặp: chiều rộng và chiều dài';
  if(i.L!=null&&String(i.L).trim()!==''&&!errors.L&&L!=null&&R==null&&!errors.R)errors.R='Nhập đủ cặp: chiều rộng và chiều dài';
  const h2=g('h2')||0,h3=g('h3')||0;
  if(S!=null){
    if(h2>S)errors.h2='Phần khuất không được lớn hơn tổng diện tích ('+S+' m²)';
    if(h3>S)errors.h3='Phần khuất không được lớn hơn tổng diện tích ('+S+' m²)';
    if(!errors.h2&&!errors.h3&&h2+h3>S)errors.h3='Tổng phần khuất vượt tổng diện tích';
  }

  // ---- đơn giá theo chế độ ----
  let unit=null,pos=null,posName='',priceMissing=0;
  const need=t=>{missing.push(t);priceMissing++;};
  if(!hasPrice)notes.push('Loại đất này chưa có giá trong bảng: không tính tiền.');
  else rows.push(['Giá vị trí 1 (bảng giá)',vnd(base)+'/m²']);
  let p=base;
  if(mode==='front'){
    pos=1;posName='Vị trí 1 (mặt tiền)';
    const depth=g('depthF')||0, sp=Number(i.special)||1;
    if(i.multi){
      const o=pos0('other',true);
      if(o==null&&!errors.other)need('giá vị trí 1 của đường giáp có giá cao nhất');
      else if(o!=null&&p!=null){p=Math.max(p,o)*1.1;rows.push(['Nhiều mặt tiền: 110% × đường giá cao nhất',vnd(p)+'/m²']);}
    }
    if(depth>=100){if(p!=null)p*=0.9;rows.push(['Sâu ≥ 100m',pc(0.9)]);}
    if(sp!==1){
      if(i.multi||depth>=100)need('đối chiếu Phụ lục I: chưa tự cộng dồn hệ số 70% với 110% hoặc giảm độ sâu');
      else{if(p!=null)p*=sp;rows.push(['Trường hợp đặc biệt',pc(sp)]);}
    }
  }else if(mode==='alley'){
    const w=pos0('width');
    const depth=g('depthA')||0;
    if(w==null&&!errors.width)need('bề rộng nhỏ nhất của hẻm phải đi qua');
    if(w!=null){
      pos=w>=5?2:w>=3?3:4;
      posName='Vị trí '+pos+' (hẻm '+w+'m)';
      rows.push(['Hệ số vị trí '+pos+' so với VT1',pc(POS_F[pos])]);
      if(p!=null)p*=POS_F[pos];
      if(i.dirt){if(p!=null)p*=0.8;rows.push(['Hẻm đất',pc(0.8)]);}
      if(depth>=100){if(p!=null)p*=0.9;rows.push(['Sâu ≥ 100m',pc(0.9)]);}
    }else p=null;
  }else{
    pos=4;posName='Vị trí 4 (không có đường/hẻm vào)';
    let ref=null;
    if(i.useCur){ref=base;if(ref==null)need('giá đường tham chiếu (loại đất này chưa có giá)');}
    else{ref=pos0('ref',true);if(ref==null&&!errors.ref)need('giá vị trí 1 của đường gần nhất dẫn đến thửa');}
    const floor=pos0('floor',true);
    if(floor==null&&!errors.floor)need('giá đất trồng cây lâu năm cùng khu vực, vị trí (giá sàn)');
    if(ref!=null&&floor!=null){
      const v4=ref*POS_F[4];
      rows.push(['Giá VT4 của đường tham chiếu (32% VT1)',vnd(v4)+'/m²']);
      rows.push(['Sàn: đất trồng cây lâu năm',vnd(floor)+'/m²']);
      p=Math.max(v4,floor);
    }else p=null;
  }
  if(hasPrice&&priceMissing===0&&p!=null&&Number.isFinite(p))unit=p;
  if(unit!=null)rows.push(['Đơn giá áp dụng',vnd(unit)+'/m²']);

  // ---- hình thể thửa đất ----
  const si=stripInfo(type,R,L);
  let st=null;
  if(si.n>1){
    st=[];let ok=true;
    for(let k=1;k<=si.n;k++){const v=g('st'+k);if(v==null)ok=false;st.push(v);}
    if(!ok){if(!Object.keys(errors).some(k=>/^st/.test(k)))missing.push('diện tích thực từng dải theo chiều dài thửa');}
    else if(S!=null){
      const sum=st.reduce((a,b)=>a+b,0);
      if(Math.abs(sum-S)>0.1)errors['st'+si.n]='Tổng các dải ('+Math.round(sum*100)/100+' m²) phải bằng diện tích thửa ('+S+' m²)';
    }
    notes.push('Thửa dài '+Math.round(si.ratio*10)/10+' lần chiều rộng: tính theo từng dải (Phụ lục I, 6.1.b).');
  }
  const e2=h2>=15?h2:0,e3=h3>=15?h3:0;
  if((h2>0&&h2<15)||(h3>0&&h3<15))notes.push('Phần khuất dưới 15 m² không được giảm 80%.');
  if(si.n>1&&e2+e3>0)missing.push('thửa vừa dài vừa có phần khuất ≥ 15 m²: cần thẩm định theo dải');

  // ---- tổng ----
  let total=null;
  const hasErr=Object.keys(errors).length>0;
  if(!hasErr&&missing.length===0&&unit!=null&&S!=null){
    if(si.n>1){
      total=0;
      st.forEach((a,k)=>{const t=a*unit*si.coef[k];total+=t;rows.push(['Dải '+(k+1)+': '+a+' m² × '+pc(si.coef[k]),vnd(t)]);});
    }else{
      const e=e2+e3;
      total=(S-e)*unit+e*unit*0.8;
      if(e>0)rows.push(['Phần khuất '+e+' m² × 80%',vnd(e*unit*0.8)]);
    }
    if(!Number.isFinite(total)){total=null;errors.area='Kết quả không hợp lệ';}
  }
  return {errors,missing,notes,rows,pos,posName,unit,total,stripCount:si.n,hasPrice};
}

// Tìm kiếm: khớp chính xác tên đường lên trước, sau đó mới cắt giới hạn.
function searchRows(DATA,q,region,limit){
  q=norm(q.trim());
  const ws=q.split(/\s+/).filter(Boolean);
  const bk=[[],[],[],[]];
  if(!ws.length)return {items:[],total:0};
  for(const a of DATA){
    if(region&&region!=='Tất cả'&&a.region!==region)continue;
    a.rows.forEach((r,i)=>{
      const key=(r.k||norm(r[0]+' '+r[1]+' '+r[2]+' '+(r[6]||'')))+' '+(a.k||norm(a.name));
      if(!ws.every(w=>key.includes(w)))return;
      const n=r.n||norm(r[0]);
      const rank=n===q?0:n.startsWith(q)?1:ws.every(w=>n.includes(w))?2:3;
      bk[rank].push([a,r,i]);
    });
  }
  const all=[].concat(...bk);
  return {items:all.slice(0,limit),total:all.length};
}

function rangeText(r){
  const a=(r[1]||'').trim(),b=(r[2]||'').trim();
  if(!a&&!b)return '';
  if(a&&/^trọn đường$/i.test(a)&&!b)return a;
  return [a?'Từ: '+a:'',b?'Đến: '+b:''].filter(Boolean).join('  →  ');
}

const API={compute,parseNum,searchRows,rangeText,norm,stripInfo,POS_F};
if(typeof module!=='undefined'&&module.exports)module.exports=API;else root.VT=API;
})(typeof window!=='undefined'?window:globalThis);
