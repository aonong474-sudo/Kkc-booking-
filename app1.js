/* ============ ตั้งค่า (แก้ตรงนี้) ============
   1) ค่า Firebase: ถ้าเว้นว่าง = โหมดทดลอง (ข้อมูลอยู่ในเครื่องเดียว)
   2) ผู้ดูแล: ระบบรู้จากฝั่งเซิร์ฟเวอร์ (กฎใน Firebase) ไม่ต้องใส่อีเมลในไฟล์นี้ */
const CFG={apiKey:"AIzaSyBdplM1-zJCgmETIhUnqNkxi7MWZ492cVA",authDomain:"rmuti-kkc-booking.firebaseapp.com",projectId:"rmuti-kkc-booking",appId:"1:304934849200:web:23834b0deef06ce642c975"};
/* ============================================ */

const COL=['#ef4444','#f97316','#eab308','#22c55e','#06b6d4','#6366f1','#d946ef'];
const ICO=['📐','🧪','📊','✏️','🧮','📚','💡'];
const HRS=[8,9,10,11,12,13,14,15,16,17,18,19];
const LIMIT=3,GRACE=15*60000,EARLY=10*60000;
const TH=["อา","จ","อ","พ","พฤ","ศ","ส"];
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ds=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const key=(d,b,h)=>"d"+d.replace(/-/g,"")+"-b"+b+"-h"+h;
const startOf=(d,h)=>{const p=d.split("-").map(Number);return new Date(p[0],p[1]-1,p[2],h).getTime()};
const hm=ms=>{const d=new Date(ms);return pad(d.getHours())+":"+pad(d.getMinutes())};
const fmtD=s=>{const d=new Date(s+"T00:00:00");return TH[d.getDay()]+" "+d.getDate()+"/"+(d.getMonth()+1)};
const now=()=>{const n=new Date();return{d:ds(n),h:n.getHours()}};

let initErr=null,adminFlag=false,db=null,uid=null,userEmail=null,me=null,bk={},banned={},settings={},bids={},noshows={},codes=null,members={};
let date=ds(new Date()),cur=null,dbReady=false,loaded=false,demo=false;
let gotBk=false,gotMe=false,routed=false,pend=null,tt=null,pendingIn=null,pendingCode="";
const tried=new Set(),watchK={};
let adminSubbed=false,busy=false,gotCodes=false,ensuring=false;
const WINDOW=1300,CLASH=1500;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const CLASHMSG=["ใจตรงกันเกินไป! 😅 มีคนกดจองช่วงเวลานี้พร้อมคุณในเสี้ยววินาที ระบบเลยยกเลิกการจองรอบนี้ของทั้งคู่ กดจองใหม่อีกครั้งได้เลย","ชนกันเป๊ะ! ⚡ กระดานนี้ถูกกดจองพร้อมกันพอดี ไม่มีใครเร็วกว่าใคร ระบบขอยกเลิกให้ลงใหม่อีกรอบนะ","เกิดอุบัติเหตุหัวใจตรงกัน 💥 มีคนจองช่วงเวลานี้ในเสี้ยววินาทีเดียวกัน ระบบเคลียร์ให้แล้ว ลองจองอีกครั้ง คนที่กดก่อนจะได้ไป"];

const st=x=>x.start||startOf(x.date,x.hour);
const live=x=>!!x&&(x.checkedIn||Date.now()<=x.expiresAt);
const L=k=>{const x=bk[k];return live(x)?x:null};
const isAdmin=()=>adminFlag;
const closed=b=>!!(settings.closed&&settings.closed[b]);
const myLive=()=>Object.keys(bk).filter(k=>bk[k].uid===uid&&live(bk[k])).map(k=>Object.assign({k:k},bk[k]));

function toast(m){let e=$("#toast");if(!e){e=document.createElement("div");e.id="toast";e.style.cssText="position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#1e2433;color:#fff;padding:10px 16px;border-radius:12px;z-index:50;font-size:.9rem;max-width:90%;text-align:center";document.body.appendChild(e)}e.textContent=m;e.style.display="block";clearTimeout(tt);tt=setTimeout(()=>{e.style.display="none"},3500)}
window.alert=toast;
const ec=e=>e&&(e.code||e.message)?" ["+String(e.code||e.message).replace("firestore/","").slice(0,70)+"]":"";
function two(id,msg,fn){if(pend!==id){pend=id;toast(msg);setTimeout(()=>{if(pend===id)pend=null},4000);return}pend=null;fn()}

