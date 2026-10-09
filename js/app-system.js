
// ==========================
// SYSTEM MANAGEMENT
// ==========================
function AppSystem({session,onPortalSwitch,onLogout,onSessionUpdate,onOpenProfile}){
  const[users,setUsers]=useState([]);
  const[view,setView]=useState('users');
  const[cur,setCur]=useState(null);
  const[toast,showToast]=useToast();
  const[confirmDlg,setConfirmDlg]=useState(null);
  useEscape(()=>setConfirmDlg(null),!!confirmDlg);

  const askConfirm=(msg,onYes)=>setConfirmDlg({msg,onYes});

  useEffect(()=>{
    const u=LS.get('gm_users')||[];
    setUsers(u);
  },[]);

  // Sends the change to api/users.php; the server checks admin rights and hashes passwords.
  const callUsers=async(action,payload,okMsg)=>{
    try{setUsers(await usersApi(action,payload));showToast(okMsg);return true;}
    catch(e){alert(e.message);return false;}
  };

  // ==========================
  // USER FORM
  // ==========================
  function SysUserForm({user:init,onSave,onCancel}){
    const[u,setU]=useState({...init,password:''});
    const s=(k,v)=>setU(x=>({...x,[k]:v}));
    const sp=(portal,role)=>setU(x=>({...x,portals:{...(x.portals||{}), [portal]:role||null}}));

    const handleSave=async()=>{
      if(!u.username){return;}
      const norm={...u,firstName:toTitleCase(u.firstName),lastName:toTitleCase(u.lastName),email:(u.email||'').trim().toLowerCase(),username:(u.username||'').trim().toLowerCase()};
      // Login matches usernames case-insensitively, so two accounts differing only by case
      // would be ambiguous at sign-in — block that outright rather than just warning.
      if(findCaseInsensitiveDup(users,'username',norm.username,norm.id)){
        alert(tr("A user named \"{0}\" already exists. Usernames must be unique (case doesn't matter).", norm.username));
        return;
      }
      onSave(norm);
    };

    const portals=u.portals||{};
    const roleOpts=['','User','Manager','Admin'];

    return(
      <div>
        <div style={{background:'var(--white)',borderRadius:'10px',border:'1px solid var(--g200)',padding:'20px 24px',marginBottom:'20px',boxShadow:'0 2px 8px rgba(0,0,0,.04)',display:'flex',alignItems:'center',gap:12}}>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'var(--g500)',fontSize:13,display:'flex',alignItems:'center',gap:6}}><Ico n="back"/>{tr("Back")}</button>
          <div style={{width:'1px',height:'24px',background:'var(--g200)'}}/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--dk)'}}>{init.id?tr('Edit User'):tr('New User')}</h2>
          <div style={{flex:1}}/>
          <Btn v="bp bsm" onClick={handleSave} disabled={!u.username||(init.id?false:!u.password)}>{tr("Save")}</Btn>
        </div>

        <div className="fc">
          <div className="fct">{tr("User Information")}</div>
          <div className="fg g2">
            <Fld label={tr("First Name")}><input value={u.firstName||''} onChange={e=>s('firstName',e.target.value)} className="fi" placeholder={tr("First name")}/></Fld>
            <Fld label={tr("Last Name")}><input value={u.lastName||''} onChange={e=>s('lastName',e.target.value)} className="fi" placeholder={tr("Last name")}/></Fld>
          </div>
          <div className="fg g1" style={{marginTop:14}}>
            <Fld label={tr("Email")}><input type="email" value={u.email||''} onChange={e=>s('email',e.target.value)} className="fi" placeholder={tr("Email")}/></Fld>
          </div>
          <div className="fg g2" style={{marginTop:14}}>
            <Fld label={tr("Username")}><input value={u.username||''} onChange={e=>s('username',e.target.value)} className="fi" placeholder={tr("Username")}/></Fld>
            <Fld label={tr("Password")}><input type="password" value={u.password||''} onChange={e=>s('password',e.target.value)} className="fi" placeholder={init.id?tr('Leave blank to keep current'):tr('Password')} autoComplete="new-password"/></Fld>
          </div>
          <div className="fg g1" style={{marginTop:14}}>
            <Fld label={tr("Status")}>
              <select value={u.active?'active':'inactive'} onChange={e=>s('active',e.target.value==='active')} className="fi">
                <option value="active">{tr("Active")}</option>
                <option value="inactive">{tr("Inactive")}</option>
              </select>
            </Fld>
          </div>
        </div>

        <div className="fc" style={{marginTop:16}}>
          <div className="fct">{tr("Portal Permissions")}</div>
          <p style={{fontSize:13,color:'var(--g500)',marginBottom:16,padding:'0 16px'}}>{tr("If \"No Access\" is selected, the user cannot access that portal.")}</p>
          <div className="fg g2" style={{padding:'0 16px 16px'}}>
            {[['off','Official — Finance & Accounting'],['ops','Sales & Procurement']].map(([key,label])=>(
              <Fld key={key} label={tr(label)}>
                <select value={portals[key]||''} onChange={e=>sp(key,e.target.value||null)} className="fi">
                  <option value="">{tr("— No Access —")}</option>
                  {roleOpts.filter(r=>r).map(r=><option key={r} value={r}>{tr(r)}</option>)}
                </select>
              </Fld>
            ))}
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'flex-end',gap:10,marginTop:16}}>
          <Btn v="bgh bsm" onClick={onCancel}>{tr("Cancel")}</Btn>
          <Btn v="bp bsm" onClick={handleSave} disabled={!u.username||(init.id?false:!u.password)}>{tr("Save")}</Btn>
        </div>
      </div>
    );
  }

  const handleSaveUser=async u=>{
    const{id,username,password,firstName,lastName,email,active,portals}=u;
    if(await callUsers('save',{user:{id,username,password,firstName,lastName,email,active,portals}},tr('User saved'))){
      setView('users');setCur(null);
    }
  };

  // ==========================
  // USERS LIST
  // ==========================
  const ROLE_RANK={User:1,Manager:2,Admin:3};
  const ROLE_CLS={Admin:'r-admin',Manager:'r-manager',User:'r-user'};
  const PORTAL_LABEL={off:'Official',ops:'Sales'};
  const topRole=u=>Object.values(u.portals||{}).filter(Boolean).sort((x,y)=>(ROLE_RANK[y]||0)-(ROLE_RANK[x]||0))[0];
  const fullName=u=>[u.firstName,u.lastName].filter(Boolean).join(' ');

  const renderUsers=()=>(
    <>
      <div className="sys-head">
        <div>
          <h2 className="sys-h2">{tr("Users")}</h2>
          <p className="sys-sub">{tr("Access and permissions for all portals")}</p>
        </div>
        <Btn v="bp bsm" onClick={()=>{setCur({id:null,username:'',password:'',firstName:'',lastName:'',email:'',active:true,createdAt:td(),portals:{off:null,ops:null}});setView('user_form');}}>
          <Ico n="plus" size={13}/>{tr("New User")}
        </Btn>
      </div>
      {users.length===0&&<div className="sys-card sys-empty">{tr("No users yet")}</div>}
      {users.map(u=>{
        const role=topRole(u);
        const name=fullName(u)||u.username;
        return(
          <div key={u.id} className={`sys-card${u.active?'':' inactive'}`}>
            <Avatar className="sys-avatar" user={u} name={name}/>
            <div className="sys-info">
              <div className="sys-name">{name}<span className="sys-uname">@{u.username}</span></div>
              <div className="sys-tags">
                {role?<span className={`sys-role ${ROLE_CLS[role]||''}`}>{tr(role)}</span>:<span className="sys-role r-none">{tr("No Access")}</span>}
                {!u.active&&<span className="sys-role r-inactive">{tr("Inactive")}</span>}
                {Object.entries(PORTAL_LABEL).filter(([k])=>u.portals?.[k]).map(([k,l])=><span key={k} className="sys-chip" title={tr(u.portals[k])}>{tr(l)}</span>)}
              </div>
            </div>
            <div className="sys-actions">
              <button className="sys-ab" onClick={()=>{setCur(u);setView('user_form');}} title={tr("Edit")} aria-label={tr("Edit")}><Ico n="edit" size={13}/></button>
              {u.id!==session.userId&&<button className="sys-ab danger" onClick={()=>askConfirm(tr("Do you want to delete user \"{0}\"?", u.username),()=>callUsers('delete',{id:u.id},tr('User deleted')))} title={tr("Delete")} aria-label={tr("Delete")}><Ico n="trash" size={13}/></button>}
            </div>
          </div>
        );
      })}
    </>
  );

  const displayName=`${session.firstName||''} ${session.lastName||''}`.trim()||session.username;

  const S=useStableComponents({SysUserForm});
  return(
    <div className="sys-page">
      <header className="sys-bar no-print">
        <div className="sys-brand">
          <img src={getLogo()||LOGO} alt="Green Med Ltd"/>
          <span>{tr("System Management")}</span>
        </div>
        <div className="sys-bar-right">
          <LangSwitch/>
          <button className="sys-me" onClick={onOpenProfile} title={tr("Profile")}>{displayName}</button>
          <button className="sys-logout" onClick={onLogout}>{tr("Log Out")}</button>
        </div>
      </header>

      <main className="sys-wrap">
        {view==='users'&&renderUsers()}
        {view==='user_form'&&cur&&<S.SysUserForm key={cur.id||'new'} user={cur} onSave={handleSaveUser} onCancel={()=>{setView('users');setCur(null);}}/>}
      </main>

      {toast&&<div className="toast">{toast}</div>}
      {confirmDlg&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#fff',borderRadius:12,padding:28,maxWidth:360,width:'90%',boxShadow:'0 8px 32px rgba(0,0,0,.18)'}}>
            <p style={{fontSize:14,color:'var(--dk)',marginBottom:20,lineHeight:1.5}}>{confirmDlg.msg}</p>
            <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
              <Btn v="bgh bsm" onClick={()=>setConfirmDlg(null)}>{tr("Cancel")}</Btn>
              <Btn v="bgr bsm" onClick={()=>{confirmDlg.onYes();setConfirmDlg(null);}}>{tr("Yes, Delete")}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
