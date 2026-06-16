const {useState,useEffect,useRef,useCallback}=React;
// Brand mark (leaf icon only, no wordmark) recolored per background context.
// Light backgrounds use the primary brand green; dark backgrounds use the light sage tint.
const logoMarkSVG=color=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 253.75 260"><path fill="${color}" fill-rule="evenodd" d="M38.84,0s9.75,16.5-6.75,95.25c0,0-13.5,70.5,14.25,100.5,0,0,5.25-37.5,51-69,0,0-9.75-52.5-26.25-84.75,0,0,30.75,33.75,34.5,76.5,0,0,13.5-8.25,36-12.75,0,0-5.25-57-102.75-105.75"/><path fill="${color}" fill-rule="evenodd" d="M51.13,252.75S25.63,82.5,243.88,116.25c0,0-24,18.75-46.5,71.25s-79.5,101.25-138,75c0,0,50-97.5,132.75-129.75,0,0-78,2.25-141,120"/></svg>`;
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
  draft:{l:'Draft',c:'b-draft'},sent:{l:'Sent',c:'b-sent'},approved:{l:'Approved',c:'b-approved'},
  locked:{l:'Locked',c:'b-locked'},passive:{l:'Passive',c:'b-passive'},
  'po-created':{l:'PO Created',c:'b-po-created'},closed:{l:'Closed',c:'b-closed'},
  paid:{l:'Paid',c:'b-paid'},received:{l:'Received',c:'b-received'},
  overdue:{l:'Overdue',c:'b-overdue'},cancelled:{l:'Cancelled',c:'b-cancelled'},
  pending:{l:'Pending',c:'b-pending'},active:{l:'Active',c:'b-active'},
  completed:{l:'Completed',c:'b-completed'},'on-hold':{l:'On Hold',c:'b-on-hold'},
  declined:{l:'Declined',c:'b-declined'}
};

// Numbering helpers
const padN=n=>String(n).padStart(4,'0');
const genQuoteBase=n=>`Q${padN(n)}`;
const genQuoteNum=(base,rev)=>rev===0?base:`${base}.R${String(rev).padStart(2,'0')}`;
const genSINum=n=>`SI-${padN(n)}`;
const genPQNum=()=>''; // manual
const genPONum=n=>`PO-${padN(n)}`;
const genProjNum=n=>`PRJ-${padN(n)}`;

const LS={
  get:k=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch{return null}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){console.warn('LS.set failed:',k,e.name);}},
  getRaw:k=>{try{return localStorage.getItem(k)||null}catch{return null}},
  setRaw:(k,v)=>{try{localStorage.setItem(k,v);}catch(e){console.warn('LS.setRaw failed:',k,e.name);}},
  del:k=>{try{localStorage.removeItem(k)}catch{}}
};
// Logo stored separately (raw, no JSON) to avoid quota issues with large base64
const LOGO_KEY='gm_logo';
const getLogo=()=>{try{return localStorage.getItem(LOGO_KEY)||'';}catch{return '';}};
const setLogo=v=>{
  try{
    if(v){localStorage.setItem(LOGO_KEY,v);}
    else{localStorage.removeItem(LOGO_KEY);}
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
const DEF_CO={name:'Green Med Ltd',address:'60 Millmead Business Centre\nMill Mead Road\nLondon N17 9QU\nUnited Kingdom',email:'',phone:'',logo:'',invPfx:'INV',invStart:'1',quoPfx:'QUO',quoStart:'1',poPfx:'PO',poStart:'1',sqPfx:'SQ',sqStart:'1',siPfx:'SI',siStart:'1',selectedTemplate:'standard',website:'www.greenmed.uk',banks:[{id:'default',accountName:'Green Med Ltd',accountNumber:'71920536',iban:'GB64 REVO 0099 6945 0761 66',bic:'REVOGB21',isDefault:true}]};
const TEMPLATES={
  standard:{id:'standard',name:'Standard',description:'Pixel-perfect professional template'}
};
const RCATS=['General','Materials','Equipment','Services','Utilities','Rent','Other'];
const EXP_CATS_DEF=['Travel','Accommodation','Meals','Personnel','Office Supplies','Utilities','Professional Services','Other'];

// --- SVG ICONS ---
const I={
  home:<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  invoice:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  quote:<svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>,
  po:<svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  received:<svg viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>,
  project:<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  expense:<svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  settings:<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  search:<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  plus:<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash:<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  eye:<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  dl:<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  mail:<svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  print:<svg viewBox="0 0 24 24"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
  convert:<svg viewBox="0 0 24 24"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>,
  export:<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
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
};
const Ico=({n,size=13,style={}})=>{const s={width:size,height:size,stroke:'currentColor',fill:'none',strokeWidth:1.75,strokeLinecap:'round',strokeLinejoin:'round',flexShrink:0,...style};return React.cloneElement(I[n]||I.dash,{style:s,viewBox:'0 0 24 24'});};
const Badge=({s})=>{const m=SM[s]||SM.draft;return <span className={`bdg ${m.c}`}>{m.l}</span>;};
const Btn=({v='bp',onClick,children,style={},...p})=><button className={`btn ${v}`} onClick={onClick} style={style} {...p}>{children}</button>;
const Fld=({label,children})=><div className="fld"><label>{label}</label>{children}</div>;

// Toast helper
function useToast(){const[t,setT]=useState('');const show=m=>{setT(m);setTimeout(()=>setT(''),2500)};return[t,show];}

// Embedded Arial Fonts (Base64 - Inline)
