
// ==========================
// OFFICIAL MODULE (unchanged)
// ==========================
function AppOfficial({account,onSwitchAccount}){
  const ns='off_';
  const[view,setView]=useState('home');
  const[prev,setPrev]=useState('home');
  const[inv,setInv]=useState([]);const[quo,setQuo]=useState([]);
  const[pos,setPos]=useState([]);const[rec,setRec]=useState([]);
  const[projects,setProjects]=useState([]);
  const[customers,setCustomers]=useState([]);
  const[expenses,setExpenses]=useState([]);
  const[expCats,setExpCats]=useState([]);
  const[users,setUsers]=useState([]);
  const[cnt,setCnt]=useState({i:0,q:0,p:0,r:0});
  const[co,setCo]=useState(DEF_CO);
  const[cur,setCur]=useState(null);
  const[toast,showToast]=useToast();

  useEffect(()=>{
    const a=LS.get(ns+'i'),b=LS.get(ns+'q'),c=LS.get(ns+'p'),d=LS.get(ns+'r'),
          e=LS.get(ns+'pr'),f=LS.get(ns+'cnt'),g=LS.get(ns+'co'),
          h=LS.get(ns+'exp'),k=LS.get(ns+'expcat'),l=LS.get(ns+'cust'),
          m=LS.get(ns+'users');
    if(a)setInv(a);else setInv([]);
    if(b)setQuo(b);else setQuo([]);
    if(c)setPos(c);else setPos([]);
    if(d)setRec(d);else setRec([]);
    if(e)setProjects(e);else setProjects([]);
    if(f)setCnt(f);else setCnt({i:0,q:0,p:0,r:0});
    const logo=getLogo();
    if(g)setCo({...DEF_CO,...g,logo:logo||''});else setCo({...DEF_CO,logo:logo||''});
    if(h)setExpenses(h);else setExpenses([]);
    if(k)setExpCats(k);else setExpCats(EXP_CATS_DEF.map(n=>({id:uid(),name:n})));
    if(l){const migrated=l.map(c=>{if('name'in c&&!('contact'in c)){const{name,...rest}=c;return{...rest,contact:name};}return c;});setCustomers(migrated);if(migrated.some((c,i)=>c!==l[i]))LS.set(ns+'cust',migrated);}else setCustomers([]);
    if(m){
      setUsers(m);
    }else{
      const defaultUser=[{id:uid(),username:'admin',password:'admin',firstName:'Admin',lastName:'User',email:'admin@greenmedltd.com',role:'Admin',active:true,createdAt:td()}];
      setUsers(defaultUser);
      LS.set(ns+'users',defaultUser);
    }
    setView('home');setCur(null);
  },[]);

  const go=(v,from)=>{setPrev(from||view);setView(v)};
  const si=d=>{setInv(d);LS.set(ns+'i',d)};const sq=d=>{setQuo(d);LS.set(ns+'q',d)};
  const sp=d=>{setPos(d);LS.set(ns+'p',d)};const sr=d=>{setRec(d);LS.set(ns+'r',d)};
  const spr=d=>{setProjects(d);LS.set(ns+'pr',d)};
  const sc=d=>{setCnt(d);LS.set(ns+'cnt',d)};
  const sExp=d=>{setExpenses(d);LS.set(ns+'exp',d)};
  const sExpCats=d=>{setExpCats(d);LS.set(ns+'expcat',d)};
  const sCust=d=>{setCustomers(d);LS.set(ns+'cust',d)};
  const sUsers=d=>{setUsers(d);LS.set(ns+'users',d)};

  const genN=(type)=>{
    const pfx=type==='invoice'?(co.invPfx||'INV'):type==='po'?(co.poPfx||'PO'):(co.quoPfx||'QUO');
    const start=parseInt(type==='invoice'?(co.invStart||1):type==='po'?(co.poStart||1):(co.quoStart||1),10);
    const n=type==='invoice'?cnt.i:type==='po'?cnt.p:cnt.q;
    return `${pfx}-${String(start+n).padStart(6,'0')}`;
  };

  const mkDoc=(type)=>({id:null,type,number:genN(type),date:td(),dueDate:type==='invoice'?td():addD(30),terms:type==='invoice'?'Due on Receipt':'Valid for 30 days',currency:'GBP',status:'draft',project:'',client:{name:'',address:'',email:'',ref:''},items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:'Thanks for your business.'});
  const mkRec=()=>({id:null,type:'received',number:'',supplier:'',supplierAddress:'',email:'',ref:'',date:td(),dueDate:addD(30),terms:'Due on Receipt',currency:'GBP',status:'pending',project:'',items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});
  const mkExp=()=>({id:null,date:td(),category:'',description:'',amount:'',currency:'GBP',supplier:'',reference:'',project:'',notes:''});

  const handleSave=doc=>{
    const fresh=!doc.id;const saved=fresh?{...doc,id:uid()}:doc;
    if(doc.type==='invoice')si(fresh?[...inv,saved]:inv.map(d=>d.id===saved.id?saved:d));
    else if(doc.type==='quote')sq(fresh?[...quo,saved]:quo.map(d=>d.id===saved.id?saved:d));
    else if(doc.type==='po')sp(fresh?[...pos,saved]:pos.map(d=>d.id===saved.id?saved:d));
    else sr(fresh?[...rec,saved]:rec.map(d=>d.id===saved.id?saved:d));
    if(fresh){const k=doc.type==='invoice'?'i':doc.type==='po'?'p':'q';sc({...cnt,[k]:cnt[k]+1});}
    showToast('Saved ✓');
    go(doc.type==='invoice'?'invoices':doc.type==='po'?'pos':doc.type==='received'?'received':'quotes');
  };
  const handleDel=doc=>{
    if(!confirm(`Delete ${doc.number||doc.supplier}?`))return;
    if(doc.type==='invoice')si(inv.filter(d=>d.id!==doc.id));
    else if(doc.type==='quote')sq(quo.filter(d=>d.id!==doc.id));
    else if(doc.type==='po')sp(pos.filter(d=>d.id!==doc.id));
    else sr(rec.filter(d=>d.id!==doc.id));
    showToast('Deleted');
  };
  const handleSavePrj=p=>{const fresh=!p.id;const saved=fresh?{...p,id:uid()}:p;spr(fresh?[...projects,saved]:projects.map(d=>d.id===saved.id?saved:d));showToast('Saved ✓');go('projects');};
  const handleSaveExp=e=>{const fresh=!e.id;const saved=fresh?{...e,id:uid()}:e;sExp(fresh?[...expenses,saved]:expenses.map(x=>x.id===saved.id?saved:x));showToast('Saved ✓');go('expenses');};
  const handleSaveCust=c=>{const fresh=!c.id;const saved=fresh?{...c,id:uid()}:c;sCust(fresh?[...customers,saved]:customers.map(x=>x.id===saved.id?saved:x));showToast('Saved ✓');go('off_customers');};

  // Simple generic form
  function SimpleDocForm({doc:init,onSave,onCancel,onPreview}){
    const[doc,setDoc]=useState(init);
    const[items,setItems]=useState(init.items||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
    const set=(p,v)=>setDoc(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const isInv=doc.type==='invoice';const isPO=doc.type==='po';const isRec=doc.type==='received';
    const trms=isInv||isRec?ITRM:['Due on Receipt','Valid for 30 days','Valid for 14 days'];
    const sts=isInv?['draft','sent','paid','overdue','cancelled']:isPO?['draft','sent','approved','received','cancelled']:isRec?['pending','paid','overdue','cancelled']:['draft','sent','accepted','declined','cancelled'];
    const typeLabel=isInv?'Invoice':isPO?'Purchase Order':isRec?'Received Invoice':'Quotation';
    const savedDoc={...doc,items};
    return(
      <div className="content"><div className="fw">
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Ico n="back"/>Back</button>
          <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{doc.id?`Edit ${typeLabel}`:`New ${typeLabel}`}</h2>
          <div style={{flex:1}}/>
          {onPreview&&<Btn v="bgh bsm" onClick={()=>onPreview(savedDoc)}><Ico n="eye"/>Preview</Btn>}
          <Btn v="bgh bsm" onClick={()=>savePDF(savedDoc,co,doc.type)}><Ico n="dl"/>PDF</Btn>
          <Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>Save {typeLabel}</Btn>
        </div>
        <div className="fc"><div className="fct">Document Details</div>
          <div className="fg g3">
            <Fld label="No"><input value={doc.number||''} onChange={e=>set('number',e.target.value)} className="fi" readOnly={!isRec} style={!isRec?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld>
            <Fld label="Date"><input type="date" value={doc.date||td()} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
            <Fld label={isInv?"Due Date":isRec?"Due Date":"Valid Until"}><input type="date" value={doc.dueDate||addD(30)} onChange={e=>set('dueDate',e.target.value)} className="fi"/></Fld>
          </div>
          <div className="fg g4" style={{marginTop:12}}>
            <Fld label="Currency"><select value={doc.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
            <Fld label="Terms"><select value={doc.terms||''} onChange={e=>set('terms',e.target.value)} className="fi">{trms.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>
            <Fld label="Status"><select value={doc.status||'draft'} onChange={e=>set('status',e.target.value)} className="fi">{sts.map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}</select></Fld>
            <Fld label="Project"><select value={doc.project||''} onChange={e=>set('project',e.target.value)} className="fi"><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Fld>
          </div>
        </div>
        <div className="fc"><div className="fct">{isRec||isPO?'Vendor / Supplier':'Bill To'}</div>
          {customers.length>0&&<div style={{marginBottom:12}}>
            <select className="fi" style={{maxWidth:320}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){if(isRec||isPO){set('supplier',c.company||c.name);set('supplierAddress',c.address||'');}else{set('client.name',c.company||c.name);set('client.email',c.email||'');set('client.address',c.address||'');}}}}>
              <option value="">— Quick fill from Customers —</option>
              {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
            </select>
          </div>}
          {(isRec||isPO)?(<div className="fg g2">
            <Fld label="Supplier Name"><input value={doc.supplier||''} onChange={e=>set('supplier',e.target.value)} placeholder="Supplier" className="fi"/></Fld>
            <Fld label="Email"><input value={doc.email||''} onChange={e=>set('email',e.target.value)} placeholder="email@supplier.com" className="fi"/></Fld>
          </div>):(<div className="fg g2">
            <Fld label="Customer Name"><input value={(doc.client&&doc.client.name)||''} onChange={e=>set('client.name',e.target.value)} placeholder="Customer" className="fi"/></Fld>
            <Fld label="Email"><input value={(doc.client&&doc.client.email)||''} onChange={e=>set('client.email',e.target.value)} placeholder="email@customer.com" className="fi"/></Fld>
          </div>)}
          <div className="fg g2" style={{marginTop:12}}>
            <Fld label="Address"><textarea value={(isRec||isPO)?doc.supplierAddress||'':(doc.client&&doc.client.address)||''} onChange={e=>(isRec||isPO)?set('supplierAddress',e.target.value):set('client.address',e.target.value)} rows={2} className="fi" placeholder="Address..."/></Fld>
            <Fld label="Reference"><input value={(isRec||isPO)?doc.ref||'':(doc.client&&doc.client.ref)||''} onChange={e=>(isRec||isPO)?set('ref',e.target.value):set('client.ref',e.target.value)} placeholder="Ref/PO No" className="fi"/></Fld>
          </div>
        </div>
        <div className="fc"><div className="fct">Line Items</div>
          <ItemsEditor items={items} setItems={setItems} currency={doc.currency||'GBP'}/>
        </div>
        <div className="fc"><div className="fct">Notes</div>
          <Fld label="Notes"><textarea value={doc.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi" placeholder="Notes..."/></Fld>
        </div>
        <div className="fact"><Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>Save {typeLabel}</Btn></div>
      </div></div>
    );
  }

  function OffListView({type,items}){
    const[fs,setFs]=useState({s:'',q:'',dateFrom:'',dateTo:''});
    const isRec=type==='received';
    const lbl=type==='invoice'?'Invoice':type==='po'?'Purchase Order':isRec?'Received Invoice':'Quotation';
    const sts=type==='invoice'?['draft','sent','paid','overdue','cancelled']:type==='po'?['draft','sent','approved','received','cancelled']:isRec?['pending','paid','overdue','cancelled']:['draft','sent','accepted','declined','cancelled'];
    const filtered=items.filter(d=>{
      const name=(isRec?d.supplier:(d&&d.client&&d.client.name))||'';
      if(fs.q&&![name,d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    return(
      <div className="content">
        <div className="sec-hdr">
          <h2>{type==='invoice'?'Invoices':type==='po'?'Purchase Orders':isRec?'Received Invoices':'Quotations'}</h2>
          <Btn v="bp bsm" onClick={()=>{setCur(isRec?mkRec():mkDoc(type));go('off_form');}}>
            <Ico n="plus"/>New {lbl}
          </Btn>
        </div>
        <div className="fbar">
          <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder={`Search ${isRec?'supplier':'customer'} or ref...`}/></div>
          <select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
            <option value="">All Statuses</option>{sts.map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}
          </select>
          <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
          <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
          <div style={{flex:1}}/>
          <Btn v="bgh bsm" onClick={()=>exportExcel([['Number',isRec?'Supplier':'Customer','Date','Amount','Status'],...filtered.map(d=>[d.number,isRec?d.supplier:(d&&d.client&&d.client.name)||'',d.date,fmt(dt(d.items||[])),d.status])],type)}><Ico n="export"/>Export</Btn>
        </div>
        {filtered.length===0?(
          <div className="tcard"><div className="empty"><Ico n={type==='invoice'?'invoice':isRec?'received':type==='po'?'po':'quote'} size={40}/><div className="empty-t">No {lbl.toLowerCase()}s yet</div><div className="empty-s">Get started by creating one</div><Btn v="bp bsm" onClick={()=>{setCur(isRec?mkRec():mkDoc(type));go('off_form');}}><Ico n="plus"/>New {lbl}</Btn></div></div>
        ):(
          <div className="tcard">
            <table className="dt">
              <thead><tr>
                <th>No</th>
                <th>Date</th>
                <th>{isRec?'Supplier':'Customer'}</th>
                {type==='po'&&<th>Project</th>}
                <th className="tar">Amount</th>
                <th className="tac">Status</th>
                <th></th>
              </tr></thead>
              <tbody>{[...filtered].reverse().map(d=>(
                <tr key={d.id}>
                  <td><span style={{fontFamily:'Inter',fontSize:11}}>{d.number||'—'}</span></td>
                  <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
                  <td>{isRec?d.supplier:(d&&d.client&&d.client.name)||'—'}</td>
                  {type==='po'&&<td style={{color:'var(--g500)',fontSize:11}}>{d.project||'—'}{d.sourceRef&&<div style={{fontSize:10,color:'var(--g400)',marginTop:1}}>from {d.sourceRef}</div>}</td>}
                  <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items||[]))}</td>
                  <td className="tac"><Badge s={d.status}/></td>
                  <td><div className="aw">
                    <button className="ab" onClick={()=>{setCur(d);go('off_preview');}}><Ico n="eye"/></button>
                    <button className="ab" onClick={()=>savePDF(d,co,type)}><Ico n="dl"/></button>
                    <button className="ab" onClick={()=>{setCur(d);go('off_form');}}><Ico n="edit"/></button>
                    <button className="ab danger" onClick={()=>handleDel(d)}><Ico n="trash"/></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  const SB=[
    {sec:'Documents'},
    {k:'off_invoices',ico:'invoice',lbl:'Invoices',cnt:inv.length},
    {k:'off_quotes',ico:'quote',lbl:'Quotations',cnt:quo.length},
    {k:'off_pos',ico:'po',lbl:'Purchase Orders',cnt:pos.length},
    {k:'off_received',ico:'received',lbl:'Received Invoices',cnt:rec.length},
    {div:true},
    {sec:'Management'},
    {k:'off_customers',ico:'customers',lbl:'Customers',cnt:customers.length},
    {k:'off_projects',ico:'project',lbl:'Projects',cnt:projects.length},
    {k:'off_expenses',ico:'expense',lbl:'Expenses',cnt:expenses.length},
  ];

  const titles={off_invoices:'Invoices',off_quotes:'Quotations',off_pos:'Purchase Orders',off_received:'Received Invoices',off_customers:'Customers',off_projects:'Projects',off_expenses:'Expenses',settings:'Settings',home:'Dashboard'};

  return(
    <div style={{display:'flex',minHeight:'100vh',width:'100%'}}>
      <div className="sidebar no-print">
        <div className="sb-brand" onClick={()=>go('home')}>
          <img src={getLogo()||LOGO} alt=""/><div style={{marginTop:2}}><div className="sb-brand-sub">Finance Manager</div></div>
        </div>
        <div className="sb-acc-pill">
          <span className="sb-acc-name" style={{color:'var(--gm-400)'}}>Official</span>
          <button className="sb-acc-switch" onClick={onSwitchAccount}>Switch ↩</button>
        </div>
        {SB.map((it,i)=>{
          if(it.sec)return <div key={i} className="sb-group">{it.sec}</div>;
          if(it.div)return <div key={i} style={{height:1,background:'rgba(255,255,255,.06)',margin:'5px 12px'}}/>;
          return <div key={it.k} className={`sb-item${view===it.k?' active':''}`} onClick={()=>go(it.k)}><Ico n={it.ico} size={14}/><span className="lbl">{it.lbl}</span>{it.cnt>0&&<span className="sb-cnt">{it.cnt}</span>}</div>;
        })}
        <div className="sb-footer">
          <button className="sb-footer-btn" onClick={()=>go('settings')}><Ico n="settings" size={13}/><span>Settings</span></button>
        </div>
      </div>
      <div className="main">
        {view!=='off_preview'&&<div className="topbar no-print">
          <div style={{flex:1}}/>
          <span style={{fontSize:10.5,fontWeight:600,padding:'2px 9px',borderRadius:9,background:'var(--amberl)',color:'var(--amber)',marginRight:8}}>Official</span>
        </div>}
        {view==='home'&&<div className="content"><div style={{marginBottom:20}}><div style={{fontSize:18,fontWeight:800,color:'var(--g900)',marginBottom:2}}>Dashboard</div><div style={{fontSize:12,color:'var(--g500)'}}>Official Account</div></div>
          <div className="nav-cards">
            {[{k:'off_invoices',ico:'invoice',lbl:'Invoices',val:inv.length},{k:'off_quotes',ico:'quote',lbl:'Quotations',val:quo.length},{k:'off_pos',ico:'po',lbl:'POs',val:pos.length},{k:'off_received',ico:'received',lbl:'Received',val:rec.length},{k:'off_customers',ico:'customers',lbl:'Customers',val:customers.length},{k:'off_projects',ico:'project',lbl:'Projects',val:projects.length},{k:'off_expenses',ico:'expense',lbl:'Expenses',val:expenses.length}].map(c=><div key={c.k} className="nav-card" onClick={()=>go(c.k)}><div className="nc-ico"><Ico n={c.ico} size={16}/></div><div className="nc-val">{c.val}</div><div className="nc-lbl">{c.lbl}</div></div>)}
          </div>
        </div>}
        {view==='off_invoices'&&<OffListView type="invoice" items={inv}/>}
        {view==='off_quotes'&&<OffListView type="quote" items={quo}/>}
        {view==='off_pos'&&<OffListView type="po" items={pos}/>}
        {view==='off_received'&&<OffListView type="received" items={rec}/>}
        {view==='off_customers'&&<OffCustomers customers={customers} inv={inv} quo={quo} onNew={()=>{setCur({id:null,contact:'',email:'',phone:'',address:'',company:'',notes:''});go('off_custform');}} onEdit={c=>{setCur(c);go('off_custform');}} onDelete={c=>{if(!confirm(`Delete "${c.company||c.contact}"?`))return;sCust(customers.filter(x=>x.id!==c.id));showToast('Deleted');}}/>}
        {view==='off_projects'&&<OffProjects projects={projects} onNew={()=>{setCur({id:null,name:'',client:'',startDate:td(),status:'active',desc:''});go('off_projform');}} onEdit={p=>{setCur(p);go('off_projform');}} onDelete={p=>{if(!confirm(`Delete "${p.name}"?`))return;spr(projects.filter(d=>d.id!==p.id));showToast('Deleted');}}/>}
        {view==='off_expenses'&&<OffExpenses expenses={expenses} projects={projects} cats={expCats} onNew={()=>{setCur(mkExp());go('off_expform');}} onEdit={e=>{setCur(e);go('off_expform');}} onDelete={e=>{if(!confirm('Delete?'))return;sExp(expenses.filter(x=>x.id!==e.id));showToast('Deleted');}} onManageCats={()=>go('off_expcats')}/>}
        {view==='off_form'&&cur&&<SimpleDocForm doc={cur} onSave={d=>{handleSave({...d,type:cur.type});}} onCancel={()=>go(prev)} onPreview={d=>{setCur(d);go('off_preview','off_form');}}/>}
        {view==='off_preview'&&cur&&<Preview doc={cur} co={co} docType={cur.type} onBack={()=>go(prev)} onEdit={()=>go('off_form','off_preview')}/>}
        {view==='off_custform'&&cur&&<OffCustForm cust={cur} onSave={handleSaveCust} onCancel={()=>go('off_customers')}/>}
        {view==='off_projform'&&cur&&<OffProjForm proj={cur} onSave={handleSavePrj} onCancel={()=>go('off_projects')}/>}
        {view==='off_expform'&&cur&&<OffExpForm exp={cur} projects={projects} cats={expCats} onSave={handleSaveExp} onCancel={()=>go('off_expenses')}/>}
        {view==='off_expcats'&&<OffExpCats cats={expCats} onSave={d=>{sExpCats(d);showToast('Saved ✓');go('off_expenses');}} onClose={()=>go('off_expenses')}/>}
        {view==='user_form'&&cur&&<UserForm user={cur} onSave={u=>{const usr={...u,id:u.id||uid(),createdAt:u.createdAt||td()};sUsers(u.id&&users.find(x=>x.id===u.id)?users.map(x=>x.id===u.id?usr:x):[...users,usr]);showToast('User saved');go('settings');}} onCancel={()=>go('settings')}/>}
        {view==='settings'&&<OffSettings ns={ns} co={co} users={users} sUsers={sUsers} go={go} setCur={setCur} cur={cur} showToast={showToast} onSave={d=>{const{logo,signature,...coWithoutLogoAndSig}=d;setLogo(logo||'');setSignature(signature||'');setCo(d);LS.set(ns+'co',coWithoutLogoAndSig);showToast('Saved ✓');go('home');}} onClose={()=>go('home')}/>}
      </div>
      {toast&&<div className="toast">{toast}</div>}
    </div>
  );
}

// Simple Official sub-components
function OffCustomers({customers,inv,quo,onNew,onEdit,onDelete}){
  const[q,setQ]=useState('');
  const f=[...customers.filter(c=>[c.contact,c.company,c.email].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))].sort((a,b)=>(a.company||a.contact||'').localeCompare(b.company||b.contact||''));
  return(<div className="content">
    <div className="sec-hdr"><h2>Customers</h2><Btn v="bp bsm" onClick={onNew}><Ico n="plus"/>New Customer</Btn></div>
    <div className="fbar"><div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..."/></div><div style={{flex:1}}/></div>
    {f.length===0?<div className="tcard"><div className="empty"><Ico n="customers" size={36}/><div className="empty-t">No customers yet</div></div></div>:(
    <div className="tcard"><table className="dt">
      <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th className="tac">Inv</th><th className="tac">Quotes</th><th></th></tr></thead>
      <tbody>{f.map(c=><tr key={c.id}>
        <td style={{fontWeight:500}}>{c.company||'—'}</td>
        <td>{c.contact||'—'}</td>
        <td>{c.email?<a href={`mailto:${c.email}`} style={{color:'var(--blue)',textDecoration:'none'}}>{c.email}</a>:'—'}</td>
        <td style={{color:'var(--g600)'}}>{c.phone||'—'}</td>
        <td className="tac" style={{color:'var(--green)'}}>{inv.filter(d=>(d&&d.client&&d.client.name)===(c.company||c.contact)).length}</td>
        <td className="tac" style={{color:'var(--gm-500)'}}>{quo.filter(d=>(d&&d.client&&d.client.name)===(c.company||c.contact)).length}</td>
        <td><div className="aw"><button className="ab" onClick={()=>onEdit(c)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(c)}><Ico n="trash"/></button></div></td>
      </tr>)}</tbody>
    </table></div>
    )}
  </div>);
}
function OffCustForm({cust:init,onSave,onCancel}){
  const[c,setC]=useState(init);const s=(k,v)=>setC(d=>({...d,[k]:v}));
  const _initStr=useRef(JSON.stringify(init));
  const _isDirty=()=>JSON.stringify(c)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty()){if(!confirm('You have unsaved changes. Leave without saving?'))return;}onCancel();};
  return(<div className="content"><div className="fw" style={{maxWidth:640}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{c.id?'Edit Customer':'New Customer'}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(c)}>Save</Btn></div>
    <div className="fc"><div className="fct">Customer Info</div>
      <div className="fg g2"><Fld label="Company Name *"><input value={c.company||''} onChange={e=>s('company',e.target.value)} className="fi" placeholder="Acme Ltd" required/></Fld><Fld label="Contact Person"><input value={c.contact||''} onChange={e=>s('contact',e.target.value)} className="fi" placeholder="John Smith"/></Fld></div>
      <div className="fg g2" style={{marginTop:12}}><Fld label="Email"><input type="email" value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi"/></Fld><Fld label="Phone"><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi"/></Fld></div>
      <div style={{marginTop:12}}><Fld label="Address"><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={3} className="fi"/></Fld></div>
      <div style={{marginTop:12}}><Fld label="Notes"><textarea value={c.notes||''} onChange={e=>s('notes',e.target.value)} rows={2} className="fi"/></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(c)}>Save</Btn></div>
  </div></div>);
}
function OffProjects({projects,onNew,onEdit,onDelete}){
  return(<div className="content">
    <div className="sec-hdr"><h2>Projects</h2><Btn v="bp bsm" onClick={onNew}><Ico n="plus"/>New Project</Btn></div>
    <div className="tcard"><table className="dt">
      <thead><tr><th>Name</th><th>Client</th><th>Start</th><th>Status</th><th></th></tr></thead>
      <tbody>{projects.length===0?<tr><td colSpan={5}><div className="empty"><div className="empty-t">No projects yet</div></div></td></tr>:projects.map(p=><tr key={p.id}><td>{p.name}</td><td style={{color:'var(--g600)'}}>{p.client||'—'}</td><td style={{color:'var(--g500)',fontSize:12}}>{p.startDate||'—'}</td><td><Badge s={p.status||'active'}/></td><td><div className="aw"><button className="ab" onClick={()=>onEdit(p)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(p)}><Ico n="trash"/></button></div></td></tr>)}
      </tbody>
    </table></div>
  </div>);
}
function OffProjForm({proj:init,onSave,onCancel}){
  const[p,setP]=useState(init);const s=(k,v)=>setP(d=>({...d,[k]:v}));
  return(<div className="content"><div className="fw" style={{maxWidth:580}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{p.id?'Edit Project':'New Project'}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(p)}>Save</Btn></div>
    <div className="fc"><div className="fct">Project Details</div>
      <div className="fg g2"><Fld label="Name"><input value={p.name||''} onChange={e=>s('name',e.target.value)} className="fi" placeholder="Project name"/></Fld><Fld label="Client"><input value={p.client||''} onChange={e=>s('client',e.target.value)} className="fi" placeholder="Client"/></Fld></div>
      <div className="fg g2" style={{marginTop:12}}><Fld label="Start Date"><input type="date" value={p.startDate||td()} onChange={e=>s('startDate',e.target.value)} className="fi"/></Fld><Fld label="Status"><select value={p.status||'active'} onChange={e=>s('status',e.target.value)} className="fi"><option value="active">Active</option><option value="completed">Completed</option><option value="on-hold">On Hold</option><option value="cancelled">Cancelled</option></select></Fld></div>
      <div style={{marginTop:12}}><Fld label="Description"><textarea value={p.desc||''} onChange={e=>s('desc',e.target.value)} rows={2} className="fi"/></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(p)}>Save</Btn></div>
  </div></div>);
}
function OffExpenses({expenses,projects,cats,onNew,onEdit,onDelete,onManageCats}){
  const[q,setQ]=useState('');
  const[dateFrom,setDateFrom]=useState('');
  const[dateTo,setDateTo]=useState('');
  const f=expenses.filter(e=>{
    if(q&&![e.description,e.supplier,e.category].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))return false;
    if(dateFrom&&e.date<dateFrom)return false;
    if(dateTo&&e.date>dateTo)return false;
    return true;
  });
  const total=f.reduce((s,e)=>s+(+(e.amount||0)),0);
  return(<div className="content">
    <div className="sec-hdr"><h2>Expenses</h2><div style={{display:'flex',gap:7}}><Btn v="bgh bsm" onClick={onManageCats}><Ico n="tag"/>Categories</Btn><Btn v="bp bsm" onClick={onNew}><Ico n="plus"/>New Expense</Btn></div></div>
    <div className="fbar">
      <div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..."/></div>
      <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
      <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
      <div style={{flex:1}}/>
      {f.length>0&&<span style={{fontSize:12,fontWeight:600,color:'var(--g600)'}}>Total: £{fmt(total)}</span>}
    </div>
    <div className="tcard"><table className="dt">
      <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Supplier</th><th className="tar">Amount</th><th></th></tr></thead>
      <tbody>{f.length===0?<tr><td colSpan={6}><div className="empty"><div className="empty-t">No expenses yet</div></div></td></tr>:f.map(e=><tr key={e.id}><td style={{color:'var(--g500)',fontSize:12}}>{e.date}</td><td>{e.category?<span style={{background:'var(--purplel)',color:'var(--purple)',padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600}}>{e.category}</span>:'—'}</td><td>{e.description||'—'}</td><td style={{color:'var(--g600)'}}>{e.supplier||'—'}</td><td className="tar">{CURR[e.currency]||'£'}{fmt(+(e.amount||0))}</td><td><div className="aw"><button className="ab" onClick={()=>onEdit(e)}><Ico n="edit"/></button><button className="ab danger" onClick={()=>onDelete(e)}><Ico n="trash"/></button></div></td></tr>)}
      </tbody>
    </table></div>
  </div>);
}
function OffExpForm({exp:init,projects,cats,onSave,onCancel}){
  const[e,setE]=useState(init);const s=(k,v)=>setE(d=>({...d,[k]:v}));
  return(<div className="content"><div className="fw" style={{maxWidth:680}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{e.id?'Edit Expense':'New Expense'}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(e)}>Save</Btn></div>
    <div className="fc"><div className="fct">Expense Details</div>
      <div className="fg g3"><Fld label="Date"><input type="date" value={e.date||td()} onChange={x=>s('date',x.target.value)} className="fi"/></Fld><Fld label="Amount"><input type="number" value={e.amount||''} onChange={x=>s('amount',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld><Fld label="Currency"><select value={e.currency||'GBP'} onChange={x=>s('currency',x.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld></div>
      <div className="fg g3" style={{marginTop:12}}><Fld label="Category"><select value={e.category||''} onChange={x=>s('category',x.target.value)} className="fi"><option value="">— Select —</option>{cats.map(c=><option key={c.id||c} value={c.name||c}>{c.name||c}</option>)}</select></Fld><Fld label="Description"><input value={e.description||''} onChange={x=>s('description',x.target.value)} className="fi" placeholder="What was this for?"/></Fld><Fld label="Supplier"><input value={e.supplier||''} onChange={x=>s('supplier',x.target.value)} className="fi" placeholder="Paid to..."/></Fld></div>
      <div className="fg g2" style={{marginTop:12}}><Fld label="Reference"><input value={e.reference||''} onChange={x=>s('reference',x.target.value)} className="fi" placeholder="Receipt/Ref No"/></Fld><Fld label="Project"><select value={e.project||''} onChange={x=>s('project',x.target.value)} className="fi"><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(e)}>Save</Btn></div>
  </div></div>);
}
function OffExpCats({cats,onSave,onClose}){
  const[c,setC]=useState(cats.map(x=>typeof x==='string'?{id:uid(),name:x}:{...x}));
  const[nm,setNm]=useState('');
  const add=()=>{if(!nm.trim())return;setC(x=>[...x,{id:uid(),name:nm.trim()}]);setNm('');};
  return(<div className="content"><div className="fw" style={{maxWidth:540}}>
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>Expense Categories</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(c)}>Save</Btn></div>
    <div className="fc"><div className="fct">Add Category</div>
      <div style={{display:'flex',gap:8}}><input value={nm} onChange={e=>setNm(e.target.value)} className="fi" style={{flex:1}} placeholder="Category name..." onKeyDown={e=>e.key==='Enter'&&add()}/><Btn v="bp bsm" onClick={add}><Ico n="plus"/>Add</Btn></div>
      <div style={{marginTop:14,display:'flex',flexWrap:'wrap',gap:7}}>{c.map(x=><span key={x.id} style={{background:'var(--purplel)',color:'var(--purple)',padding:'3px 10px',borderRadius:12,fontSize:12,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>{x.name}<button onClick={()=>setC(c=>c.filter(y=>y.id!==x.id))} style={{background:'none',border:'none',cursor:'pointer',color:'var(--purple)',fontSize:14,lineHeight:1}}>×</button></span>)}
      </div>
    </div>
  </div></div>);
}
function UserForm({user:init,onSave,onCancel}){
  const[u,setU]=useState(init);
  const s=(k,v)=>setU(x=>({...x,[k]:v}));
  
  return(<div className="content"><div className="fw">
    <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12}}>
      <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>Back</button>
      <div style={{width:'1px',height:'24px',background:'var(--g200)'}}/>
      <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)'}}>{u.id?'Edit User':'New User'}</h2>
      <div style={{flex:1}}/>
      <Btn v="bp bsm" onClick={()=>onSave(u)}>Save User</Btn>
    </div>
    
    <div className="fc">
      <div className="fct">User Information</div>
      <div className="fg g2">
        <Fld label="First Name"><input value={u.firstName||''} onChange={e=>s('firstName',e.target.value)} className="fi" placeholder="Enter first name"/></Fld>
        <Fld label="Last Name"><input value={u.lastName||''} onChange={e=>s('lastName',e.target.value)} className="fi" placeholder="Enter last name"/></Fld>
      </div>
      <div className="fg g1" style={{marginTop:14}}>
        <Fld label="Email"><input type="email" value={u.email||''} onChange={e=>s('email',e.target.value)} className="fi" placeholder="Enter email address"/></Fld>
      </div>
      <div className="fg g2" style={{marginTop:14}}>
        <Fld label="Username"><input value={u.username||''} onChange={e=>s('username',e.target.value)} className="fi" placeholder="Enter username"/></Fld>
        <Fld label="Password"><input type="password" value={u.password||''} onChange={e=>s('password',e.target.value)} className="fi" placeholder={u.id?"Leave empty to keep current":"Enter password"}/></Fld>
      </div>
      <div className="fg g2" style={{marginTop:14}}>
        <Fld label="Role">
          <select value={u.role||'User'} onChange={e=>s('role',e.target.value)} className="fi">
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="User">User</option>
          </select>
        </Fld>
        <Fld label="Status">
          <select value={u.active?'active':'inactive'} onChange={e=>s('active',e.target.value==='active')} className="fi">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Fld>
      </div>
    </div>
    
    <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
      <Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn>
      <Btn v="bp bsm" onClick={()=>onSave(u)} disabled={!u.username||(u.id?false:!u.password)}>Save User</Btn>
    </div>
  </div></div>);
}
function OffSettings({ns,co:init,users,sUsers,go,setCur,cur,showToast,onSave,onClose}){
  const[c,setC]=useState(()=>{
    const merged={...DEF_CO,...init};
    if(!merged.banks||merged.banks.length===0){
      // Eski format migration - accountName varsa onu banks array'e taşı
      if(merged.accountName||merged.accountNumber||merged.iban||merged.bic){
        merged.banks=[{id:uid(),accountName:merged.accountName||'',accountNumber:merged.accountNumber||'',iban:merged.iban||'',bic:merged.bic||'',isDefault:true}];
      }else{
        merged.banks=[];
      }
    }
    return merged;
  });
  const s=(k,v)=>setC(d=>({...d,[k]:v}));
  const[activeMenu,setActiveMenu]=useState(()=>LS.get(ns+'settingsMenu')||'company');
  const[numLocked,setNumLocked]=useState(true);
  const[editingBank,setEditingBank]=useState(null);
  
  const handleLogoUpload=(e)=>{
    const f=e.target.files[0];
    if(!f)return;
    if(!f.type.startsWith('image/')){alert('Please select an image file');return;}
    const r=new FileReader();
    r.onload=()=>{
      const data=r.result;
      setLogo(data);          // anında localStorage'a yaz
      s('logo',data);         // state'e yaz
    };
    r.readAsDataURL(f);
  };
  
  // Bank operations
  const addBank=()=>{
    setEditingBank({id:uid(),accountName:'',accountNumber:'',iban:'',bic:'',isDefault:false});
  };
  const saveBank=(bank)=>{
    const banks=c.banks||[];
    const idx=banks.findIndex(b=>b.id===bank.id);
    if(idx>=0){
      banks[idx]=bank;
    }else{
      if(bank.isDefault)banks.forEach(b=>b.isDefault=false);
      banks.push(bank);
    }
    s('banks',[...banks]);
    setEditingBank(null);
  };
  const deleteBank=(id)=>{
    if(!confirm('Delete this bank account?'))return;
    const banks=(c.banks||[]).filter(b=>b.id!==id);
    s('banks',banks);
  };
  const setDefaultBank=(id)=>{
    const banks=(c.banks||[]).map(b=>({...b,isDefault:b.id===id}));
    s('banks',banks);
  };
  
  const menuItems=[
    {id:'company',icon:'settings',label:'Company Information'},
    {id:'pdf',icon:'dl',label:'PDF Templates'},
    {id:'numbering',icon:'hash',label:'Document Numbering'},
    {id:'bank',icon:'card',label:'Bank Details'},
    {id:'users',icon:'user',label:'Users'}
  ];
  
  return(<div className="content" style={{padding:0,display:'flex',height:'calc(100vh - 54px)'}}>
    {/* Back Button & Title Bar */}
    <div style={{position:'absolute',top:0,left:0,right:0,background:'var(--g50)',borderBottom:'1px solid var(--g200)',padding:'12px 24px',display:'flex',alignItems:'center',gap:10,zIndex:10}}>
      <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back" size={14}/>Back to Dashboard</button>
      <h2 style={{fontSize:15,fontWeight:700,color:'var(--g900)',marginLeft:10}}>Settings</h2>
      <div style={{flex:1}}/>
      <Btn v="bp bsm" onClick={()=>onSave(c)}>Save</Btn>
    </div>
    
    {/* Left Menu */}
    <div style={{width:280,background:'var(--white)',borderRight:'1px solid var(--g200)',paddingTop:70,flexShrink:0}}>
      <div style={{padding:'8px 16px',fontSize:10,fontWeight:700,color:'var(--g400)',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:4}}>Settings</div>
      {menuItems.map(m=>(
        <div key={m.id} onClick={()=>{setActiveMenu(m.id);LS.set(ns+'settingsMenu',m.id);}} style={{padding:'10px 16px',margin:'2px 8px',borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:activeMenu===m.id?'var(--g100)':'transparent',color:activeMenu===m.id?'var(--g900)':'var(--g600)',fontWeight:activeMenu===m.id?600:500,fontSize:13,transition:'background 0.15s,border-color 0.15s,box-shadow 0.15s,color 0.15s,transform 0.15s'}}>
          <Ico n={m.icon} size={16}/>
          <span>{m.label}</span>
        </div>
      ))}
    </div>
    
    {/* Right Content */}
    <div style={{flex:1,overflowY:'auto',paddingTop:70}}>
      <div style={{padding:32,maxWidth:activeMenu==='users'?'100%':'700'}}>
        
        {/* Company Information */}
        {activeMenu==='company'&&(<>
          <div style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:20}}>Company Information</div>
          <div className="fc">
            <div style={{marginBottom:12}}><Fld label="Company Name"><input value={c.name||''} onChange={e=>s('name',e.target.value)} className="fi"/></Fld></div>
            <div style={{marginBottom:12}}><Fld label="Address"><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={4} className="fi"/></Fld></div>
            <div className="fg g2"><Fld label="Email"><input value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi"/></Fld><Fld label="Phone"><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi"/></Fld></div>
            <div style={{marginTop:16}}>
              <Fld label="Company Logo">
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="fi" style={{padding:'8px'}}/>
                {c.logo&&<div style={{marginTop:8,padding:12,background:'var(--g50)',borderRadius:8,display:'flex',alignItems:'center',gap:12}}>
                  <img src={c.logo} alt="Logo" style={{maxWidth:120,maxHeight:60,objectFit:'contain'}}/>
                  <button onClick={()=>{setLogo('');s('logo','');}} style={{padding:'4px 10px',background:'var(--red)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>Remove</button>
                </div>}
              </Fld>
            </div>
            <div style={{marginTop:16}}>
              <Fld label="Signature">
                <input type="file" accept="image/png,image/jpeg,image/jpg" onChange={(e)=>{
                  const f=e.target.files[0];
                  if(!f)return;
                  if(!f.type.match(/^image\/(png|jpeg|jpg)$/)){alert('Please select a PNG or JPG file');return;}
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
                  <button onClick={()=>{setSignature('');s('signature','');}} style={{padding:'4px 10px',background:'var(--red)',color:'white',border:'none',borderRadius:6,cursor:'pointer',fontSize:11,fontWeight:600}}>Remove</button>
                </div>}
              </Fld>
            </div>
          </div>
        </>)}
        
        {/* PDF Templates */}
        {activeMenu==='pdf'&&(<>
          <div style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:20}}>PDF Templates</div>
          <div style={{marginBottom:16,fontSize:13,color:'var(--g600)'}}>Select a template for your invoices and quotations</div>
          
          {Object.values(TEMPLATES).map(tpl=>(
            <div key={tpl.id} onClick={()=>s('selectedTemplate',tpl.id)} style={{background:'var(--white)',border:c.selectedTemplate===tpl.id?'2px solid var(--gm-400)':'1px solid var(--g200)',borderRadius:10,padding:20,marginBottom:12,cursor:'pointer',transition:'background 0.15s,border-color 0.15s,box-shadow 0.15s,color 0.15s,transform 0.15s',position:'relative'}}>
              {c.selectedTemplate===tpl.id&&<div style={{position:'absolute',top:12,right:12,background:'var(--gm-400)',color:'white',padding:'4px 10px',borderRadius:6,fontSize:11,fontWeight:700}}>ACTIVE</div>}
              <div style={{fontSize:15,fontWeight:700,color:'var(--g900)',marginBottom:6}}>{tpl.name}</div>
              <div style={{fontSize:12,color:'var(--g600)'}}>{tpl.description}</div>
            </div>
          ))}
        </>)}
        
        {/* Document Numbering */}
        {activeMenu==='numbering'&&(<>
          <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--g900)'}}>Document Numbering</div>
            <div style={{flex:1}}/>
            {numLocked?
              <Btn v="bgh bsm" onClick={()=>setNumLocked(false)}><Ico n="edit" size={13}/>Edit</Btn>:
              <Btn v="bp bsm" onClick={()=>setNumLocked(true)}><Ico n="check" size={13}/>Done</Btn>
            }
          </div>
          <div style={{background:'var(--white)',border:'1px solid var(--g200)',borderRadius:10,overflow:'hidden'}}>
            {/* Sales Quotation */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--g200)',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>1</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>Sales Quotation</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Prefix</div>
                    <input value={c.quoPfx||'QUO'} onChange={e=>s('quoPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Start Number</div>
                    <input type="number" value={c.quoStart||'1'} onChange={e=>s('quoStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Sales Invoice */}
            <div style={{padding:'16px 20px',borderBottom:'1px solid var(--g200)',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>2</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>Sales Invoice</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Prefix</div>
                    <input value={c.invPfx||'INV'} onChange={e=>s('invPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Start Number</div>
                    <input type="number" value={c.invStart||'1'} onChange={e=>s('invStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
                  </div>
                </div>
              </div>
            </div>
            {/* Purchase Order */}
            <div style={{padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}>
              <div style={{width:30,height:30,borderRadius:8,background:'var(--g100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'var(--g600)',flexShrink:0}}>3</div>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--g900)',marginBottom:8}}>Purchase Order</div>
                <div style={{display:'flex',gap:12,alignItems:'center'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Prefix</div>
                    <input value={c.poPfx||'PO'} onChange={e=>s('poPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Start Number</div>
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
            <div style={{fontSize:18,fontWeight:700,color:'var(--g900)'}}>Bank Details</div>
            <div style={{flex:1}}/>
            <Btn v="bp bsm" onClick={addBank}><Ico n="plus" size={13}/>Add Bank</Btn>
          </div>
          
          {/* Bank List */}
          {(!c.banks||c.banks.length===0)&&!editingBank&&(
            <div style={{padding:40,background:'var(--g50)',borderRadius:12,textAlign:'center',color:'var(--g500)',fontSize:13}}>
              <div style={{fontSize:40,marginBottom:12}}>🏦</div>
              <div style={{fontWeight:600,marginBottom:6}}>No Bank Accounts</div>
              <div>Add your first bank account to start.</div>
            </div>
          )}
          
          {(c.banks||[]).map(bank=>(
            <div key={bank.id} style={{background:'var(--white)',border:'1px solid var(--g200)',borderRadius:10,padding:20,marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,color:'var(--g900)'}}>{ bank.accountName||'Unnamed Account'}</div>
                {bank.isDefault&&<span style={{marginLeft:8,fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:10,background:'var(--greenl)',color:'var(--green)'}}>DEFAULT</span>}
                <div style={{flex:1}}/>
                <div style={{display:'flex',gap:6}}>
                  {!bank.isDefault&&<button onClick={()=>setDefaultBank(bank.id)} style={{padding:'4px 10px',fontSize:11,fontWeight:600,background:'var(--g100)',border:'none',borderRadius:6,cursor:'pointer',color:'var(--g700)'}}>Set Default</button>}
                  <button onClick={()=>setEditingBank(bank)} className="ab"><Ico n="edit"/></button>
                  <button onClick={()=>deleteBank(bank.id)} className="ab danger"><Ico n="trash"/></button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:12,color:'var(--g600)'}}>
                <div><span style={{fontWeight:600}}>Account Number:</span> {bank.accountNumber||'—'}</div>
                <div><span style={{fontWeight:600}}>IBAN:</span> {bank.iban||'—'}</div>
                <div><span style={{fontWeight:600}}>BIC:</span> {bank.bic||'—'}</div>
              </div>
            </div>
          ))}
          
          {/* Bank Form Modal */}
          {editingBank&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setEditingBank(null)}>
            <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:12,padding:24,width:500,maxWidth:'90vw'}}>
              <div style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{editingBank.accountName?'Edit Bank Account':'New Bank Account'}</div>
              <div style={{marginBottom:12}}><Fld label="Account Name"><input value={editingBank.accountName||''} onChange={e=>setEditingBank({...editingBank,accountName:e.target.value})} className="fi"/></Fld></div>
              <div style={{marginBottom:12}}><Fld label="Account Number"><input value={editingBank.accountNumber||''} onChange={e=>setEditingBank({...editingBank,accountNumber:e.target.value})} className="fi"/></Fld></div>
              <div style={{marginBottom:12}}><Fld label="IBAN"><input value={editingBank.iban||''} onChange={e=>setEditingBank({...editingBank,iban:e.target.value})} className="fi"/></Fld></div>
              <div style={{marginBottom:12}}><Fld label="BIC"><input value={editingBank.bic||''} onChange={e=>setEditingBank({...editingBank,bic:e.target.value})} className="fi"/></Fld></div>
              <div style={{marginBottom:16}}>
                <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer'}}>
                  <input type="checkbox" checked={editingBank.isDefault||false} onChange={e=>setEditingBank({...editingBank,isDefault:e.target.checked})}/>
                  <span>Set as default bank account</span>
                </label>
              </div>
              <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
                <Btn v="bgh bsm" onClick={()=>setEditingBank(null)}>Cancel</Btn>
                <Btn v="bp bsm" onClick={()=>saveBank(editingBank)}>Save</Btn>
              </div>
            </div>
          </div>)}
        </>)}
        
        {/* Users Management */}
        {activeMenu==='users'&&(<>
          <div style={{display:'flex',alignItems:'center',marginBottom:20}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--g900)'}}>User Management</div>
            <div style={{flex:1}}/>
            <Btn v="bp bsm" onClick={()=>{LS.set(ns+'settingsMenu','users');setCur({id:null,username:'',password:'',firstName:'',lastName:'',email:'',role:'User',active:true,createdAt:td()});go('user_form','settings');}}><Ico n="plus" size={13}/>Add User</Btn>
          </div>
          
          {users.length===0&&(
            <div style={{padding:40,background:'var(--g50)',borderRadius:12,textAlign:'center',color:'var(--g500)',fontSize:13}}>
              <div style={{fontSize:40,marginBottom:12}}>👤</div>
              <div style={{fontWeight:600,marginBottom:6}}>No Users</div>
              <div>Add your first user to start.</div>
            </div>
          )}
          
          {users.length>0&&(
            <div className="tcard"><table className="dt">
              <thead><tr>
                <th style={{width:50,textAlign:'center'}}>#</th>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr></thead>
              <tbody>{users.map((u,idx)=><tr key={u.id}>
                <td style={{textAlign:'center',color:'var(--g500)',fontSize:13,fontWeight:600}}>{idx+1}</td>
                <td style={{fontWeight:500}}>{u.firstName||'—'}</td>
                <td style={{fontWeight:500}}>{u.lastName||'—'}</td>
                <td style={{color:'var(--g600)',fontSize:13}}>{u.email||'—'}</td>
                <td style={{fontFamily:'monospace',fontSize:12,color:'var(--g700)'}}>{u.username}</td>
                <td><span style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:600,background:u.role==='Admin'?'var(--purplel)':'var(--bluel)',color:u.role==='Admin'?'var(--purple)':'var(--blue)'}}>{u.role}</span></td>
                <td><span style={{padding:'3px 10px',borderRadius:5,fontSize:11,fontWeight:600,background:u.active?'var(--greenl)':'var(--g200)',color:u.active?'var(--green)':'var(--g600)'}}>{u.active?'Active':'Inactive'}</span></td>
                <td style={{color:'var(--g600)',fontSize:12}}>{u.createdAt}</td>
                <td><div className="aw">
                  <button className="ab" onClick={()=>{LS.set(ns+'settingsMenu','users');setCur(u);go('user_form','settings');}}><Ico n="edit"/></button>
                  <button className="ab danger" onClick={()=>{if(!confirm(`Delete user "${u.username}"?`))return;sUsers(users.filter(x=>x.id!==u.id));showToast('User deleted');}}><Ico n="trash"/></button>
                </div></td>
              </tr>)}</tbody>
            </table></div>
          )}
        </>)}
        
        {/* Signature */}
        
      </div>
    </div>
  </div>);
}
