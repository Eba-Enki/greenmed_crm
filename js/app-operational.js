
// ==========================
// OPERATIONAL MODULE
// ==========================
function AppOperational({session,onPortalSwitch,onLogout,onSessionUpdate,onOpenProfile}){
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
  const[cnt,setCnt]=useState({sq:0,si:0,po:0,prj:0});
  const[confirmDlg,setConfirmDlg]=useState(null);
  useEscape(()=>setConfirmDlg(null),!!confirmDlg);
  const askConfirm=(msg,onYes)=>setConfirmDlg({msg,onYes});
  const[showDocForm,setShowDocForm]=useState(false);const[docToEdit,setDocToEdit]=useState(null);
  // Set by whichever form is currently mounted (see each form's "dirtyCheckRef.current=..." line);
  // reset to null right before render so a non-form view never carries a stale checker over.
  // Uses the global (portal-mounted) confirm dialog, not the local askConfirm modal: askConfirm's
  // state lives in this component, so opening/closing it would re-render AppOperational — and
  // since these forms are nested function declarations, any re-render of AppOperational recreates
  // their identity and remounts them, silently wiping the very changes the user chose to keep.
  // The global dialog's state lives outside this tree entirely, so "stay" truly leaves the form untouched.
  const dirtyCheckRef=useRef(null);
  // OpsSettings keeps its draft here: like the forms above it is a nested function declaration,
  // so any re-render of AppOperational remounts it and would otherwise reset unsaved edits.
  const settingsDraftRef=useRef(null);
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
    const cn=load('cnt');if(cn)setCnt(cn);
    setView('home');setCur(null);
  },[]);

  const[navSeq,setNavSeq]=useState(0);
  const go=(v,from)=>{setPrev(from||view);setView(v);setNavSeq(n=>n+1);};
  const save=(key,setter,data)=>{setter(data);LS.set(ns+key,data)};
  const sSQ=d=>save('sq',setSalesQuotes,d);
  const sSI=d=>save('si',setSalesInvoices,d);
  const sPQ=d=>save('pq',setPurchaseQuotes,d);
  const sPO=d=>save('po',setPurchaseOrders,d);
  const sRI=d=>save('ri',setReceivedInvoices,d);
  const sPP=(id,price)=>{const next={...purchasePrices,[id]:price};setPurchasePrices(next);LS.set(ns+'pp',next);};
  const poolItems=salesQuotes.filter(q=>q.status!=='draft').flatMap(q=>(q.items||[]).filter(it=>it.desc).map(it=>({id:q.id+'_'+(it.id||''),projectId:q.project||'',code:it.item||'',name:it.desc||'',brand:it.brand||'',model:it.model||'',category:it.category||'',qty:it.qty,unit:it.unit||'',price:it.price,purchasePrice:purchasePrices[q.id+'_'+(it.id||'')]||'',quoteNum:q.number,quoteId:q.id,date:q.date,customer:(q.client&&(q.client.company||q.client.contact))||''})));
  const sExp=d=>save('exp',setExpenses,d);
  const sExpCats=d=>save('expcat',setExpCats,d);
  const sProj=d=>save('proj',setProjects,d);
  const sCust=d=>save('cust',setCustomers,d);
  const sDocs=d=>save('docs',setDocuments,d);
  const sCnt=d=>{setCnt(d);LS.set(ns+'cnt',d)};

  // ── DOCUMENT NUMBERS ──
  // PREFIX + 4 digits (SQ0001), using the prefix and start number from Settings → Numbering.
  // The next number follows the highest existing one with that prefix — no counter, so cancelled
  // or deleted drafts never leave gaps. A number that doesn't start with the current prefix was
  // typed by hand and is kept as is.
  const docPfx=k=>(co[k+'Pfx']||'').trim()||DEF_CO[k+'Pfx'];
  const usedDocNums={
    sq:()=>salesQuotes.map(q=>(q.base||q.number||'').replace(/\.R\d+$/,'')),
    si:()=>salesInvoices.map(d=>d.number),
    po:()=>purchaseOrders.map(d=>d.number),
  };
  const docNum=k=>nextDocNum(docPfx(k),co[k+'Start'],usedDocNums[k]());
  const isAutoNum=(k,num)=>!num||num.startsWith(docPfx(k));

  // ── SALES QUOTATION LOGIC ──
  // Each quote group has a base number (SQ0001).
  // revNum=0 → SQ0001, revNum=1 → SQ0001.R01, etc.
  // items carry invoicedQty (tracked per item)
  const assignQuoteNumber=(q)=>{
    // A hand-typed number becomes its own base so the quote list can group its revisions
    if(!isAutoNum('sq',q.number))return q.base?q:{...q,base:q.number};
    // Revisions keep the base of the quote they revise
    if(q.base)return{...q,number:genQuoteNum(q.base,q.rev||0)};
    const base=docNum('sq');
    return{...q,base,number:genQuoteNum(base,q.rev||0)};
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
      // Lines keep their key across revisions so procurement matches still point at them
      items:((fromQuote&&fromQuote.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:'',invoicedQty:0}]).map(i=>({...i,id:uid(),key:fromQuote?sqItemKey(i):undefined,invoicedQty:0})),
      notes:(fromQuote&&fromQuote.notes)||''};
  };

  const handleSaveSQ=q0=>{
    const q=addrCaseDoc(q0);
    const fresh=!q.id;
    const numbered=fresh?assignQuoteNumber(q):q;
    const saved={...numbered,id:numbered.id||uid()};
    sSQ(fresh?[...salesQuotes,saved]:salesQuotes.map(x=>x.id===saved.id?saved:x));
    showToast(tr('Saved ✓'));go('sales_quotes');
  };

  const handleNewRevision=(q)=>{
    // Make current passive
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'passive',locked:false}:x));
    const newQ=mkSalesQuote(q.base,q.rev+1,q);
    setCur(newQ);go('sales_quote_form');
    showToast(tr('New revision created'));
  };

  const handleUnlockQuote=(q)=>{
    if(q.status==='locked'||q.status==='approved'){
      handleNewRevision(q);
    } else {
      sSQ(salesQuotes.map(x=>x.id===q.id?{...x,locked:false,status:'draft'}:x));
      showToast(tr('Quote unlocked'));
    }
  };

  const handleMarkAsSent=(q)=>{
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'sent'}:x));
    showToast(tr('Quote marked as sent'));
  };
  const handleMarkInvoiceAsSent=(inv)=>{
    sSI(salesInvoices.map(x=>x.id===inv.id?{...x,status:'sent'}:x));
    showToast(tr('Invoice marked as sent'));
  };
  const handleApproveQuote=(q)=>{
    sSQ(salesQuotes.map(x=>x.id===q.id?{...x,status:'approved',locked:true}:x));
    showToast(tr('Quote approved & locked'));
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
    const num=docNum('si');
    const remaining=getQuoteRemainingItems(q);
    return{id:null,number:num,quoteId:q.id,quoteNum:q.number,date:td(),dueDate:td(),terms:'Due on Receipt',currency:q.currency||'GBP',bankId:q.bankId||'',status:'draft',project:q.project||'',projectNumber:q.projectNumber||'',client:{...q.client},shipToEnabled:q.shipToEnabled||false,shipTo:q.shipTo?{...q.shipTo}:{company:'',contact:'',email:'',phone:'',address:''},items:remaining.map(it=>({id:uid(),quoteItemId:it.id,item:it.item,desc:it.desc,unit:it.unit,price:it.price,qty:String(it.remainingQty),maxQty:it.remainingQty})),notes:q.notes||''};
  };
  const assignInvoiceNumber=(si)=>{
    return isAutoNum('si',si.number)?{...si,number:docNum('si')}:si;
  };

  const handleSaveSI=si0=>{
    const si=addrCaseDoc(si0);
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
    showToast(tr('Invoice saved'));go('sales_invoices');
  };

  // ── ITEM MATCHING ──
  // Supplier lines are matched by hand to the customer's lines: a received quote / PO / received invoice points at a
  // sales quotation group (sqBase) and each of its lines at one customer line (sqKey). Matches resolve against the
  // group's latest revision; quotation lines keep their key across revisions (older lines use their id).
  const sqItemKey=it=>it.key||it.id;
  const sqBaseOf=q=>q.base||q.number;
  const latestSQ=base=>base?salesQuotes.filter(q=>sqBaseOf(q)===base).reduce((a,q)=>!a||(q.rev||0)>(a.rev||0)?q:a,null):null;
  const sqLineText=it=>it.desc||it.item||'—';
  const sqMatchOptions=base=>{const q=latestSQ(base);return q?(q.items||[]).map((it,i)=>({key:sqItemKey(it),label:`#${i+1} ${sqLineText(it)}`})):[];};
  // "↳ Customer line (SQ0001.R01 #3)" under a supplier line in quick views
  const sqItemNote=doc=>it=>{
    const q=doc.sqBase&&it.sqKey&&latestSQ(doc.sqBase);
    const i=q?(q.items||[]).findIndex(x=>sqItemKey(x)===it.sqKey):-1;
    const parts=[i>=0?`↳ ${sqLineText(q.items[i])} (${q.number} #${i+1})`:null,
      it.srcSupplier?`${tr('Source')}: ${it.srcSupplier}${it.srcDocNo?' · '+it.srcDocNo:''}${+it.srcPrice?' · '+(CURR[srcCur(doc)]||srcCur(doc))+fmt(+it.srcPrice):''}`:null].filter(Boolean);
    return parts.length?parts.join('   '):null;
  };
  // A converted document's lines remember the line they came from (srcId); older ones pair up by position
  const legacyPair=(parent,child)=>!(child.items||[]).some(x=>x.srcId);
  const parentLine=(parent,child,childItem)=>(parent.items||[]).find(x=>x.id===childItem.srcId)||(legacyPair(parent,child)?(parent.items||[])[(child.items||[]).indexOf(childItem)]:null)||null;
  const childLine=(parent,child,parentItem)=>(child.items||[]).find(x=>x.srcId&&x.srcId===parentItem.id)||(legacyPair(parent,child)?(child.items||[])[(parent.items||[]).indexOf(parentItem)]:null)||null;
  // A received quote, its PO and the PO's received invoice are one supply; a match (and, for a group company, the
  // source supplier details) changed on any of them is copied to the others. Works on the given lists and returns
  // them (unchanged arrays when nothing moved).
  const CHAIN_DOC_FIELDS=['sqBase','srcCurrency','fxRate'];
  const CHAIN_LINE_FIELDS=['sqKey','srcSupplier','srcDocNo','srcDocDate','srcPrice'];
  const pickFields=(o,fields)=>fields.reduce((r,f)=>({...r,[f]:o[f]||''}),{});
  const syncMatchChain=(kind,saved,{pq,po,ri})=>{
    const put=(arr,d)=>{const old=arr.find(x=>x.id===d.id);return old&&JSON.stringify(old)===JSON.stringify(d)?arr:arr.map(x=>x.id===d.id?d:x);};
    const down=(parent,child)=>({...child,...pickFields(parent,CHAIN_DOC_FIELDS),items:(child.items||[]).map(x=>{const p=parentLine(parent,child,x);return p?{...x,...pickFields(p,CHAIN_LINE_FIELDS)}:x;})});
    const up=(child,parent)=>({...parent,...pickFields(child,CHAIN_DOC_FIELDS),items:(parent.items||[]).map(x=>{const c=childLine(parent,child,x);return c?{...x,...pickFields(c,CHAIN_LINE_FIELDS)}:x;})});
    let o=kind==='po'?saved:null;
    if(kind==='pq'){const o0=po.find(x=>x.pqId===saved.id);if(o0){o=down(saved,o0);po=put(po,o);}}
    if(kind==='ri'){const o0=po.find(x=>x.id===saved.poId);if(o0){o=up(saved,o0);po=put(po,o);}}
    if(o&&kind!=='pq'&&o.pqId){const q0=pq.find(x=>x.id===o.pqId);if(q0)pq=put(pq,up(o,q0));}
    if(o&&kind!=='ri'){const r0=ri.find(x=>x.poId===o.id);if(r0)ri=put(ri,down(o,r0));}
    return{pq,po,ri};
  };
  const commitProc=next=>{
    if(next.pq!==purchaseQuotes)sPQ(next.pq);
    if(next.po!==purchaseOrders)sPO(next.po);
    if(next.ri!==receivedInvoices)sRI(next.ri);
  };
  const upsert=(arr,d)=>arr.some(x=>x.id===d.id)?arr.map(x=>x.id===d.id?d:x):[...arr,d];

  // ── GROUP COMPANY SUPPLY (e.g. Egefe buys in Turkey and invoices Green Med) ──
  // Documents of a supplier marked as group company also record, per line, the source supplier that sold the item to it
  // (name, invoice no/date, unit price in the source currency) and, on the PO, the shipment to the customer.
  const normName=v=>(v||'').trim().toLowerCase();
  const isGroupDoc=d=>!!d&&customers.some(c=>c.groupCompany&&(c.type==='supplier'||c.type==='both')&&((d.supplierId&&c.id===d.supplierId)||(!!normName(c.company)&&normName(c.company)===normName(d.supplierCompany))));
  // fxRate is how many source-currency units one document-currency unit buys (entered by hand)
  const srcCur=d=>d.srcCurrency||'TRY';
  const srcInDocCur=(d,it)=>{const v=+(it.srcPrice||0);if(!v)return null;if(srcCur(d)===(d.currency||'GBP'))return v;const r=+(d.fxRate||0);return r>0?v/r:null;};
  const SHIP_FIELDS=[['date','Ship Date','date'],['incoterm','Incoterm'],['carrier','Carrier'],['awb','AWB / BL No'],['gcb','Customs Declaration (GÇB) No']];

  // ── PROCUREMENT LOGIC ──
  const mkPurchaseQuote=()=>({id:null,number:'',date:td(),supplier:'',supplierAddress:'',currency:'GBP',project:'',projectNumber:'',sqBase:'',linkedPO:null,items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});
  const mkPurchaseOrder=(pq)=>{
    const num=docNum('po');
    return{id:null,number:num,pqId:(pq&&pq.id)||null,pqNum:(pq&&pq.number)||'',date:td(),deliveryDate:addD(30),supplierCompany:(pq&&pq.supplierCompany)||'',supplierContact:(pq&&pq.supplierContact)||'',supplierEmail:(pq&&pq.supplierEmail)||'',supplierPhone:(pq&&pq.supplierPhone)||'',supplierAddress:(pq&&pq.supplierAddress)||'',currency:(pq&&pq.currency)||'GBP',project:(pq&&pq.project)||'',projectNumber:(pq&&pq.projectNumber)||'',sqBase:(pq&&pq.sqBase)||'',supplierId:(pq&&pq.supplierId)||'',srcCurrency:(pq&&pq.srcCurrency)||'',fxRate:(pq&&pq.fxRate)||'',linkedRI:null,items:((pq&&pq.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]).map(i=>({...i,id:uid(),srcId:pq?i.id:undefined})),notes:''};
  };
  const assignPONumber=(po)=>{
    return isAutoNum('po',po.number)?{...po,number:docNum('po')}:po;
  };
  const mkReceivedInvoice=(po)=>({id:null,number:'',poId:(po&&po.id)||null,poNum:(po&&po.number)||'',date:td(),dueDate:addD(30),terms:'Due on Receipt',supplierCompany:(po&&po.supplierCompany)||'',supplierContact:(po&&po.supplierContact)||'',supplierEmail:(po&&po.supplierEmail)||'',supplierPhone:(po&&po.supplierPhone)||'',supplierAddress:(po&&po.supplierAddress)||'',currency:(po&&po.currency)||'GBP',status:'unpaid',project:(po&&po.project)||'',projectNumber:(po&&po.projectNumber)||'',sqBase:(po&&po.sqBase)||'',supplierId:(po&&po.supplierId)||'',srcCurrency:(po&&po.srcCurrency)||'',fxRate:(po&&po.fxRate)||'',items:((po&&po.items)||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]).map(i=>({...i,id:uid(),srcId:po?i.id:undefined})),notes:''});

  const handleSavePQ=pq0=>{
    const pq=addrCaseDoc(pq0);
    const saved={...pq,id:pq.id||uid()};
    commitProc(syncMatchChain('pq',saved,{pq:upsert(purchaseQuotes,saved),po:purchaseOrders,ri:receivedInvoices}));
    showToast(tr('Saved ✓'));go('purchase_quotes');
  };
  const handleConvertPQtoPO=(pq)=>{
    const po=mkPurchaseOrder(pq);
    const numbered=assignPONumber(po);
    const newPO={...numbered,id:uid()};
    sPO([...purchaseOrders,newPO]);
    sPQ(purchaseQuotes.map(x=>x.id===pq.id?{...x,linkedPO:{id:newPO.id,number:newPO.number}}:x));
    showToast(tr('Converted to PO'));go('purchase_orders');
  };
  const handleSavePO=po0=>{
    const po=addrCaseDoc(po0);
    const fresh=!po.id;
    const numbered=fresh?assignPONumber(po):po;
    const saved={...numbered,id:numbered.id||uid()};
    commitProc(syncMatchChain('po',saved,{pq:purchaseQuotes,po:upsert(purchaseOrders,saved),ri:receivedInvoices}));
    showToast(tr('Saved ✓'));go('purchase_orders');
  };
  const handleConvertPOtoRI=(po)=>{
    const ri=mkReceivedInvoice(po);
    setCur({...ri,_pendingPOId:po.id});
    go('received_invoice_form');
  };
  const handleSaveRIFromPO=ri0=>{
    const ri=addrCaseDoc(ri0);
    const saved={...ri,id:ri.id||uid()};
    const pendingPOId=ri._pendingPOId;
    const {_pendingPOId:_,...cleanRI}=saved;
    const po=pendingPOId?purchaseOrders.map(x=>x.id===pendingPOId?{...x,linkedRI:{id:cleanRI.id,number:cleanRI.number}}:x):purchaseOrders;
    commitProc(syncMatchChain('ri',cleanRI,{pq:purchaseQuotes,po,ri:upsert(receivedInvoices,cleanRI)}));
    showToast(tr('Saved ✓'));go('received_invoices');
  };
  const handleSaveRI=ri0=>{
    const ri=addrCaseDoc(ri0);
    const saved={...ri,id:ri.id||uid()};
    commitProc(syncMatchChain('ri',saved,{pq:purchaseQuotes,po:purchaseOrders,ri:upsert(receivedInvoices,saved)}));
    showToast(tr('Saved ✓'));go('received_invoices');
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
    showToast(tr('Saved ✓'));go('projects');
  };

  // ── CASCADE DELETE HELPERS ──
  const deleteSQ=(id)=>{
    sSQ(salesQuotes.filter(x=>x.id!==id));
    sSI(salesInvoices.map(si=>si.quoteId===id?{...si,quoteId:null,quoteNum:''}:si));
  };
  const deletePQ=(id)=>{
    sPQ(purchaseQuotes.filter(x=>x.id!==id));
    sPO(purchaseOrders.map(p=>p.pqId===id?{...p,pqId:null,pqNum:''}:p));
  };
  const deletePO=(id)=>{
    const po=purchaseOrders.find(x=>x.id===id);
    sPO(purchaseOrders.filter(x=>x.id!==id));
    sRI(receivedInvoices.map(r=>r.poId===id?{...r,poId:null,poNum:''}:r));
    if(po&&po.pqId)sPQ(purchaseQuotes.map(q=>q.id===po.pqId?{...q,linkedPO:null}:q));
  };
  const deleteRI=(id)=>{
    const ri=receivedInvoices.find(x=>x.id===id);
    sRI(receivedInvoices.filter(x=>x.id!==id));
    if(ri&&ri.poId)sPO(purchaseOrders.map(p=>p.id===ri.poId?{...p,linkedRI:null}:p));
  };

  // ── EXPENSE ──
  const mkExpense=()=>({id:null,date:td(),category:'',description:'',amount:'',currency:'GBP',reference:'',project:'',employee:'',notes:''});
  const saveExpense=e=>{const fresh=!e.id;const saved=fresh?{...e,id:uid()}:e;sExp(fresh?[...expenses,saved]:expenses.map(x=>x.id===saved.id?saved:x));};
  const handleSaveExp=e=>{saveExpense(e);showToast(tr('Saved ✓'));go('expenses');};
  const handleSaveExpAndNew=e=>{saveExpense(e);showToast(tr('Saved ✓ — ready for the next one'));};

  // ── CUSTOMER ──
  const handleSaveCust=c=>{const fresh=!c.id;const saved=fresh?{...c,id:uid()}:c;sCust(fresh?[...customers,saved]:customers.map(x=>x.id===saved.id?saved:x));showToast(tr('Saved ✓'));go('customers');};

  // ── VIEWS ──

  // Sales Quotes List
  function SalesQuotesList(){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const{sort,onSort}=useSort();
    const[expandedGroups,setExpandedGroups]=useState(new Set());
    const[quickView,setQuickView]=useState(null);
    const[remTip,setRemTip]=useState(null);
    const hasFilter=fs.q||fs.s||fs.dateFrom||fs.dateTo;
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs)+JSON.stringify(sort));
    const toggleGroup=(base)=>{setExpandedGroups(prev=>{const next=new Set(prev);if(next.has(base))next.delete(base);else next.add(base);return next;});};
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
    const qCols={date:q=>q.date,no:q=>q.number,project:q=>q.project,customer:q=>q.client&&q.client.company,total:q=>dt(q.items||[]),status:q=>q.status};
    const flatFiltered=sortRows(salesQuotes.filter(matchesFilter),sort,qCols);
    // Each revision group sorts by its latest revision
    const sortedGroups=sortRows(filteredGroups,sort,Object.fromEntries(Object.entries(qCols).map(([k,f])=>[k,g=>f(g.latest)])));
    const isExpanded=(base)=>hasFilter||expandedGroups.has(base);
    // Bulk actions work on each selected group's latest revision — the row the list shows
    const bulk=useBulkSelect(sortedGroups.map(g=>g.latest.id));
    const picked=sortedGroups.filter(g=>bulk.has(g.latest.id)).map(g=>g.latest);
    const pickedDrafts=picked.filter(q=>q.status==='draft');
    const[zipBusy,setZipBusy]=useState(false);
    const bulkMarkSent=()=>{
      const ids=new Set(pickedDrafts.map(q=>q.id));
      sSQ(salesQuotes.map(x=>ids.has(x.id)?{...x,status:'sent'}:x));
      const skipped=picked.length-ids.size;
      showToast(tr('{0} marked as sent',ids.size)+(skipped?' · '+tr('{0} skipped (not a draft)',skipped):''));
      bulk.clear();
    };
    const bulkDelete=()=>{
      const ids=new Set(pickedDrafts.map(q=>q.id));
      const kept=picked.length-ids.size;
      askGlobalConfirm(tr('Delete {0} draft quotations?',ids.size)+(kept?' '+tr('{0} selected quotations are not drafts and will be kept.',kept):''),{confirmLabel:tr('Delete'),cancelLabel:tr('Cancel')}).then(ok=>{
        if(!ok)return;
        sSQ(salesQuotes.filter(x=>!ids.has(x.id)));
        sSI(salesInvoices.map(si=>ids.has(si.quoteId)?{...si,quoteId:null,quoteNum:''}:si));
        showToast(tr('{0} deleted',ids.size));
        bulk.clear();
      });
    };
    const bulkPDF=async()=>{
      setZipBusy(true);
      const done=await downloadPDFZip(picked,co,'sales_quote',FULL_BANK,'sales-quotations',(i,n)=>showToast(tr('Preparing PDFs… {0}/{1}',i,n)));
      setZipBusy(false);
      if(done){showToast(tr('{0} PDFs downloaded',picked.length));bulk.clear();}
    };
    return(<div className="content">
      <ListTools q={fs.q} onQ={v=>setFs(f=>({...f,q:v}))} placeholder={tr("Search customer, quote no...")} active={[fs.s,fs.dateFrom,fs.dateTo].filter(Boolean).length} onClear={()=>setFs(f=>({...f,s:'',dateFrom:'',dateTo:''}))} onExport={()=>exportExcel([['Date','Number','Company','Contact','Total','Status','Project'],...flatFiltered.map(q=>[q.date,q.number,(q.client&&q.client.company)||'',(q.client&&q.client.contact)||'',fmt(dt(q.items)),q.status,q.project||''])],'sales-quotations')}>
        <FilterField label={tr("Status")}><select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">{tr("All Statuses")}</option>
          {['draft','sent','approved','locked','passive','closed'].map(s=><option key={s} value={s}>{(SM[s]&&SM[s].l)||s}</option>)}
        </select></FilterField>
        <FilterField label={tr("From")}><input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))}/></FilterField>
        <FilterField label={tr("To")}><input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))}/></FilterField>
      </ListTools>
      <BulkBar bulk={bulk}>
        <BulkBtn icon="send" disabled={!pickedDrafts.length} onClick={bulkMarkSent}>{tr("Mark as Sent")}{pickedDrafts.length?` (${pickedDrafts.length})`:''}</BulkBtn>
        <BulkBtn icon="export" onClick={()=>exportExcel([['Date','Number','Company','Contact','Total','Status','Project'],...picked.map(q=>[q.date,q.number,(q.client&&q.client.company)||'',(q.client&&q.client.contact)||'',fmt(dt(q.items)),q.status,q.project||''])],'sales-quotations')}>{tr("Export selected")}</BulkBtn>
        <BulkBtn icon="dl" disabled={zipBusy} onClick={bulkPDF}>{zipBusy?tr('Preparing…'):tr('Download PDFs')}</BulkBtn>
        <BulkBtn icon="trash" danger disabled={!pickedDrafts.length} onClick={bulkDelete}>{tr("Delete drafts")}{pickedDrafts.length?` (${pickedDrafts.length})`:''}</BulkBtn>
      </BulkBar>
      {sortedGroups.length===0?<div className="tcard"><div className="empty"><Ico n="quote" size={38}/><div className="empty-t">{tr("No quotations yet")}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={[0.32,0.8,1,1,2,0.9,1.3,0.9]}/>
          <thead><tr>
            <SelTh bulk={bulk}/>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={sort} onSort={onSort}>{tr("Quote No")}</SortTh>
            <SortTh k="project" sort={sort} onSort={onSort}>{tr("Project")}</SortTh>
            <SortTh k="customer" sort={sort} onSort={onSort}>{tr("Customer")}</SortTh>
            <SortTh k="total" sort={sort} onSort={onSort} className="tar">{tr("Total")}</SortTh>
            <th className="tac">{tr("Actions")}</th>
            <SortTh k="status" sort={sort} onSort={onSort} className="tac">{tr("Status")}</SortTh>
          </tr></thead>
          <tbody>{sortedGroups.slice((pg-1)*ps,pg*ps).map(({base,revs,latest})=>{
            const history=revs.slice(1);
            const hasHistory=history.length>0;
            const expanded=isExpanded(base);
            const remaining=getQuoteRemainingItems(latest);
            const remAmt=dt(remaining.map(i=>({...i,qty:i.remainingQty})));
            return(<React.Fragment key={base}>
              <tr className={bulk.has(latest.id)?'is-sel':''} style={{fontStyle:latest.status==='passive'?'italic':'normal',cursor:'pointer'}} onClick={()=>setQuickView(latest)}>
                <SelTd bulk={bulk} id={latest.id}/>
                <td style={{color:'var(--g500)',fontSize:12}}>{latest.date}</td>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    {hasHistory
                      ?<button onClick={e=>{e.stopPropagation();toggleGroup(base);}} style={{background:'none',border:'none',cursor:'pointer',padding:'2px',color:'var(--g400)',display:'flex',alignItems:'center',flexShrink:0}}>
                          <svg style={{width:12,height:12,transition:'transform .15s',transform:expanded?'rotate(90deg)':'rotate(0deg)',stroke:'currentColor',fill:'none',strokeWidth:2}} viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      :<span style={{width:16,flexShrink:0}}/>
                    }
                    <span style={{fontFamily:'Inter',fontSize:11}}>{latest.number}</span>
                    {latest.locked&&<span className="locked-badge" title={tr("Locked")}><Ico n="lock" size={10}/></span>}
                    {hasHistory&&<span style={{fontSize:10,color:'var(--g400)',background:'var(--g100)',padding:'1px 6px',borderRadius:8,flexShrink:0}}>{tr("{0} rev", history.length)}</span>}
                  </div>
                </td>
                <td style={{color:'var(--g500)',fontSize:12}}>{latest.project||'—'}</td>
                <td>{(latest.client&&latest.client.company)?latest.client.company:'—'}</td>
                <td className="tar">
                  <div style={{display:'flex',alignItems:'center'}}>
                    <span style={{width:18,display:'inline-flex',flexShrink:0}}>
                      {latest.status==='approved'&&remaining.length>0&&
                        <span
                          onMouseEnter={e=>{const r=e.currentTarget.getBoundingClientRect();setRemTip({text:`Remaining to invoice: £${fmt(remAmt)}`,x:r.left+r.width/2,y:r.top});}}
                          onMouseLeave={()=>setRemTip(null)}
                          style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:15,height:15,borderRadius:'50%',background:'var(--amberl)',color:'var(--amber)',fontSize:10,fontWeight:700,fontStyle:'italic',cursor:'default'}}
                        >i</span>
                      }
                    </span>
                    <span style={{flex:1,textAlign:'right'}}>{CURR[latest.currency]||'£'}{fmt(dt(latest.items))}</span>
                  </div>
                </td>
                <td className="tac">
                  {latest.status==='draft'&&<ActBtn label={tr("Mark as Sent")} onClick={()=>handleMarkAsSent(latest)} due={tr('Draft — not sent yet')}/>}
                  {latest.status==='sent'&&<ActBtn label={tr("Approve")} onClick={()=>handleApproveQuote(latest)} due={isStale(latest)?tr('Waiting for a reply for over 14 days'):''}/>}
                  {latest.status==='approved'&&remaining.length>0&&<ActBtn label={tr("Create Invoice")} onClick={()=>{setCur(mkSalesInvoice(latest));go('sales_invoice_form');}} due={tr('Approved — not invoiced yet')}/>}
                </td>
                <td className="tac"><Badge s={latest.status}/></td>
              </tr>
              {expanded&&history.map(q=>(
                <tr key={q.id} style={{background:'var(--g50)',fontStyle:'italic',cursor:'pointer'}} onClick={()=>setQuickView(q)}>
                  <td></td>
                  <td style={{fontSize:12}}>{q.date}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:5,paddingLeft:22}}>
                      <span style={{color:'var(--g300)',fontSize:13,lineHeight:1}}>└</span>
                      <span style={{fontFamily:'Inter',fontSize:11}}>{q.number}</span>
                    </div>
                  </td>
                  <td style={{fontSize:12}}>{q.project||'—'}</td>
                  <td style={{fontSize:12}}>{(q.client&&q.client.company)||'—'}</td>
                  <td className="tar" style={{fontSize:12}}>{CURR[q.currency]||'£'}{fmt(dt(q.items))}</td>
                  <td></td>
                  <td className="tac"><Badge s={q.status}/></td>
                </tr>
              ))}
            </React.Fragment>);
          })}</tbody>
        </table><Pagination total={sortedGroups.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
      {quickView&&(()=>{
        const remaining=getQuoteRemainingItems(quickView);
        const extraActions=[];
        if(quickView.status==='sent')extraActions.push({label:tr('Approve'),onClick:()=>{handleApproveQuote(quickView);setQuickView(null);}});
        if(['sent','approved','locked'].includes(quickView.status))extraActions.push({label:tr('Revise'),onClick:()=>{setQuickView(null);handleNewRevision(quickView);}});
        if(quickView.status==='approved'&&remaining.length>0)extraActions.push({label:tr('Create Invoice'),onClick:()=>{setQuickView(null);setCur(mkSalesInvoice(quickView));go('sales_invoice_form');}});
        return(<DocQuickModal doc={quickView} co={co} docType="sales_quote" pdfOpts={FULL_BANK} onClose={()=>setQuickView(null)}
          onEdit={quickView.status==='draft'?()=>{setQuickView(null);setCur(quickView);go('sales_quote_form');}:null}
          onDelete={()=>askConfirm(tr('Delete this quotation?'),()=>{deleteSQ(quickView.id);showToast(tr('Deleted'));setQuickView(null);})}
          extraActions={extraActions}/>);
      })()}
      {remTip&&<div style={{position:'fixed',left:remTip.x,top:remTip.y-10,transform:'translateX(-50%) translateY(-100%)',background:'#1e293b',color:'#f1f5f9',padding:'8px 12px',borderRadius:9,maxWidth:280,width:'max-content',fontSize:12.5,lineHeight:1.5,zIndex:99999,pointerEvents:'none',boxShadow:'0 8px 24px rgba(0,0,0,.28)',wordBreak:'break-word'}}>{remTip.text}<div style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',border:'6px solid transparent',borderTopColor:'#1e293b'}}/></div>}
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
    // Local toast (not the shared app-level one): the shared showToast lives in AppOperational,
    // so calling it here would re-render AppOperational and remount this form with a fresh
    // function identity — silently discarding the items/columnSettings just set below.
    const[importMsg,showImportMsg]=useToast();
    
    const toggleSection=(section)=>setCollapsed(prev=>({...prev,[section]:!prev[section]}));
    const set=(p,v)=>setQ(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const fileRef=useRef();
    const savedQ={...q,items};
    const isLocked=q.locked;
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify({...q,items})!==_initStr.current;
    const _handleCancel=()=>{if(!isLocked&&_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=()=>!isLocked&&_isDirty();
    
    // Check Product Pool for price history (fuzzy: normalization + token overlap)
    const _norm=s=>s.toLowerCase().replace(/[\-\(\)\[\],\.\/\\:;'"]/g,' ').replace(/\s+/g,' ').trim();
    const findPoolMatches=(description)=>{
      if(!description||description.trim()==='')return[];
      const descNorm=_norm(description);
      return poolItems.filter(p=>{
        if(!p.name||p.quoteId===q.id)return false;
        const pNorm=_norm(p.name);
        if(pNorm===descNorm)return true;
        const t1=descNorm.split(' ').filter(Boolean);
        const t2=pNorm.split(' ').filter(Boolean);
        const shorter=t1.length<=t2.length?t1:t2;
        const longer=t1.length>t2.length?t1:t2;
        return shorter.length>0&&shorter.filter(t=>longer.includes(t)).length/shorter.length>=0.6;
      }).slice(0,3).map(m=>({price:m.price,quoteNum:m.quoteNum,date:m.date,matchedName:m.name}));
    };
    const checkPriceHistory=(itemId,description)=>{
      const matches=findPoolMatches(description);
      if(matches.length>0)setPriceWarnings(prev=>({...prev,[itemId]:matches}));
      else setPriceWarnings(prev=>{const n={...prev};delete n[itemId];return n;});
    };
    
    // Excel/CSV Import Handler
    const handleFileImport=(e)=>{
      const file=e.target.files[0];
      if(!file)return;
      const isCSV=file.name.toLowerCase().endsWith('.csv');

      const reader=new FileReader();
      reader.onload=(evt)=>{
        try{
          const wb=XLSX.read(evt.target.result,{type:isCSV?'string':'binary'});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});

          if(!rows||rows.length===0){
            alert(tr('No data found in file'));
            return;
          }

          // Map columns by header name (order-independent) instead of fixed position,
          // so the sheet can freely include/omit Brand, Model, Category, Total, etc.
          const headerMap=rows[0].map(h=>IMPORT_HEADER_ALIASES(h));
          if(!headerMap.includes('desc')){
            alert(tr('Could not find a "Description" column in the first row. Use "Download Template" to get the expected headers.'));
            return;
          }

          const imported=[];
          let anyBrand=false,anyModel=false,anyCategory=false;
          for(let i=1;i<rows.length;i++){
            const row=rows[i];
            if(!row||row.every(c=>String(c||'').trim()===''))continue;
            const obj={};
            headerMap.forEach((key,idx)=>{if(key)obj[key]=String(row[idx]??'').trim();});
            if(!obj.item&&!obj.desc)continue;
            if(obj.brand)anyBrand=true;
            if(obj.model)anyModel=true;
            if(obj.category)anyCategory=true;
            imported.push({
              id:uid(),
              item:obj.item||'',
              desc:obj.desc||'',
              qty:obj.qty||'1',
              unit:obj.unit||'',
              price:obj.price||'0',
              brand:obj.brand||'',
              model:obj.model||'',
              category:obj.category||'',
              invoicedQty:0
            });
          }

          if(imported.length===0){
            alert(tr('No valid items found'));
            return;
          }

          // Sheet may include Brand/Model/Category without the user having ticked those
          // column checkboxes yet — turn them on so the imported data is actually visible.
          // Never turns a column off; manual toggling still works normally afterwards.
          if(anyBrand||anyModel||anyCategory){
            setColumnSettings(cs=>({brand:cs.brand||anyBrand,model:cs.model||anyModel,category:cs.category||anyCategory}));
          }

          const currentItems=items.filter(it=>it.item||it.desc||(it.price&&it.price!=='0'));
          setItems([...currentItems,...imported]);

          // Bulk Product Pool price-history check (the per-row onBlur check never fires on import)
          const newWarnings={};
          let matchCount=0;
          imported.forEach(it=>{
            const matches=findPoolMatches(it.desc);
            if(matches.length>0){matchCount++;newWarnings[it.id]=matches;}
          });
          if(matchCount>0)setPriceWarnings(prev=>({...prev,...newWarnings}));

          showImportMsg(matchCount>0
            ?`✓ ${imported.length} items imported — ${matchCount} match previous pricing, check the highlighted rows`
            :`✓ ${imported.length} items imported`);

        }catch(err){
          console.error('Import error:', err);
          alert(tr('Import error: ')+err.message);
        }
      };

      reader.onerror=(err)=>{
        console.error('File read error:', err);
        alert(tr('Failed to read file'));
      };

      ensureXLSX().then(()=>{if(isCSV)reader.readAsText(file);else reader.readAsBinaryString(file);},libLoadFailed);

      e.target.value='';
    };
    const downloadImportTemplate=()=>{
      exportExcel([
        ['Item Code','Description','Brand','Model','Category','Qty','Unit','Unit Price','Total'],
        ['ITM-001','Example item description','Acme','X100','General',1,'pcs',0,0]
      ],'quote-import-template');
    };
    
    return(<div className="content"><div className="fw">
      <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>{tr("Back")}</button>
        <div style={{width:'1px',height:'24px',background:'var(--g200)'}}/>
        <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)',letterSpacing:'-.3px'}}>
          {q.id?tr('Edit Quotation'):tr('New Quotation')} — <span style={{fontFamily:'Inter',fontWeight:700,color:'var(--gm-500)'}}>{q.number}</span>
          {q.rev>0&&<span className="rev-badge" style={{marginLeft:10}}>{tr("Revision {0}", q.rev)}</span>}
        </h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>{setCur({...savedQ});go('sales_quote_preview','sales_quote_form')}}><Ico n="eye"/>{tr("Preview")}</Btn>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedQ,co,'sales_quote',FULL_BANK)}><Ico n="dl"/>{tr("PDF")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedQ)}>{tr("Save Quotation")}</Btn>
      </div>
      <div className={`fc fc-collapsible ${collapsed.details?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('details')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>{tr("Quotation Details")}</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        <div className="fg g4">
          <Fld label={tr("Quote No")}><input value={q.number} readOnly className="fi" style={{fontFamily:'monospace',fontWeight:700}}/></Fld>
          <Fld label={tr("Date")}><input type="date" value={q.date||''} onChange={e=>set('date',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Valid Until")}><input type="date" value={q.validUntil||addD(30)} onChange={e=>set('validUntil',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Currency")}><select value={q.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi" disabled={isLocked}>{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Project")}><select value={q.project||''} onChange={e=>{const projName=e.target.value;const proj=projects.find(p=>p.name===projName);set('project',projName);if(proj)set('projectNumber',proj.number);else set('projectNumber','');}} className="fi" disabled={isLocked}><option value="">{tr("— None —")}</option>{projects.map(p=><option key={p.id} value={p.name}>{p.number?(p.number+' - '):''}{p.name}</option>)}</select></Fld>
          <BankSelect doc={q} banks={co.banks} onChange={v=>set('bankId',v)} disabled={isLocked}/>
        </div>
        </div>
      </div>
      <div className={`fc fc-collapsible ${collapsed.billTo?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('billTo')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>{tr("Bill To")}</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        {(()=>{const custPick=customers.filter(c=>{const t=c.type||'customer';return t==='customer'||t==='both';});return custPick.length>0&&!isLocked&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=custPick.find(x=>x.id===e.target.value);if(c){set('client.company',c.company||'');set('client.contact',c.contact||'');set('client.email',c.email||'');set('client.address',c.address||'');set('client.phone',c.phone||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {custPick.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>;})()}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={(q.client&&q.client.company)||''} onChange={e=>set('client.company',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Contact Person")}><input value={(q.client&&q.client.contact)||''} onChange={e=>set('client.contact',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={(q.client&&q.client.email)||''} onChange={e=>set('client.email',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Phone")}><input value={(q.client&&q.client.phone)||''} onChange={e=>set('client.phone',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Address")}><textarea value={(q.client&&q.client.address)||''} onChange={e=>set('client.address',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Reference")}><input value={(q.client&&q.client.ref)||''} onChange={e=>set('client.ref',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        </div>
      </div>
      {!q.shipToEnabled&&!isLocked&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>{tr("Add Ship To")}</button>
      </div>}
      {q.shipToEnabled&&<div className={`fc fc-collapsible ${collapsed.shipTo?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('shipTo')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>{tr("Ship To")}</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        {customers.length>0&&!isLocked&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={(q.shipTo&&q.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Contact Person")}><input value={(q.shipTo&&q.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={(q.shipTo&&q.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Phone")}><input value={(q.shipTo&&q.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Address")}><textarea value={(q.shipTo&&q.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
          <Fld label={tr("Reference")}><input value={(q.shipTo&&q.shipTo.ref)||''} onChange={e=>set('shipTo.ref',e.target.value)} className="fi" disabled={isLocked}/></Fld>
        </div>
        {!isLocked&&<div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');set('shipTo.ref','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>{tr("Remove Ship To")}</button>
        </div>}
        </div>
      </div>}
      <div className={`fc fc-collapsible ${collapsed.items?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('items')}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
            <div className="fct" style={{margin:0,padding:0,border:'none'}}>{tr("Line Items")}</div>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div className="fc-toggle" onClick={(e)=>{e.stopPropagation();toggleSection('items');}}><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
            </div>
          </div>
        </div>
        <div className="fc-body">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14,paddingBottom:10,borderBottom:'1px solid var(--g100)'}}>
          <div style={{fontSize:'9.5px',fontWeight:700,textTransform:'uppercase',letterSpacing:'1px',color:'var(--g400)',display:'flex',alignItems:'center',gap:7}}><div style={{width:3,height:12,background:'linear-gradient(180deg,var(--gm-400),var(--gm-500))',borderRadius:2}}/> {tr("Configure Items")}</div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {!isLocked&&<div style={{display:'flex',gap:6,alignItems:'center',fontSize:11,color:'var(--g500)'}}>
              <span style={{fontWeight:600,marginRight:4}}>{tr("Columns:")}</span>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.brand} onChange={e=>setColumnSettings({...columnSettings,brand:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>{tr("Brand")}</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.model} onChange={e=>setColumnSettings({...columnSettings,model:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>{tr("Model")}</span>
              </label>
              <label style={{display:'flex',alignItems:'center',gap:4,cursor:'pointer',userSelect:'none'}}>
                <input type="checkbox" checked={columnSettings.category} onChange={e=>setColumnSettings({...columnSettings,category:e.target.checked})} style={{cursor:'pointer'}}/>
                <span>{tr("Category")}</span>
              </label>
            </div>}
            {!isLocked&&<div style={{display:'flex',gap:6,alignItems:'center'}}>
              <Btn v="bgh bsm" onClick={downloadImportTemplate}><Ico n="dl"/>{tr("Download Template")}</Btn>
              <Btn v="bgh bsm" onClick={()=>fileRef.current&&fileRef.current.click()}><Ico n="upload"/>{tr("Import Excel/CSV")}</Btn>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFileImport}/>
            </div>}
          </div>
        </div>
        {importMsg&&<div style={{background:'var(--greenl)',color:'var(--green)',border:'1px solid rgba(61,105,22,.25)',borderRadius:7,padding:'7px 12px',fontSize:12,fontWeight:600,marginBottom:10}}>{importMsg}</div>}
        <div className="iw">
          <table className="ie" style={{tableLayout:'auto'}}>
            <thead><tr>
              <th style={{textAlign:'left',width:'12%'}}>{tr("Item")}</th>
              <th style={{textAlign:'left',width:columnSettings.brand||columnSettings.model||columnSettings.category?'20%':'28%'}}>{tr("Description")}</th>
              {columnSettings.brand&&<th style={{textAlign:'left',width:'10%'}}>{tr("Brand")}</th>}
              {columnSettings.model&&<th style={{textAlign:'left',width:'10%'}}>{tr("Model")}</th>}
              {columnSettings.category&&<th style={{textAlign:'left',width:'10%'}}>{tr("Category")}</th>}
              <th style={{textAlign:'right',width:'8%'}}>{tr("Qty")}</th>
              <th style={{textAlign:'left',width:'8%'}}>{tr("Unit")}</th>
              <th style={{textAlign:'right',width:'10%'}}>{tr("Unit Price")}</th>
              <th style={{textAlign:'right',width:'10%'}}>{tr("Total")}</th>
              {!isLocked&&<th style={{width:'4%'}}></th>}
            </tr></thead>
            <tbody>{items.map((it,idx)=>{
              const si=(id,f,v)=>setItems(items.map(i=>i.id===id?{...i,[f]:v}:i));
              const rmL=id=>setItems(items.filter(i=>i.id!==id));
              const applyPrice=(itemId,price)=>{si(itemId,'price',price);};
              // Duplicate check: ONLY by description
              const isDup=items.filter((x,i)=>i!==idx&&x.desc&&it.desc&&x.desc.toLowerCase().trim()===it.desc.toLowerCase().trim()).length>0;
              const warnings=priceWarnings[it.id]||[];
              const flagged=isDup||warnings.length>0;
              return(<React.Fragment key={it.id}>
                <tr className={flagged?'row-warn':''}>
                <td title={isDup?tr('Duplicate item (same description)'):(warnings.length>0?tr('Previously quoted — see price history below'):'')}><input value={it.item||''} onChange={e=>si(it.id,'item',e.target.value)} placeholder={tr("Item code...")} readOnly={isLocked} style={flagged?{color:'var(--amber)',fontWeight:600}:{}}/></td>
                <td><input value={it.desc||''} onChange={e=>si(it.id,'desc',e.target.value)} onBlur={e=>checkPriceHistory(it.id,e.target.value)} placeholder={tr("Description...")} readOnly={isLocked} style={flagged?{color:'var(--amber)',fontWeight:600}:{}}/></td>
                {columnSettings.brand&&<td><input value={it.brand||''} onChange={e=>si(it.id,'brand',e.target.value)} placeholder={tr("Brand...")} readOnly={isLocked}/></td>}
                {columnSettings.model&&<td><input value={it.model||''} onChange={e=>si(it.id,'model',e.target.value)} placeholder={tr("Model...")} readOnly={isLocked}/></td>}
                {columnSettings.category&&<td><input value={it.category||''} onChange={e=>si(it.id,'category',e.target.value)} placeholder={tr("Category...")} readOnly={isLocked}/></td>}
                <td><input type="number" value={it.qty||''} onChange={e=>si(it.id,'qty',e.target.value)} min="0" step=".01" style={{textAlign:'right'}} readOnly={isLocked}/></td>
                <td><input value={it.unit||''} onChange={e=>si(it.id,'unit',e.target.value)} placeholder="pcs" readOnly={isLocked}/></td>
                <td><input type="number" value={it.price||''} onChange={e=>si(it.id,'price',e.target.value)} min="0" step=".01" placeholder="0.00" style={{textAlign:'right'}} readOnly={isLocked}/></td>
                <td className="lt">{CURR[q.currency]||'£'}{fmt(lt(it))}</td>
                {!isLocked&&<td style={{textAlign:'center'}}>{items.length>1&&<button className="dlb" onClick={()=>rmL(it.id)}>×</button>}</td>}
              </tr>
              {warnings.length>0&&<tr><td colSpan={columnSettings.brand||columnSettings.model||columnSettings.category?10:7} style={{padding:0,border:'none'}}><div style={{background:'#fffbeb',border:'1px solid #fcd34d',borderRadius:6,padding:'8px 12px',margin:'4px 0 8px 0',fontSize:12}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6,color:'#d97706',fontWeight:600}}><svg viewBox="0 0 24 24" style={{width:14,height:14,stroke:'currentColor',fill:'none',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round'}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{tr("This item was previously used:")}</div>{warnings.map((w,i)=>{const showName=w.matchedName&&w.matchedName.toLowerCase().trim()!==(it.desc||'').toLowerCase().trim();return(<div key={i} style={{display:'flex',alignItems:'center',gap:8,marginTop:4,paddingLeft:20}}><span style={{color:'#78716c'}}>•</span><span style={{fontWeight:600,color:'#0f172a'}}>£{fmt(+(w.price||0))}</span><span style={{color:'#78716c'}}>→</span><span style={{fontFamily:'monospace',fontSize:11,color:'#c8902a'}}>{w.quoteNum||'—'}</span><span style={{color:'#78716c',fontSize:11}}>({w.date||'—'})</span>{showName&&<span onMouseEnter={e=>{const r=e.currentTarget.getBoundingClientRect();setPoolTip({text:w.matchedName,x:r.left+r.width/2,y:r.top});}} onMouseLeave={()=>setPoolTip(null)} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:16,height:16,borderRadius:'50%',background:'#e2e8f0',color:'#64748b',fontSize:10,fontWeight:700,cursor:'default',flexShrink:0}}>ⓘ</span>}{!isLocked&&<button onClick={()=>applyPrice(it.id,w.price)} style={{marginLeft:8,background:'#fbbf24',border:'1px solid #f59e0b',color:'#78350f',padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,cursor:'pointer'}}>{tr("Use £{0}", fmt(+(w.price||0)))}</button>}</div>);})}</div></td></tr>}
              </React.Fragment>);
            })}</tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          {!isLocked?<Btn v="bgh bsm" onClick={()=>setItems([...items,{id:uid(),item:'',desc:'',qty:'1',unit:'',price:'',invoicedQty:0}])}><Ico n="plus"/>{tr("Add Line")}</Btn>:<div/>}
          <div className="totbox"><span className="totlbl">{tr("Total")}</span><span className="totamt">{CURR[q.currency]||'£'}{fmt(dt(items))}</span></div>
        </div>
        </div>
      </div>
      <div className={`fc fc-collapsible ${collapsed.notes?'fc-collapsed':''}`}>
        <div className="fc-header" onClick={()=>toggleSection('notes')}>
          <div className="fct" style={{margin:0,padding:0,border:'none'}}>{tr("Notes")}</div>
          <div className="fc-toggle"><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></div>
        </div>
        <div className="fc-body">
        <Fld label={tr("Notes")}><textarea value={q.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi" disabled={isLocked}/></Fld>
        <div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={q.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
              disabled={isLocked}
              style={{cursor:isLocked?'not-allowed':'pointer'}}
            />
            <span style={{color:isLocked?'var(--g400)':'var(--g700)'}}>{tr("Add Signature to PDF")}</span>
          </label>
        </div>
        </div>
      </div>
      {isLocked&&<div className="alert-red" style={{marginBottom:14}}><Ico n="lock" size={14}/> {tr("This quotation is locked. To make changes, click \"New Revision\" from the list.")}</div>}
      <div style={{position:'sticky',bottom:0,background:'var(--white)',borderTop:'2px solid var(--g200)',padding:'16px 0',marginTop:'20px',display:'flex',justifyContent:'flex-end',gap:10,zIndex:50,boxShadow:'0 -4px 12px rgba(0,0,0,.06)'}}>
        <Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedQ)} disabled={isLocked}>{tr("Save Quotation")}</Btn>
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
    const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=_isDirty;
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button>
        <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{tr("{0} Sales Invoice —", inv.id?tr('Edit'):tr('New'))} <span style={{fontFamily:'Inter',fontWeight:600,color:'var(--gm-500)'}}>{inv.number}</span></h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedInv,co,'invoice',FULL_BANK)}><Ico n="dl"/>{tr("PDF")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedInv)}>{tr("Save Invoice")}</Btn>
      </div>
      {inv.quoteNum&&<div style={{background:'var(--bluel)',border:'1px solid #bfdbfe',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--blue)',display:'flex',alignItems:'center',gap:8}}><Ico n="quote"/>{tr("From Quotation:")} <strong>{inv.quoteNum}</strong></div>}
      <div className="fc"><div className="fct">{tr("Invoice Details")}</div>
        <div className="fg g4">
          <Fld label={tr("Invoice No")}><input value={inv.number} readOnly className="fi" style={{fontFamily:'monospace',fontWeight:700}}/></Fld>
          <Fld label={tr("Invoice Date")}><input type="date" value={inv.date||''} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Due Date")}><input type="date" value={inv.dueDate||''} onChange={e=>set('dueDate',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Terms")}><select value={inv.terms||'Due on Receipt'} onChange={e=>set('terms',e.target.value)} className="fi">{ITRM.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>
        </div>
        <div className="fg g3" style={{marginTop:12}}>
          <Fld label={tr("Currency")}><select value={inv.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
          <Fld label={tr("Status")}><select value={inv.status||'draft'} onChange={e=>set('status',e.target.value)} className="fi"><option value="draft">{tr("Draft")}</option><option value="sent">{tr("Sent")}</option></select></Fld>
          <BankSelect doc={inv} banks={co.banks} onChange={v=>set('bankId',v)}/>
        </div>
      </div>
      <div className="fc"><div className="fct">{tr("Bill To")}</div>
        {(()=>{const custPick=customers.filter(c=>{const t=c.type||'customer';return t==='customer'||t==='both';});return custPick.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=custPick.find(x=>x.id===e.target.value);if(c){set('client.company',c.company||'');set('client.contact',c.contact||'');set('client.email',c.email||'');set('client.address',c.address||'');set('client.phone',c.phone||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {custPick.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>;})()}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={(inv.client&&inv.client.company)||''} onChange={e=>set('client.company',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Contact Person")}><input value={(inv.client&&inv.client.contact)||''} onChange={e=>set('client.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={(inv.client&&inv.client.email)||''} onChange={e=>set('client.email',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Phone")}><input value={(inv.client&&inv.client.phone)||''} onChange={e=>set('client.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label={tr("Address")}><textarea value={(inv.client&&inv.client.address)||''} onChange={e=>set('client.address',e.target.value)} rows={2} className="fi"/></Fld></div>
      </div>
      {!inv.shipToEnabled&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>{tr("Add Ship To")}</button>
      </div>}
      {inv.shipToEnabled&&<div className="fc"><div className="fct">{tr("Ship To")}</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={(inv.shipTo&&inv.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Contact Person")}><input value={(inv.shipTo&&inv.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={(inv.shipTo&&inv.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Phone")}><input value={(inv.shipTo&&inv.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label={tr("Address")}><textarea value={(inv.shipTo&&inv.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi"/></Fld></div>
        <div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>{tr("Remove Ship To")}</button>
        </div>
      </div>}
      {/* Invoices raised directly (no quotation) get the free line editor; quote invoices only adjust qty/price */}
      {!inv.quoteId?<div className="fc"><div className="fct">{tr("Line Items")}</div>
        <ItemsEditor items={items} setItems={setItems} currency={inv.currency||'GBP'}/>
      </div>:
      <div className="fc"><div className="fct">{tr("Line Items (from Quotation)")}</div>
        <div className="iw"><table className="ie">
          <thead><tr><th>{tr("Item")}</th><th>{tr("Description")}</th><th>{tr("Available Qty")}</th><th style={{textAlign:'right'}}>{tr("Invoice Qty")}</th><th>{tr("Unit")}</th><th style={{textAlign:'right'}}>{tr("Unit Price")}</th><th style={{textAlign:'right'}}>{tr("Total")}</th></tr></thead>
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
          <div className="totbox"><span className="totlbl">{tr("Total")}</span><span className="totamt">{sym}{fmt(dt(items))}</span></div>
        </div>
      </div>}
      <div className="fc"><div className="fct">{tr("Notes")}</div>
        <Fld label={tr("Notes")}><textarea value={inv.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi"/></Fld>
        <div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={inv.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
            />
            <span>{tr("Add Signature to PDF")}</span>
          </label>
        </div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={()=>onSave(savedInv)}>{tr("Save Invoice")}</Btn></div>
    </div></div>);
  }

  // Sales Invoices List
  function SalesInvoicesList(){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const{sort,onSort}=useSort();
    const[quickView,setQuickView]=useState(null);
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs)+JSON.stringify(sort));
    const filtered=salesInvoices.filter(d=>{
      const company=(d&&d.client&&d.client.company)||'';
      const contact=(d&&d.client&&d.client.contact)||'';
      if(fs.q&&![company,contact,d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    const sorted=sortRows(filtered,sort,{date:d=>d.date,no:d=>d.number,quote:d=>d.quoteNum,customer:d=>d.client&&d.client.company,total:d=>dt(d.items||[]),status:d=>d.status});
    const bulk=useBulkSelect(sorted.map(d=>d.id));
    const picked=sorted.filter(d=>bulk.has(d.id));
    const pickedDrafts=picked.filter(d=>d.status==='draft');
    const[zipBusy,setZipBusy]=useState(false);
    const bulkMarkSent=()=>{
      const ids=new Set(pickedDrafts.map(d=>d.id));
      sSI(salesInvoices.map(x=>ids.has(x.id)?{...x,status:'sent'}:x));
      const skipped=picked.length-ids.size;
      showToast(tr('{0} marked as sent',ids.size)+(skipped?' · '+tr('{0} skipped (not a draft)',skipped):''));
      bulk.clear();
    };
    const bulkPDF=async()=>{
      setZipBusy(true);
      const done=await downloadPDFZip(picked,co,'invoice',FULL_BANK,'sales-invoices',(i,n)=>showToast(tr('Preparing PDFs… {0}/{1}',i,n)));
      setZipBusy(false);
      if(done){showToast(tr('{0} PDFs downloaded',picked.length));bulk.clear();}
    };
    return(<div className="content">
      <ListTools q={fs.q} onQ={v=>setFs(f=>({...f,q:v}))} placeholder={tr("Search customer or invoice no...")} active={[fs.s,fs.dateFrom,fs.dateTo].filter(Boolean).length} onClear={()=>setFs(f=>({...f,s:'',dateFrom:'',dateTo:''}))} onExport={()=>exportExcel([['Date','Number','Company','Contact','Total','Status','From Quote'],...sorted.map(d=>[d.date,d.number,(d&&d.client&&d.client.company)||'',(d&&d.client&&d.client.contact)||'',fmt(dt(d.items)),d.status,d.quoteNum||''])],'sales-invoices')}>
        <FilterField label={tr("Status")}><select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">{tr("All Statuses")}</option><option value="draft">{tr("Draft")}</option><option value="sent">{tr("Sent")}</option>
        </select></FilterField>
        <FilterField label={tr("From")}><input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))}/></FilterField>
        <FilterField label={tr("To")}><input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))}/></FilterField>
      </ListTools>
      <BulkBar bulk={bulk}>
        <BulkBtn icon="send" disabled={!pickedDrafts.length} onClick={bulkMarkSent}>{tr("Mark as Sent")}{pickedDrafts.length?` (${pickedDrafts.length})`:''}</BulkBtn>
        <BulkBtn icon="export" onClick={()=>exportExcel([['Date','Number','Company','Contact','Total','Status','From Quote'],...picked.map(d=>[d.date,d.number,(d&&d.client&&d.client.company)||'',(d&&d.client&&d.client.contact)||'',fmt(dt(d.items)),d.status,d.quoteNum||''])],'sales-invoices')}>{tr("Export selected")}</BulkBtn>
        <BulkBtn icon="dl" disabled={zipBusy} onClick={bulkPDF}>{zipBusy?tr('Preparing…'):tr('Download PDFs')}</BulkBtn>
      </BulkBar>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="invoice" size={38}/><div className="empty-t">{tr("No sales invoices yet")}</div><div className="empty-s">{tr("Approve a quotation and convert it to invoice")}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={[0.32,0.8,1,1,2,0.9,1.3,0.9]}/>
          <thead><tr>
            <SelTh bulk={bulk}/>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={sort} onSort={onSort}>{tr("Invoice No")}</SortTh>
            <SortTh k="quote" sort={sort} onSort={onSort}>{tr("From Quote")}</SortTh>
            <SortTh k="customer" sort={sort} onSort={onSort}>{tr("Customer")}</SortTh>
            <SortTh k="total" sort={sort} onSort={onSort} className="tar">{tr("Total")}</SortTh>
            <th className="tac">{tr("Actions")}</th>
            <SortTh k="status" sort={sort} onSort={onSort} className="tac">{tr("Status")}</SortTh>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(d=>(
            <tr key={d.id} className={bulk.has(d.id)?'is-sel':''} style={{cursor:'pointer'}} onClick={()=>setQuickView(d)}>
              <SelTd bulk={bulk} id={d.id}/>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
              <td><span style={{fontFamily:'Inter',fontSize:11}}>{d.number}</span></td>
              <td>{d.quoteNum?<span style={{fontFamily:'Inter',fontSize:11,color:'var(--gm-500)'}}>{d.quoteNum}</span>:'—'}</td>
              <td>
                {(d&&d.client&&d.client.company)?d.client.company:'—'}
              </td>
              <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items))}</td>
              <td className="tac">{d.status==='draft'&&<ActBtn label={tr("Mark as Sent")} onClick={()=>handleMarkInvoiceAsSent(d)} due={tr('Draft — not sent yet')}/>}</td>
              <td className="tac"><Badge s={d.status}/></td>
            </tr>
          ))}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
      {quickView&&<DocQuickModal doc={quickView} co={co} docType="invoice" pdfOpts={FULL_BANK} onClose={()=>setQuickView(null)}
        onEdit={()=>{const openEdit=()=>{setQuickView(null);setCur(quickView);go('sales_invoice_edit');};if(quickView.status==='sent'){askConfirm(tr('This invoice has been marked as sent. Edit anyway?'),openEdit);}else{openEdit();}}}
        onDelete={()=>askConfirm(tr('Delete this invoice?'),()=>{sSI(salesInvoices.filter(x=>x.id!==quickView.id));showToast(tr('Deleted'));setQuickView(null);})}
        extraActions={[]}/>}
    </div>);
  }

  // Generic list for PQ, PO, RI
  function ProcurementList({type,items,title}){
    const[fs,setFs]=useState({q:'',s:'',dateFrom:'',dateTo:''});
    const{sort,onSort}=useSort();
    const[quickView,setQuickView]=useState(null);
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs)+JSON.stringify(sort));
    const isRI=type==='ri',isPQ=type==='pq',isPO=type==='po';
    const filtered=items.filter(d=>{
      if(fs.q&&![d.supplierCompany||'',d.number||''].some(x=>x.toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(isRI&&fs.s&&d.status!==fs.s)return false;
      if(fs.dateFrom&&d.date<fs.dateFrom)return false;
      if(fs.dateTo&&d.date>fs.dateTo)return false;
      return true;
    });
    const sorted=sortRows(filtered,sort,{date:d=>d.date,no:d=>d.number,project:d=>d.project,supplier:d=>d.supplierCompany,total:d=>dt(d.items||[]),
      linked:d=>isPQ?d.linkedPO&&d.linkedPO.number:isPO?d.pqNum:d.poNum,status:d=>d.status||'unpaid'});
    const lbl=isPQ?tr('Received Quote'):isPO?tr('Purchase Order'):tr('Received Invoice');
    const linkChip=(label,num)=><span style={{display:'inline-flex',alignItems:'center',gap:3,fontSize:10,fontWeight:600,padding:'2px 7px',borderRadius:5,background:'rgba(61,105,22,.09)',color:'#3D6916',border:'1px solid rgba(61,105,22,.18)'}}>{label} {num}</span>;
    return(<div className="content">
      <ListTools q={fs.q} onQ={v=>setFs(f=>({...f,q:v}))} placeholder={tr("Search supplier or ref...")} active={[fs.s,fs.dateFrom,fs.dateTo].filter(Boolean).length} onClear={()=>setFs(f=>({...f,s:'',dateFrom:'',dateTo:''}))} onExport={()=>exportExcel([['Date','Number','Supplier','Total',...(isRI?['Status']:[])],...sorted.map(d=>[d.date,d.number,d.supplierCompany,fmt(dt(d.items)),...(isRI?[d.status]:[])])],type)}>
        {isRI&&<FilterField label={tr("Status")}><select value={fs.s} onChange={e=>setFs(f=>({...f,s:e.target.value}))}>
          <option value="">{tr("All")}</option><option value="unpaid">{tr("Unpaid")}</option><option value="paid">{tr("Paid")}</option>
        </select></FilterField>}
        <FilterField label={tr("From")}><input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))}/></FilterField>
        <FilterField label={tr("To")}><input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))}/></FilterField>
      </ListTools>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n={isRI?'received':'po'} size={38}/><div className="empty-t">{tr("No {0}s yet", lbl.toLowerCase())}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={isRI?[0.8,1,1,2,0.9,0.9,1.1,0.9]:[0.8,1,1,2,0.9,0.9,1.3]}/>
          <thead><tr>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={sort} onSort={onSort}>{tr("No")}</SortTh>
            <SortTh k="project" sort={sort} onSort={onSort}>{tr("Project")}</SortTh>
            <SortTh k="supplier" sort={sort} onSort={onSort}>{tr("Supplier")}</SortTh>
            <SortTh k="total" sort={sort} onSort={onSort} className="tar">{tr("Total")}</SortTh>
            <SortTh k="linked" sort={sort} onSort={onSort} className="tac">{isPQ?tr('Linked To'):tr('Linked From')}</SortTh>
            <th className="tac">{tr("Actions")}</th>
            {isRI&&<SortTh k="status" sort={sort} onSort={onSort} className="tac">{tr("Status")}</SortTh>}
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(d=>(
            <tr key={d.id} style={{cursor:'pointer'}} onClick={()=>setQuickView(d)}>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.date}</td>
              <td><span className="dn">{d.number||'—'}</span></td>
              <td style={{color:'var(--g500)',fontSize:12}}>{d.project||'—'}</td>
              <td style={{color:'var(--g800)'}}>{d.supplierCompany||'—'}</td>
              <td className="tar">{CURR[d.currency]||'£'}{fmt(dt(d.items||[]))}</td>
              <td className="tac">
                {isPQ&&(d.linkedPO?linkChip('→',d.linkedPO.number):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
                {isPO&&(d.pqNum?linkChip('←',d.pqNum):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
                {isRI&&(d.poNum?linkChip('←',d.poNum):<span style={{fontSize:11,color:'var(--g300)'}}>—</span>)}
              </td>
              <td className="tac">
                {isPQ&&!d.linkedPO&&<ActBtn label={tr('Convert to PO')} onClick={()=>handleConvertPQtoPO(d)} due={isStale(d)?tr('Not ordered for over 14 days'):''}/>}
                {isPO&&!d.linkedRI&&<ActBtn label={tr('Add Invoice')} onClick={()=>handleConvertPOtoRI(d)} due={isStale(d)?tr('No invoice for over 14 days'):''}/>}
                {isRI&&d.status!=='paid'&&<ActBtn label={tr('Mark as Paid')} onClick={()=>{sRI(receivedInvoices.map(x=>x.id===d.id?{...x,status:'paid'}:x));showToast(tr('Marked as paid'));}} due={isOverdue(d)?tr('Overdue — not paid'):tr('Not paid yet')}/>}
              </td>
              {isRI&&<td className="tac"><Badge s={d.status||'unpaid'}/></td>}
            </tr>
          ))}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
      {quickView&&(()=>{
        const extraActions=[];
        if(isPQ&&!quickView.linkedPO)extraActions.push({label:tr('Convert to Purchase Order'),onClick:()=>{setQuickView(null);handleConvertPQtoPO(quickView);}});
        if(isPO&&!quickView.linkedRI)extraActions.push({label:tr('Create Received Invoice'),onClick:()=>{setQuickView(null);handleConvertPOtoRI(quickView);}});
        if(isRI&&quickView.status==='unpaid')extraActions.push({label:tr('Mark as Paid'),onClick:()=>{sRI(receivedInvoices.map(x=>x.id===quickView.id?{...x,status:'paid'}:x));showToast(tr('Marked as paid'));setQuickView(null);}});
        return(<DocQuickModal doc={quickView} co={co} docType={isPO?'po':isRI?'invoice':'quote'} pdfOpts={SALES_PDF} itemNote={sqItemNote(quickView)} onClose={()=>setQuickView(null)}
          onEdit={()=>{setQuickView(null);setCur(quickView);go(isPQ?'pq_form':isPO?'po_form':'ri_form');}}
          onDelete={()=>askConfirm(tr("Delete this {0}?", lbl.toLowerCase()),()=>{isPQ?deletePQ(quickView.id):isPO?deletePO(quickView.id):deleteRI(quickView.id);showToast(tr('Deleted'));setQuickView(null);})}
          extraActions={extraActions}/>);
      })()}
    </div>);
  }

  // Generic Procurement Form (PQ, PO, RI)
  function ProcurementForm({doc:init,docType,onSave,onCancel}){
    const[doc,setDoc]=useState(init);
    const[items,setItems]=useState(init.items||[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
    const set=(p,v)=>setDoc(d=>{if(!p.includes('.'))return{...d,[p]:v};const[a,b]=p.split('.');return{...d,[a]:{...d[a],[b]:v}};});
    const _initStr=useRef(JSON.stringify({...init,items:init.items||[]}));
    const _isDirty=()=>JSON.stringify({...doc,items})!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=_isDirty;
    const isPQ=docType==='pq',isPO=docType==='po',isRI=docType==='ri';
    const lbl=isPQ?tr('Received Quote'):isPO?tr('Purchase Order'):tr('Received Invoice');
    const supplierLocked=(isPO&&!!doc.pqId)||(isRI&&!!doc.poId);
    const roStyle={background:'var(--g50)',color:'var(--g700)',cursor:'default'};
    const savedDoc={...doc,items};
    // Sales quotation whose customer lines this document's lines are matched to (latest revision of each group)
    const sqChoices=[...new Set(salesQuotes.filter(q=>!doc.project||q.project===doc.project).map(sqBaseOf))].concat(doc.sqBase?[doc.sqBase]:[])
      .filter((b,i,a)=>a.indexOf(b)===i).map(latestSQ).filter(Boolean);
    const clearMatches=()=>setItems(its=>its.map(i=>i.sqKey?{...i,sqKey:''}:i));
    const pickSQ=base=>{
      if(base===(doc.sqBase||''))return;
      const q=latestSQ(base);
      setDoc(d=>({...d,sqBase:base,...(q&&!d.project&&q.project?{project:q.project,projectNumber:q.projectNumber||''}:{})}));
      clearMatches();
    };
    const pickProject=projName=>{
      const proj=projects.find(p=>p.name===projName);
      const q=latestSQ(doc.sqBase);
      const keepSQ=!q||!projName||q.project===projName;
      setDoc(d=>({...d,project:projName,projectNumber:proj?proj.number:'',...(keepSQ?{}:{sqBase:''})}));
      if(!keepSQ)clearMatches();
    };
    const sqField=<Fld label={tr("Sales Quotation")}><select value={doc.sqBase||''} onChange={e=>pickSQ(e.target.value)} className="fi">
      <option value="">{tr("— None —")}</option>
      {sqChoices.map(q=><option key={sqBaseOf(q)} value={sqBaseOf(q)}>{q.number} · {(q.client&&(q.client.company||q.client.contact))||'—'}</option>)}
    </select></Fld>;
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button>
        <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{doc.id?tr("Edit {0}", lbl):tr("New {0}", lbl)}</h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={()=>savePDF(savedDoc,co,isPO?'po':isRI?'invoice':'quote',SALES_PDF)}><Ico n="dl"/>{tr("PDF")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>{tr("Save {0}", lbl)}</Btn>
      </div>
      {doc.pqNum&&<div style={{background:'var(--teall)',border:'1px solid #a5f3fc',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--teal)'}}>{tr("From Purchase Quotation:")} <strong>{doc.pqNum}</strong></div>}
      {doc.poNum&&<div style={{background:'var(--teall)',border:'1px solid #a5f3fc',borderRadius:8,padding:'8px 14px',marginBottom:14,fontSize:12.5,color:'var(--teal)'}}>{tr("From Purchase Order:")} <strong>{doc.poNum}</strong></div>}
      <div className="fc"><div className="fct">{tr("Document Details")}</div>
        <div className="fg g4">
          <Fld label={isPQ?tr("Their PQ No"):isPO?tr("PO No"):tr("Their Invoice No")}><input value={doc.number||''} onChange={e=>set('number',e.target.value)} className="fi" readOnly={isPO} style={isPO?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld>
          <Fld label={tr("Date")}><input type="date" value={doc.date||''} onChange={e=>set('date',e.target.value)} className="fi"/></Fld>
          <Fld label={isPO?tr("Delivery Date"):tr("Due Date")}><input type="date" value={doc.dueDate||doc.deliveryDate||addD(30)} onChange={e=>set(isPO?'deliveryDate':'dueDate',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Currency")}><select value={doc.currency||'GBP'} onChange={e=>set('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
        </div>
        <div className="fg g3" style={{marginTop:12}}>
          {isRI&&<Fld label={tr("Terms")}><select value={doc.terms||'Due on Receipt'} onChange={e=>set('terms',e.target.value)} className="fi">{ITRM.map(t=><option key={t} value={t}>{t}</option>)}</select></Fld>}
          {isRI&&<Fld label={tr("Status")}><select value={doc.status||'unpaid'} onChange={e=>set('status',e.target.value)} className="fi"><option value="unpaid">{tr("Unpaid")}</option><option value="paid">{tr("Paid")}</option></select></Fld>}
          <Fld label={tr("Project")}><select value={doc.project||''} onChange={e=>pickProject(e.target.value)} className="fi"><option value="">{tr("— None —")}</option>{projects.map(p=><option key={p.id} value={p.name}>{p.number?(p.number+' - '):''}{p.name}</option>)}</select></Fld>
          {!isRI&&sqField}
        </div>
        {isRI&&<div className="fg g3" style={{marginTop:12}}>{sqField}</div>}
      </div>
      <div className="fc"><div className="fct" style={{display:'flex',alignItems:'center',gap:8}}>{tr("Vendor / Supplier")}{supplierLocked&&<span style={{fontSize:11,fontWeight:600,color:'var(--g500)',display:'inline-flex',alignItems:'center',gap:3}}><Ico n="lock" size={11}/>{tr("Locked")}</span>}</div>
        {(()=>{const supPick=customers.filter(c=>{const t=c.type||'customer';return t==='supplier'||t==='both';});return !supplierLocked&&supPick.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=supPick.find(x=>x.id===e.target.value);if(c){set('supplierId',c.id);set('supplierCompany',c.company||'');set('supplierContact',c.contact||'');set('supplierEmail',c.email||'');set('supplierPhone',c.phone||'');set('supplierAddress',c.address||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {supPick.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>;})()}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={doc.supplierCompany||''} onChange={e=>{set('supplierCompany',e.target.value);set('supplierId','');}} className="fi" readOnly={supplierLocked} style={supplierLocked?roStyle:{}}/></Fld>
          <Fld label={tr("Contact Person")}><input value={doc.supplierContact||''} onChange={e=>set('supplierContact',e.target.value)} className="fi" readOnly={supplierLocked} style={supplierLocked?roStyle:{}}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={doc.supplierEmail||''} onChange={e=>set('supplierEmail',e.target.value)} className="fi" readOnly={supplierLocked} style={supplierLocked?roStyle:{}}/></Fld>
          <Fld label={tr("Phone")}><input value={doc.supplierPhone||''} onChange={e=>set('supplierPhone',e.target.value)} className="fi" readOnly={supplierLocked} style={supplierLocked?roStyle:{}}/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Address")}><textarea value={doc.supplierAddress||''} onChange={e=>set('supplierAddress',e.target.value)} rows={2} className="fi" readOnly={supplierLocked} style={supplierLocked?roStyle:{}}/></Fld>
          <Fld label={tr("Reference")}><input value={doc.ref||''} onChange={e=>set('ref',e.target.value)} className="fi"/></Fld>
        </div>
      </div>
      {(isPO||isPQ)&&!doc.shipToEnabled&&<div style={{marginTop:12,marginBottom:12}}>
        <button className="bbgh bsm" onClick={()=>set('shipToEnabled',true)} style={{fontSize:12}}><Ico n="plus"/>{tr("Add Ship To")}</button>
      </div>}
      {(isPO||isPQ)&&doc.shipToEnabled&&<div className="fc"><div className="fct">{tr("Ship To")}</div>
        {customers.length>0&&<div style={{marginBottom:12}}>
          <select className="fi" style={{maxWidth:300}} onChange={e=>{const c=customers.find(x=>x.id===e.target.value);if(c){set('shipTo.company',c.company||'');set('shipTo.contact',c.contact||'');set('shipTo.email',c.email||'');set('shipTo.address',c.address||'');set('shipTo.phone',c.phone||'');}}}>
            <option value="">{tr("— Quick fill —")}</option>
            {customers.map(c=><option key={c.id} value={c.id}>{c.company?`${c.company} (${c.contact||''})`:c.contact||''}</option>)}
          </select>
        </div>}
        <div className="fg g2">
          <Fld label={tr("Company Name")}><input value={(doc.shipTo&&doc.shipTo.company)||''} onChange={e=>set('shipTo.company',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Contact Person")}><input value={(doc.shipTo&&doc.shipTo.contact)||''} onChange={e=>set('shipTo.contact',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Email")}><input value={(doc.shipTo&&doc.shipTo.email)||''} onChange={e=>set('shipTo.email',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Phone")}><input value={(doc.shipTo&&doc.shipTo.phone)||''} onChange={e=>set('shipTo.phone',e.target.value)} className="fi"/></Fld>
        </div>
        <div className="fg g2" style={{marginTop:12}}>
          <Fld label={tr("Address")}><textarea value={(doc.shipTo&&doc.shipTo.address)||''} onChange={e=>set('shipTo.address',e.target.value)} rows={2} className="fi"/></Fld>
          <Fld label={tr("Reference")}><input value={(doc.shipTo&&doc.shipTo.ref)||''} onChange={e=>set('shipTo.ref',e.target.value)} className="fi"/></Fld>
        </div>
        <div style={{marginTop:12}}>
          <button className="bbgh bsm" onClick={()=>{set('shipToEnabled',false);set('shipTo.company','');set('shipTo.contact','');set('shipTo.email','');set('shipTo.phone','');set('shipTo.address','');set('shipTo.ref','');}} style={{fontSize:12,color:'var(--red)'}}><Ico n="x"/>{tr("Remove Ship To")}</button>
        </div>
      </div>}
      <div className="fc"><div className="fct">{tr("Line Items")}</div>
        {!doc.sqBase&&<div style={{fontSize:12,color:'var(--g500)',marginBottom:10}}>{tr("Select the sales quotation above to match each line to the customer's item.")}</div>}
        <ItemsEditor items={items} setItems={setItems} currency={doc.currency||'GBP'} match={doc.sqBase?{options:sqMatchOptions(doc.sqBase)}:undefined}/>
      </div>
      {isGroupDoc(doc)&&(()=>{
        const sc=srcCur(doc),dc=doc.currency||'GBP';
        const setLine=(id,f,v)=>setItems(its=>its.map(i=>i.id===id?{...i,[f]:v}:i));
        const srcNames=customers.filter(c=>c.type==='source').map(c=>c.company||c.contact).filter(Boolean);
        return(<div className="fc"><div className="fct" style={{display:'flex',alignItems:'center',gap:8}}>{tr("Source Supplier")}<span className="mt-internal">{tr("internal — not printed")}</span></div>
          <div style={{fontSize:12,color:'var(--g500)',marginBottom:12}}>{tr("Who sold each item to {0}, at what price.",doc.supplierCompany||tr('the group company'))}</div>
          <div className="fg g3">
            <Fld label={tr("Source Currency")}><select value={sc} onChange={e=>set('srcCurrency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,s])=><option key={c} value={c}>{c} ({s})</option>)}</select></Fld>
            {sc!==dc?<Fld label={tr("Exchange Rate: 1 {0} = ? {1}",dc,sc)}><input type="number" min="0" step="0.0001" value={doc.fxRate||''} onChange={e=>set('fxRate',e.target.value)} className="fi" placeholder="0.0000"/></Fld>:<div/>}
            <div/>
          </div>
          <datalist id="src-suppliers">{srcNames.map(n=><option key={n} value={n}/>)}</datalist>
          <div className="iw" style={{marginTop:12}}><table className="ie">
            <thead><tr><th style={{width:'4%'}}>#</th><th style={{width:'26%'}}>{tr("Line")}</th><th style={{width:'22%'}}>{tr("Source Supplier")}</th><th style={{width:'14%'}}>{tr("Source Invoice No")}</th><th style={{width:'12%'}}>{tr("Date")}</th><th style={{width:'11%',textAlign:'right'}}>{tr("Unit Price")} ({sc})</th><th style={{width:'11%',textAlign:'right'}}>= {dc}</th></tr></thead>
            <tbody>{items.map((it,i)=>{const conv=srcInDocCur({...doc,srcCurrency:sc},it);return(<tr key={it.id}>
              <td style={{color:'var(--g500)',paddingLeft:8}}>{i+1}</td>
              <td style={{color:'var(--g700)',fontSize:12,padding:'0 8px'}}>{it.desc||it.item||'—'}</td>
              <td><input list="src-suppliers" value={it.srcSupplier||''} onChange={e=>setLine(it.id,'srcSupplier',e.target.value)} placeholder={tr("Source supplier...")}/></td>
              <td><input value={it.srcDocNo||''} onChange={e=>setLine(it.id,'srcDocNo',e.target.value)} placeholder={tr("Invoice no")}/></td>
              <td><input type="date" value={it.srcDocDate||''} onChange={e=>setLine(it.id,'srcDocDate',e.target.value)}/></td>
              <td><input type="number" min="0" step=".01" value={it.srcPrice||''} onChange={e=>setLine(it.id,'srcPrice',e.target.value)} placeholder="0.00" style={{textAlign:'right'}}/></td>
              <td className="lt" style={{color:conv==null?'var(--g300)':undefined}}>{conv==null?(+it.srcPrice?tr("rate?"):'—'):(CURR[dc]||'')+fmt(conv)}</td>
            </tr>);})}</tbody>
          </table></div>
        </div>);
      })()}
      {isPO&&isGroupDoc(doc)&&(()=>{
        const sh=doc.shipment||{};
        const setSh=(k,v)=>setDoc(d=>({...d,shipment:{...(d.shipment||{}),[k]:v}}));
        const q=latestSQ(doc.sqBase);
        const shipToCustomer=()=>{if(!q)return;const t=q.shipToEnabled&&q.shipTo&&(q.shipTo.company||q.shipTo.address)?q.shipTo:q.client||{};
          setDoc(d=>({...d,dropShip:true,shipToEnabled:true,shipTo:{company:t.company||'',contact:t.contact||'',email:t.email||'',phone:t.phone||'',address:t.address||'',ref:t.ref||''}}));};
        return(<div className="fc"><div className="fct" style={{display:'flex',alignItems:'center',gap:8}}>{tr("Shipment")}<span className="mt-internal">{tr("internal — not printed")}</span></div>
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap',marginBottom:12}}>
            <label className="mt-check" style={{margin:0}}><input type="checkbox" checked={!!doc.dropShip} onChange={e=>set('dropShip',e.target.checked)}/><span>{tr("Shipped directly to the customer")}</span></label>
            {q&&<Btn v="bgh bsm" onClick={shipToCustomer}><Ico n="send"/>{tr("Fill Ship To from {0}",q.number)}</Btn>}
          </div>
          <div className="fg g3">{SHIP_FIELDS.map(([k,l,t])=><Fld key={k} label={tr(l)}><input type={t||'text'} value={sh[k]||''} onChange={e=>setSh(k,e.target.value)} className="fi" placeholder={k==='incoterm'?'EXW, FCA, CPT, DAP…':''}/></Fld>)}</div>
        </div>);
      })()}
      <div className="fc"><div className="fct">{tr("Notes")}</div>
        <Fld label={tr("Notes")}><textarea value={doc.notes||''} onChange={e=>set('notes',e.target.value)} rows={2} className="fi"/></Fld>
        {isPO&&<div style={{marginTop:12}}>
          <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,cursor:'pointer',userSelect:'none'}}>
            <input 
              type="checkbox" 
              checked={doc.signatureEnabled||false}
              onChange={e=>set('signatureEnabled',e.target.checked)}
            />
            <span>{tr("Add Signature to PDF")}</span>
          </label>
        </div>}
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={()=>onSave(savedDoc)}>{tr("Save {0}", lbl)}</Btn></div>
    </div></div>);
  }

  // Projects with detail view
  function ProjectsList(){
    const[pg,setPg]=useState(1);const[ps,setPs]=useState(25);
    return(<div className="content">
      {projects.length===0?<div className="tcard"><div className="empty"><Ico n="project" size={38}/><div className="empty-t">{tr("No projects yet")}</div></div></div>:(
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
                  {p.client&&<div style={{fontSize:12.5,color:'var(--g500)',marginBottom:8}}>{tr("Client: {0}", p.client)}</div>}
                  <div style={{display:'flex',gap:16,fontSize:12}}>
                    <span style={{color:'var(--green)',fontWeight:600}}>{tr("{0} invoices · £{1}", pInv.length, fmt(revenue))}</span>
                    <span style={{color:'var(--amber)',fontWeight:600}}>{tr("{0} POs", pPO.length)}</span>
                    <span style={{color:'var(--purple)',fontWeight:600}}>{tr("{0} expenses", pExp.length)}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <button className="ab" onClick={()=>{setCur(p);go('proj_detail');}}>{tr("View →")}</button>
                  <button className="ab" onClick={()=>{setCur(p);go('proj_form');}}><Ico n="edit"/></button>
                  <button className="ab danger" onClick={()=>askConfirm(tr("Delete \"{0}\"?", p.name),()=>{sProj(projects.filter(x=>x.id!==p.id));showToast(tr('Deleted'));})}><Ico n="trash"/></button>
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

  // Supplies of a project: a received quote, the PO made from it and that PO's received invoice form one chain;
  // its latest document (invoice, else PO, else quote) is the one shown and edited
  const procChains=projName=>{
    const chains=[];
    purchaseQuotes.filter(d=>d.project===projName).forEach(q=>{const o=purchaseOrders.find(p=>p.pqId===q.id)||null;chains.push({pq:q,po:o,ri:(o&&receivedInvoices.find(r=>r.poId===o.id))||null});});
    purchaseOrders.filter(o=>o.project===projName&&!chains.some(c=>c.po&&c.po.id===o.id)).forEach(o=>chains.push({pq:null,po:o,ri:receivedInvoices.find(r=>r.poId===o.id)||null}));
    receivedInvoices.filter(r=>r.project===projName&&!chains.some(c=>c.ri&&c.ri.id===r.id)).forEach(r=>chains.push({pq:null,po:null,ri:r}));
    return chains.map(c=>({...c,lead:c.ri||c.po||c.pq,kind:c.ri?'ri':c.po?'po':'pq'}));
  };
  // Matches (key) or unmatches ('') one supplier line; a customer line is matched once per document
  const setLineMatch=(chain,itemId,base,key)=>{
    const lead={...chain.lead,sqBase:base,items:(chain.lead.items||[]).map(x=>x.id===itemId?{...x,sqKey:key}:(key&&x.sqKey===key?{...x,sqKey:''}:x))};
    const lists={pq:purchaseQuotes,po:purchaseOrders,ri:receivedInvoices};
    lists[chain.kind]=upsert(lists[chain.kind],lead);
    commitProc(syncMatchChain(chain.kind,lead,lists));
    showToast(tr(key?'Matched ✓':'Match removed'));
  };
  const chainDocs=c=>[c.pq&&[tr('RQ'),c.pq.number],c.po&&[tr('PO'),c.po.number],c.ri&&[tr('INV'),c.ri.number]].filter(Boolean);
  const DocChips=({c})=><span style={{display:'inline-flex',gap:4,flexWrap:'wrap'}}>{chainDocs(c).map(([k,n])=><span key={k} className="mt-chip">{n?`${k} ${n}`:k}</span>)}</span>;
  // Customer lines of a project's sales quotations (latest revision of each) with the supplier lines matched to them
  const projMatching=projName=>{
    const chains=procChains(projName);
    const linesFor=(base,key)=>chains.filter(c=>c.lead.sqBase===base).flatMap(c=>(c.lead.items||[]).filter(it=>it.sqKey===key).map(it=>({c,it})));
    const groups=[...new Set(salesQuotes.filter(q=>q.project===projName).map(sqBaseOf))].map(latestSQ).filter(Boolean)
      .map(q=>({q,base:sqBaseOf(q),rows:(q.items||[]).map((it,i)=>({it,i,key:sqItemKey(it),lines:linesFor(sqBaseOf(q),sqItemKey(it))}))}));
    const all=groups.flatMap(g=>g.rows);
    return{chains,groups,total:all.length,done:all.filter(r=>r.lines.length).length};
  };
  // Kept outside the page so its search and filter survive the re-render that follows each match
  const matchFilterRef=useRef({q:'',show:'',tab:'match'});
  // Money along one customer line's supply chain, in the quotation currency. A line bought from a group company costs the
  // group its source price; one bought directly costs what Green Med paid. Margins stay null when a needed figure is
  // missing (no match, no source price or rate) or a supplier invoiced in another currency than the quotation.
  const lineEconomics=(q,row)=>{
    const sale=+(row.it.qty||0)*+(row.it.price||0);
    const qc=q.currency||'GBP';
    if(!row.lines.length)return{sale,matched:false};
    if(row.lines.some(({c})=>(c.lead.currency||'GBP')!==qc))return{sale,matched:true,otherCur:true};
    let buy=0,groupCost=0,coMargin=0,hasGroup=false,complete=true;
    row.lines.forEach(({c,it:s})=>{
      const amt=+(s.qty||0)*+(s.price||0);buy+=amt;
      if(isGroupDoc(c.lead)){hasGroup=true;const u=srcInDocCur(c.lead,s);if(u==null){complete=false;return;}const src=+(s.qty||0)*u;groupCost+=src;coMargin+=amt-src;}
      else groupCost+=amt;
    });
    return{sale,matched:true,buy,gm:sale-buy,hasGroup,groupCost:complete?groupCost:null,co:hasGroup&&complete?coMargin:null,group:complete?sale-groupCost:null};
  };

  // Item Matching page of a project (opened from the project detail header)
  function ItemMatching({project}){
    const[pick,setPick]=useState(null); // customer line being matched: {base,key,label}
    const[sel,setSel]=useState('');
    const[f,setF]=useState(matchFilterRef.current);
    const tab=f.tab||'match';
    const setFilter=p=>{const n={...f,...p};matchFilterRef.current=n;setF(n);};
    useEscape(()=>setPick(null),!!pick);
    const{chains,groups,total,done}=projMatching(project.name);
    const cands=pick?chains.filter(c=>!c.lead.sqBase||c.lead.sqBase===pick.base).flatMap(c=>(c.lead.items||[]).map(it=>({c,it}))):[];
    const lineNo=(base,key)=>{const q=latestSQ(base);const i=q?(q.items||[]).findIndex(x=>sqItemKey(x)===key):-1;return i<0?null:'#'+(i+1);};
    const ql=f.q.trim().toLowerCase();
    // Excel of the open tab with the current search/filter: one row per supplier line (Matching) or per customer
    // line (Supply Chain & Margins); amounts are written as numbers so they can be summed in Excel
    const exportMatching=()=>{
      const docNo=c=>chainDocs(c).map(([k,n])=>n?k+' '+n:k).join(' · ');
      const slug=(project.number||project.name||'project').toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const num=v=>v==null?'':Math.round(v*100)/100;
      if(tab==='chain'){
        const head=['Quotation','#','Customer Item','Qty','Unit','Sale Currency','Sale','Bought From','Green Med Cost','Source Supplier','Source Invoice No','Source Currency','Source Cost','Source Cost (sale currency)','Green Med Margin','Group Co. Margin','Group Margin','Ship Date','Incoterm','Carrier','AWB / BL No','Customs Declaration (GÇB) No'];
        const rows=groups.flatMap(({q,rows})=>rows.filter(visible).map(r=>{
          const e=lineEconomics(q,r);const L=r.lines;const join=fn=>L.map(fn).filter(Boolean).join('; ');
          const grp=L.filter(({c})=>isGroupDoc(c.lead));
          const srcTot=grp.length&&grp.every(({c,it})=>+it.srcPrice)?grp.reduce((s,{it})=>s+(+(it.qty||0))*(+it.srcPrice),0):null;
          const srcConv=grp.length?grp.reduce((s,{c,it})=>{const u=srcInDocCur(c.lead,it);return s==null||u==null?null:s+(+(it.qty||0))*u;},0):null;
          const sh=fn=>join(({c})=>c.po&&c.po.shipment&&c.po.shipment[fn]);
          return[q.number,r.i+1,sqLineText(r.it),+(r.it.qty||0),r.it.unit||'',q.currency||'GBP',num(e.sale),join(({c})=>c.lead.supplierCompany),num(e.buy),
            join(({it})=>it.srcSupplier),join(({it})=>it.srcDocNo),grp.length?srcCur(grp[0].c.lead):'',num(srcTot),num(srcConv),num(e.gm),num(e.co),num(e.group),
            sh('date'),sh('incoterm'),sh('carrier'),sh('awb'),sh('gcb')];
        }));
        exportExcel([head,...rows],`supply-chain-${slug}`);return;
      }
      const head=['Quotation','#','Supplier','Customer Item','Source Supplier','Supplier Item','Qty','Unit','Sale Price','Sale Currency','Purchase Price','Purchase Currency','Documents'];
      const rows=groups.flatMap(({q,rows})=>rows.filter(visible).flatMap(r=>{
        const base=[q.number,r.i+1];const sale=[+(r.it.qty||0),r.it.unit||'',+(r.it.price||0),q.currency||'GBP'];
        if(!r.lines.length)return[[...base,'Not matched',sqLineText(r.it),'','',...sale,'','','']];
        return r.lines.map(({c,it:s})=>[...base,c.lead.supplierCompany||'',sqLineText(r.it),s.srcSupplier||'',s.desc||s.item||'',...sale,+(s.price||0),c.lead.currency||'GBP',docNo(c)]);
      }));
      exportExcel([head,...rows],`item-matching-${slug}`);
    };
    const money=(cur,v)=>v==null?<span style={{color:'var(--g300)'}}>—</span>:<span style={{color:v<0?'var(--red)':undefined}}>{v<0?'-':''}{CURR[cur]||''}{fmt(Math.abs(v))}</span>;
    const marginCell=(cur,v,sale)=>v==null?money(cur,null):<div>{money(cur,v)}{sale>0&&<div className="mt-pct">{(v/sale*100).toFixed(1)}%</div>}</div>;
    // Supply chain tab: what each customer line sells for, what it cost Green Med and the group, and how it shipped
    const renderChain=()=>{
      const tot={};
      groups.forEach(({q,rows})=>rows.forEach(r=>{const e=lineEconomics(q,r);const k=q.currency||'GBP';const t=tot[k]||(tot[k]={sale:0,saleDone:0,buy:0,groupCost:0,gm:0,co:0,group:0,open:0});
        t.sale+=e.sale;if(e.gm==null||e.group==null){t.open++;return;}t.saleDone+=e.sale;t.buy+=e.buy;t.groupCost+=e.groupCost;t.gm+=e.gm;t.co+=e.co||0;t.group+=e.group;}));
      return(<>
        {Object.entries(tot).map(([cur,t])=><div key={cur} className="mt-sum">
          {/* Every figure covers the same lines (those with a complete chain); the project's full sales value is noted under Sales */}
          {[[tr('Sales'),t.saleDone,0,t.open?tr('of {0} in total',(CURR[cur]||'')+fmt(t.sale)):''],[tr('Green Med Cost'),t.buy],[tr('Group Cost'),t.groupCost],[tr('Green Med Margin'),t.gm,1],[tr('Group Co. Margin'),t.co,1],[tr('Group Margin'),t.group,1]].map(([l,v,m,sub])=>
            <div key={l} className="mt-sum-c"><div className="mt-sum-l">{l}</div><div className="mt-sum-v" style={{color:m&&v<0?'var(--red)':m?'var(--gm-600)':undefined}}>{v<0?'-':''}{CURR[cur]||''}{fmt(Math.abs(v))}</div>{m?(t.saleDone>0&&<div className="mt-pct">{(v/t.saleDone*100).toFixed(1)}%</div>):(sub&&<div className="mt-pct">{sub}</div>)}</div>)}
          {t.open>0&&<div className="mt-sum-note">{tr("{0} line(s) left out: not matched, missing source price/rate or invoiced in another currency",t.open)}</div>}
        </div>)}
        {groups.map(({q,base,rows})=>{const qc=q.currency||'GBP';const shown=rows.filter(visible);return(<div key={base} style={{marginBottom:16}}>
          <div className="tcard-hdr" style={{background:'var(--white)',borderRadius:'var(--r) var(--r) 0 0',border:'1px solid var(--g200)',borderBottom:'none'}}>
            <div className="tcard-hdr-t">{q.number} · {(q.client&&(q.client.company||q.client.contact))||'—'}</div>
          </div>
          <div className="tcard"><table className="dt mt-tbl mt-wrap">
            <Cg w={[0.35,1.9,1.05,1.55,2.2,1.05,1.05,1.05,2]}/>
            <thead><tr><th>#</th><th>{tr("Customer Item")}</th><th className="tar">{tr("Sale")}</th><th>{tr("Bought From")}</th><th>{tr("Source")}</th><th className="tar">{tr("Green Med Margin")}</th><th className="tar">{tr("Group Co. Margin")}</th><th className="tar">{tr("Group Margin")}</th><th>{tr("Shipment")}</th></tr></thead>
            <tbody>{shown.length===0?<tr><td colSpan={9}><div className="empty" style={{padding:'24px 12px'}}><div className="empty-t">{tr("No items match the filter")}</div></div></td></tr>:
            shown.map(r=>{const e=lineEconomics(q,r);return(<tr key={r.key}>
              <td style={{color:'var(--g500)'}}>{r.i+1}</td>
              <td style={{color:'var(--g900)',fontWeight:500}}>{sqLineText(r.it)}<div className="mt-pct">{r.it.qty} {r.it.unit||''} × {CURR[qc]||''}{fmt(+(r.it.price||0))}</div></td>
              <td className="tar">{money(qc,e.sale)}</td>
              <td>{r.lines.length?r.lines.map(({c,it:s})=><div key={c.lead.id+s.id} className="mt-cell">
                  <b>{c.lead.supplierCompany||'—'}</b>{isGroupDoc(c.lead)&&<span className="mt-tag ok" style={{marginLeft:5}}>{tr("Group")}</span>}
                  <div>{CURR[c.lead.currency]||''}{fmt(+(s.qty||0)*+(s.price||0))}</div></div>):<span className="mt-none">{tr("Not matched")}</span>}</td>
              <td>{r.lines.map(({c,it:s})=>{if(!isGroupDoc(c.lead))return <div key={c.lead.id+s.id} className="mt-cell" style={{color:'var(--g400)'}}>{tr("direct purchase")}</div>;
                const u=srcInDocCur(c.lead,s);return(<div key={c.lead.id+s.id} className="mt-cell">
                  {s.srcSupplier?<b>{s.srcSupplier}</b>:<span className="mt-none">{tr("Source missing")}</span>}{s.srcDocNo&&<span style={{color:'var(--g500)'}}> · {s.srcDocNo}</span>}
                  <div>{+s.srcPrice?<>{CURR[srcCur(c.lead)]||''}{fmt(+(s.qty||0)*+s.srcPrice)}{u!=null&&srcCur(c.lead)!==(c.lead.currency||'GBP')&&<span style={{color:'var(--g500)'}}> ≈ {CURR[c.lead.currency]||''}{fmt(+(s.qty||0)*u)}</span>}{u==null&&<span className="mt-none"> · {tr("rate missing")}</span>}</>:<span style={{color:'var(--g300)'}}>—</span>}</div></div>);})}</td>
              <td className="tar" title={e.otherCur?tr('Invoiced in another currency'):''}>{marginCell(qc,e.gm,e.sale)}</td>
              <td className="tar">{e.hasGroup?marginCell(qc,e.co,e.sale):money(qc,null)}</td>
              <td className="tar">{marginCell(qc,e.group,e.sale)}</td>
              <td>{r.lines.map(({c,it:s})=>{const sh=(c.po&&c.po.shipment)||{};const any=sh.date||sh.gcb||sh.awb||sh.carrier||sh.incoterm;return(<div key={c.lead.id+s.id} className="mt-cell">
                  {any?<>{sh.date&&<b>{sh.date}</b>}{c.po.dropShip&&<span className="mt-tag ok" style={{marginLeft:5}}>{tr("Direct")}</span>}
                    <div style={{color:'var(--g500)',fontSize:11}}>{[sh.incoterm,sh.carrier,sh.awb&&('AWB/BL '+sh.awb),sh.gcb&&('GÇB '+sh.gcb)].filter(Boolean).join(' · ')}</div></>
                  :<span style={{color:'var(--g300)'}}>{c.po?tr('not shipped yet'):'—'}</span>}</div>);})}</td>
            </tr>);})}</tbody>
          </table></div>
        </div>);})}
      </>);
    };
    const visible=r=>(f.show!=='open'||!r.lines.length)&&(f.show!=='done'||r.lines.length)
      &&(!ql||[sqLineText(r.it),...r.lines.flatMap(({c,it})=>[c.lead.supplierCompany,it.desc,it.item,it.srcSupplier])].some(x=>(x||'').toLowerCase().includes(ql)));
    return(<div className="content">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={()=>go('proj_detail')} className="mt-back"><Ico n="back"/>{project.number||tr("Project")}</button>
        <h2 style={{fontSize:17,fontWeight:700,color:'var(--g900)'}}>{tr("Item Matching")} — {project.name}</h2>
        {total>0&&<span className={done===total?'mt-count ok':'mt-count'}>{tr("{0} / {1} matched",done,total)}</span>}
      </div>
      {groups.length===0?<div className="tcard"><div className="empty"><Ico n="link" size={36}/><div className="empty-t">{tr("No sales quotations in this project")}</div><div className="empty-s">{tr("Customer items appear here once a sales quotation is saved with this project.")}</div></div></div>:<>
      <div className="st-tabs" role="tablist" style={{marginBottom:14}}>
        {[['match',tr('Matching')],['chain',tr('Supply Chain & Margins')]].map(([k,l])=><button key={k} role="tab" aria-selected={tab===k} className={'st-tab'+(tab===k?' active':'')} onClick={()=>setFilter({tab:k})}>{l}</button>)}
      </div>
      <ListTools q={f.q} onQ={v=>setFilter({q:v})} placeholder={tr("Search customer or supplier item...")} active={[f.show].filter(Boolean).length} onClear={()=>setFilter({show:''})} onExport={exportMatching}>
        <FilterField label={tr("Show")}><select value={f.show} onChange={e=>setFilter({show:e.target.value})}>
          <option value="">{tr("All items")}</option><option value="open">{tr("Not matched")}</option><option value="done">{tr("Matched")}</option>
        </select></FilterField>
      </ListTools>
      {tab==='chain'?renderChain():groups.map(({q,base,rows})=>{
        const sym=CURR[q.currency]||'£';
        const shown=rows.filter(visible);
        const gDone=rows.filter(r=>r.lines.length).length;
        return(<div key={base} style={{marginBottom:16}}>
          <div className="tcard-hdr" style={{background:'var(--white)',borderRadius:'var(--r) var(--r) 0 0',border:'1px solid var(--g200)',borderBottom:'none'}}>
            <div className="tcard-hdr-t">{q.number} · {(q.client&&(q.client.company||q.client.contact))||'—'}</div>
            <span className={gDone===rows.length?'mt-count ok':'mt-count'}>{tr("{0} / {1} matched",gDone,rows.length)}</span>
          </div>
          <div className="tcard"><table className="dt mt-tbl mt-wrap">
            <Cg w={[0.45,1.6,2.1,1.5,2.1,0.8,1,1.05,1.75,0.75]}/>
            <thead><tr><th>#</th><th>{tr("Supplier")}</th><th>{tr("Customer Item")}</th><th>{tr("Source Supplier")}</th><th>{tr("Supplier Item")}</th><th className="tar">{tr("Qty")}</th><th className="tar">{tr("Sale Price")}</th><th className="tar">{tr("Purchase Price")}</th><th>{tr("Documents")}</th><th/></tr></thead>
            <tbody>{shown.length===0?<tr><td colSpan={10}><div className="empty" style={{padding:'24px 12px'}}><div className="empty-t">{tr("No items match the filter")}</div></div></td></tr>:
            shown.flatMap(({it,i,key,lines})=>{
              // One row per matched supplier line; the customer's columns (#, item, qty, sale price) span them
              const n=Math.max(1,lines.length);
              const matchBtn=<button className="ab" title={tr("Match")} aria-label={tr("Match")} onClick={()=>{setSel('');setPick({base,key,label:`#${i+1} ${sqLineText(it)}`});}}><Ico n="link"/></button>;
              const dash=<span style={{color:'var(--g300)'}}>—</span>;
              const num=<td key="n" rowSpan={n} style={{color:'var(--g500)'}}>{i+1}</td>;
              const item=<td key="d" rowSpan={n} style={{color:'var(--g900)',fontWeight:500}}>{sqLineText(it)}</td>;
              const qp=[<td key="q" rowSpan={n} className="tar">{it.qty} {it.unit||''}</td>,<td key="p" rowSpan={n} className="tar">{sym}{fmt(+(it.price||0))}</td>];
              if(!lines.length)return[<tr key={key}>{num}<td><span className="mt-none">{tr("Not matched")}</span></td>{item}<td>{dash}</td><td>{dash}</td>{qp}<td className="tar">{dash}</td><td>{dash}</td><td><div className="aw">{matchBtn}</div></td></tr>];
              return lines.map(({c,it:s},j)=><tr key={key+c.lead.id+s.id} className={j>0?'mt-sub':''}>
                {j===0&&num}
                <td style={{color:'var(--g900)',fontWeight:500}}>{c.lead.supplierCompany||'—'}</td>
                {j===0&&item}
                <td>{s.srcSupplier?<span style={{color:'var(--g800)'}}>{s.srcSupplier}</span>:dash}</td>
                <td>{s.desc||s.item||'—'}</td>
                {j===0&&qp}
                <td className="tar">{CURR[c.lead.currency]||'£'}{fmt(+(s.price||0))}</td>
                <td><DocChips c={c}/></td>
                <td><div className="aw">{j===0&&matchBtn}<button className="ab danger" title={tr("Remove match")} aria-label={tr("Remove match")} onClick={()=>setLineMatch(c,s.id,base,'')}><Ico n="x"/></button></div></td>
              </tr>);
            })}</tbody>
          </table></div>
        </div>);
      })}</>}
      {pick&&<div className="mt-overlay" onClick={()=>setPick(null)}>
        <div className="mt-dialog" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}>
          <div className="mt-dialog-h">
            <div><div className="mt-dialog-k">{tr("Match supplier line to")}</div><div className="mt-dialog-t">{pick.label}</div></div>
            <button className="ab" onClick={()=>setPick(null)} aria-label={tr("Close")}><Ico n="x"/></button>
          </div>
          <div className="mt-dialog-b">
            {cands.length===0?<div className="empty"><div className="empty-t">{tr("No supplier documents in this project")}</div><div className="empty-s">{tr("Enter the received quote with this project selected, then match its lines here or in the quote itself.")}</div></div>:
            cands.map(({c,it})=>{const v=c.lead.id+'|'+it.id;const other=it.sqKey&&it.sqKey!==pick.key&&c.lead.sqBase===pick.base?lineNo(pick.base,it.sqKey):null;return(
              <label key={v} className={'mt-cand'+(sel===v?' on':'')}>
                <input type="radio" name="mt-cand" checked={sel===v} onChange={()=>setSel(v)}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{color:'var(--g900)'}}><b>{c.lead.supplierCompany||'—'}</b> · {it.desc||it.item||'—'}</div>
                  <div style={{display:'flex',gap:8,alignItems:'center',marginTop:3,flexWrap:'wrap'}}><DocChips c={c}/><span style={{fontSize:11,color:'var(--g500)'}}>{it.qty} {it.unit||''} · {CURR[c.lead.currency]||'£'}{fmt(+(it.price||0))}</span>
                    {it.sqKey===pick.key&&c.lead.sqBase===pick.base&&<span className="mt-tag ok">{tr("matched to this item")}</span>}
                    {other&&<span className="mt-tag">{tr("matched to {0}",other)}</span>}</div>
                </div>
              </label>);})}
          </div>
          <div className="mt-dialog-f">
            <Btn v="bgh bsm" onClick={()=>setPick(null)}>{tr("Cancel")}</Btn>
            <Btn v="bp bsm" disabled={!sel} onClick={()=>{const[docId,itemId]=sel.split('|');const ch=cands.find(x=>x.c.lead.id===docId).c;setPick(null);setLineMatch(ch,itemId,pick.base,pick.key);}}>{tr("Match")}</Btn>
          </div>
        </div>
      </div>}
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
        <button onClick={()=>go('projects')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Ico n="back"/>{tr("Projects")}</button>
        <h2 style={{fontSize:17,fontWeight:700,color:'var(--g900)'}}>{project.number?`${project.number} — `:''}  {project.name}</h2>
        <Badge s={project.status||'active'}/>
        {(()=>{const m=projMatching(project.name);return <button className="mt-open" onClick={()=>{setCur(project);go('proj_matching');}}><Ico n="link"/>{tr("Item Matching")}{m.total>0&&<span className={m.done===m.total?'mt-count ok':'mt-count'}>{m.done}/{m.total}</span>}</button>;})()}
        <div style={{flex:1}}/>
        <button className="ab" onClick={()=>{setCur(project);go('proj_form');}}><Ico n="edit"/>{tr("Edit Project")}</button>
      </div>
      {/* Stats */}
      <div className="stats" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[{lbl:tr('Revenue'),val:`£${fmt(revenue)}`,sub:tr("{0} invoices", pI.length),cls:'sc-green'},{lbl:tr('PO Costs'),val:`£${fmt(poTotal)}`,sub:tr("{0} orders", pPO.length),cls:'sc-blue'},{lbl:tr('Expenses'),val:`£${fmt(expTotal)}`,sub:tr("{0} items", pExp.length),cls:'sc-purple'},{lbl:tr('Net'),val:`£${fmt(revenue-poTotal-expTotal)}`,sub:tr('revenue - costs'),cls:revenue-poTotal-expTotal>=0?'sc-teal':'sc-red'}].map(s=><div key={s.lbl} className={`stat-card ${s.cls}`}><div className="stat-val">{s.val}</div><div className="stat-lbl">{s.lbl}</div><div className="stat-sub">{s.sub}</div></div>)}
      </div>
      {/* Sections */}
      {(()=>{
        const dateCol={k:'date',l:tr('Date'),get:d=>d.date,show:d=>d.date};
        const noCol=l=>({k:'no',l,get:d=>d.number,show:d=>d.number,strong:true});
        const totalCol={k:'total',l:tr('Total'),get:d=>dt(d.items||[]),show:d=>`£${fmt(dt(d.items||[]))}`};
        const statusCol={k:'status',l:tr('Status'),get:d=>d.status,show:d=><Badge s={d.status}/>};
        return[
          {title:'Sales Quotations',items:pQ,w:[0.8,1,0.9,0.9],cols:[dateCol,noCol(tr('Quote No')),totalCol,statusCol]},
          {title:'Sales Invoices',items:pI,w:[0.8,1,0.9,0.9],cols:[dateCol,noCol(tr('Invoice No')),totalCol,statusCol]},
          {title:'Purchase Orders',items:pPO,w:[0.8,1,2,0.9,0.9],cols:[dateCol,noCol(tr('PO No')),{k:'supplier',l:tr('Supplier'),get:d=>d.supplier,show:d=>d.supplier},totalCol,statusCol]},
          {title:'Expenses',items:pExp,w:[0.8,1,2,0.9],cols:[dateCol,{k:'category',l:tr('Category'),get:e=>e.category,show:e=>e.category},{k:'desc',l:tr('Description'),get:e=>e.description,show:e=>e.description},
            {k:'amount',l:tr('Amount'),get:e=>+(e.amount||0),show:e=>`${CURR[e.currency]||'£'}${fmt(+(e.amount||0))}`}]},
        ].map(s=><ProjDocTable key={s.title} {...s}/>);
      })()}
    </div>);
  }

  // Project Form
  function ProjectForm({proj:init,onSave,onCancel}){
    const[p,setP]=useState(init);const s=(k,v)=>setP(d=>({...d,[k]:v}));
    const _initStr=useRef(JSON.stringify(init));
    const _isDirty=()=>JSON.stringify(p)!==_initStr.current;
    const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=_isDirty;
    const handleSave=async()=>{
      const norm={...p,name:toTitleCase(p.name),client:toTitleCase(p.client),desc:toSentenceCase(p.desc)};
      const dup=findCaseInsensitiveDup(projects,'name',norm.name,norm.id);
      if(dup&&!(await askDuplicateOk('project',norm.name)))return;
      onSave(norm);
    };
    const custPick=customers.filter(c=>{const t=c.type||'customer';return t==='customer'||t==='both';});
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{p.id?tr('Edit Project'):tr('New Project')}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
      <div className="fc"><div className="fct">{tr("Project Details")}</div>
        <div className="fg g-no-name"><Fld label={tr("Project No")}><input value={p.number||''} onChange={e=>s('number',e.target.value)} className="fi" readOnly={!!p.id&&!!p.number} style={p.id?{fontFamily:'monospace',fontWeight:700}:{}}/></Fld><Fld label={tr("Project Name")}><input value={p.name||''} onChange={e=>s('name',e.target.value)} className="fi"/></Fld></div>
        <div className="fg g-2-1-1" style={{marginTop:12}}>
          <Fld label={tr("Client")}><select value={p.clientId||''} onChange={e=>{s('clientId',e.target.value);const c=custPick.find(x=>x.id===e.target.value);if(c)s('client',c.company||c.contact||'');}} className="fi"><option value="">{tr("— Select customer —")}</option>{custPick.map(c=><option key={c.id} value={c.id}>{c.company||c.contact||''}</option>)}</select></Fld>
          <Fld label={tr("Start Date")}><input type="date" value={p.startDate||''} onChange={e=>s('startDate',e.target.value)} className="fi"/></Fld>
          <Fld label={tr("Status")}><select value={p.status||'active'} onChange={e=>s('status',e.target.value)} className="fi"><option value="active">{tr("Active")}</option><option value="completed">{tr("Completed")}</option><option value="on-hold">{tr("On Hold")}</option><option value="cancelled">{tr("Cancelled")}</option></select></Fld>
        </div>
        <div className="fg g-budget" style={{marginTop:12}}>
          <Fld label={tr("Budget")}><input type="number" value={p.budget||''} onChange={e=>s('budget',e.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld>
          <Fld label={tr("Budget Currency")}><select value={p.currency||'GBP'} onChange={e=>s('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld>
        </div>
        <div style={{marginTop:12}}><Fld label={tr("Description")}><textarea value={p.desc||''} onChange={e=>s('desc',e.target.value)} rows={3} className="fi"/></Fld></div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
    </div></div>);
  }

  // Product Pool
  function ProductPoolView(){
    const[q,setQ]=useState('');
    const[dateFrom,setDateFrom]=useState('');
    const[dateTo,setDateTo]=useState('');
    const[editingItem,setEditingItem]=useState(null);
    const[tempPrice,setTempPrice]=useState('');
    const{sort,onSort}=useSort();
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify({q,dateFrom,dateTo,sort}));

    const openPriceModal=(item)=>{setEditingItem(item);setTempPrice(item.purchasePrice||'');};
    const closeModal=()=>{setEditingItem(null);setTempPrice('');};
    useEscape(closeModal,!!editingItem);
    const savePurchasePrice=()=>{
      if(editingItem){sPP(editingItem.id,tempPrice);setEditingItem(null);setTempPrice('');showToast(tr('Purchase price saved ✓'));}
    };

    const filtered=poolItems.filter(p=>{
      if(q&&![p.name,p.code,p.projectId,p.customer].some(x=>(x||'').toLowerCase().includes(q.toLowerCase())))return false;
      if(dateFrom&&p.date<dateFrom)return false;
      if(dateTo&&p.date>dateTo)return false;
      return true;
    });
    const sorted=sortRows(filtered,sort,{date:p=>p.date,no:p=>p.quoteNum,code:p=>p.code,name:p=>p.name,qty:p=>+(p.qty||0),price:p=>+(p.price||0),
      purchasePrice:p=>+(p.purchasePrice||0),project:p=>p.projectId,customer:p=>p.customer});
    return(<div className="content">
      <ListTools q={q} onQ={setQ} placeholder={tr("Search item, customer, project...")} active={[dateFrom,dateTo].filter(Boolean).length} onClear={()=>{setDateFrom('');setDateTo('');}} extra={<><span className="lt-note">{tr("{0} items", filtered.length)}</span></>}>
        <FilterField label={tr("From")}><input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></FilterField>
        <FilterField label={tr("To")}><input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}/></FilterField>
      </ListTools>
      <div style={{fontSize:11,color:'var(--g400)',fontStyle:'italic',padding:'2px 2px 8px'}}>{tr("All items from Sent quotations appear automatically. Amber rows = same item quoted to same customer more than once.")}</div>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="pool" size={38}/><div className="empty-t">{tr("Pool is empty")}</div><div className="empty-s">{tr("Mark quotations as Sent to populate the pool")}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={[0.8,1,1,2,0.6,0.9,0.9,1,2,0.6]}/>
          <thead><tr>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
            <SortTh k="no" sort={sort} onSort={onSort}>{tr("Quote No")}</SortTh>
            <SortTh k="code" sort={sort} onSort={onSort}>{tr("Code")}</SortTh>
            <SortTh k="name" sort={sort} onSort={onSort}>{tr("Description")}</SortTh>
            <SortTh k="qty" sort={sort} onSort={onSort} className="tar">{tr("Qty")}</SortTh>
            <SortTh k="price" sort={sort} onSort={onSort} className="tar">{tr("Sale Price")}</SortTh>
            <SortTh k="purchasePrice" sort={sort} onSort={onSort} className="tar">{tr("Purchase Price")}</SortTh>
            <SortTh k="project" sort={sort} onSort={onSort}>{tr("Project")}</SortTh>
            <SortTh k="customer" sort={sort} onSort={onSort}>{tr("Customer")}</SortTh>
            <th>{tr("Actions")}</th>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(p=>{
            const isDup=sorted.some(x=>x.id!==p.id&&x.customer===p.customer&&x.name.toLowerCase().trim()===p.name.toLowerCase().trim());
            return(<tr key={p.id} style={isDup?{background:'#fff7ed',borderLeft:'3px solid var(--amber)'}:{}}>
              <td style={{color:'var(--g500)',fontSize:12,whiteSpace:'nowrap'}}>{p.date||'—'}</td>
              <td><span style={{fontFamily:'Inter',fontSize:11,color:'var(--gm-500)'}}>{p.quoteNum||'—'}</span></td>
              <td style={{fontFamily:'monospace',fontSize:11,whiteSpace:'nowrap'}}>{p.code||'—'}</td>
              <td style={{maxWidth:'300px',wordBreak:'break-word',whiteSpace:'normal',lineHeight:1.4}}>{p.name||'—'}</td>
              <td className="tar">{p.qty} {p.unit||''}</td>
              <td className="tar" style={{fontWeight:600}}>£{fmt(+(p.price||0))}</td>
              <td className="tar" style={{color:p.purchasePrice?'var(--g900)':'var(--g400)'}}>
                {p.purchasePrice?`£${fmt(+(p.purchasePrice||0))}`:'—'}
              </td>
              <td style={{color:'var(--g500)',fontSize:12}}>{p.projectId||'—'}</td>
              <td style={{fontWeight:500,color:isDup?'var(--amber)':'var(--g900)'}}>{p.customer||'—'}</td>
              <td><button className="ab" onClick={()=>openPriceModal(p)} title={tr("Set Purchase Price")}><Ico n="edit"/></button></td>
            </tr>);
          })}</tbody>
        </table><Pagination total={sorted.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}

      {editingItem&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:9999}} onClick={closeModal}>
        <div style={{background:'var(--white)',borderRadius:12,padding:24,width:'90%',maxWidth:420,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <h3 style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{tr("Set Purchase Price")}</h3>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:13,fontWeight:600,color:'var(--g700)',marginBottom:2}}>{editingItem.name}</div>
            <div style={{fontSize:12,color:'var(--g500)'}}>{tr("{0} · {1} · Sale: £{2}", editingItem.customer||'—', editingItem.quoteNum||'—', fmt(+(editingItem.price||0)))}</div>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g700)',marginBottom:6}}>{tr("Purchase Price (£)")}</label>
            <input type="number" value={tempPrice} onChange={e=>setTempPrice(e.target.value)} placeholder="0.00" min="0" step="0.01" autoFocus onKeyDown={e=>{if(e.key==='Enter')savePurchasePrice();if(e.key==='Escape')closeModal();}} style={{width:'100%',padding:'10px 12px',fontSize:14,fontWeight:600,border:'1px solid var(--g300)',borderRadius:8,fontFamily:'inherit'}}/>
          </div>
          <div style={{display:'flex',gap:8,justifyContent:'flex-end'}}>
            <button onClick={closeModal} style={{padding:'8px 16px',fontSize:13,fontWeight:600,border:'1px solid var(--g300)',borderRadius:7,background:'var(--white)',color:'var(--g700)',cursor:'pointer'}}>{tr("Cancel")}</button>
            <button onClick={savePurchasePrice} style={{padding:'8px 16px',fontSize:13,fontWeight:600,border:'none',borderRadius:7,background:'linear-gradient(135deg,var(--btn),var(--btn-hover))',color:'var(--white)',cursor:'pointer'}}>{tr("Save Price")}</button>
          </div>
        </div>
      </div>}
    </div>);
  }

  // Expenses
  function ExpensesView(){
    const[fs,setFs]=useState({q:'',cat:'',p:'',dateFrom:'',dateTo:''});
    const{sort,onSort}=useSort();
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(fs)+JSON.stringify(sort));
    const filtered=expenses.filter(e=>{
      if(fs.q&&![e.description,e.employee].some(x=>(x||'').toLowerCase().includes(fs.q.toLowerCase())))return false;
      if(fs.cat&&e.category!==fs.cat)return false;
      if(fs.p&&e.project!==fs.p)return false;
      if(fs.dateFrom&&e.date<fs.dateFrom)return false;
      if(fs.dateTo&&e.date>fs.dateTo)return false;
      return true;
    });
    // Fed newest-first so expenses with the same date and no reference keep their newest-added-first order
    const sorted=sortRows([...filtered].reverse(),sort,{date:e=>e.date,no:e=>e.reference,employee:e=>e.employee,category:e=>e.category,desc:e=>e.description,project:e=>e.project,amount:e=>+(e.amount||0)});
    const total=filtered.reduce((s,e)=>s+(+(e.amount||0)),0);
    const allCats=[...new Set(expenses.map(e=>e.category).filter(Boolean))];
    return(<div className="content">
      <ListTools q={fs.q} onQ={v=>setFs(f=>({...f,q:v}))} placeholder={tr("Search...")} active={[fs.cat,fs.p,fs.dateFrom,fs.dateTo].filter(Boolean).length} onClear={()=>setFs(f=>({...f,cat:'',p:'',dateFrom:'',dateTo:''}))} onExport={()=>exportExcel([['Date','Employee','Category','Description','Reference','Amount','Currency','Project'],...sorted.map(e=>[e.date,e.employee,e.category,e.description,e.reference,e.amount,e.currency,e.project])],'expenses')} extra={<>{filtered.length>0&&<span className="lt-note">{tr("Total: £{0}", fmt(total))}</span>} <button className="lt-btn" onClick={()=>go('exp_import')}>{tr("Import Excel")}</button></>}>
        <FilterField label={tr("Category")}><select value={fs.cat} onChange={e=>setFs(f=>({...f,cat:e.target.value}))}>
          <option value="">{tr("All Categories")}</option>{allCats.map(c=><option key={c} value={c}>{c}</option>)}
        </select></FilterField>
        <FilterField label={tr("Project")}><select value={fs.p} onChange={e=>setFs(f=>({...f,p:e.target.value}))}>
          <option value="">{tr("All Projects")}</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
        </select></FilterField>
        <FilterField label={tr("From")}><input type="date" value={fs.dateFrom} onChange={e=>setFs(f=>({...f,dateFrom:e.target.value}))}/></FilterField>
        <FilterField label={tr("To")}><input type="date" value={fs.dateTo} onChange={e=>setFs(f=>({...f,dateTo:e.target.value}))}/></FilterField>
      </ListTools>
      {filtered.length===0?<div className="tcard"><div className="empty"><Ico n="expense" size={38}/><div className="empty-t">{tr("No expenses yet")}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={[0.8,1.2,1,2.4,1.2,0.9,0.6]}/>
          <thead><tr>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Date")}</SortTh>
            <SortTh k="employee" sort={sort} onSort={onSort}>{tr("Employee")}</SortTh>
            <SortTh k="category" sort={sort} onSort={onSort}>{tr("Category")}</SortTh>
            <SortTh k="desc" sort={sort} onSort={onSort}>{tr("Description")}</SortTh>
            <SortTh k="project" sort={sort} onSort={onSort}>{tr("Project")}</SortTh>
            <SortTh k="amount" sort={sort} onSort={onSort} className="tar">{tr("Amount")}</SortTh>
            <th>{tr("Actions")}</th>
          </tr></thead>
          <tbody>{sorted.slice((pg-1)*ps,pg*ps).map(e=><tr key={e.id}>
            <td style={{color:'var(--g500)',fontSize:12}}>{e.date}</td>
            <td style={{color:'var(--g700)'}}>{e.employee||'—'}</td>
            <td>{e.category?<span style={{background:'var(--purplel)',color:'var(--purple)',padding:'2px 7px',borderRadius:10,fontSize:11,fontWeight:600}}>{e.category}</span>:'—'}</td>
            <td style={{fontWeight:500,color:'var(--g800)'}}>{e.description||'—'}</td>
            <td style={{color:'var(--g500)',fontSize:12}}>{e.project||'—'}</td>
            <td className="tar" style={{fontWeight:700}}>{CURR[e.currency]||'£'}{fmt(+(e.amount||0))}</td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{setCur(e);go('exp_form');}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm(tr('Delete this expense?'),()=>{sExp(expenses.filter(x=>x.id!==e.id));showToast(tr('Deleted'));})}><Ico n="trash"/></button>
            </div></td>
          </tr>)}</tbody>
        </table><Pagination total={filtered.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}
    </div>);
  }

  // Bulk Expense Import — staff (often abroad) send a monthly expense sheet; this previews
  // the parsed rows (category/project matched against existing lists, likely duplicates
  // pre-unchecked) so nothing posts to the ledger without a look, then commits on demand.
  function ExpenseImportView(){
    const[rows,setRows]=useState(null);
    const fileRef=useRef();
    const allCatNames=expCats.map(c=>typeof c==='string'?c:c.name);
    const allEmployeeNames=(LS.get('gm_users')||[]).map(u=>`${u.firstName||''} ${u.lastName||''}`.trim()||u.username).filter(Boolean);
    dirtyCheckRef.current=()=>!!(rows&&rows.length>0);

    const handleFile=(ev)=>{
      const file=ev.target.files[0];
      if(!file)return;
      const isCSV=file.name.toLowerCase().endsWith('.csv');
      const reader=new FileReader();
      reader.onload=evt=>{
        try{
          const wb=XLSX.read(evt.target.result,{type:isCSV?'string':'binary'});
          const ws=wb.Sheets[wb.SheetNames[0]];
          const raw=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});
          if(!raw||raw.length===0){alert(tr('No data found in file'));return;}
          const headerMap=raw[0].map(h=>IMPORT_HEADER_ALIASES(h));
          if(!headerMap.includes('amount')&&!headerMap.includes('desc')){
            alert(tr('Could not find Amount/Description columns in the first row. Use "Download Template" to get the expected headers.'));
            return;
          }
          const parsed=[];
          for(let i=1;i<raw.length;i++){
            const row=raw[i];
            if(!row||row.every(c=>String(c||'').trim()===''))continue;
            const obj={};
            headerMap.forEach((key,idx)=>{if(key)obj[key]=String(row[idx]??'').trim();});
            if(!obj.amount&&!obj.desc)continue;
            const catMatch=allCatNames.find(c=>c.toLowerCase()===(obj.category||'').toLowerCase());
            const projMatch=projects.find(p=>p.name.toLowerCase()===(obj.project||'').toLowerCase());
            const empMatch=allEmployeeNames.find(n=>n.toLowerCase()===(obj.employee||'').toLowerCase());
            const curOk=Object.keys(CURR).includes((obj.currency||'').toUpperCase());
            const isDup=expenses.some(x=>x.date===obj.date&&String(+x.amount||0)===String(+obj.amount||0)&&(x.description||'').toLowerCase().trim()===(obj.desc||'').toLowerCase().trim());
            parsed.push({
              _rid:uid(),
              date:obj.date||td(),
              employee:empMatch||'',
              category:catMatch||'',
              description:obj.desc||'',
              reference:obj.reference||'',
              amount:obj.amount||'',
              currency:curOk?obj.currency.toUpperCase():'GBP',
              project:projMatch?projMatch.name:'',
              notes:obj.notes||'',
              _include:!isDup,
              _dup:isDup,
              _catUnmatched:!!obj.category&&!catMatch,
              _projUnmatched:!!obj.project&&!projMatch,
              _empUnmatched:!!obj.employee&&!empMatch,
            });
          }
          if(parsed.length===0){alert(tr('No valid rows found'));return;}
          setRows(parsed);
        }catch(err){
          console.error('Import error:',err);
          alert(tr('Import error: ')+err.message);
        }
      };
      reader.onerror=()=>alert(tr('Failed to read file'));
      ensureXLSX().then(()=>{if(isCSV)reader.readAsText(file);else reader.readAsBinaryString(file);},libLoadFailed);
      ev.target.value='';
    };

    const updateRow=(rid,field,val)=>setRows(rs=>rs.map(r=>r._rid===rid?{...r,[field]:val}:r));
    const toggleInclude=rid=>setRows(rs=>rs.map(r=>r._rid===rid?{...r,_include:!r._include}:r));
    const includedCount=rows?rows.filter(r=>r._include).length:0;

    const handleCommit=()=>{
      const toImport=rows.filter(r=>r._include);
      const invalid=toImport.filter(r=>!r.amount||isNaN(+r.amount)||+r.amount<=0);
      if(invalid.length>0){alert(tr("{0} selected row(s) have a missing/invalid amount. Fix or uncheck them first.", invalid.length));return;}
      const newExpenses=toImport.map(r=>({id:uid(),date:r.date||td(),employee:r.employee,category:r.category,description:r.description,reference:r.reference,amount:r.amount,currency:r.currency,project:r.project,notes:r.notes}));
      sExp([...expenses,...newExpenses]);
      showToast(tr("✓ {0} expenses imported", newExpenses.length));
      go('expenses');
    };

    const downloadTemplate=()=>exportExcel([
      ['Date','Employee','Category','Description','Reference','Amount','Currency','Project','Notes'],
      [td(),'Jane Doe','Travel','Taxi to airport','R-1234',24.5,'GBP','','']
    ],'expense-import-template');

    return(<div className="content">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}>
        <button onClick={()=>go('expenses')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:5}}><Ico n="back"/>{tr("Back")}</button>
        <h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{tr("Import Expenses")}</h2>
        <div style={{flex:1}}/>
        <Btn v="bgh bsm" onClick={downloadTemplate}><Ico n="dl"/>{tr("Download Template")}</Btn>
        <Btn v="bgh bsm" onClick={()=>fileRef.current&&fileRef.current.click()}><Ico n="upload"/>{tr("Choose File")}</Btn>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{display:'none'}} onChange={handleFile}/>
      </div>

      {!rows&&<div className="tcard"><div className="empty"><Ico n="expense" size={38}/><div className="empty-t">{tr("No file selected yet")}</div><div className="empty-s">{tr("Download the template, fill it in, then choose the file to preview before importing.")}</div></div></div>}

      {rows&&(<>
        <div style={{display:'flex',gap:14,alignItems:'center',marginBottom:12,fontSize:12.5,color:'var(--g600)',flexWrap:'wrap'}}>
          <span>{tr("{0} rows parsed", rows.length)}</span>
          <span>·</span>
          <span style={{fontWeight:700,color:'var(--gm-500)'}}>{tr("{0} selected to import", includedCount)}</span>
          {rows.some(r=>r._dup)&&<span style={{color:'var(--amber)'}}>{tr("· {0} possible duplicate(s) unchecked automatically", rows.filter(r=>r._dup).length)}</span>}
        </div>
        <div className="tcard" style={{overflowX:'auto'}}>
          <table className="ie" style={{tableLayout:'auto',minWidth:1100}}>
            <thead><tr>
              <th style={{width:'3%'}}></th>
              <th style={{width:'8%',textAlign:'left'}}>{tr("Date")}</th>
              <th style={{width:'12%',textAlign:'left'}}>{tr("Employee")}</th>
              <th style={{width:'11%',textAlign:'left'}}>{tr("Category")}</th>
              <th style={{width:'24%',textAlign:'left'}}>{tr("Description")}</th>
              <th style={{width:'10%',textAlign:'left'}}>{tr("Reference")}</th>
              <th style={{width:'8%',textAlign:'right'}}>{tr("Amount")}</th>
              <th style={{width:'6%',textAlign:'left'}}>{tr("Ccy")}</th>
              <th style={{width:'13%',textAlign:'left'}}>{tr("Project")}</th>
              <th style={{width:'5%'}}></th>
            </tr></thead>
            <tbody>{rows.map(r=>{
              const invalidAmount=!r.amount||isNaN(+r.amount)||+r.amount<=0;
              return(
              <tr key={r._rid} style={{background:r._dup?'#fff7ed':(invalidAmount&&r._include?'#fef2f2':undefined)}}>
                <td style={{textAlign:'center'}}><input type="checkbox" checked={r._include} onChange={()=>toggleInclude(r._rid)}/></td>
                <td><input type="date" value={r.date} onChange={x=>updateRow(r._rid,'date',x.target.value)} style={{width:'100%'}}/></td>
                <td>
                  <select value={r.employee} onChange={x=>updateRow(r._rid,'employee',x.target.value)} style={{width:'100%',...(r._empUnmatched?{border:'1.5px solid var(--amber)'}:{})}}>
                    <option value="">{tr("— Select —")}</option>
                    {allEmployeeNames.map(n=><option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.category} onChange={x=>updateRow(r._rid,'category',x.target.value)} style={{width:'100%',...(r._catUnmatched?{border:'1.5px solid var(--amber)'}:{})}}>
                    <option value="">{tr("— Select —")}</option>
                    {allCatNames.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td><input value={r.description} onChange={x=>updateRow(r._rid,'description',x.target.value)} style={{width:'100%'}}/></td>
                <td><input value={r.reference} onChange={x=>updateRow(r._rid,'reference',x.target.value)} style={{width:'100%'}}/></td>
                <td><input type="number" value={r.amount} onChange={x=>updateRow(r._rid,'amount',x.target.value)} style={{width:'100%',textAlign:'right',...(invalidAmount?{border:'1.5px solid var(--red)'}:{})}}/></td>
                <td>
                  <select value={r.currency} onChange={x=>updateRow(r._rid,'currency',x.target.value)} style={{width:'100%'}}>
                    {Object.keys(CURR).map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <select value={r.project} onChange={x=>updateRow(r._rid,'project',x.target.value)} style={{width:'100%',...(r._projUnmatched?{border:'1.5px solid var(--amber)'}:{})}}>
                    <option value="">{tr("— None —")}</option>
                    {projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </td>
                <td style={{textAlign:'center'}}>{r._dup&&<span title={tr("Looks like it might already exist in Expenses")}>⚠</span>}</td>
              </tr>);
            })}</tbody>
          </table>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',marginTop:16}}>
          <Btn v="bp bsm" onClick={handleCommit} disabled={includedCount===0}>{tr("Import {0} Expense{1}", includedCount, includedCount===1?'':'s')}</Btn>
        </div>
      </>)}
    </div>);
  }

  function ExpCatsView(){
    const[cats,setCats]=useState(expCats.map(c=>typeof c==='string'?{id:uid(),name:c}:{...c}));
    const[nm,setNm]=useState('');
    const add=async()=>{
      const v=toTitleCase(nm);
      if(!v)return;
      const dup=findCaseInsensitiveDup(cats,'name',v,null);
      if(dup&&!(await askDuplicateOk('category',v)))return;
      setCats(x=>[...x,{id:uid(),name:v}]);setNm('');
    };
    return(<div className="content"><div className="fw" style={{maxWidth:520}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={()=>go('expenses')} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{tr("Expense Categories")}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={()=>{sExpCats(cats);showToast(tr('Saved ✓'));go('expenses');}}>{tr("Save")}</Btn></div>
      <div className="fc"><div className="fct">{tr("Categories")}</div>
        <div style={{display:'flex',gap:8,marginBottom:12}}><input value={nm} onChange={e=>setNm(e.target.value)} className="fi" style={{flex:1}} placeholder={tr("New category...")} onKeyDown={e=>e.key==='Enter'&&add()}/><Btn v="bp bsm" onClick={add}><Ico n="plus"/>{tr("Add")}</Btn></div>
        <div style={{display:'flex',flexWrap:'wrap',gap:7}}>{cats.map(c=><span key={c.id} style={{background:'var(--purplel)',color:'var(--purple)',padding:'4px 11px',borderRadius:12,fontSize:12.5,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>{c.name}<button onClick={(ev)=>{const tid=c.id;setCats(prev=>prev.filter(x=>x.id!==tid));ev.stopPropagation();}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--purple)',fontSize:16,lineHeight:1}}>×</button></span>)}
        </div>
      </div>
    </div></div>);
  }

  function CustomersView(){
    const[q,setQ]=useState('');
    const{sort,onSort}=useSort('company','asc');
    const {pg,ps,setPg,setPs}=usePagination(q+JSON.stringify(sort));
    const typeLabel=c=>c.type==='supplier'?tr('Supplier'):c.type==='both'?tr('Customer & Supplier'):c.type==='source'?tr('Source Supplier'):tr('Customer');
    const f=sortRows(customers.filter(c=>[c.contact,c.company,c.email].some(x=>(x||'').toLowerCase().includes(q.toLowerCase()))),sort,
      {company:c=>c.company||c.contact,contact:c=>c.contact,email:c=>c.email,phone:c=>c.phone,type:typeLabel});
    return(<div className="content">
      <ListTools q={q} onQ={setQ} placeholder={tr("Search...")}/>
      {f.length===0?<div className="tcard"><div className="empty"><Ico n="customers" size={38}/><div className="empty-t">{tr("No customers yet")}</div></div></div>:(
        <div className="tcard"><table className="dt">
          <Cg w={[2,1.4,1.8,1,0.7,0.6]}/>
          <thead><tr>
            <SortTh k="company" sort={sort} onSort={onSort}>{tr("Company")}</SortTh>
            <SortTh k="contact" sort={sort} onSort={onSort}>{tr("Contact")}</SortTh>
            <SortTh k="email" sort={sort} onSort={onSort}>{tr("Email")}</SortTh>
            <SortTh k="phone" sort={sort} onSort={onSort}>{tr("Phone")}</SortTh>
            <SortTh k="type" sort={sort} onSort={onSort}>{tr("Type")}</SortTh>
            <th>{tr("Actions")}</th>
          </tr></thead>
          <tbody>{f.slice((pg-1)*ps,pg*ps).map(c=><tr key={c.id}>
            <td style={{fontWeight:500}}>{c.company||'—'}</td>
            <td>{c.contact||'—'}</td>
            <td>{c.email?<a href={`mailto:${c.email}`} style={{color:'var(--blue)',textDecoration:'none'}}>{c.email}</a>:'—'}</td>
            <td style={{color:'var(--g600)'}}>{c.phone||'—'}</td>
            <td style={{color:'var(--g600)',fontSize:12}}>{typeLabel(c)}{c.groupCompany&&(c.type==='supplier'||c.type==='both')&&<span className="mt-tag ok" style={{marginLeft:6}}>{tr("Group")}</span>}</td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{setCur(c);go('cust_form');}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm(tr("Delete \"{0}\"?", c.company||c.contact),()=>{sCust(customers.filter(x=>x.id!==c.id));showToast(tr('Deleted'));})}><Ico n="trash"/></button>
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
    const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
    dirtyCheckRef.current=_isDirty;
    const handleSave=async()=>{
      const norm={...c,company:toTitleCase(c.company),contact:toTitleCase(c.contact),email:(c.email||'').trim().toLowerCase(),address:addrCase(c.address),notes:toSentenceCase(c.notes)};
      const nameField=norm.company?'company':'contact';
      const nameVal=norm.company||norm.contact;
      const dup=findCaseInsensitiveDup(customers,nameField,nameVal,norm.id);
      if(dup&&!(await askDuplicateOk('customer',nameVal)))return;
      onSave(norm);
    };
    return(<div className="content"><div className="fw">
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{c.id?tr('Edit Customer'):tr('New Customer')}</h2><div style={{flex:1}}/><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
      <div className="fc"><div className="fct">{tr("Customer Info")}</div>
        <div className="fg g-2-1"><Fld label={tr("Company Name *")}><input value={c.company||''} onChange={e=>s('company',e.target.value)} className="fi" placeholder={tr("Acme Ltd")} required/></Fld><Fld label={tr("Relationship")}><select value={c.type||'customer'} onChange={e=>s('type',e.target.value)} className="fi"><option value="customer">{tr("Customer")}</option><option value="supplier">{tr("Supplier")}</option><option value="both">{tr("Both")}</option><option value="source">{tr("Source Supplier")}</option></select></Fld></div>
        {(c.type==='supplier'||c.type==='both')&&<label className="mt-check"><input type="checkbox" checked={!!c.groupCompany} onChange={e=>s('groupCompany',e.target.checked)}/><span><b>{tr("Group company")}</b> — {tr("our own company (e.g. Egefe): its purchase documents also record the source supplier, source price and shipment")}</span></label>}
        <div className="fg g3" style={{marginTop:12}}><Fld label={tr("Contact Person")}><input value={c.contact||''} onChange={e=>s('contact',e.target.value)} className="fi" placeholder={tr("John Smith")}/></Fld><Fld label={tr("Email")}><input type="email" value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi"/></Fld><Fld label={tr("Phone")}><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi"/></Fld></div>
        <div className="fg g2" style={{marginTop:12}}><Fld label={tr("Address")}><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={4} className="fi"/></Fld><Fld label={tr("Notes")}><textarea value={c.notes||''} onChange={e=>s('notes',e.target.value)} rows={4} className="fi"/></Fld></div>
      </div>
      <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn><Btn v="bp bsm" onClick={handleSave}>{tr("Save")}</Btn></div>
    </div></div>);
  }

  // Documents View
  function DocumentsView(){
    const{sort,onSort}=useSort();
    useEscape(()=>setShowDocForm(false),showDocForm&&!!docToEdit);
    const {pg,ps,setPg,setPs}=usePagination(JSON.stringify(sort));
    // Fed newest-first so documents uploaded the same day keep their newest-added-first order
    const rows=sortRows([...documents].reverse(),sort,{date:d=>d.uploadDate,name:d=>d.name,category:d=>d.category,type:d=>d.fileType});

    return(<div className="content">

      {documents.length===0&&(
        <div style={{padding:80,textAlign:'center',color:'var(--g400)'}}>
          <div style={{fontSize:48,marginBottom:16}}>📄</div>
          <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{tr("No documents yet")}</div>
          <div style={{fontSize:13}}>{tr("Upload your first document to get started")}</div>
        </div>
      )}

      {documents.length>0&&(
        <div className="tcard"><table className="dt">
          <Cg w={[0.9,2.2,1,0.8,0.6]}/>
          <thead><tr>
            <SortTh k="date" sort={sort} onSort={onSort}>{tr("Upload Date")}</SortTh>
            <SortTh k="name" sort={sort} onSort={onSort}>{tr("Document Name")}</SortTh>
            <SortTh k="category" sort={sort} onSort={onSort}>{tr("Category")}</SortTh>
            <SortTh k="type" sort={sort} onSort={onSort}>{tr("Type")}</SortTh>
            <th>{tr("Actions")}</th>
          </tr></thead>
          <tbody>{rows.slice((pg-1)*ps,pg*ps).map(d=><tr key={d.id}>
            <td style={{color:'var(--g600)',fontSize:12}}>{d.uploadDate}</td>
            <td style={{fontWeight:500}}>{d.name}</td>
            <td style={{color:'var(--g700)',fontSize:13}}>{d.category||'—'}</td>
            <td><span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,background:d.fileType==='application/pdf'?'var(--redl)':'var(--bluel)',color:d.fileType==='application/pdf'?'var(--red)':'var(--blue)'}}>{d.fileType==='application/pdf'?tr('PDF'):tr('JPG')}</span></td>
            <td><div className="aw">
              <button className="ab" onClick={()=>{
                const link=document.createElement('a');
                link.href=d.file;
                link.download=d.name+(d.fileType==='application/pdf'?'.pdf':'.jpg');
                link.click();
              }}><Ico n="dl"/>{tr("Download")}</button>
              <button className="ab" onClick={()=>{setDocToEdit(d);setShowDocForm(true);}}><Ico n="edit"/></button>
              <button className="ab danger" onClick={()=>askConfirm(tr("Delete \"{0}\"?", d.name),()=>{sDocs(documents.filter(x=>x.id!==d.id));showToast(tr('Deleted'));})}><Ico n="trash"/></button>
            </div></td>
          </tr>)}</tbody>
        </table><Pagination total={documents.length} page={pg} pageSize={ps} onPageChange={setPg} onPageSizeChange={v=>{setPs(v);setPg(1);}}/></div>
      )}

      {/* Upload Form Modal */}
      {showDocForm&&docToEdit&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={()=>setShowDocForm(false)}>
        <div onClick={e=>e.stopPropagation()} style={{background:'var(--white)',borderRadius:12,padding:24,width:500,maxWidth:'90vw'}}>
          <div style={{fontSize:16,fontWeight:700,color:'var(--g900)',marginBottom:16}}>{docToEdit.id?tr('Edit Document'):tr('Upload Document')}</div>
          <S.DocumentForm doc={docToEdit} onSave={(d)=>{
            const doc={...d,id:d.id||uid(),uploadDate:d.uploadDate||td()};
            sDocs(doc.id&&documents.find(x=>x.id===doc.id)?documents.map(x=>x.id===doc.id?doc:x):[...documents,doc]);
            setShowDocForm(false);
            showToast(tr('Document saved'));
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
        alert(tr('Please select a PDF or JPG file'));
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
      <div style={{marginBottom:12}}><Fld label={tr("Document Name")}><input value={d.name||''} onChange={e=>s('name',e.target.value)} className="fi" placeholder={tr("Enter document name...")}/></Fld></div>
      <div style={{marginBottom:12}}><Fld label={tr("Category")}><input value={d.category||''} onChange={e=>s('category',e.target.value)} className="fi" placeholder={tr("e.g. Legal, Financial, HR...")}/></Fld></div>
      <div style={{marginBottom:12}}>
        <Fld label={tr("Upload File (PDF or JPG)")}>
          <input type="file" accept="application/pdf,image/jpeg,image/jpg" onChange={handleFileUpload} className="fi" style={{padding:'8px'}}/>
        </Fld>
      </div>
      {d.file&&<div style={{marginBottom:12,padding:12,background:'var(--g50)',borderRadius:8,fontSize:12,color:'var(--g600)'}}>{tr("✓ File uploaded ({0})", d.fileType==='application/pdf'?tr('PDF'):tr('JPG'))}</div>}
      <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
        <Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn>
        <Btn v="bp bsm" onClick={()=>onSave(d)} disabled={!d.name||!d.file}>{tr("Save")}</Btn>
      </div>
    </div>);
  }

  function OpsSettings(){
    const fromCo=()=>{
      const merged={...DEF_CO,...co};
      if(!merged.banks||merged.banks.length===0){
        merged.banks=(merged.accountName||merged.accountNumber||merged.iban||merged.bic)
          ?[{id:uid(),accountName:merged.accountName||'',accountNumber:merged.accountNumber||'',iban:merged.iban||'',bic:merged.bic||'',currency:'GBP',isDefault:true}]
          :[];
      }
      return merged;
    };
    // The draft lives in settingsDraftRef so it survives remounts of this nested component.
    const[c,setC]=useState(()=>settingsDraftRef.current||fromCo());
    const draft=()=>settingsDraftRef.current||c;
    const update=next=>{settingsDraftRef.current=next;setC(next);};
    const s=(k,v)=>update({...draft(),[k]:v});
    const[activeMenu,setActiveMenu]=useState(()=>LS.get(ns+'settingsMenu')||'company');
    const[numLocked,setNumLocked]=useState(true);
    const[editingBank,setEditingBank]=useState(null);
    const logoInput=useRef(null);const sigInput=useRef(null);

    // Logo, signature and banks save immediately; everything else waits for Save.
    const unsavedFields=d=>{const{banks,logo,signature,...rest}=d;return JSON.stringify(rest);};
    dirtyCheckRef.current=()=>unsavedFields(c)!==unsavedFields({...DEF_CO,...co});

    const saveAll=()=>{
      const cNorm={...c,name:toTitleCase(c.name),address:addrCase(c.address),email:(c.email||'').trim().toLowerCase()};
      const{logo,signature,...coWithoutLogoAndSig}=cNorm;
      setLogo(logo||'');setSignature(signature||'');
      settingsDraftRef.current=null;
      setCo(cNorm);LS.set(ns+'co',coWithoutLogoAndSig);showToast(tr('Saved ✓'));go('home');
    };

    const readImage=(e,typeRe,typeMsg,apply)=>{
      const f=e.target.files[0];e.target.value='';
      if(!f)return;
      if(!typeRe.test(f.type)){alert(typeMsg);return;}
      const r=new FileReader();r.onload=()=>apply(r.result);r.readAsDataURL(f);
    };

    // Bank changes are written straight to storage, so no separate Save is needed.
    const persistBanks=banks=>{
      update({...draft(),banks});
      LS.set(ns+'co',{...(LS.get(ns+'co')||{}),banks});
      setCo(x=>({...x,banks}));
    };
    const saveBank=b=>{
      const bank={...b,accountName:toTitleCase(b.accountName),bankName:(b.bankName||'').trim(),bankAddress:addrCase(b.bankAddress),iban:(b.iban||'').trim().toUpperCase(),bic:(b.bic||'').trim().toUpperCase(),currency:b.currency||'GBP'};
      const list=draft().banks||[];
      let banks=list.some(x=>x.id===bank.id)?list.map(x=>x.id===bank.id?bank:x):[...list,bank];
      if(bank.isDefault)banks=banks.map(x=>({...x,isDefault:x.id===bank.id}));
      setEditingBank(null);
      persistBanks(banks);
      showToast(tr('Bank account saved'));
    };
    const deleteBank=id=>askGlobalConfirm(tr('Delete this bank account?'),{confirmLabel:tr('Delete')}).then(ok=>{
      if(ok)persistBanks((draft().banks||[]).filter(b=>b.id!==id));
    });
    const setDefaultBank=id=>persistBanks((draft().banks||[]).map(b=>({...b,isDefault:b.id===id})));
    const eb=(k,v)=>setEditingBank(x=>({...x,[k]:v}));
    const isNewBank=editingBank&&!(c.banks||[]).some(b=>b.id===editingBank.id);

    const menuItems=[
      {id:'company',icon:'settings',label:tr('Company')},
      {id:'pdf',icon:'dl',label:tr('PDF Templates')},
      {id:'numbering',icon:'hash',label:tr('Numbering')},
      {id:'bank',icon:'card',label:tr('Bank Details')}
    ];
    const numRows=[['sq','Sales Quotation','SQ'],['si','Sales Invoice','SI'],['po','Purchase Order','PO']];

    const assetCard=(label,hint,src,accept,inputRef,onPick,onRemove)=>(
      <div className="st-asset">
        <div className="st-asset-lbl">{label}</div>
        <div className="st-asset-preview">{src?<img src={src} alt={label}/>:<span>{tr("No {0} uploaded", label.toLowerCase())}</span>}</div>
        <div className="st-asset-actions">
          <Btn v="bgh bsm" onClick={()=>inputRef.current.click()}><Ico n="upload" size={13}/>{src?tr('Replace'):tr('Upload')}</Btn>
          {src&&<button className="st-remove" onClick={onRemove}>{tr("Remove")}</button>}
          <input ref={inputRef} type="file" accept={accept} onChange={onPick} hidden/>
        </div>
        <div className="st-asset-hint">{hint}</div>
      </div>
    );

    return(<div className="content"><div className="fw st-wrap">
      <div className="st-sticky">
        <div className="st-head">
          <button className="st-back" onClick={()=>goGuarded('home')}><Ico n="back" size={14}/>{tr("Back to Dashboard")}</button>
          <div style={{flex:1}}/>
          <Btn v="bp bsm" onClick={saveAll}><Ico n="check" size={13}/>{tr("Save")}</Btn>
        </div>
        <div className="st-tabs" role="tablist">
          {menuItems.map(m=>(
            <button key={m.id} role="tab" aria-selected={activeMenu===m.id} className={`st-tab${activeMenu===m.id?' active':''}`} onClick={()=>{setActiveMenu(m.id);LS.set(ns+'settingsMenu',m.id);}}>
              <Ico n={m.icon} size={15}/>{m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Company Information */}
      {activeMenu==='company'&&(<>
        <div className="fc"><div className="fct">{tr("Company Information")}</div>
          <div className="fg g2">
            <div className="fg">
              <Fld label={tr("Company Name")}><input value={c.name||''} onChange={e=>s('name',e.target.value)} className="fi"/></Fld>
              <Fld label={tr("Address")}><textarea value={c.address||''} onChange={e=>s('address',e.target.value)} rows={4} className="fi"/></Fld>
            </div>
            <div className="fg" style={{alignContent:'start'}}>
              <Fld label={tr("Email")}><input type="email" value={c.email||''} onChange={e=>s('email',e.target.value)} className="fi" placeholder="info@company.com"/></Fld>
              <Fld label={tr("Phone")}><input value={c.phone||''} onChange={e=>s('phone',e.target.value)} className="fi" placeholder="+44 20 0000 0000"/></Fld>
              <Fld label="UTR"><input value={c.utr||''} onChange={e=>s('utr',e.target.value)} className="fi" placeholder="12345 67890"/></Fld>
            </div>
          </div>
        </div>
        <div className="fc"><div className="fct">{tr("Branding")}</div>
          <div className="fg g2">
            {assetCard(tr('Logo'),tr('PNG, JPG or SVG. Shown in the sidebar and on documents. Saved immediately.'),c.logo,'image/*',logoInput,
              e=>readImage(e,/^image\//,'Please select an image file',d=>{setLogo(d);s('logo',d);}),
              ()=>{setLogo('');s('logo','');})}
            {assetCard(tr('Signature'),tr('PNG or JPG, ideally with a transparent background. Saved immediately.'),c.signature,'image/png,image/jpeg',sigInput,
              e=>readImage(e,/^image\/(png|jpeg|jpg)$/,'Please select a PNG or JPG file',d=>{setSignature(d);s('signature',d);}),
              ()=>{setSignature('');s('signature','');})}
          </div>
        </div>
      </>)}

      {/* PDF Templates */}
      {activeMenu==='pdf'&&(<div className="fc"><div className="fct">{tr("PDF Templates")}</div>
        <p className="st-note">{tr("Select a template for your invoices and quotations.")}</p>
        <div className="st-tpl-grid">
          {Object.values(TEMPLATES).map(tpl=>(
            <button key={tpl.id} className={`st-tpl${c.selectedTemplate===tpl.id?' active':''}`} onClick={()=>s('selectedTemplate',tpl.id)} aria-pressed={c.selectedTemplate===tpl.id}>
              <span className="st-tpl-top"><span className="st-tpl-name">{tpl.name}</span>{c.selectedTemplate===tpl.id&&<span className="st-tpl-badge"><Ico n="check" size={11}/>{tr("Active")}</span>}</span>
              <span className="st-tpl-desc">{tpl.description}</span>
            </button>
          ))}
        </div>
      </div>)}

      {/* Document Numbering */}
      {activeMenu==='numbering'&&(<div className="fc">
        <div className="st-fct-row"><div className="fct">{tr("Document Numbering")}</div>
          {numLocked?<Btn v="bgh bsm" onClick={()=>setNumLocked(false)}><Ico n="edit" size={13}/>{tr("Edit")}</Btn>:<Btn v="bp bsm" onClick={()=>setNumLocked(true)}><Ico n="check" size={13}/>{tr("Done")}</Btn>}
        </div>
        <table className="st-num">
          <thead><tr><th>{tr("Document")}</th><th>{tr("Prefix")}</th><th>{tr("Start Number")}</th><th>{tr("Next Number")}</th></tr></thead>
          <tbody>
            {numRows.map(([k,label,def])=>(
              <tr key={k}>
                <td className="st-num-doc">{label}</td>
                <td><input value={c[k+'Pfx']??def} onChange={e=>s(k+'Pfx',e.target.value.toUpperCase().replace(/\s/g,''))} className="fi" readOnly={numLocked} placeholder={def}/></td>
                <td><input type="number" value={c[k+'Start']||'1'} onChange={e=>s(k+'Start',e.target.value)} className="fi" min="1" readOnly={numLocked}/></td>
                <td className="st-num-next">{nextDocNum((c[k+'Pfx']||'').trim()||def,c[k+'Start'],usedDocNums[k]())}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>)}

      {/* Bank Details */}
      {activeMenu==='bank'&&(<div className="fc">
        <div className="st-fct-row"><div className="fct">{tr("Bank Details")}</div>
          <Btn v="bp bsm" onClick={()=>setEditingBank({id:uid(),accountName:'',bankName:'',bankAddress:'',accountNumber:'',iban:'',bic:'',currency:'GBP',isDefault:!(c.banks||[]).length})}><Ico n="plus" size={13}/>{tr("Add Bank")}</Btn>
        </div>
        {(!c.banks||c.banks.length===0)&&(
          <div className="st-empty">
            <span className="st-empty-ico"><Ico n="bank" size={22}/></span>
            <div className="st-empty-t">{tr("No bank accounts")}</div>
            <div>{tr("Add your first bank account to show it on invoices.")}</div>
          </div>
        )}
        <div className="st-banks">
          {(c.banks||[]).map(bank=>(
            <div key={bank.id} className={`st-bank${bank.isDefault?' default':''}`}>
              <div className="st-bank-head">
                <span className="st-bank-name">{bank.accountName||tr('Unnamed Account')}</span>
                <span className="st-cur">{bank.currency||tr('GBP')}</span>
                {bank.isDefault&&<span className="st-default">{tr("Default")}</span>}
                <div style={{flex:1}}/>
                {!bank.isDefault&&<button className="st-link" onClick={()=>setDefaultBank(bank.id)}>{tr("Set default")}</button>}
                <button onClick={()=>setEditingBank(bank)} className="ab" title={tr("Edit")} aria-label={tr("Edit")}><Ico n="edit"/></button>
                <button onClick={()=>deleteBank(bank.id)} className="ab danger" title={tr("Delete")} aria-label={tr("Delete")}><Ico n="trash"/></button>
              </div>
              <dl className="st-bank-grid">
                <div><dt>{tr("Bank Name")}</dt><dd className="st-plain">{bank.bankName||'—'}</dd></div>
                <div><dt>{tr("Account Number")}</dt><dd>{bank.accountNumber||'—'}</dd></div>
                <div><dt>{tr("IBAN")}</dt><dd>{bank.iban||'—'}</dd></div>
                <div><dt>{tr("SWIFT/BIC")}</dt><dd>{bank.bic||'—'}</dd></div>
                {bank.bankAddress&&<div className="st-bank-addr"><dt>{tr("Bank Address")}</dt><dd className="st-plain">{bank.bankAddress}</dd></div>}
              </dl>
            </div>
          ))}
        </div>
      </div>)}

      {editingBank&&(<div className="st-modal-bg" onClick={()=>setEditingBank(null)}>
        <div className="st-modal" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="st-modal-t">{isNewBank?tr('New Bank Account'):tr('Edit Bank Account')}</div>
          <div className="fg">
            <div className="fg g2">
              <Fld label={tr("Account Name")}><input value={editingBank.accountName||''} onChange={e=>eb('accountName',e.target.value)} className="fi" autoFocus/></Fld>
              <Fld label={tr("Bank Name")}><input value={editingBank.bankName||''} onChange={e=>eb('bankName',e.target.value)} className="fi" placeholder={tr("e.g. Barclays Bank UK PLC")}/></Fld>
            </div>
            <Fld label={tr("Bank Address")}><textarea value={editingBank.bankAddress||''} onChange={e=>eb('bankAddress',e.target.value)} rows={2} className="fi"/></Fld>
            <div className="fg g-2-1">
              <Fld label={tr("Account Number")}><input value={editingBank.accountNumber||''} onChange={e=>eb('accountNumber',e.target.value)} className="fi"/></Fld>
              <Fld label={tr("Currency")}><select value={editingBank.currency||'GBP'} onChange={e=>eb('currency',e.target.value)} className="fi">{Object.entries(CURR).map(([k,v])=><option key={k} value={k}>{k} ({v})</option>)}</select></Fld>
            </div>
            <div className="fg g-2-1">
              <Fld label={tr("IBAN")}><input value={editingBank.iban||''} onChange={e=>eb('iban',e.target.value)} className="fi"/></Fld>
              <Fld label={tr("SWIFT/BIC")}><input value={editingBank.bic||''} onChange={e=>eb('bic',e.target.value)} className="fi"/></Fld>
            </div>
            <label className="st-check"><input type="checkbox" checked={editingBank.isDefault||false} onChange={e=>eb('isDefault',e.target.checked)}/><span>{tr("Set as default bank account")}</span></label>
          </div>
          <div className="fact" style={{marginTop:18}}>
            <Btn v="bgh bsm" onClick={()=>setEditingBank(null)}>{tr("Cancel")}</Btn>
            <Btn v="bp bsm" onClick={()=>saveBank(editingBank)}>{tr("Save")}</Btn>
          </div>
        </div>
      </div>)}
    </div></div>);
  }

  function Dashboard(){
    const ov=salesInvoices.filter(d=>d.status==='overdue');
    const revenue=dt(salesInvoices.filter(d=>d.status==='sent'||d.status==='paid').flatMap(d=>d.items));
    
    const cards=[
      {k:'sales_quotes',ico:'sq',lbl:tr('Sales Quotes'),val:salesQuotes.filter(d=>d.status!=='passive').length,sub:tr("{0} approved", salesQuotes.filter(d=>d.status==='approved').length)},
      {k:'sales_invoices',ico:'si',lbl:tr('Sales Invoices'),val:salesInvoices.length,sub:tr("{0} draft", salesInvoices.filter(d=>d.status==='draft').length)},
      {k:'purchase_quotes',ico:'rq',lbl:tr('Purchase Quotes'),val:purchaseQuotes.length,sub:tr('{0} not ordered yet',countWhere(purchaseQuotes,d=>!d.linkedPO))}, // quotes and orders have no status field since the PQ → PO → RI links replaced it
      {k:'purchase_orders',ico:'po',lbl:tr('Purchase Orders'),val:purchaseOrders.length,sub:tr('{0} awaiting invoice',countWhere(purchaseOrders,d=>!d.linkedRI))},
      {k:'received_invoices',ico:'ri',lbl:tr('Received Invoices'),val:receivedInvoices.length,sub:tr('{0} unpaid',countWhere(receivedInvoices,d=>d.status!=='paid'))},
      {k:'projects',ico:'project',lbl:tr('Projects'),val:projects.length,sub:tr("{0} active", projects.filter(d=>d.status==='active').length)},
      {k:'product_pool',ico:'pool',lbl:tr('Product Pool'),val:poolItems.length,sub:tr('items')},
      {k:'customers',ico:'customers',lbl:tr('Customers'),val:customers.length,sub:tr('contacts')},
    ];
    
    return(<div className="content">

      <div className="dash-grid">
        {cards.map(c=>(
          <button key={c.k} className="dash-card" onClick={()=>go(c.k)}>
            <span className="dash-ico"><Ico n={c.ico} size={18}/></span>
            <span className="dash-val">{c.val}</span>
            <span className="dash-lbl">{c.lbl}</span>
            {c.sub&&<span className="dash-sub">{c.sub}</span>}
          </button>
        ))}
      </div>
    </div>);
  }

  const SB=[
    {group:tr('Sales')},
    {k:'sales_quotes',ico:'sq',lbl:tr('Sales Quotations'),cnt:salesQuotes.filter(d=>d.status!=='passive').length,col:'ops_sq'},
    {k:'sales_invoices',ico:'si',lbl:tr('Sales Invoices'),cnt:salesInvoices.length,col:'ops_si'},
    {div:true},
    {group:tr('Procurement')},
    {k:'purchase_quotes',ico:'rq',lbl:tr('Received Quotes'),cnt:purchaseQuotes.length,col:'ops_pq'},
    {k:'purchase_orders',ico:'po',lbl:tr('Purchase Orders'),cnt:purchaseOrders.length,col:'ops_po'},
    {k:'received_invoices',ico:'ri',lbl:tr('Received Invoices'),cnt:receivedInvoices.length,col:'ops_ri'},
    {div:true},
    {group:tr('Project Management')},
    {k:'projects',ico:'project',lbl:tr('Projects'),cnt:projects.length,col:'ops_proj'},
    {k:'product_pool',ico:'pool',lbl:tr('Product Pool'),cnt:poolItems.length},
    {k:'expenses',ico:'expense',lbl:tr('Expenses'),cnt:expenses.length,col:'ops_exp'},
    {div:true},
    {group:tr('CRM')},
    {k:'customers',ico:'customers',lbl:tr('Customers'),cnt:customers.length,col:'ops_cust'},
    {k:'documents',ico:'file',lbl:tr('Documents'),cnt:documents.length,col:'ops_docs'},
    {k:'settings',ico:'settings',lbl:tr('Settings')},
  ];

  // Sidebar + page header menu: Dashboard first, then the sections above
  const NAV=[{k:'home',ico:'home',lbl:tr('Dashboard')},...SB];
  const isNav=k=>view===k||view===k+'_form'||view===k+'_preview';

  const titles={home:tr('Dashboard'),sales_quotes:tr('Sales Quotations'),sales_invoices:tr('Sales Invoices'),purchase_quotes:tr('Received Quotes'),purchase_orders:tr('Purchase Orders'),received_invoices:tr('Received Invoices'),projects:tr('Projects'),proj_detail:(cur&&cur.name)||tr('Project'),proj_matching:(cur&&cur.name)||tr('Project'),product_pool:tr('Product Pool'),expenses:tr('Expenses'),customers:tr('Customers'),documents:tr('Documents'),settings:tr('Settings'),exp_cats:tr('Expense Categories')};

  dirtyCheckRef.current=null;
  if(view!=='settings')settingsDraftRef.current=null;
  const S=useStableComponents({SalesQuotesList,SalesQuoteForm,SalesInvoiceForm,SalesInvoicesList,ProcurementList,ProcurementForm,ProjectsList,ItemMatching,ProjectDetail,ProjectForm,ProductPoolView,ExpensesView,ExpenseImportView,ExpCatsView,CustomersView,CustomerForm,DocumentsView,DocumentForm,OpsSettings,Dashboard});
  return(
    <div style={{display:'flex',minHeight:'100vh',width:'100%'}}>
      <PortalSidebar sb={NAV} isActive={isNav} onGo={goGuarded} session={session} onPortalSwitch={guardedPortalSwitch} onOpenProfile={onOpenProfile} onLogout={guardedLogout} onLang={guardedLang}/>
      <div className="main">
        <React.Fragment key={navSeq}>
        {!['sales_quote_preview','sales_invoice_preview','pq_preview','po_preview','ri_preview','sales_quote_form','sales_invoice_form','pq_form','po_form','ri_form','proj_form','exp_form','cust_form','exp_cats','exp_import'].includes(view)&&
          <PageHeader sb={NAV} isActive={isNav} onGo={goGuarded} session={session} title={titles[view]||''}>
            {view==='sales_quotes'&&<Btn v="bp bsm" onClick={()=>{setCur({...mkSalesQuote(null,0),number:docNum('sq')});go('sales_quote_form');}}><Ico n="plus"/>{tr("New Quotation")}</Btn>}
            {view==='sales_invoices'&&<Btn v="bp bsm" onClick={()=>{const num=docNum('si');setCur({id:null,number:num,quoteId:null,quoteNum:null,date:td(),dueDate:td(),terms:'Due on Receipt',currency:'GBP',status:'draft',project:'',client:{company:'',contact:'',email:'',phone:'',address:''},shipToEnabled:false,shipTo:{company:'',contact:'',email:'',phone:'',address:''},items:[{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}],notes:''});go('sales_invoice_form');}}><Ico n="plus"/>{tr("New Invoice")}</Btn>}
            {view==='purchase_quotes'&&<Btn v="bp bsm" onClick={()=>{setCur(mkPurchaseQuote());go('pq_form');}}><Ico n="plus"/>{tr("New Received Quote")}</Btn>}
            {view==='purchase_orders'&&<Btn v="bp bsm" onClick={()=>{setCur(mkPurchaseOrder());go('po_form');}}><Ico n="plus"/>{tr("New Purchase Order")}</Btn>}
            {view==='received_invoices'&&<Btn v="bp bsm" onClick={()=>{setCur(mkReceivedInvoice());go('ri_form');}}><Ico n="plus"/>{tr("New Received Invoice")}</Btn>}
            {view==='projects'&&<Btn v="bp bsm" onClick={()=>{setCur(mkProject());go('proj_form');}}><Ico n="plus"/>{tr("New Project")}</Btn>}
            {view==='product_pool'&&<Btn v="bex bsm" onClick={()=>exportExcel([['Code','Description','Qty','Unit','Sale Price','Purchase Price','Quote No','Date','Project','Customer'],...poolItems.map(p=>[p.code||'',p.name||'',p.qty||'',p.unit||'',p.price||'',p.purchasePrice||'',p.quoteNum||'',p.date||'',p.projectId||'',p.customer||''])],'product-pool')}><Ico n="export"/>{tr("Export Excel")}</Btn>}
            {view==='expenses'&&<div style={{display:'flex',gap:7}}><Btn v="bgh bsm" onClick={()=>go('exp_cats')}><Ico n="tag"/>{tr("Categories")}</Btn><Btn v="bp bsm" onClick={()=>{setCur(mkExpense());go('exp_form');}}><Ico n="plus"/>{tr("New Expense")}</Btn></div>}
            {view==='customers'&&<Btn v="bp bsm" onClick={()=>{setCur({id:null,contact:'',email:'',phone:'',address:'',company:'',notes:'',type:'customer'});go('cust_form');}}><Ico n="plus"/>{tr("New Customer")}</Btn>}
            {view==='documents'&&<Btn v="bp bsm" onClick={()=>{setDocToEdit({id:null,name:'',category:'',file:'',fileType:'',uploadDate:td()});setShowDocForm(true);}}><Ico n="plus"/>{tr("Upload Document")}</Btn>}
          </PageHeader>
        }
        {view==='home'&&<S.Dashboard/>}
        {view==='sales_quotes'&&<S.SalesQuotesList/>}
        {view==='sales_invoices'&&<S.SalesInvoicesList/>}
        {view==='purchase_quotes'&&<S.ProcurementList type="pq" items={purchaseQuotes} title={tr("Received Quotes")}/>}
        {view==='purchase_orders'&&<S.ProcurementList type="po" items={purchaseOrders} title={tr("Purchase Orders")}/>}
        {view==='received_invoices'&&<S.ProcurementList type="ri" items={receivedInvoices} title={tr("Received Invoices")}/>}
        {view==='projects'&&<S.ProjectsList/>}
        {view==='proj_detail'&&cur&&<S.ProjectDetail project={cur}/>}
        {view==='proj_matching'&&cur&&<S.ItemMatching project={cur}/>}
        {view==='product_pool'&&<S.ProductPoolView/>}
        {view==='expenses'&&<S.ExpensesView/>}
        {view==='customers'&&<S.CustomersView/>}
        {view==='documents'&&<S.DocumentsView/>}
        {view==='settings'&&<S.OpsSettings/>}
        {/* FORMS */}
        {view==='sales_quote_form'&&cur&&<S.SalesQuoteForm quote={cur} onSave={handleSaveSQ} onCancel={()=>go('sales_quotes')}/>}
        {view==='sales_invoice_form'&&cur&&<S.SalesInvoiceForm invoice={cur} onSave={handleSaveSI} onCancel={()=>go(cur.quoteId?'sales_quotes':'sales_invoices')}/>}
        {view==='sales_invoice_edit'&&cur&&<S.SalesInvoiceForm invoice={cur} onSave={handleSaveSI} onCancel={()=>go('sales_invoices')}/>}
        {view==='pq_form'&&cur&&<S.ProcurementForm doc={cur} docType="pq" onSave={handleSavePQ} onCancel={()=>go('purchase_quotes')}/>}
        {view==='po_form'&&cur&&<S.ProcurementForm doc={cur} docType="po" onSave={handleSavePO} onCancel={()=>go('purchase_orders')}/>}
        {view==='ri_form'&&cur&&<S.ProcurementForm doc={cur} docType="ri" onSave={handleSaveRI} onCancel={()=>go('received_invoices')}/>}
        {view==='received_invoice_form'&&cur&&<S.ProcurementForm doc={cur} docType="ri" onSave={handleSaveRIFromPO} onCancel={()=>go('purchase_orders')}/>}
        {view==='proj_form'&&cur&&<S.ProjectForm proj={cur} onSave={handleSaveProj} onCancel={()=>go('projects')}/>}
        {view==='exp_form'&&cur&&<ExpenseForm exp={cur} expCats={expCats} projects={projects} mkExpense={mkExpense} onSave={handleSaveExp} onSaveAndNew={handleSaveExpAndNew} onCancel={()=>go('expenses')} dirtyRef={dirtyCheckRef}/>}
        {view==='exp_cats'&&<S.ExpCatsView/>}
        {view==='exp_import'&&<S.ExpenseImportView/>}
        {view==='cust_form'&&cur&&<S.CustomerForm cust={cur} onSave={handleSaveCust} onCancel={()=>go('customers')}/>}
        {/* PREVIEWS */}
        {view==='sales_quote_preview'&&cur&&<Preview doc={cur} co={co} docType="sales_quote" pdfOpts={FULL_BANK} onBack={()=>go(prev)} onEdit={()=>{go('sales_quote_form','sales_quote_preview');}}/>}
        {view==='sales_invoice_preview'&&cur&&<Preview doc={cur} co={co} docType="invoice" pdfOpts={FULL_BANK} onBack={()=>go(prev)}/>}
        {view==='pq_preview'&&cur&&<Preview doc={cur} co={co} docType="quote" pdfOpts={SALES_PDF} onBack={()=>go('purchase_quotes')}/>}
        {view==='po_preview'&&cur&&<Preview doc={cur} co={co} docType="po" pdfOpts={SALES_PDF} onBack={()=>go('purchase_orders')}/>}
        {view==='ri_preview'&&cur&&<Preview doc={cur} co={co} docType="invoice" pdfOpts={SALES_PDF} onBack={()=>go('received_invoices')}/>}
        </React.Fragment>
      </div>
      {toast&&<div className="toast">{toast}</div>}
      {confirmDlg&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setConfirmDlg(null)}>
        <div style={{background:'#fff',borderRadius:12,padding:'28px 32px',minWidth:320,maxWidth:440,boxShadow:'0 8px 40px rgba(0,0,0,.18)',display:'flex',flexDirection:'column',gap:20}} onClick={e=>e.stopPropagation()}>
          <p style={{margin:0,fontSize:14.5,lineHeight:1.6,color:'var(--g700)',fontWeight:500}}>{confirmDlg.msg}</p>
          <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
            <button style={{padding:'7px 20px',borderRadius:7,border:'1.5px solid var(--g200)',background:'#fff',color:'var(--g600)',fontSize:13,fontWeight:500,cursor:'pointer'}} onClick={()=>setConfirmDlg(null)}>{tr("Cancel")}</button>
            <button style={{padding:'7px 20px',borderRadius:7,border:'none',background:'var(--gm-600)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}} onClick={()=>{confirmDlg.onYes();setConfirmDlg(null);}}>{tr("Yes")}</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// Top-level (not nested in AppOperational) so that saving — which updates the shared expenses
// array and therefore re-renders AppOperational — re-renders this form in place instead of
// remounting it; a nested version would reset its local state (and "Save & New"'s fresh blank
// row) on every save, since AppOperational recreating a nested function component each render
// gives React a new component identity to mount.
// Sales quotations and invoices print the full bank block on their PDF
// Sales & Procurement PDFs use the modern letterhead; sales quotations/invoices also print the full bank block
const SALES_PDF={modern:true};
const FULL_BANK={fullBank:true,modern:true};
// Picks which of the company's accounts in the document's currency is printed on the PDF (stored as doc.bankId)
function BankSelect({doc,banks,onChange,disabled}){
  const cur=doc.currency||'GBP';
  const same=(banks||[]).filter(b=>(b.currency||'GBP')===cur);
  const sel=docBank(doc,{banks});
  const label=b=>[b.accountName||tr('Account'),b.bankName,b.accountNumber].filter(Boolean).join(' · ');
  return(<Fld label={tr("Bank Account (PDF)")}>{same.length?
    <select value={sel.id||''} onChange={e=>onChange(e.target.value)} className="fi" disabled={disabled}>{same.map(b=><option key={b.id} value={b.id}>{label(b)}</option>)}</select>:
    <input className="fi" readOnly value={sel.id?tr('No {0} account — {1} ({2}) will be used',cur,label(sel),sel.currency||'GBP'):tr('No bank accounts in Settings')}/>}
  </Fld>);
}
// One linked-documents table on the project detail page; cols: {k,l,get,show,strong}
function ProjDocTable({title,items,cols,w}){
  const{sort,onSort}=useSort();
  const rows=sortRows(items,sort,Object.fromEntries(cols.map(c=>[c.k,c.get])));
  return(<div style={{marginBottom:16}}>
    <div className="tcard-hdr" style={{background:'var(--white)',borderRadius:'var(--r) var(--r) 0 0',border:'1px solid var(--g200)',borderBottom:'none'}}><div className="tcard-hdr-t">{title} ({items.length})</div></div>
    <div className="tcard">
      {items.length===0?<div style={{padding:'16px 18px',color:'var(--g400)',fontSize:13}}>{tr("None")}</div>:
      <table className="dt"><Cg w={w}/><thead><tr>{cols.map(c=><SortTh key={c.k} k={c.k} sort={sort} onSort={onSort}>{c.l}</SortTh>)}</tr></thead>
      <tbody>{rows.map((d,i)=><tr key={d.id||i}>{cols.map(c=><td key={c.k} style={{fontWeight:c.strong?600:400,color:c.strong?'var(--g900)':'var(--g600)'}}>{c.show(d)}</td>)}</tr>)}</tbody></table>}
    </div>
  </div>);
}
function ExpenseForm({exp:init,expCats,projects,mkExpense,onSave,onSaveAndNew,onCancel,dirtyRef}){
  const[e,setE]=useState(init);const s=(k,v)=>setE(d=>({...d,[k]:v}));
  const _initStr=useRef(JSON.stringify(init));
  const _isDirty=()=>JSON.stringify(e)!==_initStr.current;
  const _handleCancel=()=>{if(_isDirty())askUnsaved().then(ok=>{if(ok)onCancel();});else onCancel();};
  if(dirtyRef)dirtyRef.current=_isDirty;
  const dateRef=useRef(null);
  const normExp=x=>({...x,description:toSentenceCase(x.description)});
  const handleSaveAndNew=()=>{
    if(!e.amount){alert(tr('Amount is required'));return;}
    onSaveAndNew(normExp(e));
    const fresh=mkExpense();
    setE(fresh);
    _initStr.current=JSON.stringify(fresh);
    dateRef.current&&dateRef.current.focus();
  };
  const allCats=expCats.map(c=>typeof c==='string'?{id:c,name:c}:c);
  const userNames=(LS.get('gm_users')||[]).map(u=>`${u.firstName||''} ${u.lastName||''}`.trim()||u.username).filter(Boolean);
  const employeeOptions=Array.from(new Set([...userNames,...(e.employee?[e.employee]:[])]));
  return(<div className="content"><div className="fw">
    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,flexWrap:'wrap'}}><button onClick={_handleCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13}}><Ico n="back"/>{tr("Back")}</button><h2 style={{fontSize:16,fontWeight:700,color:'var(--g900)'}}>{e.id?tr('Edit Expense'):tr('New Expense')}</h2><div style={{flex:1}}/>{!e.id&&<Btn v="bgh bsm" onClick={handleSaveAndNew}><Ico n="plus"/>{tr('Save & New')}</Btn>}<Btn v="bp bsm" onClick={()=>onSave(normExp(e))}>{tr("Save")}</Btn></div>
    <div className="fc"><div className="fct">{tr("Expense Details")}</div>
      <div className="fg g3"><Fld label={tr("Date")}><input ref={dateRef} type="date" value={e.date||''} onChange={x=>s('date',x.target.value)} className="fi"/></Fld><Fld label={tr("Amount")}><input type="number" value={e.amount||''} onChange={x=>s('amount',x.target.value)} className="fi" placeholder="0.00" min="0" step=".01"/></Fld><Fld label={tr("Currency")}><select value={e.currency||'GBP'} onChange={x=>s('currency',x.target.value)} className="fi">{Object.entries(CURR).map(([c,v])=><option key={c} value={c}>{c} ({v})</option>)}</select></Fld></div>
      <div className="fg g3" style={{marginTop:12,gridTemplateColumns:'1fr 2fr 1fr'}}>
        <Fld label={tr("Category")}><select value={e.category||''} onChange={x=>s('category',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{allCats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select></Fld>
        <Fld label={tr("Description")}><input value={e.description||''} onChange={x=>s('description',x.target.value)} className="fi" placeholder={tr("What was this for?")}/></Fld>
        <Fld label={tr("Employee")}><select value={e.employee||''} onChange={x=>s('employee',x.target.value)} className="fi"><option value="">{tr("— Select —")}</option>{employeeOptions.map(n=><option key={n} value={n}>{n}</option>)}</select></Fld>
      </div>
      <div className="fg g2" style={{marginTop:12}}>
        <Fld label={tr("Reference")}><input value={e.reference||''} onChange={x=>s('reference',x.target.value)} className="fi" placeholder={tr("Receipt No")}/></Fld>
        <Fld label={tr("Project")}><select value={e.project||''} onChange={x=>s('project',x.target.value)} className="fi"><option value="">{tr("— None —")}</option>{projects.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}</select></Fld>
      </div>
      <div style={{marginTop:12}}><Fld label={tr("Notes")}><textarea value={e.notes||''} onChange={x=>s('notes',x.target.value)} rows={2} className="fi"/></Fld></div>
    </div>
    <div className="fact"><Btn v="bgh bsm" onClick={_handleCancel}>{tr("Cancel")}</Btn>{!e.id&&<Btn v="bgh bsm" onClick={handleSaveAndNew}><Ico n="plus"/>{tr('Save & New')}</Btn>}<Btn v="bp bsm" onClick={()=>onSave(normExp(e))}>{tr("Save")}</Btn></div>
  </div></div>);
}
