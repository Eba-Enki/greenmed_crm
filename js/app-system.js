
// ==========================
// SYSTEM MANAGEMENT
// ==========================
function AppSystem({session,onPortalSwitch,onLogout,onSessionUpdate,onOpenProfile}){
  const[users,setUsers]=useState([]);
  const[view,setView]=useState('users');
  const[cur,setCur]=useState(null);
  const[toast,showToast]=useToast();
  const[confirmDlg,setConfirmDlg]=useState(null);

  const askConfirm=(msg,onYes)=>setConfirmDlg({msg,onYes});

  useEffect(()=>{
    const u=LS.get('gm_users')||[];
    setUsers(u);
  },[]);

  const saveUsers=u=>{setUsers(u);LS.set('gm_users',u);};

  // ==========================
  // USER FORM
  // ==========================
  function SysUserForm({user:init,onSave,onCancel}){
    const[u,setU]=useState({...init,password:''});
    const s=(k,v)=>setU(x=>({...x,[k]:v}));
    const sp=(portal,role)=>setU(x=>({...x,portals:{...(x.portals||{}), [portal]:role||null}}));

    const handleSave=async()=>{
      if(!u.username){return;}
      const p=u.password?await hashPassword(u.password):init.password;
      onSave({...u,password:p});
    };

    const portals=u.portals||{};
    const roleOpts=['','User','Manager','Admin'];

    return(
      <div className="content"><div className="fw">
        <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12}}>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>Back</button>
          <div style={{width:'1px',height:'24px',background:'var(--g200)'}}/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)'}}>{init.id?'Edit User':'New User'}</h2>
          <div style={{flex:1}}/>
          <Btn v="bp bsm" onClick={handleSave} disabled={!u.username||(init.id?false:!u.password)}>Save</Btn>
        </div>

        <div className="fc">
          <div className="fct">User Information</div>
          <div className="fg g2">
            <Fld label="First Name"><input value={u.firstName||''} onChange={e=>s('firstName',e.target.value)} className="fi" placeholder="First name"/></Fld>
            <Fld label="Last Name"><input value={u.lastName||''} onChange={e=>s('lastName',e.target.value)} className="fi" placeholder="Last name"/></Fld>
          </div>
          <div className="fg g1" style={{marginTop:14}}>
            <Fld label="Email"><input type="email" value={u.email||''} onChange={e=>s('email',e.target.value)} className="fi" placeholder="Email"/></Fld>
          </div>
          <div className="fg g2" style={{marginTop:14}}>
            <Fld label="Username"><input value={u.username||''} onChange={e=>s('username',e.target.value)} className="fi" placeholder="Username"/></Fld>
            <Fld label="Password"><input type="password" value={u.password||''} onChange={e=>s('password',e.target.value)} className="fi" placeholder={init.id?'Leave blank to keep current':'Password'} autoComplete="new-password"/></Fld>
          </div>
          <div className="fg g1" style={{marginTop:14}}>
            <Fld label="Status">
              <select value={u.active?'active':'inactive'} onChange={e=>s('active',e.target.value==='active')} className="fi">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Fld>
          </div>
        </div>

        <div className="fc" style={{marginTop:16}}>
          <div className="fct">Portal Permissions</div>
          <p style={{fontSize:13,color:'var(--g500)',marginBottom:16,padding:'0 16px'}}>If "No Access" is selected, the user cannot access that portal.</p>
          <div className="fg g2" style={{padding:'0 16px 16px'}}>
            {[['off','Official — Finance & Accounting'],['ops','Operational — Sales & Procurement']].map(([key,label])=>(
              <Fld key={key} label={label}>
                <select value={portals[key]||''} onChange={e=>sp(key,e.target.value||null)} className="fi">
                  <option value="">— No Access —</option>
                  {roleOpts.filter(r=>r).map(r=><option key={r} value={r}>{r}</option>)}
                </select>
              </Fld>
            ))}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
          <Btn v="bgh bsm" onClick={onCancel}>Cancel</Btn>
          <Btn v="bp bsm" onClick={handleSave} disabled={!u.username||(init.id?false:!u.password)}>Save</Btn>
        </div>
      </div></div>
    );
  }

  const handleSaveUser=u=>{
    const saved={...u,id:u.id||uid(),createdAt:u.createdAt||td()};
    saveUsers(u.id&&users.find(x=>x.id===u.id)?users.map(x=>x.id===u.id?saved:x):[...users,saved]);
    showToast('User saved');
    setView('users');setCur(null);
  };

  // ==========================
  // USERS LIST
  // ==========================
  const ROLE_COLOR={Admin:'var(--purple)',Manager:'var(--blue)',User:'var(--gm-500)'};
  const PORTAL_LABEL={off:'Official',ops:'Operational'};

  const renderUsers=()=>(
    <div className="content">
      <div className="sec-hdr">
        <h2 className="sec-title">Users</h2>
        <Btn v="bp bsm" onClick={()=>{setCur({id:null,username:'',password:'',firstName:'',lastName:'',email:'',active:true,createdAt:td(),portals:{off:null,ops:null}});setView('user_form');}}>
          <Ico n="plus" size={13}/>New User
        </Btn>
      </div>
      <div className="tcard">
        <table className="dt">
          <thead><tr>
            <th style={{width:32}}>#</th>
            <th>Full Name</th>
            <th>Username</th>
            <th>Email</th>
            <th>Official</th>
            <th>Operational</th>
            <th>Status</th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {users.length===0&&<tr><td colSpan={8} className="empty">No users yet</td></tr>}
            {users.map((u,i)=>(
              <tr key={u.id}>
                <td className="dn">{i+1}</td>
                <td><span style={{fontWeight:600}}>{[u.firstName,u.lastName].filter(Boolean).join(' ')||'—'}</span></td>
                <td style={{fontFamily:'monospace',fontSize:13}}>{u.username}</td>
                <td style={{color:'var(--g500)',fontSize:13}}>{u.email||'—'}</td>
                <td>{u.portals?.off?<span style={{fontSize:12,fontWeight:700,color:ROLE_COLOR[u.portals.off]||'var(--g600)',background:`${ROLE_COLOR[u.portals.off]||'var(--g600)'}18`,padding:'2px 8px',borderRadius:20}}>{u.portals.off}</span>:<span style={{color:'var(--g300)',fontSize:12}}>—</span>}</td>
                <td>{u.portals?.ops?<span style={{fontSize:12,fontWeight:700,color:ROLE_COLOR[u.portals.ops]||'var(--g600)',background:`${ROLE_COLOR[u.portals.ops]||'var(--g600)'}18`,padding:'2px 8px',borderRadius:20}}>{u.portals.ops}</span>:<span style={{color:'var(--g300)',fontSize:12}}>—</span>}</td>
                <td><span className={`bdg ${u.active?'b-active':'b-passive'}`}>{u.active?'Active':'Inactive'}</span></td>
                <td>
                  <div style={{display:'flex',gap:4}}>
                    <button className="ab" onClick={()=>{setCur(u);setView('user_form');}} title="Edit"><Ico n="edit"/></button>
                    <button className="ab danger" onClick={()=>askConfirm(`Do you want to delete user "${u.username}"?`,()=>{saveUsers(users.filter(x=>x.id!==u.id));showToast('User deleted');})} title="Delete"><Ico n="trash"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return(
    <div style={{display:'flex',width:'100%',minHeight:'100vh'}}>
      {/* SIDEBAR */}
      <div className="sidebar no-print">
        <div className="sb-brand" style={{cursor:'default'}}>
          <img src={getLogo()||LOGO} alt=""/>
          <div><div className="sb-brand-sub" style={{fontSize:11,color:'var(--g400)'}}>System Management</div></div>
        </div>
        <PortalDropdown session={session} onPortalSwitch={onPortalSwitch} onLogout={onLogout} onOpenProfile={onOpenProfile}/>
        <div style={{flex:1,overflow:'auto',padding:'12px 0'}}>
          <div className="sb-group">Management</div>
          <button className={`sb-item${view==='users'||view==='user_form'?' active':''}`} onClick={()=>setView('users')}>
            <Ico n="customers" size={15}/><span>Users</span>
          </button>
        </div>
        <div className="sb-footer">
          <button className="sb-footer-btn" onClick={onOpenProfile}><Ico n="user" size={13}/><span>Profile</span></button>
          <button className="sb-footer-btn" onClick={onLogout}><Ico n="logout" size={13}/><span>Log Out</span></button>
        </div>
      </div>

      {/* MAIN */}
      <div className="main">
        <div className="topbar no-print">
          <h1 className="topbar-title">{view==='user_form'?(cur?.id?'Edit User':'New User'):'Users'}</h1>
        </div>
        {view==='users'&&renderUsers()}
        {view==='user_form'&&cur&&<SysUserForm user={cur} onSave={handleSaveUser} onCancel={()=>{setView('users');setCur(null);}}/>}
      </div>

      {toast&&<div className="toast">{toast}</div>}
      {confirmDlg&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:28,maxWidth:360,width:'90%',boxShadow:'0 8px 32px rgba(0,0,0,.18)'}}>
            <p style={{fontSize:14,color:'var(--dk)',marginBottom:20,lineHeight:1.5}}>{confirmDlg.msg}</p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <Btn v="bgh bsm" onClick={()=>setConfirmDlg(null)}>Cancel</Btn>
              <Btn v="bgr bsm" onClick={()=>{confirmDlg.onYes();setConfirmDlg(null);}}>Yes, Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
