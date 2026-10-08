
// ==========================
// STARTUP SPLASH — same markup as the static one in index.html, so the hand-over to React is seamless
// ==========================
function Splash(){
  return <div className="splash splash-app" role="status" aria-label={tr('Loading')}><img className="splash-logo" src="brand_assets/Greenmed_Logo_General_Favicon.svg" alt=""/><span className="splash-ring"/></div>;
}

// ==========================
// LANGUAGE SWITCH (EN | TR)
// ==========================
// onChange defaults to switching right away; the portals pass a version that first asks about unsaved form changes.
function LangSwitch({onChange=setLang,className=''}){
  return(
    <div className={'lang-sw'+(className?' '+className:'')} role="group" aria-label={tr('Language')}>
      {LANGS.map(l=><button key={l} type="button" className={l===LANG?'on':''} aria-pressed={l===LANG} lang={l} onClick={()=>{if(l!==LANG)onChange(l);}}>{l.toUpperCase()}</button>)}
    </div>
  );
}

// ==========================
// LOGIN SCREEN
// ==========================
function LoginScreen({onLogin}){
  const[username,setUsername]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(false);
  const logo=useLogo();

  const handleLogin=async()=>{
    if(!username||!password){setError(tr('Username and password required'));return;}
    setLoading(true);setError('');
    try{
      // The server verifies the password and returns the account (without its hash).
      let user;
      try{({user}=await apiCall('login.php',{method:'POST',body:JSON.stringify({username,password})}));}
      catch(e){setError(e.status===401?tr('Incorrect username or password'):tr('Server error: ')+e.message);setLoading(false);return;}
      // Changes this user left unsent last time go first, so the fresh server data includes them
      Sync.adoptPending(user.id);
      await Sync.flushNow();
      await Sync.pull();
      const portals=user.portals||{};
      const accessible=Object.entries(portals).filter(([,r])=>r).map(([k])=>k);
      if(accessible.length===0){setError(tr('This account has no portal access'));setLoading(false);return;}
      onLogin(user,accessible);
    }catch(e){setError(tr('Login error: ')+e.message);setLoading(false);}
  };

  return(
    <div className="acc-screen">
      <LangSwitch className="lang-sw-corner"/>
      <div style={{maxWidth:'420px',width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src={logo||LOGO} style={{width:130,height:'auto',display:'block',margin:'0 auto 16px'}} alt="Green Med Ltd"/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:8}}>{tr("Green Med Ltd")}</h2>
          <p style={{fontSize:14,color:'var(--g500)'}}>{tr("Sign in to your account")}</p>
        </div>
        <div style={{background:'#fff',border:'1px solid var(--gm-border)',borderRadius:12,padding:28,boxShadow:'0 8px 28px rgba(26,42,10,.08)'}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>{tr("Username")}</label>
            <input type="text" value={username} onChange={e=>{setUsername(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder={tr("Your username")} autoFocus style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>{tr("Password")}</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder={tr("Your password")} autoComplete="current-password" style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {error&&<div style={{background:'rgba(192,57,43,.08)',border:'1.5px solid rgba(192,57,43,.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'var(--red)',fontSize:13,fontWeight:500}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'12px',borderRadius:8,border:'none',background:'linear-gradient(135deg,var(--gm-400),var(--gm-500))',color:'#fff',fontSize:14,fontWeight:600,cursor:loading?'default':'pointer',boxShadow:'0 4px 14px rgba(96,132,37,.3)',opacity:loading?.7:1}}>
            {loading?tr('Signing in...'):tr('Sign In')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================
// PORTAL SELECT SCREEN
// ==========================
const PORTAL_INFO={
  off:{label:tr('Official'),desc:tr('Finance, invoicing and accounting'),color:'var(--gm-400)',ico:'bank'},
  ops:{label:tr('Sales & Procurement'),desc:tr('Sales, procurement and project management'),color:'var(--gm-600)',ico:'income'},
  system:{label:tr('System Management'),desc:tr('User and system management'),color:'var(--g700)',ico:'shield'}
};

const isAdminUser=u=>Object.values((u&&u.portals)||{}).includes('Admin');

function PortalSelectScreen({user,portals,onSelect}){
  const logo=useLogo();
  const list=portals.filter(p=>p!=='system');
  return(
    <div className="acc-screen">
      <LangSwitch className="lang-sw-corner"/>
      <div className="ps-wrap">
        <img src={logo||LOGO} className="ps-logo" alt="Green Med Ltd"/>
        {!logo&&<h2 className="ps-title">{tr("Green Med Ltd")}</h2>}{/* an uploaded logo already carries the name */}
        <p className="ps-sub">{tr("Please select the portal you want to use")}</p>
        <div className="ps-cards">
          {list.map(p=>{
            const info=PORTAL_INFO[p]||{label:p,desc:'',ico:'dash'};
            return(
              <button key={p} className={`ps-card ps-${p}`} onClick={()=>onSelect(p)}>
                <span className="ps-ico"><Ico n={info.ico} size={26}/></span>
                <span className="ps-name">{info.label}</span>
                <span className="ps-desc">{info.desc}</span>
                <span className="ps-go">{tr("Enter Portal")} <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></span>
              </button>
            );
          })}
        </div>
        {isAdminUser(user)&&(
          <button className="ps-sys" onClick={()=>onSelect('system')}><Ico n="settings" size={12}/><span>{tr("System Management")}</span></button>
        )}
      </div>
    </div>
  );
}

// ==========================
// PORTAL DROPDOWN (sidebar)
// ==========================
function PortalDropdown({session,onPortalSwitch}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener('mousedown',h);
    return()=>document.removeEventListener('mousedown',h);
  },[]);

  const portals=session.portals||{};
  const list=Object.entries(portals).filter(([k,r])=>r&&k!=='system').map(([k])=>k);

  return(
    <div ref={ref} style={{position:'relative'}}>
      <button className="sb-acc-pill" onClick={()=>setOpen(o=>!o)} aria-haspopup="menu" aria-expanded={open}>
        <img className="sb-acc-logo" src={LOGO} alt=""/>
        <span className="sb-acc-txt">
          <span className="sb-acc-co">Green Med Ltd</span>
          <span className="sb-acc-name">{(PORTAL_INFO[session.activePortal]||{label:session.activePortal}).label}</span>
        </span>
        <svg viewBox="0 0 24 24" style={{width:13,height:13,stroke:'var(--g400)',fill:'none',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round',transform:open?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
      </button>
      {open&&(
        <div className="portal-dropdown">
          {list.map(p=>{
            const info=PORTAL_INFO[p]||{label:p};
            const active=p===session.activePortal;
            return(
              <button key={p} className={`pd-item${active?' pd-active':''}`} onClick={()=>{onPortalSwitch(p);setOpen(false);}}>
                <span className="pd-check">{active&&<svg viewBox="0 0 24 24" style={{width:11,height:11,stroke:'currentColor',fill:'none',strokeWidth:2.5,strokeLinecap:'round',strokeLinejoin:'round'}}><polyline points="20 6 9 17 4 12"/></svg>}</span>
                {info.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==========================
// PORTAL SIDEBAR (Buzz-style): portal switcher, search, sections, user card
// ==========================
// sb is the portal's menu list: {sec|group} headers, {div} separators (ignored) and {k,ico,lbl,cnt} items.
// Each section shows the icon of its first item, like the small emoji next to Buzz's section names.
const sbSections=sb=>{
  const out=[];let cur=null;
  sb.forEach(it=>{
    const head=it.sec||it.group;
    if(head){cur={label:head,items:[]};out.push(cur);return;}
    if(it.div||!it.k)return;
    if(!cur){cur={label:'',items:[]};out.push(cur);}
    cur.items.push(it);
  });
  return out;
};

function SidebarSearch({items,onGo,q,setQ}){
  const ref=useRef(null);
  useEffect(()=>{
    // Ctrl+K / ⌘K jumps to the search box from anywhere
    const h=e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();ref.current&&ref.current.focus();}};
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  },[]);
  const isMac=/Mac/.test(navigator.platform||'');
  return(
    <label className="sb-search">
      <Ico n="search" size={15}/>
      <input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder={tr('Search everything')} aria-label={tr('Search everything')}
        onKeyDown={e=>{
          if(e.key==='Escape'){setQ('');e.currentTarget.blur();}
          if(e.key==='Enter'&&items[0]){onGo(items[0].k);setQ('');e.currentTarget.blur();}
        }}/>
      {!q&&<kbd>{isMac?'⌘K':'Ctrl K'}</kbd>}
    </label>
  );
}

function SidebarUserMenu({session,portalLabel,onOpenProfile,onLogout,onLang}){
  const[open,setOpen]=useState(false);
  const ref=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const h=e=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    const k=e=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',h);document.addEventListener('keydown',k);
    return()=>{document.removeEventListener('mousedown',h);document.removeEventListener('keydown',k);};
  },[open]);
  const name=`${session.firstName||''} ${session.lastName||''}`.trim()||session.username||'';
  return(
    <div className="sb-me-wrap" ref={ref}>
      {open&&(
        <div className="sb-menu" role="menu">
          <button role="menuitem" className="sb-menu-item" onClick={()=>{setOpen(false);onOpenProfile();}}><Ico n="user" size={15}/>{tr('Profile')}</button>
          <div className="sb-menu-row"><span><Ico n="globe" size={15}/>{tr('Language')}</span><LangSwitch onChange={onLang}/></div>
          <div className="sb-menu-sep"/>
          <button role="menuitem" className="sb-menu-item danger" onClick={()=>{setOpen(false);onLogout();}}><Ico n="logout" size={15}/>{tr('Log Out')}</button>
        </div>
      )}
      <button className={`sb-me${open?' open':''}`} onClick={()=>setOpen(o=>!o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="sb-avatar">{(name[0]||'?').toUpperCase()}<i className="sb-presence"/></span>
        <span className="sb-me-txt">
          <span className="sb-me-name">{name}</span>
          <span className="sb-me-sub"><img src={LOGO} alt=""/>{portalLabel}</span>
        </span>
      </button>
    </div>
  );
}

// "New since I last opened this page": the record ids seen on each page are kept per user in this browser.
// The first time a page is tracked everything counts as seen, so nobody starts with a wall of dots.
const seenKey=(session,k)=>`gm_seen_${session.userId}_${session.activePortal}_${k}`;
const readSeen=(session,k)=>{try{const v=localStorage.getItem(seenKey(session,k));return v?new Set(JSON.parse(v)):null;}catch{return null;}};
const writeSeen=(session,k,ids)=>{try{localStorage.setItem(seenKey(session,k),JSON.stringify(ids));}catch{}};

function PortalSidebar({sb,isActive,onGo,session,onPortalSwitch,onOpenProfile,onLogout,onLang}){
  const[q,setQ]=useState('');
  const tracked=sb.filter(it=>it.k&&Array.isArray(it.ids));
  // Opening a page marks its records as seen; untracked pages get their starting point. Empty lists are
  // skipped: a portal's first render has empty lists until its data is read, and recording that as "seen"
  // would make every existing record look new a moment later.
  useEffect(()=>{
    tracked.forEach(it=>{if(it.ids.length&&(isActive(it.k)||readSeen(session,it.k)===null))writeSeen(session,it.k,it.ids);});
  });
  const newCount=it=>{
    if(!Array.isArray(it.ids)||isActive(it.k))return 0;
    const seen=readSeen(session,it.k);
    return seen?it.ids.filter(id=>!seen.has(id)).length:0;
  };
  const portalLabel=(PORTAL_INFO[session.activePortal]||{label:session.activePortal}).label;
  const sections=sbSections(sb);
  const ql=q.trim().toLocaleLowerCase(LANG);
  const matches=ql?sections.flatMap(s=>s.items).filter(it=>String(it.lbl).toLocaleLowerCase(LANG).includes(ql)):[];
  const item=it=>{
    const n=newCount(it);
    const why=[...(it.att||[]),...(n?[tr('{0} new',n)]:[])].join(', ');
    return(
      <button key={it.k} className={`sb-item${isActive(it.k)?' active':''}${why?' att':''}`} onClick={()=>{setQ('');onGo(it.k);}} aria-current={isActive(it.k)?'page':undefined} title={why||undefined}>
        <Ico n={it.ico} size={16}/><span className="lbl">{it.lbl}</span>{why&&<span className="sb-dot" aria-label={why}/>}
      </button>
    );
  };
  return(
    <aside className="sidebar no-print">
      <PortalDropdown session={session} onPortalSwitch={onPortalSwitch}/>
      <SidebarSearch items={matches} onGo={onGo} q={q} setQ={setQ}/>
      <nav className="sb-nav">
        {ql?(
          matches.length?matches.map(item):<div className="sb-none">{tr('No matches')}</div>
        ):sections.map((s,i)=>(
          <div key={i} className="sb-sec">
            {s.label&&<div className="sb-group"><Ico n={(s.items[0]||{}).ico||'dash'} size={14}/>{s.label}</div>}
            {s.items.map(item)}
          </div>
        ))}
      </nav>
      <div className="sb-pinned">
        <SidebarUserMenu session={session} portalLabel={portalLabel} onOpenProfile={onOpenProfile} onLogout={onLogout} onLang={onLang}/>
      </div>
    </aside>
  );
}

// ==========================
// PAGE HEADER (Buzz-style): breadcrumb, title + actions, pill tabs for the pages of the same section
// ==========================
function PageHeader({sb,isActive,onGo,session,title,children}){
  const portalLabel=(PORTAL_INFO[session.activePortal]||{label:session.activePortal}).label;
  const sec=sbSections(sb).find(s=>s.items.some(it=>isActive(it.k)));
  const cur=sec&&sec.items.find(it=>isActive(it.k));
  const crumbs=[portalLabel,sec&&sec.label,cur&&cur.lbl!==title?cur.lbl:null].filter(Boolean);
  // Settings shares a menu section with list pages but is not one of them, so it never becomes a tab
  const tabItems=sec?sec.items.filter(it=>it.k!=='settings'):[];
  const tabs=tabItems.length>1&&tabItems.some(it=>isActive(it.k))?tabItems:[];
  return(
    <header className="topbar no-print">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Ico n={(cur||{}).ico||'dash'} size={14}/>
        {crumbs.map((c,i)=><React.Fragment key={i}>{i>0&&<span className="crumb-sep">›</span>}<span className="crumb">{c}</span></React.Fragment>)}
        <span className="crumb-sep">›</span><span className="crumb crumb-cur">{title}</span>
      </nav>
      <div className="topbar-row">
        <h1 className="topbar-title">{title}</h1>
        <div className="topbar-actions">{children}</div>
      </div>
      {tabs.length>0&&(
        <div className="pills" role="tablist">
          {tabs.map(it=><button key={it.k} role="tab" aria-selected={isActive(it.k)} className={`pill${isActive(it.k)?' on':''}`} onClick={()=>onGo(it.k)}>{it.lbl}{it.cnt>0&&<span className="pill-cnt">{it.cnt}</span>}</button>)}
        </div>
      )}
    </header>
  );
}

// ==========================
// PROFILE MODAL
// ==========================
function ProfileModal({session,onClose,onUpdate}){
  const me=(LS.get('gm_users')||[]).find(u=>u.id===session.userId)||{};
  const[form,setForm]=useState({firstName:session.firstName||'',lastName:session.lastName||'',email:me.email||session.email||'',username:session.username||'',password:'',confirmPassword:''});
  const[error,setError]=useState('');
  const[saving,setSaving]=useState(false);
  const s=(k,v)=>setForm(x=>({...x,[k]:v}));

  const handleSave=async()=>{
    if(form.password&&form.password!==form.confirmPassword){setError(tr('Passwords do not match'));return;}
    if(!form.username){setError(tr('Username is required'));return;}
    setSaving(true);setError('');
    try{
      const{firstName,lastName,email,username,password}=form;
      await usersApi('profile',{profile:{firstName,lastName,email,username,password}});
      const newSess={...session,firstName:firstName.trim(),lastName:lastName.trim(),username:username.trim().toLowerCase()};
      setSession(newSess);
      onUpdate(newSess);
      onClose();
    }catch(e){setError(tr('Save error: ')+e.message);}
    setSaving(false);
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:14,padding:32,maxWidth:480,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)',flex:1}}>{tr("Profile")}</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'var(--g400)',lineHeight:1,padding:'0 4px'}}>×</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Fld label={tr("First Name")}><input value={form.firstName} onChange={e=>s('firstName',e.target.value)} className="fi" placeholder={tr("Your first name")}/></Fld>
          <Fld label={tr("Last Name")}><input value={form.lastName} onChange={e=>s('lastName',e.target.value)} className="fi" placeholder={tr("Your last name")}/></Fld>
          <div style={{gridColumn:'1/-1'}}><Fld label={tr("Email")}><input type="email" value={form.email} onChange={e=>s('email',e.target.value)} className="fi" placeholder={tr("Your email address")}/></Fld></div>
          <div style={{gridColumn:'1/-1'}}><Fld label={tr("Username")}><input value={form.username} onChange={e=>s('username',e.target.value)} className="fi" placeholder={tr("Username")}/></Fld></div>
          <Fld label={tr("New Password")}><input type="password" value={form.password} onChange={e=>s('password',e.target.value)} className="fi" placeholder={tr("Leave blank to keep current")} autoComplete="new-password"/></Fld>
          <Fld label={tr("Confirm Password")}><input type="password" value={form.confirmPassword} onChange={e=>s('confirmPassword',e.target.value)} className="fi" placeholder={tr("Confirm password")}/></Fld>
        </div>
        {error&&<div style={{background:'rgba(192,57,43,.08)',border:'1.5px solid rgba(192,57,43,.3)',borderRadius:8,padding:'10px 14px',marginTop:14,color:'var(--red)',fontSize:13}}>{error}</div>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <Btn v="bgh bsm" onClick={onClose}>{tr("Cancel")}</Btn>
          <Btn v="bp bsm" onClick={handleSave} disabled={saving}>{saving?tr('Saving...'):tr('Save')}</Btn>
        </div>
      </div>
    </div>
  );
}

// ==========================
// APP (ROOT)
// ==========================
function App(){
  const[session,setSessionState]=useState(null);
  const[step,setStep]=useState('loading');
  const[pendingUser,setPendingUser]=useState(null);
  const[pendingPortals,setPendingPortals]=useState([]);
  const[profileOpen,setProfileOpen]=useState(false);

  const[loadError,setLoadError]=useState('');
  const[syncState,setSyncState]=useState({pending:Sync.pendingKeys().length,error:''});
  const[conflicts,setConflicts]=useState([]);
  // Bumped after the server sent back other users' versions, so the open portal re-reads its data
  const[dataEpoch,setDataEpoch]=useState(0);

  // Session expired: unsent changes stay on this computer and go out after the same user signs in again
  const endSession=()=>{clearSession();if(!Sync.hasPending())Sync.clearLocal();setSessionState(null);setPendingUser(null);setStep('login');};

  useEffect(()=>{
    const saved=getSession();
    if(!saved){setStep('login');return;}
    // Send changes left over from last time, then refresh local data; a 401 means the server session has expired.
    Sync.flushNow()
      .then(()=>Sync.pull())
      .then(()=>{setSessionState(saved);setStep('app');})
      .catch(e=>{
        if(e.status===401)endSession();
        else{setLoadError('Could not load data from the server: '+e.message);setSessionState(saved);setStep('app');}
      });
  },[]);

  useEffect(()=>{
    const onStatus=e=>setSyncState(e.detail);
    const onConflict=e=>{setConflicts(c=>[...c,...e.detail.notices]);setDataEpoch(n=>n+1);};
    window.addEventListener('sync-unauthorized',endSession);
    window.addEventListener('sync-status',onStatus);
    window.addEventListener('sync-conflict',onConflict);
    return()=>{
      window.removeEventListener('sync-unauthorized',endSession);
      window.removeEventListener('sync-status',onStatus);
      window.removeEventListener('sync-conflict',onConflict);
    };
  },[]);

  const doSelectPortal=(user,portal)=>{
    const role=portal==='system'?'Admin':(user.portals||{})[portal]||'User';
    const sess={userId:user.id,username:user.username,firstName:user.firstName||'',lastName:user.lastName||'',activePortal:portal,activeRole:role,portals:user.portals||{},loginTime:new Date().toISOString()};
    setSession(sess);setSessionState(sess);setStep('app');
  };

  const handleLogin=(user,accessible)=>{
    setPendingUser(user);setPendingPortals(accessible);
    // Admins always see the portal screen so they can reach System Management.
    if(accessible.length===1&&!isAdminUser(user))doSelectPortal(user,accessible[0]);
    else setStep('portal-pick');
  };

  const handlePortalPick=portal=>doSelectPortal(pendingUser,portal);

  const handlePortalSwitch=portal=>{
    if(!session)return;
    // Reload user from gm_users to get fresh portals
    const users=LS.get('gm_users')||[];
    const user=users.find(u=>u.id===session.userId)||{portals:session.portals};
    const role=(user.portals||{})[portal]||'User';
    const newSess={...session,activePortal:portal,activeRole:role,portals:user.portals||session.portals};
    setSession(newSess);setSessionState(newSess);
  };

  const handleLogout=async()=>{
    // Logging out clears this computer's copy, so anything not yet on the server would be lost
    if(!await Sync.flushNow()&&!await askGlobalConfirm(tr("{0} change(s) could not be saved to the server yet. If you log out now they will be lost. Log out anyway?", Sync.pendingKeys().length),{confirmLabel:tr('Log out and discard'),cancelLabel:tr('Stay logged in')}))return;
    apiCall('logout.php',{method:'POST',keepalive:true}).catch(()=>{});
    clearSession();Sync.clearLocal();setSessionState(null);setPendingUser(null);setStep('login');
  };
  const handleSessionUpdate=newSess=>{setSessionState(newSess);};

  if(step==='loading')return <Splash/>;
  if(step==='login')return <LoginScreen onLogin={handleLogin}/>;
  if(step==='portal-pick')return <PortalSelectScreen user={pendingUser} portals={pendingPortals} onSelect={handlePortalPick}/>;
  if(!session)return <LoginScreen onLogin={handleLogin}/>;

  const portalProps={session,onPortalSwitch:handlePortalSwitch,onLogout:handleLogout,onSessionUpdate:handleSessionUpdate,onOpenProfile:()=>setProfileOpen(true)};

  return(
    <>
      {session.activePortal==='off'&&<AppOfficial key={dataEpoch} {...portalProps}/>}
      {session.activePortal==='ops'&&<AppOperational key={dataEpoch} {...portalProps}/>}
      {session.activePortal==='system'&&<AppSystem {...portalProps}/>}
      {profileOpen&&<ProfileModal session={session} onClose={()=>setProfileOpen(false)} onUpdate={handleSessionUpdate}/>}
      {(loadError||(syncState.pending>0&&syncState.error))&&<div role="alert" style={{position:'fixed',left:'calc(var(--sidebar) + 16px)',right:16,bottom:16,zIndex:9999,display:'flex',alignItems:'center',gap:12,background:'#fff',border:'1.5px solid rgba(192,57,43,.35)',borderRadius:10,padding:'12px 16px',boxShadow:'0 8px 28px rgba(26,42,10,.12)',color:'var(--red)',fontSize:13,fontWeight:500}}>
        <span style={{flex:1}}>{syncState.pending>0&&syncState.error
          ?tr("{0} change(s) could not be saved to the server yet ({1}). They are kept on this computer and retried automatically — don't clear the browser data or log out until this message disappears.", syncState.pending, syncState.error)
          :loadError}</span>
        {syncState.pending>0&&syncState.error
          ?<button onClick={()=>Sync.retryAll()} style={{border:'none',background:'transparent',color:'var(--g600)',cursor:'pointer',fontSize:13,fontWeight:600}}>{tr("Retry now")}</button>
          :<button onClick={()=>setLoadError('')} style={{border:'none',background:'transparent',color:'var(--g600)',cursor:'pointer',fontSize:13,fontWeight:600}}>{tr("Dismiss")}</button>}
      </div>}
      {conflicts.length>0&&<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:99998,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div role="alertdialog" aria-labelledby="sync-conflict-title" style={{background:'#fff',borderRadius:12,padding:'28px 32px',minWidth:320,maxWidth:520,boxShadow:'0 8px 40px rgba(0,0,0,.18)',display:'flex',flexDirection:'column',gap:16}}>
          <h3 id="sync-conflict-title" style={{margin:0,fontSize:16,fontWeight:700,color:'var(--g900)'}}>{tr("Updated by another user")}</h3>
          <ul style={{margin:0,paddingLeft:18,fontSize:13.5,lineHeight:1.6,color:'var(--g700)',maxHeight:280,overflowY:'auto'}}>
            {conflicts.map((m,i)=><li key={i}>{m}</li>)}
          </ul>
          <p style={{margin:0,fontSize:12.5,color:'var(--g500)'}}>{tr("The latest data has been loaded.")}</p>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button autoFocus onClick={()=>setConflicts([])} style={{padding:'7px 20px',borderRadius:7,border:'none',background:'var(--gm-600)',color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'}}>{tr("OK")}</button>
          </div>
        </div>
      </div>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
