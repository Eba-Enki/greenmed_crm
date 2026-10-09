

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
// Bank printed on Sales & Procurement quotations/invoices: the account picked on the document (if it is in the
// document's currency), else the default — or first — account in that currency, else the overall default account
const docBank=(doc,co)=>{
  const banks=(co&&co.banks)||[];
  const cur=doc.currency||'GBP';
  const same=banks.filter(b=>(b.currency||'GBP')===cur);
  return same.find(b=>b.id===doc.bankId)||same.find(b=>b.isDefault)||same[0]||banks.find(b=>b.isDefault)||banks[0]||{};
};

// Sales & Procurement letterhead: horizontal logo, company lines, big two-line title (top right),
// date/number, then Bill To and Ship To side by side between green rules. Returns the y where the table starts.
let horizontalLogoPng=null;
const loadHorizontalLogo=async()=>{
  if(horizontalLogoPng)return horizontalLogoPng;
  const svg=await (await fetch('brand_assets/logo/logo_horizontal.svg')).text();
  // The file has wide empty margins; crop the view box to the artwork (x 8.6–93.6, y 9.2–28.1)
  const cropped=svg.replace(/viewBox="[^"]*"/,'viewBox="8.6 9.2 85 18.9" width="850" height="189"');
  horizontalLogoPng=await svgToPngDataUrl('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(cropped),52,52*18.9/85);
  return horizontalLogoPng;
};

const drawModernHeader=async(pdf,ctx)=>{
  const{doc,co,typeTitle,isInv,isPO,isPQ,isSalesQuote,fixText,borderWidth,billLabel,bill,ship,hasShipTo}=ctx;
  const L=12.025,R=198.025;
  const GREEN=[150,194,112];  // --gm-300, the light brand green

  // Title on two lines (first word, then the rest), right-aligned in the top-right corner
  const words=typeTitle.split(' ');
  const tLines=[words[0],words.slice(1).join(' ')].filter(Boolean);
  pdf.setTextColor(17,17,17);
  pdf.setFont('Arial','bold');
  let fs=20;
  const fits=()=>{pdf.setFontSize(fs);return tLines.every(t=>pdf.getTextWidth(t)<=80);};
  while(!fits()&&fs>12)fs-=0.5;
  tLines.forEach((t,i)=>pdf.text(t,R,[22,30.5][i],{align:'right'}));

  // Logo
  try{pdf.addImage(await loadHorizontalLogo(),'PNG',L,21,52,52*18.9/85);}catch(e){console.error('Logo error:',e);}

  // Company lines: bold label + value; empty ones are left out
  const info=[
    ['Address',addrCase((co.address||'').split('\n').map(s=>s.trim()).filter(Boolean).join(', '))],
    ['Phone',co.phone||''],
    ['UTR',co.utr||''],
  ].filter(([,v])=>String(v).trim());
  pdf.setFontSize(9);
  let iy=42;
  info.forEach(([label,val])=>{
    pdf.setFont('Arial','bold');
    const lw=pdf.getTextWidth(label+': ');
    pdf.text(label+':',L,iy);
    pdf.setFont('Arial','normal');
    const lines=pdf.splitTextToSize(fixText(val),140-lw); // ends before the date block
    lines.forEach((t,k)=>pdf.text(t,L+lw,iy+k*4.6));
    iy+=lines.length*4.6;
  });
  const infoEnd=iy-4.6;

  // Date / number block, right-aligned on the labels' colons
  const numLabel=isInv?'INVOICE NUMBER':isSalesQuote?'QUOTE NUMBER':isPO?'PO NUMBER':isPQ?'QUOTE NUMBER':'NUMBER';
  const meta=[['DATE',doc.date||td()],[numLabel,doc.number||'']];
  if(isInv&&doc.quoteNum)meta.push(['PI NUMBER',doc.quoteNum]);
  pdf.setFont('Arial','normal');
  pdf.setFontSize(9);
  const valW=Math.max(...meta.map(([,v])=>pdf.getTextWidth(fixText(v))));
  const colonX=R-valW-2.5;
  let my=50;
  meta.forEach(([label,val])=>{
    pdf.setFont('Arial','bold');
    pdf.text(label+' :',colonX,my,{align:'right'});
    pdf.setFont('Arial','normal');
    pdf.text(fixText(val),colonX+1.5,my);
    my+=4.8;
  });
  const metaEnd=my-4.8;

  // Bill To / Ship To between green rules
  const top=Math.max(infoEnd,metaEnd)+9;
  const colW=88;
  const block=(x,heading,p)=>{
    let y=top+6;
    pdf.setFont('Arial','bold');
    pdf.setFontSize(9);
    pdf.text(heading.toUpperCase(),x+1,y);
    y+=7.5;
    pdf.splitTextToSize(fixText(p.company||'—'),colW-2).forEach((t,k)=>{if(k)y+=4.6;pdf.text(t,x+1,y);});
    pdf.setFont('Arial','normal');
    pdf.setFontSize(8.5);
    [addrCase(p.address),p.contact,p.email].filter(v=>v&&String(v).trim()).forEach(v=>{
      pdf.splitTextToSize(fixText(v),colW-2).forEach(t=>{y+=4.5;pdf.text(t,x+1,y);});
    });
    return y;
  };
  const endL=block(L,billLabel,bill);
  const endR=hasShipTo?block(R-colW,'Ship To',ship):top;
  const bottom=Math.max(endL,endR)+5.5;
  pdf.setDrawColor(...GREEN);
  pdf.setLineWidth(0.3);
  pdf.line(L,top,L+colW,top);pdf.line(L,bottom,L+colW,bottom);
  if(hasShipTo){pdf.line(R-colW,top,R,top);pdf.line(R-colW,bottom,R,bottom);}

  // Project No & Terms (only when filled in)
  pdf.setLineWidth(borderWidth);
  pdf.setDrawColor(158,158,158);
  let tableY=bottom+7;
  if(String(doc.projectNumber||'').trim()||String(doc.terms||'').trim()){
    const ry=bottom+7.5;
    pdf.setFontSize(8);
    pdf.setFont('Arial','bold');pdf.text('Project No',L+1,ry);
    pdf.setFont('Arial','normal');pdf.text(': '+fixText(doc.projectNumber||''),L+27,ry);
    pdf.setFont('Arial','bold');pdf.text('Terms',96,ry);
    pdf.setFont('Arial','normal');pdf.text(': '+fixText(doc.terms||''),122,ry);
    tableY=bottom+12.5;
  }
  return tableY;
};

// opts.fullBank: print the full bank block (account name, number, IBAN, SWIFT/BIC, currency, bank name and address)
// opts.modern: Sales & Procurement letterhead (drawModernHeader) and no page frame
const buildStandardPDF=async(doc,co,type,opts={})=>{
  await ensurePDF();
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
  
  const ship=doc.shipTo||{};
  const shipCompany=ship.company||'';
  const shipContact=ship.contact||'';
  const shipEmail=ship.email||'';
  const shipAddr=ship.address||'';
  // Ship To is printed only when something was filled in; otherwise the rest of the page moves up into its space
  const hasShipTo=[shipCompany,shipContact,shipEmail,shipAddr].some(v=>String(v).trim());
  const yo=hasShipTo?0:67.5-88.447;
  
  const defaultBank=(co.banks||[]).find(b=>b.isDefault)||(co.banks||[])[0]||{};
  const addrLines=(co.address||'').split('\n');
  
  // Set line width for all borders
  const borderWidth=0.25/2.83465; // 0.25pt to mm
  pdf.setLineWidth(borderWidth);
  pdf.setDrawColor(158,158,158); // #9E9E9E
  
  let modernTableY=0;
  if(opts.modern){
    modernTableY=await drawModernHeader(pdf,{doc,co,typeTitle,isInv,isPO,isPQ,isSalesQuote,fixText,borderWidth,
      billLabel:isPO?'Vendor':isPQ?'Supplier':'Bill To',
      bill:{company:billCompany,address:billAddr,contact:billContact,email:billEmail},
      ship:{company:shipCompany,address:shipAddr,contact:shipContact,email:shipEmail},hasShipTo});
  }else{
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
    pdf.line(12.025,88.447+yo,198.025,88.447+yo);
  
    // Project No & Terms
    pdf.setFont('Arial','bold');
    pdf.text('Project No',16.031,90.217+yo+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(doc.projectNumber||''),42.948,90.217+yo+2.5);
  
    pdf.setFont('Arial','bold');
    pdf.text('Terms',96,90.217+yo+2.5);
    pdf.setFont('Arial','normal');
    pdf.text(': '+fixText(doc.terms||''),122,90.217+yo+2.5);
  
    // Horizontal Line 3
    pdf.line(12.025,94.971+yo,198.025,94.971+yo);
  
  }

  // Table
  const tableX=12.025;
  const tableY=opts.modern?modernTableY:95.538+yo;
  const tableW=186;
  const headerH=opts.modern?7:5.421;
  const rowH=opts.modern?6.4:4.854;
  
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
  
  // Cell text per row: left-aligned columns (item, description, brand…) wrap onto extra lines instead of
  // being cut off, and each row grows to fit its tallest cell
  const lineH=opts.modern?3.7:3.3;
  pdf.setFont('Arial','normal');
  pdf.setFontSize(8);
  const rows=(doc.items||[]).map((it,i)=>{
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
    const cells=cols.map((col,j)=>col.align==='left'?pdf.splitTextToSize(data[j],col.w-4):[data[j]]);
    const n=Math.max(...cells.map(c=>c.length));
    return{cells,h:Math.max(rowH,rowH+(n-1)*lineH)};
  });
  // Pages: every page has the same frame; a page that continues the document starts with a slim band
  // (company, document type and number) instead of the full letterhead
  const FRAME_TOP=17.965,FRAME_BOT=278.965;
  const newPage=()=>{
    pdf.addPage();
    pdf.setLineWidth(borderWidth);
    pdf.setDrawColor(158,158,158);
    pdf.setTextColor(17,17,17);
    if(!opts.modern)pdf.rect(12.025,FRAME_TOP,186,261);
    pdf.setFont('Arial','bold');
    pdf.setFontSize(9);
    pdf.text(fixText(co.name||'Green Med Ltd'),16.031,FRAME_TOP+5.3);
    pdf.text(typeTitle+'   '+docLabel+' '+(doc.number||''),195.025,FRAME_TOP+5.3,{align:'right'});
    pdf.line(12.025,FRAME_TOP+8,198.025,FRAME_TOP+8);
    return FRAME_TOP+8;
  };

  // Table header row (repeated at the top of every page the table runs onto)
  const drawTableHeader=top=>{
    pdf.setFont('Arial','bold');
    pdf.setFontSize(8);
    pdf.line(tableX,top+headerH,tableX+tableW,top+headerH);
    cols.forEach((col,i)=>{
      if(i<cols.length-1){
        pdf.line(tableX+col.x+col.w,top,tableX+col.x+col.w,top+headerH);
      }
      const textX=tableX+col.x+(col.align==='center'?col.w/2:col.align==='right'?col.w-3:2);
      pdf.text(col.label,textX,top+headerH/2+1,{align:col.align});
    });
    pdf.setFont('Arial','normal');
    return top+headerH;
  };

  // Data rows; a row that does not fit moves to a new page, and each page's part of the table gets its own border
  let segTop=tableY;
  let y=drawTableHeader(tableY);
  rows.forEach(({cells,h})=>{
    if(y+h>FRAME_BOT&&y>segTop+headerH){
      pdf.rect(tableX,segTop,tableW,y-segTop);
      segTop=newPage();
      y=drawTableHeader(segTop);
    }
    // Row horizontal line
    pdf.line(tableX,y+h,tableX+tableW,y+h);

    // Row vertical lines
    cols.forEach((col,j)=>{
      if(j<cols.length-1){
        pdf.line(tableX+col.x+col.w,y,tableX+col.x+col.w,y+h);
      }
    });

    // Cell text, top-aligned; wrapped lines continue below the first
    cols.forEach((col,j)=>{
      const textX=tableX+col.x+(col.align==='center'?col.w/2:col.align==='right'?col.w-3:2);
      cells[j].forEach((t,k)=>pdf.text(t,textX,y+rowH/2+1+k*lineH,{align:col.align}));
    });
    y+=h;
  });
  pdf.rect(tableX,segTop,tableW,y-segTop);

  // Notes, totals, total in words and bank details stay together. They are laid out once without drawing to
  // measure them; if they (or the signature below them) would not fit, they start on a new page.
  const summary=(lastRowY,draw)=>{
    const P=draw?pdf:{
      text(){},line(){},setDrawColor(){},setLineWidth(){},
      setFont:(...a)=>pdf.setFont(...a),
      setFontSize:(...a)=>pdf.setFontSize(...a),
      splitTextToSize:(...a)=>pdf.splitTextToSize(...a)
    };
    const notesY=lastRowY+(opts.modern?9:3);

    let notesEndY;
    if(opts.modern){
      // Sales letterhead: "TERMS AND CONDITIONS" laid out like the Bill To block — green rule, heading, then the notes
      P.setDrawColor(150,194,112);
      P.setLineWidth(0.3);
      P.line(12.025,notesY,100.025,notesY);
      P.setLineWidth(borderWidth);
      P.setDrawColor(158,158,158);
      P.setFont('Arial','bold');
      P.setFontSize(9);
      P.text('TERMS AND CONDITIONS',13.025,notesY+6);
      P.setFont('Arial','normal');
      P.setFontSize(8.5);
      const noteLines=String(doc.notes||'').trim()?P.splitTextToSize(fixText(doc.notes),86):[];
      noteLines.forEach((t,k)=>P.text(t,13.025,notesY+12.5+k*4.4));
      notesEndY=noteLines.length?notesY+12.5+(noteLines.length-1)*4.4:notesY+6;
    }else{
      P.setFont('Arial','bold');
      P.setFontSize(8);
      P.text('Notes :',13.651,notesY+2.5);
      P.setFont('Arial','normal');
      // Notes wrap before the totals column; the Total In Words line below moves down to clear them
      const noteLines=P.splitTextToSize(fixText(doc.notes||''),116);
      noteLines.forEach((t,k)=>P.text(t,24,notesY+2.5+k*3.3));
      notesEndY=notesY+2.5+(noteLines.length-1)*3.3;
    }

    // Sub Total & Total
    const subTotalY=notesY+(opts.modern?9.5:8);
    P.setFont('Arial','normal');
    P.setFontSize(8);
    P.text('Sub Total',146.775,subTotalY+2.5);
    P.text(fmt(total),195-3,subTotalY+2.5,{align:'right'});

    const totalY=subTotalY+(opts.modern?6:4.5);
    P.setFont('Arial','bold');
    P.setFontSize(9);
    P.text('Total',151.252,totalY+2.5);
    P.text(sym+fmt(total),195-3,totalY+2.5,{align:'right'});

    // Horizontal Line 4
    const totalWordsY=opts.modern?Math.max(totalY+9,notesEndY+7):Math.max(totalY+6,notesEndY+3.5);
    P.line(12.025,totalWordsY-1,198.025,totalWordsY-1);
    let endY=totalWordsY+4;

    // Total In Words - Arial 8pt bold (label) + Arial 8pt regular (value)
    // Show for sales_quote and po (purchase orders) regardless of currency
    if(doc.currency==='GBP'||(type==='sales_quote'||type==='po')){
      P.setFont('Arial','bold');
      P.setFontSize(8);
      P.text('Total In Words :',13.651,totalWordsY+2.5);
      P.setFont('Arial','normal');
      P.setFontSize(8);
      P.text(fixText(toW(total,doc.currency||'GBP')),39,totalWordsY+2.5);
    }

    // Bank Details - only for invoices and sales quotes, NOT for purchase quotes
    if(!isPQ){
      // Horizontal Line 5
      const bankY=totalWordsY+(opts.modern?11:8);
      P.line(12.025,bankY-2,198.025,bankY-2);

      // Bank Details
      P.setFont('Arial','normal');
      P.setFontSize(8);
      let line6Y=bankY+12;
      if(opts.fullBank){
        // Two columns: account details on the left, currency and bank on the right (long values wrap)
        const b=docBank(doc,co);
        const lh=opts.modern?4.2:3.267;
        const col=(rows,lx,vx,w)=>{
          let y=bankY+(opts.modern?4:2.5);
          rows.forEach(([label,val])=>{
            // Colon in its own column like the Bill To block; wrapped lines align under the value
            P.setFont('Arial','bold');P.text(label,lx,y);
            P.setFont('Arial','normal');P.text(':',vx,y);
            const lines=val?P.splitTextToSize(fixText(val),w):[''];
            lines.forEach(t=>{P.text(t,vx+2,y);y+=lh;});
          });
          return y;
        };
        const endL=col([['Account Name',b.accountName||co.name||''],['Account No',b.accountNumber||''],['IBAN',b.iban||''],['SWIFT/BIC',b.bic||'']],13.651,35,65);
        const endR=col([['Currency',b.currency||doc.currency||'GBP'],['Bank Name',b.bankName||''],['Bank Address',b.bankAddress||'']],108,128.5,64);
        line6Y=Math.max(endL,endR)-lh+(opts.modern?4.5:3);
      }else{
        P.text('Account Number: '+(defaultBank.accountNumber||''),13.651,bankY+2.5);
        P.text('IBAN: '+(defaultBank.iban||''),13.651,bankY+3.267+2.5);
        P.text('BIC: '+(defaultBank.bic||''),13.651,bankY+6.533+2.5);
      }

      // Horizontal Line 6 (dynamically positioned after bank details)
      P.line(12.025,line6Y,198.025,line6Y);
      endY=line6Y;
    }
    return endY;
  };

  // Footer position (fixed at bottom of page)
  const footerY=285.176;

  // Signature (if enabled) sits above the footer on the last page, so the summary must end above it there
  const pdfSignature=getSignature()||co.signature||'';
  const withSignature=!!(doc.signatureEnabled&&pdfSignature);
  const sigY=footerY-35;
  const summaryLimit=withSignature?sigY-1:FRAME_BOT-1;
  let summaryTop=y;
  if(summary(summaryTop,false)>summaryLimit)summaryTop=newPage();
  summary(summaryTop,true);

  if(withSignature){
    try{
      const imgFormat=pdfSignature.startsWith('data:image/png')?'PNG':pdfSignature.startsWith('data:image/jpeg')||pdfSignature.startsWith('data:image/jpg')?'JPEG':'PNG';
      pdf.addImage(pdfSignature,imgFormat,150,sigY,45.93,29.59);
    }catch(e){console.error('Signature error:',e);}
  }

  // Footer (FIXED position at bottom of every page) with the page number bottom-right
  const pageCount=pdf.internal.getNumberOfPages();
  for(let p=1;p<=pageCount;p++){
    pdf.setPage(p);
    pdf.setFont('Arial','normal');
    pdf.setFontSize(8);
    pdf.setTextColor(17,17,17);
    pdf.text('web: '+(co.website||'www.greenmed.uk'),50.694,footerY+2.5);
    pdf.text('|',84.126,footerY+0.401+2.5);
    pdf.text('e-mail: '+(co.email||'info@greenmed.uk'),87.473,footerY+2.5);
    pdf.text('|',123.908,footerY+0.401+2.5);
    pdf.text('Tel: '+(co.phone||'+44 750 751 6818'),127.255,footerY+2.5);
    pdf.text(p+'/'+pageCount,198.025,footerY+2.5,{align:'right'});
  }
  pdf.setPage(pageCount);

  return pdf;
};

const savePDF=async(doc,co,type='invoice',opts)=>{
  try{
    const pdf=await buildStandardPDF(doc,co,type,opts);
    const filename=`${type}_${doc.number||'draft'}_${td()}.pdf`;
    pdf.save(filename);
  }catch(e){
    alert('PDF could not be generated: '+e.message);
    console.error('PDF generation failed:',e);
  }
};
// Builds one PDF per document and downloads them together as a ZIP. onProgress(i,n) runs before each PDF.
const downloadPDFZip=async(docs,co,type,opts,zipName,onProgress)=>{
  try{await ensureZIP();}catch(e){libLoadFailed();return false;}
  try{
    const zip=new JSZip();
    const used={};
    for(let i=0;i<docs.length;i++){
      if(onProgress)onProgress(i+1,docs.length);
      const pdf=await buildStandardPDF(docs[i],co,type,opts);
      const base=`${type}_${docs[i].number||'draft'}`;
      used[base]=(used[base]||0)+1;
      zip.file(base+(used[base]>1?'_'+used[base]:'')+'.pdf',pdf.output('arraybuffer'));
    }
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${zipName}_${td()}.zip`;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),10000);
    return true;
  }catch(e){
    alert('PDF could not be generated: '+e.message);
    console.error('PDF ZIP failed:',e);
    return false;
  }
};
const exportExcel=(rows,name)=>ensureXLSX().then(()=>{const ws=XLSX.utils.aoa_to_sheet(rows);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Data');XLSX.writeFile(wb,`${name}-${td()}.xlsx`);},libLoadFailed);

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

// itemNote (optional): it=>text shown in small print under a line's description (in-app only, never on the PDF)
function DocSummaryBody({doc,co,docType,itemNote}){
  const isSrc=docType==='src_quote'||docType==='src_invoice'; // group company's source quote / invoice (supplier side, no ship-to)
  const sym=CURR[doc.currency]||'£';
  const total=dt(doc.items||[]);
  const isInv=docType==='invoice';
  const isPO=docType==='po';
  const isPQ=docType==='quote';

  const typeLabel=isSrc?(docType==='src_quote'?'Source Quote':'Source Invoice'):isInv?'Commercial Invoice':docType==='sales_quote'?'Sales Quotation':isPO?'Purchase Order':isPQ?'Received Quote':'Document';

  const partyLabel=(isPO||isPQ||isSrc)?'Supplier':'Bill To';
  const partyCompany=(isPO||isPQ||isSrc)?(doc.supplierCompany||'—'):((doc.client&&doc.client.company)||'—');
  const partyContact=(isPO||isPQ||isSrc)?(doc.supplierContact||''):((doc.client&&doc.client.contact)||'');
  const partyEmail=(isPO||isPQ||isSrc)?(doc.supplierEmail||''):((doc.client&&doc.client.email)||'');
  const partyAddr=(isPO||isPQ||isSrc)?(doc.supplierAddress||''):((doc.client&&doc.client.address)||'');

  const hasShipTo=!isSrc&&(((doc.shipToEnabled||doc.shipTo)&&!isPO)||isPQ||isPO);
  const shipTo=doc.shipTo||{};

  const statusMap={draft:'b-draft',sent:'b-sent',approved:'b-approved',paid:'b-paid',received:'b-received',locked:'b-locked',declined:'b-declined',cancelled:'b-cancelled','po-created':'b-po-created',pending:'b-pending',closed:'b-closed',overdue:'b-overdue'};
  const statusClass=statusMap[doc.status]||'b-draft';
  const statusLabel=doc.status?(doc.status.charAt(0).toUpperCase()+doc.status.slice(1).replace(/-/g,' ')):'Draft';

  return(
        <div className="pv2-wrap" lang="en">

          <div className="pv2-hdr">
            <div className="pv2-hdr-left">
              <div className="pv2-type-label">{typeLabel}</div>
              <div className="pv2-docnum">{doc.number||'—'}</div>
            </div>
            <div className="pv2-hdr-right">
              <div className="pv2-hdr-badges">
                {isInv&&doc.quoteNum&&<span className="pv2-linked">From {doc.quoteNum}</span>}
                {doc.status&&<span className={`bdg ${statusClass}`}>{statusLabel}</span>}
              </div>
              <div className="pv2-hdr-meta">
                <span><b>{doc.date||td()}</b></span>
                <span className="pv2-hdr-sep">·</span>
                <span>{doc.currency||'GBP'} ({sym})</span>
                {doc.validity&&<><span className="pv2-hdr-sep">·</span><span>Valid until <b>{doc.validity}</b></span></>}
                {doc.project&&<><span className="pv2-hdr-sep">·</span><span>{doc.project}</span></>}
              </div>
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
                    <td style={{color:'var(--g800)'}}>{it.desc||'—'}{itemNote&&itemNote(it)&&<div className="pv2-itemnote">{itemNote(it)}</div>}</td>
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
  );
}

function Preview({doc,co,docType,onBack,onEdit,pdfOpts}){
  return(
    <div>
      <div className="pvbar no-print">
        <button className="pvbtn" onClick={onBack}><Ico n="back"/>{tr("Back")}</button>
        {onEdit&&<button className="pvbtn" onClick={onEdit}><Ico n="edit"/>{tr("Edit")}</button>}
        <div style={{flex:1}}/>
        <button className="pvbtn primary" onClick={()=>savePDF(doc,co,docType,pdfOpts)}><Ico n="dl"/>{tr("Save PDF")}</button>
      </div>
      <div className="pv2-outer">
        <DocSummaryBody doc={doc} co={co} docType={docType}/>
      </div>
    </div>
  );
}

// noPdf: records that are only filed, never printed (source quotes / invoices)
function DocQuickModal({doc,co,docType,onClose,onEdit,onDelete,extraActions,pdfOpts,itemNote,noPdf}){
  useEscape(onClose);
  const statusMap={draft:'b-draft',sent:'b-sent',approved:'b-approved',paid:'b-paid',received:'b-received',locked:'b-locked',declined:'b-declined',cancelled:'b-cancelled','po-created':'b-po-created',pending:'b-pending',closed:'b-closed',overdue:'b-overdue'};
  const statusClass=statusMap[doc.status]||'b-draft';
  const statusLabel=doc.status?((SM[doc.status]&&SM[doc.status].l)||(doc.status.charAt(0).toUpperCase()+doc.status.slice(1).replace(/-/g,' '))):tr('Draft');
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'#fff',borderRadius:14,width:900,maxWidth:'100%',maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,.25)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'16px 24px',borderBottom:'1px solid var(--g200)',flexShrink:0}}>
          <span style={{fontSize:11,fontWeight:700,color:'var(--g400)',textTransform:'uppercase',letterSpacing:'.5px'}}>{doc.number||'—'}</span>
          {doc.status&&<span className={`bdg ${statusClass}`}>{statusLabel}</span>}
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'var(--g400)',lineHeight:1}}>×</button>
        </div>
        <div style={{overflowY:'auto',padding:'20px 24px',flex:1}}>
          <DocSummaryBody doc={doc} co={co} docType={docType} itemNote={itemNote}/>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'14px 24px',borderTop:'1px solid var(--g200)',flexShrink:0}}>
          {onDelete&&<button className="ab danger" onClick={onDelete}><Ico n="trash"/></button>}
          <div style={{flex:1}}/>
          <Btn v="bgh bsm" onClick={onClose}>{tr("Close")}</Btn>
          {onEdit&&<Btn v="bgh bsm" onClick={onEdit}>{tr("Edit")}</Btn>}
          {(extraActions||[]).map((a,i)=><Btn key={i} v="bgh bsm" onClick={a.onClick}>{a.label}</Btn>)}
          {!noPdf&&<Btn v="bp bsm" onClick={()=>savePDF(doc,co,docType,pdfOpts)}><Ico n="dl"/>{tr("Download PDF")}</Btn>}
        </div>
      </div>
    </div>
  );
}

// Generic line items editor
// match (optional): {options:[{key,label}]} adds a "Customer Item" column whose select stores the chosen key
// in item.sqKey; a key already picked on another line is disabled so each customer item is matched once.
function ItemsEditor({items,setItems,currency,readOnly,match}){
  const sym=CURR[currency]||'£';
  const si=(id,f,v)=>setItems(items.map(i=>i.id===id?{...i,[f]:v}:i));
  const addL=()=>setItems([...items,{id:uid(),item:'',desc:'',qty:'1',unit:'',price:''}]);
  const rmL=id=>setItems(items.filter(i=>i.id!==id));
  const total=dt(items);
  const heads=match
    ?[['Item','11%'],['Description','22%'],['Customer Item','20%'],['Qty','7%'],['Unit','7%'],['Unit Price','11%'],['Total','10%'],['','4%']]
    :[['Item','13%'],['Description','27%'],['Qty','8%'],['Unit','9%'],['Unit Price','12%'],['Total','11%'],['','4%']];
  const usedKeys=it=>new Set(items.filter(x=>x.id!==it.id&&x.sqKey).map(x=>x.sqKey));
  return(<>
    <div className="iw">
      <table className="ie">
        <thead><tr>{heads.map(([h,w],i)=><th key={i} style={{textAlign:['Qty','Unit Price','Total'].includes(h)?'right':'left',width:w}}>{h&&tr(h)}</th>)}</tr></thead>
        <tbody>{items.map(it=><tr key={it.id}>
          <td><input value={it.item||''} onChange={e=>si(it.id,'item',e.target.value)} placeholder={tr("Product...")} readOnly={readOnly}/></td>
          <td><input value={it.desc||''} onChange={e=>si(it.id,'desc',e.target.value)} placeholder={tr("Description...")} readOnly={readOnly}/></td>
          {match&&<td>{(()=>{const used=usedKeys(it);return(
            <select value={it.sqKey||''} onChange={e=>si(it.id,'sqKey',e.target.value)} disabled={readOnly} title={(match.options.find(o=>o.key===it.sqKey)||{}).label||''}
              style={{width:'100%',color:it.sqKey?'var(--g800)':'var(--g400)'}}>
              <option value="">{tr("— Not matched —")}</option>
              {match.options.map(o=><option key={o.key} value={o.key} disabled={used.has(o.key)}>{o.label}</option>)}
              {it.sqKey&&!match.options.some(o=>o.key===it.sqKey)&&<option value={it.sqKey}>{tr("(item no longer in quotation)")}</option>}
            </select>);})()}</td>}
          <td><input type="number" value={it.qty} onChange={e=>si(it.id,'qty',e.target.value)} min="0" step=".01" style={{textAlign:'right'}} readOnly={readOnly}/></td>
          <td><input value={it.unit||''} onChange={e=>si(it.id,'unit',e.target.value)} placeholder="pcs" readOnly={readOnly}/></td>
          <td><input type="number" value={it.price} onChange={e=>si(it.id,'price',e.target.value)} min="0" step=".01" placeholder="0.00" style={{textAlign:'right'}} readOnly={readOnly}/></td>
          <td className="lt">{sym}{fmt(lt(it))}</td>
          {!readOnly&&<td style={{textAlign:'center'}}>{items.length>1&&<button className="dlb" onClick={()=>rmL(it.id)}>×</button>}</td>}
        </tr>)}</tbody>
      </table>
    </div>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      {!readOnly?<Btn v="bgh bsm" onClick={addL}><Ico n="plus"/>{tr("Add Line")}</Btn>:<div/>}
      <div className="totbox"><span className="totlbl">{tr("Total")}</span><span className="totamt">{sym}{fmt(total)}</span></div>
    </div>
  </>);
}