/* ---------- ชั้นข้อมูล: Firebase หรือโหมดทดลอง ---------- */
async function makeDb(){
  if(!CFG.projectId){
    demo=true;adminFlag=true;
    const ld=c=>{try{return JSON.parse(localStorage.getItem("kkc_"+c)||"{}")}catch(e){return{}}},sv=(c,o)=>localStorage.setItem("kkc_"+c,JSON.stringify(o));
    uid=localStorage.getItem("kkc_uid");if(!uid){uid="u"+Math.random().toString(36).slice(2,10);localStorage.setItem("kkc_uid",uid)}
    const ls=[];const fire=()=>ls.forEach(f=>f());
    window.addEventListener("storage",fire);
    const api={
      doc(p){const c=p.split("/")[0],id=p.split("/")[1];return{
        set:async d=>{const o=ld(c);o[id]=d;sv(c,o);fire()},
        update:async d=>{const o=ld(c);o[id]=Object.assign({},o[id],d);sv(c,o);fire()},
        delete:async()=>{const o=ld(c);delete o[id];sv(c,o);fire()},
        onSnapshot(cb){const f=()=>{const v=ld(c)[id];cb({exists:!!v,data:()=>v})};ls.push(f);f()}}},
      collection(c){return{onSnapshot(cb){const f=()=>cb({docs:Object.keys(ld(c)).map(id=>({id:id,data:()=>ld(c)[id]}))});ls.push(f);f()}}},
      ts:()=>Date.now(),
      signIn:async()=>{},signOut:async()=>{}
    };
    api.batch=async ops=>{for(const o of ops){const r=api.doc(o.path);if(o.op==="delete")await r.delete();else await r.set(o.data)}};
    return api;
  }
  const B="https://www.gstatic.com/firebasejs/10.12.2/";
  const {initializeApp}=await import(B+"firebase-app.js");
  const fs=await import(B+"firebase-firestore.js");
  const au=await import(B+"firebase-auth.js");
  const app=initializeApp(CFG),f=fs.initializeFirestore(app,{experimentalAutoDetectLongPolling:true}),a=au.getAuth(app);
  if(a.authStateReady)await a.authStateReady();
  if(!a.currentUser)await au.signInAnonymously(a);
  uid=a.currentUser.uid;userEmail=a.currentUser.email;
  const norm=o=>{if(!o)return o;const r={};Object.keys(o).forEach(k=>{const v=o[k];r[k]=(v&&typeof v.toMillis==="function")?v.toMillis():v});return r};
  return{
    doc(p){const r=fs.doc(f,p);return{set:d=>fs.setDoc(r,d),update:d=>fs.updateDoc(r,d),delete:()=>fs.deleteDoc(r),
      onSnapshot:(cb,er)=>fs.onSnapshot(r,x=>cb({exists:x.exists(),data:()=>norm(x.data())}),er)}},
    collection(c){const r=fs.collection(f,c);return{
      onSnapshot:(cb,er)=>fs.onSnapshot(r,x=>cb({docs:x.docs.map(d=>({id:d.id,data:()=>norm(d.data())}))}),er)}},
    ts:()=>fs.serverTimestamp(),
    batch:ops=>{const b=fs.writeBatch(f);ops.forEach(o=>{const r=fs.doc(f,o.path);if(o.op==="delete")b.delete(r);else b.set(r,o.data)});return b.commit()},
    signIn:async(e,p)=>{const r=await au.signInWithEmailAndPassword(a,e,p);uid=r.user.uid;userEmail=r.user.email},
    signOut:async()=>{await au.signOut(a)}
  };
}

/* ---------- ยกเลิกคิวที่ไม่เช็คอินอัตโนมัติ ---------- */
function cleanup(){
  if(!db)return;
  Object.keys(bk).forEach(k=>{const x=bk[k];
    if(x&&!x.checkedIn&&Date.now()>x.expiresAt+3000&&!tried.has(k)){
      tried.add(k);
      db.batch([{op:"set",path:"noshows/"+k,data:{uid:x.uid,name:x.name,sid:x.sid,board:x.board,date:x.date,hour:x.hour,at:Date.now()}},{op:"delete",path:"bookings/"+k}])
        .catch(()=>db.doc("bookings/"+k).delete().catch(()=>{tried.delete(k)}));
    }});
  Object.keys(bids).forEach(id=>{const b=bids[id];
    if(b.t&&Date.now()-b.t>60000&&!tried.has(id)){tried.add(id);db.doc("bids/"+id).delete().catch(()=>{})}});
}

  
