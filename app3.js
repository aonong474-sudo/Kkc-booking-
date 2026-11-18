/* ---------- หน้าผู้ดูแล ---------- */
const rnd=()=>{const a=new Uint8Array(8);crypto.getRandomValues(a);return Array.from(a,x=>(x%36).toString(36)).join("")};
function setCodes(){
  const t={};for(let b=1;b<=7;b++)t[b]=rnd();
  return db.doc("codes/boards").set({t:t}).then(()=>toast("สร้างรหัส QR ใหม่แล้ว ต้องพิมพ์ QR ไปเปลี่ยนที่กระดาน")).catch(e=>toast("สร้างรหัสไม่สำเร็จ"+ec(e)));
}
function ensureCodes(){
  if(!db||!isAdmin()||!gotCodes||codes||ensuring)return;
  ensuring=true;setCodes();
}
function subAdmin(){
  if(adminSubbed||!db||!(demo||userEmail))return;adminSubbed=true;
  db.collection("noshows").onSnapshot(s=>{adminFlag=true;const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});noshows=o;render()},()=>{});
  db.collection("members").onSnapshot(s=>{const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});members=o;render()},()=>{});
  db.doc("codes/boards").onSnapshot(s=>{adminFlag=true;codes=s.exists?s.data():null;gotCodes=true;ensureCodes();render()},()=>{});
}
const fdt=ms=>{const d=new Date(ms);return d.getDate()+"/"+(d.getMonth()+1)+"/"+d.getFullYear()+" "+pad(d.getHours())+":"+pad(d.getMinutes())};
function renderMembers(){
  const v=$("#adminView");
  if(!$("#mHead")){v.innerHTML='<div id="mHead"><p><a href="#admin">← กลับหน้าผู้ดูแล</a></p><h2>📜 ประวัติการลงทะเบียน</h2><div id="mStats"></div><input id="mQ" placeholder="ค้นหาชื่อหรือรหัสนักศึกษา"><div class="row" style="margin-bottom:10px"><button class="btn ghost" data-csv>⬇️ ดาวน์โหลดไฟล์ CSV</button></div></div><div class="list" id="mList"></div>'}
  const all=Object.keys(members).map(u=>Object.assign({uid:u},members[u]));
  const day=new Date();day.setHours(0,0,0,0);
  const today=all.filter(x=>x.at&&x.at>=day.getTime()).length,week=all.filter(x=>x.at&&x.at>=Date.now()-7*864e5).length;
  $("#mStats").innerHTML='<div class="stats"><div class="stat mine"><b>'+all.length+'</b>ทั้งหมด</div><div class="stat ok"><b>'+today+'</b>วันนี้</div><div class="stat mine"><b>'+week+'</b>7 วันล่าสุด</div></div>';
  const q=($("#mQ").value||"").trim().toLowerCase();
  const rows=all.filter(x=>!q||String(x.name).toLowerCase().indexOf(q)>-1||String(x.sid).indexOf(q)>-1).sort((a,b)=>(b.at||0)-(a.at||0));
  $("#mList").innerHTML=rows.length?'<p class="msg">แสดง '+Math.min(rows.length,200)+' จาก '+rows.length+' รายการ (ใหม่สุดก่อน)</p>'+rows.slice(0,200).map(x=>'<div class="item"><span><b>'+esc(x.name)+'</b> ('+esc(x.sid)+')'+(banned[x.uid]?' · 🚫 ถูกระงับ':'')+'<br><small class="msg">'+(x.at?'ลงทะเบียน '+fdt(x.at):'ไม่ทราบเวลา (ลงทะเบียนก่อนมีระบบบันทึก)')+(x.upd&&x.at&&x.upd-x.at>60000?' · แก้ไข '+fdt(x.upd):'')+'</small></span>'+(banned[x.uid]?'':'<button class="btn ghost sm" data-mban="'+esc(x.uid)+'">🚫 ระงับ</button>')+'</div>').join(""):'<div class="empty">ไม่พบรายการ</div>';
}
function exportCsv(){
  const all=Object.keys(members).map(u=>members[u]).sort((a,b)=>(b.at||0)-(a.at||0));
  const q=v=>{v=String(v==null?"":v);if(/^[=+\-@]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
  const rows=[["ชื่อ-นามสกุล","รหัสนักศึกษา","ลงทะเบียนเมื่อ"].map(q).join(",")].concat(all.map(x=>[x.name,x.sid,x.at?fdt(x.at):""].map(q).join(",")));
  const blob=new Blob(["\ufeff"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="registrations.csv";document.body.appendChild(a);a.click();a.remove();
}
function renderAdmin(){
  const v=$("#adminView");
  if(!isAdmin()){
    if(!$("#aEmail"))v.innerHTML='<div class="card" style="--c:#4f46e5;max-width:420px;margin:16px auto"><h3>🔧 เข้าสู่ระบบผู้ดูแล</h3><input id="aEmail" type="email" placeholder="อีเมลผู้ดูแล"><input id="aPw" type="password" placeholder="รหัสผ่าน"><button class="btn" id="aLogin" style="width:100%">เข้าสู่ระบบ</button></div>';
    return;
  }
  if(location.hash==="#members"){renderMembers();return}
  if(!$("#aDyn")){v.innerHTML='<div id="aDyn"></div><div class="qrgrid" id="aQr"></div>';v.dataset.sig=""}
  const n=now();
  const all=Object.keys(bk).map(k=>Object.assign({k:k},bk[k])).filter(x=>live(x)&&x.date>=n.d).sort((a,b)=>(a.date+pad(a.hour)+a.board).localeCompare(b.date+pad(b.hour)+b.board));
  const td=all.filter(x=>x.date===n.d),cin=td.filter(x=>x.checkedIn).length;
  let h='<a class="btn" href="#members" style="display:block;text-align:center;text-decoration:none;margin:12px 0">📜 ประวัติการลงทะเบียน</a><h2>📊 วันนี้</h2><div class="stats"><div class="stat mine"><b>'+td.length+'</b>จองทั้งหมด</div><div class="stat ok"><b>'+cin+'</b>เช็คอินแล้ว</div><div class="stat no"><b>'+(td.length-cin)+'</b>รอเช็คอิน</div></div>';
  h+='<h2>🛠️ เปิด/ปิดกระดาน</h2><div class="list">';
  for(let b=1;b<=7;b++)h+='<div class="item"><span>'+ICO[b-1]+' กระดาน '+b+' · '+(closed(b)?"🛠️ ปิดปรับปรุง":"🟢 เปิดใช้งาน")+'</span><button class="btn ghost sm" data-tog="'+b+'">'+(closed(b)?"เปิด":"ปิด")+'</button></div>';
  h+='</div><h2>📋 การจองที่ยังใช้งานอยู่ ('+all.length+')</h2><div class="list">';
  h+=all.length?all.slice(0,150).map(x=>'<div class="item"><span>'+(x.checkedIn?"✅":"🕒")+' <b>กระดาน '+x.board+'</b> · '+fmtD(x.date)+' '+pad(x.hour)+':00<br><small class="msg">'+esc(x.name)+' ('+esc(x.sid)+') · '+(x.checkedIn?"เช็คอินแล้ว":"รอเช็คอิน ก่อน "+hm(x.expiresAt))+'</small></span><span style="display:flex;gap:6px"><button class="btn ghost sm" data-ban="'+x.k+'" title="ระงับผู้ใช้">🚫</button><button class="btn ghost sm" data-acancel="'+x.k+'">ยกเลิก</button></span></div>').join(""):'<div class="empty">ไม่มีการจอง</div>';
  h+='</div><div class="row" style="margin:10px 0"><button class="btn ghost" data-clr>🗑️ ลบการจองทั้งหมดของวันนี้</button></div>';
  const nl=Object.keys(noshows).map(k=>Object.assign({k:k},noshows[k])),by={};
  nl.forEach(x=>{const r=by[x.uid]||(by[x.uid]={uid:x.uid,name:x.name,sid:x.sid,n:0});r.n++});
  const top=Object.keys(by).map(u=>by[u]).sort((a,b)=>b.n-a.n).slice(0,15);
  h+='<h2>👻 ประวัติคนไม่มาเช็คอิน ('+nl.length+' ครั้ง)</h2><div class="list">';
  h+=top.length?top.map(r=>'<div class="item"><span><b>'+esc(r.name)+'</b> ('+esc(r.sid)+')<br><small class="msg">ไม่มาเช็คอิน '+r.n+' ครั้ง</small></span><button class="btn ghost sm" data-bn="'+esc(r.uid)+'">🚫 ระงับ</button></div>').join(""):'<div class="empty">ยังไม่มีประวัติ</div>';
  const rec=nl.sort((a,b)=>(b.date+pad(b.hour)).localeCompare(a.date+pad(a.hour))).slice(0,10);
  h+=rec.length?'<p class="msg" style="margin:10px 0 4px">ล่าสุด</p>'+rec.map(x=>'<div class="item"><span>กระดาน '+x.board+' · '+fmtD(x.date)+' '+pad(x.hour)+':00<br><small class="msg">'+esc(x.name)+' ('+esc(x.sid)+')</small></span></div>').join("")+'<div class="row" style="margin:8px 0"><button class="btn ghost" data-nclr>ล้างประวัติทั้งหมด</button></div>':'';
  h+='</div>';
  const bl=Object.keys(banned);
  h+='<h2>🚫 ผู้ใช้ที่ถูกระงับ ('+bl.length+')</h2><div class="list">'+(bl.length?bl.map(u=>'<div class="item"><span>'+esc(banned[u].name)+' ('+esc(banned[u].sid)+')</span><button class="btn ghost sm" data-unban="'+esc(u)+'">ปลดระงับ</button></div>').join(""):'<div class="empty">ไม่มี</div>')+'</div>';
  h+='<h2>🖨️ QR เช็คอิน (ติดที่กระดาน พิมพ์ครั้งเดียว)</h2><div class="rule np">QR ชุดนี้มีรหัสลับประจำกระดาน ใช้เช็คอินได้เท่านั้น (ไม่ใช่ QR จอง) ถ้ารหัสหลุดหรือเห็นคนส่งต่อ ให้กดสุ่มรหัสใหม่แล้วพิมพ์ติดใหม่</div>';
  h+='<div class="row" style="margin-bottom:10px">'+(codes?'<button class="btn" data-print>🖨️ พิมพ์ QR</button><button class="btn ghost" data-qnew>🔄 สุ่มรหัสใหม่</button>':'<div class="empty">กำลังสร้างรหัส…</div>')+'</div>';
  $("#aDyn").innerHTML=h;
  const sig=codes?JSON.stringify(codes.t):"none";
  if(v.dataset.sig!==sig){
    v.dataset.sig=sig;const g=$("#aQr");g.innerHTML="";
    if(codes){const base=location.href.split("#")[0];
      for(let b=1;b<=7;b++){
        const d=document.createElement("div");d.className="qc";
        const t=document.createElement("b");t.textContent=ICO[b-1]+" กระดาน "+b;d.appendChild(t);
        const q=document.createElement("div");d.appendChild(q);
        const sm=document.createElement("small");sm.textContent="สแกนเพื่อเช็คอิน";d.appendChild(sm);
        g.appendChild(d);
        try{new QRCode(q,{text:base+"#in-"+b+"-"+codes.t[b],width:200,height:200,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}catch(e){}
      }}
  }
}

                                                                                                                                                                                                                              
