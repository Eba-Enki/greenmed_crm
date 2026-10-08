
// ==========================
// OFFICIAL MODULE
// ==========================
function AppOfficial({session,onPortalSwitch,onLogout,onSessionUpdate,onOpenProfile}){
  const ns='off_';
  const[view,setView]=useState('home');
  const[prev,setPrev]=useState('home');
  const[inv,setInv]=useState([]);const[quo,setQuo]=useState([]);
  const[pos,setPos]=useState([]);const[rec,setRec]=useState([]);
  const[projects,setProjects]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[expCats,setExpCats]=useState([]);
  const[incomeCats,setIncomeCats]=useState([]);
  const[cnt,setCnt]=useState({i:0,q:0,p:0,r:0});
  const[co,setCo]=useState(DEF_CO);
  const[cur,setCur]=useState(null);
  const[toast,showToast]=useToast();
  const[bankTx,setBankTx]=useState([]);
  const[selectedBankId,setSelectedBankId]=useState(null);
  const[selectedContactId,setSelectedContactId]=useState(null);
  const[editingBank,setEditingBank]=useState(null);
  const[categoryBrowse,setCategoryBrowse]=useState(null);
  const[editingCategory,setEditingCategory]=useState(null);
  // Set by whichever form is currently mounted (see each form's "dirtyCheckRef.current=..." line);
  // reset to null right before render so a non-form view never carries a stale checker over.
  const dirtyCheckRef=useRef(null);
  const goGuarded=(v,from)=>{
    if(dirtyCheckRef.current&&dirtyCheckRef.current())askUnsaved().then(ok=>{if(ok)go(v,from);});
    else go(v,from);
  };
  const guardedPortalSwitch=p=>{
    if(dirtyCheckRef.current&&dirtyCheckRef.current())askUnsaved().then(ok=>{if(ok)onPortalSwitch(p);});
    else onPortalSwitch(p);
  };
  const guardedLogout=()=>{
    if(dirtyCheckRef.current&&dirtyCheckRef.current())askUnsaved().then(ok=>{if(ok)onLogout();});
    else onLogout();
  };
  // Switching language reloads the page, so an open form's unsaved edits need the same guard
  const guardedLang=l=>{
    if(dirtyCheckRef.current&&dirtyCheckRef.current())askUnsaved().then(ok=>{if(ok)setLang(l);});
    else setLang(l);
  };

  useEffect(()=>{
    const a=LS.get(ns+'i'),b=LS.get(ns+'q'),c=LS.get(ns+'p'),d=LS.get(ns+'r'),
          e=LS.get(ns+'pr'),f=LS.get(ns+'cnt'),g=LS.get(ns+'co'),
          k=LS.get(ns+'expcat'),l=LS.get(ns+'cust'),
          m=LS.get(ns+'banktx'),n=LS.get(ns+'incomecat');
    if(a)setInv(a);else setInv([]);
    if(b)setQuo(b);else setQuo([]);
    if(c)setPos(c);else setPos([]);
    if(d)setRec(d);else setRec([]);
    if(e)setProjects(e);else setProjects([]);
    if(f)setCnt(f);else setCnt({i:0,q:0,p:0,r:0});
    const logo=getLogo();
    if(g){
      const merged={...DEF_CO,...g,logo:logo||''};
      if((!merged.banks||merged.banks.length===0)&&(merged.accountName||merged.accountNumber||merged.iban||merged.bic)){
        merged.banks=[{id:uid(),accountName:merged.accountName||'',accountNumber:merged.accountNumber||'',iban:merged.iban||'',bic:merged.bic||'',currency:'GBP',openingBalance:0,isDefault:true}];
      }
      setCo(merged);
    }else setCo({...DEF_CO,logo:logo||''});
    if(k)setExpCats(k);else setExpCats(EXP_CATS_DEF.map(n=>({id:uid(),name:n})));
    if(l){const migrated=l.map(c=>{if('name'in c&&!('contact'in c)){const{name,...rest}=c;return{...rest,contact:name};}return c;});setCustomers(migrated);if(migrated.some((c,i)=>c!==l[i]))LS.set(ns+'cust',migrated);}else setCustomers([]);
    if(m)setBankTx(m);else setBankTx([]);
    if(n)setIncomeCats(n);else setIncomeCats(INCOME_CATS_DEF.map(nm=>({id:uid(),name:nm})));
    setView('home');setCur(null);
  },[]);

  const go=(v,from)=>{setPrev(from||view);setView(v)};
  const si=d=>{setInv(d);LS.set(ns+'i',d)};const sq=d=>{setQuo(d);LS.set(ns+'q',d)};
  const sp=d=>{setPos(d);LS.set(ns+'p',d)};const sr=d=>{setRec(d);LS.set(ns+'r',d)};
  const spr=d=>{setProjects(d);LS.set(ns+'pr',d)};
  const sc=d=>{setCnt(d);LS.set(ns+'cnt',d)};
  const sExpCats=d=>{setExpCats(d);LS.set(ns+'expcat',d)};
  const sIncomeCats=d=>{setIncomeCats(d);LS.set(ns+'incomecat',d)};
  const saveCategory=(cat)=>{
    const{direction,...rest}=cat;
    const list=direction==='in'?incomeCats:expCats;
    const setter=direction==='in'?sIncomeCats:sExpCats;
    const idx=list.findIndex(c=>c.id===rest.id);
    setter(idx>=0?list.map((c,i)=>i===idx?rest:c):[...list,{...rest,id:rest.id||uid()}]);
  };
  const deleteCategory=(direction,id,hasChildren)=>{
    if(hasChildren&&!confirm(tr('Delete this category and its sub-categories?')))return;
    const list=direction==='in'?incomeCats:expCats;
    const setter=direction==='in'?sIncomeCats:sExpCats;
    setter(list.filter(c=>c.id!==id&&c.parentId!==id));
  };
  const sCust=d=>{setCustomers(d);LS.set(ns+'cust',d)};
  const sBankTx=d=>{setBankTx(d);LS.set(ns+'banktx',d)};

  const saveBank=(bank)=>{
    const banks=co.banks||[];
    const idx=banks.findIndex(b=>b.id===bank.id);
    let next=idx>=0?banks.map((b,i)=>i===idx?bank:b):[...banks,bank];
    if(bank.isDefault)next=next.map(b=>({...b,isDefault:b.id===bank.id}));
    const newCo={...co,banks:next};
    setCo(newCo);LS.set(ns+'co',newCo);
  };
  const deleteBank=(id)=>{
    if(!confirm(tr('Delete this bank account? Its transactions will also be deleted.')))return;
    const newCo={...co,banks:(co.banks||[]).filter(b=>b.id!==id)};
    setCo(newCo);LS.set(ns+'co',newCo);
    sBankTx(bankTx.filter(t=>t.accountId!==id));
    showToast(tr('Deleted'));
  };
  const setDefaultBank=(id)=>{
    const newCo={...co,banks:(co.banks||[]).map(b=>({...b,isDefault:b.id===id}))};
    setCo(newCo);LS.set(ns+'co',newCo);
  };
  const accountBalance=(bank)=>+(bank.openingBalance||0)+bankTx.filter(t=>t.accountId===bank.id).reduce((s,t)=>s+(t.type==='in'?+t.amount:-t.amount),0);

  // Paid / Partially Paid follow the payments allocated to a document. Only documents touched by the
  // change are updated, so statuses set by hand on other documents (e.g. old records) are left alone.
  const syncDocStatuses=(nextTx,refs)=>{
    if(!refs.length)return;
    const alloc=allocatedByDoc(nextTx);
    const keys=new Set(refs.map(r=>docKey(r.type,r.id)));
    const upd=(list,type,unpaid)=>list.map(d=>{
      if(!keys.has(docKey(type,d.id)))return d;
      const paid=alloc[docKey(type,d.id)]||0;
      const status=paid>0.005&&paid>=docTotal(d)-0.005?'paid':paid>0.005?'partial':(d.status==='paid'||d.status==='partial'?unpaid:d.status);
      return status===d.status?d:{...d,status};
    });
    if(refs.some(r=>r.type==='invoice'))si(upd(inv,'invoice','sent'));
    if(refs.some(r=>r.type==='received'))sr(upd(rec,'received','pending'));
  };
  // A cross-currency payment (tx.xpay) is one figure on the statement (xpay.total). The bank fee is split
  // into its own expense row (xpayLeg 'fee'), the payment row (xpayLeg 'pay') carries the rest; together
  // they still net to the statement figure. Out: £1,287.09 = £1,265.50 payment + £21.59 fee.
  const handleSaveBankTx=(txIn)=>{
    const fresh=!txIn.id;
    const{xpayLeg,...base}=txIn;
    const saved=fresh?{...base,id:uid()}:base;
    const prevTx=fresh?null:bankTx.find(t=>t.id===saved.id);
    const prevFee=prevTx&&prevTx.xpay?bankTx.find(t=>t.xpayLeg==='fee'&&t.xpay&&t.xpay.id===prevTx.xpay.id):null;
    const legs=[saved];
    if(saved.xpay){
      const x=saved.xpay;
      const accC=((co.banks||[]).find(b=>b.id===saved.accountId)||{}).currency||'GBP';
      saved.amount=r2(saved.type==='out'?x.total-x.fee:x.total+x.fee);saved.xpayLeg='pay';
      if(x.fee)legs.push({id:(prevFee&&prevFee.id)||uid(),accountId:saved.accountId,date:saved.date,kind:'expense',type:'out',amount:x.fee,category:x.feeCategory,
        description:`Payment fee · ${saved.type==='out'?accC+' → '+x.currency:x.currency+' → '+accC}${saved.contactName?' · '+saved.contactName:''}`,reference:saved.reference||'',contactId:'',contactName:'',linkedDoc:null,allocations:[],xpay:x,xpayLeg:'fee'});
    }else delete saved.xpay;
    const drop=new Set([saved.id,prevFee&&prevFee.id].filter(Boolean));
    const next=[...bankTx.filter(t=>!drop.has(t.id)),...legs];
    sBankTx(next);
    syncDocStatuses(next,[...(prevTx?txAllocs(prevTx):[]),...txAllocs(saved)]);
    showToast(tr('Saved ✓'));
    go(prev);
  };
  const handleDeleteBankTx=(t)=>{
    if(t.fx){
      // Both legs of a currency exchange go together, so balances never end up one-sided
      if(!confirm(tr('Delete this currency exchange? It is removed from both accounts.')))return;
      sBankTx(bankTx.filter(x=>!(x.fx&&x.fx.id===t.fx.id)));
      showToast(tr('Deleted'));
      return;
    }
    if(t.xpay){
      if(!confirm(tr('Delete this payment? Its fee row is removed too.')))return;
      const pay=bankTx.find(x=>x.xpay&&x.xpay.id===t.xpay.id&&x.xpayLeg==='pay');
      const next=bankTx.filter(x=>!(x.xpay&&x.xpay.id===t.xpay.id));
      sBankTx(next);syncDocStatuses(next,pay?txAllocs(pay):[]);showToast(tr('Deleted'));
      return;
    }
    if(!confirm(tr('Delete this transaction?')))return;
    const next=bankTx.filter(x=>x.id!==t.id);
    sBankTx(next);
    syncDocStatuses(next,txAllocs(t));
    showToast(tr('Deleted'));
  };

  // Currency exchange (e.g. USD → EUR) is stored as linked transactions sharing fx.id (fxLeg marks the role):
  //  out: money out of the source account (sold)
  //  in:  gross amount into the target account (received + fee)
  //  fee: the fee out of the target account, as an expense in its category (e.g. Bank Fee)
  // The statement shows the net figure (EUR 75.00 × 0.834676 − £0.38 fee = £62.22); in − fee nets to it,
  // so balances still match. The conversion itself is neither income nor expense, so out/in carry no category.
  const handleSaveFx=f=>{
    const from=(co.banks||[]).find(b=>b.id===f.fromAccountId);
    const to=(co.banks||[]).find(b=>b.id===f.toAccountId);
    const fee=Math.round(+(f.fee||0)*100)/100;
    const fx={id:f.id||uid(),fromAccountId:f.fromAccountId,toAccountId:f.toAccountId,
      fromCurrency:(from&&from.currency)||'GBP',toCurrency:(to&&to.currency)||'GBP',
      sold:+f.sold,rate:+f.rate,fee,feeCategory:fee?f.feeCategory:'',received:+f.received,note:(f.description||'').trim()};
    const prevLegs=bankTx.filter(t=>t.fx&&t.fx.id===fx.id);
    const legId=leg=>((prevLegs.find(t=>t.fxLeg===leg)||{}).id)||uid();
    const common={date:f.date,reference:(f.reference||'').trim(),linkedDoc:null,fx};
    const legs=[
      {...common,id:legId('out'),fxLeg:'out',accountId:fx.fromAccountId,type:'out',amount:fx.sold,description:fx.note,category:''},
      {...common,id:legId('in'),fxLeg:'in',accountId:fx.toAccountId,type:'in',amount:Math.round((fx.received+fee)*100)/100,description:fx.note,category:''},
    ];
    if(fee)legs.push({...common,id:legId('fee'),fxLeg:'fee',accountId:fx.toAccountId,type:'out',amount:fee,
      description:`Exchange fee · ${fx.fromCurrency} → ${fx.toCurrency}`,category:fx.feeCategory});
    sBankTx([...bankTx.filter(t=>!(t.fx&&t.fx.id===fx.id)),...legs]);
    showToast(tr('Exchange saved'));
    go(prev);
  };
  // Rows of linked groups open the form of the whole group
  const editTx=t=>{
    if(t.fx){setCur(fxFormState(t));go('off_fx_form');return;}
    if(t.xpayLeg==='fee'){const pay=bankTx.find(x=>x.xpay&&x.xpay.id===t.xpay.id&&x.xpayLeg==='pay');if(pay){setCur(pay);go('off_banktx_form');}return;}
    setCur(t);go('off_banktx_form');
  };
  const fxFormState=t=>({id:t.fx.id,date:t.date,fromAccountId:t.fx.fromAccountId,toAccountId:t.fx.toAccountId,
    sold:String(t.fx.sold),rate:String(t.fx.rate),fee:t.fx.fee?String(t.fx.fee):'',feeCategory:t.fx.feeCategory||'',received:String(t.fx.received),
    reference:t.reference||'',description:t.fx.note!=null?t.fx.note:(t.description||'')});

  // Automatic numbering can be switched off in Settings (e.g. to enter old documents with their
  // original numbers); then numbers are typed by hand and the counters stay where they are.
  const autoNumber=co.autoNumber!==false;
  const docsOfType=type=>type==='invoice'?inv:type==='po'?pos:type==='quote'?quo:rec;
  const cntKey=type=>type==='invoice'?'i':type==='po'?'p':'q';
  const fmtN=(type,n)=>{
    const pfx=type==='invoice'?(co.invPfx||'INV'):type==='po'?(co.poPfx||'PO'):(co.quoPfx||'QUO');
    const start=parseInt(type==='invoice'?(co.invStart||1):type==='po'?(co.poStart||1):(co.quoStart||1),10);
    return `${pfx}-${String(start+n).padStart(6,'0')}`;
  };
  // Next counter position whose number isn't already taken (a hand-typed old number may match)
  const nextSeq=type=>{
    const used=new Set(docsOfType(type).map(d=>(d.number||'').trim().toLowerCase()));
    let n=cnt[cntKey(type)];
    while(used.has(fmtN(type,n).toLowerCase()))n++;
    return n;
  };
  const genN=type=>fmtN(type,nextSeq(type));

  const mkDoc=(type)=>({id:null,type,number:autoNumber?genN(type):'',date:td(),dueDate:type==='invoice'?td():addD(30),terms:type==='invoice'?'Due on Receipt':'Valid for 30 days',currency:'GBP',status:'draft',project:'',client:{name:'',address:'',email:'',ref:''},items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:'Thanks for your business.'});
  const mkRec=()=>({id:null,type:'received',number:'',supplier:'',supplierAddress:'',email:'',ref:'',date:td(),dueDate:addD(30),terms:'Due on Receipt',currency:'GBP',status:'pending',project:'',items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});
  const handleSave=docIn=>{
    const doc={...docIn,number:(docIn.number||'').trim()};
    if(doc.type!=='received'){
      if(!doc.number){alert(tr('Enter a document number.'));return;}
      const dup=docsOfType(doc.type).find(d=>d.id!==doc.id&&(d.number||'').trim().toLowerCase()===doc.number.toLowerCase());
      if(dup){alert(tr("Number \"{0}\" is already used by another {1}. Enter a different number.", doc.number, doc.type==='po'?tr('purchase order'):doc.type));return;}
    }
    const fresh=!doc.id;const saved=fresh?{...doc,id:uid()}:doc;
    if(doc.type==='invoice')si(fresh?[...inv,saved]:inv.map(d=>d.id===saved.id?saved:d));
    else if(doc.type==='quote')sq(fresh?[...quo,saved]:quo.map(d=>d.id===saved.id?saved:d));
    else if(doc.type==='po')sp(fresh?[...pos,saved]:pos.map(d=>d.id===saved.id?saved:d));
    else sr(fresh?[...rec,saved]:rec.map(d=>d.id===saved.id?saved:d));
    // Hand-typed numbers (automatic numbering off) don't consume a counter position
    if(fresh&&autoNumber&&doc.type!=='received')sc({...cnt,[cntKey(doc.type)]:nextSeq(doc.type)+1});
    showToast(tr('Saved ✓'));
    go(doc.type==='invoice'?'off_invoices':doc.type==='po'?'off_pos':doc.type==='received'?'off_received':'off_quotes');
  };
  const handleDel=doc=>{
    if(!confirm(tr("Delete {0}?", doc.number||doc.supplier)))return false;
    if(doc.type==='invoice')si(inv.filter(d=>d.id!==doc.id));
    else if(doc.type==='quote')sq(quo.filter(d=>d.id!==doc.id));
    else if(doc.type==='po')sp(pos.filter(d=>d.id!==doc.id));
    else sr(rec.filter(d=>d.id!==doc.id));
    if(doc.type==='invoice'||doc.type==='received')sBankTx(bankTx.map(t=>{const al=txAllocs(t);if(!al.some(x=>x.type===doc.type&&x.id===doc.id))return t;return{...t,linkedDoc:null,allocations:al.filter(x=>!(x.type===doc.type&&x.id===doc.id))};}));
    showToast(tr('Deleted'));
    return true;
  };
  const handleSavePrj=p=>{const fresh=!p.id;const saved=fresh?{...p,id:uid()}:p;spr(fresh?[...projects,saved]:projects.map(d=>d.id===saved.id?saved:d));showToast(tr('Saved ✓'));go('projects');};
  const handleSaveCust=c=>{const fresh=!c.id;const saved=fresh?{...c,id:uid()}:c;sCust(fresh?[...customers,saved]:customers.map(x=>x.id===saved.id?saved:x));showToast(tr('Saved ✓'));go('off_customers');};

  // Simple generic form
  function SimpleDocForm({doc:init,onSave,onCancel,onPreview}){
    const[doc,setDoc]=useState(init);
    const[items,setItems]=useState(init.items||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
    const set=(p,v)=>setDoc(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const isInv=doc.type==='invoice';const isPO=doc.type==='po';const isRec=doc.type==='received';
    const trms=isInv||isRec?ITRM:['Due on Receipt','Valid for 30 days','Valid for 14 days'];
    const sts=isInv?['draft','sent','partial','paid','overdue','cancelled']:isPO?['draft','sent','approved','received','cancelled']:isRec?['pending','partial','paid','overdue','cancelled']:['draft','sent','accepted','declined','cancelled'];
    const typeLabel=isInv?tr('Invoice'):isPO?tr('Purchase Order'):isRec?tr('Received Invoice'):tr('Quotation');
    const savedDoc={...doc,items};
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify(savedDoc)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=_isDirty;
    return(
      <div className="content"><div className="fw">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
          <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Ico n="back"/>{tr("Back")}</button>
          <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{doc.id?tr("Edit {0}", typeLabel):tr("New {0}", typeLabel)}</h2>
          <div style={{flex:1}}/>
          {onPreview&&<Btn v="bgh bsm" onClick={()=>onPreview(savedDoc)}><Ico n="eye"/>{tr("Preview")}</Btn>}
          <Btn v="bgh bsm" onClick={()=>savePDF(savedDoc,co,doc.type)}><Ico n="dl"/>{tr("PDF")}</Btn>
          <Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>{tr("Save {0}", typeLabel)}</Btn>
        </div>
        <div className="fc"><div className="fct">{tr("Document Details")}</div>
          <div className="fg g3">
            <Fld label={tr("No")}><input value={doc.number||''} onChange={e=>set('number',e.target.value)} className="fi" readOnly={!isRec&&autoNumber} placeholder={!isRec&&!autoNumber?tr('Type the document number'):''} style={!isRec?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld>
            <Fld label={tr("Date")}><input type="date" value={doc.date||''} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
            <Fld label={isInv?tr("Due Date"):isRec?tr("Due Date"):tr("Valid Until")}><input type="date" value={doc.dueDate||addD(30)} onChange={e=>set('dueDate',e.target.value)} className="fi"/></Fld>
          </div>
          <div className="fg g4" style={{marginTop:12}}>
            <Fld label={tr("Currency")}><select value={doc.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
            <Fld label={tr("Terms")}><select value={doc.terms||''} onChange={e=>set('terms',e.target.value)} className="fi">{trms.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>
            <Fld label={tr("Status")}><select value={doc.status||'draft'} onChange={e=>set('status',e.target.value)} className="fi">{sts.map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}</select></Fld>
            <Fld label={tr("Project")}><select value={doc.project||''} onChange={e=>set('project',e.target.value)} className="fi"><option value="">{tr("— None —")}</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Fld>
          </div>
        </div>
        <div className="fc"><div className="fct">{isRec||isPO?tr('Vendor / Supplier'):tr('Bill To')}</div>
          {(()=>{const pickList=customers.filter(c=>{const t=c.type||'customer';return(isRec||isPO)?(t==='supplier'||t==='both'):(t==='customer'||t==='both');});return pickList.length>0&&<div style={{marginBottom:12}}>
            <select className="fi" style={{maxWidth:320}} onChange={e=>{const c=pickList.find(x=>x.id===e.target.value);if(c){if(isRec||isPO){set('supplier',c.company||c.name);set('supplierAddress',c.address||'');}else{set('client.name',c.company||c.name);set('client.email',c.email||'');set('client.address',c.address||'');}}}}>
              <option value="">{tr("— Quick fill from {0} —", isRec||isPO?tr('Suppliers'):tr('Customers'))}</option>
              {pickList.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
            </select>
          </div>;})()}
          {(isRec||isPO)?(<div className="fg g2">
            <Fld label={tr("Supplier Name")}><input value={doc.supplier||''} onChange={e=>set('supplier',e.target.value)} placeholder={tr("Supplier")} className="fi"/></Fld>
            <Fld label={tr("Email")}><input value={doc.email||''} onChange={e=>set('email',e.target.value)} placeholder="email@supplier.com" className="fi"/></Fld>
          </div>):(<div className="fg g2">
            <Fld label={tr("Customer Name")}><input value={(doc.client&&doc.client.name)||''} onChange={e=>set('client.name',e.target.value)} placeholder={tr("Customer")} className="fi"/></Fld>
            <Fld label={tr("Email")}><input value={(doc.client&&doc.client.email)||''} onChange={e=>set('client.email',e.target.value)} placeholder="email@customer.com" className="fi"/></Fld>
          </div>)}
          <div className="fg g2" style={{marginTop:12}}>
            <Fld label={tr("Address")}><textarea value={(isRec||isPO)?doc.supplierAddress||'':(doc.client&&doc.client.address)||''} onChange={e=>(isRec||isPO)?set('supplierAddress',e.target.value):set('client.address',e.target.value)} rows={2} className="fi" placeholder={tr("Address...")}/></Fld>
            <Fld label={tr("Reference")}><input value={(isRec||isPO)?doc.ref||'':(doc.client&&doc.client.ref)||''} onChange={e=>(isRec||isPO)?set('ref',e.target.value):set('client.ref',e.target.value)} placeholder={tr("Ref/PO No")} className="fi"/></Fld>
          </div>
        </div>
        <div className="fc"><div className="fct">{tr("Line Items")}</div>
          <ItemsEditor items={items} setItems={setItems} currency={doc.currency||'GBP'}/>
        </div>
        <div className="fc"><div className="fct">{tr("Notes")}</div>
          <Fld label={tr("Notes")}><textarea value={doc.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi" placeholder={tr("Notes...")}/></Fld>
        </div>
        <div className="fact"><Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>{tr("Save {0}", typeLabel)}</Btn></div>
      </div></div>
    );
  }

  function OffListView({type,items}){
    const[fs,setFs]=useState({s:'',q:'',dateFrom:'',dateTo:''});
    const[quickView,setQuickView]=useState(null);
    const{sort,onSort}=useSort();
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs)+JSON.stringify(sort));
    const isRec=type==='received';
    const lbl=type==='invoice'?tr('Invoice'):type==='po'?tr('Purchase Order'):isRec?tr('Received Invoice'):tr('Quotation');
    const sts=type==='invoice'?['draft','sent','partial','paid','overdue','cancelled']:type==='po'?['draft','sent','approved','received','cancelled']:isRec?['pending','partial','paid','overdue','cancelled']:['draft','sent','accepted','declined','cancelled'];
    const filtered=items.filter(d=>{
      const name=(isRec?d.supplier:(d&&d.client&&d.client.name))||'';
      if(fs.q&&![name,d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    const partyName=d=>(isRec?d.supplier:(d&&d.client&&d.client.name))||'';
    const sorted=sortRows([...filtered].reverse(),sort,{date:d=>d.date,no:d=>d.number,party:partyName,project:d=>d.project,amount:d=>dt(d.items||[]),status:d=>d.status});
    return(
      <div className="content">
        <div className="fbar">
          <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder={tr("Search {0} or ref...", isRec?tr('supplier'):tr('customer'))}/></div>
          <select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
            <option value="">{tr("All Statuses")}</option>{sts.map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}
          </select>
          <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder={tr("From")} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
          <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder={tr("To")} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
          <div style={{flex:1}}/>
          <Btn v="bex bsm" onClick={()=>exportExcel([['Date','Number',isRec?'Supplier':'Customer','Amount','Status'],...sorted.map(d=>[d.date,d.number,partyName(d),fmt(dt(d.items||[])),d.status])],type)}><Ico n="export"/>{tr("Export")}</Btn>
        </div>
        {filtered.length===0?(
          <div className="tcard"><div className="empty"><Ico n={type==='invoice'?'invoice':isRec?'received':type==='po'?'po':'quote'} size={40}/><div className="empty-t">{tr("No {0}s yet", lbl.toLowerCase())}</div><div className="empty-s">{tr("Get started by creating one")}</div><Btn v="bp bsm" onClick={()=>{setCur(isRec?mkRec():mkDoc(type));go('off_form');}}><Ico n="plus"/>{tr("New {0}", lbl)}</Btn></div></div>
        ):(
          <div className="tcard">
            <table className="dt">
              <Cg w={type==='po'?[0.8,1,2,1,0.9,0.9]:[0.8,1,2,0.9,0.9]}/>
              <thead><tr>
                <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
                <SortTh k="no" sort={sort} onSort={onSort}>{tr("No")}</SortTh>
                <SortTh k="party" sort={sort} onSort={onSort}>{isRec?tr('Supplier'):tr('Customer')}</SortTh>
                {type==='po'&&<SortTh k="project" sort={sort} onSort={onSort}>{tr("Project")}</SortTh>}
                <SortTh k="amount" sort={sort} onSort={onSort} className="tar">{tr("Amount")}</SortTh>
                <SortTh k="status" sort={sort} onSort={onSort} className="tac">{tr("Status")}</SortTh>
              </tr></thead>
              <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(d=>(
                <tr key={d.id} style={{cursor:'pointer'}} onClick={()=>setQuickView(d)}>
                  <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
                  <td><span style={{fontFamily:'Inter',fontSize:11}}>{d.number||'—'}</span></td>
                  <td>{isRec?d.supplier:(d&&d.client&&d.client.name)||'—'}</td>
                  {type==='po'&&<td style={{color:'var(--g500)',fontSize:11}}>{d.project||'—'}{d.sourceRef&&<div style={{fontSize:10,color:'var(--g400)',marginTop:1}}>{tr("from {0}", d.sourceRef)}</div>}</td>}
                  <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items||[]))}</td>
                  <td className="tac"><Badge s={d.status}/></td>
                </tr>
              ))}</tbody>
            </table>
            <Pagination total={filtered.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/>
          </div>
        )}
        {quickView&&<DocQuickModal doc={quickView} co={co} docType={type} onClose={()=>setQuickView(null)} onEdit={()=>{setQuickView(null);setCur(quickView);go('off_form');}} onDelete={()=>{if(handleDel(quickView))setQuickView(null);}}/>}
      </div>
    );
  }

  const SB=[
    {sec:tr('Documents')},
    {k:'off_invoices',ico:'invoice',lbl:tr('Invoices'),cnt:inv.length,col:'off_i'},
    {k:'off_quotes',ico:'quote',lbl:tr('Quotations'),cnt:quo.length,col:'off_q'},
    {k:'off_pos',ico:'po',lbl:tr('Purchase Orders'),cnt:pos.length,col:'off_p'},
    {k:'off_received',ico:'received',lbl:tr('Received Invoices'),cnt:rec.length,col:'off_r'},
    {div:true},
    {sec:tr('Management')},
    {k:'off_customers',ico:'customers',lbl:tr('Contacts'),cnt:customers.length,col:'off_cust'},
    {k:'off_projects',ico:'project',lbl:tr('Projects'),cnt:projects.length,col:'off_pr'},
    {k:'off_expenses',ico:'expense',lbl:tr('Expenses'),cnt:expCats.length},
    {k:'off_incomes',ico:'income',lbl:tr('Incomes'),cnt:incomeCats.length},
    {k:'off_bank',ico:'bank',lbl:tr('Bank'),cnt:(co.banks||[]).length,col:'off_banktx'},
    {k:'settings',ico:'settings',lbl:tr('Settings')},
  ];

  // Sidebar + page header menu: Dashboard first, then the sections above
  const NAV=[{k:'home',ico:'home',lbl:tr('Dashboard')},...SB];
  const isNav=k=>view===k;

  const selectedBank=(co.banks||[]).find(b=>b.id===selectedBankId)||null;
  const bankTxForAccount=selectedBank?bankTx.filter(t=>t.accountId===selectedBank.id):[];

  const titles={off_invoices:tr('Invoices'),off_quotes:tr('Quotations'),off_pos:tr('Purchase Orders'),off_received:tr('Received Invoices'),off_customers:tr('Contacts'),off_projects:tr('Projects'),off_expenses:tr('Expenses'),off_incomes:tr('Incomes'),off_bank:tr('Bank Accounts'),settings:tr('Settings'),home:tr('Dashboard')};

  dirtyCheckRef.current=null;
  return(
    <div style={{display:'flex',minHeight:'100vh',width:'100%'}}>
      <PortalSidebar sb={NAV} isActive={isNav} onGo={goGuarded} session={session} onPortalSwitch={guardedPortalSwitch} onOpenProfile={onOpenProfile} onLogout={guardedLogout} onLang={guardedLang}/>
      <div className="main">
        {!['off_preview','off_form','off_custform','off_projform','off_bank_detail','off_banktx_form','off_fx_form','off_cat_detail','off_contact'].includes(view)&&(()=>{
          const offTitles={home:tr('Dashboard'),off_invoices:tr('Invoices'),off_quotes:tr('Quotations'),off_pos:tr('Purchase Orders'),off_received:tr('Received Invoices'),off_customers:tr('Contacts'),off_projects:tr('Projects'),off_expenses:tr('Expenses'),off_incomes:tr('Incomes'),off_bank:tr('Bank Accounts'),settings:tr('Settings')};
          return(<PageHeader sb={NAV} isActive={isNav} onGo={goGuarded} session={session} title={offTitles[view]||''}>
            {view==='off_invoices'&&<Btn v="bp bsm" onClick={()=>{setCur(mkDoc('invoice'));go('off_form');}}><Ico n="plus"/>{tr("New Invoice")}</Btn>}
            {view==='off_quotes'&&<Btn v="bp bsm" onClick={()=>{setCur(mkDoc('quote'));go('off_form');}}><Ico n="plus"/>{tr("New Quotation")}</Btn>}
            {view==='off_pos'&&<Btn v="bp bsm" onClick={()=>{setCur(mkDoc('po'));go('off_form');}}><Ico n="plus"/>{tr("New Purchase Order")}</Btn>}
            {view==='off_received'&&<Btn v="bp bsm" onClick={()=>{setCur(mkRec());go('off_form');}}><Ico n="plus"/>{tr("New Received Invoice")}</Btn>}
            {view==='off_customers'&&<Btn v="bp bsm" onClick={()=>{setCur({id:null,contact:'',email:'',phone:'',address:'',company:'',notes:'',type:'customer'});go('off_custform');}}><Ico n="plus"/>{tr("New Contact")}</Btn>}
            {view==='off_projects'&&<Btn v="bp bsm" onClick={()=>{setCur({id:null,name:'',client:'',startDate:td(),status:'active',desc:''});go('off_projform');}}><Ico n="plus"/>{tr("New Project")}</Btn>}
            {view==='off_expenses'&&<Btn v="bp bsm" onClick={()=>setEditingCategory({id:null,name:'',parentId:null,direction:'out'})}><Ico n="plus"/>{tr("New Expense")}</Btn>}
            {view==='off_incomes'&&<Btn v="bp bsm" onClick={()=>setEditingCategory({id:null,name:'',parentId:null,direction:'in'})}><Ico n="plus"/>{tr("New Income")}</Btn>}
            {view==='off_bank'&&<Btn v="bp bsm" onClick={()=>setEditingBank({id:null,accountName:'',accountNumber:'',iban:'',bic:'',currency:'GBP',openingBalance:'',isDefault:false})}><Ico n="plus"/>{tr("New Account")}</Btn>}
          </PageHeader>);
        })()}
        {view==='home'&&<div className="content">
          <div className="nav-cards">
            {[{k:'off_invoices',ico:'invoice',lbl:tr('Invoices'),val:inv.length},{k:'off_quotes',ico:'quote',lbl:tr('Quotations'),val:quo.length},{k:'off_pos',ico:'po',lbl:tr('POs'),val:pos.length},{k:'off_received',ico:'received',lbl:tr('Received'),val:rec.length},{k:'off_customers',ico:'customers',lbl:tr('Customers'),val:customers.length},{k:'off_projects',ico:'project',lbl:tr('Projects'),val:projects.length},{k:'off_expenses',ico:'expense',lbl:tr('Expenses'),val:expCats.length},{k:'off_incomes',ico:'income',lbl:tr('Incomes'),val:incomeCats.length},{k:'off_bank',ico:'bank',lbl:tr('Bank'),val:(co.banks||[]).length}].map(c=><div key={c.k} className="nav-card" onClick={()=>go(c.k)}><div className="nc-ico"><Ico n={c.ico} size={16}/></div><div className="nc-val">{c.val}</div><div className="nc-lbl">{c.lbl}</div></div>)}
          </div>
        </div>}
        {view==='off_invoices'&&<OffListView type="invoice" items={inv}/>}
        {view==='off_quotes'&&<OffListView type="quote" items={quo}/>}
        {view==='off_pos'&&<OffListView type="po" items={pos}/>}
        {view==='off_received'&&<OffListView type="received" items={rec}/>}
        {view==='off_contact'&&customers.find(c=>c.id===selectedContactId)&&<OffContactStatement contact={customers.find(c=>c.id===selectedContactId)} inv={inv} rec={rec} bankTx={bankTx} banks={co.banks||[]} onBack={()=>go('off_customers')} onEdit={c=>{setCur(c);go('off_custform');}}/>}
        {view==='off_customers'&&<OffCustomers customers={customers} inv={inv} rec={rec} bankTx={bankTx} banks={co.banks||[]} onOpen={c=>{setSelectedContactId(c.id);go('off_contact');}} onEdit={c=>{setCur(c);go('off_custform');}} onDelete={c=>{if(!confirm(tr("Delete \"{0}\"?", c.company||c.contact)))return;sCust(customers.filter(x=>x.id!==c.id));showToast(tr('Deleted'));}}/>}
        {view==='off_projects'&&<OffProjects projects={projects} onNew={()=>{setCur({id:null,name:'',client:'',startDate:td(),status:'active',desc:''});go('off_projform');}} onEdit={p=>{setCur(p);go('off_projform');}} onDelete={p=>{if(!confirm(tr("Delete \"{0}\"?", p.name)))return;spr(projects.filter(d=>d.id!==p.id));showToast(tr('Deleted'));}}/>}
        {view==='off_expenses'&&<CategoryList cats={expCats} direction="out" bankTx={bankTx} banks={co.banks||[]} onOpen={item=>{const children=item.parentId?[]:expCats.filter(c=>c.parentId===item.id);setCategoryBrowse({direction:'out',mainName:item.name,names:[item.name,...children.map(c=>c.name)]});go('off_cat_detail');}} onEdit={item=>setEditingCategory({...item,direction:'out'})} onDelete={(id,hasChildren)=>deleteCategory('out',id,hasChildren)}/>}
        {view==='off_incomes'&&<CategoryList cats={incomeCats} direction="in" bankTx={bankTx} banks={co.banks||[]} onOpen={item=>{const children=item.parentId?[]:incomeCats.filter(c=>c.parentId===item.id);setCategoryBrowse({direction:'in',mainName:item.name,names:[item.name,...children.map(c=>c.name)]});go('off_cat_detail');}} onEdit={item=>setEditingCategory({...item,direction:'in'})} onDelete={(id,hasChildren)=>deleteCategory('in',id,hasChildren)}/>}
        {view==='off_cat_detail'&&categoryBrowse&&<CategoryTransactions categoryBrowse={categoryBrowse} bankTx={bankTx} banks={co.banks||[]} onBack={()=>go(categoryBrowse.direction==='out'?'off_expenses':'off_incomes')} onEdit={t=>{const{account,...raw}=t;editTx(raw);}} onDelete={handleDeleteBankTx}/>}
        {view==='off_form'&&cur&&<SimpleDocForm doc={cur} onSave={d=>{handleSave({...d,type:cur.type});}} onCancel={()=>go(prev)} onPreview={d=>{setCur(d);go('off_preview','off_form');}}/>}
        {view==='off_preview'&&cur&&<Preview doc={cur} co={co} docType={cur.type} onBack={()=>go(prev)} onEdit={()=>go('off_form','off_preview')}/>}
        {view==='off_custform'&&cur&&<OffCustForm cust={cur} customers={customers} onSave={handleSaveCust} onCancel={()=>go('off_customers')} dirtyRef={dirtyCheckRef}/>}
        {view==='off_projform'&&cur&&<OffProjForm proj={cur} projects={projects} onSave={handleSavePrj} onCancel={()=>go('off_projects')} dirtyRef={dirtyCheckRef}/>}
        {view==='off_bank'&&<OffBankAccounts banks={co.banks||[]} accountBalance={accountBalance} onOpen={b=>{setSelectedBankId(b.id);go('off_bank_detail');}} onEdit={b=>setEditingBank(b)} onDelete={deleteBank} onSetDefault={setDefaultBank}/>}
        {view==='off_bank_detail'&&selectedBank&&<OffBankLedger account={selectedBank} banks={co.banks||[]} transactions={bankTxForAccount} onBack={()=>go('off_bank')} onNew={()=>{setCur({id:null,accountId:selectedBank.id,date:td(),type:'in',amount:'',category:'',description:'',reference:'',linkedDoc:null});go('off_banktx_form');}}
          onExchange={()=>{setCur({id:null,date:td(),fromAccountId:selectedBank.id,toAccountId:((co.banks||[]).find(b=>b.id!==selectedBank.id)||{}).id||'',sold:'',rate:'',fee:'',feeCategory:'',received:'',reference:'',description:''});go('off_fx_form');}}
          onEdit={editTx} onDelete={handleDeleteBankTx}/>}
        {view==='off_fx_form'&&cur&&<OffFxForm fx={cur} banks={co.banks||[]} cats={expCats} accountBalance={accountBalance} onSave={handleSaveFx} onCancel={()=>go(prev)} dirtyRef={dirtyCheckRef}/>}
        {view==='off_banktx_form'&&cur&&<OffBankTxForm tx={cur} account={(co.banks||[]).find(b=>b.id===cur.accountId)} cats={expCats} incomeCats={incomeCats} contacts={customers} bankTx={bankTx} invoices={inv} receivedInvoices={rec} onSave={handleSaveBankTx} onCancel={()=>go(prev)} dirtyRef={dirtyCheckRef}/>}
        {view==='settings'&&<OffSettings ns={ns} co={co} go={go} onAutoNumberChange={v=>{const newCo={...co,autoNumber:v};setCo(newCo);LS.set(ns+'co',newCo);showToast(v?tr('Automatic numbering on'):tr('Automatic numbering off — type numbers by hand'));}} setCur={setCur} cur={cur} showToast={showToast} banks={co.banks||[]} onAddBank={()=>setEditingBank({id:null,accountName:'',accountNumber:'',iban:'',bic:'',currency:'GBP',openingBalance:'',isDefault:false})} onEditBank={b=>setEditingBank(b)} onDeleteBank={deleteBank} onSetDefaultBank={setDefaultBank} onSave={d=>{const{logo,signature,...coWithoutLogoAndSig}=d;setLogo(logo||'');setSignature(signature||'');const merged={...d,banks:co.banks};setCo(merged);LS.set(ns+'co',{...coWithoutLogoAndSig,banks:co.banks});showToast(tr('Saved ✓'));go('home');}} onClose={()=>go('home')}/>}
      </div>
      {toast&&<div className="toast">{toast}</div>}
      {editingBank&&<BankAccountModal bank={editingBank} onSave={b=>{saveBank(b);setEditingBank(null);}} onCancel={()=>setEditingBank(null)}/>}
      {editingCategory&&<CategoryModal cat={editingCategory} cats={editingCategory.direction==='in'?incomeCats:expCats} onSave={c=>{saveCategory(c);setEditingCategory(null);}} onCancel={()=>setEditingCategory(null)}/>}
    </div>
  );
}

// Simple Official sub-components
// Contact relationships (stored in contact.type; "both" = customer and supplier)
const CONTACT_TYPES=[['customer','Customer'],['supplier','Supplier'],['both','Customer & Supplier'],['employee','Employee'],['owner','Owner'],['expense','Expense']];
const contactTypeLabel=(t,en)=>{const l=(CONTACT_TYPES.find(([k])=>k===(t||'customer'))||[])[1]||'Customer';return en?l:tr(l);}; // en: for Excel exports
const contactName=c=>c.company||c.contact||'';

// ── Payment allocation ──
// A bank transaction can settle several documents, fully or partly:
//   tx.allocations=[{type:'invoice'|'received',id,number,amount}]  (amount in the account's currency = the document's)
// Older transactions linked one document (tx.linkedDoc) for the whole amount; txAllocs reads both.
const r2=n=>Math.round(n*100)/100;
const docTotal=d=>dt(d.items||[]);
const docKey=(type,id)=>type+':'+id;
const txAllocs=t=>t.allocations||(t.linkedDoc&&t.linkedDoc.id?[{type:t.linkedDoc.type,id:t.linkedDoc.id,number:t.linkedDoc.number,amount:+t.amount}]:[]);
// Amount already allocated to each document, keyed by docKey (optionally ignoring one transaction)
const allocatedByDoc=(txs,excludeTxId)=>{
  const m={};
  txs.forEach(t=>{if(t.id===excludeTxId)return;txAllocs(t).forEach(a=>{const k=docKey(a.type,a.id);m[k]=(m[k]||0)+(+a.amount||0);});});
  return m;
};
const curFmt=(cur,n)=>`${n<0?'-':''}${CURR[cur]||''}${fmt(Math.abs(n))}`;

// Everything that moved between us and a contact, per currency.
// Signed amounts: positive = the contact owes us more, negative = we owe them more.
// Sales invoices (not draft/cancelled) +, received invoices (not cancelled) −, money in −, money out +.
const contactLedger=(c,{inv,rec,bankTx,banks})=>{
  const name=contactName(c);
  const accCur=id=>((banks.find(b=>b.id===id)||{}).currency)||'GBP';
  const sales=inv.filter(d=>(d.client&&d.client.name)===name);
  const bills=rec.filter(d=>d.supplier===name);
  const own=new Set([...sales.map(d=>docKey('invoice',d.id)),...bills.map(d=>docKey('received',d.id))]);
  const paidTo=allocatedByDoc(bankTx);
  const entries=[];
  sales.filter(d=>d.status!=='draft'&&d.status!=='cancelled').forEach(d=>entries.push({id:'d'+d.id,date:d.date||'',kind:'invoice',ref:d.number,desc:'Sales invoice',cur:d.currency||'GBP',amount:docTotal(d),doc:d}));
  bills.filter(d=>d.status!=='cancelled').forEach(d=>entries.push({id:'d'+d.id,date:d.date||'',kind:'bill',ref:d.number,desc:'Received invoice',cur:d.currency||'GBP',amount:-docTotal(d),doc:d}));
  bankTx.forEach(t=>{
    if(t.fx||t.xpayLeg==='fee')return;
    let amt;
    if(t.contactId===c.id)amt=t.xpay?+t.xpay.amount:+t.amount;
    // older payments without a contact still count for the documents they settle
    else if(!t.contactId)amt=txAllocs(t).filter(a=>own.has(docKey(a.type,a.id))).reduce((s,a)=>s+(+a.amount||0),0);
    if(!amt)return;
    const al=txAllocs(t);
    entries.push({id:'t'+t.id,date:t.date||'',kind:t.type==='in'?'in':'out',ref:al.map(a=>a.number).filter(Boolean).join(', ')||t.reference||'',
      desc:(t.description||(t.type==='in'?'Payment received':'Payment made'))+(t.xpay?` · ${curFmt(accCur(t.accountId),t.xpay.total)} via ${accCur(t.accountId)} account`:''),
      cur:t.xpay?t.xpay.currency:accCur(t.accountId),amount:t.type==='in'?-amt:amt,tx:t});
  });
  // Chronological, then by document number, so the running balance matches the table read bottom-up
  entries.sort((a,b)=>natCmp(a.date,b.date)||natCmp(a.ref,b.ref));
  const byCur={};
  entries.forEach(e=>{
    const s=byCur[e.cur]||(byCur[e.cur]={invoiced:0,billed:0,received:0,paid:0,balance:0});
    if(e.kind==='invoice')s.invoiced+=e.amount;else if(e.kind==='bill')s.billed-=e.amount;
    else if(e.kind==='in')s.received-=e.amount;else s.paid+=e.amount;
    s.balance+=e.amount;
  });
  Object.values(byCur).forEach(s=>Object.keys(s).forEach(k=>{s[k]=r2(s[k]);}));
  // Open documents with what is still outstanding on each
  const today=td();
  const open=[...sales.filter(d=>d.status!=='draft'&&d.status!=='cancelled').map(d=>({type:'invoice',d})),...bills.filter(d=>d.status!=='cancelled').map(d=>({type:'received',d}))]
    .map(({type,d})=>{const total=docTotal(d),paid=r2(paidTo[docKey(type,d.id)]||0);return{type,d,total,paid,outstanding:r2(total-paid),overdue:!!d.dueDate&&d.dueDate<today}})
    .filter(x=>x.outstanding>0.005).sort((a,b)=>(a.d.dueDate||a.d.date||'')<(b.d.dueDate||b.d.date||'')?-1:1);
  return{entries,byCur,open};
};
// Trading contacts carry a balance; employees, owners and expense payees just show what was paid / received
const isTrading=c=>['customer','supplier','both'].includes(c.type||'customer');
// What the contact owes us (receivable) and what we owe them (payable), per currency
const contactPositions=(c,byCur)=>{
  const t=c.type||'customer';const R={},P={};
  Object.entries(byCur).forEach(([cur,s])=>{
    if(t==='customer')R[cur]=s.balance;
    else if(t==='supplier')P[cur]=-s.balance;
    else{R[cur]=r2(s.invoiced-s.received);P[cur]=r2(s.billed-s.paid);}
  });
  return{R,P};
};
const curList=m=>Object.entries(m).filter(([,v])=>Math.abs(v)>0.005);

function OffContactStatement({contact:c,inv,rec,bankTx,banks,onBack,onEdit}){
  const{entries,byCur,open}=contactLedger(c,{inv,rec,bankTx,banks});
  const curs=Object.keys(byCur);
  const[cur,setCur]=useState(curs[0]||'GBP');
  const s=byCur[cur]||{invoiced:0,billed:0,received:0,paid:0,balance:0};
  const trading=isTrading(c);
  let running=0;
  const rows=entries.filter(e=>e.cur===cur).map(e=>{running=r2(running+e.amount);return{...e,balance:running};});
  const{sort:oSort,onSort:onOSort}=useSort();
  const{sort:stSort,onSort:onStSort}=useSort();
  const openRows=sortRows(open.filter(o=>(o.d.currency||'GBP')===cur),oSort,{date:o=>o.d.date,no:o=>o.d.number,type:o=>o.type,due:o=>o.d.dueDate,total:o=>o.total,paid:o=>o.paid,outstanding:o=>o.outstanding});
  // Fed newest-first so equal keys keep the reverse-chronological order the balances were built in
  const stRows=sortRows([...rows].reverse(),stSort,{date:e=>e.date,no:e=>e.ref,type:e=>e.kind,desc:e=>e.desc,debit:e=>e.amount>0?e.amount:0,credit:e=>e.amount<0?-e.amount:0,balance:e=>e.balance});
  const name=contactName(c);
  const kindLabel={invoice:'Invoice',bill:'Received Invoice',in:'Money In',out:'Money Out'};
  const balLabel=b=>Math.abs(b)<0.005?tr('Settled'):b>0?tr("{0} owes us", name):tr('We owe ')+name;
  const cards=[
    ...(s.invoiced?[['Invoiced',s.invoiced]]:[]),...(s.received?[['Received',s.received]]:[]),
    ...(s.billed?[['Billed to us',s.billed]]:[]),...(s.paid?[['Paid',s.paid]]:[]),
  ];
  const exportRows=()=>exportExcel([['Date','Reference','Type','Description','Debit','Credit','Balance'],...rows.map(e=>[e.date,e.ref,kindLabel[e.kind],e.desc,e.amount>0?e.amount:'',e.amount<0?-e.amount:'',e.balance])],`statement-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${cur.toLowerCase()}`);

  return(<div className="content">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>{tr("Back")}</button>
      <div style={{width:1,height:24,background:'var(--g200)'}}/>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{name}</h2>
      <span className="ct-type">{contactTypeLabel(c.type)}</span>
      <div style={{flex:1}}/>
      {rows.length>0&&<Btn v="bex bsm" onClick={exportRows}><Ico n="export"/>{tr("Export Statement")}</Btn>}
      <Btn v="bgh bsm" onClick={()=>onEdit(c)}><Ico n="edit"/>{tr("Edit Contact")}</Btn>
    </div>
    {curs.length>1&&<div className="st-tabs" style={{marginBottom:14}}>{curs.map(k=><button key={k} className={`st-tab${k===cur?' active':''}`} onClick={()=>setCur(k)}>{k}</button>)}</div>}
    {entries.length===0?<div className="tcard"><div className="empty"><Ico n="customers" size={36}/><div className="empty-t">{tr("No invoices or payments yet")}</div><div className="empty-s">{tr("Invoices in this name and bank transactions with this contact appear here")}</div></div></div>:(<>
      <div className="ct-cards">
        {cards.map(([l,v])=><div key={l} className="ct-card"><div className="ct-card-l">{l}</div><div className="ct-card-v">{curFmt(cur,v)}</div></div>)}
        {trading&&<div className={`ct-card ct-bal${s.balance>0.005?' pos':s.balance<-0.005?' neg':''}`}><div className="ct-card-l">{balLabel(s.balance)}</div><div className="ct-card-v">{curFmt(cur,Math.abs(s.balance))}</div></div>}
      </div>
      {openRows.length>0&&<div className="tcard" style={{marginBottom:16}}>
        <div className="tcard-hdr"><span className="tcard-hdr-t">{tr("Open Documents")}</span></div>
        <table className="dt"><Cg w={[0.9,1.2,1.3,0.9,1,1,1]}/>
          <thead><tr>
            <SortTh k="date" sort={oSort} onSort={onOSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={oSort} onSort={onOSort}>{tr("Number")}</SortTh>
            <SortTh k="type" sort={oSort} onSort={onOSort}>{tr("Type")}</SortTh>
            <SortTh k="due" sort={oSort} onSort={onOSort}>{tr("Due")}</SortTh>
            <SortTh k="total" sort={oSort} onSort={onOSort} className="tar">{tr("Total")}</SortTh>
            <SortTh k="paid" sort={oSort} onSort={onOSort} className="tar">{tr("Paid")}</SortTh>
            <SortTh k="outstanding" sort={oSort} onSort={onOSort} className="tar">{tr("Outstanding")}</SortTh>
          </tr></thead>
          <tbody>{openRows.map(o=><tr key={o.type+o.d.id}>
            <td style={{fontSize:12,color:'var(--g500)'}}>{o.d.date||'—'}</td>
            <td style={{fontWeight:600}}>{o.d.number||'—'}</td>
            <td style={{fontSize:12,color:'var(--g600)'}}>{o.type==='invoice'?tr('Sales Invoice'):tr('Received Invoice')}</td>
            <td style={{fontSize:12,color:o.overdue?'var(--red)':'var(--g500)',fontWeight:o.overdue?600:400}}>{o.d.dueDate||'—'}{o.overdue&&tr(' · overdue')}</td>
            <td className="tar">{curFmt(cur,o.total)}</td>
            <td className="tar" style={{color:'var(--g500)'}}>{o.paid?curFmt(cur,o.paid):'—'}</td>
            <td className="tar" style={{fontWeight:700}}>{curFmt(cur,o.outstanding)}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      <div className="tcard">
        <div className="tcard-hdr"><span className="tcard-hdr-t">{tr("Statement ({0})", cur)}</span><span style={{fontSize:11.5,color:'var(--g400)'}}>{tr("Debit = owed to us · Credit = owed by us or paid to us")}</span></div>
        <table className="dt"><Cg w={[0.8,1.3,1.1,1.8,0.9,0.9,1]}/>
          <thead><tr>
            <SortTh k="date" sort={stSort} onSort={onStSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={stSort} onSort={onStSort}>{tr("Reference")}</SortTh>
            <SortTh k="type" sort={stSort} onSort={onStSort}>{tr("Type")}</SortTh>
            <SortTh k="desc" sort={stSort} onSort={onStSort}>{tr("Description")}</SortTh>
            <SortTh k="debit" sort={stSort} onSort={onStSort} className="tar">{tr("Debit")}</SortTh>
            <SortTh k="credit" sort={stSort} onSort={onStSort} className="tar">{tr("Credit")}</SortTh>
            <SortTh k="balance" sort={stSort} onSort={onStSort} className="tar">{tr("Balance")}</SortTh>
          </tr></thead>
          <tbody>{stRows.map(e=><tr key={e.id}>
            <td style={{fontSize:12,color:'var(--g500)'}}>{e.date||'—'}</td>
            <td style={{fontWeight:500}}>{e.ref||'—'}</td>
            <td><span className={`ct-kind ct-k-${e.kind}`}>{tr(kindLabel[e.kind])}</span></td>
            <td style={{color:'var(--g600)'}}>{e.desc}</td>
            <td className="tar">{e.amount>0?curFmt(cur,e.amount):''}</td>
            <td className="tar">{e.amount<0?curFmt(cur,-e.amount):''}</td>
            <td className="tar" style={{fontWeight:600,color:e.balance<-0.005?'var(--red)':'var(--g900)'}}>{curFmt(cur,e.balance)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </>)}
  </div>);
}

function OffCustomers({customers,inv,rec,bankTx,banks,onOpen,onEdit,onDelete}){
  const[q,setQ]=useState('');
  const[typeF,setTypeF]=useState('');
  const{sort,onSort}=useSort('company','asc');
  const {pg,ps,setPg,setPs}=usePagination(q+'|'+typeF+JSON.stringify(sort));
  const f=sortRows(customers.filter(c=>(!typeF||(c.type||'customer')===typeF)&&[c.contact,c.company,c.email].some(x=>(x||'').toLowerCase().includes(q.toLowerCase()))),sort,
    {company:c=>c.company||c.contact,contact:c=>c.contact,email:c=>c.email,phone:c=>c.phone,type:c=>contactTypeLabel(c.type)});
  // Receivable / payable per currency for trading contacts; paid / received totals for the rest
  const pos=c=>{
    const{byCur}=contactLedger(c,{inv,rec,bankTx,banks});
    if(isTrading(c)){const{R,P}=contactPositions(c,byCur);return{a:curList(R),b:curList(P)};}
    return{a:curList(Object.fromEntries(Object.entries(byCur).map(([k,s])=>[k,s.received]))),b:curList(Object.fromEntries(Object.entries(byCur).map(([k,s])=>[k,s.paid]))),plain:true};
  };
  const cell=(list,cls,prefix)=>list.length?list.map(([cur,v])=><div key={cur} className={cls}>{prefix}{curFmt(cur,v)}</div>):<span style={{color:'var(--g300)'}}>—</span>;
  const exportList=()=>exportExcel([['Company','Contact','Relationship','Email','Phone','Receivable / Received','Payable / Paid'],...f.map(c=>{const p=pos(c);const txt=l=>l.map(([cur,v])=>curFmt(cur,v)).join(' · ');return[c.company||'',c.contact||'',contactTypeLabel(c.type,true),c.email||'',c.phone||'',txt(p.a),txt(p.b)];})],'contacts');
  return(<div className="content">
    <div className="fbar"><div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tr("Search...")}/></div>
      <select value={typeF} onChange={e=>setTypeF(e.target.value)}><option value="">{tr("All relationships")}</option>{CONTACT_TYPES.map(([k,l])=><option key={k} value={k}>{tr(l)}</option>)}</select>
      <div style={{flex:1}}/>
      <Btn v="bex bsm" onClick={exportList}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    {f.length===0?<div className="tcard"><div className="empty"><Ico n="customers" size={36}/><div className="empty-t">{customers.length?tr('No contacts match'):tr('No contacts yet')}</div></div></div>:(
    <div className="tcard"><table className="dt">
      <Cg w={[2,1.3,1.7,1,0.9,1.2,1.2,0.8]}/>
      <thead><tr>
        <SortTh k="company" sort={sort} onSort={onSort}>{tr("Company")}</SortTh>
        <SortTh k="contact" sort={sort} onSort={onSort}>{tr("Contact")}</SortTh>
        <SortTh k="email" sort={sort} onSort={onSort}>{tr("Email")}</SortTh>
        <SortTh k="phone" sort={sort} onSort={onSort}>{tr("Phone")}</SortTh>
        <SortTh k="type" sort={sort} onSort={onSort}>{tr("Type")}</SortTh>
        <th className="tar">{tr("Receivable")}</th><th className="tar">{tr("Payable")}</th><th>{tr("Actions")}</th>
      </tr></thead>
      <tbody>{f.slice((pg-1)*ps,pg*ps).map(c=>{const p=pos(c);return(<tr key={c.id} className="ct-row" onClick={()=>onOpen(c)}>
        <td style={{fontWeight:500}}>{c.company||'—'}</td>
        <td>{c.contact||'—'}</td>
        <td onClick={e=>e.stopPropagation()}>{c.email?<a href={`mailto:${c.email}`} style={{color:'var(--blue)',textDecoration:'none'}}>{c.email}</a>:'—'}</td>
        <td style={{color:'var(--g600)'}}>{c.phone||'—'}</td>
        <td style={{color:'var(--g600)',fontSize:12}}>{contactTypeLabel(c.type)}</td>
        <td className="tar">{p.plain?cell(p.a,'ct-plain','Received '):cell(p.a,'ct-recv','')}</td>
        <td className="tar">{p.plain?cell(p.b,'ct-plain','Paid '):cell(p.b,'ct-pay','')}</td>
        <td onClick={e=>e.stopPropagation()}><div className="aw"><button className="ab" onClick={()=>onOpen(c)} title={tr("Statement")} aria-label={tr("Statement")}><Ico n="eye"/></button><button className="ab" onClick={()=>onEdit(c)} title={tr("Edit")} aria-label={tr("Edit")}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(c)} title={tr("Delete")} aria-label={tr("Delete")}><Ico n="trash"/></button></div></td>
      </tr>);})}</tbody>
    </table><Pagination total={f.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
    )}
  </div>);
}
function OffCustForm({cust:init,customers,onSave,onCancel,dirtyRef}){
  const[c,setC]=useState(init);const s=(k,v)=>setC(d=>({...d,[k]:v}));
  const _initStr=useRef(JSON.stringify(init));
  const _isDirty=()=>JSON.stringify(c)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
  if(dirtyRef)dirtyRef.current=_isDirty;
  const handleSave=async()=>{
    const norm={...c,company:toTitleCase(c.company),contact:toTitleCase(c.contact),email:(c.email||'').trim().toLowerCase(),address:toSentenceCase(c.address),notes:toSentenceCase(c.notes)};
    const nameField=norm.company?'company':'contact';
    const nameVal=norm.company||norm.contact;
    const dup=findCaseInsensitiveDup(customers||[],nameField,nameVal,norm.id);
    if(dup&&!(await askDuplicateOk('contact',nameVal)))return;
    onSave(norm);
  };
  return(<div className="content"><div className="fw" style={{maxWidth:640}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{c.id?tr('Edit Contact'):tr('New Contact')}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
    <div className="fc"><div className="fct">{tr("Contact Info")}</div>
      <div className="fg g2"><Fld label={tr("Company / Name *")}><input value={c.company||''} onChange={e=>s('company',e.target.value)} className="fi" placeholder={tr("Acme Ltd")} required/></Fld><Fld label={tr("Contact Person")}><input value={c.contact||''} onChange={e=>s('contact',e.target.value)} className="fi" placeholder={tr("John Smith")}/></Fld></div>
      <div className="fg g2" style={{marginTop:12}}><Fld label={tr("Email")}><input type="email" value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi"/></Fld><Fld label={tr("Phone")}><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi"/></Fld></div>
      <div style={{marginTop:12}}><Fld label={tr("Relationship")}><select value={c.type||'customer'} onChange={e=>s('type',e.target.value)} className="fi">{CONTACT_TYPES.map(([k,l])=><option key={k} value={k}>{tr(l)}</option>)}</select></Fld></div>
      <div style={{marginTop:12}}><Fld label={tr("Address")}><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={3} className="fi"/></Fld></div>
      <div style={{marginTop:12}}><Fld label={tr("Notes")}><textarea value={c.notes||''} onChange={e=>s('notes',e.target.value)} rows={2} className="fi"/></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
  </div></div>);
}
function OffProjects({projects,onNew,onEdit,onDelete}){
  const{sort,onSort}=useSort();
  const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(sort));
  const rows=sortRows(projects,sort,{date:p=>p.startDate,name:p=>p.name,client:p=>p.client,status:p=>p.status||'active'});
  return(<div className="content">
    <div className="fbar"><div style={{flex:1}}/>
      <Btn v="bex bsm" onClick={()=>exportExcel([['Start Date','Name','Client','Status'],...rows.map(p=>[p.startDate||'',p.name||'',p.client||'',p.status||''])],'projects')}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    <div className="tcard"><table className="dt">
      <Cg w={[0.8,1.8,1.8,0.9,0.6]}/>
      <thead><tr>
        <SortTh k="date" sort={sort} onSort={onSort}>{tr("Start")}</SortTh>
        <SortTh k="name" sort={sort} onSort={onSort}>{tr("Name")}</SortTh>
        <SortTh k="client" sort={sort} onSort={onSort}>{tr("Client")}</SortTh>
        <SortTh k="status" sort={sort} onSort={onSort}>{tr("Status")}</SortTh>
        <th>{tr("Actions")}</th>
      </tr></thead>
      <tbody>{projects.length===0?<tr><td colSpan={5}><div className="empty"><div className="empty-t">{tr("No projects yet")}</div></div></td></tr>:rows.slice((pg-1)*ps,pg*ps).map(p=><tr key={p.id}><td style={{color:'var(--g500)',fontSize:12}}>{p.startDate||'—'}</td><td>{p.name}</td><td style={{color:'var(--g600)'}}>{p.client||'—'}</td><td><Badge s={p.status||'active'}/></td><td><div className="aw"><button className="ab" onClick={()=>onEdit(p)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(p)}><Ico n="trash"/></button></div></td></tr>)}
      </tbody>
    </table><Pagination total={projects.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
  </div>);
}
function OffProjForm({proj:init,projects,onSave,onCancel,dirtyRef}){
  const[p,setP]=useState(init);const s=(k,v)=>setP(d=>({...d,[k]:v}));
  const _initStr=useRef(JSON.stringify(init));
  const _isDirty=()=>JSON.stringify(p)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
  if(dirtyRef)dirtyRef.current=_isDirty;
  const handleSave=async()=>{
    const norm={...p,name:toTitleCase(p.name),client:toTitleCase(p.client),desc:toSentenceCase(p.desc)};
    const dup=findCaseInsensitiveDup(projects||[],'name',norm.name,norm.id);
    if(dup&&!(await askDuplicateOk('project',norm.name)))return;
    onSave(norm);
  };
  return(<div className="content"><div className="fw" style={{maxWidth:580}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{p.id?tr('Edit Project'):tr('New Project')}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
    <div className="fc"><div className="fct">{tr("Project Details")}</div>
      <div className="fg g2"><Fld label={tr("Name")}><input value={p.name||''} onChange={e=>s('name',e.target.value)} className="fi" placeholder={tr("Project name")}/></Fld><Fld label={tr("Client")}><input value={p.client||''} onChange={e=>s('client',e.target.value)} className="fi" placeholder={tr("Client")}/></Fld></div>
      <div className="fg g2" style={{marginTop:12}}><Fld label={tr("Start Date")}><input type="date" value={p.startDate||''} onChange={e=>s('startDate',e.target.value)} className="fi"/></Fld><Fld label={tr("Status")}><select value={p.status||'active'} onChange={e=>s('status',e.target.value)} className="fi"><option value="active">{tr("Active")}</option><option value="completed">{tr("Completed")}</option><option value="on-hold">{tr("On Hold")}</option><option value="cancelled">{tr("Cancelled")}</option></select></Fld></div>
      <div style={{marginTop:12}}><Fld label={tr("Description")}><textarea value={p.desc||''} onChange={e=>s('desc',e.target.value)} rows={2} className="fi"/></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
  </div></div>);
}
function CategoryList({cats,direction,bankTx,banks,onOpen,onEdit,onDelete}){
  const[q,setQ]=useState('');
  const matches=name=>!q||name.toLowerCase().includes(q.toLowerCase());
  const catTotal=(names)=>{
    const acc={};
    bankTx.filter(t=>t.type===direction&&names.includes(t.category)).forEach(t=>{
      const bank=banks.find(b=>b.id===t.accountId);
      const c=(bank&&bank.currency)||'GBP';
      acc[c]=(acc[c]||0)+(+t.amount||0);
    });
    return acc;
  };
  const fmtTotal=(acc)=>Object.keys(acc).length===0?'—':Object.entries(acc).map(([c,amt])=>`${CURR[c]||c}${fmt(amt)}`).join(' · ');
  const groups=groupCats(cats).map(({main,children})=>({main,children:children.filter(ch=>matches(main.name)||matches(ch.name))})).filter(({main,children})=>matches(main.name)||children.length>0);
  const label=direction==='out'?tr('Expense'):tr('Income');
  return(<div className="content">
    <div className="fbar"><div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tr("Search...")}/></div><div style={{flex:1}}/>
      <Btn v="bex bsm" onClick={()=>exportExcel([['Code','Name','Total'],...groups.flatMap(({main,children})=>[[main.code||'',main.name,fmtTotal(catTotal([main.name,...children.map(c=>c.name)]))],...children.map(ch=>[ch.code||'',ch.name,fmtTotal(catTotal([ch.name]))])])],direction==='out'?'expense-categories':'income-categories')}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    {groups.length===0?(
      <div className="tcard"><div className="empty"><Ico n={direction==='out'?'expense':'income'} size={36}/><div className="empty-t">{tr("No {0} categories yet", label.toLowerCase())}</div></div></div>
    ):(
    <div className="tcard"><table className="dt">
      <Cg w={[0.8,2.2,0.9,0.6]}/>
      <thead><tr><th>{tr("Code")}</th><th>{tr("Name")}</th><th className="tar">{tr("Total")}</th><th>{tr("Actions")}</th></tr></thead>
      <tbody>{groups.map(({main,children})=>(<React.Fragment key={main.id}>
        <tr>
          <td style={{fontWeight:700,color:'var(--g500)',fontFamily:'monospace',fontSize:12}}>{main.code||'—'}</td>
          <td style={{fontWeight:700,cursor:'pointer'}} onClick={()=>onOpen(main)}>{main.name}</td>
          <td className="tar" style={{fontWeight:700}}>{fmtTotal(catTotal([main.name,...children.map(c=>c.name)]))}</td>
          <td><div className="aw"><button className="ab" onClick={()=>onOpen(main)}><Ico n="eye"/></button><button className="ab" onClick={()=>onEdit(main)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(main.id,children.length>0)}><Ico n="trash"/></button></div></td>
        </tr>
        {children.map(ch=>(
          <tr key={ch.id}>
            <td style={{color:'var(--g500)',fontFamily:'monospace',fontSize:12,paddingLeft:32}}>{ch.code||'—'}</td>
            <td style={{color:'var(--g700)',cursor:'pointer'}} onClick={()=>onOpen(ch)}>{ch.name}</td>
            <td className="tar">{fmtTotal(catTotal([ch.name]))}</td>
            <td><div className="aw"><button className="ab" onClick={()=>onOpen(ch)}><Ico n="eye"/></button><button className="ab" onClick={()=>onEdit(ch)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(ch.id,false)}><Ico n="trash"/></button></div></td>
          </tr>
        ))}
      </React.Fragment>))}</tbody>
    </table></div>
    )}
  </div>);
}
function CategoryModal({cat,cats,onSave,onCancel}){
  const isNew=!cat.id;
  const isEditingMain=!isNew&&!cat.parentId;
  // For a new entry, mode starts empty until a Main Category choice is made; editing an existing
  // Main Category skips that choice entirely (a main can't be re-parented from this screen).
  const[mode,setMode]=useState(isEditingMain?'main':(cat.parentId?'sub':''));
  const[parentId,setParentId]=useState(cat.parentId||'');
  const[code,setCode]=useState(cat.code||'');
  const[name,setName]=useState(cat.name||'');
  const mains=cats.filter(x=>!x.parentId&&x.id!==cat.id);
  const label=cat.direction==='in'?tr('Income'):tr('Expense');
  const handleMainSelect=(v)=>{
    if(v==='__new__'){setMode('main');setParentId('');}
    else{setMode('sub');setParentId(v);}
  };
  const canSave=name.trim()&&(mode==='main'||(mode==='sub'&&parentId));
  useEscape(onCancel);
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onCancel}>
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:12,padding:24,width:440,maxWidth:'90vw'}}>
      <div style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{isNew?tr("New {0}", label):(isEditingMain?tr('Edit Main Category'):tr('Edit Sub-Category'))}</div>
      {!isEditingMain&&(
        <div style={{marginBottom:16}}><Fld label={tr("Main Category")}>
          <select value={mode==='main'?'__new__':parentId} onChange={e=>handleMainSelect(e.target.value)} className="fi">
            <option value="" disabled>{tr("— Choose a Main Category —")}</option>
            <option value="__new__">{tr("+ Add New Main Category")}</option>
            {mains.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Fld></div>
      )}
      {mode&&(<>
        {!isEditingMain&&<div style={{fontSize:11,fontWeight:700,color:'var(--g500)',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8}}>{mode==='main'?tr('New Main Category'):tr('Sub-Category')}</div>}
        <div className="fg g2" style={{marginBottom:16}}>
          <Fld label={tr("Code")}><input value={code} onChange={e=>setCode(e.target.value)} className="fi" placeholder={tr("e.g. AR.01")}/></Fld>
          <Fld label={tr("Name")}><input value={name} onChange={e=>setName(e.target.value)} className="fi" autoFocus/></Fld>
        </div>
      </>)}
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn>
        <Btn v="bp bsm" disabled={!canSave} onClick={async()=>{
          if(!canSave)return;
          const dup=findCaseInsensitiveDup(cats,'name',name,cat.id);
          if(dup&&!(await askDuplicateOk('category',name.trim())))return;
          onSave({id:cat.id,direction:cat.direction,name:toTitleCase(name),code:code.trim(),parentId:mode==='sub'?parentId:null});
        }}>{tr("Save")}</Btn>
      </div>
    </div>
  </div>);
}
function CategoryTransactions({categoryBrowse,bankTx,banks,onBack,onEdit,onDelete}){
  const[q,setQ]=useState('');
  const{direction,mainName,names}=categoryBrowse;
  const rows=bankTx.filter(t=>t.type===direction&&names.includes(t.category)).map(t=>({...t,account:banks.find(b=>b.id===t.accountId)}));
  const{sort,onSort}=useSort();
  const linkLabel=t=>{
    const al=txAllocs(t);
    return al.length?al.map(x=>x.number).filter(Boolean).join(', ')||null:null; // document numbers alone are enough
  };
  const filtered=sortRows(rows.filter(t=>{
    if(!q)return true;
    return[t.description,t.reference,(t.account&&t.account.accountName)].some(x=>(x||'').toLowerCase().includes(q.toLowerCase()));
  }),sort,{date:t=>t.date,no:t=>linkLabel(t)||t.reference,account:t=>t.account&&t.account.accountName,desc:t=>t.description,linked:linkLabel,amount:t=>+t.amount||0});
  const totalsByCurrency=filtered.reduce((acc,t)=>{const c=(t.account&&t.account.currency)||'GBP';acc[c]=(acc[c]||0)+(+t.amount||0);return acc;},{});
  return(<div className="content">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>{tr("Back")}</button>
      <div style={{width:1,height:24,background:'var(--g200)'}}/>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{mainName}</h2>
      {filtered.length>0&&<span style={{fontSize:13,fontWeight:700,color:'var(--g600)'}}>{Object.entries(totalsByCurrency).map(([c,amt])=>`${CURR[c]||c}${fmt(amt)}`).join(' · ')}</span>}
    </div>
    <div className="fbar"><div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tr("Search description, reference, account...")}/></div><div style={{flex:1}}/>
      <Btn v="bex bsm" onClick={()=>exportExcel([['Date','Account','Description','Linked','Amount'],...filtered.map(t=>[t.date||'',(t.account&&t.account.accountName)||'',t.description||'',linkLabel(t)||'',+t.amount])],`${mainName.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-transactions`)}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    <div className="tcard"><table className="dt">
      <Cg w={[0.8,1.6,2.2,1,0.9,0.6]}/>
      <thead><tr>
        <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
        <SortTh k="account" sort={sort} onSort={onSort}>{tr("Account")}</SortTh>
        <SortTh k="desc" sort={sort} onSort={onSort}>{tr("Description")}</SortTh>
        <SortTh k="linked" sort={sort} onSort={onSort}>{tr("Linked")}</SortTh>
        <SortTh k="amount" sort={sort} onSort={onSort} className="tar">{tr("Amount")}</SortTh>
        <th>{tr("Actions")}</th>
      </tr></thead>
      <tbody>{filtered.length===0?<tr><td colSpan={6}><div className="empty"><div className="empty-t">{tr("No transactions yet")}</div></div></td></tr>:filtered.map(t=>{
        const curSym=CURR[(t.account&&t.account.currency)]||'£';
        return(
        <tr key={t.id}>
          <td style={{color:'var(--g500)',fontSize:12}}>{t.date}</td>
          <td>{(t.account&&t.account.accountName)||'—'}</td>
          <td>{t.description||'—'}</td>
          <td>{linkLabel(t)?<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(59,109,17,.09)',color:'#3B6D11',border:'1px solid rgba(59,109,17,.18)'}}>{linkLabel(t)}</span>:<span style={{fontSize:11,color:'var(--g300)'}}>—</span>}</td>
          <td className="tar" style={{fontWeight:600}}>{curSym}{fmt(+t.amount)}</td>
          <td><div className="aw"><button className="ab" onClick={()=>{const{account,...raw}=t;onEdit(raw);}}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(t)}><Ico n="trash"/></button></div></td>
        </tr>
        );
      })}</tbody>
    </table></div>
  </div>);
}
function OffSettings({ns,co:init,go,setCur,cur,showToast,onSave,onClose,onAutoNumberChange,banks,onAddBank,onEditBank,onDeleteBank,onSetDefaultBank}){
  const[c,setC]=useState(()=>({...DEF_CO,...init}));
  const s=(k,v)=>setC(d=>({...d,[k]:v}));
  const[activeMenu,setActiveMenu]=useState(()=>LS.get(ns+'settingsMenu')||'company');
  const[numLocked,setNumLocked]=useState(true);
  const[uPg,setUPg]=useState(1);const[uPs,setUPs]=useState(25);
  const handleSave=()=>onSave({...c,name:toTitleCase(c.name),address:toSentenceCase(c.address),email:(c.email||'').trim().toLowerCase()});

  const handleLogoUpload=(e)=>{
    const f=e.target.files[0];
    if(!f)return;
    if(!f.type.startsWith('image/')){alert(tr('Please select an image file'));return;}
    const r=new FileReader();
    r.onload=()=>{
      const data=r.result;
      setLogo(data);          // write to localStorage immediately
      s('logo',data);         // write to state
    };
    r.readAsDataURL(f);
  };

  const menuItems=[
    {id:'company',icon:'settings',label:tr('Company Information')},
    {id:'pdf',icon:'dl',label:tr('PDF Templates')},
    {id:'numbering',icon:'hash',label:tr('Document Numbering')},
    {id:'bank',icon:'card',label:tr('Bank Details')}
  ];
  
  return(<div className="content" style={{padding:0,display:'flex',height:'calc(100vh - 54px)'}}>
    {/* Back Button & Title Bar */}
    <div style={{position:'fixed',top:54,left:'var(--sidebar)',right:0,background:'var(--g50)',borderBottom:'1px solid var(--g200)',padding:'12px 24px',display:'flex',alignItems:'center',gap:10,zIndex:50}}>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back" size={14}/>{tr("Back to Dashboard")}</button>
      <h2 style={{fontSize:15,fontWeight:700,color:'var(--g900)',marginLeft:10}}>{tr("Settings")}</h2>
      <div style={{flex:1}}/>
      <Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn>
    </div>

    {/* Left Menu */}
    <div style={{width:280,background:'var(--white)',borderRight:'1px solid var(--g200)',paddingTop:70,flexShrink:0}}>
      <div style={{padding:'8px 16px',fontSize:10,fontWeight:700,color:'var(--g400)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:4}}>{tr("Settings")}</div>
      {menuItems.map(m=>(
        <div key={m.id} onClick={()=>{setActiveMenu(m.id);LS.set(ns+'settingsMenu',m.id);}} style={{padding:'10px 16px',margin:'2px 8px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:activeMenu===m.id?'var(--g100)':'transparent',color:activeMenu===m.id?'var(--g900)':'var(--g600)',fontWeight:activeMenu===m.id?600:500,fontSize:13,transition:'background 0.15s,border-color 0.15s,box-shadow 0.15s,color 0.15s,transform 0.15s'}}>
          <Ico n={m.icon} size={16}/>
          <span>{m.label}</span>
        </div>
      ))}
    </div>
    
    {/* Right Content */}
    <div style={{flex:1,overflowY:'auto',paddingTop:70}}>
      <div style={{padding:32,maxWidth:700}}>
        
        {/* Company Information */}
        {activeMenu==='company'&&(<>
          <div style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:20}}>{tr("Company Information")}</div>
          <div className="fc">
            <div style={{marginBottom:12}}><Fld label={tr("Company Name")}><input value={c.name||''} onChange={e=>s('name',e.target.value)} className="fi"/></Fld></div>
            <div style={{marginBottom:12}}><Fld label={tr("Address")}><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={4} className="fi"/></Fld></div>
            <div className="fg g2"><Fld label={tr("Email")}><input value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi"/></Fld><Fld label={tr("Phone")}><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi"/></Fld></div>
            <div style={{marginTop:16}}>
              <Fld label={tr("Company Logo")}>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="fi" style={{padding:'8px'}}/>
                {c.logo&&<div style={{marginTop:8,padding:12,background:'var(--g50)',borderRadius:8,display:'flex',alignItems:'center',gap:12}}>
                  <img src={c.logo} alt="Logo" style={{maxWidth:120,maxHeight:60,objectFit:'contain'}}/>
                  <button onClick={()=>{setLogo('');s('logo','');}} style={{padding:'4px 10px',background:'var(--red)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>{tr("Remove")}</button>
                </div>}
              </Fld>
            </div>
            <div style={{marginTop:16}}>
              <Fld label={tr("Signature")}>
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e)=>{
                  const f=e.target.files[0];
                  if(!f)return;
                  if(!f.type.match(/^image\/(png|jpeg|jpg)$/)){alert(tr('Please select a PNG or JPG file'));return;}
                  const r=new FileReader();
                  r.onload=()=>{
                    const data=r.result;
                    setSignature(data);
                    s('signature',data);
                  };
                  r.readAsDataURL(f);
                }} className="fi" style={{padding:'8px'}}/>
                {c.signature&&<div style={{marginTop:8,padding:12,background:'var(--g50)',borderRadius:8,display:'flex',alignItems:'center',gap:12}}>
                  <img src={c.signature} alt="Signature" style={{maxWidth:120,maxHeight:60,objectFit:'contain'}}/>
                  <button onClick={()=>{setSignature('');s('signature','');}} style={{padding:'4px 10px',background:'var(--red)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>{tr("Remove")}</button>
                </div>}
              </Fld>
            </div>
          </div>
        </>)}
        
        {/* PDF Templates */}
        {activeMenu==='pdf'&&(<>
          <div style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:20}}>{tr("PDF Templates")}</div>
          <div style={{marginBottom:16,fontSize:13,color:'var(--g600)'}}>{tr("Select a template for your invoices and quotations")}</div>
          
          {Object.values(TEMPLATES).map(tpl=>(
            <div key={tpl.id} onClick={()=>s('selectedTemplate',tpl.id)} style={{background:'var(--white)',border:c.selectedTemplate===tpl.id?'2px solid var(--gm-400)':'1px solid var(--g200)',borderRadius:10,padding:20,marginBottom:12,cursor:'pointer',transition:'background 0.15s,border-color 0.15s,box-shadow 0.15s,color 0.15s,transform 0.15s',position:'relative'}}>
              {c.selectedTemplate===tpl.id&&<div style={{position:'absolute',top:12,right:12,background:'var(--gm-400)',color:'white',padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700}}>{tr("ACTIVE")}</div>}
              <div style={{fontSize:15,fontWeight:700,color:'var(--g900)',marginBottom:6}}>{tpl.name}</div>
              <div style={{fontSize:12,color:'var(--g600)'}}>{tpl.description}</div>
            </div>
          ))}
        </>)}
        
        {/* Document Numbering */}
        {activeMenu==='numbering'&&(<>
          <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--g900)'}}>{tr("Document Numbering")}</div>
            <div style={{flex:1}}/>
            {numLocked?
              <Btn v="bgh bsm" onClick={()=>setNumLocked(false)}><Ico n="edit" size={13}/>{tr("Edit")}</Btn>:
              <Btn v="bp bsm" onClick={()=>setNumLocked(true)}><Ico n="check" size={13}/>{tr("Done")}</Btn>
            }
          </div>
          <label className="num-switch">
            <input type="checkbox" checked={c.autoNumber!==false} onChange={e=>{s('autoNumber',e.target.checked);onAutoNumberChange(e.target.checked);}}/>
            <span className="num-switch-track" aria-hidden="true"/>
            <span className="num-switch-text">
              <span className="num-switch-t">{tr("Automatic numbering {0}", c.autoNumber!==false?tr('on'):tr('off'))}</span>
              <span className="num-switch-h">{c.autoNumber!==false
                ?tr('New quotations, invoices and purchase orders get the next number from the prefixes below.')
                :tr('Numbers are typed by hand on each quotation, invoice and purchase order — use this to enter old documents. The counters stay where they are; turn this back on to continue automatically.')}</span>
            </span>
          </label>
          <div style={{background:'var(--white)',border:'1px solid var(--g200)',borderRadius:10,overflow:'hidden',opacity:c.autoNumber!==false?1:.55}}>
            {/* Sales Quotation */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--g200)',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>1</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>{tr("Sales Quotation")}</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Prefix")}</div>
                    <input value={c.quoPfx||'QUO'} onChange={e=>s('quoPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Start Number")}</div>
                    <input type="number" value={c.quoStart||'1'} onChange={e=>s('quoStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Sales Invoice */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--g200)',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>2</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>{tr("Sales Invoice")}</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Prefix")}</div>
                    <input value={c.invPfx||'INV'} onChange={e=>s('invPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Start Number")}</div>
                    <input type="number" value={c.invStart||'1'} onChange={e=>s('invStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Purchase Order */}
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>3</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>{tr("Purchase Order")}</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Prefix")}</div>
                    <input value={c.poPfx||'PO'} onChange={e=>s('poPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>{tr("Start Number")}</div>
                    <input type="number" value={c.poStart||'1'} onChange={e=>s('poStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>)}
        
        {/* Bank Details */}
        {activeMenu==='bank'&&(<>
          <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--g900)'}}>{tr("Bank Details")}</div>
            <div style={{flex:1}}/>
            <Btn v="bp bsm" onClick={onAddBank}><Ico n="plus" size={13}/>{tr("Add Bank")}</Btn>
          </div>

          {/* Bank List */}
          {(!banks||banks.length===0)&&(
            <div style={{padding:40,background:'var(--g50)',borderRadius:12,textAlign:'center',color:'var(--g500)',fontSize:13}}>
              <div style={{fontSize:40,marginBottom:12}}>🏦</div>
              <div style={{fontWeight:600,marginBottom:6}}>{tr("No Bank Accounts")}</div>
              <div>{tr("Add your first bank account to start.")}</div>
            </div>
          )}

          {(banks||[]).map(bank=>(
            <div key={bank.id} style={{background:'var(--white)',border:'1px solid var(--g200)',borderRadius:10,padding:20,marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--g900)'}}>{ bank.accountName||tr('Unnamed Account')}</div>
                {bank.isDefault&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'var(--greenl)',color:'var(--green)'}}>{tr("DEFAULT")}</span>}
                <div style={{flex:1}}/>
                <div style={{display:'flex',gap:6}}>
                  {!bank.isDefault&&<button onClick={()=>onSetDefaultBank(bank.id)} style={{padding:'4px 10px',fontSize:11,fontWeight:600,background:'var(--g100)',border:'none',borderRadius:6,cursor:'pointer',color:'var(--g700)'}}>{tr("Set Default")}</button>}
                  <button onClick={()=>onEditBank(bank)} className="ab"><Ico n="edit"/></button>
                  <button onClick={()=>onDeleteBank(bank.id)} className="ab danger"><Ico n="trash"/></button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:12,color:'var(--g600)'}}>
                <div><span style={{fontWeight:600}}>{tr("Account Number:")}</span> {bank.accountNumber||'—'}</div>
                <div><span style={{fontWeight:600}}>{tr("IBAN:")}</span> {bank.iban||'—'}</div>
                <div><span style={{fontWeight:600}}>{tr("BIC:")}</span> {bank.bic||'—'}</div>
                <div><span style={{fontWeight:600}}>{tr("Currency:")}</span> {bank.currency||tr('GBP')}</div>
                <div><span style={{fontWeight:600}}>{tr("Opening Balance:")}</span> {CURR[bank.currency]||'£'}{fmt(+(bank.openingBalance||0))}</div>
              </div>
            </div>
          ))}
        </>)}

      </div>
    </div>
  </div>);
}

// ==========================
// BANK MODULE
// ==========================
function BankAccountModal({bank,onSave,onCancel}){
  const[b,setB]=useState(bank);
  useEscape(onCancel);
  const s=(k,v)=>setB(d=>({...d,[k]:v}));
  return(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={onCancel}>
    <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:12,padding:24,width:500,maxWidth:'90vw'}}>
      <div style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{b.id?tr('Edit Bank Account'):tr('New Bank Account')}</div>
      <div style={{marginBottom:12}}><Fld label={tr("Account Name")}><input value={b.accountName||''} onChange={e=>s('accountName',e.target.value)} className="fi"/></Fld></div>
      <div className="fg g2" style={{marginBottom:12}}>
        <Fld label={tr("Account Number")}><input value={b.accountNumber||''} onChange={e=>s('accountNumber',e.target.value)} className="fi"/></Fld>
        <Fld label={tr("BIC")}><input value={b.bic||''} onChange={e=>s('bic',e.target.value)} className="fi"/></Fld>
      </div>
      <div style={{marginBottom:12}}><Fld label={tr("IBAN")}><input value={b.iban||''} onChange={e=>s('iban',e.target.value)} className="fi"/></Fld></div>
      <div className="fg g2" style={{marginBottom:12}}>
        <Fld label={tr("Currency")}><select value={b.currency||'GBP'} onChange={e=>s('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld>
        <Fld label={tr("Opening Balance")}><input type="number" value={b.openingBalance||''} onChange={e=>s('openingBalance',e.target.value)} className="fi" placeholder="0.00" step=".01"/></Fld>
      </div>
      <div style={{marginBottom:16}}>
        <Fld label={tr("Opening Balance Date")}><input type="date" value={b.openingBalanceDate||''} onChange={e=>s('openingBalanceDate',e.target.value)} className="fi"/></Fld>
      </div>
      <div style={{marginBottom:16}}>
        <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
          <input type="checkbox" checked={b.isDefault||false} onChange={e=>s('isDefault',e.target.checked)}/>
          <span>{tr("Set as default bank account")}</span>
        </label>
      </div>
      <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
        <Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave({...b,id:b.id||uid(),accountName:toTitleCase(b.accountName),iban:(b.iban||'').trim().toUpperCase(),bic:(b.bic||'').trim().toUpperCase()})}>{tr("Save")}</Btn>
      </div>
    </div>
  </div>);
}

function OffBankAccounts({banks,accountBalance,onOpen,onEdit,onDelete,onSetDefault}){
  return(<div className="content">
    <div className="fbar"><div style={{flex:1}}/>
      <Btn v="bex bsm" onClick={()=>exportExcel([['Account Name','Account Number','IBAN','BIC','Currency','Balance','Default'],...banks.map(b=>[b.accountName||'',b.accountNumber||'',b.iban||'',b.bic||'',b.currency||'',accountBalance(b),b.isDefault?'Yes':'No'])],'bank-accounts')}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    {banks.length===0?(
      <div className="tcard"><div className="empty"><Ico n="bank" size={40}/><div className="empty-t">{tr("No bank accounts yet")}</div><div className="empty-s">{tr("Add a bank account to start tracking transactions")}</div></div></div>
    ):(
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:14}}>
        {banks.map(bank=>{
          const bal=accountBalance(bank);
          return(<div key={bank.id} style={{background:'var(--white)',border:'1px solid var(--g200)',borderRadius:10,padding:20,cursor:'pointer'}} onClick={()=>onOpen(bank)}>
            <div style={{display:'flex',alignItems:'center',marginBottom:10}}>
              <Ico n="bank" size={16} style={{color:'var(--gm-500)'}}/>
              <div style={{fontSize:14,fontWeight:700,color:'var(--g900)',marginLeft:8}}>{bank.accountName||tr('Unnamed Account')}</div>
              {bank.isDefault&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'var(--greenl)',color:'var(--green)'}}>{tr("DEFAULT")}</span>}
            </div>
            <div style={{fontSize:22,fontWeight:800,color:bal<0?'var(--red)':'var(--g900)',marginBottom:4}}>{CURR[bank.currency]||'£'}{fmt(bal)}</div>
            <div style={{fontSize:12,color:'var(--g500)',marginBottom:14}}>{bank.iban||bank.accountNumber||tr('No account number')}</div>
            <div style={{display:'flex',alignItems:'center',gap:6}} onClick={e=>e.stopPropagation()}>
              {!bank.isDefault&&<button onClick={()=>onSetDefault(bank.id)} style={{padding:'4px 10px',fontSize:11,fontWeight:600,background:'var(--g100)',border:'none',borderRadius:6,cursor:'pointer',color:'var(--g700)'}}>{tr("Set Default")}</button>}
              <div style={{flex:1}}/>
              <button onClick={()=>onEdit(bank)} className="ab"><Ico n="edit"/></button>
              <button onClick={()=>onDelete(bank.id)} className="ab danger"><Ico n="trash"/></button>
            </div>
          </div>);
        })}
      </div>
    )}
  </div>);
}

const fxRateStr=r=>(+r).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:6});
// Statement-style detail line for a currency exchange leg: "FX Rate EUR 1 = GBP 0.834676, Fee: £0.38"
const fxDetail=fx=>`FX Rate ${fx.fromCurrency} 1 = ${fx.toCurrency} ${fxRateStr(fx.rate)}${fx.fee?`, Fee: ${CURR[fx.toCurrency]||''}${fmt(+fx.fee)}`:''}`;

function OffBankLedger({account,banks,transactions,onBack,onNew,onExchange,onEdit,onDelete}){
  const[q,setQ]=useState('');
  const[dateFrom,setDateFrom]=useState('');
  const[dateTo,setDateTo]=useState('');
  const{sort,onSort}=useSort();
  const {pg,ps,setPg,setPs}=usePagination(JSON.stringify({q,dateFrom,dateTo,sort}));

  const openingEntry={id:'__opening__',date:account.openingBalanceDate||'',description:'Opening Balance',category:null,reference:'',linkedDoc:null,type:'in',amount:+(account.openingBalance||0),isOpening:true};
  // Same date + reference order as the default table view, so the running balance reads cleanly top to bottom
  const sorted=[openingEntry,...transactions].sort((a,b)=>{
    if(a.date!==b.date)return a.date<b.date?-1:1;
    if(a.isOpening)return -1;
    if(b.isOpening)return 1;
    return natCmp(a.reference,b.reference);
  });
  let running=0;
  const withBalance=sorted.map(t=>{
    running+=t.type==='in'?+t.amount:-t.amount;
    return{...t,balance:running};
  });

  // The exchange's own legs (out/in); its fee leg is shown as an ordinary expense row
  const isFx=t=>t.fx&&t.fxLeg!=='fee';
  const fxTitle=t=>isFx(t)?`${t.fx.fromCurrency} → ${t.fx.toCurrency}${t.description?' · '+t.description:''}`:t.description;
  // The other side of an exchange, shown under the amount like a bank statement does
  const fxCounter=t=>t.type==='out'?`${CURR[t.fx.toCurrency]||''}${fmt(+t.fx.received)}`:`${CURR[t.fx.fromCurrency]||''}${fmt(+t.fx.sold)}`;
  const fxOther=t=>(banks||[]).find(b=>b.id===(t.type==='out'?t.fx.toAccountId:t.fx.fromAccountId));
  // Cross-currency payment row: rate/fee line and the amount in the contact's currency, as on the statement
  const isXpay=t=>t.xpay&&t.xpayLeg==='pay';
  const xpayDetail=t=>`FX Rate ${account.currency||'GBP'} 1 = ${t.xpay.currency} ${fxRateStr(t.xpay.rate)}${t.xpay.fee?`, Fee: ${curSym}${fmt(t.xpay.fee)}`:''}`;
  const xpayAmt=t=>`${CURR[t.xpay.currency]||''}${fmt(t.xpay.amount)}`;

  const filtered=withBalance.filter(t=>{
    if(q&&![fxTitle(t),t.reference,t.category,t.contactName].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))return false;
    if(dateFrom&&t.date<dateFrom)return false;
    if(dateTo&&t.date>dateTo)return false;
    return true;
  });
  const totalIn=filtered.filter(t=>!t.isOpening).reduce((s,t)=>s+(t.type==='in'?+t.amount:0),0);
  const totalOut=filtered.filter(t=>!t.isOpening).reduce((s,t)=>s+(t.type==='out'?+t.amount:0),0);
  const curSym=CURR[account.currency]||'£';

  const linkLabel=t=>{
    if(t.fxLeg==='fee'||t.xpayLeg==='fee')return 'FX fee';
    if(t.fx){const o=fxOther(t);return `${t.type==='out'?'To':'From'} ${(o&&o.accountName)||t.fx[t.type==='out'?'toCurrency':'fromCurrency']}`;}
    const al=txAllocs(t);
    return al.length?al.map(x=>x.number).filter(Boolean).join(', ')||null:null; // document numbers alone are enough
  };
  // Fed newest-first so rows with equal keys keep the reverse-chronological order the balances were built in
  const shown=sortRows([...filtered].reverse(),sort,{date:t=>t.date,no:t=>t.reference,contact:t=>t.contactName,desc:fxTitle,
    category:t=>isFx(t)?'Currency Exchange':t.category,linked:linkLabel,in:t=>t.type==='in'?+t.amount:0,out:t=>t.type==='out'?+t.amount:0,balance:t=>t.balance});

  return(<div className="content">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
      <button onClick={onBack} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>{tr("Back")}</button>
      <div style={{width:1,height:24,background:'var(--g200)'}}/>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{account.accountName||tr('Bank Account')}</h2>
      <span style={{fontSize:13,fontWeight:700,color:'var(--g600)'}}>{tr("Current: {0}{1}", curSym, fmt(running))}</span>
      <div style={{flex:1}}/>
      {(banks||[]).length>1&&<Btn v="bgh bsm" onClick={onExchange}><Ico n="convert"/>{tr("Exchange")}</Btn>}
      <Btn v="bp bsm" onClick={onNew}><Ico n="plus"/>{tr("New Transaction")}</Btn>
    </div>
    <div className="fbar">
      <div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={tr("Search description, reference...")}/></div>
      <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
      <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
      <div style={{flex:1}}/>
      {filtered.length>0&&<span style={{fontSize:12,fontWeight:600,color:'var(--g600)'}}>{tr("In: {0}{1} · Out: {2}{3}", curSym, fmt(totalIn), curSym, fmt(totalOut))}</span>}
      <Btn v="bex bsm" onClick={()=>exportExcel([['Date','Contact','Description','Category','Linked','In','Out','Balance'],...filtered.map(t=>[t.date||'',t.contactName||'',isFx(t)?`${fxTitle(t)} (${fxDetail(t.fx)}; ${t.type==='out'?'received':'sold'} ${fxCounter(t)})`:isXpay(t)?`${t.description||''} (${xpayAmt(t)}; ${xpayDetail(t)})`:(t.description||''),isFx(t)?'Currency Exchange':(t.category||''),linkLabel(t)||'',t.type==='in'?+t.amount:'',t.type==='out'?+t.amount:'',t.balance])],`bank-${(account.accountName||'account').toLowerCase().replace(/[^a-z0-9]+/g,'-')}`)}><Ico n="export"/>{tr("Export")}</Btn>
    </div>
    <div className="tcard"><table className="dt">
      <Cg w={[0.8,1.2,2,1,1,0.9,0.9,0.9,0.6]}/>
      <thead><tr>
        <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
        <SortTh k="contact" sort={sort} onSort={onSort}>{tr("Contact")}</SortTh>
        <SortTh k="desc" sort={sort} onSort={onSort}>{tr("Description")}</SortTh>
        <SortTh k="category" sort={sort} onSort={onSort}>{tr("Category")}</SortTh>
        <SortTh k="linked" sort={sort} onSort={onSort}>{tr("Linked")}</SortTh>
        <SortTh k="in" sort={sort} onSort={onSort} className="tar">{tr("In")}</SortTh>
        <SortTh k="out" sort={sort} onSort={onSort} className="tar">{tr("Out")}</SortTh>
        <SortTh k="balance" sort={sort} onSort={onSort} className="tar">{tr("Balance")}</SortTh>
        <th>{tr("Actions")}</th>
      </tr></thead>
      <tbody>{filtered.length===0?<tr><td colSpan={9}><div className="empty"><div className="empty-t">{tr("No transactions yet")}</div></div></td></tr>:shown.slice((pg-1)*ps,pg*ps).map(t=>(
        <tr key={t.id}>
          <td style={{color:'var(--g500)',fontSize:12}}>{t.date||'—'}</td>
          <td style={{fontWeight:500,color:'var(--g800)'}}>{t.contactName||<span style={{color:'var(--g300)'}}>—</span>}</td>
          <td style={t.isOpening?{fontWeight:600,color:'var(--g700)'}:undefined}>{fxTitle(t)||'—'}{isFx(t)&&<div className="fx-sub">{fxDetail(t.fx)}</div>}{isXpay(t)&&<div className="fx-sub">{xpayDetail(t)}</div>}</td>
          <td>{isFx(t)?<span className="fx-badge">{tr("FX")}</span>:t.category?<span style={{background:'var(--purplel)',color:'var(--purple)',padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600}}>{t.category}</span>:'—'}</td>
          <td>{linkLabel(t)?<span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(59,109,17,.09)',color:'#3B6D11',border:'1px solid rgba(59,109,17,.18)'}}>{linkLabel(t)}</span>:<span style={{fontSize:11,color:'var(--g300)'}}>—</span>}</td>
          <td className="tar" style={{color:'var(--green)'}}>{t.type==='in'&&<>{curSym+fmt(+t.amount)}{isFx(t)&&<div className="fx-sub">{fxCounter(t)}</div>}{isXpay(t)&&<div className="fx-sub">{xpayAmt(t)}</div>}</>}</td>
          <td className="tar" style={{color:'var(--red)'}}>{t.type==='out'&&<>{curSym+fmt(+t.amount)}{isFx(t)&&<div className="fx-sub">{fxCounter(t)}</div>}{isXpay(t)&&<div className="fx-sub">{xpayAmt(t)}</div>}</>}</td>
          <td className="tar" style={{fontWeight:600}}>{curSym}{fmt(t.balance)}</td>
          <td>{!t.isOpening&&<div className="aw"><button className="ab" onClick={()=>{const{balance,...raw}=t;onEdit(raw);}}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(t)}><Ico n="trash"/></button></div>}</td>
        </tr>
      ))}</tbody>
    </table><Pagination total={filtered.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
  </div>);
}

// Transaction kinds: money in / money out are payments with a contact (optionally settling an invoice);
// expense is a categorised cost with an optional payee. kind drives the form; type (in/out) drives balances.
const txKindOf=t=>t.kind||(t.type==='out'&&t.category&&!t.linkedDoc&&!t.contactId?'expense':(t.type||'in'));
// Which contact relationships to list first for each kind
const TX_CONTACT_ORDER={in:['customer','both','owner','supplier','employee','expense'],out:['supplier','both','employee','owner','customer','expense'],expense:['expense']};

function OffBankTxForm({tx:init,account,cats,incomeCats,contacts,invoices,receivedInvoices,bankTx,onSave,onCancel,dirtyRef}){
  // Cross-currency payment (e.g. GBP account → supplier paid in USD) is entered as on the statement:
  // amount the contact paid/received in their currency, FX rate (1 account currency = ? payment currency)
  // and the bank fee in the account currency. Saved as tx.xpay (see handleSaveBankTx).
  const defaultFeeCat=((cats||[]).find(c=>/bank\s*(fee|charge)/i.test(c.name||''))||{}).name||'';
  const start=()=>{
    const x=init.xpay;
    return{...init,kind:txKindOf(init),allocations:txAllocs(init),linkedDoc:null,
      payCur:x?x.currency:(account.currency||'GBP'),payAmount:x?String(x.amount):'',rate:x?String(x.rate):'',fee:x&&x.fee?String(x.fee):'',
      feeCategory:(x&&x.feeCategory)||defaultFeeCat,amount:x?String(x.total):init.amount};
  };
  const[t,setT]=useState(start);
  // Payment-currency amount follows the ticked invoices until typed in
  const[payTouched,setPayTouched]=useState(!!init.xpay);
  const s=(k,v)=>setT(d=>({...d,[k]:v}));
  // Amount follows the allocated total until it is typed in (always the case when editing)
  const[amountTouched,setAmountTouched]=useState(!!init.id||!!init.amount);
  const _initStr=useRef(JSON.stringify(start()));
  const _isDirty=()=>JSON.stringify(t)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
  if(dirtyRef)dirtyRef.current=_isDirty;
  const isNew=!init.id;
  const kind=t.kind;
  const curSym=CURR[account.currency]||'£';
  const catList=kind==='in'?incomeCats:cats;
  const docType=kind==='in'?'invoice':kind==='out'?'received':'';

  const setKind=k=>setT(d=>{
    const next={...d,kind:k,type:k==='in'?'in':'out'};
    // Categories and documents differ between money in and money out
    if((d.kind==='in')!==(k==='in'))next.category='';
    if(k==='expense'||(d.kind==='in')!==(k==='in'))next.allocations=[];
    if(k==='expense')next.payCur=account.currency||'GBP';
    if(k==='expense'&&d.contactId&&!(contacts.find(c=>c.id===d.contactId&&c.type==='expense'))){next.contactId='';next.contactName='';}
    return next;
  });

  // Contacts grouped by relationship, most relevant groups first for this kind
  const contactGroups=(TX_CONTACT_ORDER[kind]||[]).map(type=>({type,label:contactTypeLabel(type),
    list:contacts.filter(c=>(c.type||'customer')===type).sort((a,b)=>contactName(a).localeCompare(contactName(b)))})).filter(g=>g.list.length);
  const setContact=id=>{
    const c=contacts.find(x=>x.id===id);
    setT(d=>({...d,contactId:id,contactName:c?contactName(c):'',allocations:[]}));
  };

  // Open documents of the chosen contact in this account's currency (drafts included: paying one issues it).
  // Older transactions without a contact only list the documents they already settle.
  const accCur=account.currency||'GBP';
  const xmode=kind!=='expense'&&!!t.payCur&&t.payCur!==accCur;
  const docCur=xmode?t.payCur:accCur;
  // Account amount = payment ÷ rate, plus the fee going out (or minus it coming in)
  const xcalc=v=>{const a=+v.payAmount,r=+v.rate,f=+(v.fee||0);if(!(a>0&&r>0))return null;return r2(v.kind==='out'?a/r+f:a/r-f);};
  const sx=(k,v)=>setT(d=>{const n={...d,[k]:v};if(!amountTouched){const c=xcalc(n);n.amount=c!=null?c.toFixed(2):'';}return n;});
  const setPayCur=c=>{setPayTouched(false);setT(d=>({...d,payCur:c,allocations:[],payAmount:'',rate:'',fee:'',amount:amountTouched?d.amount:''}));};
  const allocs=t.allocations||[];
  const allocOthers=allocatedByDoc(bankTx||[],init.id);
  const openDocs=!docType?[]:(docType==='invoice'?invoices:receivedInvoices).filter(d=>{
      const mine=allocs.some(x=>x.type===docType&&x.id===d.id);
      if(mine)return true;
      if(!t.contactName||d.status==='cancelled'||(d.currency||'GBP')!==docCur)return false;
      return docType==='invoice'?(d.client&&d.client.name)===t.contactName:d.supplier===t.contactName;
    }).map(d=>{const total=docTotal(d);const mine=allocs.find(x=>x.type===docType&&x.id===d.id);
      return{d,total,remaining:r2(total-(allocOthers[docKey(docType,d.id)]||0)),mine};})
    .filter(x=>x.mine||x.remaining>0.005).sort((x,y)=>(x.d.date||'')<(y.d.date||'')?-1:1);
  const allocTotal=r2(allocs.reduce((sum,x)=>sum+(+x.amount||0),0));
  const payTarget=xmode?(+t.payAmount||0):(+t.amount||0);
  const xc=xmode?xcalc(t):null;
  const applyAllocs=fn=>setT(d=>{
    const allocations=fn(d.allocations||[]);
    const n={...d,allocations};
    const sum=allocations.length?String(r2(allocations.reduce((acc,x)=>acc+(+x.amount||0),0))):'';
    if(xmode){if(!payTouched){n.payAmount=sum;if(!amountTouched){const c=xcalc(n);n.amount=c!=null?c.toFixed(2):'';}}}
    else if(!amountTouched)n.amount=sum;
    return n;
  });
  const toggleDoc=o=>applyAllocs(list=>{
    if(list.some(x=>x.type===docType&&x.id===o.d.id))return list.filter(x=>!(x.type===docType&&x.id===o.d.id));
    // With an amount typed in, fill up to what is left of it; otherwise take the full outstanding
    const base=xmode?(payTouched?(+t.payAmount||0):null):(amountTouched?(+t.amount||0):null);
    const left=base==null?o.remaining:r2(base-list.reduce((sum,x)=>sum+(+x.amount||0),0));
    return[...list,{type:docType,id:o.d.id,number:o.d.number,amount:String(r2(Math.min(o.remaining,left>0.005?left:o.remaining)))}];
  });
  const setAllocAmt=(o,v)=>applyAllocs(list=>list.map(x=>x.type===docType&&x.id===o.d.id?{...x,amount:v}:x));

  const trySave=()=>{
    if(!t.date){alert(tr('Enter a valid date.'));return;}
    if(!(+t.amount>0)){alert(tr('Enter an amount.'));return;}
    if(isNew&&kind!=='expense'&&!t.contactId){alert(tr("Select who the money {0}.", kind==='in'?tr('came from'):tr('went to')));return;}
    if(kind==='expense'&&!t.category){alert(tr('Select an expense category.'));return;}
    if(xmode){
      if(!(+t.payAmount>0)||!(+t.rate>0)||+(t.fee||0)<0){alert(tr("Enter the amount in {0} and the FX rate (fee cannot be negative).", t.payCur));return;}
      if(+(t.fee||0)>0&&!t.feeCategory){alert(tr('Select an expense category for the fee.'));return;}
    }
    for(const o of openDocs){if(o.mine&&(!(+o.mine.amount>0)||+o.mine.amount>o.remaining+0.005)){alert(tr("Amount for {0} must be between 0 and its outstanding {1}.", o.d.number, curFmt(docCur,o.remaining)));return;}}
    if(allocTotal>payTarget+0.005){alert(tr("The invoices total {0}, more than the payment of {1}.", curFmt(docCur,allocTotal), curFmt(docCur,payTarget)));return;}
    if(account.openingBalanceDate&&t.date<account.openingBalanceDate){
      alert(tr("This transaction is dated before the account's Opening Balance date ({0}). Pick a later date.", account.openingBalanceDate));
      return;
    }
    const allocations=kind==='expense'?[]:allocs.map(x=>({...x,amount:r2(+x.amount)}));
    const{payCur,payAmount,rate,fee,feeCategory,...rest}=t;
    const xpay=xmode?{id:(init.xpay&&init.xpay.id)||uid(),currency:payCur,amount:r2(+payAmount),rate:+rate,fee:r2(+fee||0),feeCategory:+fee>0?feeCategory:'',total:r2(+t.amount)}:null;
    onSave({...rest,type:kind==='in'?'in':'out',allocations,linkedDoc:null,xpay,description:toSentenceCase(t.description)});
  };

  const kinds=[['in','Money In','Payment received from a contact'],['out','Money Out','Payment made to a contact'],['expense','Expense','A cost booked to an expense category']];
  const catSelect=(<select value={t.category||''} onChange={x=>s('category',x.target.value)} className="fi"><option value="">{kind==='expense'?tr('— Select —'):tr('— None —')}</option>{groupCats(catList).map(({main,children})=>children.length===0?<option key={main.id} value={main.name}>{main.name}</option>:<optgroup key={main.id} label={main.name}>{children.map(ch=><option key={ch.id} value={ch.name}>{ch.name}</option>)}</optgroup>)}</select>);

  return(<div className="content"><div className="fw">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
      <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{t.id?tr('Edit Transaction'):tr('New Transaction')}</h2>
      <span style={{fontSize:13,color:'var(--g500)'}}>{account.accountName||tr('Account')} · {curSym}</span>
      <div style={{flex:1}}/>
      <Btn v="bp bsm" onClick={trySave}>{tr("Save")}</Btn>
    </div>
    <div className="tx-kinds" role="radiogroup" aria-label={tr("Transaction type")}>
      {kinds.map(([k,label,hint])=>(
        <button key={k} type="button" role="radio" aria-checked={kind===k} className={`tx-kind tx-${k}${kind===k?' active':''}`} onClick={()=>setKind(k)}>
          <span className="tx-kind-l">{label}</span><span className="tx-kind-h">{hint}</span>
        </button>
      ))}
    </div>
    <div className="fc"><div className="fct">{tr("Details")}</div>
      <div className="fg g3">
        <Fld label={tr("Date")}><input type="date" value={t.date||''} onChange={x=>s('date',x.target.value)} className="fi"/></Fld>
        <Fld label={xmode?tr("Amount {0} Account ({1})", kind==='out'?tr('Out of'):tr('Into'), accCur):tr("Amount ({0})", accCur)}><input type="number" value={t.amount||''} onChange={x=>{setAmountTouched(true);s('amount',x.target.value);}} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
        <Fld label={tr("Reference")}><input value={t.reference||''} onChange={x=>s('reference',x.target.value)} className="fi" placeholder={tr("Ref No")}/></Fld>
      </div>
      <div className="fg g2" style={{marginTop:12}}>
        <Fld label={kind==='in'?tr('Received From *'):kind==='out'?tr('Paid To *'):tr('Payee (optional)')}>
          <select value={t.contactId||''} onChange={x=>setContact(x.target.value)} className="fi">
            <option value="">{kind==='expense'?tr('— None —'):tr('— Select contact —')}</option>
            {contactGroups.map(g=><optgroup key={g.type} label={g.label}>{g.list.map(c=><option key={c.id} value={c.id}>{contactName(c)}</option>)}</optgroup>)}
            {t.contactId&&!contacts.some(c=>c.id===t.contactId)&&<option value={t.contactId}>{tr("{0} (deleted)", t.contactName)}</option>}
          </select>
          {contactGroups.length===0&&<span className="fx-hint">{kind==='expense'?tr('Add contacts with the Expense relationship under Contacts.'):tr('No contacts yet. Add them under Contacts.')}</span>}
        </Fld>
        <Fld label={kind==='expense'?tr('Expense Category *'):tr("{0} Category (optional)", kind==='in'?tr('Income'):tr('Expense'))}>{catSelect}</Fld>
      </div>
      {kind!=='expense'&&<div className={xmode?'tx-xpay':''} style={{marginTop:12}}>
        <div className="fg g4">
          <Fld label={tr("Payment Currency")}><select value={t.payCur||accCur} onChange={x=>setPayCur(x.target.value)} className="fi">{Object.keys(CURR).map(k=><option key={k} value={k}>{k}{k===accCur?tr(' (account)'):''}</option>)}</select></Fld>
          {xmode&&<>
            <Fld label={`${kind==='out'?'Received by Payee':'Paid by Contact'} (${t.payCur})`}><input type="number" value={t.payAmount} onChange={x=>{setPayTouched(true);sx('payAmount',x.target.value);}} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
            <Fld label={tr("FX Rate (1 {0} = ? {1})", accCur, t.payCur)}><input type="number" value={t.rate} onChange={x=>sx('rate',x.target.value)} className="fi" placeholder="0.000000" min="0" step="any"/></Fld>
            <Fld label={tr("Fee ({0})", accCur)}><input type="number" value={t.fee} onChange={x=>sx('fee',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
          </>}
        </div>
        {xmode&&xc!=null&&<div className="fx-calc">{curFmt(t.payCur,+t.payAmount)} ÷ {fxRateStr(t.rate)}{+t.fee?tr(" {0} {1} fee", kind==='out'?'+':'−', curFmt(accCur,+t.fee)):''} = <strong>{curFmt(accCur,xc)}</strong> {kind==='out'?tr('out of the account'):tr('into the account')}
          {Math.abs(xc-(+t.amount||0))>0.005&&<span className="fx-warn"> {tr("· the amount above differs — check it against the statement")}</span>}
        </div>}
        {xmode&&+t.fee>0&&<div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Fee Expense Category")}><select value={t.feeCategory||''} onChange={x=>s('feeCategory',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{groupCats(cats||[]).map(({main,children})=>children.length===0?<option key={main.id} value={main.name}>{main.name}</option>:<optgroup key={main.id} label={main.name}>{children.map(ch=><option key={ch.id} value={ch.name}>{ch.name}</option>)}</optgroup>)}</select>
            <span className="fx-hint">{tr("The fee is booked as a separate expense row.")}</span></Fld>
        </div>}
      </div>}
      {docType&&(t.contactId||allocs.length>0)&&<div className="tx-alloc">
        <div className="tx-alloc-t">{kind==='in'?tr('Invoices settled by this payment'):tr('Received invoices settled by this payment')} <span>{tr("(optional · {0})", docCur)}</span></div>
        {openDocs.length===0?<div className="fx-hint">{tr("No open {0} in {1} for this contact.", kind==='in'?tr('invoices'):tr('received invoices'), docCur)}</div>:(
        <table className="tx-alloc-tbl">
          <thead><tr><th/><th>{tr("Document")}</th><th>{tr("Date")}</th><th className="tar">{tr("Total")}</th><th className="tar">{tr("Outstanding")}</th><th className="tar">{tr("This payment")}</th></tr></thead>
          <tbody>{openDocs.map(o=>(
            <tr key={o.d.id} className={o.mine?'on':''}>
              <td><input type="checkbox" checked={!!o.mine} onChange={()=>toggleDoc(o)} aria-label={tr('Settle ')+o.d.number}/></td>
              <td style={{fontWeight:600}}>{o.d.number||'—'}{o.d.status==='draft'&&<span className="tx-draft">{tr("Draft")}</span>}</td>
              <td style={{color:'var(--g500)'}}>{o.d.date||'—'}</td>
              <td className="tar">{curFmt(docCur,o.total)}</td>
              <td className="tar">{curFmt(docCur,o.remaining)}</td>
              <td className="tar">{o.mine?<input type="number" value={o.mine.amount} onChange={x=>setAllocAmt(o,x.target.value)} className="fi tx-alloc-in" min="0" step=".01"/>:<span style={{color:'var(--g300)'}}>—</span>}</td>
            </tr>))}</tbody>
        </table>)}
        {allocs.length>0&&<div className={`tx-alloc-sum${allocTotal>payTarget+0.005?' over':''}`}>
          {tr("Allocated")} <strong>{curFmt(docCur,allocTotal)}</strong> {tr("of")} {curFmt(docCur,payTarget)}
          {allocTotal>payTarget+0.005?tr(' — more than the payment'):payTarget-allocTotal>0.005?tr(" · {0} on account", curFmt(docCur,r2(payTarget-allocTotal))):''}
        </div>}
      </div>}
      <div className="fg g1" style={{marginTop:12}}>
        <Fld label={tr("Description")}><input value={t.description||''} onChange={x=>s('description',x.target.value)} className="fi" placeholder={tr("What was this for?")}/></Fld>
      </div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={trySave}>{tr("Save")}</Btn></div>
  </div></div>);
}

// Currency exchange between two bank accounts, entered from the bank statement:
// amount out (source currency), FX rate, fee (target currency) and amount in (target currency).
function OffFxForm({fx:init,banks,cats,accountBalance,onSave,onCancel,dirtyRef}){
  // The fee is booked as an expense; preselect a "Bank Fee"/"Bank Charges" category when there is one
  const defaultFeeCat=((cats||[]).find(c=>/bank\s*(fee|charge)/i.test(c.name||''))||{}).name||'';
  const[f,setF]=useState(()=>({...init,feeCategory:init.feeCategory||defaultFeeCat}));
  // Amount In follows out × rate − fee until it is typed in by hand (always the case when editing)
  const[receivedTouched,setReceivedTouched]=useState(!!init.id);
  const _initStr=useRef(JSON.stringify(f));
  const _isDirty=()=>JSON.stringify(f)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
  if(dirtyRef)dirtyRef.current=_isDirty;

  const calc=v=>{const sold=+v.sold,rate=+v.rate,fee=+(v.fee||0);return sold>0&&rate>0?Math.round((sold*rate-fee)*100)/100:null;};
  const s=(k,v)=>setF(d=>{
    const n={...d,[k]:v};
    if(!receivedTouched&&['sold','rate','fee'].includes(k)){const c=calc(n);n.received=c==null?'':c.toFixed(2);}
    return n;
  });
  const from=banks.find(b=>b.id===f.fromAccountId);
  const to=banks.find(b=>b.id===f.toAccountId);
  const fromCur=(from&&from.currency)||'GBP',toCur=(to&&to.currency)||'GBP';
  const fromSym=CURR[fromCur]||'',toSym=CURR[toCur]||'';
  const calculated=calc(f);
  const mismatch=calculated!=null&&f.received!==''&&Math.abs(calculated-+f.received)>0.005;
  // When editing, this exchange's own outflow is already in the balance
  const available=from?accountBalance(from)+(init.id&&init.fromAccountId===from.id?+init.sold:0):0;
  const accOpt=b=><option key={b.id} value={b.id}>{b.accountName||tr('Unnamed')} ({b.currency||tr('GBP')})</option>;

  const trySave=()=>{
    if(!f.date){alert(tr('Enter a valid date.'));return;}
    if(!from||!to){alert(tr('Select both accounts.'));return;}
    if(from.id===to.id){alert(tr('Choose two different accounts.'));return;}
    if(!(+f.sold>0)||!(+f.rate>0)||!(+f.received>0)||+(f.fee||0)<0){alert(tr('Enter the amount out, FX rate and amount in (fee cannot be negative).'));return;}
    if(+(f.fee||0)>0&&!f.feeCategory){alert(tr('Select an expense category for the fee.'));return;}
    const early=[from,to].find(b=>b.openingBalanceDate&&f.date<b.openingBalanceDate);
    if(early){alert(tr("This exchange is dated before the Opening Balance date of {0} ({1}). Pick a later date.", early.accountName, early.openingBalanceDate));return;}
    onSave(f);
  };

  return(<div className="content"><div className="fw">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
      <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button>
      <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{init.id?tr('Edit Currency Exchange'):tr('Currency Exchange')}</h2>
      <div style={{flex:1}}/>
      <Btn v="bp bsm" onClick={trySave}>{tr("Save")}</Btn>
    </div>
    <div className="fc"><div className="fct">{tr("Accounts")}</div>
      <div className="fx-accounts">
        <Fld label={tr("From Account (money out)")}>
          <select value={f.fromAccountId||''} onChange={x=>s('fromAccountId',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{banks.map(accOpt)}</select>
          {from&&<span className={`fx-hint${+f.sold>available?' fx-warn':''}`}>{tr("Balance: {0}{1}{2}", fromSym, fmt(available), +f.sold>available?tr(' — lower than the amount out'):'')}</span>}
        </Fld>
        <button type="button" className="fx-swap" title={tr("Swap accounts")} aria-label={tr("Swap accounts")} onClick={()=>setF(d=>({...d,fromAccountId:d.toAccountId,toAccountId:d.fromAccountId}))}><Ico n="convert" size={15}/></button>
        <Fld label={tr("To Account (money in)")}>
          <select value={f.toAccountId||''} onChange={x=>s('toAccountId',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{banks.map(accOpt)}</select>
        </Fld>
      </div>
      <div className="fg g2" style={{marginTop:12}}>
        <Fld label={tr("Date")}><input type="date" value={f.date||''} onChange={x=>s('date',x.target.value)} className="fi"/></Fld>
        <Fld label={tr("Reference")}><input value={f.reference||''} onChange={x=>s('reference',x.target.value)} className="fi" placeholder={tr("Statement reference")}/></Fld>
      </div>
    </div>
    <div className="fc"><div className="fct">{tr("Amounts (as on the bank statement)")}</div>
      <div className="fg g4">
        <Fld label={tr("Amount Out ({0})", fromCur)}><input type="number" value={f.sold} onChange={x=>s('sold',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
        <Fld label={tr("FX Rate (1 {0} = ? {1})", fromCur, toCur)}><input type="number" value={f.rate} onChange={x=>s('rate',x.target.value)} className="fi" placeholder="0.000000" min="0" step="any"/></Fld>
        <Fld label={tr("Fee ({0})", toCur)}><input type="number" value={f.fee} onChange={x=>s('fee',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
        <Fld label={tr("Amount In ({0})", toCur)}><input type="number" value={f.received} onChange={x=>{setReceivedTouched(true);s('received',x.target.value);}} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
      </div>
      {calculated!=null&&<div className="fx-calc">{fromSym}{fmt(+f.sold)} × {fxRateStr(f.rate)}{+f.fee?tr(" − {0}{1} fee", toSym, fmt(+f.fee)):''} = <strong>{toSym}{fmt(calculated)}</strong>
        {mismatch&&<span className="fx-warn"> {tr("· Amount In differs from this — check it against the statement")}</span>}
      </div>}
      <div className="fg g2" style={{marginTop:12}}>
        {+f.fee>0&&<Fld label={tr("Fee Expense Category")}>
          <select value={f.feeCategory||''} onChange={x=>s('feeCategory',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{groupCats(cats||[]).map(({main,children})=>children.length===0?<option key={main.id} value={main.name}>{main.name}</option>:<optgroup key={main.id} label={main.name}>{children.map(ch=><option key={ch.id} value={ch.name}>{ch.name}</option>)}</optgroup>)}</select>
          <span className="fx-hint">{tr("The fee is booked as a separate expense: {0}{1} in, {2}{3} fee out.", toSym, fmt(+f.received+ +f.fee), toSym, fmt(+f.fee))}</span>
        </Fld>}
        <Fld label={tr("Description (optional)")}><input value={f.description||''} onChange={x=>s('description',x.target.value)} className="fi" placeholder={tr("e.g. Supplier payment funding")}/></Fld>
      </div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={trySave}>{tr("Save")}</Btn></div>
  </div></div>);
}
