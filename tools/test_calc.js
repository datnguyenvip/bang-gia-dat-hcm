// Chạy: node tools/test_calc.js
const VT=require('../app/calc.js');
let pass=0,fail=0;
const ok=(name,cond,extra)=>{if(cond){pass++;console.log('PASS',name);}else{fail++;console.log('FAIL',name,extra===undefined?'':JSON.stringify(extra));}};
const B=100000; // 100.000 nghìn = 100 triệu đ/m²
const base={type:3,base:B,mode:'front',area:'80',special:'1'};
const c=o=>VT.compute(Object.assign({},base,o));

// 1. mốc bề rộng hẻm
for(const [w,pos] of [['2.99',4],['3',3],['4.99',3],['5',2],['2,99',4]]){
  const r=c({mode:'alley',width:w});ok('hẻm '+w+' -> VT'+pos,r.pos===pos,r.pos);
}
const f=[0,1,.5,.4,.32];
ok('đơn giá hẻm 4m = 40%',Math.abs(c({mode:'alley',width:'4'}).unit-B*1000*0.4)<1);
ok('VT4 = 32%',Math.abs(c({mode:'alley',width:'2'}).unit-B*1000*0.32)<1);
// 2. mốc độ sâu
for(const [d,red] of [['99.99',false],['100',true],['100.01',true]]){
  const r=c({mode:'front',depthF:d});ok('mặt tiền sâu '+d+(red?' giảm 10%':' không giảm'),Math.abs(r.unit-B*1000*(red?0.9:1))<1,r.unit);
  const a=c({mode:'alley',width:'5',depthA:d});ok('hẻm sâu '+d,Math.abs(a.unit-B*1000*0.5*(red?0.9:1))<1,a.unit);
}
// 3. từ hẻm đất sâu 100m sang không lối vào = chọn thẳng không lối vào
const none={mode:'none',useCur:true,floor:'5000000'};
const direct=c(none);
const viaAlley=c(Object.assign({mode:'none',dirt:true,width:'2',depthA:'100',depthF:'150',multi:true,special:'0.7'},{useCur:true,floor:'5000000'}));
ok('hẻm đất 100m -> không lối vào giống chọn thẳng',direct.total===viaAlley.total&&direct.unit===viaAlley.unit&&direct.total!=null,[direct.total,viaAlley.total]);
ok('không lối vào = max(32% VT1, sàn)',Math.abs(direct.unit-Math.max(B*1000*0.32,5000000))<1);
ok('không lối vào thiếu sàn -> không tính',c({mode:'none',useCur:true}).total===null&&c({mode:'none',useCur:true}).missing.length>0);
ok('không lối vào thiếu đường tham chiếu -> không tính',c({mode:'none',floor:'5000000'}).total===null);
ok('sàn cao hơn VT4 được dùng',Math.abs(c({mode:'none',useCur:true,floor:'60000000'}).unit-60000000)<1);
// 4. phần khuất
ok('phần khuất -20 bị chặn',!!c({h2:'-20'}).errors.h2&&c({h2:'-20'}).total===null);
ok('phần khuất 81/80 bị chặn',!!c({h2:'81'}).errors.h2&&c({h2:'81'}).total===null);
ok('S2+S3 vượt tổng bị chặn',!!c({h2:'50',h3:'40'}).errors.h3);
ok('phần khuất 80/80 hợp lệ',!c({h2:'80'}).errors.h2);
const h15=c({h2:'15'}),h149=c({h2:'14.99'});
ok('đúng 15 m² được giảm 80%',Math.abs(h15.total-(65*B*1000+15*B*1000*0.8))<1,h15.total);
ok('14.99 m² không giảm',Math.abs(h149.total-80*B*1000)<1,h149.total);
// 5. số đầu vào
for(const bad of ['abc','1e999','9'.repeat(400),'12abc','--5','Infinity','NaN','1,2,3']){
  const r=c({area:bad});ok('diện tích "'+bad.slice(0,12)+'" bị chặn',!!r.errors.area&&r.total===null,r.errors);
}
ok('diện tích 0 bị chặn',!!c({area:'0'}).errors.area);
ok('diện tích âm bị chặn',!!c({area:'-5'}).errors.area);
ok('chỉ nhập rộng -> báo thiếu dài',!!c({R:'5'}).errors.L&&c({R:'5'}).total===null);
ok('chỉ nhập dài -> báo thiếu rộng',!!c({L:'20'}).errors.R);
ok('rộng 0 bị chặn',!!c({R:'0',L:'10'}).errors.R);
ok('thiếu diện tích -> không có tổng',c({area:''}).total===null&&c({area:''}).missing.length>0);
ok('chiều sâu chữ bị chặn',!!c({depthF:'x'}).errors.depthF);
ok('ô sai ở chế độ ẩn không ảnh hưởng',c({mode:'front',width:'abc',depthA:'zzz',ref:'q'}).total!=null);
// 6. loại đất chưa có giá
const np=c({base:null,mode:'alley',width:'4'});
ok('chưa có giá -> không tính tiền, vẫn xác định vị trí',np.total===null&&np.unit===null&&np.pos===3);
ok('chưa có giá, ref nhập tay vẫn không tính',c({base:null,mode:'none',ref:'80000000',floor:'5000000'}).total===null);
// 7. nhiều mặt tiền / 70%
ok('nhiều mặt tiền thiếu giá đường khác -> không chốt',c({multi:true}).total===null);
const mt=c({multi:true,other:'150.000.000'});
ok('nhiều mặt tiền dùng đường giá cao nhất ×110%',Math.abs(mt.unit-150000000*1.1)<1&&mt.total!=null,mt.unit);
ok('nhiều mặt tiền: đường khác thấp hơn thì dùng VT1 hiện tại',Math.abs(c({multi:true,other:'1000'}).unit-B*1000*1.1)<1);
ok('70% đơn lẻ',Math.abs(c({special:'0.7'}).unit-B*1000*0.7)<1);
ok('70% + 110% không tự cộng dồn',c({special:'0.7',multi:true,other:'1000'}).total===null);
ok('70% + sâu ≥100 không tự cộng dồn',c({special:'0.7',depthF:'100'}).total===null);
// 8. thửa dài
const lg=c({R:'4',L:'25'}); // 6.25 lần -> đất ở có 2 dải (5R,8R)
ok('đất ở dài 6.25 lần cần 2 dải',lg.stripCount===2&&lg.total===null);
const lg2=c({R:'4',L:'25',st1:'60',st2:'20'});
ok('2 dải đúng tổng: 100% + 80%',Math.abs(lg2.total-(60*B*1000+20*B*1000*0.8))<1,lg2.total);
ok('tổng dải lệch diện tích bị chặn',!!c({R:'4',L:'25',st1:'60',st2:'10'}).errors.st2);
ok('dải + phần khuất lớn không tự tính',c({R:'4',L:'25',st1:'60',st2:'20',h2:'20'}).total===null);
ok('dải + phần khuất <15 vẫn tính',c({R:'4',L:'25',st1:'60',st2:'20',h2:'10'}).total!=null);
ok('đất ở dài đúng 5 lần: không cần dải',c({R:'4',L:'20'}).stripCount===1&&c({R:'4',L:'20'}).total!=null);
const tm=VT.compute({type:4,base:B,mode:'front',area:'100',R:'5',L:'30',st1:'40',st2:'30',st3:'30'}); // 6 lần -> TMDV 3 dải 100/60/40
ok('TMDV 3 dải 100/60/40',Math.abs(tm.total-(40+18+12)*B*1000)<1,tm.total);
ok('TMDV dài 2.5 lần cần 2 dải',VT.compute({type:4,base:B,mode:'front',area:'100',R:'4',L:'10'}).stripCount===2);
// 9. tìm kiếm: khớp chính xác ở dòng 301 vẫn lên đầu, giữ tìm không dấu
const rows=[];for(let i=0;i<400;i++)rows.push(['ĐƯỜNG SỐ '+i+' NỐI DÀI','','',1,1,1,'']);
rows[300]=['LÊ LỢI','TRỌN ĐƯỜNG','',1,1,1,'']; // dòng 301
rows.push(['TRẦN HƯNG ĐẠO','Từ A','',1,1,1,'Nhóm khu dân cư XYZ']);
const D=[{id:0,name:'PHƯỜNG X',region:'R',rows},{id:1,name:'PHƯỜNG Y',region:'R',rows:[['ĐƯỜNG SỐ 5','','',1,1,1,'']]}];
const s1=VT.searchRows(D,'đường số',null,300);ok('có >300 kết quả vẫn cắt 300',s1.total>300&&s1.items.length===300);
const s2=VT.searchRows(D,'duong so 5',null,300);ok('tìm không dấu',s2.total>=1);
ok('khớp chính xác lên trước (không dấu)',s2.items[0][1][0]==='ĐƯỜNG SỐ 5',s2.items[0][1][0]);
const s3=VT.searchRows(D,'le loi',null,5);ok('tên khớp chính xác ở dòng 301 vẫn tìm thấy',s3.items.length===1&&s3.items[0][1][0]==='LÊ LỢI');
const big=[];for(let i=0;i<400;i++)big.push(['LÊ LỢI '+i,'','',1,1,1,'']);big.push(['LÊ LỢI','','',1,1,1,'']);
const s4=VT.searchRows([{id:0,name:'A',region:'R',rows:big}],'le loi',null,300);ok('dòng khớp chính xác thứ 401 vẫn đứng đầu',s4.items[0][1][0]==='LÊ LỢI'&&s4.items.length===300,s4.items[0][1][0]);
ok('tìm theo tên nhóm',VT.searchRows(D,'xyz',null,5).total===1);
ok('tìm theo mốc Từ/Đến',VT.searchRows(D,'tu a',null,5).total>=1);
ok('lọc vùng',VT.searchRows(D,'duong so 5','Khác',300).total===0);
// 10. hiển thị mốc
ok('Từ/Đến một mốc',VT.rangeText(['x','Từ A','']).includes('Từ: Từ A')===true||VT.rangeText(['x','NGÃ 3','']).startsWith('Từ: NGÃ 3'));
ok('chỉ có mốc Đến',VT.rangeText(['x','','NGÃ 4'])==='Đến: NGÃ 4');
ok('đủ hai mốc',VT.rangeText(['x','A','B'])==='Từ: A  →  Đến: B');
ok('TRỌN ĐƯỜNG giữ nguyên',VT.rangeText(['x','TRỌN ĐƯỜNG',''])==='TRỌN ĐƯỜNG');
console.log(`\n${pass} pass, ${fail} fail`);process.exit(fail?1:0);
