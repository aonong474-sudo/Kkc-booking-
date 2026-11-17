/* ---------- หน้าผู้ดูแล ---------- */
function subAdmin(){
  if(adminSubbed||!db||!(demo||userEmail))return;adminSubbed=true;
  db.collection("noshows").onSnapshot(s=>{adminFlag=true;const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});noshows=o;render()},()=>{});
}
function renderAdmin(){
  const v=$("#adminView");
  if(!isAdmin()){
    if(!$("#aEmail"))v.innerHTML='<div class="card" style="--c:#4f46e5;max-width:420px;margin:16px auto"><h3>🔧 เข้าสู่ระบบผู้ดูแล</h3><input id="aEmail" type="email" placeholder="อีเมลผู้ดูแล"><input id="aPw" type="password" placeholder="รหัสผ่าน"><button class="btn" id="aLogin" style="width:100%">เข้าสู่ระบบ</button></div>';
    return;
  }
  if(!$("#aDyn")){v.innerHTML='<div id="aDyn"></div><div class="qrgrid" id="aQr"></div>';v.dataset.sig=""}
  const n=now();
  const all=Object.keys(bk).map(k=>Object.assign({k:k},bk[k])).filter(x=>live(x)&&x.date>=n.d).sort((a,b)=>(a.date+pad(a.hour)+a.board).localeCompare(b.date+pad(b.hour)+b.board));
  const td=all.filter(x=>x.date===n.d),cin=td.filter(x=>x.checkedIn).length;
  let h='<h2>📊 วันนี้</h2><div class="stats"><div class="stat mine"><b>'+td.length+'</b>จองทั้งหมด</div><div class="stat ok"><b>'+cin+'</b>เช็คอินแล้ว</div><div class="stat no"><b>'+(td.length-cin)+'</b>รอเช็คอิน</div></div>';
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
  h+='<h2>🖨️ QR ติดที่กระดาน (สแกนเพื่อจอง + เช็คอิน)</h2><div class="row" style="max-width:260px;margin-bottom:10px"><button class="btn" data-print>🖨️ พิมพ์ QR</button></div>';
  $("#aDyn").innerHTML=h;
  if(v.dataset.sig!=="qr"){
    v.dataset.sig="qr";const g=$("#aQr");g.innerHTML="";const base=location.href.split("#")[0];
    for(let b=1;b<=7;b++){
      const d=document.createElement("div");d.className="qc";
      const t=document.createElement("b");t.textContent=ICO[b-1]+" กระดาน "+b;d.appendChild(t);
      const q=document.createElement("div");d.appendChild(q);
      const sm=document.createElement("small");sm.textContent="สแกนเพื่อจอง / เช็คอิน";d.appendChild(sm);
      g.appendChild(d);
      try{new QRCode(q,{text:base+"#board-"+b,width:200,height:200,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}catch(e){}
    }
  }
}

  
