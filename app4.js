/* ---------- เปิด/ปิด หน้าต่างต่าง ๆ ---------- */
function openBoard(b){cur=b;date=ds(new Date());renderBoard();$("#ovBoard").classList.add("on");if(location.hash!=="#board-"+b)history.replaceState(null,"","#board-"+b)}
function closeAll(){document.querySelectorAll(".ov").forEach(o=>o.classList.remove("on"));cur=null;if(/^#board-/.test(location.hash))history.replaceState(null,"",location.pathname+location.search)}
function showQr(b){
  const base=location.href.split("#")[0];
  $("#qrT").textContent=b?"QR กระดาน "+b:"QR เข้าเว็บจองกระดานติว";
  const box=$("#qrBox");box.innerHTML="";
  try{new QRCode(box,{text:b?base+"#board-"+b:base,width:240,height:240,colorDark:"#000000",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M})}catch(e){box.textContent="สร้าง QR ไม่สำเร็จ"}
  $("#ovQr").classList.add("on");
}
function route(first){
  const hs=location.hash,a=hs==="#admin"||hs==="#members";
  $("#userView").style.display=a?"none":"";
  $("#adminView").style.display=a?"":"none";
  if(a){render();return}
  const m=/^#board-([1-7])$/.exec(hs);
  if(m){openBoard(+m[1]);return}
  const c=/^#in-([1-7])-([a-z0-9]{6,16})$/.exec(hs);
  if(c&&first){history.replaceState(null,"",location.pathname+location.search);tryCheckin(+c[1],c[2])}
}
function kick(){if(routed||!gotBk||!gotMe)return;routed=true;route(true)}

document.addEventListener("click",e=>{
  const t=e.target.closest("button,.ov");if(!t)return;
  const d=t.dataset||{};
  if(d.open)openBoard(+d.open);
  else if(d.qr)showQr(+d.qr);
  else if(d.day){date=d.day;renderBoard()}
  else if(d.book)book(+d.book);
  else if(d.cancel)cancel(d.cancel,false);
  else if(d.acancel)cancel(d.acancel,true);
  else if(d.tog){const b=d.tog,c=Object.assign({},settings.closed||{});c[b]=!c[b];db.doc("settings/boards").set({closed:c}).catch(()=>toast("บันทึกไม่สำเร็จ"))}
  else if(d.ban){const x=bk[d.ban];if(x)two("b"+x.uid,"แตะอีกครั้งเพื่อระงับ "+x.name,()=>db.doc("banned/"+x.uid).set({name:x.name,sid:x.sid,at:Date.now()}).then(()=>toast("ระงับแล้ว")).catch(()=>toast("ไม่สำเร็จ")))}
  else if(d.unban)db.doc("banned/"+d.unban).delete().then(()=>toast("ปลดระงับแล้ว")).catch(()=>toast("ไม่สำเร็จ"));
  else if("clr" in d)two("clr","แตะอีกครั้งเพื่อลบการจองทั้งหมดของวันนี้",()=>{const n=now().d;Object.keys(bk).filter(k=>bk[k].date===n).forEach(k=>db.doc("bookings/"+k).delete().catch(()=>{}));toast("ลบแล้ว")});
  else if("qnew" in d)two("qnew","แตะอีกครั้งเพื่อสุ่มรหัสใหม่ (QR ที่ติดไว้เดิมจะเช็คอินไม่ได้)",()=>setCodes());
  else if(d.bn){const x=Object.keys(noshows).map(k=>noshows[k]).find(y=>y.uid===d.bn);if(x)two("bn"+x.uid,"แตะอีกครั้งเพื่อระงับ "+x.name,()=>db.doc("banned/"+x.uid).set({name:x.name,sid:x.sid,at:Date.now()}).then(()=>toast("ระงับแล้ว")).catch(()=>toast("ไม่สำเร็จ")))}
  else if("nclr" in d)two("nclr","แตะอีกครั้งเพื่อล้างประวัติทั้งหมด",()=>{Object.keys(noshows).forEach(k=>db.doc("noshows/"+k).delete().catch(()=>{}));toast("ล้างแล้ว")});
  else if("csv" in d)exportCsv();
  else if(d.mban)two("mb"+d.mban,"แตะอีกครั้งเพื่อระงับผู้ใช้นี้",()=>{const x=members[d.mban]||{};db.doc("banned/"+d.mban).set({name:x.name||"",sid:x.sid||"",at:Date.now()}).then(()=>toast("ระงับแล้ว")).catch(()=>toast("ไม่สำเร็จ"))});
  else if("print" in d)window.print();
  else if("alogout" in d)db.signOut().then(()=>location.reload());
  else if("close" in d)closeAll();
  else if(t.id==="aLogin")db.signIn($("#aEmail").value.trim(),$("#aPw").value).then(()=>{$("#adminView").innerHTML="";subAdmin();render()}).catch(()=>toast("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));
  else if(t.classList.contains("ov")&&e.target===t)closeAll();
});
document.addEventListener("input",e=>{if(e.target&&e.target.id==="mQ")renderMembers()});
$("#qrMain").onclick=()=>showQr(0);
$("#meBtn").onclick=()=>{$("#rName").value=me?me.name:"";$("#rSid").value=me?me.sid:"";$("#ovReg").classList.add("on")};
$("#rSave").onclick=async()=>{
  const name=$("#rName").value.trim(),sid=$("#rSid").value.trim();
  if(!name||!sid){toast("กรอกชื่อและรหัสนักศึกษาให้ครบ");return}
  if(!db||!uid){toast("เชื่อมต่อระบบไม่ได้ ลองรีเฟรชหน้าเว็บ");return}
  try{
    const prev=me||{},rec={name:name,sid:sid,at:prev.at||Date.now(),upd:Date.now()};await db.doc("members/"+uid).set(rec);me=rec;
    $("#ovReg").classList.remove("on");render();
    if(pendingIn){const N=pendingIn,C=pendingCode;pendingIn=null;pendingCode="";tryCheckin(N,C)}
  }catch(e){toast("ลงทะเบียนไม่สำเร็จ"+ec(e))}
};
window.addEventListener("hashchange",()=>route(true));

render();
setInterval(()=>{cleanup();render()},30000);
(async()=>{
  try{
    db=await makeDb();dbReady=true;
    db.collection("bookings").onSnapshot(s=>{const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});bk=o;gotBk=true;cleanup();render();kick()},()=>{gotBk=true;kick()});
    db.doc("members/"+uid).onSnapshot(s=>{me=s.exists?s.data():null;gotMe=true;render();kick()},()=>{gotMe=true;kick()});
    db.collection("banned").onSnapshot(s=>{const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});banned=o;render()},()=>{});
    db.doc("settings/boards").onSnapshot(s=>{settings=s.exists?s.data():{};render()},()=>{});
    db.collection("bids").onSnapshot(s=>{const o={};s.docs.forEach(x=>{const v=x.data();if(v)o[x.id]=v});bids=o;lateCheck()},()=>{});
    subAdmin();
  }catch(e){initErr=e;console.error(e)}
  loaded=true;render();
  if(!dbReady)route(false);
})();
                                                          
