/* ---------- แสดงผล ---------- */
function banner(){
  let t="";
  const need=myLive().filter(x=>!x.checkedIn&&Date.now()>=st(x)-EARLY);
  if(demo)t="🧪 โหมดทดลอง: ข้อมูลเก็บในเครื่องนี้เท่านั้น (ยังไม่ได้ตั้งค่า Firebase)";
  else if(!dbReady&&loaded)t="⚠️ เชื่อมต่อระบบจองไม่ได้ ลองรีเฟรชหน้าเว็บ"+ec(initErr);
  else if(dbReady&&!me&&!isAdmin())t="👋 ยังไม่ได้ลงทะเบียน กดปุ่ม “ลงทะเบียน” ด้านบนก่อนจอง";
  let h=t?'<div class="banner">'+t+'</div>':"";
  if(need.length)h+='<div class="banner warn">⏰ ถึงเวลาเช็คอิน! '+need.map(x=>"กระดาน "+x.board+" ก่อน "+hm(x.expiresAt)+" น.").join(" · ")+' — สแกน QR ที่กระดาน ไม่งั้นระบบจะยกเลิกการจองให้อัตโนมัติ</div>';
  $("#banner").innerHTML=h;
  $("#meBtn").textContent=me?"👤 "+me.name:"ลงทะเบียน";
}
function render(){
  banner();
  if(/^#(admin|members)$/.test(location.hash)){renderAdmin();return}
  const n=now();
  let h="";
  for(let b=1;b<=7;b++){
    const cl=closed(b),x=L(key(n.d,b,n.h));
    let free=0;HRS.forEach(k=>{if(k>=n.h&&!L(key(n.d,b,k)))free++});
    const inH=n.h>=HRS[0]&&n.h<=HRS[HRS.length-1];
    let s;
    if(cl)s='<div class="st off">🛠️ ปิดปรับปรุง</div>';
    else if(!inH)s='<div class="st ok">🟢 นอกเวลา · วันนี้ว่าง '+free+' ชม.</div>';
    else if(x)s='<div class="st no">🔴 ไม่ว่าง · '+(x.checkedIn?"กำลังใช้งาน":"จองแล้ว รอเช็คอิน")+' · '+esc(x.name)+'</div>';
    else s='<div class="st ok">🟢 ว่างตอนนี้ · วันนี้ว่างอีก '+free+' ชม.</div>';
    h+='<div class="card" style="--c:'+COL[b-1]+'"><div class="top"><div class="badge">'+ICO[b-1]+'</div><div><b>กระดาน '+b+'</b><small>08:00 – 20:00</small></div></div>'+s+
    '<div class="row"><button class="btn" data-open="'+b+'"'+(cl?" disabled":"")+'>จอง</button><button class="btn ghost" data-qr="'+b+'">QR</button></div></div>';
  }
  $("#boards").innerHTML=h;
  const mine=myLive().filter(x=>x.date>=n.d).sort((a,b)=>(a.date+pad(a.hour)).localeCompare(b.date+pad(b.hour)));
  $("#mine").innerHTML=mine.length?mine.map(x=>'<div class="item"><span>'+(x.checkedIn?"✅":"🔵")+' กระดาน '+x.board+' · '+fmtD(x.date)+' · '+pad(x.hour)+':00–'+pad(x.hour+1)+':00<br><small class="msg">'+(x.checkedIn?"เช็คอินแล้ว":"ต้องเช็คอินก่อน "+hm(x.expiresAt)+" น.")+'</small></span><button class="btn ghost sm" data-cancel="'+x.k+'">ยกเลิก</button></div>').join(""):'<div class="empty">ยังไม่มีการจอง</div>';
  if(cur)renderBoard();
}
function renderBoard(){
  const n=now(),b=cur;
  let days="";
  for(let i=0;i<7;i++){const d=new Date();d.setDate(d.getDate()+i);const k=ds(d);days+='<button class="day'+(k===date?" on":"")+'" data-day="'+k+'">'+(i?TH[d.getDay()]:"วันนี้")+'<br><small>'+d.getDate()+"/"+(d.getMonth()+1)+'</small></button>'}
  let sl="";
  HRS.forEach(h=>{
    const k=key(date,b,h),x=L(k),past=date===n.d&&h<n.h,lbl=pad(h)+":00–"+pad(h+1)+":00";
    if(closed(b))sl+='<button class="slot p" disabled>'+lbl+'<small>ปิดปรับปรุง</small></button>';
    else if(x&&x.uid===uid)sl+='<button class="slot m" data-cancel="'+k+'">'+lbl+'<small>'+(x.checkedIn?"✅ เช็คอินแล้ว":"ของฉัน · แตะเพื่อยกเลิก")+'</small></button>';
    else if(x)sl+='<button class="slot t" disabled>'+lbl+'<small>'+esc(x.name)+(x.checkedIn?" · ใช้งานอยู่":" · รอเช็คอิน")+'</small></button>';
    else if(past)sl+='<button class="slot p" disabled>'+lbl+'<small>ผ่านไปแล้ว</small></button>';
    else sl+='<button class="slot f" data-book="'+h+'">'+lbl+'<small>ว่าง</small></button>';
  });
  $("#shBoard").innerHTML='<h3>'+ICO[b-1]+' กระดาน '+b+'</h3><div class="days">'+days+'</div><div class="slots">'+sl+'</div><div class="row" style="margin-top:14px"><button class="btn ghost" data-close>ปิด</button></div>';
}

/* ---------- จอง / ยกเลิก / เช็คอิน ---------- */
function clashed(k,bid){
  const m=bids[bid];if(!m||!m.t)return false;
  return Object.keys(bids).some(id=>{const x=bids[id];return id!==bid&&x.slot===k&&x.uid!==uid&&x.t&&Math.abs(x.t-m.t)<CLASH});
}
function showClash(){
  $("#clM").textContent=CLASHMSG[Math.floor(Math.random()*CLASHMSG.length)];
  $("#ovClash").classList.add("on");
}
function lateCheck(){
  Object.keys(watchK).forEach(k=>{const w=watchK[k];
    if(Date.now()>w.until){delete watchK[k];return}
    if(clashed(k,w.bid)){delete watchK[k];db.doc("bookings/"+k).delete().catch(()=>{});showClash()}});
}
async function book(h){
  if(!db){toast("ยังเชื่อมต่อระบบจองไม่ได้");return}
  if(!me){$("#ovReg").classList.add("on");return}
  if(banned[uid]){toast("บัญชีของคุณถูกระงับการจอง ติดต่อผู้ดูแล");return}
  if(closed(cur)){toast("กระดานนี้ปิดปรับปรุง");return}
  const k=key(date,cur,h),board=cur,bd=date;
  if(L(k)){toast("ช่วงเวลานี้ถูกจองไปแล้ว");return}
  if(myLive().filter(x=>x.date===bd).length>=LIMIT){toast("จองได้สูงสุด "+LIMIT+" ชั่วโมงต่อวัน");return}
  if(busy)return;busy=true;
  const bid=k+"_"+uid+"_"+Date.now().toString(36);
  try{
    toast("กำลังจอง… ⏳");
    await db.doc("bids/"+bid).set({slot:k,uid:uid,name:me.name,t:db.ts()});
    await sleep(WINDOW);
    if(clashed(k,bid)){showClash();return}
    const start=startOf(bd,h),n=Date.now();
    if(bk[k]&&!live(bk[k]))await db.doc("bookings/"+k).delete();
    await db.doc("bookings/"+k).set({board:board,date:bd,hour:h,uid:uid,name:me.name,sid:me.sid,at:n,start:start,expiresAt:Math.max(start,n)+GRACE,checkedIn:false});
    watchK[k]={bid:bid,until:Date.now()+4000};
    toast("จองสำเร็จ ✅ สแกน QR ที่กระดานเพื่อเช็คอินภายใน 15 นาทีหลัง "+pad(h)+":00");
  }catch(e){toast("จองไม่สำเร็จ (อาจมีคนจองไปก่อน) ลองใหม่อีกครั้ง"+ec(e))}
  finally{busy=false;setTimeout(()=>{db.doc("bids/"+bid).delete().catch(()=>{})},8000)}
}
function cancel(k,adm){
  const x=bk[k];
  if(!x||!db||(x.uid!==uid&&!(adm&&isAdmin())))return;
  two("c"+k,"แตะอีกครั้งเพื่อยืนยันยกเลิก",()=>db.doc("bookings/"+k).delete().then(()=>toast("ยกเลิกแล้ว")).catch(e=>toast("ยกเลิกไม่สำเร็จ"+ec(e))));
}
async function tryCheckin(N,code){
  if(!db)return;
  if(!me){pendingIn=N;pendingCode=code;$("#ovReg").classList.add("on");return}
  const n=Date.now(),mineN=myLive().filter(x=>x.board===N&&!x.checkedIn).sort((a,b)=>st(a)-st(b));
  const ok=mineN.filter(x=>n>=st(x)-EARLY)[0];
  if(ok){
    try{
      await db.doc("checkins/"+ok.k).set({uid:uid,bat:ok.at,ck:code||""});
      await db.doc("bookings/"+ok.k).update({checkedIn:true,checkedAt:n});
      toast("✅ เช็คอินสำเร็จ กระดาน "+N);
    }catch(e){toast("เช็คอินไม่สำเร็จ ให้สแกน QR เช็คอินที่ติดบนกระดานอีกครั้ง"+ec(e))}
  }else if(mineN[0]&&mineN[0].date===now().d)toast("ยังไม่ถึงเวลาเช็คอิน เริ่มเช็คอินได้ตอน "+hm(st(mineN[0])-EARLY)+" น.");
}

      
