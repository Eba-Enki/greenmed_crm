
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
      <div className="sb-acc-pill" onClick={()=>setOpen(o=>!o)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
        <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
          <span className="sb-acc-name">{(PORTAL_INFO[session.activePortal]||{label:session.activePortal}).label}</span>
        </div>
        <svg viewBox="0 0 24 24" style={{width:13,height:13,stroke:'var(--g400)',fill:'none',strokeWidth:2,strokeLinecap:'round',strokeLinejoin:'round',transform:open?'rotate(180deg)':'none',transition:'transform .2s',flexShrink:0}}><polyline points="6 9 12 15 18 9"/></svg>
      </div>
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
// SIDEBAR USER FOOTER (profile + log out)
// ==========================
function SidebarUserFooter({session,onOpenProfile,onLogout,onLang}){
  const name=`${session.firstName||''} ${session.lastName||''}`.trim()||session.username||'';
  return(
    <>
    <div className="sb-lang"><LangSwitch onChange={onLang}/></div>
    <div className="sb-user">
      <button className="sb-user-info" onClick={onOpenProfile} title={tr("Profile")}>
        <span className="sb-avatar">{(name[0]||'?').toUpperCase()}</span>
        <span className="sb-user-txt">
          <span className="sb-user-name">{name}</span>
          <span className="sb-user-role">{tr(session.activeRole||'User')}</span>
        </span>
      </button>
      <button className="sb-logout" onClick={onLogout} title={tr("Log Out")} aria-label={tr("Log Out")}><Ico n="logout" size={18}/></button>
    </div>
    </>
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

  if(step==='loading')return null;
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
