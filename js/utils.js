const {useState,useEffect,useRef,useCallback}=React;
// Brand mark (leaf icon only, no wordmark) recolored per background context.
// Light backgrounds use the primary brand green; dark backgrounds use the light sage tint.
const logoMarkSVG=color=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="27 -2 219 274"><path fill="${color}" fill-rule="evenodd" d="M38.84,0s9.75,16.5-6.75,95.25c0,0-13.5,70.5,14.25,100.5,0,0,5.25-37.5,51-69,0,0-9.75-52.5-26.25-84.75,0,0,30.75,33.75,34.5,76.5,0,0,13.5-8.25,36-12.75,0,0-5.25-57-102.75-105.75"/><path fill="${color}" fill-rule="evenodd" d="M51.13,252.75S25.63,82.5,243.88,116.25c0,0-24,18.75-46.5,71.25s-79.5,101.25-138,75c0,0,50-97.5,132.75-129.75,0,0-78,2.25-141,120"/></svg>`;
const LOGO='data:image/svg+xml;base64,'+btoa(logoMarkSVG('#608425'));
const LOGO_DARK='data:image/svg+xml;base64,'+btoa(logoMarkSVG('#a8c070'));
const CURR={GBP:'£',USD:'$',EUR:'€',TRY:'₺'};
const td=()=>new Date().toISOString().slice(0,10);
const addD=(n,f=td())=>{const d=new Date(f);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)};
const uid=()=>Math.random().toString(36).slice(2,9);
const lt=i=>+(+(i.qty||0))*(+(i.price||0));
const dt=items=>(items||[]).reduce((s,i)=>s+lt(i),0);
const fmt=n=>n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const W1=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const W2=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const toW=(n,currency='GBP')=>{
  if(!n||n<0.01)return'Zero';
  const w=x=>{
    if(x<20)return W1[x];
    if(x<100)return W2[Math.floor(x/10)]+(x%10?' '+W1[x%10]:'');
    if(x<1000)return W1[Math.floor(x/100)]+' Hundred'+(x%100?' '+w(x%100):'');
    return w(Math.floor(x/1000))+' Thousand'+(x%1000?' '+w(x%1000):'');
  };
  const p=Math.floor(n),c=Math.round((n-p)*100);
  
  // Currency names and subunits
  const currencyNames={
    GBP:{main:'Pound Sterling',sub:'Pence'},
    USD:{main:'US Dollar',sub:'Cent'},
    EUR:{main:'Euro',sub:'Cent'},
    TRY:{main:'Turkish Lira',sub:'Kuruş'}
  };
  
  const curr=currencyNames[currency]||currencyNames.GBP;
  const mainUnit=p===1?curr.main:curr.main+(currency==='GBP'?'':'s');
  
  return w(p)+' '+mainUnit+(c>0?' and '+w(c)+' '+curr.sub+(c>1&&currency!=='GBP'?'s':''):'');
};

const SM={
  draft:{l:tr('Draft'),c:'b-draft'},sent:{l:tr('Sent'),c:'b-sent'},approved:{l:tr('Approved'),c:'b-approved'},
  locked:{l:tr('Locked'),c:'b-locked'},passive:{l:tr('Passive'),c:'b-passive'},
  'po-created':{l:tr('PO Created'),c:'b-po-created'},closed:{l:tr('Closed'),c:'b-closed'},
  paid:{l:tr('Paid'),c:'b-paid'},partial:{l:tr('Partially Paid'),c:'b-partial'},received:{l:tr('Received'),c:'b-received'},
  unpaid:{l:tr('Unpaid'),c:'b-pending'},
  overdue:{l:tr('Overdue'),c:'b-overdue'},cancelled:{l:tr('Cancelled'),c:'b-cancelled'},
  pending:{l:tr('Pending'),c:'b-pending'},active:{l:tr('Active'),c:'b-active'},
  completed:{l:tr('Completed'),c:'b-completed'},'on-hold':{l:tr('On Hold'),c:'b-on-hold'},
  declined:{l:tr('Declined'),c:'b-declined'}
};

// Numbering helpers
const padN=n=>String(n).padStart(4,'0');
// Next Sales & Procurement document number: prefix + 4 digits (SQ0001), one above the highest
// existing number with that prefix, or the start number when there is none (or it is higher).
const nextDocNum=(pfx,start,existing)=>{
  const re=new RegExp('^'+pfx.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(\\d+)$');
  const top=existing.reduce((m,n)=>{const r=re.exec(n||'');return r?Math.max(m,+r[1]):m;},0);
  return pfx+padN(Math.max(Math.max(1,parseInt(start,10)||1),top+1));
};
const genQuoteNum=(base,rev)=>rev===0?base:`${base}.R${String(rev).padStart(2,'0')}`;
const genPQNum=()=>''; // manual
const genProjNum=n=>`PRJ-${padN(n)}`;

// ── Server sync (PHP API in /api) ──
// localStorage is the working copy. For every synced key we remember what the server last confirmed
// (record versions + content fingerprints, in gm_sync_base), so a save sends only the records that
// changed, each with the version it was based on. The server refuses to overwrite a record someone
// else changed in the meantime and sends its copy back instead (a conflict).
// Keys with unsent changes are listed in gm_sync_pending, which survives reloads and lost connections:
// they are retried until the server accepts them, and a reload never overwrites them with server data.
// The key lists must match api/_bootstrap.php.
const API_BASE='api/';
const SYNC_JSON_KEYS=['gm_users',
  'off_i','off_q','off_p','off_r','off_pr','off_cust','off_banktx','off_expcat','off_incomecat','off_co','off_cnt',
  'ops_cust','ops_proj','ops_sq','ops_si','ops_pq','ops_po','ops_ri','ops_exp','ops_expcat','ops_docs','ops_co','ops_cnt','ops_pp'];
const SYNC_RAW_KEYS=['gm_logo','gm_signature'];
const SYNC_SETTING_KEYS=['off_co','off_cnt','ops_co','ops_cnt','ops_pp',...SYNC_RAW_KEYS];
const isSyncKey=k=>SYNC_JSON_KEYS.includes(k)||SYNC_RAW_KEYS.includes(k);
const isRecordKey=k=>SYNC_JSON_KEYS.includes(k)&&!SYNC_SETTING_KEYS.includes(k);
const SYNC_BASE_KEY='gm_sync_base',SYNC_PENDING_KEY='gm_sync_pending';
const apiCall=async(path,opts={})=>{
  const r=await fetch(API_BASE+path,{credentials:'same-origin',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j.error||('HTTP '+r.status));e.status=r.status;throw e;}
  return j;
};
// Short content fingerprint (cyrb53) — tells which records changed since the last sync
const hashStr=str=>{
  let h1=0xdeadbeef,h2=0x41c6ce57;
  for(let i=0;i<str.length;i++){const ch=str.charCodeAt(i);h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return(4294967296*(2097151&h2)+(h1>>>0)).toString(36);
};
// Record ids in list order; a missing or repeated id falls back to the row position (as the server does)
const recIds=list=>{const seen=new Set();return list.map((r,i)=>{let id=r&&typeof r==='object'&&r.id!=null&&r.id!==''?String(r.id):'';if(!id||seen.has(id))id='__row'+i;seen.add(id);return id;});};
// The server explains refused saves in English; known reasons are shown in the user's language
const reasonText=r=>{
  let m=/^Number (.+) is already used by another document\.$/.exec(r);if(m)return tr('Number {0} is already used by another document.',m[1]);
  m=/^Revision (.+) was already created by another user\.$/.exec(r);if(m)return tr('Revision {0} was already created by another user.',m[1]);
  return r;
};
// What a record is called in messages to the user
const recLabel=r=>(r&&(r.number||r.name||r.company||r.contact||r.desc||r.description||r.title))||tr('A record');
const readStore=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch{return null;}};
const writeStore=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){console.warn('Sync store failed:',k,e.name);}};
const Sync={
  timers:{},inflight:{},again:{},changed:{},retryDelay:0,retryTimer:null,lastError:'',
  base:readStore(SYNC_BASE_KEY)||{},        // records: {v:{id:version},h:{id:hash},o:[id]} · settings: {v:version,h:hash}
  pending:readStore(SYNC_PENDING_KEY)||{user:null,keys:{}},
  pendingKeys(){return Object.keys(this.pending.keys||{});},
  hasPending(){return this.pendingKeys().length>0;},
  saveBase(){writeStore(SYNC_BASE_KEY,this.base);},
  savePending(){writeStore(SYNC_PENDING_KEY,this.pending);},
  status(){window.dispatchEvent(new CustomEvent('sync-status',{detail:{pending:this.pendingKeys().length,error:this.lastError}}));},
  // Called on every local write to a synced key; debounced so rapid saves send one request.
  push(k){
    if(!isSyncKey(k)||k==='gm_users')return; // gm_users is pulled only; changes go through users.php
    this.changed[k]=(this.changed[k]||0)+1;
    const s=readStore('gm_session');
    this.pending.user=(s&&s.userId)||this.pending.user;
    if(!this.pending.keys[k]){this.pending.keys[k]=1;this.savePending();}
    clearTimeout(this.timers[k]);
    this.timers[k]=setTimeout(()=>this.send(k),300);
  },
  // The changes in k since the server's last confirmed state, or null when there are none.
  diff(k){
    const raw=localStorage.getItem(k);
    if(!isRecordKey(k)){
      const b=this.base[k]||{v:0,h:''};
      const h=raw===null?'':hashStr(raw);
      if(h===b.h)return null;
      const value=raw===null?null:SYNC_RAW_KEYS.includes(k)?raw:JSON.parse(raw);
      return{body:{value,base:b.v},h};
    }
    let list=raw?JSON.parse(raw):[];if(!Array.isArray(list))list=[];
    const b=this.base[k]||{v:{},h:{},o:[]};
    const ids=recIds(list),hashes={},upserts=[];
    list.forEach((r,i)=>{
      const id=ids[i],h=hashStr(JSON.stringify(r));hashes[id]=h;
      if(b.h[id]!==h&&r&&typeof r==='object')upserts.push({id,base:b.v[id]||0,data:r});
    });
    const present=new Set(ids);
    const deletes=Object.keys(b.v).filter(id=>!present.has(id)).map(id=>({id,base:b.v[id]}));
    // The server appends new records; send the full order only if the list differs from that
    const expected=[...(b.o||[]).filter(id=>present.has(id)&&b.v[id]),...ids.filter(id=>!b.v[id])];
    const order=expected.join('\n')===ids.join('\n')?undefined:ids;
    if(!upserts.length&&!deletes.length&&!order)return null;
    return{body:{ops:{upserts,deletes,order}},ids,hashes};
  },
  send(k,keepalive=false){
    clearTimeout(this.timers[k]);delete this.timers[k];
    if(this.inflight[k]){this.again[k]=true;return this.inflight[k];}
    const p=this._send(k,keepalive).finally(()=>{
      delete this.inflight[k];
      if(this.again[k]){delete this.again[k];this.timers[k]=setTimeout(()=>this.send(k),0);}
    });
    this.inflight[k]=p;
    return p;
  },
  async _send(k,keepalive){
    const mark=this.changed[k]||0;
    let d;
    try{d=this.diff(k);}catch(e){console.warn('Sync diff failed:',k,e);return false;}
    if(d){
      const body=JSON.stringify(d.body);
      // Browsers cap keepalive (page closing) requests at 64 KB; bigger saves stay pending for the next visit
      if(keepalive&&body.length>60000)return false;
      let res;
      try{res=await apiCall('data.php?key='+encodeURIComponent(k),{method:'PUT',keepalive,body});}
      catch(e){this.failed(k,e);return false;}
      this.apply(k,d,res);
    }
    if((this.changed[k]||0)===mark){delete this.pending.keys[k];this.savePending();}
    else this.again[k]=true; // changed again while this save was on its way
    if(!this.hasPending()){this.lastError='';this.retryDelay=0;}
    this.status();
    return true;
  },
  failed(k,e){
    console.warn('Sync failed:',k,e.message);
    if(e.status===401){window.dispatchEvent(new CustomEvent('sync-unauthorized'));return;}
    this.lastError=e.message;
    this.status();
    if(e.status===426)return; // outdated app: only a reload helps
    // Retry everything pending with a growing pause (5 s … 1 min); a reconnect retries at once
    this.retryDelay=Math.min(60000,this.retryDelay?this.retryDelay*2:5000);
    clearTimeout(this.retryTimer);
    this.retryTimer=setTimeout(()=>this.retryAll(),this.retryDelay);
  },
  retryAll(){this.pendingKeys().forEach(k=>this.send(k));},
  // Stores the server's answer: new versions, and its copy of anything that conflicted or was renumbered.
  apply(k,d,res){
    const notices=[];
    if(!isRecordKey(k)){
      const b=this.base[k]={v:0,h:d.h};
      if(res.conflict){
        b.v=res.conflict.version;
        b.h=this.writeLocal(k,res.conflict.value);
        notices.push(tr(k.startsWith('off_')?'Official settings were changed by another user at the same time. Their version was kept — please check and make your change again.'
          :k.startsWith('ops_')?'Sales & Procurement settings were changed by another user at the same time. Their version was kept — please check and make your change again.'
          :'The logo or signature was changed by another user at the same time. Their version was kept — please check and make your change again.'));
      }else{
        b.v=res.version;
        if(res.value!==undefined)b.h=this.writeLocal(k,res.value); // merged counters
      }
      this.saveBase();
      if(notices.length)window.dispatchEvent(new CustomEvent('sync-conflict',{detail:{notices}}));
      return;
    }
    const b=this.base[k]||(this.base[k]={v:{},h:{},o:[]});
    Object.entries(res.versions||{}).forEach(([id,v])=>{b.v[id]=v;b.h[id]=d.hashes[id];});
    (res.deleted||[]).forEach(id=>{delete b.v[id];delete b.h[id];});
    const renumbered=res.renumbered||[],conflicts=res.conflicts||[];
    if(renumbered.length||conflicts.length){
      let list=readStore(k);if(!Array.isArray(list))list=[];
      const indexOf=id=>recIds(list).indexOf(id);
      renumbered.forEach(r=>{
        const i=indexOf(r.id);if(i<0)return;
        list[i]={...list[i],number:r.to,...(k==='ops_sq'?{base:r.to}:{})};
        b.h[r.id]=hashStr(JSON.stringify(list[i]));
        notices.push(tr('Number {0} was taken by another user at the same moment, so your document was saved as {1}.',r.from,r.to));
      });
      conflicts.forEach(c=>{
        const i=indexOf(c.id),mine=i>=0?list[i]:null;
        if(c.data===null){
          if(i>=0)list.splice(i,1);
          delete b.v[c.id];delete b.h[c.id];
          notices.push(c.reason==='deleted'?tr('{0} was deleted by another user, so your changes to it were not saved.',recLabel(mine)):tr('{0} could not be saved: {1}',recLabel(mine),reasonText(c.reason)));
        }else{
          if(i>=0)list[i]=c.data;else list.push(c.data);
          b.v[c.id]=c.version;b.h[c.id]=hashStr(JSON.stringify(c.data));
          notices.push(c.reason==='changed'?tr('{0} was changed by another user at the same time. Their version was kept — please check it and make your change again.',recLabel(c.data)):tr('{0} could not be saved: {1}',recLabel(mine||c.data),reasonText(c.reason)));
        }
      });
      try{localStorage.setItem(k,JSON.stringify(list));}catch(e){console.warn('Sync write failed:',k,e.name);}
      b.o=recIds(list).filter(id=>b.v[id]);
      this.saveBase();
      if(renumbered.length)this.fixLinkedNumbers(renumbered);
    }else{
      b.o=d.ids.filter(id=>b.v[id]);
      this.saveBase();
    }
    if(notices.length)window.dispatchEvent(new CustomEvent('sync-conflict',{detail:{notices}}));
  },
  // Documents link to each other as {id, number}; point those links at the new number after a renumber.
  fixLinkedNumbers(renumbered){
    const fix=(node,depth)=>{
      if(Array.isArray(node)){let ch=false;const out=node.map(x=>{const y=fix(x,depth+1);if(y!==x)ch=true;return y;});return ch?out:node;}
      if(!node||typeof node!=='object')return node;
      let out=node;
      for(const key in node){const y=fix(node[key],depth+1);if(y!==node[key]){if(out===node)out={...node};out[key]=y;}}
      // depth>1: a link nested inside a record, not a top-level record (those were renumbered already)
      const r=depth>1&&renumbered.find(x=>out.id===x.id&&out.number===x.from);
      if(r)out={...out,number:r.to};
      return out;
    };
    SYNC_JSON_KEYS.filter(k=>isRecordKey(k)&&k!=='gm_users').forEach(key=>{
      const list=readStore(key);if(!Array.isArray(list))return;
      const next=fix(list,0);
      if(next!==list){writeStore(key,next);this.push(key);}
    });
  },
  // Writes a value from the server into localStorage (without sending it back); returns its fingerprint.
  writeLocal(k,v){
    try{
      if(v===null||v===undefined){localStorage.removeItem(k);return '';}
      const raw=SYNC_RAW_KEYS.includes(k)?String(v):JSON.stringify(v);
      localStorage.setItem(k,raw);
      if(k==='gm_logo')window.dispatchEvent(new CustomEvent('logo-changed',{detail:{logo:raw}}));
      if(k==='gm_signature')window.dispatchEvent(new CustomEvent('signature-changed',{detail:{signature:raw}}));
      return hashStr(raw);
    }catch(e){console.warn('Sync write failed:',k,e.name);return '';}
  },
  // Page closing: send what fits in a keepalive request; the rest stays pending for next time.
  flush(){this.pendingKeys().forEach(k=>{clearTimeout(this.timers[k]);if(!this.inflight[k])this.send(k,true);});},
  // Sends everything pending and waits; resolves true when nothing is left unsent.
  async flushNow(){
    for(let i=0;i<3&&(this.hasPending()||Object.keys(this.inflight).length);i++){
      await Promise.all(this.pendingKeys().map(k=>this.send(k)));
      await Promise.all(Object.values(this.inflight));
      if(this.lastError)break;
    }
    return !this.hasPending();
  },
  // Unsent changes belong to the user who made them; another user signing in on this browser drops them.
  adoptPending(userId){
    if(this.hasPending()&&this.pending.user&&this.pending.user!==userId){
      console.warn('Discarding unsent changes of another user:',this.pendingKeys());
      this.pending={user:userId,keys:{}};this.savePending();
    }
  },
  // Replaces the local copy of every synced key with the server's data — except keys with unsent changes.
  async pull(){
    const{data,versions={}}=await apiCall('data.php');
    const pend=new Set(this.pendingKeys());
    [...SYNC_JSON_KEYS,...SYNC_RAW_KEYS].forEach(k=>{
      if(pend.has(k))return;
      const v=data[k];
      try{
        if(v===null||v===undefined)localStorage.removeItem(k);
        else localStorage.setItem(k,SYNC_RAW_KEYS.includes(k)?v:JSON.stringify(v));
      }catch(e){console.warn('Sync pull failed:',k,e.name);}
      if(isRecordKey(k)){
        const list=Array.isArray(v)?v:[],vv=versions[k]||{},ids=recIds(list),b={v:{},h:{},o:ids};
        list.forEach((r,i)=>{b.v[ids[i]]=vv[ids[i]]||1;b.h[ids[i]]=hashStr(JSON.stringify(r));});
        this.base[k]=b;
      }else{
        const raw=v===null||v===undefined?null:SYNC_RAW_KEYS.includes(k)?v:JSON.stringify(v);
        this.base[k]={v:versions[k]||0,h:raw===null?'':hashStr(raw)};
      }
    });
    this.saveBase();
    window.dispatchEvent(new CustomEvent('logo-changed',{detail:{logo:getLogo()}}));
    window.dispatchEvent(new CustomEvent('signature-changed',{detail:{signature:getSignature()}}));
  },
  clearLocal(){
    Object.values(this.timers).forEach(clearTimeout);this.timers={};
    this.base={};this.pending={user:null,keys:{}};this.lastError='';
    [...SYNC_JSON_KEYS,...SYNC_RAW_KEYS,SYNC_BASE_KEY,SYNC_PENDING_KEY].forEach(k=>{try{localStorage.removeItem(k);}catch{}});
    this.status();
  }
};
window.addEventListener('beforeunload',()=>Sync.flush());
window.addEventListener('online',()=>Sync.retryAll());

const LS={
  get:k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));Sync.push(k);}catch(e){console.warn('LS.set failed:',k,e.name);}},
  getRaw:k=>{try{return localStorage.getItem(k)||null}catch{return null}},
  setRaw:(k,v)=>{try{localStorage.setItem(k,v);Sync.push(k);}catch(e){console.warn('LS.setRaw failed:',k,e.name);}},
  del:k=>{try{localStorage.removeItem(k);Sync.push(k);}catch{}}
};
// Central session helpers
const getSession=()=>LS.get('gm_session');
const setSession=s=>LS.set('gm_session',s);
const clearSession=()=>LS.del('gm_session');

// User accounts are changed only through api/users.php (passwords are hashed server-side).
// Returns the updated user list (without password hashes) and refreshes the local copy.
const usersApi=async(action,payload)=>{
  const{users}=await apiCall('users.php',{method:'POST',body:JSON.stringify({action,...payload})});
  LS.set('gm_users',users);
  return users;
};

// ── Sidebar attention ──
// Two separate signals on a menu item:
//  • a dot + bold label for records added since the user last opened that page (clears on opening it, like
//    unread channels in Buzz) — handled in PortalSidebar;
//  • a small count badge for records that need action (drafts, overdue, unpaid, stale replies). It stays until
//    the records themselves change; it is red when something is overdue.
// att() takes [count, message, urgent?] pairs and returns {n, urgent, reasons} (zero counts are dropped).
const isOverdue=d=>!!d.dueDate&&d.dueDate<td()&&!['paid','cancelled','closed','draft'].includes(d.status);
// Waiting for an answer is normal; only a wait of more than two weeks is worth a reminder
const STALE_DAYS=14;
const isStale=d=>!!d.date&&d.date<addD(-STALE_DAYS);
const att=(...pairs)=>{
  const on=pairs.filter(([n])=>n>0);
  return{n:on.reduce((s,[n])=>s+n,0),urgent:on.some(([,,u])=>u),reasons:on.map(([n,msg])=>tr(msg,n))};
};
const countWhere=(list,fn)=>(list||[]).filter(fn).length;

// ── Heavy libraries on demand ──
// The Excel library, jsPDF and the embedded PDF fonts (~1.9 MB together) are loaded the first time they are
// needed instead of on every page load. Their URLs live in index.html (#gm-lazy) so the deploy build can
// stamp the local font file with a content hash.
const LAZY_SRC=(()=>{try{return JSON.parse(document.getElementById('gm-lazy').textContent);}catch{return{};}})();
const lazyScripts={};
const loadScript=src=>lazyScripts[src]||(lazyScripts[src]=new Promise((resolve,reject)=>{
  const s=document.createElement('script');
  s.src=src;s.async=false;
  s.onload=()=>resolve();
  s.onerror=()=>{delete lazyScripts[src];s.remove();reject(new Error('Could not load '+src));};
  document.head.appendChild(s);
}));
const ensureXLSX=()=>window.XLSX?Promise.resolve():loadScript(LAZY_SRC.xlsx);
const ensurePDF=()=>Promise.all([
  window.jspdf?null:loadScript(LAZY_SRC.jspdf),
  typeof ARIAL_REGULAR_BASE64!=='undefined'?null:loadScript(LAZY_SRC.fonts),
]);
const libLoadFailed=()=>alert(tr('A required component could not be loaded. Check your internet connection and try again.'));

// Logo stored separately (raw, no JSON) to avoid quota issues with large base64
const LOGO_KEY='gm_logo';
const getLogo=()=>{try{return localStorage.getItem(LOGO_KEY)||'';}catch{return '';}};
const setLogo=v=>{
  try{
    if(v){localStorage.setItem(LOGO_KEY,v);}
    else{localStorage.removeItem(LOGO_KEY);}
    Sync.push(LOGO_KEY);
    // Notify all components that logo changed
    window.dispatchEvent(new CustomEvent('logo-changed',{detail:{logo:v||''}}));
  }catch(e){console.warn('setLogo failed:',e.name,e.message);}
};
// Hook: always returns current logo, re-renders when logo changes
function useLogo(){
  const[logo,setL]=useState(getLogo);
  useEffect(()=>{
    const handler=(e)=>setL(e.detail.logo);
    window.addEventListener('logo-changed',handler);
    return()=>window.removeEventListener('logo-changed',handler);
  },[]);
  return logo;
}

// Signature stored separately (same pattern as logo)
const SIGNATURE_KEY='gm_signature';
const getSignature=()=>{try{return localStorage.getItem(SIGNATURE_KEY)||'';}catch{return '';}};
const setSignature=v=>{
  try{
    if(v){localStorage.setItem(SIGNATURE_KEY,v);}
    else{localStorage.removeItem(SIGNATURE_KEY);}
    Sync.push(SIGNATURE_KEY);
    window.dispatchEvent(new CustomEvent('signature-changed',{detail:{signature:v||''}}));
  }catch(e){console.warn('setSignature failed:',e.name,e.message);}
};
function useSignature(){
  const[signature,setS]=useState(getSignature);
  useEffect(()=>{
    const handler=(e)=>setS(e.detail.signature);
    window.addEventListener('signature-changed',handler);
    return()=>window.removeEventListener('signature-changed',handler);
  },[]);
  return signature;
}

const ITRM=['Due on Receipt','Net 7','Net 14','Net 30'];
const DEF_CO={name:'Green Med Ltd',address:'60 Millmead Business Centre\nMill Mead Road\nLondon N17 9QU\nUnited Kingdom',email:'',phone:'',logo:'',invPfx:'INV',invStart:'1',quoPfx:'QUO',quoStart:'1',poPfx:'PO',poStart:'1',sqPfx:'SQ',sqStart:'1',siPfx:'SI',siStart:'1',selectedTemplate:'standard',website:'www.greenmed.uk',banks:[]};
const TEMPLATES={
  standard:{id:'standard',name:'Standard',description:'Pixel-perfect professional template'}
};
const RCATS=['General','Materials','Equipment','Services','Utilities','Rent','Other'];
const EXP_CATS_DEF=['Travel','Accommodation','Meals','Personnel','Office Supplies','Utilities','Professional Services','Other'];
const INCOME_CATS_DEF=['Product Sales','Service Income','Consulting','Interest','Other Income'];
const groupCats=cats=>{
  const mains=cats.filter(c=>!c.parentId);
  return mains.map(m=>({main:m,children:cats.filter(c=>c.parentId===m.id)}));
};

// Maps a spreadsheet header cell to a known line-item field, so bulk item import
// works regardless of column order and tolerates a few common header spellings.
const IMPORT_HEADER_MAP={
  item:['item code','item','code','sku','item no','item number'],
  desc:['description','desc','name','item name','item description'],
  brand:['brand'],
  model:['model'],
  category:['category','cat'],
  qty:['qty','quantity'],
  unit:['unit','uom','units'],
  price:['unit price','price','sale price','unitprice','sales price'],
  date:['date'],
  amount:['amount','total'],
  currency:['currency','ccy'],
  reference:['reference','receipt no','receipt number','ref'],
  project:['project'],
  employee:['employee','spent by','staff','employee name'],
  notes:['notes','note','remarks']
};
const IMPORT_HEADER_ALIASES=h=>{
  const norm=String(h||'').toLowerCase().trim();
  for(const key in IMPORT_HEADER_MAP){if(IMPORT_HEADER_MAP[key].includes(norm))return key;}
  return null;
};

// --- SVG ICONS ---
const I={
  home:<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  sq:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="6" y1="11" x2="12" y2="11"/><line x1="6" y1="14" x2="12" y2="14"/><line x1="6" y1="17" x2="10" y2="17"/><line x1="15" y1="14" x2="23" y2="14"/><polyline points="20 11 23 14 20 17"/></svg>,
  si:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="10" x2="9" y2="18"/><path d="M12.5 11.5H7.5a1.5 1.5 0 0 0 0 3H11.5a1.5 1.5 0 0 1 0 3H7"/><line x1="15" y1="14" x2="23" y2="14"/><polyline points="20 11 23 14 20 17"/></svg>,
  rq:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="10" y1="11" x2="17" y2="11"/><line x1="10" y1="14" x2="17" y2="14"/><line x1="10" y1="17" x2="14" y2="17"/><line x1="1" y1="14" x2="8" y2="14"/><polyline points="4 11 1 14 4 17"/></svg>,
  ri:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="14" y1="10" x2="14" y2="18"/><path d="M17.5 11.5H12.5a1.5 1.5 0 0 0 0 3H16.5a1.5 1.5 0 0 1 0 3H12"/><line x1="1" y1="14" x2="8" y2="14"/><polyline points="4 11 1 14 4 17"/></svg>,
  invoice:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  quote:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  po:<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  received:<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  project:<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  expense:<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  income:<svg viewBox="0 0 24 24"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  settings:<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  user:<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  bank:<svg viewBox="0 0 24 24"><line x1="3" y1="21" x2="21" y2="21"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="5 6 12 3 19 6"/><line x1="4" y1="10" x2="4" y2="21"/><line x1="20" y1="10" x2="20" y2="21"/><line x1="8" y1="14" x2="8" y2="17"/><line x1="12" y1="14" x2="12" y2="17"/><line x1="16" y1="14" x2="16" y2="17"/></svg>,
  logout:<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  search:<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  eye:<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  dl:<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  mail:<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  send:<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  print:<svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  convert:<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  export:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="7" y1="11" x2="13" y2="18"/><line x1="13" y1="11" x2="7" y2="18"/><line x1="17" y1="12" x2="17" y2="20"/><polyline points="15 18 17 20 19 18"/></svg>,
  upload:<svg viewBox="0 0 24 24"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  lock:<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  unlock:<svg viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>,
  warn:<svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  dash:<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  customers:<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  pool:<svg viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  back:<svg viewBox="0 0 24 24"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  rev:<svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>,
  check:<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>,
  clipboard:<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  tag:<svg viewBox="0 0 24 24"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  hash:<svg viewBox="0 0 24 24"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>,
  card:<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  globe:<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  chevron:<svg viewBox="0 0 24 24"><polyline points="8 9 12 5 16 9"/><polyline points="16 15 12 19 8 15"/></svg>,
  file:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  shield:<svg viewBox="0 0 24 24"><path d="M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6z"/></svg>,
};
const Ico=({n,size=13,style={}})=>{const s={width:size,height:size,stroke:'currentColor',fill:'none',strokeWidth:1.75,strokeLinecap:'round',strokeLinejoin:'round',flexShrink:0,...style};return React.cloneElement(I[n]||I.dash,{style:s,viewBox:'0 0 24 24'});};
// Renders a <colgroup> for a table.dt from relative column weights (proportional to max expected content length),
// so column widths stay fixed and predictable instead of the browser rebalancing them per row's content.
const Cg=({w})=>{const sum=w.reduce((a,b)=>a+b,0);return <colgroup>{w.map((x,i)=><col key={i} style={{width:(x/sum*100)+'%'}}/>)}</colgroup>;};
// User photo (users.avatar, a small square data URL) or, without one, the first letter of the name
const Avatar=({user,name,className,children})=>{
  const src=user&&user.avatar;
  return <span className={className}>{src?<img src={src} alt=""/>:((name||'?')[0]||'?').toUpperCase()}{children}</span>;
};
// Crops an image file to a centred square and shrinks it to size×size JPEG, so a phone photo of several MB
// becomes a ~15 KB data URL. Resolves with the data URL; rejects when the file is not a readable image.
const squareImage=(file,size=160)=>new Promise((resolve,reject)=>{
  if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){reject(new Error('type'));return;}
  const url=URL.createObjectURL(file);
  const img=new Image();
  img.onload=()=>{
    const side=Math.min(img.naturalWidth,img.naturalHeight);
    const c=document.createElement('canvas');c.width=c.height=size;
    const ctx=c.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,size,size); // transparent PNGs get a white background
    ctx.drawImage(img,(img.naturalWidth-side)/2,(img.naturalHeight-side)/2,side,side,0,0,size,size);
    URL.revokeObjectURL(url);
    resolve(c.toDataURL('image/jpeg',0.85));
  };
  img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('read'));};
  img.src=url;
});
const Badge=({s})=>{const m=SM[s]||SM.draft;return <span className={`bdg ${m.c}`}>{m.l}</span>;};
const Btn=({v='bp',onClick,children,style={},...p})=><button className={`btn ${v}`} onClick={onClick} style={style} {...p}>{children}</button>;
const Fld=({label,children})=><div className="fld"><label>{label}</label>{children}</div>;

// Global confirm dialog, mounted on its own React root outside the main app tree.
// Portal/Operational/Official forms are nested inside their parent component's render body,
// so a confirm dialog whose visibility lived in that parent's state would re-render the parent
// on open/close — which recreates the nested form's identity and remounts it, silently
// discarding whatever the user was mid-edit on. Keeping this dialog's state fully outside that
// tree means opening/closing it never touches AppOperational/AppOfficial's render at all.
// Call askUnsaved() (or the generic askGlobalConfirm(msg)) from anywhere; both return a Promise<boolean>.
function GlobalConfirmDialog(){
  const[state,setState]=useState(null);
  useEffect(()=>{
    window.__askGlobalConfirm=(msg,opts={})=>new Promise(resolve=>{
      window.__globalConfirmResolve=resolve;
      setState({msg,confirmLabel:opts.confirmLabel||tr('Leave without saving'),cancelLabel:opts.cancelLabel||tr('Cancel')});
    });
  },[]);
  if(!state)return null;
  const close=result=>{
    setState(null);
    const resolve=window.__globalConfirmResolve;
    window.__globalConfirmResolve=null;
    resolve&&resolve(result);
  };
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:99999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>close(false)}>
      <div style={{background:'#fff',borderRadius:12,padding:'28px 32px',minWidth:320,maxWidth:440,boxShadow:'0 8px 40px rgba(0,0,0,.18)',display:'flex',flexDirection:'column',gap:20}} onClick={e=>e.stopPropagation()}>
        <p style={{margin:0,fontSize:14.5,lineHeight:1.6,color:'var(--g700)',fontWeight:500}}>{state.msg}</p>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button style={{padding:'7px 20px',borderRadius:7,border:'1.5px solid var(--g200)',background:'#fff',color:'var(--g600)',fontSize:13,fontWeight:500,cursor:'pointer'}} onClick={()=>close(false)}>{state.cancelLabel}</button>
          <button style={{padding:'7px 20px',borderRadius:7,border:'none',background:'var(--gm-600)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={()=>close(true)}>{state.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
(function mountGlobalConfirmDialog(){
  const el=document.createElement('div');
  el.id='global-confirm-root';
  document.body.appendChild(el);
  ReactDOM.createRoot(el).render(<GlobalConfirmDialog/>);
})();
const askGlobalConfirm=(msg,opts)=>window.__askGlobalConfirm(msg,opts);
const askUnsaved=()=>askGlobalConfirm(tr('You have unsaved changes. Leave without saving?'));
// Case-insensitive "does this name already exist" check — "Acme Ltd" and "ACME LTD" read as
// the same record to a person, so callers use this to warn before quietly creating a near-duplicate.
const findCaseInsensitiveDup=(list,field,value,excludeId)=>{
  const v=(value||'').trim().toLowerCase();
  if(!v)return null;
  return list.find(x=>x.id!==excludeId&&(x[field]||'').trim().toLowerCase()===v)||null;
};
const askDuplicateOk=(kind,name)=>askGlobalConfirm(tr("A {0} named \"{1}\" already exists. Save anyway?", kind, name),{confirmLabel:tr('Save Anyway')});

// Name/company casing, applied on save (not while typing) so "acme ltd" and "ACME LTD" both
// end up stored as "Acme Ltd" — keeps lookups, exports and PDFs consistent regardless of input habits.
const toTitleCase=s=>{
  const t=(s||'').trim();
  if(!t)return t;
  return t.toLowerCase().replace(/(^|[\s\-\/])\S/g,c=>c.toUpperCase());
};
// Free-text fields (notes, addresses, descriptions) only get their first letter capitalized —
// title-casing these would wrongly capitalize every word in a sentence.
const toSentenceCase=s=>{
  const t=(s||'').trim();
  return t?t.charAt(0).toUpperCase()+t.slice(1):t;
};

// Toast helper
function useToast(){const[t,setT]=useState('');const show=m=>{setT(m);setTimeout(()=>setT(''),2500)};return[t,show];}

// Table sorting. Default order is newest date first and, within the same day, the highest document number first —
// so freshly added records always land on page 1. Clicking a header sorts by that column; ties fall back to
// date then number so rows with equal values never shuffle. Numbers compare naturally (CI0099 < CI00100, R03 < R10).
const natCmp=(a,b)=>{
  if(typeof a==='number'&&typeof b==='number')return a-b;
  return String(a==null?'':a).localeCompare(String(b==null?'':b),undefined,{numeric:true,sensitivity:'base'});
};
function useSort(defaultKey='date',defaultDir='desc'){
  const[sort,setSort]=useState({key:defaultKey,dir:defaultDir});
  // A new column starts ascending, except date which starts newest-first
  const onSort=key=>setSort(p=>p.key===key?{key,dir:p.dir==='asc'?'desc':'asc'}:{key,dir:key==='date'?'desc':'asc'});
  return{sort,onSort};
}
// cols maps sort keys to row=>value accessors; 'date' and 'no' (when given) are used as tie-breakers
const sortRows=(rows,sort,cols)=>{
  const get=cols[sort.key];
  const sign=sort.dir==='asc'?1:-1;
  const tie=['date','no'].filter(k=>cols[k]&&k!==sort.key);
  // Sorting by date/number keeps the tie-break in the same direction; any other column falls back to newest first
  const tieSign=sort.key==='date'||sort.key==='no'?sign:-1;
  return[...rows].sort((a,b)=>{
    if(get){const c=natCmp(get(a),get(b));if(c)return c*sign;}
    for(const k of tie){const c=natCmp(cols[k](a),cols[k](b));if(c)return c*tieSign;}
    return 0;
  });
};
const SortTh=({k,sort,onSort,className,style,children})=>{
  const on=sort.key===k;
  return <th className={'sth'+(className?' '+className:'')} style={style} tabIndex={0} aria-sort={on?(sort.dir==='asc'?'ascending':'descending'):'none'}
    onClick={()=>onSort(k)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSort(k);}}}>
    {children}<span className="sth-i">{on?(sort.dir==='asc'?'▲':'▼'):'↕'}</span>
  </th>;
};

function usePagination(filterKey,defaultSize=25){const[pg,setPg]=useState(1);const[ps,setPs]=useState(defaultSize);useEffect(()=>{setPg(1);},[filterKey]);return{pg,ps,setPg,setPs};}
function Pagination({total,page,pageSize,onPageChange,onPageSizeChange}){if(!total)return null;const pages=Math.ceil(total/pageSize);const s=(page-1)*pageSize+1,e=Math.min(page*pageSize,total);const nums=()=>{if(pages<=7)return Array.from({length:pages},(_,i)=>i+1);const r=[1];if(page>3)r.push('…');for(let i=Math.max(2,page-1);i<=Math.min(pages-1,page+1);i++)r.push(i);if(page<pages-2)r.push('…');r.push(pages);return r;};const pb=(active,disabled)=>({display:'inline-flex',alignItems:'center',justifyContent:'center',minWidth:28,height:28,padding:'0 6px',border:`1px solid ${active?'var(--gm-400)':'var(--g200)'}`,borderRadius:5,background:active?'var(--gm-400)':'var(--g50)',color:active?'#fff':disabled?'var(--g300)':'var(--g700)',fontSize:12,fontWeight:active?700:500,cursor:disabled?'default':'pointer',transition:'background .15s,border-color .15s,color .15s',outline:'none'});return(<div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 14px',borderTop:'1px solid var(--g200)',flexWrap:'wrap',background:'var(--g50)',borderRadius:'0 0 8px 8px'}}><span style={{fontSize:12,color:'var(--g500)',flex:1}}>{tr("Showing {0}–{1} of {2}", s, e, total)}</span><div style={{display:'flex',alignItems:'center',gap:5}}><span style={{fontSize:11,color:'var(--g500)'}}>{tr("Per page:")}</span><select value={pageSize} onChange={ev=>onPageSizeChange(+ev.target.value)} style={{border:'1px solid var(--g200)',borderRadius:5,padding:'3px 6px',fontSize:12,color:'var(--g700)',background:'var(--white)',cursor:'pointer'}}>{[10,25,50].map(n=><option key={n} value={n}>{n}</option>)}</select></div>{pages>1&&<div style={{display:'flex',alignItems:'center',gap:3}}><button style={pb(false,page===1)} disabled={page===1} onClick={()=>onPageChange(page-1)}>‹</button>{nums().map((p,i)=>p==='…'?<span key={`e${i}`} style={{fontSize:12,color:'var(--g400)',padding:'0 2px',lineHeight:'28px'}}>…</span>:<button key={p} style={pb(p===page,false)} onClick={()=>onPageChange(p)}>{p}</button>)}<button style={pb(false,page===pages)} disabled={page===pages} onClick={()=>onPageChange(page+1)}>›</button></div>}</div>);}

// Embedded Arial Fonts (Base64 - Inline)
