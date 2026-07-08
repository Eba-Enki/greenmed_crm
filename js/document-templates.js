

// Arial Font Loader for jsPDF (uses embedded base64)
const loadArialFonts = (pdf) => {
  try {
    // Add fonts to jsPDF with Identity-H encoding for Turkish characters
    pdf.addFileToVFS('Arial-Regular.ttf', ARIAL_REGULAR_BASE64);
    pdf.addFont('Arial-Regular.ttf', 'Arial', 'normal', 'Identity-H');
    
    pdf.addFileToVFS('Arial-Bold.ttf', ARIAL_BOLD_BASE64);
    pdf.addFont('Arial-Bold.ttf', 'Arial', 'bold', 'Identity-H');
    
    // Set default font
    pdf.setFont('Arial', 'normal');
    
    return true;
  } catch (e) {
    console.error('Arial font loading FAILED:', e);
    throw new Error('Failed to load embedded Arial fonts: ' + e.message);
  }
};

// Rasterize an SVG data URL to a high-res PNG data URL (jsPDF can't embed SVG directly)
const svgToPngDataUrl=(svgDataUrl,wmm,hmm,dpi=600)=>new Promise((resolve,reject)=>{
  const img=new Image();
  img.onload=()=>{
    const canvas=document.createElement('canvas');
    canvas.width=Math.round(wmm*dpi/25.4);
    canvas.height=Math.round(hmm*dpi/25.4);
    const ctx=canvas.getContext('2d');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    resolve(canvas.toDataURL('image/png'));
  };
  img.onerror=reject;
  img.src=svgDataUrl;
});

