
// ==========================
// OPERATIONAL MODULE
// ==========================
function AppOperational({account,onSwitchAccount}){
  const ns='ops_';
  const[view,setView]=useState('home');
  const[prev,setPrev]=useState('home');
  const[cur,setCur]=useState(null);
  const[toast,showToast]=useToast();
  const[co,setCo]=useState(DEF_CO);
  const[customers,setCustomers]=useState([]);
  const[projects,setProjects]=useState([]);
  const[salesQuotes,setSalesQuotes]=useState([]);
  const[salesInvoices,setSalesInvoices]=useState([]);
  const[purchaseQuotes,setPurchaseQuotes]=useState([]);
  const[purchaseOrders,setPurchaseOrders]=useState([]);
  const[receivedInvoices,setReceivedInvoices]=useState([]);
  const[purchasePrices,setPurchasePrices]=useState({});
  const[expenses,setExpenses]=useState([]);
  const[expCats,setExpCats]=useState([]);
  const[documents,setDocuments]=useState([]);
  const[users,setUsers]=useState([]);
  const[cnt,setCnt]=useState({sq:0,si:0,po:0,prj:0});
  const[confirmDlg,setConfirmDlg]=useState(null);
  const askConfirm=(msg,onYes)=>setConfirmDlg({msg,onYes});
  const[showDocForm,setShowDocForm]=useState(false);const[docToEdit,setDocToEdit]=useState(null);

  useEffect(()=>{
    const load=k=>LS.get(ns+k);
    const c=load('co');const logo=getLogo();const signature=getSignature();if(c)setCo({...DEF_CO,...c,logo:logo||'',signature:signature||''});else setCo({...DEF_CO,logo:logo||'',signature:signature||''});
    const cu=load('cust');if(cu){const migrated=cu.map(c=>{if('name'in c&&!('contact'in c)){const{name,...rest}=c;return{...rest,contact:name};}return c;});setCustomers(migrated);if(migrated.some((c,i)=>c!==cu[i]))LS.set(ns+'cust',migrated);}
    const pr=load('proj');if(pr)setProjects(pr);
    const sq=load('sq');if(sq)setSalesQuotes(sq);
    const si=load('si');if(si)setSalesInvoices(si);
    const pq=load('pq');const po=load('po');const ri=load('ri');
    const migratedPO=(po||[]).map(p=>{const out={...p};delete out.status;if(!out.linkedRI){const linked=(ri||[]).find(r=>r.poId===p.id);if(linked)out.linkedRI={id:linked.id,number:linked.number};}return out;});
    const migratedPQ=(pq||[]).map(q=>{const out={...q};delete out.status;if(!out.linkedPO){const linked=migratedPO.find(p=>p.pqId===q.id);if(linked)out.linkedPO={id:linked.id,number:linked.number};}return out;});
    const migratedRI=(ri||[]).map(r=>r.status==='pending'?{...r,status:'unpaid'}:r);
    if(pq)setPurchaseQuotes(migratedPQ);
    if(po)setPurchaseOrders(migratedPO);
    if(ri)setReceivedInvoices(migratedRI);
    if(pq&&migratedPQ.some((q,i)=>q!==pq[i]))LS.set(ns+'pq',migratedPQ);
    if(po&&migratedPO.some((p,i)=>p!==po[i]))LS.set(ns+'po',migratedPO);
    if(ri&&migratedRI.some((r,i)=>r!==ri[i]))LS.set(ns+'ri',migratedRI);
    const pp=load('pp');if(pp&&!Array.isArray(pp))setPurchasePrices(pp);
    const ex=load('exp');if(ex)setExpenses(ex);
    const ec=load('expcat');if(ec)setExpCats(ec);else setExpCats(EXP_CATS_DEF.map(n=>({id:uid(),name:n})));
    const docs=load('docs');if(docs)setDocuments(docs);
    const usr=load('users');
    if(usr){
      setUsers(usr);
    }else{
      const defaultUser=[{id:uid(),username:'admin',password:'admin',firstName:'Admin',lastName:'User',email:'admin@greenmedltd.com',role:'Admin',active:true,createdAt:td()}];
      setUsers(defaultUser);
      LS.set(ns+'users',defaultUser);
    }
    const cn=load('cnt');if(cn)setCnt(cn);
    setView('home');setCur(null);
  },[]);

  const go=(v,from)=>{setPrev(from||view);setView(v)};
  const save=(key,setter,data)=>{setter(data);LS.set(ns+key,data)};
  const sSQ=d=>save('sq',setSalesQuotes,d);
  const sSI=d=>save('si',setSalesInvoices,d);
  const sPQ=d=>save('pq',setPurchaseQuotes,d);
  const sPO=d=>save('po',setPurchaseOrders,d);
  const sRI=d=>save('ri',setReceivedInvoices,d);
  const sPP=(id,price)=>{const next={...purchasePrices,[id]:price};setPurchasePrices(next);LS.set(ns+'pp',next);};
  const poolItems=salesQuotes.filter(q=>q.status==='sent').flatMap(q=>(q.items||[]).filter(it=>it.desc).map(it=>({id:q.id+'_'+(it.id||''),projectId:q.project||'',code:it.item||'',name:it.desc||'',brand:it.brand||'',model:it.model||'',category:it.category||'',qty:it.qty,unit:it.unit||'',price:it.price,purchasePrice:purchasePrices[q.id+'_'+(it.id||'')]||'',quoteNum:q.number,quoteId:q.id,date:q.date,customer:(q.client&&(q.client.company||q.client.contact))||''})));
  const sExp=d=>save('exp',setExpenses,d);
  const sExpCats=d=>save('expcat',setExpCats,d);
  const sProj=d=>save('proj',setProjects,d);
  const sCust=d=>save('cust',setCustomers,d);
  const sDocs=d=>save('docs',setDocuments,d);
  const sUsers=d=>save('users',setUsers,d);
  const sCnt=d=>{setCnt(d);LS.set(ns+'cnt',d)};

  // ── SALES QUOTATION LOGIC ──
  // Each quote group has a baseNum (Q0001).
  // revNum=0 → Q0001, revNum=1 → Q0001.R01, etc.
  // items carry invoicedQty (tracked per item)
  const getNextQuoteBase=()=>{
    const n=cnt.sq;const base=genQuoteBase(n+1);
    sCnt({...cnt,sq:n+1});
    return base;
  };
  const assignQuoteNumber=(q)=>{
    if(q.number&&q.number.startsWith('Q')){
      // Eğer base zaten varsa (revizyon), mevcut base'i kullan
      if(q.base){
        const num=genQuoteNum(q.base,q.rev||0);
        return{...q,number:num};
      }
      // Yeni teklif - yeni base oluştur
      const n=cnt.sq;const base=genQuoteBase(n+1);
      const num=genQuoteNum(base,q.rev||0);
      sCnt({...cnt,sq:n+1});
      return{...q,base,number:num};
    }
    return q;
  };
  const mkSalesQuote=(base,rev,fromQuote)=>{
    const num=genQuoteNum(base,rev);
    return{id:null,base,rev,number:num,date:td(),validUntil:addD(30),
      currency:(fromQuote&&fromQuote.currency)||'GBP',
      status:'draft',locked:false,
      project:(fromQuote&&fromQuote.project)||'',
      projectNumber:(fromQuote&&fromQuote.projectNumber)||'',
      client:(fromQuote&&fromQuote.client)?{...fromQuote.client}:{name:'',company:'',address:'',email:'',phone:'',ref:''},
      shipToEnabled:(fromQuote&&fromQuote.shipToEnabled)||false,
      shipTo:(fromQuote&&fromQuote.shipTo)?{...fromQuote.shipTo}:{company:'',contact:'',email:'',phone:'',address:'',ref:''},
      items:((fromQuote&&fromQuote.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:'',invoicedQty:0}]).map(i=>({...i,id:uid(),invoicedQty:0})),
      notes:(fromQuote&&fromQuote.notes)||''};
  };

  const handleSaveSQ=q=>{
    const fresh=!q.id;
    const numbered=fresh?assignQuoteNumber(q):q;
    const saved={...numbered,id:numbered.id||uid()};
    sSQ(fresh?[...salesQuotes,saved]:salesQuotes.map(x=>x.id===saved.id?saved:x));
    showToast('Saved ✓');go('sales_quotes');
  };

  const handleNewRevision=(q)=>{
    // Make current passive
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'passive',locked:false}:x));
    const newQ=mkSalesQuote(q.base,q.rev+1,q);
    setCur(newQ);go('sales_quote_form');
    showToast('New revision created');
  };

  const handleUnlockQuote=(q)=>{
    if(q.status==='locked'||q.status==='approved'){
      handleNewRevision(q);
    } else {
      sSQ(salesQuotes.map(x=>x.id===q.id?{...x,locked:false,status:'draft'}:x));
      showToast('Quote unlocked');
    }
  };

  const handleMarkAsSent=(q)=>{
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'sent'}:x));
    showToast('Quote marked as sent');
  };
  const handleMarkInvoiceAsSent=(inv)=>{
    sSI(salesInvoices.map(x=>x.id===inv.id?{...x,status:'sent'}:x));
    showToast('Invoice marked as sent');
  };
  const handleApproveQuote=(q)=>{
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'approved',locked:true}:x));
    showToast('Quote approved & locked');
  };

  // Check remaining items for a quote
  const getQuoteRemainingItems=(q)=>{
    return (q.items||[]).filter(it=>{
      const invoiced=salesInvoices.filter(si=>si.quoteId===q.id).reduce((s,si)=>{
        const match=si.items&&si.items.find(i=>i.quoteItemId===it.id);
        return s+(match?+(match.qty||0):0);
      },0);
      return invoiced<+(it.qty||0);
    }).map(it=>{
      const invoiced=salesInvoices.filter(si=>si.quoteId===q.id).reduce((s,si)=>{
        const match=si.items&&si.items.find(i=>i.quoteItemId===it.id);
        return s+(match?+(match.qty||0):0);
      },0);
      return{...it,invoicedQty:invoiced,remainingQty:+(it.qty||0)-invoiced};
    });
  };

  // Create SI from quote
  const mkSalesInvoice=(q)=>{
    const n=cnt.si;const num=genSINum(n+1);
    const remaining=getQuoteRemainingItems(q);
    return{id:null,number:num,quoteId:q.id,quoteNum:q.number,date:td(),dueDate:td(),terms:'Due on Receipt',currency:q.currency||'GBP',status:'draft',project:q.project||'',projectNumber:q.projectNumber||'',client:{...q.client},shipToEnabled:q.shipToEnabled||false,shipTo:q.shipTo?{...q.shipTo}:{company:'',contact:'',email:'',phone:'',address:''},items:remaining.map(it=>({id:uid(),quoteItemId:it.id,item:it.item,desc:it.desc,unit:it.unit,price:it.price,qty:String(it.remainingQty),maxQty:it.remainingQty})),notes:q.notes||''};
  };
  const assignInvoiceNumber=(si)=>{
    if(!si.number||si.number.startsWith('SI')){
      const n=cnt.si;const num=genSINum(n+1);
      sCnt({...cnt,si:n+1});
      return{...si,number:num};
    }
    return si;
  };

  const handleSaveSI=si=>{
    const fresh=!si.id;
    const numbered=fresh?assignInvoiceNumber(si):si;
    const saved={...numbered,id:numbered.id||uid()};
    sSI(fresh?[...salesInvoices,saved]:salesInvoices.map(x=>x.id===saved.id?saved:x));
    // Check if quote is fully invoiced
    const q=salesQuotes.find(x=>x.id===si.quoteId);
    if(q){
      const remaining=getQuoteRemainingItems({...q});
      const stillOpen=remaining.some(it=>it.remainingQty>+((saved.items&&saved.items.find(i=>i.quoteItemId===it.id)&&saved.items.find(i=>i.quoteItemId===it.id).qty)||0));
      if(!stillOpen){sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'closed'}:x));}
    }
    showToast('Invoice saved');go('sales_invoices');
  };

  // ── PROCUREMENT LOGIC ──
  const mkPurchaseQuote=()=>({id:null,number:'',date:td(),supplier:'',supplierAddress:'',currency:'GBP',project:'',projectNumber:'',linkedPO:null,items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});
  const mkPurchaseOrder=(pq)=>{
    const n=cnt.po;const num=genPONum(n+1);
    return{id:null,number:num,pqId:(pq&&pq.id)||null,pqNum:(pq&&pq.number)||'',date:td(),deliveryDate:addD(30),supplier:(pq&&pq.supplier)||'',supplierAddress:(pq&&pq.supplierAddress)||'',currency:(pq&&pq.currency)||'GBP',project:(pq&&pq.project)||'',projectNumber:(pq&&pq.projectNumber)||'',linkedRI:null,items:((pq&&pq.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]).map(i=>({...i,id:uid()})),notes:''};
  };
  const assignPONumber=(po)=>{
    if(!po.number||po.number.startsWith('PO')){
      const n=cnt.po;const num=genPONum(n+1);
      sCnt({...cnt,po:n+1});
      return{...po,number:num};
    }
    return po;
  };
  const mkReceivedInvoice=(po)=>({id:null,number:'',poId:(po&&po.id)||null,poNum:(po&&po.number)||'',date:td(),dueDate:addD(30),terms:'Due on Receipt',supplier:(po&&po.supplier)||'',supplierAddress:(po&&po.supplierAddress)||'',currency:(po&&po.currency)||'GBP',status:'unpaid',project:(po&&po.project)||'',projectNumber:(po&&po.projectNumber)||'',items:((po&&po.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]).map(i=>({...i,id:uid()})),notes:''});

  const handleSavePQ=pq=>{
    const fresh=!pq.id;const saved={...pq,id:pq.id||uid()};
    sPQ(fresh?[...purchaseQuotes,saved]:purchaseQuotes.map(x=>x.id===saved.id?saved:x));
    showToast('Saved ✓');go('purchase_quotes');
  };
  const handleConvertPQtoPO=(pq)=>{
    const po=mkPurchaseOrder(pq);
    const numbered=assignPONumber(po);
    const newPO={...numbered,id:uid()};
    sPO([...purchaseOrders,newPO]);
    sPQ(purchaseQuotes.map(x=>x.id===pq.id?{...x,linkedPO:{id:newPO.id,number:newPO.number}}:x));
    showToast('Converted to PO');go('purchase_orders');
  };
  const handleSavePO=po=>{
    const fresh=!po.id;
    const numbered=fresh?assignPONumber(po):po;
    const saved={...numbered,id:numbered.id||uid()};
    sPO(fresh?[...purchaseOrders,saved]:purchaseOrders.map(x=>x.id===saved.id?saved:x));
    showToast('Saved ✓');go('purchase_orders');
  };
  const handleConvertPOtoRI=(po)=>{
    const ri=mkReceivedInvoice(po);
    setCur({...ri,_pendingPOId:po.id});
    go('received_invoice_form');
  };
  const handleSaveRIFromPO=(ri)=>{
    const fresh=!ri.id;const saved={...ri,id:ri.id||uid()};
    const pendingPOId=ri._pendingPOId;
    const {_pendingPOId:_,...cleanRI}=saved;
    sRI(fresh?[...receivedInvoices,cleanRI]:receivedInvoices.map(x=>x.id===cleanRI.id?cleanRI:x));
    if(pendingPOId)sPO(purchaseOrders.map(x=>x.id===pendingPOId?{...x,linkedRI:{id:cleanRI.id,number:cleanRI.number}}:x));
    showToast('Saved ✓');go('received_invoices');
  };
  const handleSaveRI=ri=>{
    const fresh=!ri.id;const saved={...ri,id:ri.id||uid()};
    sRI(fresh?[...receivedInvoices,saved]:receivedInvoices.map(x=>x.id===saved.id?saved:x));
    showToast('Saved ✓');go('received_invoices');
  };

  // ── PROJECT ──
  const mkProject=()=>{
    const n=cnt.prj;const num=genProjNum(n+1);
    return{id:null,number:num,name:'',client:'',clientId:'',budget:'',currency:'GBP',startDate:td(),status:'active',desc:''};
  };
  const assignProjectNumber=(p)=>{
    if(!p.number||p.number.startsWith('PRJ')){
      const n=cnt.prj;const num=genProjNum(n+1);
      sCnt({...cnt,prj:n+1});
      return{...p,number:num};
    }
    return p;
  };
  const handleSaveProj=p=>{
    const fresh=!p.id;
    const numbered=fresh?assignProjectNumber(p):p;
    const saved={...numbered,id:numbered.id||uid()};
    sProj(fresh?[...projects,saved]:projects.map(x=>x.id===saved.id?saved:x));
    showToast('Saved ✓');go('projects');
  };

  // ── EXPENSE ──
  const mkExpense=()=>({id:null,date:td(),category:'',description:'',amount:'',currency:'GBP',supplier:'',reference:'',project:'',notes:''});
  const handleSaveExp=e=>{const fresh=!e.id;const saved=fresh?{...e,id:uid()}:e;sExp(fresh?[...expenses,saved]:expenses.map(x=>x.id===saved.id?saved:x));showToast('Saved ✓');go('expenses');};

  // ── CUSTOMER ──
  const handleSaveCust=c=>{const fresh=!c.id;const saved=fresh?{...c,id:uid()}:c;sCust(fresh?[...customers,saved]:customers.map(x=>x.id===saved.id?saved:x));showToast('Saved ✓');go('customers');};

  // ── VIEWS ──

  // Sales Quotes List
  function SalesQuotesList(){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const[sortConfig,setSortConfig]=useState({key:null,dir:'asc'});
    const[expandedGroups,setExpandedGroups]=useState(new Set());
    const hasFilter=fs.q||fs.s||fs.dateFrom||fs.dateTo;
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs));
    const toggleGroup=(base)=>{setExpandedGroups(prev=>{const next=new Set(prev);if(next.has(base))next.delete(base);else next.add(base);return next;});};
    const handleSort=(key)=>{setSortConfig(prev=>({key,dir:prev.key===key&&prev.dir==='asc'?'desc':'asc'}));};
    const matchesFilter=(q)=>{
      const company=(q.client&&q.client.company)||'';
      const contact=(q.client&&q.client.contact)||'';
      if(fs.q&&![company,contact,q.number].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.s&&q.status!==fs.s)return false;
      if(fs.dateFrom&&q.date<fs.dateFrom)return false;
      if(fs.dateTo&&q.date>fs.dateTo)return false;
      return true;
    };
    const allGroups={};
    salesQuotes.forEach(q=>{if(!allGroups[q.base])allGroups[q.base]=[];allGroups[q.base].push(q);});
    const filteredGroups=Object.entries(allGroups)
      .filter(([,revs])=>!hasFilter||revs.some(matchesFilter))
      .map(([base,revs])=>{const sorted=[...revs].sort((a,b)=>b.rev-a.rev);return{base,revs:sorted,latest:sorted[0]};});
    const flatFiltered=salesQuotes.filter(matchesFilter);
    const sortedGroups=[...filteredGroups].sort((a,b)=>{
      if(!sortConfig.key)return b.latest.date.localeCompare(a.latest.date);
      let aVal,bVal;
      if(sortConfig.key==='number')aVal=a.base,bVal=b.base;
      else if(sortConfig.key==='date')aVal=a.latest.date,bVal=b.latest.date;
      else if(sortConfig.key==='customer')aVal=(a.latest.client&&a.latest.client.company)||'',bVal=(b.latest.client&&b.latest.client.company)||'';
      else if(sortConfig.key==='project')aVal=a.latest.project||'',bVal=b.latest.project||'';
      else if(sortConfig.key==='total')aVal=dt(a.latest.items),bVal=dt(b.latest.items);
      else if(sortConfig.key==='status')aVal=a.latest.status,bVal=b.latest.status;
      else return 0;
      if(typeof aVal==='string')return sortConfig.dir==='asc'?aVal.localeCompare(bVal):bVal.localeCompare(aVal);
      return sortConfig.dir==='asc'?aVal-bVal:bVal-aVal;
    });
    const isExpanded=(base)=>hasFilter||expandedGroups.has(base);
    return(<div className="content">
      <div className="fbar">
        <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder="Search customer, quote no..."/></div>
        <select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">All Statuses</option>
          {['draft','sent','approved','locked','passive','closed'].map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}
        </select>
        <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <div style={{flex:1}}/>
        <Btn v="bex bsm" onClick={()=>exportExcel([['Number','Date','Company','Contact','Total','Status','Project'],...flatFiltered.map(q=>[q.number,q.date,(q.client&&q.client.company)||'',(q.client&&q.client.contact)||'',fmt(dt(q.items)),q.status,q.project||''])],'sales-quotations')}><Ico n="export"/>Export</Btn>
      </div>
      {sortedGroups.length===0?<div className="tcard"><div className="empty"><Ico n="quote" size={38}/><div className="empty-t">No quotations yet</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr>
            <th onClick={()=>handleSort('number')} style={{cursor:'pointer',userSelect:'none'}}>Quote No {sortConfig.key==='number'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('date')} style={{cursor:'pointer',userSelect:'none'}}>Date {sortConfig.key==='date'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('customer')} style={{cursor:'pointer',userSelect:'none'}}>Customer {sortConfig.key==='customer'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('project')} style={{cursor:'pointer',userSelect:'none'}}>Project {sortConfig.key==='project'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tar" onClick={()=>handleSort('total')} style={{cursor:'pointer',userSelect:'none'}}>Total {sortConfig.key==='total'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tac" onClick={()=>handleSort('status')} style={{cursor:'pointer',userSelect:'none'}}>Status {sortConfig.key==='status'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th></th>
          </tr></thead>
          <tbody>{sortedGroups.slice((pg-1)*ps,pg*ps).map(({base,revs,latest})=>{
            const history=revs.slice(1);
            const hasHistory=history.length>0;
            const expanded=isExpanded(base);
            const remaining=getQuoteRemainingItems(latest);
            const remAmt=dt(remaining.map(i=>({...i,qty:i.remainingQty})));
            return(<React.Fragment key={base}>
              <tr style={{fontStyle:latest.status==='passive'?'italic':'normal'}}>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    {hasHistory
                      ?<button onClick={()=>toggleGroup(base)} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',color:'var(--g400)',display:'flex',alignItems:'center',flexShrink:0}}>
                          <svg style={{width:12,height:12,transition:'transform .15s',transform:expanded?'rotate(90deg)':'rotate(0deg)',stroke:'currentColor',fill:'none',strokeWidth:2}} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      :<span style={{width:16,flexShrink:0}}/>
                    }
                    <span style={{fontFamily:'Inter',fontSize:11}}>{latest.number}</span>
                    {latest.rev>0&&<span className="rev-badge">R{String(latest.rev).padStart(2,'0')}</span>}
                    {latest.locked&&<span className="locked-badge"><Ico n="lock" size={10}/>Locked</span>}
                    {hasHistory&&<span style={{fontSize:10,color:'var(--g400)',background:'var(--g100)',padding:'1px 6px',borderRadius:8,flexShrink:0}}>{history.length} rev</span>}
                  </div>
                </td>
                <td style={{color:'var(--g500)',fontSize:12}}>{latest.date}</td>
                <td>{(latest.client&&latest.client.company)?latest.client.company:'—'}</td>
                <td style={{color:'var(--g500)',fontSize:12}}>{latest.project||'—'}</td>
                <td className="tar">
                  {CURR[latest.currency]||'£'}{fmt(dt(latest.items))}
                  {latest.status==='approved'&&remaining.length>0&&<div style={{fontSize:10,color:'var(--amber)',marginTop:1}}>Rem: £{fmt(remAmt)}</div>}
                </td>
                <td className="tac"><Badge s={latest.status}/></td>
                <td><div className="aw">
                  <button className="ab" title="Preview" onClick={()=>{setCur(latest);go('sales_quote_preview');}}><Ico n="eye"/></button>
                  <button className="ab" title="Download PDF" onClick={()=>savePDF(latest,co,'sales_quote')}><Ico n="dl"/></button>
                  {latest.status==='draft'&&<button className="ab" title="Edit" onClick={()=>{setCur(latest);go('sales_quote_form');}}><Ico n="edit"/></button>}
                  {latest.status==='draft'&&<button className="ab" title="Mark as Sent" onClick={()=>handleMarkAsSent(latest)}><Ico n="send"/></button>}
                  {latest.status==='sent'&&<button className="ab" title="Approve" onClick={()=>handleApproveQuote(latest)}><Ico n="check"/></button>}
                  {latest.status==='sent'&&<button className="ab" title="Revise" onClick={()=>handleNewRevision(latest)}><Ico n="rev"/></button>}
                  {(latest.status==='approved'||latest.status==='locked')&&<button className="ab" title="Revise" onClick={()=>handleNewRevision(latest)}><Ico n="rev"/></button>}
                  {latest.status==='approved'&&remaining.length>0&&<button className="ab" title="Create Invoice" onClick={()=>{setCur(mkSalesInvoice(latest));go('sales_invoice_form');}}><Ico n="invoice"/></button>}
                  <button className="ab danger" title="Delete" onClick={()=>askConfirm('Delete this quotation?',()=>{sSQ(salesQuotes.filter(x=>x.id!==latest.id));showToast('Deleted');})}><Ico n="trash"/></button>
                </div></td>
              </tr>
              {expanded&&history.map(q=>(
                <tr key={q.id} style={{background:'var(--g50)',fontStyle:'italic'}}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:5,paddingLeft:22}}>
                      <span style={{color:'var(--g300)',fontSize:13,lineHeight:1}}>└</span>
                      <span style={{fontFamily:'Inter',fontSize:11}}>{q.number}</span>
                      {q.rev>0&&<span className="rev-badge">R{String(q.rev).padStart(2,'0')}</span>}
                    </div>
                  </td>
                  <td style={{fontSize:12}}>{q.date}</td>
                  <td style={{fontSize:12}}>{(q.client&&q.client.company)||'—'}</td>
                  <td style={{fontSize:12}}>{q.project||'—'}</td>
                  <td className="tar" style={{fontSize:12}}>{CURR[q.currency]||'£'}{fmt(dt(q.items))}</td>
                  <td className="tac"><Badge s={q.status}/></td>
                  <td><div className="aw">
                    <button className="ab" title="Preview" onClick={()=>{setCur(q);go('sales_quote_preview');}}><Ico n="eye"/></button>
                    <button className="ab" title="Download PDF" onClick={()=>savePDF(q,co,'sales_quote')}><Ico n="dl"/></button>
                    <button className="ab danger" title="Delete" onClick={()=>askConfirm('Delete this revision?',()=>{sSQ(salesQuotes.filter(x=>x.id!==q.id));showToast('Deleted');})}><Ico n="trash"/></button>
                  </div></td>
                </tr>
              ))}
            </React.Fragment>);
          })}</tbody>
        </table><Pagination total={sortedGroups.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  // Sales Quote Form
  function SalesQuoteForm({quote:init,onSave,onCancel}){
    const[q,setQ]=useState(init);
    const[items,setItems]=useState(init.items||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:'',invoicedQty:0}]);
    const[columnSettings,setColumnSettings]=useState({brand:false,model:false,category:false});
    const[priceWarnings,setPriceWarnings]=useState({});
    const[poolTip,setPoolTip]=useState(null);
    const[collapsed,setCollapsed]=useState({details:false,billTo:false,shipTo:false,items:false,notes:false});
    
    const toggleSection=(section)=>setCollapsed(prev=>({...prev,[section]:!prev[section]}));
    const set=(p,v)=>setQ(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const fileRef=useRef();
    const savedQ={...q,items};
    const isLocked=q.locked;
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify({...q,items})!==_initStr.current;
    const _handleCancel=()=>{if(!isLocked&&_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    
    // Check Product Pool for price history (fuzzy: normalization + token overlap)
    const _norm=s=>s.toLowerCase().replace(/[\-\(\)\[\],\.\/\\:;'"]/g,' ').replace(/\s+/g,' ').trim();
    const checkPriceHistory=(itemId,description)=>{
      if(!description||description.trim()===''){
        setPriceWarnings(prev=>{const n={...prev};delete n[itemId];return n;});
        return;
      }
      const descNorm=_norm(description);
      const matches=poolItems.filter(p=>{
        if(!p.name||p.quoteId===q.id)return false;
        const pNorm=_norm(p.name);
        if(pNorm===descNorm)return true;
        const t1=descNorm.split(' ').filter(Boolean);
        const t2=pNorm.split(' ').filter(Boolean);
        const shorter=t1.length<=t2.length?t1:t2;
        const longer=t1.length>t2.length?t1:t2;
        return shorter.length>0&&shorter.filter(t=>longer.includes(t)).length/shorter.length>=0.6;
      }).slice(0,3);
      if(matches.length>0){
        setPriceWarnings(prev=>({...prev,[itemId]:matches.map(m=>({price:m.price,quoteNum:m.quoteNum,date:m.date,matchedName:m.name}))}));
      }else{
        setPriceWarnings(prev=>{const n={...prev};delete n[itemId];return n;});
      }
    };
    
    // Excel/CSV Import Handler
    const handleFileImport=(e)=>{
      const file=e.target.files[0];
      console.log('1. File selected:', file?.name);
      if(!file)return;
      
      const reader=new FileReader();
      reader.onload=(evt)=>{
        console.log('2. File loaded');
        try{
          let rows=[];
          
          // Parse file based on type
          if(file.name.toLowerCase().endsWith('.csv')){
            console.log('3. Parsing CSV');
            const text=evt.target.result;
            rows=text.split('\n').map(line=>line.split(',').map(cell=>cell.trim())).filter(r=>r.length>0);
          }else{
            console.log('3. Parsing Excel');
            const wb=XLSX.read(evt.target.result,{type:'binary'});
            const ws=wb.Sheets[wb.SheetNames[0]];
            rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          }
          
          console.log('4. Rows parsed:', rows.length, rows);
          
          if(!rows||rows.length===0){
            alert('No data found in file');
            return;
          }
          
          // Skip header if detected
          let startRow=0;
          if(rows[0]&&rows[0].length>=2){
            const firstCell=String(rows[0][0]||'').toLowerCase();
            const secondCell=String(rows[0][1]||'').toLowerCase();
            if(firstCell.includes('item')||firstCell.includes('code')||
               secondCell.includes('desc')||secondCell.includes('name')){
              startRow=1;
              console.log('5. Header detected, starting from row 1');
            }
          }
          
          // Map rows to items
          const imported=[];
          for(let i=startRow;i<rows.length;i++){
            const row=rows[i];
            if(!row||row.length<2)continue;
            
            const item=String(row[0]||'').trim();
            const desc=String(row[1]||'').trim();
            
            if(!item&&!desc)continue;
            
            imported.push({
              id:uid(),
              item:item,
              desc:desc,
              qty:row[2]?String(row[2]).trim():'1',
              unit:row[3]?String(row[3]).trim():'',
              price:row[4]?String(row[4]).trim():'0',
              brand:'',
              model:'',
              category:'',
              invoicedQty:0
            });
          }
          
          console.log('6. Items created:', imported.length, imported);
          
          if(imported.length===0){
            alert('No valid items found');
            return;
          }
          
          // Clear empty default row and add imported items
          console.log('7. Current items before update:', items);
          const currentItems=items.filter(it=>it.item||it.desc||(it.price&&it.price!=='0'));
          console.log('8. Filtered items:', currentItems);
          const newItems=[...currentItems,...imported];
          console.log('9. Setting new items:', newItems);
          setItems(newItems);
          console.log('10. Items set, showing toast');
          showToast(`✓ ${imported.length} items imported`);
          
        }catch(err){
          console.error('Import error:', err);
          alert('Import error: '+err.message);
        }
      };
      
      reader.onerror=(err)=>{
        console.error('File read error:', err);
        alert('Failed to read file');
      };
      
      if(file.name.toLowerCase().endsWith('.csv')){
        reader.readAsText(file);
      }else{
        reader.readAsBinaryString(file);
      }
      
      e.target.value='';
    };
    
    return(<div className="content"><div className="fw">
      <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>Back</button>
        <div style={{width:'1px',height:'24px',background:'var(--g200)'}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)',letterSpacing:'-.3px'}}>
          {q.id?'Edit Quotation':'New Quotation'} — <span style={{fontFamily:'Inter',fontWeight:700,color:'var(--gm-500)'}}>{q.number}</span>
          {q.rev>0&&<span className="rev-badge" style={{marginLeft:10}}>Revision {q.rev}</span>}
        </h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>{setCur({...savedQ});go('sales_quote_preview','sales_quote_form')}}><Ico n="eye"/>Preview</Btn>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedQ,co,'sales_quote')}><Ico n="dl"/>PDF</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedQ)}>Save Quotation</Btn>
      </div>
      <div className={`fc fc-collapsible ${collapsed.details?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('details')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>Quotation Details</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        <div className="fg g4">
          <Fld label="Quote No"><input value={q.number} readOnly className="fi" style={{fontFamily:'monospace',fontWeight:700}}/></Fld>
          <Fld label="Date"><input type="date" value={q.date||td()} onChange={e=>set('date',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Valid Until"><input type="date" value={q.validUntil||addD(30)} onChange={e=>set('validUntil',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Currency"><select value={q.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi" disabled={isLocked}>{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Project"><select value={q.project||''} onChange={e=>{const projName=e.target.value;const proj=projects.find(p=>p.name===projName);set('project',projName);if(proj)set('projectNumber',proj.number);else set('projectNumber','');}} className="fi" disabled={isLocked}><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.number?(p.number+' - '):''}{p.name}</option>)}</select></Fld>
          <div/>
        </div>
        </div>
      </div>
      <div className={`fc fc-collapsible ${collapsed.billTo?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('billTo')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>Bill To</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        {customers.length>0&&!isLocked&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('client.company',c.company||'');set('client.contact',c.contact||'');set('client.email',c.email||'');set('client.address',c.address||'');set('client.phone',c.phone||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={(q.client&&q.client.company)||''} onChange={e=>set('client.company',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Contact Person"><input value={(q.client&&q.client.contact)||''} onChange={e=>set('client.contact',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={(q.client&&q.client.email)||''} onChange={e=>set('client.email',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Phone"><input value={(q.client&&q.client.phone)||''} onChange={e=>set('client.phone',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Address"><textarea value={(q.client&&q.client.address)||''} onChange={e=>set('client.address',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Reference"><input value={(q.client&&q.client.ref)||''} onChange={e=>set('client.ref',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        </div>
      </div>
      {!q.shipToEnabled&&!isLocked&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>Add Ship To</button>
      </div>}
      {q.shipToEnabled&&<div className={`fc fc-collapsible ${collapsed.shipTo?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('shipTo')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>Ship To</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        {customers.length>0&&!isLocked&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={(q.shipTo&&q.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Contact Person"><input value={(q.shipTo&&q.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={(q.shipTo&&q.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Phone"><input value={(q.shipTo&&q.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Address"><textarea value={(q.shipTo&&q.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
          <Fld label="Reference"><input value={(q.shipTo&&q.shipTo.ref)||''} onChange={e=>set('shipTo.ref',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        {!isLocked&&<div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');set('shipTo.ref','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>Remove Ship To</button>
        </div>}
        </div>
      </div>}
      <div className={`fc fc-collapsible ${collapsed.items?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('items')}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
            <div className="fct" style={{margin:0,padding:0,border:'none'}}>Line Items</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="fc-toggle" onClick={(e)=>{e.stopPropagation();toggleSection('items');}}><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
            </div>
          </div>
        </div>
        <div className="fc-body">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,paddingBottom:10,borderBottom:'1px solid var(--g100)'}}>
          <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--g400)',display:'flex',alignItems:'center',gap:7}}><div style={{width:3,height:12,background:'linear-gradient(180deg,var(--gm-400),var(--gm-500))',borderRadius:2}}/> Configure Items</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {!isLocked&&<div style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'var(--g500)'}}>
              <span style={{fontWeight:600,marginRight:4}}>Columns:</span>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.brand} onChange={e=>setColumnSettings({...columnSettings,brand:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>Brand</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.model} onChange={e=>setColumnSettings({...columnSettings,model:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>Model</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.category} onChange={e=>setColumnSettings({...columnSettings,category:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>Category</span>
              </label>
            </div>}
            {!isLocked&&<div style={{display:'flex',gap:6,alignItems:'center'}}>
              <label style={{cursor:'pointer'}}>
                <Btn v="bgh bsm" onClick={()=>fileRef.current&&fileRef.current.click()}>
                  <Ico n="upload"/>Import Excel/CSV
                </Btn>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileImport}/>
              </label>
            </div>}
          </div>
        </div>
        {items.some(it=>it._inPool)&&<div className="alert-warn" style={{marginBottom:12}}><Ico n="warn" size={14}/><div className="alert-warn-text">Red rows: item exists in project pool (matched by Description only). Previous price shown in tooltip.</div></div>}
        <div className="iw">
          <table className="ie" style={{tableLayout:'auto'}}>
            <thead><tr>
              <th style={{textAlign:'left',width:'12%'}}>Item</th>
              <th style={{textAlign:'left',width:columnSettings.brand||columnSettings.model||columnSettings.category?'20%':'28%'}}>Description</th>
              {columnSettings.brand&&<th style={{textAlign:'left',width:'10%'}}>Brand</th>}
              {columnSettings.model&&<th style={{textAlign:'left',width:'10%'}}>Model</th>}
              {columnSettings.category&&<th style={{textAlign:'left',width:'10%'}}>Category</th>}
              <th style={{textAlign:'right',width:'8%'}}>Qty</th>
              <th style={{textAlign:'left',width:'8%'}}>Unit</th>
              <th style={{textAlign:'right',width:'10%'}}>Unit Price</th>
              <th style={{textAlign:'right',width:'10%'}}>Total</th>
              {!isLocked&&<th style={{width:'4%'}}></th>}
            </tr></thead>
            <tbody>{items.map((it,idx)=>{
              const si=(id,f,v)=>setItems(items.map(i=>i.id===id?{...i,[f]:v}:i));
              const rmL=id=>setItems(items.filter(i=>i.id!==id));
              const applyPrice=(itemId,price)=>{si(itemId,'price',price);};
              // Duplicate check: ONLY by description
              const isDup=items.filter((x,i)=>i!==idx&&x.desc&&it.desc&&x.desc.toLowerCase().trim()===it.desc.toLowerCase().trim()).length>0;
              const warnings=priceWarnings[it.id]||[];
              return(<React.Fragment key={it.id}>
                <tr className={it._inPool||isDup?'row-warn':''}>
                <td title={it._inPool?`Previously used. Prev price: ${it._prevPrice||'N/A'}`:(isDup?'Duplicate item (same description)':'')}><input value={it.item||''} onChange={e=>si(it.id,'item',e.target.value)} placeholder="Item code..." readOnly={isLocked} style={(it._inPool||isDup)?{color:'var(--amber)',fontWeight:600}:{}}/></td>
                <td><input value={it.desc||''} onChange={e=>si(it.id,'desc',e.target.value)} onBlur={e=>checkPriceHistory(it.id,e.target.value)} placeholder="Description..." readOnly={isLocked} style={(it._inPool||isDup)?{color:'var(--amber)',fontWeight:600}:{}}/></td>
                {columnSettings.brand&&<td><input value={it.brand||''} onChange={e=>si(it.id,'brand',e.target.value)} placeholder="Brand..." readOnly={isLocked}/></td>}
                {columnSettings.model&&<td><input value={it.model||''} onChange={e=>si(it.id,'model',e.target.value)} placeholder="Model..." readOnly={isLocked}/></td>}
                {columnSettings.category&&<td><input value={it.category||''} onChange={e=>si(it.id,'category',e.target.value)} placeholder="Category..." readOnly={isLocked}/></td>}
                <td><input type="number" value={it.qty||''} onChange={e=>si(it.id,'qty',e.target.value)} min="0" step=".01" style={{textAlign:'right'}} readOnly={isLocked}/></td>
                <td><input value={it.unit||''} onChange={e=>si(it.id,'unit',e.target.value)} placeholder="pcs" readOnly={isLocked}/></td>
                <td><input type="number" value={it.price||''} onChange={e=>si(it.id,'price',e.target.value)} min="0" step=".01" placeholder="0.00" style={{textAlign:'right'}} readOnly={isLocked}/></td>
                <td className="lt">{CURR[q.currency]||'£'}{fmt(lt(it))}</td>
                {!isLocked&&<td style={{textAlign:'center'}}>{items.length>1&&<button className="dlb" onClick={()=>rmL(it.id)}>×</button>}</td>}
              </tr>
              {warnings.length>0&&<tr><td colSpan={columnSettings.brand||columnSettings.model||columnSettings.category?10:7} style={{padding:0,border:'none'}}><div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:6,padding:'8px 12px',margin:'4px 0 8px 0',fontSize:12}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,color:'#d97706',fontWeight:600}}><svg viewBox="0 0 24 24" style={{width:14,height:14,stroke:'currentColor',fill:'none',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>This item was previously used:</div>{warnings.map((w,i)=>{const showName=w.matchedName&&w.matchedName.toLowerCase().trim()!==(it.desc||'').toLowerCase().trim();return(<div key={i} style={{display:'flex',alignItems:'center',gap:8,marginTop:4,paddingLeft:20}}><span style={{color:'#78716c'}}>•</span><span style={{fontWeight:600,color:'#0f172a'}}>£{fmt(+(w.price||0))}</span><span style={{color:'#78716c'}}>→</span><span style={{fontFamily:'monospace',fontSize:11,color:'#c8902a'}}>{w.quoteNum||'—'}</span><span style={{color:'#78716c',fontSize:11}}>({w.date||'—'})</span>{showName&&<span onMouseEnter={e=>{const r=e.currentTarget.getBoundingClientRect();setPoolTip({text:w.matchedName,x:r.left+r.width/2,y:r.top});}} onMouseLeave={()=>setPoolTip(null)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'#e2e8f0',color:'#64748b',fontSize:10,fontWeight:700,cursor:'default',flexShrink:0}}>ⓘ</span>}{!isLocked&&<button onClick={()=>applyPrice(it.id,w.price)} style={{marginLeft:8,background:'#fbbf24',border:'1px solid #f59e0b',color:'#78350f',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,cursor:'pointer'}}>Use £{fmt(+(w.price||0))}</button>}</div>);})}</div></td></tr>}
              </React.Fragment>);
            })}</tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {!isLocked?<Btn v="bgh bsm" onClick={()=>setItems([...items,{id:uid(),item:'',desc:'',qty:'1',unit:'',price:'',invoicedQty:0}])}><Ico n="plus"/>Add Line</Btn>:<div/>}
          <div className="totbox"><span className="totlbl">Total</span><span className="totamt">{CURR[q.currency]||'£'}{fmt(dt(items))}</span></div>
        </div>
        </div>
      </div>
      <div className={`fc fc-collapsible ${collapsed.notes?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('notes')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>Notes</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        <Fld label="Notes"><textarea value={q.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
        <div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={q.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
              disabled={isLocked}
              style={{cursor:isLocked?'not-allowed':'pointer'}}
            />
            <span style={{color:isLocked?'var(--g400)':'var(--g700)'}}>Add Signature to PDF</span>
          </label>
        </div>
        </div>
      </div>
      {isLocked&&<div className="alert-red" style={{marginBottom:14}}><Ico n="lock" size={14}/> This quotation is locked. To make changes, click "New Revision" from the list.</div>}
      <div style={{position:'sticky',bottom:0,background:'var(--white)',borderTop:'2px solid var(--g200)',padding:'16px 0',marginTop:'20px',display:'flex',justifyContent:'flex-end',gap:10,zIndex:50,boxShadow:'0 -4px 12px rgba(0,0,0,.06)'}}>
        <Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedQ)} disabled={isLocked}>Save Quotation</Btn>
      </div>
      {poolTip&&<div style={{position:'fixed',left:poolTip.x,top:poolTip.y-10,transform:'translateX(-50%) translateY(-100%)',background:'#1e293b',color:'#f1f5f9',padding:'10px 14px',borderRadius:9,maxWidth:420,width:'max-content',fontSize:13,lineHeight:1.6,zIndex:99999,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,.28)',wordBreak:'break-word'}}>≈ {poolTip.text}<div style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',border:'6px solid transparent',borderTopColor:'#1e293b'}}/></div>}
    </div></div>);
  }

  // Sales Invoice Form
  function SalesInvoiceForm({invoice:init,onSave,onCancel}){
    const[inv,setInv]=useState(init);
    const[items,setItems]=useState(init.items||[]);
    const set=(p,v)=>setInv(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const sym=CURR[inv.currency]||'£';
    const savedInv={...inv,items};
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify({...inv,items})!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button>
        <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>New Sales Invoice — <span style={{fontFamily:'Inter',fontWeight:600,color:'var(--gm-500)'}}>{inv.number}</span></h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedInv,co,'invoice')}><Ico n="dl"/>PDF</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedInv)}>Save Invoice</Btn>
      </div>
      {inv.quoteNum&&<div style={{background:'var(--bluel)',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--blue)',display:'flex',alignItems:'center',gap:8}}><Ico n="quote"/>From Quotation: <strong>{inv.quoteNum}</strong></div>}
      <div className="fc"><div className="fct">Invoice Details</div>
        <div className="fg g4">
          <Fld label="Invoice No"><input value={inv.number} readOnly className="fi" style={{fontFamily:'monospace',fontWeight:700}}/></Fld>
          <Fld label="Invoice Date"><input type="date" value={inv.date||td()} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
          <Fld label="Due Date"><input type="date" value={inv.dueDate||td()} onChange={e=>set('dueDate',e.target.value)} className="fi"/></Fld>
          <Fld label="Terms"><select value={inv.terms||'Due on Receipt'} onChange={e=>set('terms',e.target.value)} className="fi">{ITRM.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Currency"><select value={inv.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
          <Fld label="Status"><select value={inv.status||'draft'} onChange={e=>set('status',e.target.value)} className="fi"><option value="draft">Draft</option><option value="sent">Sent</option></select></Fld>
        </div>
      </div>
      <div className="fc"><div className="fct">Bill To</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('client.company',c.company||'');set('client.contact',c.contact||'');set('client.email',c.email||'');set('client.address',c.address||'');set('client.phone',c.phone||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={(inv.client&&inv.client.company)||''} onChange={e=>set('client.company',e.target.value)} className="fi"/></Fld>
          <Fld label="Contact Person"><input value={(inv.client&&inv.client.contact)||''} onChange={e=>set('client.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={(inv.client&&inv.client.email)||''} onChange={e=>set('client.email',e.target.value)} className="fi"/></Fld>
          <Fld label="Phone"><input value={(inv.client&&inv.client.phone)||''} onChange={e=>set('client.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label="Address"><textarea value={(inv.client&&inv.client.address)||''} onChange={e=>set('client.address',e.target.value)} rows={2} className="fi"/></Fld></div>
      </div>
      {!inv.shipToEnabled&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>Add Ship To</button>
      </div>}
      {inv.shipToEnabled&&<div className="fc"><div className="fct">Ship To</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={(inv.shipTo&&inv.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi"/></Fld>
          <Fld label="Contact Person"><input value={(inv.shipTo&&inv.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={(inv.shipTo&&inv.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi"/></Fld>
          <Fld label="Phone"><input value={(inv.shipTo&&inv.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label="Address"><textarea value={(inv.shipTo&&inv.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi"/></Fld></div>
        <div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>Remove Ship To</button>
        </div>
      </div>}
      <div className="fc"><div className="fct">Line Items (from Quotation)</div>
        <div className="iw"><table className="ie">
          <thead><tr><th>Item</th><th>Description</th><th>Available Qty</th><th style={{textAlign:'right'}}>Invoice Qty</th><th>Unit</th><th style={{textAlign:'right'}}>Unit Price</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
          <tbody>{items.map((it,i)=>{
            const setQty=(v)=>setItems(items.map(x=>x.id===it.id?{...x,qty:v}:x));
            const setPrice=(v)=>setItems(items.map(x=>x.id===it.id?{...x,price:v}:x));
            return(<tr key={it.id}>
              <td><input value={it.item||''} readOnly style={{fontWeight:500}}/></td>
              <td><input value={it.desc||''} readOnly/></td>
              <td style={{textAlign:'center',color:'var(--g500)',fontSize:12,paddingLeft:8}}>{it.maxQty}</td>
              <td><input type="number" value={it.qty||''} onChange={e=>setQty(e.target.value)} min="0" max={it.maxQty} step=".01" style={{textAlign:'right',borderColor:+(it.qty||0)>it.maxQty?'var(--red)':'transparent'}}/></td>
              <td><input value={it.unit||''} readOnly/></td>
              <td><input type="number" value={it.price||''} onChange={e=>setPrice(e.target.value)} min="0" step=".01" style={{textAlign:'right'}}/></td>
              <td className="lt">{sym}{fmt(lt(it))}</td>
            </tr>);
          })}</tbody>
        </table></div>
        <div style={{display:'flex',justifyContent:'flex-end'}}>
          <div className="totbox"><span className="totlbl">Total</span><span className="totamt">{sym}{fmt(dt(items))}</span></div>
        </div>
      </div>
      <div className="fc"><div className="fct">Notes</div>
        <Fld label="Notes"><textarea value={inv.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi"/></Fld>
        <div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={inv.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
            />
            <span>Add Signature to PDF</span>
          </label>
        </div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(savedInv)}>Save Invoice</Btn></div>
    </div></div>);
  }

  // Sales Invoices List
  function SalesInvoicesList(){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const[sortConfig,setSortConfig]=useState({key:null,dir:'asc'});
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs));
    const handleSort=(key)=>{
      setSortConfig(prev=>({key,dir:prev.key===key&&prev.dir==='asc'?'desc':'asc'}));
    };
    const filtered=salesInvoices.filter(d=>{
      const company=(d&&d.client&&d.client.company)||'';
      const contact=(d&&d.client&&d.client.contact)||'';
      if(fs.q&&![company,contact,d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    const sorted=[...filtered].sort((a,b)=>{
      if(!sortConfig.key)return b.date.localeCompare(a.date);
      let aVal,bVal;
      if(sortConfig.key==='number')aVal=a.number,bVal=b.number;
      else if(sortConfig.key==='date')aVal=a.date,bVal=b.date;
      else if(sortConfig.key==='customer')aVal=(a&&a.client&&a.client.company)||'',bVal=(b&&b.client&&b.client.company)||'';
      else if(sortConfig.key==='quote')aVal=a.quoteNum||'',bVal=b.quoteNum||'';
      else if(sortConfig.key==='total')aVal=dt(a.items),bVal=dt(b.items);
      else if(sortConfig.key==='status')aVal=a.status,bVal=b.status;
      else return 0;
      if(typeof aVal==='string')return sortConfig.dir==='asc'?aVal.localeCompare(bVal):bVal.localeCompare(aVal);
      return sortConfig.dir==='asc'?aVal-bVal:bVal-aVal;
    });
    return(<div className="content">
      <div className="fbar">
        <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder="Search customer or invoice no..."/></div>
        <select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">All Statuses</option><option value="draft">Draft</option><option value="sent">Sent</option>
        </select>
        <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <div style={{flex:1}}/>
        <Btn v="bex bsm" onClick={()=>exportExcel([['Number','Date','Company','Contact','Total','Status','From Quote'],...filtered.map(d=>[d.number,d.date,(d&&d.client&&d.client.company)||'',(d&&d.client&&d.client.contact)||'',fmt(dt(d.items)),d.status,d.quoteNum||''])],'sales-invoices')}><Ico n="export"/>Export</Btn>
      </div>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="invoice" size={38}/><div className="empty-t">No sales invoices yet</div><div className="empty-s">Approve a quotation and convert it to invoice</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr>
            <th onClick={()=>handleSort('number')} style={{cursor:'pointer',userSelect:'none'}}>Invoice No {sortConfig.key==='number'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('date')} style={{cursor:'pointer',userSelect:'none'}}>Date {sortConfig.key==='date'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('customer')} style={{cursor:'pointer',userSelect:'none'}}>Customer {sortConfig.key==='customer'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('quote')} style={{cursor:'pointer',userSelect:'none'}}>From Quote {sortConfig.key==='quote'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tar" onClick={()=>handleSort('total')} style={{cursor:'pointer',userSelect:'none'}}>Total {sortConfig.key==='total'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tac" onClick={()=>handleSort('status')} style={{cursor:'pointer',userSelect:'none'}}>Status {sortConfig.key==='status'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th></th>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(d=>(
            <tr key={d.id}>
              <td><span style={{fontFamily:'Inter',fontSize:11}}>{d.number}</span></td>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
              <td>
                {(d&&d.client&&d.client.company)?d.client.company:'—'}
              </td>
              <td>{d.quoteNum?<span style={{fontFamily:'Inter',fontSize:11,color:'var(--gm-500)'}}>{d.quoteNum}</span>:'—'}</td>
              <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items))}</td>
              <td className="tac"><Badge s={d.status}/></td>
              <td><div className="aw">
                <button className="ab" title="Preview" onClick={()=>{setCur(d);go('sales_invoice_preview');}}><Ico n="eye"/></button>
                <button className="ab" title="Download PDF" onClick={()=>savePDF(d,co,'invoice')}><Ico n="dl"/></button>
                <button className="ab" title="Edit" onClick={()=>{if(d.status==='sent'){askConfirm('This invoice has been marked as sent. Edit anyway?',()=>{setCur(d);go('sales_invoice_edit');});}else{setCur(d);go('sales_invoice_edit');}}}><Ico n="edit"/></button>
                {d.status==='draft'&&<button className="ab" title="Mark as Sent" onClick={()=>handleMarkInvoiceAsSent(d)}><Ico n="send"/></button>}
                <button className="ab danger" title="Delete" onClick={()=>askConfirm('Delete this invoice?',()=>{sSI(salesInvoices.filter(x=>x.id!==d.id));showToast('Deleted');})}><Ico n="trash"/></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  // Generic list for PQ, PO, RI
  function ProcurementList({type,items,title}){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const[sortConfig,setSortConfig]=useState({key:null,dir:'asc'});
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs));
    const handleSort=(key)=>{
      setSortConfig(prev=>({key,dir:prev.key===key&&prev.dir==='asc'?'desc':'asc'}));
    };
    const isRI=type==='ri',isPQ=type==='pq',isPO=type==='po';
    const filtered=items.filter(d=>{
      if(fs.q&&![d.supplierCompany||'',d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(isRI&&fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    const sorted=[...filtered].sort((a,b)=>{
      if(!sortConfig.key)return b.date.localeCompare(a.date);
      let aVal,bVal;
      if(sortConfig.key==='number')aVal=a.number||'',bVal=b.number||'';
      else if(sortConfig.key==='date')aVal=a.date,bVal=b.date;
      else if(sortConfig.key==='supplier')aVal=a.supplierCompany||'',bVal=b.supplierCompany||'';
      else if(sortConfig.key==='project')aVal=a.project||'',bVal=b.project||'';
      else if(sortConfig.key==='total')aVal=dt(a.items||[]),bVal=dt(b.items||[]);
      else return 0;
      if(typeof aVal==='string')return sortConfig.dir==='asc'?aVal.localeCompare(bVal):bVal.localeCompare(aVal);
      return sortConfig.dir==='asc'?aVal-bVal:bVal-aVal;
    });
    const lbl=isPQ?'Received Quote':isPO?'Purchase Order':'Received Invoice';
    const linkChip=(label,num)=><span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(59,109,17,.09)',color:'#3B6D11',border:'1px solid rgba(59,109,17,.18)'}}>{label} {num}</span>;
    return(<div className="content">
      <div className="fbar">
        <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder="Search supplier or ref..."/></div>
        {isRI&&<select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">All</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option>
        </select>}
        <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <div style={{flex:1}}/>
        <Btn v="bex bsm" onClick={()=>exportExcel([['Number','Date','Supplier','Total',...(isRI?['Status']:[])],...filtered.map(d=>[d.number,d.date,d.supplierCompany,fmt(dt(d.items)),...(isRI?[d.status]:[])])],type)}><Ico n="export"/>Export</Btn>
      </div>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n={isRI?'received':'po'} size={38}/><div className="empty-t">No {lbl.toLowerCase()}s yet</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr>
            <th onClick={()=>handleSort('number')} style={{cursor:'pointer',userSelect:'none'}}>No {sortConfig.key==='number'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('date')} style={{cursor:'pointer',userSelect:'none'}}>Date {sortConfig.key==='date'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('supplier')} style={{cursor:'pointer',userSelect:'none'}}>Supplier {sortConfig.key==='supplier'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th onClick={()=>handleSort('project')} style={{cursor:'pointer',userSelect:'none'}}>Project {sortConfig.key==='project'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tar" onClick={()=>handleSort('total')} style={{cursor:'pointer',userSelect:'none'}}>Total {sortConfig.key==='total'&&(sortConfig.dir==='asc'?'▲':'▼')}</th>
            <th className="tac">{isPQ?'Linked To':'Linked From'}</th>
            {isRI&&<th className="tac">Status</th>}
            <th></th>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(d=>(
            <tr key={d.id}>
              <td><span className="dn">{d.number||'—'}</span></td>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
              <td style={{color:'var(--g800)'}}>{d.supplierCompany||'—'}</td>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.project||'—'}</td>
              <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items||[]))}</td>
              <td className="tac">
                {isPQ&&(d.linkedPO?linkChip('→',d.linkedPO.number):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
                {isPO&&(d.pqNum?linkChip('←',d.pqNum):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
                {isRI&&(d.poNum?linkChip('←',d.poNum):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
              </td>
              {isRI&&<td className="tac"><Badge s={d.status||'unpaid'}/></td>}
              <td><div className="aw">
                <button className="ab" title="Preview" onClick={()=>{setCur(d);go(isPQ?'pq_preview':isPO?'po_preview':'ri_preview');}}><Ico n="eye"/></button>
                <button className="ab" title="Download PDF" onClick={()=>savePDF(d,co,isPO?'po':isRI?'invoice':'quote')}><Ico n="dl"/></button>
                <button className="ab" title="Edit" onClick={()=>{setCur(d);go(isPQ?'pq_form':isPO?'po_form':'ri_form');}}><Ico n="edit"/></button>
                {isPQ&&!d.linkedPO&&<button className="ab" title="Convert to Purchase Order" onClick={()=>handleConvertPQtoPO(d)}><Ico n="convert"/></button>}
                {isPO&&!d.linkedRI&&<button className="ab" title="Create Received Invoice" onClick={()=>handleConvertPOtoRI(d)}><Ico n="invoice"/></button>}
                {isRI&&d.status==='unpaid'&&<button className="ab" title="Mark as Paid" onClick={()=>{sRI(receivedInvoices.map(x=>x.id===d.id?{...x,status:'paid'}:x));showToast('Marked as paid');}}><Ico n="check"/></button>}
                <button className="ab danger" title="Delete" onClick={()=>askConfirm(`Delete this ${lbl.toLowerCase()}?`,()=>{isPQ?sPQ(purchaseQuotes.filter(x=>x.id!==d.id)):isPO?sPO(purchaseOrders.filter(x=>x.id!==d.id)):sRI(receivedInvoices.filter(x=>x.id!==d.id));showToast('Deleted');})}><Ico n="trash"/></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  // Generic Procurement Form (PQ, PO, RI)
  function ProcurementForm({doc:init,docType,onSave,onCancel}){
    const[doc,setDoc]=useState(init);
    const[items,setItems]=useState(init.items||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
    const set=(p,v)=>setDoc(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify({...doc,items})!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    const isPQ=docType==='pq',isPO=docType==='po',isRI=docType==='ri';
    const lbl=isPQ?'Received Quote':isPO?'Purchase Order':'Received Invoice';
    const savedDoc={...doc,items};
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button>
        <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{doc.id?`Edit ${lbl}`:`New ${lbl}`}</h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedDoc,co,isPO?'po':isRI?'invoice':'quote')}><Ico n="dl"/>PDF</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>Save {lbl}</Btn>
      </div>
      {doc.pqNum&&<div style={{background:'var(--teall)',border:'1px solid #a5f3fc',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--teal)'}}>From Purchase Quotation: <strong>{doc.pqNum}</strong></div>}
      {doc.poNum&&<div style={{background:'var(--teall)',border:'1px solid #a5f3fc',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--teal)'}}>From Purchase Order: <strong>{doc.poNum}</strong></div>}
      <div className="fc"><div className="fct">Document Details</div>
        <div className="fg g4">
          <Fld label={isPQ?"Their PQ No":isPO?"PO No":"Their Invoice No"}><input value={doc.number||''} onChange={e=>set('number',e.target.value)} className="fi" readOnly={isPO} style={isPO?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld>
          <Fld label="Date"><input type="date" value={doc.date||td()} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
          <Fld label={isPO?"Delivery Date":"Due Date"}><input type="date" value={doc.dueDate||doc.deliveryDate||addD(30)} onChange={e=>set(isPO?'deliveryDate':'dueDate',e.target.value)} className="fi"/></Fld>
          <Fld label="Currency"><select value={doc.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
        </div>
        <div className="fg g3" style={{marginTop:12}}>
          {isRI&&<Fld label="Terms"><select value={doc.terms||'Due on Receipt'} onChange={e=>set('terms',e.target.value)} className="fi">{ITRM.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>}
          {isRI&&<Fld label="Status"><select value={doc.status||'unpaid'} onChange={e=>set('status',e.target.value)} className="fi"><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></Fld>}
          <Fld label="Project"><select value={doc.project||''} onChange={e=>{const projName=e.target.value;const proj=projects.find(p=>p.name===projName);set('project',projName);if(proj)set('projectNumber',proj.number);else set('projectNumber','');}} className="fi"><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.number?(p.number+' - '):''}{p.name}</option>)}</select></Fld>
          {!isRI&&<div/>}
        </div>
      </div>
      <div className="fc"><div className="fct">Vendor / Supplier</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('supplierCompany',c.company||'');set('supplierContact',c.contact||'');set('supplierEmail',c.email||'');set('supplierPhone',c.phone||'');set('supplierAddress',c.address||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={doc.supplierCompany||''} onChange={e=>set('supplierCompany',e.target.value)} className="fi"/></Fld>
          <Fld label="Contact Person"><input value={doc.supplierContact||''} onChange={e=>set('supplierContact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={doc.supplierEmail||''} onChange={e=>set('supplierEmail',e.target.value)} className="fi"/></Fld>
          <Fld label="Phone"><input value={doc.supplierPhone||''} onChange={e=>set('supplierPhone',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Address"><textarea value={doc.supplierAddress||''} onChange={e=>set('supplierAddress',e.target.value)} rows={2} className="fi"/></Fld>
          <Fld label="Reference"><input value={doc.ref||''} onChange={e=>set('ref',e.target.value)} className="fi"/></Fld>
        </div>
      </div>
      {(isPO||isPQ)&&!doc.shipToEnabled&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>Add Ship To</button>
      </div>}
      {(isPO||isPQ)&&doc.shipToEnabled&&<div className="fc"><div className="fct">Ship To</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">— Quick fill —</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label="Company Name"><input value={(doc.shipTo&&doc.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi"/></Fld>
          <Fld label="Contact Person"><input value={(doc.shipTo&&doc.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Email"><input value={(doc.shipTo&&doc.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi"/></Fld>
          <Fld label="Phone"><input value={(doc.shipTo&&doc.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Address"><textarea value={(doc.shipTo&&doc.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi"/></Fld>
          <Fld label="Reference"><input value={(doc.shipTo&&doc.shipTo.ref)||''} onChange={e=>set('shipTo.ref',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');set('shipTo.ref','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>Remove Ship To</button>
        </div>
      </div>}
      <div className="fc"><div className="fct">Line Items</div>
        <ItemsEditor items={items} setItems={setItems} currency={doc.currency||'GBP'}/>
      </div>
      <div className="fc"><div className="fct">Notes</div>
        <Fld label="Notes"><textarea value={doc.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi"/></Fld>
        {isPO&&<div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={doc.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
            />
            <span>Add Signature to PDF</span>
          </label>
        </div>}
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>Save {lbl}</Btn></div>
    </div></div>);
  }

  // Projects with detail view
  function ProjectsList(){
    const[pg,setPg]=useState(1);const[ps,setPs]=useState(25);
    return(<div className="content">
      {projects.length===0?<div className="tcard"><div className="empty"><Ico n="project" size={38}/><div className="empty-t">No projects yet</div></div></div>:(
        <React.Fragment>
        <div style={{display:'grid',gap:12}}>
          {projects.slice((pg-1)*ps,pg*ps).map(p=>{
            const pInv=salesInvoices.filter(d=>d.project===p.name);
            const pPO=purchaseOrders.filter(d=>d.project===p.name);
            const pExp=expenses.filter(d=>d.project===p.name);
            const revenue=dt(pInv.flatMap(d=>d.items));
            const costs=dt(pPO.flatMap(d=>d.items))+pExp.reduce((s,e)=>s+(+(e.amount||0)),0);
            return(<div key={p.id} className="proj-card">
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                    {p.number&&<span className="dn">{p.number}</span>}
                    <span style={{fontSize:15,fontWeight:700,color:'var(--g900)'}}>{p.name}</span>
                    <Badge s={p.status||'active'}/>
                  </div>
                  {p.client&&<div style={{fontSize:12.5,color:'var(--g500)',marginBottom:8}}>Client: {p.client}</div>}
                  <div style={{display:'flex',gap:16,fontSize:12}}>
                    <span style={{color:'var(--green)',fontWeight:600}}>{pInv.length} invoices · £{fmt(revenue)}</span>
                    <span style={{color:'var(--amber)',fontWeight:600}}>{pPO.length} POs</span>
                    <span style={{color:'var(--purple)',fontWeight:600}}>{pExp.length} expenses</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="ab" onClick={()=>{setCur(p);go('proj_detail');}}>View →</button>
                  <button className="ab" onClick={()=>{setCur(p);go('proj_form');}}><Ico n="edit"/></button>
                  <button className="ab danger" onClick={()=>askConfirm(`Delete "${p.name}"?`,()=>{sProj(projects.filter(x=>x.id!==p.id));showToast('Deleted');})}><Ico n="trash"/></button>
                </div>
              </div>
            </div>);
          })}
        </div>
        <Pagination total={projects.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/>
        </React.Fragment>
      )}
    </div>);
  }

  // Project Detail
  function ProjectDetail({project}){
    const pQ=salesQuotes.filter(d=>d.project===project.name);
    const pI=salesInvoices.filter(d=>d.project===project.name);
    const pPQ=purchaseQuotes.filter(d=>d.project===project.name);
    const pPO=purchaseOrders.filter(d=>d.project===project.name);
    const pRI=receivedInvoices.filter(d=>d.project===project.name);
    const pExp=expenses.filter(d=>d.project===project.name);
    const revenue=dt(pI.flatMap(d=>d.items));
    const poTotal=dt(pPO.flatMap(d=>d.items));
    const expTotal=pExp.reduce((s,e)=>s+(+(e.amount||0)),0);
    return(<div className="content">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <button onClick={()=>go('projects')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Ico n="back"/>Projects</button>
        <h2 style={{fontSize:17,fontWeight:700,color:'var(--g900)'}}>{project.number?`${project.number} — `:''}  {project.name}</h2>
        <Badge s={project.status||'active'}/>
        <div style={{flex:1}}/>
        <button className="ab" onClick={()=>{setCur(project);go('proj_form');}}><Ico n="edit"/>Edit Project</button>
      </div>
      {/* Stats */}
      <div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[{lbl:'Revenue',val:`£${fmt(revenue)}`,sub:`${pI.length} invoices`,cls:'sc-green'},{lbl:'PO Costs',val:`£${fmt(poTotal)}`,sub:`${pPO.length} orders`,cls:'sc-blue'},{lbl:'Expenses',val:`£${fmt(expTotal)}`,sub:`${pExp.length} items`,cls:'sc-purple'},{lbl:'Net',val:`£${fmt(revenue-poTotal-expTotal)}`,sub:'revenue - costs',cls:revenue-poTotal-expTotal>=0?'sc-teal':'sc-red'}].map(s=><div key={s.lbl} className={`stat-card ${s.cls}`}><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div><div className="stat-sub">{s.sub}</div></div>)}
      </div>
      {/* Sections */}
      {[{title:'Sales Quotations',items:pQ,cols:['Quote No','Date','Total','Status'],vals:d=>[d.number,d.date,`£${fmt(dt(d.items))}`,<Badge s={d.status}/>]},
        {title:'Sales Invoices',items:pI,cols:['Invoice No','Date','Total','Status'],vals:d=>[d.number,d.date,`£${fmt(dt(d.items))}`,<Badge s={d.status}/>]},
        {title:'Purchase Orders',items:pPO,cols:['PO No','Date','Supplier','Total','Status'],vals:d=>[d.number,d.date,d.supplier,`£${fmt(dt(d.items))}`,<Badge s={d.status}/>]},
        {title:'Expenses',items:pExp,cols:['Date','Category','Description','Amount'],vals:e=>[e.date,e.category,e.description,`${CURR[e.currency]||'£'}${fmt(+(e.amount||0))}`]},
      ].map(({title,items,cols,vals})=>(
        <div key={title} style={{marginBottom:16}}>
          <div className="tcard-hdr" style={{background:'var(--white)',borderRadius:'var(--r) var(--r) 0 0',border:'1px solid var(--g200)',borderBottom:'none'}}><div className="tcard-hdr-t">{title} ({items.length})</div></div>
          <div className="tcard">
            {items.length===0?<div style={{padding:'16px 18px',color:'var(--g400)',fontSize:13}}>None</div>:
            <table className="dt"><thead><tr>{cols.map(c=><th key={c}>{c}</th>)}</tr></thead>
            <tbody>{items.map((d,i)=><tr key={d.id||i}>{vals(d).map((v,j)=><td key={j} style={{fontWeight:j===0?600:400,color:j===0?'var(--g900)':'var(--g600)'}}>{v}</td>)}</tr>)}</tbody></table>}
          </div>
        </div>
      ))}
    </div>);
  }

  // Project Form
  function ProjectForm({proj:init,onSave,onCancel}){
    const[p,setP]=useState(init);const s=(k,v)=>setP(d=>({...d,[k]:v}));
    const _initStr=useRef(JSON.stringify(init));
    const _isDirty=()=>JSON.stringify(p)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    return(<div className="content"><div className="fw" style={{maxWidth:640}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{p.id?'Edit Project':'New Project'}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(p)}>Save</Btn></div>
      <div className="fc"><div className="fct">Project Details</div>
        <div className="fg g2"><Fld label="Project No"><input value={p.number||''} onChange={e=>s('number',e.target.value)} className="fi" readOnly={!!p.id&&!!p.number} style={p.id?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld><Fld label="Project Name"><input value={p.name||''} onChange={e=>s('name',e.target.value)} className="fi"/></Fld></div>
        <div className="fg g3" style={{marginTop:12}}>
          <Fld label="Client"><select value={p.clientId||''} onChange={e=>{s('clientId',e.target.value);const c=customers.find(x=>x.id===e.target.value);if(c)s('client',c.company||c.contact||'');}} className="fi"><option value="">— Select customer —</option>{customers.map(c=><option key={c.id} value={c.id}>{c.company||c.contact||''}</option>)}</select></Fld>
          <Fld label="Start Date"><input type="date" value={p.startDate||td()} onChange={e=>s('startDate',e.target.value)} className="fi"/></Fld>
          <Fld label="Status"><select value={p.status||'active'} onChange={e=>s('status',e.target.value)} className="fi"><option value="active">Active</option><option value="completed">Completed</option><option value="on-hold">On Hold</option><option value="cancelled">Cancelled</option></select></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Budget"><input type="number" value={p.budget||''} onChange={e=>s('budget',e.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
          <Fld label="Budget Currency"><select value={p.currency||'GBP'} onChange={e=>s('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label="Description"><textarea value={p.desc||''} onChange={e=>s('desc',e.target.value)} rows={2} className="fi"/></Fld></div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(p)}>Save</Btn></div>
    </div></div>);
  }

  // Product Pool
  function ProductPoolView(){
    const[q,setQ]=useState('');
    const[dateFrom,setDateFrom]=useState('');
    const[dateTo,setDateTo]=useState('');
    const[editingItem,setEditingItem]=useState(null);
    const[tempPrice,setTempPrice]=useState('');
    const[sortConfig,setSortConfig]=useState({key:'date',dir:'desc'});
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify({q,dateFrom,dateTo}));

    const handleSort=(key)=>setSortConfig(prev=>({key,dir:prev.key===key&&prev.dir==='asc'?'desc':'asc'}));
    const openPriceModal=(item)=>{setEditingItem(item);setTempPrice(item.purchasePrice||'');};
    const closeModal=()=>{setEditingItem(null);setTempPrice('');};
    const savePurchasePrice=()=>{
      if(editingItem){sPP(editingItem.id,tempPrice);setEditingItem(null);setTempPrice('');showToast('Purchase price saved ✓');}
    };

    const filtered=poolItems.filter(p=>{
      if(q&&![p.name,p.code,p.projectId,p.customer].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))return false;
      if(dateFrom&&p.date<dateFrom)return false;
      if(dateTo&&p.date>dateTo)return false;
      return true;
    });
    const sorted=[...filtered].sort((a,b)=>{
      if(!sortConfig.key)return 0;
      let aVal,bVal;
      if(sortConfig.key==='customer')aVal=a.customer||'',bVal=b.customer||'';
      else if(sortConfig.key==='project')aVal=a.projectId||'',bVal=b.projectId||'';
      else if(sortConfig.key==='code')aVal=a.code||'',bVal=b.code||'';
      else if(sortConfig.key==='name')aVal=a.name||'',bVal=b.name||'';
      else if(sortConfig.key==='qty')aVal=+(a.qty||0),bVal=+(b.qty||0);
      else if(sortConfig.key==='price')aVal=+(a.price||0),bVal=+(b.price||0);
      else if(sortConfig.key==='purchasePrice')aVal=+(a.purchasePrice||0),bVal=+(b.purchasePrice||0);
      else if(sortConfig.key==='quoteNum')aVal=a.quoteNum||'',bVal=b.quoteNum||'';
      else if(sortConfig.key==='date')aVal=a.date||'',bVal=b.date||'';
      else return 0;
      if(typeof aVal==='string')return sortConfig.dir==='asc'?aVal.localeCompare(bVal):bVal.localeCompare(aVal);
      return sortConfig.dir==='asc'?aVal-bVal:bVal-aVal;
    });
    const sh=(k)=>`${sortConfig.key===k?(sortConfig.dir==='asc'?' ▲':' ▼'):''}`;
    return(<div className="content">
      <div className="fbar">
        <div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search item, customer, project..."/></div>
        <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <div style={{flex:1}}/>
        <span style={{fontSize:12,color:'var(--g500)'}}>{filtered.length} items</span>
      </div>
      <div style={{fontSize:11,color:'var(--g400)',fontStyle:'italic',padding:'2px 2px 8px'}}>All items from Sent quotations appear automatically. Amber rows = same item quoted to same customer more than once.</div>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="pool" size={38}/><div className="empty-t">Pool is empty</div><div className="empty-s">Mark quotations as Sent to populate the pool</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr>
            <th onClick={()=>handleSort('code')} style={{cursor:'pointer',userSelect:'none'}}>Code{sh('code')}</th>
            <th onClick={()=>handleSort('name')} style={{cursor:'pointer',userSelect:'none'}}>Description{sh('name')}</th>
            <th className="tar" onClick={()=>handleSort('qty')} style={{cursor:'pointer',userSelect:'none'}}>Qty{sh('qty')}</th>
            <th className="tar" onClick={()=>handleSort('price')} style={{cursor:'pointer',userSelect:'none'}}>Sale Price{sh('price')}</th>
            <th className="tar" onClick={()=>handleSort('purchasePrice')} style={{cursor:'pointer',userSelect:'none'}}>Purchase Price{sh('purchasePrice')}</th>
            <th onClick={()=>handleSort('quoteNum')} style={{cursor:'pointer',userSelect:'none'}}>Quote No{sh('quoteNum')}</th>
            <th onClick={()=>handleSort('date')} style={{cursor:'pointer',userSelect:'none'}}>Date{sh('date')}</th>
            <th onClick={()=>handleSort('project')} style={{cursor:'pointer',userSelect:'none'}}>Project{sh('project')}</th>
            <th onClick={()=>handleSort('customer')} style={{cursor:'pointer',userSelect:'none'}}>Customer{sh('customer')}</th>
            <th></th>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map((p,i)=>{
            const isDup=sorted.some((x,j)=>j!==i&&x.customer===p.customer&&x.name.toLowerCase().trim()===p.name.toLowerCase().trim());
            return(<tr key={p.id} style={isDup?{background:'#fff7ed',borderLeft:'3px solid var(--amber)'}:{}}>
              <td style={{fontFamily:'monospace',fontSize:11,whiteSpace:'nowrap'}}>{p.code||'—'}</td>
              <td style={{maxWidth:'300px',wordBreak:'break-word',whiteSpace:'normal',lineHeight:1.4}}>{p.name||'—'}</td>
              <td className="tar">{p.qty} {p.unit||''}</td>
              <td className="tar" style={{fontWeight:600}}>£{fmt(+(p.price||0))}</td>
              <td className="tar" style={{color:p.purchasePrice?'var(--g900)':'var(--g400)'}}>
                {p.purchasePrice?`£${fmt(+(p.purchasePrice||0))}`:'—'}
              </td>
              <td><span style={{fontFamily:'Inter',fontSize:11,color:'var(--gm-500)'}}>{p.quoteNum||'—'}</span></td>
              <td style={{color:'var(--g500)',fontSize:12,whiteSpace:'nowrap'}}>{p.date||'—'}</td>
              <td style={{color:'var(--g500)',fontSize:12}}>{p.projectId||'—'}</td>
              <td style={{fontWeight:500,color:isDup?'var(--amber)':'var(--g900)'}}>{p.customer||'—'}</td>
              <td><button className="ab" onClick={()=>openPriceModal(p)} title="Set Purchase Price"><Ico n="edit"/></button></td>
            </tr>);
          })}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}

      {editingItem&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={closeModal}>
        <div style={{background:'var(--white)',borderRadius:12,padding:24,width:'90%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>Set Purchase Price</h3>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--g700)',marginBottom:2}}>{editingItem.name}</div>
            <div style={{fontSize:12,color:'var(--g500)'}}>{editingItem.customer||'—'} · {editingItem.quoteNum||'—'} · Sale: £{fmt(+(editingItem.price||0))}</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g700)',marginBottom:6}}>Purchase Price (£)</label>
            <input type="number" value={tempPrice} onChange={e=>setTempPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" autoFocus onKeyDown={e=>{if(e.key==='Enter')savePurchasePrice();if(e.key==='Escape')closeModal();}} style={{width:'100%',padding:'10px 12px',fontSize:14,fontWeight:600,border:'1px solid var(--g300)',borderRadius:8,fontFamily:'inherit'}}/>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={closeModal} style={{padding:'8px 16px',fontSize:13,fontWeight:600,border:'1px solid var(--g300)',borderRadius:7,background:'var(--white)',color:'var(--g700)',cursor:'pointer'}}>Cancel</button>
            <button onClick={savePurchasePrice} style={{padding:'8px 16px',fontSize:13,fontWeight:600,border:'none',borderRadius:7,background:'linear-gradient(135deg,var(--gm-400),var(--gm-500))',color:'var(--white)',cursor:'pointer'}}>Save Price</button>
          </div>
        </div>
      </div>}
    </div>);
  }

  // Expenses
  function ExpensesView(){
    const[fs,setFs]=useState({q:'',cat:'',p:'',dateFrom:'',dateTo:''});
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs));
    const filtered=expenses.filter(e=>{
      if(fs.q&&![e.description,e.supplier].some(x=>(x||'').toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.cat&&e.category!==fs.cat)return false;
      if(fs.p&&e.project!==fs.p)return false;
      if(fs.dateFrom&&e.date<fs.dateFrom)return false;
      if(fs.dateTo&&e.date>fs.dateTo)return false;
      return true;
    });
    const total=filtered.reduce((s,e)=>s+(+(e.amount||0)),0);
    const allCats=[...new Set(expenses.map(e=>e.category).filter(Boolean))];
    return(<div className="content">
      <div className="fbar">
        <div className="fbar-s"><Ico n="search"/><input value={fs.q} onChange={e=>setFs(f=>({...f,q:e.target.value}))} placeholder="Search..."/></div>
        <select value={fs.cat} onChange={e=>setFs(f=>({...f,cat:e.target.value}))}>
          <option value="">All Categories</option>{allCats.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fs.p} onChange={e=>setFs(f=>({...f,p:e.target.value}))}>
          <option value="">All Projects</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        <input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))} placeholder="From" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))} placeholder="To" style={{padding:'6px 10px',border:'1px solid var(--g200)',borderRadius:6,fontSize:12}}/>
        <div style={{flex:1}}/>
        {filtered.length>0&&<span style={{fontSize:12,fontWeight:600,color:'var(--g600)'}}>Total: £{fmt(total)}</span>}
        <Btn v="bex bsm" onClick={()=>exportExcel([['Date','Category','Description','Supplier','Reference','Amount','Currency','Project'],...filtered.map(e=>[e.date,e.category,e.description,e.supplier,e.reference,e.amount,e.currency,e.project])],'expenses')}><Ico n="export"/>Export</Btn>
      </div>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="expense" size={38}/><div className="empty-t">No expenses yet</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Supplier</th><th>Project</th><th className="tar">Amount</th><th></th></tr></thead>
          <tbody>{[...filtered].reverse().slice((pg-1)*ps,pg*ps).map(e=><tr key={e.id}>
            <td style={{color:'var(--g500)',fontSize:12}}>{e.date}</td>
            <td>{e.category?<span style={{background:'var(--purplel)',color:'var(--purple)',padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600}}>{e.category}</span>:'—'}</td>
            <td style={{fontWeight:500,color:'var(--g800)'}}>{e.description||'—'}</td>
            <td style={{color:'var(--g600)'}}>{e.supplier||'—'}</td>
            <td style={{color:'var(--g500)',fontSize:12}}>{e.project||'—'}</td>
            <td className="tar" style={{fontWeight:700}}>{CURR[e.currency]||'£'}{fmt(+(e.amount||0))}</td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{setCur(e);go('exp_form');}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm('Delete this expense?',()=>{sExp(expenses.filter(x=>x.id!==e.id));showToast('Deleted');})}><Ico n="trash"/></button>
            </div></td>
          </tr>)}</tbody>
        </table><Pagination total={filtered.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  function ExpenseForm({exp:init,onSave,onCancel}){
    const[e,setE]=useState(init);const s=(k,v)=>setE(d=>({...d,[k]:v}));
    const _initStr=useRef(JSON.stringify(init));
    const _isDirty=()=>JSON.stringify(e)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    const allCats=expCats.map(c=>typeof c==='string'?{id:c,name:c}:c);
    return(<div className="content"><div className="fw" style={{maxWidth:660}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{e.id?'Edit Expense':'New Expense'}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>onSave(e)}>Save</Btn></div>
      <div className="fc"><div className="fct">Expense Details</div>
        <div className="fg g3"><Fld label="Date"><input type="date" value={e.date||td()} onChange={x=>s('date',x.target.value)} className="fi"/></Fld><Fld label="Amount"><input type="number" value={e.amount||''} onChange={x=>s('amount',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld><Fld label="Currency"><select value={e.currency||'GBP'} onChange={x=>s('currency',x.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld></div>
        <div className="fg g3" style={{marginTop:12}}>
          <Fld label="Category"><select value={e.category||''} onChange={x=>s('category',x.target.value)} className="fi"><option value="">— Select —</option>{allCats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></Fld>
          <Fld label="Description"><input value={e.description||''} onChange={x=>s('description',x.target.value)} className="fi" placeholder="What was this for?"/></Fld>
          <Fld label="Supplier"><input value={e.supplier||''} onChange={x=>s('supplier',x.target.value)} className="fi" placeholder="Paid to..."/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label="Reference"><input value={e.reference||''} onChange={x=>s('reference',x.target.value)} className="fi" placeholder="Receipt No"/></Fld>
          <Fld label="Project"><select value={e.project||''} onChange={x=>s('project',x.target.value)} className="fi"><option value="">— None —</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label="Notes"><textarea value={e.notes||''} onChange={x=>s('notes',x.target.value)} rows={2} className="fi"/></Fld></div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn><Btn v="bp bsm" onClick={()=>onSave(e)}>Save</Btn></div>
    </div></div>);
  }

  function ExpCatsView(){
    const[cats,setCats]=useState(expCats.map(c=>typeof c==='string'?{id:uid(),name:c}:{...c}));
    const[nm,setNm]=useState('');
    const add=()=>{if(!nm.trim())return;setCats(x=>[...x,{id:uid(),name:nm.trim()}]);setNm('');};
    return(<div className="content"><div className="fw" style={{maxWidth:520}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={()=>go('expenses')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>Back</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>Expense Categories</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>{sExpCats(cats);showToast('Saved ✓');go('expenses');}}>Save</Btn></div>
      <div className="fc"><div className="fct">Categories</div>
        <div style={{display:'flex',gap:8,marginBottom:12}}><input value={nm} onChange={e=>setNm(e.target.value)} className="fi" style={{flex:1}} placeholder="New category..." onKeyDown={e=>e.key==='Enter'&&add()}/><Btn v="bp bsm" onClick={add}><Ico n="plus"/>Add</Btn></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>{cats.map(c=><span key={c.id} style={{background:'var(--purplel)',color:'var(--purple)',padding:'4px 11px',borderRadius:12,fontSize:12.5,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>{c.name}<button onClick={(ev)=>{const tid=c.id;setCats(prev=>prev.filter(x=>x.id!==tid));ev.stopPropagation();}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--purple)',fontSize:16,lineHeight:1}}>×</button></span>)}
        </div>
      </div>
    </div></div>);
  }

  function CustomersView(){
    const[q,setQ]=useState('');
    const {pg,ps,setPg,setPs}=usePagination(q);
    const f=[...customers.filter(c=>[c.contact,c.company,c.email].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))].sort((a,b)=>(a.company||a.contact||'').localeCompare(b.company||b.contact||''));
    return(<div className="content">
      <div className="fbar"><div className="fbar-s"><Ico n="search"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search..."/></div><div style={{flex:1}}/></div>
      {f.length===0?<div className="tcard"><div className="empty"><Ico n="customers" size={38}/><div className="empty-t">No customers yet</div></div></div>:(
        <div className="tcard"><table className="dt">
          <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th>Phone</th><th></th></tr></thead>
          <tbody>{f.slice((pg-1)*ps,pg*ps).map(c=><tr key={c.id}>
            <td style={{fontWeight:500}}>{c.company||'—'}</td>
            <td>{c.contact||'—'}</td>
            <td>{c.email?<a href={`mailto:${c.email}`} style={{color:'var(--blue)',textDecoration:'none'}}>{c.email}</a>:'—'}</td>
            <td style={{color:'var(--g600)'}}>{c.phone||'—'}</td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{setCur(c);go('cust_form');}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm(`Delete "${c.company||c.contact}"?`,()=>{sCust(customers.filter(x=>x.id!==c.id));showToast('Deleted');})}><Ico n="trash"/></button>
            </div></td>
          </tr>)}</tbody>
        </table><Pagination total={f.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  function CustomerForm({cust:init,onSave,onCancel}){
    const[c,setC]=useState(init);const s=(k,v)=>setC(d=>({...d,[k]:v}));
    const _initStr=useRef(JSON.stringify(init));
    const _isDirty=()=>JSON.stringify(c)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    return(<div className="content"><div className="fw" style={{maxWidth:600}}>
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

  // Documents View
  function DocumentsView(){
    const[pg,setPg]=useState(1);const[ps,setPs]=useState(25);

    return(<div className="content">

      {documents.length===0&&(
        <div style={{padding:80,textAlign:'center',color:'var(--g400)'}}>
          <div style={{fontSize:48,marginBottom:16}}>📄</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>No documents yet</div>
          <div style={{fontSize:13}}>Upload your first document to get started</div>
        </div>
      )}

      {documents.length>0&&(
        <div className="tcard"><table className="dt">
          <thead><tr>
            <th style={{width:60,textAlign:'center'}}>#</th>
            <th>Document Name</th>
            <th>Category</th>
            <th>Type</th>
            <th>Upload Date</th>
            <th></th>
          </tr></thead>
          <tbody>{documents.slice((pg-1)*ps,pg*ps).map((d,idx)=><tr key={d.id}>
            <td style={{textAlign:'center',color:'var(--g500)',fontSize:13,fontWeight:600}}>{idx+1}</td>
            <td style={{fontWeight:500}}>{d.name}</td>
            <td style={{color:'var(--g700)',fontSize:13}}>{d.category||'—'}</td>
            <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:d.fileType==='application/pdf'?'var(--redl)':'var(--bluel)',color:d.fileType==='application/pdf'?'var(--red)':'var(--blue)'}}>{d.fileType==='application/pdf'?'PDF':'JPG'}</span></td>
            <td style={{color:'var(--g600)',fontSize:12}}>{d.uploadDate}</td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{
                const link=document.createElement('a');
                link.href=d.file;
                link.download=d.name+(d.fileType==='application/pdf'?'.pdf':'.jpg');
                link.click();
              }}><Ico n="dl"/>Download</button>
              <button className="ab" onClick={()=>{setDocToEdit(d);setShowDocForm(true);}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm(`Delete "${d.name}"?`,()=>{sDocs(documents.filter(x=>x.id!==d.id));showToast('Deleted');})}><Ico n="trash"/></button>
            </div></td>
          </tr>)}</tbody>
        </table><Pagination total={documents.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}

      {/* Upload Form Modal */}
      {showDocForm&&docToEdit&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setShowDocForm(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:12,padding:24,width:500,maxWidth:'90vw'}}>
          <div style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{docToEdit.id?'Edit Document':'Upload Document'}</div>
          <DocumentForm doc={docToEdit} onSave={(d)=>{
            const doc={...d,id:d.id||uid(),uploadDate:d.uploadDate||td()};
            sDocs(doc.id&&documents.find(x=>x.id===doc.id)?documents.map(x=>x.id===doc.id?doc:x):[...documents,doc]);
            setShowDocForm(false);
            showToast('Document saved');
          }} onCancel={()=>setShowDocForm(false)}/>
        </div>
      </div>}
    </div>);
  }

  function DocumentForm({doc:init,onSave,onCancel}){
    const[d,setD]=useState(init);
    const s=(k,v)=>setD(x=>({...x,[k]:v}));
    
    const handleFileUpload=(e)=>{
      const f=e.target.files[0];
      if(!f)return;
      if(!f.type.match(/^(application\/pdf|image\/jpeg|image\/jpg)$/)){
        alert('Please select a PDF or JPG file');
        return;
      }
      const r=new FileReader();
      r.onload=()=>{
        s('file',r.result);
        s('fileType',f.type);
      };
      r.readAsDataURL(f);
    };

    return(<div>
      <div style={{marginBottom:12}}><Fld label="Document Name"><input value={d.name||''} onChange={e=>s('name',e.target.value)} className="fi" placeholder="Enter document name..."/></Fld></div>
      <div style={{marginBottom:12}}><Fld label="Category"><input value={d.category||''} onChange={e=>s('category',e.target.value)} className="fi" placeholder="e.g. Legal, Financial, HR..."/></Fld></div>
      <div style={{marginBottom:12}}>
        <Fld label="Upload File (PDF or JPG)">
          <input type="file" accept="application/pdf,image/jpeg,image/jpg" onChange={handleFileUpload} className="fi" style={{padding:'8px'}}/>
        </Fld>
      </div>
      {d.file&&<div style={{marginBottom:12,padding:12,background:'var(--g50)',borderRadius:8,fontSize:12,color:'var(--g600)'}}>✓ File uploaded ({d.fileType==='application/pdf'?'PDF':'JPG'})</div>}
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(d)} disabled={!d.name||!d.file}>Save</Btn>
      </div>
    </div>);
  }

  function UserForm({user:init,onSave,onCancel}){
    const[u,setU]=useState(init);
    const s=(k,v)=>setU(x=>({...x,[k]:v}));
    const _initStr=useRef(JSON.stringify(init));
    const _isDirty=()=>JSON.stringify(u)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty()){askConfirm('You have unsaved changes. Leave without saving?',onCancel);}else onCancel();};
    
    return(<div className="content"><div className="fw">
      <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>Back</button>
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
        <Btn v="bgh bsm" onClick={_handleCancel}>Cancel</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(u)} disabled={!u.username||(u.id?false:!u.password)}>Save User</Btn>
      </div>
    </div></div>);
  }

  function OpsSettings(){
    const[c,setC]=useState(()=>{
      const merged={...DEF_CO,...co};
      if(!merged.banks||merged.banks.length===0){
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
      r.onload=()=>{const data=r.result;setLogo(data);s('logo',data);};
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
      askConfirm('Delete this bank account?',()=>{const banks=(c.banks||[]).filter(b=>b.id!==id);s('banks',banks);});
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
        <button onClick={()=>go('home')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back" size={14}/>Back to Dashboard</button>
        <h2 style={{fontSize:15,fontWeight:700,color:'var(--g900)',marginLeft:10}}>Settings</h2>
        <div style={{flex:1}}/>
        <Btn v="bp bsm" onClick={()=>{const{logo,signature,...coWithoutLogoAndSig}=c;setLogo(logo||'');setSignature(signature||'');setCo(c);LS.set(ns+'co',coWithoutLogoAndSig);showToast('Saved ✓');go('home');}}>Save</Btn>
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
                      <input value={c.sqPfx||'SQ'} onChange={e=>s('sqPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Start Number</div>
                      <input type="number" value={c.sqStart||'1'} onChange={e=>s('sqStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
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
                      <input value={c.siPfx||'SI'} onChange={e=>s('siPfx',e.target.value.toUpperCase())} className="fi" style={{fontSize:13,padding:'6px 10px'}} readOnly={numLocked}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,color:'var(--g500)',marginBottom:4}}>Start Number</div>
                      <input type="number" value={c.siStart||'1'} onChange={e=>s('siStart',e.target.value)} className="fi" style={{fontSize:13,padding:'6px 10px'}} min="1" readOnly={numLocked}/>
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
                  <div style={{fontSize:14,fontWeight:700,color:'var(--g900)'}}>{bank.accountName||'Unnamed Account'}</div>
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
                    <button className="ab danger" onClick={()=>askConfirm(`Delete user "${u.username}"?`,()=>{sUsers(users.filter(x=>x.id!==u.id));showToast('User deleted');})}><Ico n="trash"/></button>
                  </div></td>
                </tr>)}</tbody>
              </table></div>
            )}
          </>)}
          
        </div>
      </div>
    </div>);
  }

  function Dashboard(){
    const ov=salesInvoices.filter(d=>d.status==='overdue');
    const revenue=dt(salesInvoices.filter(d=>d.status==='sent'||d.status==='paid').flatMap(d=>d.items));
    const activePQ=purchaseQuotes.filter(d=>d.status==='draft').length;
    
    const cards=[
      {k:'sales_quotes',ico:'quote',lbl:'Sales Quotes',val:salesQuotes.filter(d=>d.status!=='passive').length,sub:`${salesQuotes.filter(d=>d.status==='approved').length} approved`,color:'#608425',bg:'linear-gradient(135deg, rgba(96,132,37,0.08) 0%, rgba(96,132,37,0.02) 100%)'},
      {k:'sales_invoices',ico:'invoice',lbl:'Sales Invoices',val:salesInvoices.length,sub:`${salesInvoices.filter(d=>d.status==='draft').length} draft`,color:'#4f6f1f',bg:'linear-gradient(135deg, rgba(79,111,31,0.08) 0%, rgba(79,111,31,0.02) 100%)'},
      {k:'purchase_quotes',ico:'po',lbl:'Purchase Quotes',val:purchaseQuotes.length,sub:`${activePQ} active`,color:'#3B6D11',bg:'linear-gradient(135deg, rgba(59,109,17,0.08) 0%, rgba(59,109,17,0.02) 100%)'},
      {k:'purchase_orders',ico:'po',lbl:'Purchase Orders',val:purchaseOrders.length,sub:`${purchaseOrders.filter(d=>d.status==='sent').length} sent`,color:'#a8c070',bg:'linear-gradient(135deg, rgba(168,192,112,0.08) 0%, rgba(168,192,112,0.02) 100%)'},
      {k:'received_invoices',ico:'received',lbl:'Received Invoices',val:receivedInvoices.length,sub:`${receivedInvoices.filter(d=>d.status==='pending').length} pending`,color:'#1a2a0a',bg:'linear-gradient(135deg, rgba(26,42,10,0.08) 0%, rgba(26,42,10,0.02) 100%)'},
      {k:'projects',ico:'project',lbl:'Projects',val:projects.length,sub:`${projects.filter(d=>d.status==='active').length} active`,color:'#608425',bg:'linear-gradient(135deg, rgba(96,132,37,0.08) 0%, rgba(96,132,37,0.02) 100%)'},
      {k:'product_pool',ico:'pool',lbl:'Product Pool',val:poolItems.length,sub:'items',color:'#4f6f1f',bg:'linear-gradient(135deg, rgba(79,111,31,0.08) 0%, rgba(79,111,31,0.02) 100%)'},
      {k:'customers',ico:'customers',lbl:'Customers',val:customers.length,sub:'contacts',color:'#3B6D11',bg:'linear-gradient(135deg, rgba(59,109,17,0.08) 0%, rgba(59,109,17,0.02) 100%)'},
    ];
    
    return(<div className="content">
      <div style={{marginBottom:28}}>
        <div style={{fontSize:22,fontWeight:800,color:'var(--g900)',marginBottom:4,letterSpacing:'-0.5px'}}>Dashboard</div>
        <div style={{fontSize:13,color:'var(--g500)',fontWeight:500}}>Operational Account</div>
      </div>
      
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18,marginBottom:28}}>
        {cards.map(c=>(
          <div 
            key={c.k} 
            onClick={()=>go(c.k)}
            style={{
              background:c.bg,
              border:`1px solid ${c.color}20`,
              borderRadius:12,
              padding:'22px 20px',
              cursor:'pointer',
              transition:'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1),border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              position:'relative',
              overflow:'hidden',
              boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
            }}
            onMouseEnter={(e)=>{
              e.currentTarget.style.transform='translateY(-4px)';
              e.currentTarget.style.boxShadow=`0 8px 24px ${c.color}20`;
              e.currentTarget.style.borderColor=`${c.color}40`;
            }}
            onMouseLeave={(e)=>{
              e.currentTarget.style.transform='translateY(0)';
              e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';
              e.currentTarget.style.borderColor=`${c.color}20`;
            }}
          >
            <div style={{position:'absolute',top:-10,right:-10,width:80,height:80,borderRadius:'50%',background:`${c.color}08`,filter:'blur(20px)'}}/>
            
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16,position:'relative'}}>
              <div style={{
                width:48,
                height:48,
                borderRadius:10,
                background:`${c.color}15`,
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                border:`1px solid ${c.color}20`
              }}>
                <div style={{color:c.color}}>
                  <Ico n={c.ico} size={20}/>
                </div>
              </div>
              <div style={{
                fontSize:32,
                fontWeight:800,
                color:c.color,
                lineHeight:1,
                letterSpacing:'-1px'
              }}>
                {c.val}
              </div>
            </div>
            
            <div style={{position:'relative'}}>
              <div style={{
                fontSize:13,
                fontWeight:600,
                color:'var(--g800)',
                marginBottom:4,
                letterSpacing:'-0.2px'
              }}>
                {c.lbl}
              </div>
              <div style={{
                fontSize:11,
                color:'var(--g500)',
                fontWeight:500,
                display:'inline-block',
                padding:'3px 8px',
                background:'var(--white)',
                borderRadius:6,
                border:'1px solid var(--g200)'
              }}>
                {c.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>);
  }

  const SB=[
    {group:'Sales'},
    {k:'sales_quotes',ico:'quote',lbl:'Sales Quotations',cnt:salesQuotes.filter(d=>d.status!=='passive').length},
    {k:'sales_invoices',ico:'invoice',lbl:'Sales Invoices',cnt:salesInvoices.length},
    {div:true},
    {group:'Procurement'},
    {k:'purchase_quotes',ico:'po',lbl:'Received Quotes',cnt:purchaseQuotes.length},
    {k:'purchase_orders',ico:'po',lbl:'Purchase Orders',cnt:purchaseOrders.length},
    {k:'received_invoices',ico:'received',lbl:'Received Invoices',cnt:receivedInvoices.length},
    {div:true},
    {group:'Project Management'},
    {k:'projects',ico:'project',lbl:'Projects',cnt:projects.length},
    {k:'product_pool',ico:'pool',lbl:'Product Pool',cnt:poolItems.length},
    {k:'expenses',ico:'expense',lbl:'Expenses',cnt:expenses.length},
    {div:true},
    {group:'CRM'},
    {k:'customers',ico:'customers',lbl:'Customers',cnt:customers.length},
    {k:'documents',ico:'file',lbl:'Documents',cnt:documents.length},
  ];

  const titles={home:'Dashboard',sales_quotes:'Sales Quotations',sales_invoices:'Sales Invoices',purchase_quotes:'Received Quotes',purchase_orders:'Purchase Orders',received_invoices:'Received Invoices',projects:'Projects',proj_detail:(cur&&cur.name)||'Project',product_pool:'Product Pool',expenses:'Expenses',customers:'Customers',documents:'Documents',settings:'Settings',exp_cats:'Expense Categories'};

  return(
    <div style={{display:'flex',minHeight:'100vh',width:'100%'}}>
      <div className="sidebar no-print">
        <div className="sb-brand" onClick={()=>go('home')}>
          <img src={getLogo()||LOGO} alt=""/><div style={{marginTop:2}}><div className="sb-brand-sub">Operations</div></div>
        </div>
        <div className="sb-acc-pill">
          <span className="sb-acc-name" style={{color:'var(--gm-600)'}}>Operational</span>
          <button className="sb-acc-switch" onClick={onSwitchAccount}>Switch ↩</button>
        </div>
        <div style={{flex:1,overflow:'auto',padding:'6px 0'}}>
          {SB.map((it,i)=>{
            if(it.group)return <div key={i} className="sb-group">{it.group}</div>;
            if(it.div)return <div key={i} style={{height:1,background:'rgba(255,255,255,.06)',margin:'4px 10px'}}/>;
            return <div key={it.k} className={`sb-item${(view===it.k||view===it.k+'_form'||view===it.k+'_preview')?' active':''}`} onClick={()=>go(it.k)}><Ico n={it.ico} size={13}/><span className="lbl">{it.lbl}</span></div>;
          })}
        </div>
        <div className="sb-footer">
          <button className="sb-footer-btn" onClick={()=>go('settings')}><Ico n="settings" size={13}/><span>Settings</span></button>
        </div>
      </div>
      <div className="main">
        {!['sales_quote_preview','sales_invoice_preview','pq_preview','po_preview','ri_preview','sales_quote_form','sales_invoice_form','pq_form','po_form','ri_form','proj_form','exp_form','cust_form','exp_cats'].includes(view)&&
          <div className="topbar no-print">
            <h1 className="topbar-title">{titles[view]||''}</h1>
            <div style={{flex:1}}/>
            {view==='sales_quotes'&&<Btn v="bp bsm" onClick={()=>{const base=getNextQuoteBase();setCur(mkSalesQuote(base,0));go('sales_quote_form');}}><Ico n="plus"/>New Quotation</Btn>}
            {view==='sales_invoices'&&<Btn v="bp bsm" onClick={()=>{const n=cnt.si;const num=genSINum(n+1);sCnt({...cnt,si:n+1});setCur({id:null,number:num,quoteId:null,quoteNum:null,date:td(),dueDate:td(),terms:'Due on Receipt',currency:'GBP',status:'draft',project:'',client:{company:'',contact:'',email:'',phone:'',address:''},shipToEnabled:false,shipTo:{company:'',contact:'',email:'',phone:'',address:''},items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});go('sales_invoice_form');}}><Ico n="plus"/>New Invoice</Btn>}
            {view==='purchase_quotes'&&<Btn v="bp bsm" onClick={()=>{setCur(mkPurchaseQuote());go('pq_form');}}><Ico n="plus"/>New Received Quote</Btn>}
            {view==='purchase_orders'&&<Btn v="bp bsm" onClick={()=>{setCur(mkPurchaseOrder());go('po_form');}}><Ico n="plus"/>New Purchase Order</Btn>}
            {view==='received_invoices'&&<Btn v="bp bsm" onClick={()=>{setCur(mkReceivedInvoice());go('ri_form');}}><Ico n="plus"/>New Received Invoice</Btn>}
            {view==='projects'&&<Btn v="bp bsm" onClick={()=>{setCur(mkProject());go('proj_form');}}><Ico n="plus"/>New Project</Btn>}
            {view==='product_pool'&&<Btn v="bex bsm" onClick={()=>exportExcel([['Code','Description','Qty','Unit','Sale Price','Purchase Price','Quote No','Date','Project','Customer'],...poolItems.map(p=>[p.code||'',p.name||'',p.qty||'',p.unit||'',p.price||'',p.purchasePrice||'',p.quoteNum||'',p.date||'',p.projectId||'',p.customer||''])],'product-pool')}><Ico n="export"/>Export Excel</Btn>}
            {view==='expenses'&&<div style={{display:'flex',gap:7}}><Btn v="bgh bsm" onClick={()=>go('exp_cats')}><Ico n="tag"/>Categories</Btn><Btn v="bp bsm" onClick={()=>{setCur(mkExpense());go('exp_form');}}><Ico n="plus"/>New Expense</Btn></div>}
            {view==='customers'&&<Btn v="bp bsm" onClick={()=>{setCur({id:null,contact:'',email:'',phone:'',address:'',company:'',notes:''});go('cust_form');}}><Ico n="plus"/>New Customer</Btn>}
            {view==='documents'&&<Btn v="bp bsm" onClick={()=>{setDocToEdit({id:null,name:'',category:'',file:'',fileType:'',uploadDate:td()});setShowDocForm(true);}}><Ico n="plus"/>Upload Document</Btn>}
          </div>
        }
        {view==='home'&&<Dashboard/>}
        {view==='sales_quotes'&&<SalesQuotesList/>}
        {view==='sales_invoices'&&<SalesInvoicesList/>}
        {view==='purchase_quotes'&&<ProcurementList type="pq" items={purchaseQuotes} title="Received Quotes"/>}
        {view==='purchase_orders'&&<ProcurementList type="po" items={purchaseOrders} title="Purchase Orders"/>}
        {view==='received_invoices'&&<ProcurementList type="ri" items={receivedInvoices} title="Received Invoices"/>}
        {view==='projects'&&<ProjectsList/>}
        {view==='proj_detail'&&cur&&<ProjectDetail project={cur}/>}
        {view==='product_pool'&&<ProductPoolView/>}
        {view==='expenses'&&<ExpensesView/>}
        {view==='customers'&&<CustomersView/>}
        {view==='documents'&&<DocumentsView/>}
        {view==='user_form'&&cur&&<UserForm user={cur} onSave={u=>{const usr={...u,id:u.id||uid(),createdAt:u.createdAt||td()};sUsers(u.id&&users.find(x=>x.id===u.id)?users.map(x=>x.id===u.id?usr:x):[...users,usr]);showToast('User saved');go('settings');}} onCancel={()=>go('settings')}/>}
        {view==='settings'&&<OpsSettings/>}
        {/* FORMS */}
        {view==='sales_quote_form'&&cur&&<SalesQuoteForm quote={cur} onSave={handleSaveSQ} onCancel={()=>go('sales_quotes')}/>}
        {view==='sales_invoice_form'&&cur&&<SalesInvoiceForm invoice={cur} onSave={handleSaveSI} onCancel={()=>go('sales_quotes')}/>}
        {view==='sales_invoice_edit'&&cur&&<SalesInvoiceForm invoice={cur} onSave={handleSaveSI} onCancel={()=>go('sales_invoices')}/>}
        {view==='pq_form'&&cur&&<ProcurementForm doc={cur} docType="pq" onSave={handleSavePQ} onCancel={()=>go('purchase_quotes')}/>}
        {view==='po_form'&&cur&&<ProcurementForm doc={cur} docType="po" onSave={handleSavePO} onCancel={()=>go('purchase_orders')}/>}
        {view==='ri_form'&&cur&&<ProcurementForm doc={cur} docType="ri" onSave={handleSaveRI} onCancel={()=>go('received_invoices')}/>}
        {view==='received_invoice_form'&&cur&&<ProcurementForm doc={cur} docType="ri" onSave={handleSaveRIFromPO} onCancel={()=>go('purchase_orders')}/>}
        {view==='proj_form'&&cur&&<ProjectForm proj={cur} onSave={handleSaveProj} onCancel={()=>go('projects')}/>}
        {view==='exp_form'&&cur&&<ExpenseForm exp={cur} onSave={handleSaveExp} onCancel={()=>go('expenses')}/>}
        {view==='exp_cats'&&<ExpCatsView/>}
        {view==='cust_form'&&cur&&<CustomerForm cust={cur} onSave={handleSaveCust} onCancel={()=>go('customers')}/>}
        {/* PREVIEWS */}
        {view==='sales_quote_preview'&&cur&&<Preview doc={cur} co={co} docType="sales_quote" onBack={()=>go(prev)} onEdit={()=>{go('sales_quote_form','sales_quote_preview');}}/>}
        {view==='sales_invoice_preview'&&cur&&<Preview doc={cur} co={co} docType="invoice" onBack={()=>go(prev)}/>}
        {view==='pq_preview'&&cur&&<Preview doc={cur} co={co} docType="quote" onBack={()=>go('purchase_quotes')}/>}
        {view==='po_preview'&&cur&&<Preview doc={cur} co={co} docType="po" onBack={()=>go('purchase_orders')}/>}
        {view==='ri_preview'&&cur&&<Preview doc={cur} co={co} docType="invoice" onBack={()=>go('received_invoices')}/>}
      </div>
      {toast&&<div className="toast">{toast}</div>}
      {confirmDlg&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setConfirmDlg(null)}>
        <div style={{background:'#fff',borderRadius:12,padding:'28px 32px',minWidth:320,maxWidth:440,boxShadow:'0 8px 40px rgba(0,0,0,.18)',display:'flex',flexDirection:'column',gap:20}} onClick={e=>e.stopPropagation()}>
          <p style={{margin:0,fontSize:14.5,lineHeight:1.6,color:'var(--g700)',fontWeight:500}}>{confirmDlg.msg}</p>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={{padding:'7px 20px',borderRadius:7,border:'1.5px solid var(--g200)',background:'#fff',color:'var(--g600)',fontSize:13,fontWeight:500,cursor:'pointer'}} onClick={()=>setConfirmDlg(null)}>Cancel</button>
            <button style={{padding:'7px 20px',borderRadius:7,border:'none',background:'var(--gm-600)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={()=>{confirmDlg.onYes();setConfirmDlg(null);}}>Yes</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
