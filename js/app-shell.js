
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
    if(!username||!password){setError('Username and password required');return;}
    setLoading(true);setError('');
    try{
      migrateToGlobalUsers();
      let users=LS.get('gm_users')||[];
      if(users.length===0){
        const hp=await hashPassword('admin');
        users=[{id:uid(),username:'admin',password:hp,firstName:'Admin',lastName:'User',email:'admin@greenmedltd.com',active:true,createdAt:td(),portals:{off:'Admin',ops:'Admin'}}];
        LS.set('gm_users',users);
      }
      const hashed=await hashPassword(password);
      let user=users.find(u=>u.username===username&&u.password===hashed&&u.active);
      if(!user){
        const legacy=users.find(u=>u.username===username&&u.password===password&&u.active);
        if(legacy){
          const updated=users.map(u=>u.id===legacy.id?{...u,password:hashed}:u);
          LS.set('gm_users',updated);
          user=legacy;
        }
      }
      if(!user){setError('Incorrect username or password');setLoading(false);return;}
      const portals=user.portals||{};
      const accessible=Object.entries(portals).filter(([,r])=>r).map(([k])=>k);
      if(accessible.length===0){setError('This account has no portal access');setLoading(false);return;}
      onLogin(user,accessible);
    }catch(e){setError('Login error: '+e.message);setLoading(false);}
  };

  return(
    <div className="acc-screen">
      <div style={{maxWidth:'420px',width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src={logo||LOGO} style={{width:150,height:'auto',display:'block',margin:'0 auto 16px'}} alt="Green Med Ltd"/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:8}}>Green Med Ltd</h2>
          <p style={{fontSize:14,color:'var(--g500)'}}>Sign in to your account</p>
        </div>
        <div style={{background:'#fff',border:'1px solid var(--gm-border)',borderRadius:12,padding:28,boxShadow:'0 8px 28px rgba(26,42,10,.08)'}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Username</label>
            <input type="text" value={username} onChange={e=>{setUsername(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Your username" autoFocus style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Password</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}} onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="Your password" autoComplete="current-password" style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none',boxSizing:'border-box'}}/>
          </div>
          {error&&<div style={{background:'rgba(192,57,43,.08)',border:'1.5px solid rgba(192,57,43,.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'var(--red)',fontSize:13,fontWeight:500}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{width:'100%',padding:'12px',borderRadius:8,border:'none',background:'linear-gradient(135deg,var(--gm-400),var(--gm-500))',color:'#fff',fontSize:14,fontWeight:600,cursor:loading?'default':'pointer',boxShadow:'0 4px 14px rgba(96,132,37,.3)',opacity:loading?.7:1}}>
            {loading?'Signing in...':'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==========================
// PORTAL PICKER MODAL
// ==========================
const PORTAL_INFO={
  off:{label:'Official',desc:'Finance, invoicing and accounting',color:'var(--gm-400)'},
  ops:{label:'Operational',desc:'Sales, procurement and project management',color:'var(--gm-600)'},
  system:{label:'System Management',desc:'User and system management',color:'var(--g700)'}
};

function PortalPickerModal({portals,onSelect}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:16,padding:32,maxWidth:440,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        <h2 style={{fontSize:20,fontWeight:700,color:'var(--dk)',marginBottom:8,textAlign:'center'}}>Select Portal</h2>
        <p style={{fontSize:14,color:'var(--g500)',textAlign:'center',marginBottom:24}}>Which portal would you like to sign in to?</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {portals.map(p=>{
            const info=PORTAL_INFO[p]||{label:p,desc:'',color:'var(--g600)'};
            return(
              <button key={p} onClick={()=>onSelect(p)} style={{padding:'16px 20px',borderRadius:10,border:`2px solid ${info.color}`,background:`${info.color}18`,cursor:'pointer',textAlign:'left',transition:'background .15s',outline:'none'}}>
                <div style={{fontSize:15,fontWeight:700,color:info.color}}>{info.label}</div>
                <div style={{fontSize:13,color:'var(--g500)',marginTop:4}}>{info.desc}</div>
              </button>
            );
          })}
        </div>
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
  const accessible=Object.entries(portals).filter(([,r])=>r).map(([k])=>k);
  const isAdmin=Object.values(portals).includes('Admin');
  const list=[...accessible,...(isAdmin&&!accessible.includes('system')?['system']:[])];
  const firstName=session.firstName||session.username;

  return(
    <div ref={ref} style={{position:'relative'}}>
      <div className="sb-acc-pill" onClick={()=>setOpen(o=>!o)} style={{cursor:'pointer',display:'flex',alignItems:'center',gap:8,justifyContent:'space-between'}}>
        <div style={{display:'flex',flexDirection:'column',minWidth:0}}>
          <span style={{fontSize:11,color:'var(--g400)',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{firstName}</span>
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
// PROFILE MODAL
// ==========================
function ProfileModal({session,onClose,onUpdate}){
  const[form,setForm]=useState({firstName:session.firstName||'',lastName:session.lastName||'',email:session.email||'',username:session.username||'',password:'',confirmPassword:''});
  const[error,setError]=useState('');
  const[saving,setSaving]=useState(false);
  const s=(k,v)=>setForm(x=>({...x,[k]:v}));

  const handleSave=async()=>{
    if(form.password&&form.password!==form.confirmPassword){setError('Passwords do not match');return;}
    if(!form.username){setError('Username is required');return;}
    setSaving(true);setError('');
    try{
      const users=LS.get('gm_users')||[];
      const idx=users.findIndex(u=>u.id===session.userId);
      if(idx===-1){setError('User not found');setSaving(false);return;}
      const updated={...users[idx],firstName:form.firstName,lastName:form.lastName,email:form.email,username:form.username};
      if(form.password)updated.password=await hashPassword(form.password);
      LS.set('gm_users',users.map((u,i)=>i===idx?updated:u));
      const newSess={...session,firstName:form.firstName,lastName:form.lastName,username:form.username};
      setSession(newSess);
      onUpdate(newSess);
      onClose();
    }catch(e){setError('Save error: '+e.message);}
    setSaving(false);
  };

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'#fff',borderRadius:14,padding:32,maxWidth:480,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:24}}>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)',flex:1}}>Profile</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:22,color:'var(--g400)',lineHeight:1,padding:'0 4px'}}>×</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <Fld label="First Name"><input value={form.firstName} onChange={e=>s('firstName',e.target.value)} className="fi" placeholder="Your first name"/></Fld>
          <Fld label="Last Name"><input value={form.lastName} onChange={e=>s('lastName',e.target.value)} className="fi" placeholder="Your last name"/></Fld>
          <div style={{gridColumn:'1/-1'}}><Fld label="Email"><input type="email" value={form.email} onChange={e=>s('email',e.target.value)} className="fi" placeholder="Your email address"/></Fld></div>
          <div style={{gridColumn:'1/-1'}}><Fld label="Username"><input value={form.username} onChange={e=>s('username',e.target.value)} className="fi" placeholder="Username"/></Fld></div>
          <Fld label="New Password"><input type="password" value={form.password} onChange={e=>s('password',e.target.value)} className="fi" placeholder="Leave blank to keep current" autoComplete="new-password"/></Fld>
          <Fld label="Confirm Password"><input type="password" value={form.confirmPassword} onChange={e=>s('confirmPassword',e.target.value)} className="fi" placeholder="Confirm password"/></Fld>
        </div>
        {error&&<div style={{background:'rgba(192,57,43,.08)',border:'1.5px solid rgba(192,57,43,.3)',borderRadius:8,padding:'10px 14px',marginTop:14,color:'var(--red)',fontSize:13}}>{error}</div>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:20}}>
          <Btn v="bgh bsm" onClick={onClose}>Cancel</Btn>
          <Btn v="bp bsm" onClick={handleSave} disabled={saving}>{saving?'Saving...':'Save'}</Btn>
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

  useEffect(()=>{
    migrateToGlobalUsers();
    const saved=getSession();
    if(saved){setSessionState(saved);setStep('app');}
    else setStep('login');
  },[]);

  const doSelectPortal=(user,portal)=>{
    const role=(user.portals||{})[portal]||'User';
    const sess={userId:user.id,username:user.username,firstName:user.firstName||'',lastName:user.lastName||'',activePortal:portal,activeRole:role,portals:user.portals||{},loginTime:new Date().toISOString()};
    setSession(sess);setSessionState(sess);setStep('app');
  };

  const handleLogin=(user,accessible)=>{
    setPendingUser(user);setPendingPortals(accessible);
    if(accessible.length===1)doSelectPortal(user,accessible[0]);
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

  const handleLogout=()=>{clearSession();setSessionState(null);setPendingUser(null);setStep('login');};
  const handleSessionUpdate=newSess=>{setSessionState(newSess);};

  if(step==='loading')return null;
  if(step==='login')return <LoginScreen onLogin={handleLogin}/>;
  if(step==='portal-pick')return(
    <>
      <LoginScreen onLogin={handleLogin}/>
      <PortalPickerModal portals={pendingPortals} onSelect={handlePortalPick}/>
    </>
  );
  if(!session)return <LoginScreen onLogin={handleLogin}/>;

  const portalProps={session,onPortalSwitch:handlePortalSwitch,onLogout:handleLogout,onSessionUpdate:handleSessionUpdate,onOpenProfile:()=>setProfileOpen(true)};

  return(
    <>
      {session.activePortal==='off'&&<AppOfficial {...portalProps}/>}
      {session.activePortal==='ops'&&<AppOperational {...portalProps}/>}
      {session.activePortal==='system'&&<AppSystem {...portalProps}/>}
      {profileOpen&&<ProfileModal session={session} onClose={()=>setProfileOpen(false)} onUpdate={handleSessionUpdate}/>}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