// Standard Template Builder (jsPDF Vectorial with Arial Font)
const buildStandardPDF=async(doc,co,type)=>{
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({
    orientation:'portrait',
    unit:'mm',
    format:'a4',
    compress:true,
    floatPrecision:16
  });
  
  // Load Arial fonts (MANDATORY - will throw error if fails)
  loadArialFonts(pdf);
  
  // No text transformation needed with Arial
  const fixText=(txt)=>txt?String(txt):'';
  
  const sym=CURR[doc.currency]||'£';
  const total=dt(doc.items||[]);
  const isInv=type==='invoice';
  const isPO=type==='po';
  const isPQ=type==='quote'; // Purchase Quote (Received Quote)
  const isSalesQuote=type==='sales_quote'; // Sales Quotation
  
  const typeTitle=isInv?'COMMERCIAL INVOICE':isSalesQuote?'PROFORMA INVOICE':isPO?'PURCHASE ORDER':isPQ?'RECEIVED QUOTES':'PROFORMA INVOICE';
  const docLabel=isInv?'Invoice#':isSalesQuote?'Quote#':isPO?'PO#':isPQ?'R.Quote No#':'Quote#';
  
  const billCompany=(isPO||isPQ)?(doc.supplierCompany||'—'):((doc.client&&doc.client.company)||'—');
  const billContact=(isPO||isPQ)?(doc.supplierContact||''):((doc.client&&doc.client.contact)||'');
  const billEmail=(isPO||isPQ)?(doc.supplierEmail||''):((doc.client&&doc.client.email)||'');
  const billAddr=(isPO||isPQ)?(doc.supplierAddress||''):((doc.client&&doc.client.address)||'');
  
  const hasShipTo=((doc.shipToEnabled||doc.shipTo)&&!isPO)||isPQ||isPO; // Enable Ship To for PQ and PO
  const shipCompany=hasShipTo?((doc.shipTo&&doc.shipTo.company)||''):'';
  const shipContact=hasShipTo?((doc.shipTo&&doc.shipTo.contact)||''):'';
  const shipEmail=hasShipTo?((doc.shipTo&&doc.shipTo.email)||''):'';
  const shipAddr=hasShipTo?((doc.shipTo&&doc.shipTo.address)||''):'';
  
  const defaultBank=(co.banks||[]).find(b=>b.isDefault)||(co.banks||[])[0]||{};
  const addrLines=(co.address||'').split('\n');
  
  // Set line width for all borders
  const borderWidth=0.25/2.83465; // 0.25pt to mm
  pdf.setLineWidth(borderWidth);
  pdf.setDrawColor(158,158,158); // #9E9E9E
  
  // Frame
  pdf.rect(12.025,17.965,186,261);
  
  // Logo - always read fresh from localStorage
  const pdfLogo=getLogo()||co.logo||'';
  if(pdfLogo){
    try{
      if(pdfLogo.startsWith('data:image/svg')){
        const pngLogo=await svgToPngDataUrl(pdfLogo,27.20,20.4);
        pdf.addImage(pngLogo,'PNG',16.031,20.511,27.20,20.4);
      }else{
        const imgFormat=pdfLogo.startsWith('data:image/png')?'PNG':pdfLogo.startsWith('data:image/jpeg')||pdfLogo.startsWith('data:image/jpg')?'JPEG':'PNG';
        pdf.addImage(pdfLogo,imgFormat,16.031,20.511,27.20,20.4);
      }
    }catch(e){console.error('Logo error:',e);}
  }
  
  // Company Name
  pdf.setFont('Arial','bold');
  pdf.setFontSize(12);
  pdf.text(fixText(co.name||'Green Med Ltd'),46.724,24.308+3); // +3 for baseline
  
  // Company Address
  pdf.setFont('Arial','normal');
  pdf.setFontSize(8);
  if(addrLines[0])pdf.text(fixText(addrLines[0]),46.724,29.105+2.5);
  if(addrLines[1])pdf.text(fixText(addrLines[1]),46.724,32.376+2.5);
  if(addrLines[2])pdf.text(fixText(addrLines[2]),46.724,35.642+2.5);
  if(addrLines[3])pdf.text(fixText(addrLines[3]),46.724,38.909+2.5);
  
  // Title
  pdf.setFont('Arial','bold');
  pdf.setFontSize(14);
  // Title: right-aligned, 3mm from right frame edge (198.025-3=195.025mm)
  pdf.setTextColor(17,17,17);
  pdf.text(typeTitle,195.025,24.384+4,{align:'right'});
  
  // Invoice# & Date (+PI No for invoices)
  pdf.setFontSize(10);
  pdf.text(docLabel,149.437,31.173+3);
  pdf.text(': '+(doc.number||''),175.122,31.173+3);
  pdf.text('Date',149.437,36.602+3);
  pdf.text(': '+(doc.date||td()),175.122,36.602+3);
  if(isInv&&doc.quoteNum){
    pdf.text('PI No#',149.437,42.031+3);
    pdf.text(': '+doc.quoteNum,175.122,42.031+3);
  }
  
  // Horizontal Line 1
  pdf.line(12.025,47.664,198.025,47.664);
  
  // Bill To / Supplier Section
  const billLabel=isPO?'Vendor':isPQ?'Supplier':'Bill To';
  pdf.setFont('Arial','bold');
  pdf.setFontSize(8);
  pdf.text(billLabel,16.031,49.546+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(billCompany),42.948,49.546+2.5);
  
  pdf.setFont('Arial','bold');
  pdf.text('Address',16.031,54.256+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(billAddr),42.948,54.256+2.5);
  
  pdf.setFont('Arial','bold');
  pdf.text('Contact Person',16.031,58.966+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(billContact),42.948,58.966+2.5);
  
  pdf.setFont('Arial','bold');
  pdf.text('e-mail',16.031,63.676+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(billEmail),42.948,63.676+2.5);
  
  // Separator line between Bill To and Ship To (if Ship To exists)
  if(hasShipTo){
    pdf.line(12.025,67.5,198.025,67.5); // Centered between sections
  }
  
  // Ship To Section
  if(hasShipTo){
    pdf.setFont('Arial','bold');
    pdf.text('Ship To',16.031,70.035+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(shipCompany),42.948,70.035+2.5);
    
    pdf.setFont('Arial','bold');
    pdf.text('Address',16.031,74.745+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(shipAddr),42.948,74.745+2.5);
    
    pdf.setFont('Arial','bold');
    pdf.text('Contact Person',16.031,79.455+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(shipContact),42.948,79.455+2.5);
    
    pdf.setFont('Arial','bold');
    pdf.text('e-mail',16.031,84.165+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(shipEmail),42.948,84.165+2.5);
  }
  
  // Horizontal Line 2
  pdf.line(12.025,88.447,198.025,88.447);
  
  // Project No & Terms
  pdf.setFont('Arial','bold');
  pdf.text('Project No',16.031,90.217+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(doc.projectNumber||''),42.948,90.217+2.5);
  
  pdf.setFont('Arial','bold');
  pdf.text('Terms',96,90.217+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(': '+fixText(doc.terms||''),122,90.217+2.5);
  
  // Horizontal Line 3
  pdf.line(12.025,94.971,198.025,94.971);
  
  // Table
  const tableX=12.025;
  const tableY=95.538;
  const tableW=186;
  const headerH=5.421;
  const rowH=4.854;
  
  // Check which optional columns are used
  const hasBrand=(doc.items||[]).some(it=>it.brand);
  const hasModel=(doc.items||[]).some(it=>it.model);
  const hasCategory=(doc.items||[]).some(it=>it.category);
  
  // Calculate max content lengths (rough estimation: 1 char ≈ 1.5mm for Arial 8pt)
  const maxBrandLen=hasBrand?Math.max(5,...(doc.items||[]).map(it=>(it.brand||'').length)):0;
  const maxModelLen=hasModel?Math.max(5,...(doc.items||[]).map(it=>(it.model||'').length)):0;
  const maxCategoryLen=hasCategory?Math.max(6,...(doc.items||[]).map(it=>(it.category||'').length)):0;
  
  // Convert lengths to widths (with padding)
  const brandW=hasBrand?Math.min(Math.max(12,maxBrandLen*1.5+3),25):0;
  const modelW=hasModel?Math.min(Math.max(12,maxModelLen*1.5+3),25):0;
  const categoryW=hasCategory?Math.min(Math.max(14,maxCategoryLen*1.5+3),25):0;
  
  const extraWidth=brandW+modelW+categoryW;
  const descWidth=Math.max(35,83.464-extraWidth); // Min 35mm for description
  
  // Column positions (X coordinates from left of table)
  const cols=[
    {x:0,w:9.298,align:'center',label:'#'},
    {x:9.299,w:18.8,align:'left',label:'Item'},
    {x:28.098,w:descWidth,align:'left',label:'Description'},
  ];
  
  let currentX=28.098+descWidth;
  if(hasBrand){cols.push({x:currentX,w:brandW,align:'left',label:'Brand'});currentX+=brandW;}
  if(hasModel){cols.push({x:currentX,w:modelW,align:'left',label:'Model'});currentX+=modelW;}
  if(hasCategory){cols.push({x:currentX,w:categoryW,align:'left',label:'Category'});currentX+=categoryW;}
  
  cols.push(
    {x:currentX,w:14.827,align:'right',label:'Qty'},
    {x:currentX+14.827,w:14.831,align:'center',label:'Units'},
    {x:currentX+29.658,w:20.387,align:'right',label:'Price'},
    {x:currentX+50.045,w:24.394,align:'right',label:'Amount'}
  );
  
  // Table border
  pdf.rect(tableX,tableY,tableW,headerH+(doc.items||[]).length*rowH);
  
  // Header row
  pdf.setFont('Arial','bold');
  pdf.setFontSize(8);
  
  // Header horizontal line
  pdf.line(tableX,tableY+headerH,tableX+tableW,tableY+headerH);
  
  // Header vertical lines & text
  cols.forEach((col,i)=>{
    if(i<cols.length-1){
      pdf.line(tableX+col.x+col.w,tableY,tableX+col.x+col.w,tableY+headerH);
    }
    const textX=tableX+col.x+(col.align==='center'?col.w/2:col.align==='right'?col.w-3:2);
    pdf.text(col.label,textX,tableY+headerH/2+1,{align:col.align});
  });
  
  // Data rows
  pdf.setFont('Arial','normal');
  (doc.items||[]).forEach((it,i)=>{
    const y=tableY+headerH+(i*rowH);
    
    // Row horizontal line
    pdf.line(tableX,y+rowH,tableX+tableW,y+rowH);
    
    // Row vertical lines
    cols.forEach((col,j)=>{
      if(j<cols.length-1){
        pdf.line(tableX+col.x+col.w,y,tableX+col.x+col.w,y+rowH);
      }
    });
    
    // Cell data
    const data=[
      String(i+1),
      fixText(it.item||''),
      fixText(it.desc||''),
    ];
    if(hasBrand)data.push(fixText(it.brand||''));
    if(hasModel)data.push(fixText(it.model||''));
    if(hasCategory)data.push(fixText(it.category||''));
    data.push(
      fmt(+(it.qty||0)),
      fixText(it.unit||''),
      fmt(+(it.price||0)),
      fmt(lt(it))
    );
    
    cols.forEach((col,j)=>{
      const textX=tableX+col.x+(col.align==='center'?col.w/2:col.align==='right'?col.w-3:2);
      const txt=data[j];
      
      // Smart truncation based on column width and alignment
      if(col.align==='left'){
        // For left-aligned text, estimate max chars that fit (1 char ≈ 1.5mm for Arial 8pt)
        const maxChars=Math.floor(col.w/1.5)-1;
        if(txt.length>maxChars){
          pdf.text(txt.substring(0,maxChars-2)+'...',textX,y+rowH/2+1);
        }else{
          pdf.text(txt,textX,y+rowH/2+1,{align:col.align});
        }
      }else{
        pdf.text(txt,textX,y+rowH/2+1,{align:col.align});
      }
    });
  });
  
  // Notes & Totals
  const lastRowY=tableY+headerH+((doc.items||[]).length*rowH);
  const notesY=lastRowY+3;
  
  pdf.setFont('Arial','bold');
  pdf.setFontSize(8);
  pdf.text('Notes :',13.651,notesY+2.5);
  pdf.setFont('Arial','normal');
  pdf.text(fixText(doc.notes||''),24,notesY+2.5);
  
  // Sub Total & Total
  const subTotalY=notesY+8;
  pdf.setFont('Arial','normal');
  pdf.setFontSize(8);
  pdf.text('Sub Total',146.775,subTotalY+2.5);
  pdf.text(fmt(total),195-3,subTotalY+2.5,{align:'right'});
  
  const totalY=subTotalY+4.5;
  pdf.setFont('Arial','bold');
  pdf.setFontSize(9);
  pdf.text('Total',151.252,totalY+2.5);
  pdf.text(sym+fmt(total),195-3,totalY+2.5,{align:'right'});
  
  // Horizontal Line 4
  const totalWordsY=totalY+6;
  pdf.line(12.025,totalWordsY-1,198.025,totalWordsY-1);
  
  // Total In Words - Arial 8pt bold (label) + Arial 8pt regular (value)
  // Show for sales_quote and po (purchase orders) regardless of currency
  if(doc.currency==='GBP'||(type==='sales_quote'||type==='po')){
    pdf.setFont('Arial','bold');
    pdf.setFontSize(8);
    pdf.text('Total In Words :',13.651,totalWordsY+2.5);
    pdf.setFont('Arial','normal');
    pdf.setFontSize(8);
    pdf.text(fixText(toW(total,doc.currency||'GBP')),39,totalWordsY+2.5);
  }
  
  // Bank Details - only for invoices and sales quotes, NOT for purchase quotes
  if(!isPQ){
    // Horizontal Line 5
    const bankY=totalWordsY+8;
    pdf.line(12.025,bankY-2,198.025,bankY-2);
    
    // Bank Details
    pdf.setFont('Arial','normal');
    pdf.setFontSize(8);
    pdf.text('Account Number: '+(defaultBank.accountNumber||''),13.651,bankY+2.5);
    pdf.text('IBAN: '+(defaultBank.iban||''),13.651,bankY+3.267+2.5);
    pdf.text('BIC: '+(defaultBank.bic||''),13.651,bankY+6.533+2.5);
    
    // Horizontal Line 6 (dynamically positioned after bank details)
    const line6Y=bankY+12;
    pdf.line(12.025,line6Y,198.025,line6Y);
  }
  
  // Footer position (fixed at bottom of page)
  const footerY=285.176;
  
  // Footer (FIXED position at bottom of page)
  pdf.text('web: '+(co.website||'www.greenmed.uk'),50.694,footerY+2.5);
  pdf.text('|',84.126,footerY+0.401+2.5);
  pdf.text('e-mail: '+(co.email||'info@greenmed.uk'),87.473,footerY+2.5);
  pdf.text('|',123.908,footerY+0.401+2.5);
  pdf.text('Tel: '+(co.phone||'+44 750 751 6818'),127.255,footerY+2.5);
  
  // Signature (if enabled) - always on last page
  const pdfSignature=getSignature()||co.signature||'';
  if(doc.signatureEnabled&&pdfSignature){
    try{
      const totalPages=pdf.internal.getNumberOfPages();
      pdf.setPage(totalPages); // Go to last page
      const sigY=footerY-35;
      const imgFormat=pdfSignature.startsWith('data:image/png')?'PNG':pdfSignature.startsWith('data:image/jpeg')||pdfSignature.startsWith('data:image/jpg')?'JPEG':'PNG';
      pdf.addImage(pdfSignature,imgFormat,150,sigY,45.93,29.59);
    }catch(e){console.error('Signature error:',e);}
  }
  
  return pdf;
};

const savePDF=async(doc,co,type='invoice')=>{
  try{
    const pdf=await buildStandardPDF(doc,co,type);
    const filename=`${type}_${doc.number||'draft'}_${td()}.pdf`;
    pdf.save(filename);
  }catch(e){
    alert('PDF could not be generated: '+e.message);
    console.error('PDF generation failed:',e);
  }
};
const exportExcel=(rows,name)=>{const ws=XLSX.utils.aoa_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data');XLSX.writeFile(wb,`${name}-${td()}.xlsx`);};

// Preview component — mirrors buildStandardPDF layout exactly
function DocPage({doc,co,docType}){
  const sym=CURR[doc.currency]||'£';
  const total=dt(doc.items||[]);
  const isInv=docType==='invoice';
  const isPO=docType==='po';
  const isPQ=docType==='quote'; // Purchase Quote (Received Quote)
  const isSalesQuote=docType==='sales_quote'; // Sales Quotation
  const PX=3.7795; // mm to px
  const activeLogo=useLogo()||co.logo||''; // always fresh from localStorage
  const activeSignature=useSignature()||co.signature||''; // always fresh from localStorage

  const typeTitle=isInv?'COMMERCIAL INVOICE':isSalesQuote?'PROFORMA INVOICE':isPO?'PURCHASE ORDER':isPQ?'RECEIVED QUOTES':'PROFORMA INVOICE';
  const docLabel=isInv?'Invoice#':isSalesQuote?'Quote#':isPO?'PO#':isPQ?'R.Quote No#':'Quote#';
  const billLabel=isPO?'Vendor':isPQ?'Supplier':'Bill To';

  const billCompany=(isPO||isPQ)?(doc.supplierCompany||'—'):((doc.client&&doc.client.company)||'—');
  const billContact=(isPO||isPQ)?(doc.supplierContact||''):((doc.client&&doc.client.contact)||'');
  const billEmail=(isPO||isPQ)?(doc.supplierEmail||''):((doc.client&&doc.client.email)||'');
  const billAddr=(isPO||isPQ)?(doc.supplierAddress||''):((doc.client&&doc.client.address)||'');

  const hasShipTo=((doc.shipToEnabled||doc.shipTo)&&!isPO)||isPQ||isPO;
  const shipCompany=hasShipTo?((doc.shipTo&&doc.shipTo.company)||''):'';
  const shipContact=hasShipTo?((doc.shipTo&&doc.shipTo.contact)||''):'';
  const shipEmail=hasShipTo?((doc.shipTo&&doc.shipTo.email)||''):'';
  const shipAddr=hasShipTo?((doc.shipTo&&doc.shipTo.address)||''):'';

  const defaultBank=(co.banks||[]).find(b=>b.isDefault)||(co.banks||[])[0]||{};
  const addrLines=(co.address||'').split('\n');

  // Dynamic vertical positions (mm -> px)
  const headerH=5.421;
  const rowH=4.854;
  const nRows=(doc.items||[]).length;
  const tableY=95.538;
  const lastRowY=tableY+headerH+nRows*rowH;
  const notesY=lastRowY+3;
  const subTotalY=notesY+8;
  const totalY=subTotalY+4.5;
  const totalWordsY=totalY+6;
  const bankY=totalWordsY+8;
  const line6Y=bankY+12;
  const footerY=285.176;
  const pageH=Math.max(297,footerY+8);

  const mm=v=>Math.round(v*PX*10)/10;

  const HR=({top,color='#9E9E9E'})=>(
    <div style={{position:'absolute',left:mm(12.025),top:mm(top),width:mm(198.025-12.025),
      borderTop:`0.71px solid ${color}`,boxSizing:'border-box'}}/>
  );

  const LblVal=({top,lbl,val,lbw=24})=>(
    <>
      <div style={{position:'absolute',top:mm(top),left:mm(16.031),width:mm(lbw),
        fontSize:8,fontWeight:700,color:'#111',whiteSpace:'nowrap',lineHeight:'11px'}}>{lbl}</div>
      <div style={{position:'absolute',top:mm(top),left:mm(42.948),right:mm(12),
        fontSize:8,color:'#111',lineHeight:'11px',overflow:'hidden',whiteSpace:'nowrap',
        textOverflow:'ellipsis'}}>{val}</div>
    </>
  );

  return(
    <div style={{
      width:mm(210),minHeight:mm(pageH),background:'#fff',
      fontFamily:'Arial,sans-serif',color:'#111',fontSize:8,
      position:'relative',boxSizing:'border-box',overflow:'hidden'
    }}>
      {/* Outer frame */}
      <div style={{position:'absolute',left:mm(12.025),top:mm(17.965),
        width:mm(186),height:mm(261),border:'0.71px solid #9E9E9E',boxSizing:'border-box',
        pointerEvents:'none',zIndex:0}}/>

      {/* Logo */}
      {activeLogo&&<img src={activeLogo} alt="" style={{position:'absolute',
        left:mm(16.031),top:mm(20.511),width:mm(27.20),height:mm(20.4),objectFit:'contain'}}/>}

      {/* Company name */}
      <div style={{position:'absolute',left:mm(46.724),top:mm(27.308),
        fontSize:12,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>{co.name||'Green Med Ltd'}</div>

      {/* Company address lines */}
      {addrLines[0]&&<div style={{position:'absolute',left:mm(46.724),top:mm(31.605),fontSize:8,color:'#111',lineHeight:'11px'}}>{addrLines[0]}</div>}
      {addrLines[1]&&<div style={{position:'absolute',left:mm(46.724),top:mm(34.876),fontSize:8,color:'#111',lineHeight:'11px'}}>{addrLines[1]}</div>}
      {addrLines[2]&&<div style={{position:'absolute',left:mm(46.724),top:mm(38.142),fontSize:8,color:'#111',lineHeight:'11px'}}>{addrLines[2]}</div>}
      {addrLines[3]&&<div style={{position:'absolute',left:mm(46.724),top:mm(41.409),fontSize:8,color:'#111',lineHeight:'11px'}}>{addrLines[3]}</div>}

      {/* Doc title - right-aligned, 3mm from right frame edge */}
      <div style={{position:'absolute',right:mm(210-195.025),top:mm(28.384),
        fontSize:14,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>{typeTitle}</div>

      {/* Invoice# row */}
      <div style={{position:'absolute',left:mm(149.437),top:mm(34.173),fontSize:10,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>{docLabel}</div>
      <div style={{position:'absolute',left:mm(175.122),top:mm(34.173),fontSize:10,color:'#111',whiteSpace:'nowrap'}}>: {doc.number||''}</div>

      {/* Date row */}
      <div style={{position:'absolute',left:mm(149.437),top:mm(39.602),fontSize:10,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Date</div>
      <div style={{position:'absolute',left:mm(175.122),top:mm(39.602),fontSize:10,color:'#111',whiteSpace:'nowrap'}}>: {doc.date||td()}</div>

      {/* PI No# row (invoices only, when converted from quote) */}
      {isInv&&doc.quoteNum&&<>
        <div style={{position:'absolute',left:mm(149.437),top:mm(45.031),fontSize:10,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>PI No#</div>
        <div style={{position:'absolute',left:mm(175.122),top:mm(45.031),fontSize:10,color:'#111',whiteSpace:'nowrap'}}>: {doc.quoteNum}</div>
      </>}

      {/* HR1 */}
      <HR top={47.664}/>

      {/* Bill To / Supplier */}
      <LblVal top={49.546} lbl={billLabel} val={': '+billCompany}/>
      <LblVal top={54.256} lbl="Address" val={': '+billAddr}/>
      <LblVal top={58.966} lbl="Contact Person" val={': '+billContact} lbw={36}/>
      <LblVal top={63.676} lbl="e-mail" val={': '+billEmail}/>

      {/* Ship To (conditional) */}
      {hasShipTo&&<><HR top={67.5}/>
        <LblVal top={70.035} lbl="Ship To" val={': '+shipCompany}/>
        <LblVal top={74.745} lbl="Address" val={': '+shipAddr}/>
        <LblVal top={79.455} lbl="Contact Person" val={': '+shipContact} lbw={36}/>
        <LblVal top={84.165} lbl="e-mail" val={': '+shipEmail}/>
      </>}

      {/* HR2 */}
      <HR top={88.447}/>

      {/* Project / Terms */}
      <div style={{position:'absolute',left:mm(16.031),top:mm(90.217),fontSize:8,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Project No</div>
      <div style={{position:'absolute',left:mm(42.948),top:mm(90.217),fontSize:8,color:'#111',whiteSpace:'nowrap'}}>: {doc.projectNumber||''}</div>
      <div style={{position:'absolute',left:mm(96),top:mm(90.217),fontSize:8,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Terms</div>
      <div style={{position:'absolute',left:mm(122),top:mm(90.217),fontSize:8,color:'#111',whiteSpace:'nowrap'}}>: {doc.terms||''}</div>

      {/* HR3 */}
      <HR top={94.971}/>

      {/* Items table */}
      {(()=>{
        const hasBrand=(doc.items||[]).some(it=>it.brand);
        const hasModel=(doc.items||[]).some(it=>it.model);
        const hasCategory=(doc.items||[]).some(it=>it.category);
        
        // Calculate max content lengths and widths (% of table)
        const maxBrandLen=hasBrand?Math.max(5,...(doc.items||[]).map(it=>(it.brand||'').length)):0;
        const maxModelLen=hasModel?Math.max(5,...(doc.items||[]).map(it=>(it.model||'').length)):0;
        const maxCategoryLen=hasCategory?Math.max(6,...(doc.items||[]).map(it=>(it.category||'').length)):0;
        
        // Convert to % (rough: 1 char ≈ 0.8% of table width for 8pt font)
        const brandW=hasBrand?Math.min(Math.max(6.4,maxBrandLen*0.8),13.5):0;
        const modelW=hasModel?Math.min(Math.max(6.4,maxModelLen*0.8),13.5):0;
        const categoryW=hasCategory?Math.min(Math.max(7.5,maxCategoryLen*0.8),13.5):0;
        
        const extraWidth=brandW+modelW+categoryW;
        const descWidth=Math.max(18.8,44.87-extraWidth); // Min 18.8% for description
        
        const headers=['#','Item','Description'];
        if(hasBrand)headers.push('Brand');
        if(hasModel)headers.push('Model');
        if(hasCategory)headers.push('Category');
        headers.push('Qty','Units','Price','Amount');
        
        const colCount=headers.length;
        
        return(<div style={{position:'absolute',left:mm(12.025),top:mm(tableY),
          width:mm(186),border:'0.71px solid #9E9E9E',boxSizing:'border-box',overflow:'hidden'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:8,tableLayout:'fixed'}}>
            <colgroup>
              <col style={{width:'4.99%'}}/>
              <col style={{width:'10.11%'}}/>
              <col style={{width:`${descWidth}%`}}/>
              {hasBrand&&<col style={{width:`${brandW}%`}}/>}
              {hasModel&&<col style={{width:`${modelW}%`}}/>}
              {hasCategory&&<col style={{width:`${categoryW}%`}}/>}
              <col style={{width:'7.97%'}}/>
              <col style={{width:'7.97%'}}/>
              <col style={{width:'10.96%'}}/>
              <col style={{width:'13.12%'}}/>
            </colgroup>
            <thead>
              <tr>
                {headers.map((h,i)=>(
                  <th key={h} style={{
                    fontSize:8,fontWeight:700,color:'#111',
                    borderRight:i<colCount-1?'0.71px solid #9E9E9E':'none',
                    borderBottom:'0.71px solid #9E9E9E',
                    height:mm(headerH),lineHeight:mm(headerH)+'px',
                    padding:'0 3px',overflow:'hidden',whiteSpace:'nowrap',
                    textAlign:i===0?'center':i>=headers.indexOf('Qty')?'right':'left'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(doc.items||[]).map((it,i)=>{
                const rowData=[String(i+1),it.item||'',it.desc||''];
                if(hasBrand)rowData.push(it.brand||'');
                if(hasModel)rowData.push(it.model||'');
                if(hasCategory)rowData.push(it.category||'');
                rowData.push(fmt(+(it.qty||0)),it.unit||'',fmt(+(it.price||0)),fmt(lt(it)));
                
                return(<tr key={it.id||i}>
                  {rowData.map((v,j)=>(
                    <td key={j} style={{
                      fontSize:8,color:'#111',
                      borderRight:j<colCount-1?'0.71px solid #9E9E9E':'none',
                      borderBottom:'0.71px solid #9E9E9E',
                      height:mm(rowH),lineHeight:mm(rowH)+'px',
                      padding:'0 3px',overflow:'hidden',whiteSpace:'nowrap',
                      textAlign:j===0?'center':j>=rowData.indexOf(rowData[rowData.length-4])?'right':'left',
                      fontWeight:j===colCount-1?600:j===1?500:400
                    }}>{v}</td>
                  ))}
                </tr>);
              })}
            </tbody>
          </table>
        </div>);
      })()}

      {/* Notes */}
      <div style={{position:'absolute',left:mm(13.651),top:mm(notesY),fontSize:8,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Notes :</div>
      <div style={{position:'absolute',left:mm(24),top:mm(notesY),right:mm(12),fontSize:8,color:'#111',overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis'}}>{doc.notes||''}</div>

      {/* Sub Total */}
      <div style={{position:'absolute',left:mm(146.775),top:mm(subTotalY),fontSize:8,color:'#111',whiteSpace:'nowrap'}}>Sub Total</div>
      <div style={{position:'absolute',right:mm(13),top:mm(subTotalY),fontSize:8,color:'#111',whiteSpace:'nowrap',textAlign:'right'}}>{fmt(total)}</div>

      {/* Total */}
      <div style={{position:'absolute',left:mm(151.252),top:mm(totalY),fontSize:9,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Total</div>
      <div style={{position:'absolute',right:mm(13),top:mm(totalY),fontSize:9,fontWeight:700,color:'#111',whiteSpace:'nowrap',textAlign:'right'}}>{sym}{fmt(total)}</div>

      {/* HR4 */}
      <HR top={totalWordsY-1}/>

      {/* Total In Words */}
      {(doc.currency==='GBP'||isSalesQuote||isPO)&&<>
        <div style={{position:'absolute',left:mm(13.651),top:mm(totalWordsY),fontSize:8,fontWeight:700,color:'#111',whiteSpace:'nowrap'}}>Total In Words :</div>
        <div style={{position:'absolute',left:mm(39),top:mm(totalWordsY),fontSize:8,color:'#111',whiteSpace:'nowrap'}}>{toW(total,doc.currency||'GBP')}</div>
      </>}

      {/* Bank Details - only for invoices and sales quotes, NOT for purchase quotes */}
      {!isPQ&&<>
        {/* HR5 */}
        <HR top={bankY-2}/>

        {/* Bank Details */}
        <div style={{position:'absolute',left:mm(13.651),top:mm(bankY),fontSize:8,color:'#111',lineHeight:'11px'}}>Account Number: {defaultBank.accountNumber||''}</div>
        <div style={{position:'absolute',left:mm(13.651),top:mm(bankY+3.267),fontSize:8,color:'#111',lineHeight:'11px'}}>IBAN: {defaultBank.iban||''}</div>
        <div style={{position:'absolute',left:mm(13.651),top:mm(bankY+6.533),fontSize:8,color:'#111',lineHeight:'11px'}}>BIC: {defaultBank.bic||''}</div>

        {/* HR6 */}
        <HR top={line6Y}/>
      </>}

      {/* Signature - if enabled and available */}
      {doc.signatureEnabled&&activeSignature&&(()=>{
        const sigY=footerY-35;
        return(<>
          <img src={activeSignature} alt="Signature" style={{position:'absolute',left:mm(150),top:mm(sigY),width:mm(45.93),height:mm(29.59),objectFit:'contain'}}/>
        </>);
      })()}

      {/* Footer */}
      <div style={{position:'absolute',left:mm(50.694),top:mm(footerY),fontSize:8,color:'#111',display:'flex',gap:0,alignItems:'center',whiteSpace:'nowrap'}}>
        <span>web: {co.website||'www.greenmed.uk'}</span>
        <span style={{margin:'0 4px'}}>|</span>
        <span>e-mail: {co.email||'info@greenmed.uk'}</span>
        <span style={{margin:'0 4px'}}>|</span>
        <span>Tel: {co.phone||'+44 750 751 6818'}</span>
      </div>
    </div>
  );
}

function Preview({doc,co,docType,onBack,onEdit}){
  const sym=CURR[doc.currency]||'£';
  const total=dt(doc.items||[]);
  const isInv=docType==='invoice';
  const isPO=docType==='po';
  const isPQ=docType==='quote';

  const typeLabel=isInv?'Commercial Invoice':docType==='sales_quote'?'Sales Quotation':isPO?'Purchase Order':isPQ?'Received Quote':'Document';

  const partyLabel=(isPO||isPQ)?'Supplier':'Bill To';
  const partyCompany=(isPO||isPQ)?(doc.supplierCompany||'—'):((doc.client&&doc.client.company)||'—');
  const partyContact=(isPO||isPQ)?(doc.supplierContact||''):((doc.client&&doc.client.contact)||'');
  const partyEmail=(isPO||isPQ)?(doc.supplierEmail||''):((doc.client&&doc.client.email)||'');
  const partyAddr=(isPO||isPQ)?(doc.supplierAddress||''):((doc.client&&doc.client.address)||'');

  const hasShipTo=((doc.shipToEnabled||doc.shipTo)&&!isPO)||isPQ||isPO;
  const shipTo=doc.shipTo||{};

  const statusMap={draft:'b-draft',sent:'b-sent',approved:'b-approved',paid:'b-paid',received:'b-received',locked:'b-locked',declined:'b-declined',cancelled:'b-cancelled','po-created':'b-po-created',pending:'b-pending',closed:'b-closed',overdue:'b-overdue'};
  const statusClass=statusMap[doc.status]||'b-draft';
  const statusLabel=doc.status?(doc.status.charAt(0).toUpperCase()+doc.status.slice(1).replace(/-/g,' ')):'Draft';

  const defaultBank=(co.banks||[]).find(b=>b.isDefault)||(co.banks||[])[0]||null;

  return(
    <div>
      <div className="pvbar no-print">
        <button className="pvbtn" onClick={onBack}><Ico n="back"/>Back</button>
        {onEdit&&<button className="pvbtn" onClick={onEdit}><Ico n="edit"/>Edit</button>}
        <div style={{flex:1}}/>
        <button className="pvbtn primary" onClick={()=>savePDF(doc,co,docType)}><Ico n="dl"/>Save PDF</button>
      </div>
      <div className="pv2-outer">
        <div className="pv2-wrap">

          <div className="pv2-hdr">
            <div className="pv2-hdr-left">
              <div className="pv2-type-label">{typeLabel}</div>
              <div className="pv2-docnum">{doc.number||'—'}</div>
            </div>
            <div className="pv2-hdr-right">
              {isInv&&doc.quoteNum&&<span className="pv2-linked">From {doc.quoteNum}</span>}
              {doc.status&&<span className={`bdg ${statusClass}`}>{statusLabel}</span>}
            </div>
          </div>

          <div className="pv2-meta">
            <div className="pv2-meta-card">
              <div className="pv2-meta-label">{partyLabel}</div>
              <div className="pv2-meta-value lg">{partyCompany}</div>
              {partyContact&&<div className="pv2-meta-sub">{partyContact}</div>}
              {partyEmail&&<div className="pv2-meta-sub">{partyEmail}</div>}
              {partyAddr&&<div className="pv2-meta-sub addr">{partyAddr}</div>}
            </div>
            {hasShipTo&&(shipTo.company||shipTo.contact)&&(
              <div className="pv2-meta-card">
                <div className="pv2-meta-label">Ship To</div>
                {shipTo.company&&<div className="pv2-meta-value lg">{shipTo.company}</div>}
                {shipTo.contact&&<div className="pv2-meta-sub">{shipTo.contact}</div>}
                {shipTo.email&&<div className="pv2-meta-sub">{shipTo.email}</div>}
                {shipTo.address&&<div className="pv2-meta-sub addr">{shipTo.address}</div>}
              </div>
            )}
            <div className="pv2-meta-card">
              <div className="pv2-meta-label">Date</div>
              <div className="pv2-meta-value">{doc.date||td()}</div>
              {doc.validity&&<><div className="pv2-meta-sep"/><div className="pv2-meta-label">Valid Until</div><div className="pv2-meta-value">{doc.validity}</div></>}
              {doc.project&&<><div className="pv2-meta-sep"/><div className="pv2-meta-label">Project</div><div className="pv2-meta-value">{doc.project}</div></>}
            </div>
            <div className="pv2-meta-card">
              <div className="pv2-meta-label">Currency</div>
              <div className="pv2-meta-value">{doc.currency||'GBP'} <span style={{color:'var(--g400)',fontWeight:400,fontSize:12}}>({sym})</span></div>
              {defaultBank&&<>
                <div className="pv2-meta-sep"/>
                <div className="pv2-meta-label">Bank</div>
                <div className="pv2-meta-value" style={{fontSize:12}}>{defaultBank.name||defaultBank.bank||'—'}</div>
                {defaultBank.iban&&<div className="pv2-meta-sub" style={{fontFamily:'monospace',fontSize:11,letterSpacing:'.5px'}}>{defaultBank.iban}</div>}
              </>}
            </div>
          </div>

          <div className="pv2-section">
            <div className="pv2-sec-title">Line Items</div>
            <div style={{borderRadius:8,overflow:'hidden',border:'1px solid var(--g200)'}}>
              <table className="pv2-tbl">
                <thead><tr>
                  <th style={{width:'13%'}}>Item</th>
                  <th style={{width:'37%'}}>Description</th>
                  <th style={{width:'9%',textAlign:'right'}}>Qty</th>
                  <th style={{width:'8%'}}>Unit</th>
                  <th style={{width:'14%',textAlign:'right'}}>Unit Price</th>
                  <th style={{width:'14%',textAlign:'right',paddingRight:16}}>Total</th>
                </tr></thead>
                <tbody>{(doc.items||[]).map((it,i)=>(
                  <tr key={it.id||i}>
                    <td style={{fontFamily:'monospace',fontSize:11,color:'var(--g500)',whiteSpace:'nowrap'}}>{it.item||'—'}</td>
                    <td style={{color:'var(--g800)'}}>{it.desc||'—'}</td>
                    <td style={{textAlign:'right',color:'var(--g700)'}}>{it.qty||'1'}</td>
                    <td style={{fontSize:11,color:'var(--g400)'}}>{it.unit||''}</td>
                    <td style={{textAlign:'right',fontWeight:500,color:'var(--g800)',fontVariantNumeric:'tabular-nums'}}>{sym}{fmt(+(it.price||0))}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--dk)',paddingRight:16,fontVariantNumeric:'tabular-nums'}}>{sym}{fmt(lt(it))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="pv2-totals">
              <div className="pv2-totbox">
                <span className="pv2-totlbl">Total</span>
                <span className="pv2-totamt">{sym}{fmt(total)}</span>
              </div>
            </div>
          </div>

          {doc.notes&&(
            <div className="pv2-section">
              <div className="pv2-sec-title">Notes</div>
              <div className="pv2-notes">{doc.notes}</div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Generic line items editor
function ItemsEditor({items,setItems,currency,readOnly}){
  const sym=CURR[currency]||'£';
  const si=(id,f,v)=>setItems(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const addL=()=>setItems([...items,{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
  const rmL=id=>setItems(items.filter(i=>i.id!==id));
  const total=dt(items);
  return(<>
    <div className="iw">
      <table className="ie">
        <thead><tr>{['Item','Description','Qty','Unit','Unit Price','Total',readOnly?'':''].map((h,i)=><th key={i} style={{textAlign:i>=2&&i<=5?'right':'left',width:i===0?'13%':i===1?'27%':i===2?'8%':i===3?'9%':i===4?'12%':i===5?'11%':'4%'}}>{h}</th>)}</tr></thead>
        <tbody>{items.map(it=><tr key={it.id}>
          <td><input value={it.item||''} onChange={e=>si(it.id,'item',e.target.value)} placeholder="Product..." readOnly={readOnly}/></td>
          <td><input value={it.desc||''} onChange={e=>si(it.id,'desc',e.target.value)} placeholder="Description..." readOnly={readOnly}/></td>
          <td><input type="number" value={it.qty} onChange={e=>si(it.id,'qty',e.target.value)} min="0" step=".01" style={{textAlign:'right'}} readOnly={readOnly}/></td>
          <td><input value={it.unit||''} onChange={e=>si(it.id,'unit',e.target.value)} placeholder="pcs" readOnly={readOnly}/></td>
          <td><input type="number" value={it.price} onChange={e=>si(it.id,'price',e.target.value)} min="0" step=".01" placeholder="0.00" style={{textAlign:'right'}} readOnly={readOnly}/></td>
          <td className="lt">{sym}{fmt(lt(it))}</td>
          {!readOnly&&<td style={{textAlign:'center'}}>{items.length>1&&<button className="dlb" onClick={()=>rmL(it.id)}>×</button>}</td>}
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      {!readOnly?<Btn v="bgh bsm" onClick={addL}><Ico n="plus"/>Add Line</Btn>:<div/>}
      <div className="totbox"><span className="totlbl">Total</span><span className="totamt">{sym}{fmt(total)}</span></div>
    </div>
  </>);
}
