/* ============================================================
   AUTH UI — shared navbar auth widget + login/signup modal.
   Depends on assets/supabase-client.js having run first.
   ============================================================ */

let currentUser = null;
let currentProfile = null;

/* ---------- modal markup, injected once per page ---------- */
function injectAuthModal(){
  if(document.getElementById('auth-modal-root')) return;
  const root = document.createElement('div');
  root.id = 'auth-modal-root';
  root.innerHTML = `
    <div class="modal-overlay" id="auth-overlay">
      <div class="modal">
        <button class="modal-close" id="auth-modal-close" aria-label="Close">✕</button>
        <div id="auth-modal-login">
          <h3>Welcome back</h3>
          <div class="sub">Log in to keep your streak going.</div>
          <div class="field"><label>Email</label><input type="email" id="login-email" autocomplete="email"></div>
          <div class="field"><label>Password</label><input type="password" id="login-password" autocomplete="current-password"></div>
          <button class="btn primary" id="login-submit" style="width:100%;">Log in</button>
          <div class="form-msg" id="login-msg"></div>
          <div class="modal-switch">New here? <button id="switch-to-signup">Create an account</button></div>
        </div>
        <div id="auth-modal-signup" style="display:none;">
          <h3>Start your record</h3>
          <div class="sub">One account for your streak, journal, and posts.</div>
          <div class="field"><label>Display name</label><input type="text" id="signup-username" autocomplete="nickname" maxlength="24"></div>
          <div class="field"><label>Email</label><input type="email" id="signup-email" autocomplete="email"></div>
          <div class="field"><label>Password</label><input type="password" id="signup-password" autocomplete="new-password"></div>
          <button class="btn primary" id="signup-submit" style="width:100%;">Create account</button>
          <div class="form-msg" id="signup-msg"></div>
          <div class="modal-switch">Already have an account? <button id="switch-to-login">Log in</button></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(root);

  document.getElementById('auth-overlay').addEventListener('click', (e)=>{ if(e.target.id==='auth-overlay') closeAuthModal(); });
  document.getElementById('auth-modal-close').addEventListener('click', closeAuthModal);
  document.getElementById('switch-to-signup').addEventListener('click', ()=>showAuthPane('signup'));
  document.getElementById('switch-to-login').addEventListener('click', ()=>showAuthPane('login'));
  document.getElementById('login-submit').addEventListener('click', handleLogin);
  document.getElementById('signup-submit').addEventListener('click', handleSignup);
  [['login-email','login-password'],['signup-username','signup-email','signup-password']].flat().forEach(id=>{
    document.getElementById(id).addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); id.startsWith('login') ? handleLogin() : handleSignup(); }
    });
  });
}

function showAuthPane(which){
  document.getElementById('auth-modal-login').style.display = which==='login' ? 'block' : 'none';
  document.getElementById('auth-modal-signup').style.display = which==='signup' ? 'block' : 'none';
}
function openAuthModal(which){
  if(!requireSupabase()) return;
  injectAuthModal();
  showAuthPane(which || 'login');
  document.getElementById('auth-overlay').classList.add('open');
}
function closeAuthModal(){
  const ov = document.getElementById('auth-overlay');
  if(ov) ov.classList.remove('open');
}
function formMsg(id, text, ok){
  const el = document.getElementById(id);
  el.textContent = text;
  el.className = 'form-msg show ' + (ok ? 'ok' : 'err');
}

async function handleLogin(){
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if(!email || !password){ formMsg('login-msg','Enter your email and password.'); return; }
  const btn = document.getElementById('login-submit'); btn.disabled = true; btn.textContent = 'Logging in…';
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  btn.disabled = false; btn.textContent = 'Log in';
  if(error){ formMsg('login-msg', error.message); return; }
  closeAuthModal();
}

async function handleSignup(){
  const username = document.getElementById('signup-username').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if(!username || !email || !password){ formMsg('signup-msg','Fill in all three fields.'); return; }
  if(password.length < 6){ formMsg('signup-msg','Password needs at least 6 characters.'); return; }
  const btn = document.getElementById('signup-submit'); btn.disabled = true; btn.textContent = 'Creating…';
  const { data, error } = await supabase.auth.signUp({ email, password, options:{ data:{ username } } });
  if(error){ btn.disabled = false; btn.textContent = 'Create account'; formMsg('signup-msg', error.message); return; }
  if(data.user){
    await supabase.from('profiles').upsert({ id: data.user.id, username });
  }
  btn.disabled = false; btn.textContent = 'Create account';
  if(data.session){
    formMsg('signup-msg', 'Account created — welcome in.', true);
    setTimeout(closeAuthModal, 700);
  } else {
    formMsg('signup-msg', 'Check your email to confirm your account, then log in.', true);
  }
}

async function signOutUser(){
  await supabase.auth.signOut();
  const menu = document.getElementById('user-menu');
  if(menu) menu.classList.remove('open');
}

/* ---------- navbar rendering ---------- */
function renderAuthSlot(){
  const slot = document.getElementById('auth-slot');
  const mobileSlot = document.getElementById('mobile-auth-slot');
  if(!slot) return;

  if(!supabaseReady){
    slot.innerHTML = `<a href="#" class="btn sm ghost" onclick="alert('Connect Supabase first — see README-SETUP.md'); return false;">Log in</a>`;
    if(mobileSlot) mobileSlot.innerHTML = '';
    return;
  }

  if(currentUser){
    const name = (currentProfile && currentProfile.username) || currentUser.email.split('@')[0];
    const initial = name.charAt(0).toUpperCase();
    slot.innerHTML = `
      <div style="position:relative;">
        <button class="user-chip" id="user-chip-btn"><span class="avatar">${initial}</span>${name}</button>
        <div class="user-menu" id="user-menu">
          <div class="streak-mini" id="user-menu-streak">🌱 loading streak…</div>
          <a href="journal.html">My journal</a>
          <a href="blog.html">Blog</a>
          <button id="user-menu-signout">Log out</button>
        </div>
      </div>`;
    document.getElementById('user-chip-btn').addEventListener('click', (e)=>{
      e.stopPropagation();
      document.getElementById('user-menu').classList.toggle('open');
    });
    document.getElementById('user-menu-signout').addEventListener('click', signOutUser);
    document.addEventListener('click', ()=>{ const m=document.getElementById('user-menu'); if(m) m.classList.remove('open'); }, { once:true });
    computeStreak(currentUser.id).then(s=>{
      const el = document.getElementById('user-menu-streak');
      if(el) el.textContent = s.current > 0 ? `🌱 ${s.current}-day streak` : `🌱 No streak yet — log today`;
    });
    if(mobileSlot) mobileSlot.innerHTML = `<button class="btn sm" style="width:100%;" onclick="signOutUser()">Log out (${name})</button>`;
  } else {
    slot.innerHTML = `
      <button class="btn sm ghost" onclick="openAuthModal('login')">Log in</button>
      <button class="btn sm primary" onclick="openAuthModal('signup')">Sign up</button>`;
    if(mobileSlot) mobileSlot.innerHTML = `
      <button class="btn sm ghost" style="width:100%; margin-bottom:8px;" onclick="openAuthModal('login')">Log in</button>
      <button class="btn sm primary" style="width:100%;" onclick="openAuthModal('signup')">Sign up</button>`;
  }
}

async function refreshSession(){
  if(!supabaseReady){ renderAuthSlot(); return; }
  const { data:{ session } } = await supabase.auth.getSession();
  currentUser = session ? session.user : null;
  if(currentUser){
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
    currentProfile = data;
  } else {
    currentProfile = null;
  }
  renderAuthSlot();
  document.dispatchEvent(new CustomEvent('auth-ready', { detail:{ user: currentUser, profile: currentProfile } }));
}

/* ---------- streak math ---------- */
async function computeStreak(userId){
  if(!supabaseReady) return { current:0, longest:0, days:[] };
  const { data, error } = await supabase
    .from('journal_entries')
    .select('entry_date')
    .eq('user_id', userId)
    .order('entry_date', { ascending:false });
  if(error || !data) return { current:0, longest:0, days:[] };

  const daySet = new Set(data.map(r=>r.entry_date));
  const days = [...daySet].sort().reverse();

  let current = 0;
  let cursor = new Date();
  cursor.setHours(0,0,0,0);
  const todayStr = cursor.toISOString().slice(0,10);
  if(!daySet.has(todayStr)) cursor.setDate(cursor.getDate()-1); // allow streak to still show if not logged yet today

  while(true){
    const key = cursor.toISOString().slice(0,10);
    if(daySet.has(key)){ current++; cursor.setDate(cursor.getDate()-1); }
    else break;
  }

  let longest = 0, run = 0, prev = null;
  [...daySet].sort().forEach(d=>{
    if(prev){
      const diff = (new Date(d) - new Date(prev)) / 86400000;
      run = diff === 1 ? run + 1 : 1;
    } else run = 1;
    longest = Math.max(longest, run);
    prev = d;
  });

  return { current, longest, days };
}

/* ---------- boot ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  injectAuthModal();
  refreshSession();
  if(supabaseReady){
    supabase.auth.onAuthStateChange((_event, _session)=>{ refreshSession(); });
  }
});
