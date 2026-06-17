
// ==========================
// ACCOUNT SELECTOR
// ==========================
function AccountSelector({onSelect}){
  const[selectedAccount,setSelectedAccount]=useState(null);
  const[username,setUsername]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  
  // Get users for selected account
  const getUsers=(acc)=>{
    const key=acc==='off'?'off_users':'ops_users';
    let users=LS.get(key);
    
    // If no users exist, create default admin
    if(!users||users.length===0){
      const defaultUser={
        id:Date.now().toString(),
        username:'admin',
        password:'admin',
        role:'Admin',
        active:true,
        createdAt:new Date().toISOString().split('T')[0]
      };
      users=[defaultUser];
      LS.set(key,users);
    }
    
    return users;
  };
  
  const handleLogin=()=>{
    if(!username||!password){
      setError('Please enter username and password');
      return;
    }
    
    const users=getUsers(selectedAccount);
    const user=users.find(u=>u.username===username&&u.password===password&&u.active);

    if(!user){
      setError('Invalid credentials or inactive user');
      return;
    }
    
    // Store current user session
    const sessionKey=selectedAccount==='off'?'off_current_user':'ops_current_user';
    LS.set(sessionKey,{username:user.username,role:user.role,loginTime:new Date().toISOString()});
    
    onSelect(selectedAccount);
  };
  
  if(!selectedAccount){
    return(
      <div className="acc-screen">
        <div className="acc-logo-wrap">
          <img src={getLogo()||LOGO} className="acc-logo" alt="Green Med Ltd"/>
          <div className="acc-sub">Select your workspace</div>
        </div>
        <div className="acc-cards" style={{marginTop:8}}>
          <div className="acc-card off" onClick={()=>setSelectedAccount('off')}>
            <div className="acc-card-ico">
              <svg viewBox="0 0 24 24" style={{width:28,height:28,stroke:'var(--gm-400)',fill:'none',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <div className="acc-card-name">Green Med Ltd</div>
            <div className="acc-badge">Official</div>
            <div className="acc-card-desc">Financial records, invoices & compliance</div>
          </div>
          <div className="acc-card ops" onClick={()=>setSelectedAccount('ops')}>
            <div className="acc-card-ico">
              <svg viewBox="0 0 24 24" style={{width:28,height:28,stroke:'var(--gm-600)',fill:'none',strokeWidth:1.5,strokeLinecap:'round',strokeLinejoin:'round'}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            </div>
            <div className="acc-card-name">Green Med Ltd</div>
            <div className="acc-badge">Operational</div>
            <div className="acc-card-desc">Sales, procurement & project management</div>
          </div>
        </div>
      </div>
    );
  }
  
  // Login screen
  return(
    <div className="acc-screen">
      <div style={{maxWidth:'420px',width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src={getLogo()||LOGO} style={{width:150,height:'auto',display:'block',margin:'0 auto 16px'}} alt="Green Med Ltd"/>
          <h2 style={{fontSize:18,fontWeight:700,color:'var(--g900)',marginBottom:8}}>
            {selectedAccount==='off'?'Official':'Operational'} Login
          </h2>
          <p style={{fontSize:14,color:'var(--g500)'}}>Enter your credentials to continue</p>
        </div>

        <div style={{background:'#fff',border:'1px solid var(--gm-border)',borderRadius:12,padding:28,boxShadow:'0 8px 28px rgba(26,42,10,.08)'}}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Username</label>
            <input
              type="text"
              value={username}
              onChange={e=>{setUsername(e.target.value);setError('');}}
              onKeyPress={e=>e.key==='Enter'&&handleLogin()}
              placeholder="Enter username"
              autoFocus
              style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none'}}
            />
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--g600)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e=>{setPassword(e.target.value);setError('');}}
              onKeyPress={e=>e.key==='Enter'&&handleLogin()}
              placeholder="Enter password"
              style={{width:'100%',padding:'12px 14px',borderRadius:8,border:'1.5px solid var(--g300)',background:'#fff',color:'var(--g900)',fontSize:14,outline:'none'}}
            />
          </div>

          {error&&<div style={{background:'rgba(192,57,43,.08)',border:'1.5px solid rgba(192,57,43,.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,color:'var(--red)',fontSize:13,fontWeight:500}}>{error}</div>}

          <button
            onClick={handleLogin}
            style={{width:'100%',padding:'12px',borderRadius:8,border:'none',background:'linear-gradient(135deg,var(--gm-400),var(--gm-500))',color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',marginBottom:12,boxShadow:'0 4px 14px rgba(96,132,37,.3)'}}
          >
            Sign In
          </button>

          <button
            onClick={()=>setSelectedAccount(null)}
            style={{width:'100%',padding:'10px',borderRadius:8,border:'1.5px solid var(--g300)',background:'transparent',color:'var(--g600)',fontSize:13,fontWeight:500,cursor:'pointer'}}
          >
            ← Back to Workspace Selection
          </button>
        </div>
      </div>
    </div>
  );
}

function App(){
  const[account,setAccount]=useState(null);
  if(!account)return <AccountSelector onSelect={setAccount}/>;
  if(account==='off')return <AppOfficial account={account} onSwitchAccount={()=>setAccount(null)}/>;
  return <AppOperational account={account} onSwitchAccount={()=>setAccount(null)}/>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
