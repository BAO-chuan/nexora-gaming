(() => {
const C=window.NEXORA_CONFIG;if(!C||!window.supabase)return;const db=window.supabase.createClient(C.SUPABASE_URL,C.SUPABASE_KEY);window.NEXORA_DB=db;const $=id=>document.getElementById(id);const msg=(id,t,bad=false)=>{const e=$(id);if(e){e.textContent=t;e.style.color=bad?'#ff6b7a':'#20e6ff'}};
async function session(){const {data}=await db.auth.getSession();return data.session}
function authPage(){if(!$('loginForm'))return;
 let recoveryMode=false;
 const loginTab=$('loginTab'),registerTab=$('registerTab'),loginForm=$('loginForm'),registerForm=$('registerForm'),resetForm=$('resetPasswordForm');
 function setupPasswordToggles(){document.querySelectorAll('.nx-password-toggle').forEach(b=>b.onclick=()=>{const i=$(b.dataset.passwordTarget);if(!i)return;const show=i.type==='password';i.type=show?'text':'password';b.textContent=show?'🙈':'👁'})}
 setupPasswordToggles();
 function showRecovery(){recoveryMode=true;loginForm.classList.add('hidden');registerForm.classList.add('hidden');if(resetForm)resetForm.classList.remove('hidden');loginTab?.classList.remove('active');registerTab?.classList.remove('active');document.querySelector('.nx-auth-tabs')?.classList.add('hidden');msg('authMsg','✓ Link khôi phục hợp lệ. Hãy đặt mật khẩu mới.')}
 function exitRecovery(){recoveryMode=false;if(resetForm)resetForm.classList.add('hidden');document.querySelector('.nx-auth-tabs')?.classList.remove('hidden');history.replaceState(null,'',location.pathname);location.hash='login';toggleAuth()}
 const forgot=$('forgotPasswordBtn');if(forgot)forgot.onclick=async()=>{const email=$('loginEmail').value.trim();if(!email){msg('authMsg','Nhập email tài khoản trước rồi bấm “Quên mật khẩu?”.',true);$('loginEmail').focus();return}forgot.disabled=true;msg('authMsg','Đang gửi email đặt lại mật khẩu...');try{const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo:new URL('auth.html',location.href).href});if(error)throw error;msg('authMsg','✓ Đã gửi email đặt lại mật khẩu. Hãy kiểm tra hộp thư và Spam.')}catch(e){msg('authMsg',e.message,true)}finally{forgot.disabled=false}};
 loginTab.onclick=()=>{location.hash='login';toggleAuth()};registerTab.onclick=()=>{location.hash='register';toggleAuth()};
 function toggleAuth(){if(recoveryMode)return;const r=location.hash==='#register';loginForm.classList.toggle('hidden',r);registerForm.classList.toggle('hidden',!r);if(resetForm)resetForm.classList.add('hidden');loginTab.classList.toggle('active',!r);registerTab.classList.toggle('active',r)}toggleAuth();
 db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')showRecovery()});
 const urlSignal=new URLSearchParams(location.search).has('code')||location.hash.includes('type=recovery')||location.hash.includes('access_token=');
 if(urlSignal){setTimeout(async()=>{const {data}=await db.auth.getSession();if(data?.session)showRecovery()},250)}
 if(resetForm)resetForm.onsubmit=async e=>{e.preventDefault();const p1=$('resetPassword').value,p2=$('resetPasswordConfirm').value;if(p1.length<6)return msg('authMsg','Mật khẩu mới phải có ít nhất 6 ký tự.',true);if(p1!==p2)return msg('authMsg','Hai mật khẩu chưa khớp.',true);const b=resetForm.querySelector('button[type="submit"]');b.disabled=true;msg('authMsg','Đang cập nhật mật khẩu...');try{const {error}=await db.auth.updateUser({password:p1});if(error)throw error;await db.auth.signOut();exitRecovery();$('loginPassword').value='';msg('authMsg','✓ Đổi mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới.')}catch(err){msg('authMsg','Không thể đổi mật khẩu: '+(err.message||'Link có thể đã hết hạn.'),true)}finally{b.disabled=false}};
 loginForm.onsubmit=async e=>{e.preventDefault();msg('authMsg','Đang đăng nhập...');const {data,error}=await db.auth.signInWithPassword({email:$('loginEmail').value.trim(),password:$('loginPassword').value});if(error)return msg('authMsg',error.message,true);try{const user=data?.user||data?.session?.user;if(user){const {data:p}=await db.from('nexora_profiles').select('role').eq('user_id',user.id).single();location.href=p?.role==='admin'?'admin.html':'dashboard.html';return}}catch(err){console.warn('Nexora role redirect:',err)}location.href='dashboard.html'};const refCode=(new URLSearchParams(location.search).get('ref')||'').trim().toUpperCase();
 const refBanner=$('authReferralBanner');
 if(refCode&&refBanner){refBanner.classList.remove('hidden');refBanner.innerHTML=`🤝 Bạn đang đăng ký qua mã giới thiệu <b>${esc(refCode)}</b><small>Referral chỉ được thưởng sau khi Challenge đầu tiên của bạn được Admin duyệt.</small>`}
 registerForm.onsubmit=async e=>{e.preventDefault();msg('authMsg','Đang tạo tài khoản...');const meta={display_name:$('registerName').value.trim()};if(refCode)meta.referral_code=refCode;const email=$('registerEmail').value.trim();const emailRedirectTo=new URL('verify-email.html?confirmed=1',location.href).href;const {data,error}=await db.auth.signUp({email,password:$('registerPassword').value,options:{data:meta,emailRedirectTo}});if(error)return msg('authMsg',error.message,true);if(data?.session){msg('authMsg','✓ Đăng ký thành công. Đang vào Nexora...');setTimeout(()=>location.href='dashboard.html',500)}else{sessionStorage.setItem('nexora_pending_verify_email',email);location.href='verify-email.html?email='+encodeURIComponent(email)}};}
async function requireUser(){const s=await session();if(!s){location.href='auth.html';return null}return s.user}
async function logoutSetup(){if($('logoutBtn'))$('logoutBtn').onclick=async()=>{await db.auth.signOut();location.href='index.html'}}
let currentChallenge=null,myProfile=null,randomAccepted=false,myXpProgress=null,randomTimer=null,randomExpiresAt=null,currentSeasonData={rank:'Bronze',points:0,position:null};
async function dashboard(){if(!$('profileForm'))return;const user=await requireUser();if(!user)return;logoutSetup();const {data:p,error}=await db.from('nexora_profiles').select('*').eq('user_id',user.id).single();if(error)return msg('dashMsg','Hãy chạy file SQL v1.0 trong Supabase trước.',true);myProfile=p;$('displayName').value=p.display_name||'';$('gameUid').value=p.game_uid||'';$('gameRank').value=p.game_rank||'Chưa cập nhật';$('helloName').textContent=p.display_name||'Game thủ';$('navName').textContent=p.display_name||'';$('myPoints').textContent=p.points||0;if(p.role==='admin')$('adminLink').classList.remove('hidden');drawCard();renderProfileHero();loadXpProgress();loadSeason(user);loadLeaderboard();loadEvents(user);loadDaily(user);loadMissionCenter();loadRewards(user);loadReferralCenterV2688();loadSiteAnnouncementsV269();loadActivity();loadProofs(user);setupMediaUrlTool(user);loadPublicProfileLink(user);await loadRandomAcceptance(user);if($('refreshProofs'))$('refreshProofs').onclick=()=>loadProofs(user);if($('refreshEvents'))$('refreshEvents').onclick=()=>loadEvents(user);if($('refreshDaily'))$('refreshDaily').onclick=()=>loadDaily(user);if($('refreshRewards'))$('refreshRewards').onclick=()=>loadRewards(user);if($('refreshActivity'))$('refreshActivity').onclick=()=>loadActivity();if($('refreshSeason'))$('refreshSeason').onclick=()=>loadSeason(user);$('profileForm').onsubmit=async e=>{e.preventDefault();const upd={display_name:$('displayName').value.trim(),game_uid:$('gameUid').value.trim()||null,game_rank:$('gameRank').value};const {error}=await db.from('nexora_profiles').update(upd).eq('user_id',user.id);if(error)return msg('dashMsg',error.message,true);Object.assign(myProfile,upd);$('helloName').textContent=upd.display_name;$('navName').textContent=upd.display_name;drawCard();renderProfileHero();loadActivity();msg('dashMsg','Đã lưu hồ sơ ✓')};$('randomBtn').onclick=async()=>{if(randomAccepted)return msg('dashMsg','Bạn đang có một thử thách đã chấp nhận. Hãy hoàn thành và gửi bằng chứng trước khi nhận thử thách mới.',true);const b=$('randomBtn');b.disabled=true;b.textContent='Đang bốc...';const {data,error}=await db.rpc('nexora_pick_random_challenge');b.disabled=false;b.textContent='Bốc thử thách';if(error){console.error('nexora_pick_random_challenge:',error);return msg('dashMsg','Lỗi Advanced Challenge: '+(error.message||error.code||'Không xác định'),true);}if(!data?.ok||!data?.challenge){if((data?.message||'').toLowerCase().includes('cooldown')){await showRandomNextAvailable();return;}return msg('dashMsg',data?.message||'Hiện chưa có thử thách phù hợp. Hãy thử lại sau.',true);}hideRandomCooldownStatus();currentChallenge=data.challenge;renderRandomChallenge(currentChallenge,false)};if($('acceptBtn'))$('acceptBtn').onclick=async()=>{if(!currentChallenge||randomAccepted)return;const b=$('acceptBtn');b.disabled=true;b.textContent='Đang chấp nhận...';const {data,error}=await db.rpc('nexora_accept_random_challenge',{p_challenge_id:currentChallenge.id});if(error){b.disabled=false;b.textContent='🤝 Chấp nhận thử thách';return msg('dashMsg',error.message,true)}if(!data?.ok){b.disabled=false;b.textContent='🤝 Chấp nhận thử thách';return msg('dashMsg',data?.message||'Không thể chấp nhận thử thách.',true)}randomAccepted=true;randomExpiresAt=data?.expires_at||null;if(data?.challenge)currentChallenge=data.challenge;renderRandomChallenge(currentChallenge,true,randomExpiresAt);msg('dashMsg',data.message||'Đã chấp nhận và khóa thử thách ✓')};$('completeBtn').onclick=async()=>{if(!currentChallenge)return;if(!randomAccepted)return msg('dashMsg','Hãy chấp nhận thử thách trước khi gửi bằng chứng.',true);openProofSubmission('random',currentChallenge.id,currentChallenge.title,currentChallenge.points,user)};$('downloadCard').onclick=()=>{const a=document.createElement('a');a.download='nexora-player-card.png';a.href=$('playerCard').toDataURL('image/png');a.click()};}

function challengeDifficultyText(d){return d==='hard'?'KHÓ':d==='medium'?'VỪA':'DỄ'}
function challengeMultiplier(d){return d==='hard'?1.5:d==='medium'?1.25:1}
function stopRandomTimer(){if(randomTimer){clearInterval(randomTimer);randomTimer=null}}
function startRandomTimer(expiresAt){stopRandomTimer();randomExpiresAt=expiresAt||null;const el=$('randomCountdown');if(!el||!expiresAt)return;const tick=async()=>{const left=Math.max(0,Math.floor((new Date(expiresAt).getTime()-Date.now())/1000)),m=Math.floor(left/60),sec=left%60;el.textContent=left>0?`⏱️ Còn ${m}:${String(sec).padStart(2,'0')} để gửi bằng chứng`:'⌛ Đã hết thời gian';if(left<=0){stopRandomTimer();const u=await session();if(u?.user)await loadRandomAcceptance(u.user)}};tick();randomTimer=setInterval(tick,1000)}
let randomCooldownTimer=null;
function hideRandomCooldownStatus(){if(randomCooldownTimer){clearInterval(randomCooldownTimer);randomCooldownTimer=null}const el=$('randomCooldownStatus');if(el){el.classList.add('hidden');el.innerHTML=''}}
function formatWait(ms){ms=Math.max(0,ms);const total=Math.ceil(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),sec=total%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`}
async function showRandomNextAvailable(){const el=$('randomCooldownStatus');if(!el)return msg('dashMsg','Random Challenge đang cooldown. Hãy quay lại sau.',true);const {data,error}=await db.rpc('nexora_random_next_available');if(error||!data?.available_at){el.classList.remove('hidden');el.innerHTML='<b>⏳ Random Challenge đang hồi</b><span>Hiện chưa xác định được thời gian mở lại.</span>';return}const at=new Date(data.available_at);const paint=()=>{const left=at.getTime()-Date.now();if(left<=0){hideRandomCooldownStatus();msg('dashMsg','Random Challenge đã sẵn sàng. Bạn có thể bốc lại ✓');return}el.classList.remove('hidden');el.innerHTML=`<b>⏳ Random Challenge đang hồi</b><span>Có thể bốc lại sau <strong>${formatWait(left)}</strong></span><small>Mở lại lúc ${at.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})} • ${at.toLocaleDateString('vi-VN')}</small>`};paint();if(randomCooldownTimer)clearInterval(randomCooldownTimer);randomCooldownTimer=setInterval(paint,1000)}
function renderRandomChallenge(ch,accepted=false,expiresAt=null){if(!ch)return;currentChallenge=ch;randomAccepted=!!accepted;const box=$('challengeBox'),random=$('randomBtn'),accept=$('acceptBtn'),complete=$('completeBtn'),note=$('randomLockNote');const difficulty=ch.difficulty||'easy',mult=Number(ch.reward_multiplier||challengeMultiplier(difficulty)),xp=Math.max(1,Math.round(Number(ch.points||0)*mult)),sp=xp,limit=Number(ch.time_limit_minutes||60),cool=Number(ch.cooldown_hours||24);if(box)box.innerHTML=`<div class="challenge-meta"><span class="difficulty ${esc(difficulty)}">${challengeDifficultyText(difficulty)}</span><span class="challenge-chip">⏳ ${limit} phút</span><span class="challenge-chip">🧊 ${cool}h cooldown</span></div><b>${esc(ch.title)}</b><br><span>${esc(ch.description)}</span><div class="challenge-rewards"><small>+${ch.points} điểm Nexora</small><small>⚡ ~${xp} XP</small><small>🏆 ~${sp} SP</small></div>${accepted?'<div class="challenge-lock-badge">🔒 Thử thách đang được khóa</div><div id="randomCountdown" class="random-countdown"></div>':''}`;if(random){random.disabled=accepted;random.textContent=accepted?'🔒 Đã khóa':'Bốc thử thách'}if(accept){accept.disabled=accepted;accept.textContent=accepted?'✓ Đã chấp nhận':'🤝 Chấp nhận thử thách'}if(complete){complete.disabled=!accepted;complete.textContent='✓ Đã hoàn thành'}if(note)note.textContent=accepted?'🔒 Challenge có thời hạn. Gửi bằng chứng trước khi hết giờ; gửi thành công sẽ mở khóa ngay để nhận thử thách mới.':'v2.0 tự tránh 3 thử thách gần nhất và áp dụng cooldown theo từng Challenge.';if(accepted&&expiresAt)startRandomTimer(expiresAt);else stopRandomTimer()}
async function loadRandomAcceptance(user){if(!$('randomBtn'))return;const {data,error}=await db.rpc('nexora_my_random_acceptance');if(error){console.error('nexora_my_random_acceptance:',error);if($('randomLockNote'))$('randomLockNote').textContent='Lỗi Advanced Challenge: '+(error.message||error.code||'Không xác định');return}if(data?.active&&data?.challenge){randomExpiresAt=data.expires_at||null;renderRandomChallenge(data.challenge,true,randomExpiresAt);return}stopRandomTimer();hideRandomCooldownStatus();randomExpiresAt=null;randomAccepted=false;currentChallenge=null;if($('randomBtn')){$('randomBtn').disabled=false;$('randomBtn').textContent='Bốc thử thách'}if($('acceptBtn')){$('acceptBtn').disabled=true;$('acceptBtn').textContent='🤝 Chấp nhận thử thách'}if($('completeBtn'))$('completeBtn').disabled=true;if($('challengeBox'))$('challengeBox').innerHTML='<span>Bấm nút để nhận thử thách</span>';if($('randomLockNote'))$('randomLockNote').textContent='v2.0 tự tránh 3 thử thách gần nhất và áp dụng cooldown theo từng Challenge.'}

function esc(s=''){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}

let nexoraHiddenHistoryV2687=null;
function historyKeyV2687(type,...parts){
 return [type,...parts.map(v=>String(v??'').trim())].join('|').slice(0,900);
}
async function hiddenHistoryV2687(force=false){
 if(nexoraHiddenHistoryV2687&&!force)return nexoraHiddenHistoryV2687;
 const {data,error}=await db.rpc('nexora_my_hidden_history_v2687');
 if(error){console.warn('nexora_my_hidden_history_v2687',error);return new Set()}
 nexoraHiddenHistoryV2687=new Set((data||[]).map(x=>`${x.history_type}|${x.history_key}`));
 return nexoraHiddenHistoryV2687;
}
function isHistoryHiddenV2687(set,type,key){return set.has(`${type}|${key}`)}
async function hideHistoryItemV2687(type,key,label,reload){
 if(!confirm(`Xóa ${label||'mục này'} khỏi lịch sử của bạn?\n\nThao tác này chỉ ẩn mục khỏi tài khoản của bạn. Dữ liệu hệ thống cần cho PTS, XP, đổi thưởng và kiểm tra Admin vẫn được giữ an toàn.`))return;
 const {data,error}=await db.rpc('nexora_hide_history_item_v2687',{p_history_type:type,p_history_key:key});
 if(error)return msg('dashMsg',error.message||'Không thể xóa khỏi lịch sử.',true);
 nexoraHiddenHistoryV2687=null;
 if(typeof reload==='function')await reload();
 msg('dashMsg',data?.message||'Đã xóa khỏi lịch sử ✓');
}
function bindHistoryDeleteV2687(container,reload){
 if(!container)return;
 container.querySelectorAll('.user-history-delete-v2687').forEach(b=>b.onclick=()=>hideHistoryItemV2687(
   b.dataset.historyType,b.dataset.historyKey,b.dataset.historyLabel||'mục này',reload
 ));
}

function rankKey(rank='Bronze'){const k=String(rank).toLowerCase().replace(/\s+/g,'');return ({bronze:'bronze',silver:'silver',gold:'gold',platinum:'platinum',diamond:'diamond',master:'master'})[k]||'bronze'}
function rankAsset(rank='Bronze'){const svgs={"bronze": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23ff8a52%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%237a321e%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%23ff8a52%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%23ff8a52%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3EB%3C%2Ftext%3E%3C%2Fsvg%3E", "silver": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23eef5ff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2366788f%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%23eef5ff%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%23eef5ff%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3ES%3C%2Ftext%3E%3C%2Fsvg%3E", "gold": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23ffd24a%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%23b26a00%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%23ffd24a%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%23ffd24a%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3EG%3C%2Ftext%3E%3C%2Fsvg%3E", "platinum": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%2339c7ff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%230b5ea8%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%2339c7ff%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%2339c7ff%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3EP%3C%2Ftext%3E%3C%2Fsvg%3E", "diamond": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23d75cff%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%2364239a%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%23d75cff%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%23d75cff%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3ED%3C%2Ftext%3E%3C%2Fsvg%3E", "master": "data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20220%20220%22%3E%0A%3Cdefs%3E%3ClinearGradient%20id%3D%22g%22%20x1%3D%220%22%20y1%3D%220%22%20x2%3D%221%22%20y2%3D%221%22%3E%3Cstop%20stop-color%3D%22%23ff5b2e%22%2F%3E%3Cstop%20offset%3D%221%22%20stop-color%3D%22%239b1714%22%2F%3E%3C%2FlinearGradient%3E%3Cfilter%20id%3D%22s%22%20x%3D%22-40%25%22%20y%3D%22-40%25%22%20width%3D%22180%25%22%20height%3D%22180%25%22%3E%3CfeGaussianBlur%20stdDeviation%3D%226%22%20result%3D%22b%22%2F%3E%3CfeMerge%3E%3CfeMergeNode%20in%3D%22b%22%2F%3E%3CfeMergeNode%20in%3D%22SourceGraphic%22%2F%3E%3C%2FfeMerge%3E%3C%2Ffilter%3E%3C%2Fdefs%3E%0A%3Ccircle%20cx%3D%22110%22%20cy%3D%22110%22%20r%3D%2298%22%20fill%3D%22%23080b12%22%20stroke%3D%22%23ff5b2e%22%20stroke-width%3D%225%22%2F%3E%0A%3Cg%20filter%3D%22url(%23s)%22%3E%3Cpath%20d%3D%22M110%2020%20162%2048%20188%20101%20164%20164%20110%20198%2056%20164%2032%20101%2058%2048Z%22%20fill%3D%22url(%23g)%22%20stroke%3D%22%23ff5b2e%22%20stroke-width%3D%225%22%2F%3E%3Cpath%20d%3D%22M110%2042%20150%2066%20165%20105%20148%20147%20110%20174%2072%20147%2055%20105%2070%2066Z%22%20fill%3D%22%230b0f17%22%20stroke%3D%22rgba(255%2C255%2C255%2C.7)%22%20stroke-width%3D%223%22%2F%3E%3Cpath%20d%3D%22M110%2056%20126%2091%20162%2096%20135%20121%20143%20157%20110%20139%2077%20157%2085%20121%2058%2096%2094%2091Z%22%20fill%3D%22url(%23g)%22%2F%3E%3C%2Fg%3E%0A%3Ctext%20x%3D%22110%22%20y%3D%22129%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-weight%3D%22900%22%20font-size%3D%2242%22%20fill%3D%22%23fff%22%3EM%3C%2Ftext%3E%3C%2Fsvg%3E"};return svgs[rankKey(rank)]||svgs.bronze}
function hydrateRankImages(){document.querySelectorAll('img[data-rank-icon], .rank-road img').forEach(img=>{const r=img.dataset.rankIcon||img.alt||'Bronze';img.src=rankAsset(r);img.onerror=null})}
function rankPalette(rank='Bronze'){return ({bronze:['#e47949','#6f321e'],silver:['#d9e3ef','#657382'],gold:['#ffc21a','#8a5600'],platinum:['#21b8ff','#084b88'],diamond:['#c444ff','#532080'],master:['#ff4b23','#8b130f']})[rankKey(rank)]||['#e47949','#6f321e']}
function paintRankEmblem(ctx,cx,cy,r,rank='Bronze'){const [hi,lo]=rankPalette(rank);ctx.save();ctx.translate(cx,cy);ctx.shadowColor=hi;ctx.shadowBlur=24;ctx.fillStyle='#07090d';ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=10;const pts=[];for(let i=0;i<16;i++){const a=-Math.PI/2+i*Math.PI/8,rr=i%2===0?r*.88:r*.62;pts.push([Math.cos(a)*rr,Math.sin(a)*rr])}const g=ctx.createLinearGradient(-r,-r,r,r);g.addColorStop(0,hi);g.addColorStop(1,lo);ctx.fillStyle=g;ctx.strokeStyle=hi;ctx.lineWidth=3;ctx.beginPath();pts.forEach((q,i)=>i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]));ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#080c14';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2===0?r*.48:r*.22;i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr)}ctx.closePath();ctx.fill();ctx.fillStyle=hi;ctx.beginPath();ctx.arc(0,0,r*.12,0,Math.PI*2);ctx.fill();ctx.restore()}
function applyRankVisuals(rank='Bronze',points=0){const key=rankKey(rank),asset=rankAsset(rank);document.documentElement.dataset.seasonRank=key;for(const id of ['profileRankImage','seasonRankImage']){const el=$(id);if(el){el.src=asset;el.alt=rank}}if($('profileSeasonRank'))$('profileSeasonRank').textContent=String(rank).toUpperCase();if($('profileSeasonPoints'))$('profileSeasonPoints').textContent=`${points} SP`;document.querySelectorAll('[data-rank-step]').forEach(el=>el.classList.toggle('active',String(el.dataset.rankStep).toLowerCase()===String(rank).toLowerCase()))}
async function loadLeaderboard(){const {data}=await db.from('nexora_profiles').select('display_name,game_rank,points').order('points',{ascending:false}).limit(10);$('leaderboard').innerHTML=(data||[]).map((x,i)=>`<div class="row"><span>#${i+1}</span><span>${esc(x.display_name||'Game thủ')}<small> • ${esc(x.game_rank||'')}</small></span><strong>${x.points}</strong></div>`).join('')||'Chưa có dữ liệu.'}
function drawCard(){const c=$('playerCard');if(!c||!myProfile)return;const x=c.getContext('2d'),rank=currentSeasonData?.rank||'Bronze',[hi,lo]=rankPalette(rank),g=x.createLinearGradient(0,0,720,400);g.addColorStop(0,'#05070b');g.addColorStop(.58,'#10131b');g.addColorStop(1,lo);x.clearRect(0,0,720,400);x.fillStyle=g;x.fillRect(0,0,720,400);x.strokeStyle=hi;x.lineWidth=4;x.strokeRect(14,14,692,372);x.fillStyle=hi;x.font='900 28px sans-serif';x.fillText('NEXORA • BATTLE ID',40,58);x.fillStyle='#fff';x.font='900 44px sans-serif';x.fillText((myProfile.display_name||'GAME THỦ').slice(0,18),40,125);x.fillStyle='#aab6c7';x.font='20px sans-serif';x.fillText('UID: '+(myProfile.game_uid||'Chưa cập nhật'),40,165);x.fillText('GAME RANK: '+(myProfile.game_rank||'Chưa cập nhật'),40,198);x.fillStyle='#ffd86b';x.font='900 34px sans-serif';x.fillText((myProfile.points||0)+' NEXORA PTS',40,260);x.fillStyle='#eef5ff';x.font='700 20px sans-serif';x.fillText((currentSeasonData?.points||0)+' SP • #'+(currentSeasonData?.position||'—'),40,300);paintRankEmblem(x,570,165,92,rank);x.textAlign='center';x.fillStyle=hi;x.font='900 30px sans-serif';x.fillText(String(rank).toUpperCase(),570,290);x.fillStyle='#fff';x.font='700 15px sans-serif';x.fillText('SEASON RANK',570,318);x.textAlign='left';x.fillStyle='#7f8b9e';x.font='15px sans-serif';x.fillText('PLAY • CHALLENGE • RANK UP',40,356)}
async function admin(){if(!$('challengeForm'))return;const user=await requireUser();if(!user)return;logoutSetup();const {data:p}=await db.from('nexora_profiles').select('role').eq('user_id',user.id).single();if(p?.role!=='admin'){location.href='dashboard.html';return}async function load(){const [u,c,l]=await Promise.all([db.from('nexora_profiles').select('*',{count:'exact',head:true}),db.from('nexora_challenges').select('*',{count:'exact',head:true}),db.from('nexora_challenge_completions').select('*',{count:'exact',head:true})]);$('adminUsers').textContent=u.count||0;$('adminChallenges').textContent=c.count||0;$('adminCompletions').textContent=l.count||0;const {data}=await db.from('nexora_challenges').select('*').order('created_at',{ascending:false});$('adminChallengeList').innerHTML=(data||[]).map(x=>`<div class="admin-item"><span><b>${esc(x.title)}</b><br><small>${esc(x.description)} • ${x.points} điểm • ${challengeDifficultyText(x.difficulty||'easy')} • ${x.time_limit_minutes||60} phút • cooldown ${x.cooldown_hours||24}h</small></span><button class="ghost toggle" data-id="${x.id}" data-active="${x.is_active}">${x.is_active?'Tắt':'Bật'}</button></div>`).join('');document.querySelectorAll('.toggle').forEach(b=>b.onclick=async()=>{await db.from('nexora_challenges').update({is_active:b.dataset.active!=='true'}).eq('id',b.dataset.id);load()})}await load();$('challengeForm').onsubmit=async e=>{e.preventDefault();const row={title:$('challengeTitle').value.trim(),description:$('challengeDescription').value.trim(),points:+$('challengePoints').value,difficulty:$('challengeDifficulty')?.value||'easy',time_limit_minutes:+($('challengeTimeLimit')?.value||60),cooldown_hours:+($('challengeCooldown')?.value||24)};const {error}=await db.from('nexora_challenges').insert(row);if(error)return msg('adminMsg',error.message,true);e.target.reset();$('challengePoints').value=10;if($('challengeDifficulty'))$('challengeDifficulty').value='easy';if($('challengeTimeLimit'))$('challengeTimeLimit').value=60;if($('challengeCooldown'))$('challengeCooldown').value=24;msg('adminMsg','Đã thêm Challenge v2.0 ✓');load()}}

async function loadEvents(user){
 const box=$('eventList'), mine=$('myEntries'); if(!box)return;
 const {data:events,error}=await db.from('nexora_events').select('*').eq('is_published',true).order('starts_at',{ascending:false});
 if(error){box.textContent='Hãy chạy SQL v1.2 trước.';return}
 const {data:entries}=await db.from('nexora_event_entries').select('event_id,status,created_at').eq('user_id',user.id);
 const map=new Map((entries||[]).map(x=>[x.event_id,x])); const now=Date.now();
 box.innerHTML=(events||[]).map(e=>{const joined=map.has(e.id), open=now>=new Date(e.starts_at).getTime()&&now<=new Date(e.ends_at).getTime();return `<article class="event-card"><div class="event-meta"><span class="pill">${open?'ĐANG DIỄN RA':'EVENT'}</span><span class="pill reward">🎁 ${esc(e.reward_text)}</span></div><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><div class="event-rules"><b>Thể lệ:</b> ${esc(e.rules)}</div><p class="note">${fmtDate(e.starts_at)} → ${fmtDate(e.ends_at)}</p><button class="${joined?'ghost':'btn'} join-event" data-id="${e.id}" ${joined||!open?'disabled':''}>${joined?'✓ Đã tham gia':open?'Tham gia miễn phí':'Chưa mở / Đã kết thúc'}</button></article>`}).join('')||'<div class="coming">CHƯA CÓ EVENT <small>Admin chưa công bố sự kiện mới.</small></div>';
 document.querySelectorAll('.join-event').forEach(b=>b.onclick=async()=>{const {data,error}=await db.rpc('nexora_join_event',{p_event_id:b.dataset.id});if(error)return msg('dashMsg',error.message,true);msg('dashMsg',data?.message||'Đã tham gia',!data?.ok);loadEvents(user)});
 if(mine){
   const hidden=await hiddenHistoryV2687();
   const rows=(events||[]).filter(e=>map.has(e.id)&&!isHistoryHiddenV2687(hidden,'event_entry',String(e.id)));
   mine.innerHTML=rows.map(e=>{const x=map.get(e.id);return `<div class="entry"><div><b>${esc(e.title)}</b> • <span class="entry-status">${statusText(x.status)}</span><br><small>Phần thưởng: ${esc(e.reward_text)} • Tham gia ${fmtDate(x.created_at)}</small></div><button class="ghost small user-history-delete-v2687" data-history-type="event_entry" data-history-key="${esc(String(e.id))}" data-history-label="lượt tham gia Event này" type="button">🗑️ Xóa</button></div>`}).join('')||'Bạn chưa có lịch sử Event đang hiển thị.';
   bindHistoryDeleteV2687(mine,()=>loadEvents(user));
 }
}
function fmtDate(v){try{return new Intl.DateTimeFormat('vi-VN',{dateStyle:'short',timeStyle:'short'}).format(new Date(v))}catch{return v||''}}
function statusText(s){return ({joined:'Đã tham gia',verified:'Đã xác minh',winner:'Nhận thưởng',not_selected:'Không được chọn',rewarded:'Đã trao thưởng'})[s]||s}
function renderProfileHero(){if(!myProfile)return;const name=myProfile.display_name||'Game thủ',uid=myProfile.game_uid||'UID chưa cập nhật',rank=myProfile.game_rank||'Chưa cập nhật';if($('profileHeroName'))$('profileHeroName').textContent=name;if($('profileHeroMeta'))$('profileHeroMeta').textContent=uid+' • '+rank;if($('profileAvatar')){const initials=name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'NG';$('profileAvatar').textContent=initials}}


async function loadSeason(user){
 const box=$('seasonLeaderboard'); if(!box)return;
 const [mine,board]=await Promise.all([db.rpc('nexora_my_season_progress'),db.rpc('nexora_season_leaderboard',{p_limit:10})]);
 if(mine.error){box.textContent='Hãy chạy SQL v1.9 để bật Rank & Season.';return}
 const d=mine.data||{}, rank=d.rank||'Bronze', points=Number(d.points||0), pct=Math.max(0,Math.min(100,Number(d.progress_percent||0)));
 currentSeasonData={rank,points,position:d.position||null};applyRankVisuals(rank,points);drawCard();maybeShowRankUp(rank,points,d.season_key||'current');
 if($('seasonName'))$('seasonName').textContent=d.season_name||d.season_key||'Mùa hiện tại';
 if($('seasonPoints'))$('seasonPoints').textContent=points;
 if($('seasonPosition'))$('seasonPosition').textContent=d.position?'#'+d.position:'—';
 if($('seasonRankPill'))$('seasonRankPill').textContent=rank.toUpperCase();
 if($('seasonRankName'))$('seasonRankName').textContent=rank;
 if($('seasonNextLabel'))$('seasonNextLabel').textContent=d.next_rank?`Còn ${d.points_to_next} điểm tới ${d.next_rank}`:'Đã đạt hạng cao nhất mùa';
 if($('seasonProgressBar'))$('seasonProgressBar').style.width=pct+'%';
 if(board.error){box.textContent='Không tải được bảng xếp hạng mùa.';return}
 box.innerHTML=(board.data||[]).map(x=>`<div class="row ${x.user_id===user.id?'me':''}"><span>#${x.position}</span><span>${esc(x.display_name||'Game thủ')}<small class="rank-name"> • ${esc(x.season_rank||'Bronze')}</small></span><strong>${x.season_points} SP</strong></div>`).join('')||'<div class="empty-state">Mùa này chưa có điểm. Hãy hoàn thành Challenge để bắt đầu leo hạng.</div>';
}
async function loadXpProgress(){
 const {data,error}=await db.rpc('nexora_my_xp_progress');
 if(error){if($('profileLevelText'))$('profileLevelText').textContent='Hãy chạy SQL v1.8 để bật XP.';if($('xpHistory'))$('xpHistory').textContent='Hãy chạy SQL v1.8 trước.';return}
 myXpProgress=data||{};
 const level=Number(data?.level||1),total=Number(data?.total_xp||0),into=Number(data?.xp_into_level||0),need=Number(data?.xp_needed_this_level||100),remaining=Number(data?.xp_remaining||Math.max(0,need-into)),pct=Math.max(0,Math.min(100,Number(data?.progress_percent||0)));
 if($('profileLevel'))$('profileLevel').textContent=level;if($('profileXpTotal'))$('profileXpTotal').textContent=total+' XP';if($('profileLevelText'))$('profileLevelText').textContent=`${into} / ${need} XP tới Level ${level+1}`;if($('profileProgressPercent'))$('profileProgressPercent').textContent=pct+'%';if($('profileProgressBar'))$('profileProgressBar').style.width=pct+'%';if($('xpLevelPill'))$('xpLevelPill').textContent='LEVEL '+level;if($('xpTotal'))$('xpTotal').textContent=total;if($('xpLevel'))$('xpLevel').textContent=level;if($('xpRemaining'))$('xpRemaining').textContent=remaining;if($('xpProgressLabel'))$('xpProgressLabel').textContent=`${into} / ${need} XP`;if($('xpProgressPct'))$('xpProgressPct').textContent=pct+'%';if($('xpProgressBar'))$('xpProgressBar').style.width=pct+'%';
 const h=await db.rpc('nexora_my_xp_history',{p_limit:50});
 const box=$('xpHistory');if(!box)return;
 if(h.error){box.textContent='Không tải được lịch sử XP.';return}
 const hidden=await hiddenHistoryV2687();
 const rows=(h.data||[]).filter(x=>!isHistoryHiddenV2687(hidden,'xp',historyKeyV2687('xp',x.source_type,x.description,x.xp_amount,x.created_at)));
 box.innerHTML=rows.map(x=>{
   const key=historyKeyV2687('xp',x.source_type,x.description,x.xp_amount,x.created_at);
   return `<div class="xp-history-item"><span><b>${x.source_type==='event'?'🎁 Event':'⚡ Challenge'}</b><small>${esc(x.description||'Nhận XP')} • ${fmtDate(x.created_at)}</small></span><strong>+${x.xp_amount} XP</strong><button class="ghost small user-history-delete-v2687" data-history-type="xp" data-history-key="${esc(key)}" data-history-label="mục XP này" type="button">🗑️ Xóa</button></div>`;
 }).join('')||'<div class="empty-state">Chưa có lịch sử XP đang hiển thị.</div>';
 bindHistoryDeleteV2687(box,loadXpProgress);
}
async function loadRewards(user){const list=$('streakRewardList'),claim=$('claimLoginReward');if(!list||!claim)return;const [login,rewards]=await Promise.all([db.rpc('nexora_my_login_reward'),db.rpc('nexora_my_streak_rewards')]);if(login.error||rewards.error){$('loginRewardMeta').textContent='Hãy chạy SQL v1.4 trước.';list.textContent='Hãy chạy SQL v1.4 trước.';claim.disabled=true;return}const l=login.data||{};$('loginRewardMeta').textContent=`Đã điểm danh ${l.total_days||0} ngày • Chuỗi đăng nhập ${l.login_streak||0} ngày`;claim.disabled=!!l.claimed_today;claim.textContent=l.claimed_today?'✓ Đã nhận hôm nay':'Nhận +5 điểm';claim.onclick=async()=>{claim.disabled=true;const {data,error}=await db.rpc('nexora_claim_login_reward');if(error){claim.disabled=false;return msg('dashMsg',error.message,true)}msg('dashMsg',data?.message||'Đã nhận điểm danh',!data?.ok);if(data?.ok){myProfile.points=data.points;$('myPoints').textContent=data.points;drawCard();renderProfileHero();loadLeaderboard();loadDaily(user);loadActivity()}loadRewards(user)};list.innerHTML=(rewards.data||[]).map(r=>`<article class="streak-reward ${r.claimed?'claimed':r.unlocked?'unlocked':'locked'}"><span class="streak-icon">${r.milestone>=14?'🏆':'🔥'}</span><b>${r.milestone} ngày</b><small>+${r.reward_points} điểm</small><button class="${r.unlocked&&!r.claimed?'btn':'ghost'} claim-streak" data-milestone="${r.milestone}" ${!r.unlocked||r.claimed?'disabled':''}>${r.claimed?'✓ Đã nhận':r.unlocked?'Nhận thưởng':'🔒 Chưa mở'}</button></article>`).join('');document.querySelectorAll('.claim-streak').forEach(b=>b.onclick=async()=>{const {data,error}=await db.rpc('nexora_claim_streak_reward',{p_milestone:+b.dataset.milestone});if(error)return msg('dashMsg',error.message,true);msg('dashMsg',data?.message||'Đã nhận thưởng',!data?.ok);if(data?.ok){myProfile.points=data.points;$('myPoints').textContent=data.points;drawCard();renderProfileHero();loadLeaderboard();loadDaily(user);loadActivity()}loadRewards(user)})}
async function loadActivity(){
 const box=$('activityList');if(!box)return;
 const {data,error}=await db.rpc('nexora_my_activity_history',{p_limit:50});
 if(error){box.textContent='Hãy chạy SQL v1.4 trước.';return}
 const hidden=await hiddenHistoryV2687();
 const icons={login:'☀️',streak_reward:'🔥',daily:'🎯',challenge:'🎲',event:'🎁'};
 const rows=(data||[]).filter(a=>!isHistoryHiddenV2687(hidden,'activity',historyKeyV2687('activity',a.activity_type,a.title,a.detail,a.points,a.created_at)));
 box.innerHTML=rows.map(a=>{
  const key=historyKeyV2687('activity',a.activity_type,a.title,a.detail,a.points,a.created_at);
  return `<div class="activity-item"><span class="activity-icon">${icons[a.activity_type]||'⚡'}</span><div><b>${esc(a.title)}</b><small>${esc(a.detail||'')} • ${fmtDate(a.created_at)}</small></div><strong class="activity-points ${Number(a.points||0)>0?'gain':''}">${Number(a.points||0)>0?'+'+a.points:''}</strong><button class="ghost small user-history-delete-v2687" data-history-type="activity" data-history-key="${esc(key)}" data-history-label="hoạt động này" type="button">🗑️</button></div>`;
 }).join('')||'<div class="empty-state">Chưa có hoạt động đang hiển thị.</div>';
 bindHistoryDeleteV2687(box,loadActivity);
}
async function loadDaily(user){
 const box=$('dailyList');if(!box)return;
 const [tasks,summary,badges,proofs]=await Promise.all([
   db.rpc('nexora_daily_challenges'),
   db.rpc('nexora_my_daily_summary'),
   db.rpc('nexora_my_achievements'),
   db.rpc('nexora_my_challenge_proofs_v263')
 ]);
 if(tasks.error){box.textContent='Hãy chạy SQL v1.3 trước.';return}
 const proofRows=proofs.error?[]:(proofs.data||[]);
 const latestProof=new Map();
 proofRows.filter(p=>p.challenge_type==='daily').forEach(p=>{
   const key=String(p.challenge_id||'');
   if(!key)return;
   const prev=latestProof.get(key);
   if(!prev || new Date(p.created_at||0)>new Date(prev.created_at||0))latestProof.set(key,p);
 });
 const sum=summary.data||{};$('dailyStreak').textContent=sum.streak||0;$('dailyDone').textContent=(sum.today_done||0)+'/3';$('weeklyPoints').textContent=sum.weekly_points||0;$('weeklyRank').textContent=sum.weekly_rank?'#'+sum.weekly_rank:'—';
 box.innerHTML=(tasks.data||[]).map(x=>{
   const proof=latestProof.get(String(x.id));
   const pending=!x.completed&&proof?.status==='pending';
   const rejected=!x.completed&&proof?.status==='rejected';
   const btnText=x.completed?'✓ Đã hoàn thành':pending?'⏳ Chờ Admin duyệt':rejected?'🔁 Gửi lại bằng chứng':'🛡️ Gửi bằng chứng';
   const disabled=x.completed||pending;
   return `<article class="daily-card ${x.completed?'done':''}">
     <span class="difficulty ${x.difficulty}">${x.difficulty==='easy'?'DỄ':x.difficulty==='medium'?'VỪA':'KHÓ'}</span>
     <h3>${esc(x.title)}</h3>
     <p>${esc(x.description)}</p>
     <b>+${x.points} điểm</b><br>
     <button class="${disabled?'ghost':'btn'} daily-complete" data-id="${x.id}" ${disabled?'disabled':''}>${btnText}</button>
     ${pending?'<small class="note">Bằng chứng đã gửi. Hãy chờ Admin xác nhận.</small>':''}
     ${rejected?`<small class="note">Bằng chứng trước đã bị từ chối${proof?.admin_note?`: ${esc(proof.admin_note)}`:'.'}</small>`:''}
   </article>`;
 }).join('')||'Chưa đủ Challenge hoạt động.';
 document.querySelectorAll('.daily-complete:not([disabled])').forEach(b=>b.onclick=()=>{
   const task=(tasks.data||[]).find(x=>String(x.id)===String(b.dataset.id));
   if(!task)return;
   msg('dashMsg','Hãy gửi bằng chứng để Admin xác nhận nhiệm vụ này.');
   openProofSubmission('daily',task.id,task.title,task.points,user);
 });
 const ab=$('achievementList');if(ab)ab.innerHTML=(badges.data||[]).map(a=>`<div class="badge ${a.unlocked?'':'locked'}"><b>${a.icon} ${esc(a.title)}</b><small>${esc(a.description)}</small><br><span>${a.unlocked?'✓ Đã mở khóa':'🔒 Chưa mở'}</span></div>`).join('');
}

let missionCenterKind='daily';
function missionPeriodText(m){
 if(m.kind==='daily')return'Hôm nay';
 if(m.kind==='weekly')return'Tuần này';
 return'Toàn thời gian';
}
async function loadMissionCenter(){
 const box=$('missionCenterList');if(!box)return;
 const {data,error}=await db.rpc('nexora_my_mission_center_v264');
 if(error){box.textContent='Hãy chạy SQL v2.6.4 để bật Mission Center.';return}
 const rows=(data||[]).filter(x=>x.kind===missionCenterKind);
 const all=data||[];
 if($('missionCenterDone'))$('missionCenterDone').textContent=all.filter(x=>x.claimed).length;
 if($('missionCenterClaimable'))$('missionCenterClaimable').textContent=all.filter(x=>!x.claimed&&Number(x.progress)>=Number(x.target)).length;
 box.innerHTML=rows.map(m=>{
   const progress=Math.min(Number(m.progress||0),Number(m.target||1));
   const pct=Math.min(100,Math.round(progress/Math.max(1,Number(m.target))*100));
   const ready=!m.claimed&&progress>=Number(m.target);
   return `<article class="mission-center-card ${m.claimed?'claimed':ready?'ready':''}">
     <div class="mission-center-card-head"><span class="mission-center-icon">${m.kind==='daily'?'📅':m.kind==='weekly'?'📆':'🏆'}</span><span class="mission-period">${missionPeriodText(m)}</span></div>
     <h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>
     <div class="mission-progress"><div><i style="width:${pct}%"></i></div><span>${progress}/${m.target}</span></div>
     <footer><strong>+${m.points} PTS</strong><button class="${ready?'btn':'ghost'} mission-center-claim" data-key="${m.key}" ${m.claimed||!ready?'disabled':''}>${m.claimed?'✓ Đã nhận':ready?'Nhận thưởng':'Chưa hoàn thành'}</button></footer>
   </article>`
 }).join('')||'<div class="empty-state">Chưa có nhiệm vụ trong mục này.</div>';
 box.querySelectorAll('.mission-center-claim').forEach(b=>b.onclick=async()=>{
   b.disabled=true;
   const {data:r,error:e}=await db.rpc('nexora_claim_mission_center_v264',{p_key:b.dataset.key});
   if(e)return msg('dashMsg',e.message,true);
   msg('dashMsg',r?.message||'Đã xử lý',!r?.ok);
   if(r?.ok&&myProfile){myProfile.points=r.points;$('myPoints').textContent=r.points;drawCard();renderProfileHero();loadActivity()}
   loadMissionCenter();
 });
}
function initMissionCenter(){
 const tabs=$('missionCenterTabs');if(!tabs)return;
 tabs.querySelectorAll('[data-mission-kind]').forEach(b=>b.onclick=()=>{
   missionCenterKind=b.dataset.missionKind;
   tabs.querySelectorAll('[data-mission-kind]').forEach(x=>x.classList.toggle('active',x===b));
   loadMissionCenter();
 });
 if($('refreshMissionCenter'))$('refreshMissionCenter').onclick=loadMissionCenter;
}


let userProofUnreadV266=0,userRewardUnreadV267=0,userSupportUnreadV2681=0,adminProofUnreadV266=0,adminRewardUnreadV267=0,adminSupportUnreadV2681=0;
function updateUserNotifyBadgeV267(){
 const badge=$('userProofBadge');if(!badge)return;
 const total=userProofUnreadV266+userRewardUnreadV267+userSupportUnreadV2681;
 badge.textContent=total;badge.classList.toggle('hidden',total===0);
}
function updateAdminNotifyBadgeV267(){
 const total=adminProofUnreadV266+adminRewardUnreadV267+adminSupportUnreadV2681;
 ['adminProofBadge','adminNotifTabBadge'].forEach(id=>{const el=$(id);if(el){el.textContent=total;el.classList.toggle('hidden',total===0)}});
}
async function loadAdminProofNotificationsV266(){
 const box=$('adminProofNotificationList');
 if(!box&&!$('adminProofBadge'))return;
 const {data,error}=await db.rpc('nexora_admin_proof_notifications_v266',{p_limit:50});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.6 để bật thông báo Proof.';return}
 const rows=data||[], unread=rows.filter(x=>!x.is_read).length;
 adminProofUnreadV266=unread;updateAdminNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item admin-proof-notif ${n.is_read?'':'unread'}">
   <div class="proof-notif-icon">🛡️</div><div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div>
   <small>${communityTime(n.created_at)}</small><button class="btn small admin-open-proof" type="button">Mở bằng chứng</button></div>
 </div>`).join('')||'<div class="empty-state">Chưa có thông báo Proof.</div>';
 box?.querySelectorAll('.admin-open-proof').forEach(b=>b.onclick=()=>{
   document.querySelector('[data-admin-module="proof"]')?.click();
   adminProofs();
 });
}
async function markAdminProofNotificationsReadV266(){
 const {error}=await db.rpc('nexora_admin_mark_proof_notifications_read_v266');
 if(!error)loadAdminProofNotificationsV266();
}

async function loadAdminRewardNotificationsV267(){
 const box=$('adminRewardNotificationList');
 if(!box&&!$('adminProofBadge'))return;
 const {data,error}=await db.rpc('nexora_admin_reward_notifications_v267',{p_limit:50});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.7 để bật thông báo Reward.';return}
 const rows=data||[],unread=rows.filter(x=>!x.is_read).length;
 adminRewardUnreadV267=unread;updateAdminNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item admin-reward-notif ${n.is_read?'':'unread'}">
 <div class="proof-notif-icon">🎁</div><div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div>
 <small>${communityTime(n.created_at)}</small><button class="btn small admin-open-reward" type="button">Mở yêu cầu đổi thưởng</button></div></div>`).join('')||'<div class="empty-state">Chưa có yêu cầu đổi thưởng mới.</div>';
 box?.querySelectorAll('.admin-open-reward').forEach(b=>b.onclick=()=>{
   document.querySelector('[data-admin-module="rewards"]')?.click();
   setTimeout(()=>{$('adminRedemptionList')?.scrollIntoView({behavior:'smooth',block:'start'})},80);
 });
}
async function markAdminRewardNotificationsReadV267(){
 const {error}=await db.rpc('nexora_admin_mark_reward_notifications_read_v267');
 if(!error)loadAdminRewardNotificationsV267();
}

async function loadAdminSupportNotificationsV2681(){
 const box=$('adminSupportNotificationList');
 if(!box&&!$('adminProofBadge'))return;
 const {data,error}=await db.rpc('nexora_admin_support_notifications_v2681',{p_limit:50});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.8.1 để bật thông báo Support.';return}
 const rows=data||[];adminSupportUnreadV2681=rows.filter(x=>!x.is_read).length;updateAdminNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item support-notif ${n.is_read?'':'unread'}"><div class="proof-notif-icon">🛟</div><div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div><small>${communityTime(n.created_at)}</small><button class="btn small admin-open-support" data-ticket="${n.ticket_id||''}" type="button">Mở Ticket</button></div></div>`).join('')||'<div class="empty-state">Chưa có thông báo hỗ trợ.</div>';
 box?.querySelectorAll('.admin-open-support').forEach(b=>b.onclick=()=>{document.querySelector('[data-admin-module="support"]')?.click();setTimeout(()=>$('adminSupportTicketList')?.scrollIntoView({behavior:'smooth',block:'start'}),80)});
}
async function markAdminSupportNotificationsReadV2681(){const {error}=await db.rpc('nexora_admin_mark_support_notifications_read_v2681');if(!error)loadAdminSupportNotificationsV2681()}

function openAdminNotificationsV2132(){
 const key='notifications';
 document.querySelectorAll('.admin-module-tab').forEach(b=>b.classList.toggle('active',b.dataset.adminModule===key));
 document.querySelectorAll('[data-admin-module-section]').forEach(s=>s.classList.toggle('admin-module-hidden',s.dataset.adminModuleSection!==key));
 try{sessionStorage.setItem('nexoraAdminModule',key)}catch(e){}
 const section=document.querySelector('[data-admin-module-section="notifications"]');
 if(section)setTimeout(()=>section.scrollIntoView({behavior:'smooth',block:'start'}),30);
 Promise.allSettled([loadAdminProofNotificationsV266(),loadAdminRewardNotificationsV267(),loadAdminSupportNotificationsV2681()]);
}
async function markAllAdminNotificationsReadV2132(){
 const btn=$('markAdminNotificationsRead');
 if(btn){btn.disabled=true;btn.textContent='Đang đánh dấu...'}
 try{
  const results=await Promise.all([
   db.rpc('nexora_admin_mark_proof_notifications_read_v266'),
   db.rpc('nexora_admin_mark_reward_notifications_read_v267'),
   db.rpc('nexora_admin_mark_support_notifications_read_v2681')
  ]);
  const failed=results.find(r=>r?.error);
  if(failed?.error)throw failed.error;
  await Promise.all([loadAdminProofNotificationsV266(),loadAdminRewardNotificationsV267(),loadAdminSupportNotificationsV2681()]);
  if(typeof toast==='function')toast('Đã đánh dấu tất cả thông báo Admin là đã đọc ✓');
 }catch(e){
  console.error('Mark all admin notifications read:',e);
  if(typeof toast==='function')toast(e?.message||'Không thể đánh dấu đã đọc.');else alert(e?.message||'Không thể đánh dấu đã đọc.');
 }finally{
  if(btn){btn.disabled=false;btn.textContent='Đánh dấu tất cả đã đọc'}
 }
}
function initAdminProofNotificationsV266(){
 if(!$('adminProofBell')&&!$('adminProofNotificationList'))return;
 if($('adminProofBell'))$('adminProofBell').onclick=openAdminNotificationsV2132;
 if($('refreshAdminNotifications'))$('refreshAdminNotifications').onclick=()=>Promise.allSettled([loadAdminProofNotificationsV266(),loadAdminRewardNotificationsV267(),loadAdminSupportNotificationsV2681()]);
 if($('markAdminNotificationsRead'))$('markAdminNotificationsRead').onclick=markAllAdminNotificationsReadV2132;
 if($('refreshAdminProofNotifications'))$('refreshAdminProofNotifications').onclick=loadAdminProofNotificationsV266;
 if($('markAdminProofNotificationsRead'))$('markAdminProofNotificationsRead').onclick=markAdminProofNotificationsReadV266;
 loadAdminProofNotificationsV266();
 loadAdminRewardNotificationsV267();
 loadAdminSupportNotificationsV2681();
 setInterval(()=>{loadAdminProofNotificationsV266();loadAdminRewardNotificationsV267();loadAdminSupportNotificationsV2681()},15000);
}

async function adminEvents(){
 if(!$('eventForm'))return;
 async function load(){const {data}=await db.from('nexora_events').select('*,nexora_event_entries(count)').order('created_at',{ascending:false});$('adminEvents').textContent=(data||[]).length;$('adminEventList').innerHTML=(data||[]).map(e=>`<div class="admin-event"><b>${esc(e.title)}</b> <span class="pill reward">${esc(e.reward_text)}</span><br><small>${fmtDate(e.starts_at)} → ${fmtDate(e.ends_at)} • ${(e.nexora_event_entries?.[0]?.count||0)} người tham gia • ${e.is_published?'Đang công bố':'Đang ẩn'}</small><div class="admin-event-actions"><button class="ghost ev-toggle" data-id="${e.id}" data-v="${e.is_published}">${e.is_published?'Ẩn':'Công bố'}</button><button class="ghost ev-entries" data-id="${e.id}">Người tham gia</button></div></div>`).join('')||'Chưa có Event.';document.querySelectorAll('.ev-toggle').forEach(b=>b.onclick=async()=>{await db.from('nexora_events').update({is_published:b.dataset.v!=='true'}).eq('id',b.dataset.id);load()});document.querySelectorAll('.ev-entries').forEach(b=>b.onclick=()=>loadEntries(b.dataset.id))}
 async function loadEntries(id){const {data,error}=await db.rpc('nexora_admin_event_entries',{p_event_id:id});if(error)return msg('adminMsg',error.message,true);$('adminEntryList').innerHTML=(data||[]).map(x=>`<div class="entry"><b>${esc(x.display_name)}</b> <small>${esc(x.game_uid||'UID chưa cập nhật')}</small><br><span class="entry-status">${statusText(x.status)}</span> • <small>${fmtDate(x.joined_at)}</small><div class="admin-event-actions"><button class="ghost entry-status-btn" data-entry="${x.entry_id}" data-status="verified">Xác minh</button><button class="ghost entry-status-btn" data-entry="${x.entry_id}" data-status="winner">Chọn nhận thưởng</button><button class="ghost entry-status-btn" data-entry="${x.entry_id}" data-status="rewarded">Đã trao</button></div></div>`).join('')||'Chưa có người tham gia.';document.querySelectorAll('.entry-status-btn').forEach(b=>b.onclick=async()=>{const {error}=await db.rpc('nexora_admin_set_entry_status',{p_entry_id:b.dataset.entry,p_status:b.dataset.status});if(error)return msg('adminMsg',error.message,true);loadEntries(id)})}
 $('eventForm').onsubmit=async e=>{e.preventDefault();const row={title:$('eventTitle').value.trim(),description:$('eventDescription').value.trim(),reward_text:$('eventReward').value.trim(),rules:$('eventRules').value.trim(),starts_at:new Date($('eventStart').value).toISOString(),ends_at:new Date($('eventEnd').value).toISOString(),is_published:true};if(new Date(row.ends_at)<=new Date(row.starts_at))return msg('adminMsg','Thời gian kết thúc phải sau thời gian bắt đầu.',true);const {error}=await db.from('nexora_events').insert(row);if(error)return msg('adminMsg',error.message,true);e.target.reset();msg('adminMsg','Đã tạo và công bố Event ✓');load()}; await load();
}


function proofStatus(s){return ({pending:'⏳ Chờ duyệt',approved:'✓ Đã duyệt',rejected:'✕ Từ chối'})[s]||s}
const PROOF_BUCKET='nexora-proofs';
const MEDIA_URL_BUCKET='nexora-media-url';
const PROOF_MAX_IMAGE=12*1024*1024;
const PROOF_MAX_VIDEO=50*1024*1024;
function proofFileKind(file){const t=(file?.type||'').toLowerCase(),n=(file?.name||'').toLowerCase();if(t.startsWith('image/')||/\.(jpg|jpeg|png|webp|heic|heif)$/.test(n))return'image';if(t.startsWith('video/')||/\.(mp4|mov|webm)$/.test(n))return'video';return''}
function proofFileOk(file){const kind=proofFileKind(file);if(!kind)return{ok:false,message:'Chỉ hỗ trợ ảnh JPG/PNG/WEBP/HEIC hoặc video MP4/MOV/WEBM.'};const max=kind==='image'?PROOF_MAX_IMAGE:PROOF_MAX_VIDEO;if(file.size>max)return{ok:false,message:kind==='image'?'Ảnh tối đa 12 MB.':'Video tối đa 50 MB.'};return{ok:true,kind}}
function proofExt(file){const n=(file?.name||'').toLowerCase(),m=n.match(/\.([a-z0-9]+)$/);if(m)return m[1]==='jpeg'?'jpg':m[1];const t=(file?.type||'').toLowerCase();return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/heic':'heic','image/heif':'heif','video/mp4':'mp4','video/quicktime':'mov','video/webm':'webm'})[t]||'bin'}
function proofContentType(file){if(file?.type)return file.type.toLowerCase();return ({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',mp4:'video/mp4',mov:'video/quicktime',webm:'video/webm'})[proofExt(file)]||''}
async function proofHref(x){if(x.proof_path){const {data,error}=await db.storage.from(PROOF_BUCKET).createSignedUrl(x.proof_path,3600);if(!error&&data?.signedUrl)return data.signedUrl}return x.proof_url||''}
function proofMedia(url,mime=''){if(!url)return'<span class="note">Không mở được tệp bằng chứng.</span>';const m=(mime||'').toLowerCase(),u=esc(url);if(m.startsWith('image/'))return`<a href="${u}" target="_blank" rel="noopener"><img class="proof-preview" src="${u}" alt="Ảnh bằng chứng" loading="lazy"></a>`;if(m.startsWith('video/'))return`<video class="proof-video" src="${u}" controls preload="metadata" playsinline></video><a class="proof-link" href="${u}" target="_blank" rel="noopener">Mở video ↗</a>`;return`<a class="proof-link" href="${u}" target="_blank" rel="noopener">Mở bằng chứng ↗</a>`}
function setMediaProgress(pct,text){const wrap=$('mediaUrlProgress'),bar=$('mediaUrlProgressBar'),label=$('mediaUrlProgressText');if(wrap)wrap.classList.remove('hidden');if(bar)bar.style.width=Math.max(0,Math.min(100,pct))+'%';if(label)label.textContent=text||''}
async function setupMediaUrlTool(user){const fileInput=$('mediaUrlFile'),uploadBtn=$('mediaUrlUploadBtn'),info=$('mediaUrlFileInfo'),result=$('mediaUrlResult'),output=$('mediaUrlOutput');if(!fileInput||!uploadBtn||!user)return;fileInput.onchange=()=>{const file=fileInput.files?.[0];if(!file){info.textContent='Ảnh tối đa 12 MB • Video tối đa 50 MB';info.classList.remove('bad');return}const check=proofFileOk(file);info.textContent=check.ok?`${file.name} • ${(file.size/1024/1024).toFixed(1)} MB`:check.message;info.classList.toggle('bad',!check.ok)};uploadBtn.onclick=async()=>{const file=fileInput.files?.[0];if(!file)return msg('dashMsg','Hãy chọn ảnh hoặc video trước.',true);const check=proofFileOk(file);if(!check.ok)return msg('dashMsg',check.message,true);uploadBtn.disabled=true;uploadBtn.textContent='Đang tải lên...';result?.classList.add('hidden');setMediaProgress(15,'Đang chuẩn bị file...');try{const day=new Date().toISOString().slice(0,10),rnd=(crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now()),path=`${user.id}/${day}/${rnd}.${proofExt(file)}`,mime=proofContentType(file);setMediaProgress(40,'Đang tải file lên Nexora...');const {error}=await db.storage.from(MEDIA_URL_BUCKET).upload(path,file,{cacheControl:'31536000',upsert:false,contentType:mime});if(error)throw error;setMediaProgress(85,'Đang tạo URL công khai...');const {data}=db.storage.from(MEDIA_URL_BUCKET).getPublicUrl(path);const url=data?.publicUrl||'';if(!url)throw new Error('Không tạo được URL.');if(output)output.value=url;if($('mediaUrlOpenBtn'))$('mediaUrlOpenBtn').href=url;result?.classList.remove('hidden');setMediaProgress(100,'Đã tạo URL ✓');window.sessionStorage.setItem('nexora_last_media_url',url);msg('dashMsg','Đã tạo URL ảnh/video ✓')}catch(err){setMediaProgress(0,'Tải lên thất bại.');msg('dashMsg',err?.message||'Không thể tạo URL.',true)}finally{uploadBtn.disabled=false;uploadBtn.textContent='☁️ Tải lên & tạo URL'}};if($('mediaUrlCopyBtn'))$('mediaUrlCopyBtn').onclick=async()=>{const url=output?.value||'';if(!url)return;try{await navigator.clipboard.writeText(url);msg('dashMsg','Đã sao chép URL ✓')}catch{output.select();document.execCommand('copy');msg('dashMsg','Đã sao chép URL ✓')}};if($('mediaUrlUseBtn'))$('mediaUrlUseBtn').onclick=()=>{const url=output?.value||'';if(!url)return;window.sessionStorage.setItem('nexora_last_media_url',url);$('proofList')?.scrollIntoView({behavior:'smooth',block:'center'});msg('dashMsg','Đã lưu URL. Hãy chọn Challenge rồi bấm “Gửi bằng chứng”; URL sẽ được điền sẵn.')}}
function openProofSubmission(type,id,title,points,user){
  // v2.4.4: từ Challenge chuyển thẳng sang Bằng chứng → Proof Center.
  try{
    sessionStorage.setItem('nexora_dashboard_category','proof');
    sessionStorage.setItem('nexora_module_proof','proof-center');
  }catch{}
  const proofTab=document.querySelector('[data-dashboard-tab="proof"]');
  if(proofTab) proofTab.click();
  // Compact Module Navigation render menu con sau khi đổi danh mục.
  setTimeout(()=>{
    const proofCenterBtn=document.querySelector('[data-module-tab="proof-center"]');
    if(proofCenterBtn) proofCenterBtn.click();
    setTimeout(()=>{
      showProofForm(type,id,title,points,user);
      const input=$('proofUrl');
      if(input){
        input.scrollIntoView({behavior:'smooth',block:'center'});
        try{input.focus({preventScroll:true})}catch{input.focus()}
      }
      msg('dashMsg','Hãy dán URL bằng chứng và gửi Admin duyệt. Chỉ được tính hoàn thành sau khi Admin xác nhận.');
    },80);
  },80);
}
function proofNeedsTeamImage(title){
 const s=String(title||'').toLowerCase();
 return /team\s*[24]/i.test(s);
}
function showProofForm(type,id,title,points,user){
 const box=$('proofList');if(!box)return;
 const lastUrl=window.sessionStorage.getItem('nexora_last_media_url')||'';
 const needs2=type==='random'&&proofNeedsTeamImage(title);
 box.scrollIntoView({behavior:'smooth',block:'center'});
 box.innerHTML=`<article class="proof-card">
   <div class="proof-head"><b>🛡️ ${esc(title)}</b><strong>+${points} điểm</strong></div>
   <div class="proof-checklist">
     <b>Admin sẽ kiểm tra:</b>
     <span>✓ Đúng chế độ / đội hình theo Challenge</span>
     <span>✓ Thứ hạng hoặc số kills đúng yêu cầu</span>
     ${needs2?'<span>✓ Có ảnh đội hình Team 2/Team 4</span>':''}
   </div>
   <form id="proofSubmitForm" class="proof-form">
     <label>📸 Proof 1 — Ảnh kết quả trận
       <input id="proofUrl" type="url" inputmode="url" maxlength="500" required placeholder="https://..." value="${esc(lastUrl)}">
     </label>
     ${needs2?`<label>👥 Proof 2 — Ảnh đội hình <span class="proof-required">Bắt buộc</span>
       <input id="proofUrl2" type="url" inputmode="url" maxlength="500" required placeholder="https://...">
     </label>`:`<label>📎 Proof 2 — Ảnh bổ sung <span class="note">(không bắt buộc)</span>
       <input id="proofUrl2" type="url" inputmode="url" maxlength="500" placeholder="https://...">
     </label>`}
     <details style="margin:4px 0 12px"><summary style="cursor:pointer;font-weight:800">❓ Cách lấy URL ảnh</summary>
       <div class="note" style="margin-top:10px;line-height:1.65">Dùng <b>Media → URL</b> trên Dashboard để tải từng ảnh và lấy URL. Team 2/Team 4 cần ảnh thể hiện đồng đội/đội hình. Không gửi mật khẩu, OTP hoặc thông tin đăng nhập game.</div>
     </details>
     <textarea id="proofNote" maxlength="500" required placeholder="Ghi chú ngắn: Top bao nhiêu, bao nhiêu kills..."></textarea>
     <div class="proof-actions"><button id="proofSubmitBtn" class="btn">Gửi Admin duyệt</button><button type="button" id="proofCancel" class="ghost">Hủy</button></div>
   </form>
 </article>`;
 $('proofCancel').onclick=()=>loadProofs(user);
 $('proofSubmitForm').onsubmit=async e=>{
   e.preventDefault();
   const url=$('proofUrl').value.trim(),url2=$('proofUrl2')?.value.trim()||'',note=$('proofNote').value.trim();
   if(!/^https?:\/\/\S+$/i.test(url))return msg('dashMsg','Proof 1 phải là URL http:// hoặc https://',true);
   if(url2&&!/^https?:\/\/\S+$/i.test(url2))return msg('dashMsg','Proof 2 phải là URL http:// hoặc https://',true);
   if(needs2&&!url2)return msg('dashMsg','Challenge Team 2/Team 4 cần thêm ảnh đội hình ở Proof 2.',true);
   const btn=$('proofSubmitBtn');btn.disabled=true;btn.textContent='Đang gửi...';
   try{
     const {data,error}=await db.rpc('nexora_submit_challenge_proof_v263',{p_challenge_type:type,p_challenge_id:id,p_proof_url:url,p_proof_url_2:url2,p_note:note});
     if(error)throw error;if(!data?.ok)return msg('dashMsg',data?.message||'Không thể gửi bằng chứng.',true);
     window.sessionStorage.removeItem('nexora_last_media_url');
     msg('dashMsg',data.message||'Đã gửi bằng chứng');
     if(window.NEXORA_PUSH) window.NEXORA_PUSH.notifyAdmins({event:'proof_submission',challengeType:type,challengeTitle:title||'Challenge',points:Number(points||0)});
     if(type==='random')await loadRandomAcceptance(user);
     loadProofs(user);loadProofNotificationsV266();
   }catch(err){msg('dashMsg',err?.message||'Không thể gửi bằng chứng.',true)}
   finally{btn.disabled=false;btn.textContent='Gửi Admin duyệt'}
 };
}
async function removeProofFromHistory(id,status,user){
 const ask=status==='pending'?'Hủy bằng chứng đang chờ duyệt? Bạn có thể gửi lại Challenge này sau khi hủy.':'Ẩn bằng chứng này khỏi lịch sử của bạn? Điểm và dữ liệu Admin vẫn được giữ.';
 if(!confirm(ask))return;
 const {data,error}=await db.rpc('nexora_user_remove_challenge_proof',{p_submission_id:id});
 if(error)return msg('dashMsg',error.message,true);
 if(!data?.ok)return msg('dashMsg',data?.message||'Không thể xóa lịch sử.',true);
 msg('dashMsg',data.message||'Đã cập nhật lịch sử');loadProofs(user)
}
async function loadProofs(user){
 const box=$('proofList');if(!box)return;
 const {data,error}=await db.rpc('nexora_my_challenge_proofs_v263');
 if(error){box.textContent='Hãy chạy SQL v2.6.3 trước.';return}
 const cards=await Promise.all((data||[]).map(async x=>{
   const url=await proofHref(x),action=x.status==='pending'?'Hủy & xóa':'Xóa khỏi lịch sử';
   return `<article class="proof-card ${x.status}">
    <div class="proof-head"><b>${x.challenge_type==='daily'?'🎯 Daily':'🎲 Random'} • ${esc(x.challenge_title)}</b><span class="proof-status">${proofStatus(x.status)}</span></div>
    <small>${esc(x.game_mode||'')} ${x.team_size?`• Team ${x.team_size}`:''} • Gửi ${fmtDate(x.created_at)} • +${x.points} điểm</small>
    <p>${esc(x.note||'')}</p>
    <div class="proof-media-grid"><div><b>Proof 1</b>${proofMedia(url,x.proof_mime_type)}</div>${x.proof_url_2?`<div><b>Proof 2</b>${proofMedia(x.proof_url_2,'image/')}</div>`:''}</div>
    ${x.admin_note?`<p class="note">Admin: ${esc(x.admin_note)}</p>`:''}
    <div class="proof-history-action"><button type="button" class="ghost proof-delete" data-id="${x.submission_id}" data-status="${x.status}">${action}</button></div>
   </article>`}));
 box.innerHTML=cards.join('')||'<div class="empty-state">Chưa có bằng chứng Challenge nào.</div>';
 document.querySelectorAll('.proof-delete').forEach(b=>b.onclick=()=>removeProofFromHistory(b.dataset.id,b.dataset.status,user))
}
async function adminProofs(){
 const box=$('adminProofList');if(!box)return;
 async function load(){
   const {data,error}=await db.rpc('nexora_admin_challenge_proofs_v263',{p_status:'pending'});
   if(error){box.textContent='Hãy chạy SQL v2.6.3 trước.';return}
   const cards=await Promise.all((data||[]).map(async x=>{
     const url=await proofHref(x);
     return `<article class="proof-card pending">
       <div class="proof-head"><b>${esc(x.display_name)} • ${esc(x.challenge_title)}</b><strong>+${x.points} điểm</strong></div>
       <div class="admin-proof-verify">
         <span>🎮 ${esc(x.game_mode||'Challenge')} ${x.team_size?`• Team ${x.team_size}`:''}</span>
         <span>🔎 ${esc(x.proof_requirement||'Kiểm tra ảnh kết quả theo điều kiện Challenge')}</span>
         <span>🆔 UID: ${esc(x.game_uid||'chưa có')} • ${fmtDate(x.created_at)}</span>
       </div>
       <p>${esc(x.note||'')}</p>
       <div class="proof-media-grid"><div><b>Proof 1 — Kết quả</b>${proofMedia(url,x.proof_mime_type)}</div>${x.proof_url_2?`<div><b>Proof 2 — Đội hình/bổ sung</b>${proofMedia(x.proof_url_2,'image/')}</div>`:''}</div>
       <div class="proof-actions"><button class="btn proof-review" data-id="${x.submission_id}" data-user="${x.user_id||''}" data-points="${x.points||0}" data-title="${esc(x.challenge_title||'Challenge')}" data-status="approved">✓ Duyệt + cộng điểm</button><button class="ghost proof-review" data-id="${x.submission_id}" data-user="${x.user_id||''}" data-points="${x.points||0}" data-title="${esc(x.challenge_title||'Challenge')}" data-status="rejected">Từ chối</button></div>
     </article>`
   }));
   box.innerHTML=cards.join('')||'<div class="empty-state">Không có bằng chứng nào đang chờ duyệt.</div>';
   document.querySelectorAll('.proof-review').forEach(b=>b.onclick=async()=>{
     let note='';if(b.dataset.status==='rejected')note=prompt('Lý do từ chối (không bắt buộc):')||'';
     const {data,error}=await db.rpc('nexora_admin_review_challenge_proof',{p_submission_id:b.dataset.id,p_status:b.dataset.status,p_admin_note:note});
     if(error)return msg('adminMsg',error.message,true);
     msg('adminMsg',data?.message||'Đã xử lý',!data?.ok);
     if(data?.ok!==false&&window.NEXORA_PUSH&&b.dataset.user){
       const approved=b.dataset.status==='approved';
       window.NEXORA_PUSH.adminNotify(b.dataset.user,approved?'🛡️ Proof đã được duyệt':'🛡️ Proof bị từ chối',approved?`${b.dataset.title||'Challenge'} đã được duyệt. +${b.dataset.points||0} PTS đã được ghi nhận.`:`${b.dataset.title||'Challenge'} cần gửi lại bằng chứng.${note?` Lý do: ${note}`:''}`,'./dashboard.html','proof-review');
     }
     load();loadAdminProofNotificationsV266()
   })
 }
 if($('refreshProofAdmin'))$('refreshProofAdmin').onclick=load;await load()
}

async function loadPublicProfileLink(user){
 const open=$('openPublicProfile'),copy=$('copyPublicProfile'); if(!open&&!copy)return;
 const {data,error}=await db.rpc('nexora_my_public_profile_link');
 if(error){if($('publicProfileMsg'))$('publicProfileMsg').textContent='Hãy chạy SQL v2.1 để bật Public Profile.';return}
 const code=data?.public_code;if(!code)return;const url=new URL('profile.html',location.href);url.searchParams.set('p',code);
 if(open)open.href=url.toString();
 if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(url.toString());msg('publicProfileMsg','Đã sao chép liên kết hồ sơ ✓')}catch{prompt('Sao chép liên kết hồ sơ:',url.toString())}};
}
function publicInitials(name){return (name||'NG').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'NG'}
function drawPublicShareCard(d){const c=$('publicShareCard');if(!c)return;const x=c.getContext('2d'),w=c.width,h=c.height,rank=d.season_rank||'Bronze',[hi,lo]=rankPalette(rank);x.clearRect(0,0,w,h);const bg=x.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#05060a');bg.addColorStop(.62,'#11131c');bg.addColorStop(1,lo);x.fillStyle=bg;x.fillRect(0,0,w,h);x.strokeStyle=hi;x.lineWidth=5;x.strokeRect(20,20,w-40,h-40);x.fillStyle=hi;x.font='900 30px Arial';x.fillText('NEXORA • PLAYER ID',54,66);x.fillStyle='#929daf';x.font='700 15px Arial';x.fillText('PLAY • CHALLENGE • RANK UP',54,94);x.fillStyle='#fff';x.font='900 46px Arial';x.fillText((d.display_name||'Game thủ').slice(0,22),54,164);x.fillStyle='#aeb9c8';x.font='20px Arial';x.fillText(`GAME RANK: ${d.game_rank||'Chưa cập nhật'}`,54,202);x.fillStyle='#ffd86b';x.font='900 32px Arial';x.fillText(`LEVEL ${d.level||1}`,54,264);x.fillStyle='#fff';x.font='800 28px Arial';x.fillText(`${d.xp||0} XP`,230,264);x.fillStyle='#eef5ff';x.font='800 24px Arial';x.fillText(`${d.points||0} NEXORA PTS`,54,318);x.fillText(`${d.season_points||0} SP • #${d.season_position||'—'}`,54,356);x.fillStyle='#8490a1';x.font='18px Arial';x.fillText(`${d.approved_challenges||0} Challenge đã duyệt • ${d.verified_events||0} Event xác minh`,54,412);paintRankEmblem(x,715,185,112,rank);x.textAlign='center';x.fillStyle=hi;x.font='900 36px Arial';x.fillText(String(rank).toUpperCase(),715,338);x.fillStyle='#fff';x.font='700 16px Arial';x.fillText('SEASON RANK',715,368);x.textAlign='left';x.fillStyle='#6f7a8c';x.font='14px Arial';x.fillText('NEXORA GAMING • COMMUNITY EDITION',54,460)}
async function publicProfile(){if(!$('publicProfileView'))return;const code=new URLSearchParams(location.search).get('p');if(!code){$('publicProfileLoading')?.classList.add('hidden');if($('publicProfileError'))$('publicProfileError').textContent='Liên kết hồ sơ không hợp lệ.';return}const {data,error}=await db.rpc('nexora_public_profile',{p_public_code:code});$('publicProfileLoading')?.classList.add('hidden');if(error||!data?.ok){if($('publicProfileError'))$('publicProfileError').textContent=error?.message||data?.message||'Không tải được hồ sơ.';return}const d=data;$('publicProfileView').classList.remove('hidden');$('publicAvatar').textContent=publicInitials(d.display_name);$('publicName').textContent=d.display_name||'Game thủ';$('publicMeta').textContent=(d.game_rank||'Chưa cập nhật')+' • Mùa '+(d.season_key||'');$('publicLevel').textContent=d.level||1;$('publicXp').textContent=(d.xp||0)+' XP';$('publicProgressText').textContent=`${d.xp_into_level||0} / ${d.xp_needed||100} XP`;$('publicProgressPct').textContent=(d.xp_progress||0)+'%';$('publicProgressBar').style.width=(d.xp_progress||0)+'%';$('publicPoints').textContent=d.points||0;$('publicSeasonRank').textContent=d.season_rank||'Bronze';$('publicSeasonPoints').textContent=(d.season_points||0)+' SP';if($('publicRankImage')){$('publicRankImage').src=rankAsset(d.season_rank||'Bronze');$('publicRankImage').alt=d.season_rank||'Bronze'}if($('publicRankVisualName'))$('publicRankVisualName').textContent=String(d.season_rank||'Bronze').toUpperCase();$('publicSeasonPosition').textContent=d.season_position?'#'+d.season_position:'—';$('publicApproved').textContent=d.approved_challenges||0;$('publicDaily').textContent=d.daily_approved||0;$('publicRandom').textContent=d.random_approved||0;$('publicEvents').textContent=d.verified_events||0;drawPublicShareCard(d);const url=location.href;if($('downloadPublicCard'))$('downloadPublicCard').onclick=()=>{const a=document.createElement('a');a.download='nexora-share-card.png';a.href=$('publicShareCard').toDataURL('image/png');a.click()};if($('sharePublicProfile'))$('sharePublicProfile').onclick=async()=>{if(navigator.share){try{await navigator.share({title:`${d.display_name} • Nexora Gaming`,text:`Level ${d.level} • ${d.season_rank} • ${d.season_points} SP`,url});return}catch{}}try{await navigator.clipboard.writeText(url);alert('Đã sao chép liên kết hồ sơ ✓')}catch{prompt('Sao chép liên kết:',url)}}}


// =========================================================
// Nexora v2.3 — Community Expansion
// =========================================================
function communityTime(v){try{return new Date(v).toLocaleString('vi-VN',{dateStyle:'short',timeStyle:'short'})}catch{return ''}}
function maybeShowRankUp(rank,points,seasonKey){
 const order={bronze:0,silver:1,gold:2,platinum:3,diamond:4,master:5},key=rankKey(rank),store='nexora_rank_seen_'+seasonKey;
 let old=null;try{old=localStorage.getItem(store)}catch{}
 if(old&&order[key]>Number(old)){
   const o=$('rankUpOverlay');if(o){$('rankUpImage').src=rankAsset(rank);$('rankUpName').textContent=String(rank).toUpperCase();$('rankUpText').textContent=`Bạn đã đạt ${points} SP và thăng hạng lên ${rank}!`;o.classList.remove('hidden');o.setAttribute('aria-hidden','false');}
 }
 try{localStorage.setItem(store,String(order[key]))}catch{}
 if($('rankUpClose'))$('rankUpClose').onclick=()=>{$('rankUpOverlay')?.classList.add('hidden');$('rankUpOverlay')?.setAttribute('aria-hidden','true')};
}
async function communityDashboard(){
 if(!$('playerSearchInput'))return;const user=await requireUser();if(!user)return;
 const renderPlayers=async(q='')=>{const box=$('playerSearchResults');box.textContent='Đang tìm...';const {data,error}=await db.rpc('nexora_find_players',{p_query:q,p_limit:20});if(error){box.textContent='Hãy chạy SQL v2.3 để bật Community.';return}box.innerHTML=(data||[]).map(x=>`<article class="community-player"><a class="community-avatar-link" href="profile.html?p=${encodeURIComponent(x.public_code)}"><span class="community-mini-avatar">${publicInitials(x.display_name)}</span></a><div><a class="community-name" href="profile.html?p=${encodeURIComponent(x.public_code)}">${esc(x.display_name||'Game thủ')}</a><small>${esc(x.game_rank||'Chưa cập nhật')} • ${Number(x.points||0)} PTS • ${Number(x.followers||0)} follower</small></div>${x.is_me?'<span class="pill">BẠN</span>':`<button class="${x.following?'ghost':'btn'} follow-player" data-code="${x.public_code}">${x.following?'✓ Đang theo dõi':'+ Theo dõi'}</button>`}</article>`).join('')||'<div class="empty-state">Không tìm thấy game thủ phù hợp.</div>';box.querySelectorAll('.follow-player').forEach(b=>b.onclick=async()=>{b.disabled=true;const {data,error}=await db.rpc('nexora_toggle_follow',{p_public_code:b.dataset.code});if(error)msg('dashMsg',error.message,true);else msg('dashMsg',data?.message|| (data?.following?'Đã theo dõi ✓':'Đã bỏ theo dõi'));await Promise.all([renderPlayers($('playerSearchInput').value.trim()),loadSocialSummary(),loadCommunityFeed()])})};
 $('playerSearchBtn').onclick=()=>renderPlayers($('playerSearchInput').value.trim());$('playerSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();renderPlayers(e.target.value.trim())}});
 async function loadSocialSummary(){const {data,error}=await db.rpc('nexora_my_social_summary');if(error)return;if($('socialSummaryPill'))$('socialSummaryPill').textContent=`${data?.followers||0} FOLLOWER • ${data?.following||0} FOLLOWING`}
 async function loadCommunityFeed(){
  const box=$('communityFeedList');
  const {data,error}=await db.rpc('nexora_community_feed',{p_limit:30});
  if(error){box.textContent='Hãy chạy SQL v2.4 để bật Social Feed.';return}
  const icons={rank_up:'🏆',season_points:'⚡',follow:'👥',clan_create:'🛡️',clan_join:'🛡️',clan_leave:'🚪',tournament_join:'🎮'};
  const rows=data||[];
  const eng=await Promise.all(rows.map(async a=>{const r=await db.rpc('nexora_feed_engagement',{p_activity_id:a.id});return r.error?{}:(r.data||{})}));
  box.innerHTML=rows.map((a,i)=>{const e=eng[i]||{},comments=Array.isArray(e.comments)?e.comments:[];return `<article class="community-activity"><span class="community-activity-icon">${icons[a.activity_type]||'🔥'}</span><div class="feed-main"><a href="profile.html?p=${encodeURIComponent(a.public_code)}">${esc(a.display_name||'Game thủ')}</a><b>${esc(a.title||'Hoạt động mới')}</b><small>${esc(a.detail||'')} ${a.detail?'• ':''}${communityTime(a.created_at)}</small><div class="feed-actions"><button class="feed-action react-feed ${e.my_reaction==='fire'?'active':''}" data-id="${a.id}" data-r="fire">🔥 ${Number(e.reactions||0)}</button><button class="feed-action react-feed ${e.my_reaction==='gg'?'active':''}" data-id="${a.id}" data-r="gg">GG</button><button class="feed-action react-feed ${e.my_reaction==='heart'?'active':''}" data-id="${a.id}" data-r="heart">❤️</button></div><div class="feed-comments">${comments.slice(-3).map(c=>`<div class="feed-comment"><b>${esc(c.display_name||'Game thủ')}:</b> ${esc(c.body)}</div>`).join('')}<form class="feed-comment-form" data-id="${a.id}"><input maxlength="240" placeholder="Viết bình luận..."><button class="ghost small">Gửi</button></form></div></div>${a.following?'<span class="feed-following">FOLLOWING</span>':''}</article>`}).join('')||'<div class="empty-state">Chưa có hoạt động cộng đồng. Hãy bắt đầu Follow, tham gia Clan hoặc hoàn thành Challenge.</div>';
  box.querySelectorAll('.react-feed').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await db.rpc('nexora_toggle_reaction',{p_activity_id:b.dataset.id,p_reaction:b.dataset.r});if(r.error)msg('dashMsg',r.error.message,true);await loadCommunityFeed()});
  box.querySelectorAll('.feed-comment-form').forEach(f=>f.onsubmit=async ev=>{ev.preventDefault();const input=f.querySelector('input'),body=input.value.trim();if(!body)return;const btn=f.querySelector('button');btn.disabled=true;const r=await db.rpc('nexora_add_comment',{p_activity_id:f.dataset.id,p_body:body});if(r.error){btn.disabled=false;return msg('dashMsg',r.error.message,true)}input.value='';await Promise.all([loadCommunityFeed(),loadNotifications(),loadCommunityMissions()])});
 }
 async function loadClan(){const box=$('myClanBox'),form=$('createClanForm');const {data,error}=await db.rpc('nexora_my_clan');if(error){box.textContent='Hãy chạy SQL v2.3 để bật Clan.';return}if(!data?.in_clan){$('myClanPill').textContent='CHƯA CÓ CLAN';box.innerHTML='<div class="empty-state">Bạn chưa gia nhập Clan nào. Tạo Clan mới hoặc chọn một Clan phía dưới.</div>';form.classList.remove('hidden');return}form.classList.add('hidden');$('myClanPill').textContent=`[${esc(data.tag)}] ${esc(data.name)}`;box.innerHTML=`<div class="clan-hero"><div><span class="clan-tag">[${esc(data.tag)}]</span><h3>${esc(data.name)}</h3><p>${esc(data.description||'Clan Nexora')}</p></div><button id="leaveClanBtn" class="ghost">${data.my_role==='owner'?'Giải tán / Rời':'Rời Clan'}</button></div><div class="clan-members">${(data.members||[]).map(m=>`<a href="profile.html?p=${encodeURIComponent(m.public_code)}"><b>${m.role==='owner'?'👑 ':''}${esc(m.display_name)}</b><small>${m.role==='owner'?'CHỦ CLAN':'THÀNH VIÊN'}</small></a>`).join('')}</div>`;if($('leaveClanBtn'))$('leaveClanBtn').onclick=async()=>{if(!confirm('Bạn chắc chắn muốn rời Clan?'))return;const r=await db.rpc('nexora_leave_clan');msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);await Promise.all([loadClan(),loadClanDirectory(),loadCommunityFeed()])}}
 async function loadClanDirectory(q=''){const box=$('clanDirectory');const {data,error}=await db.rpc('nexora_clan_directory',{p_query:q});if(error){box.textContent='Không tải được Clan.';return}box.innerHTML=(data||[]).map(c=>`<article class="clan-directory-item"><div><b>[${esc(c.tag)}] ${esc(c.name)}</b><small>${Number(c.members||0)}/30 thành viên • ${esc(c.description||'Clan Nexora')}</small></div>${c.is_member?'<span class="pill">CLAN CỦA BẠN</span>':`<button class="ghost join-clan" data-id="${c.id}">Gia nhập</button>`}</article>`).join('')||'<div class="empty-state">Chưa có Clan phù hợp.</div>';box.querySelectorAll('.join-clan').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await db.rpc('nexora_join_clan',{p_clan_id:b.dataset.id});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);await Promise.all([loadClan(),loadClanDirectory(q),loadCommunityFeed()])})}
 $('createClanForm').onsubmit=async e=>{e.preventDefault();const r=await db.rpc('nexora_create_clan',{p_name:$('clanName').value.trim(),p_tag:$('clanTag').value.trim(),p_description:$('clanDescription').value.trim()});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);if(r.data?.ok)e.target.reset();await Promise.all([loadClan(),loadClanDirectory(),loadCommunityFeed()])};$('clanSearchBtn').onclick=()=>loadClanDirectory($('clanSearchInput').value.trim());
 async function loadTournaments(){const box=$('tournamentList');const {data,error}=await db.rpc('nexora_tournaments_list');if(error){box.textContent='Hãy chạy SQL v2.3 để bật Tournament.';return}box.innerHTML=(data||[]).map(t=>{const full=Number(t.registered)>=Number(t.max_players),closed=new Date(t.registration_ends_at).getTime()<Date.now(),can=t.status==='published'&&!full&&!closed&&!t.joined;return `<article class="tournament-card ${esc(t.status)}"><div class="tournament-top"><span class="pill">${String(t.status).toUpperCase()}</span><span>${Number(t.registered)}/${Number(t.max_players)} người</span></div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p>${t.reward_text?`<div class="tournament-reward">🎁 ${esc(t.reward_text)}</div>`:''}<small>Đăng ký đến ${communityTime(t.registration_ends_at)} • Bắt đầu ${communityTime(t.starts_at)}</small>${t.result_text?`<div class="tournament-result">🏅 ${esc(t.result_text)}</div>`:''}<button class="${t.joined?'ghost':'btn'} join-tournament" data-id="${t.id}" ${can?'':'disabled'}>${t.joined?'✓ Đã đăng ký':full?'Đã đủ người':closed?'Hết hạn':t.status==='published'?'Đăng ký miễn phí':'Đang thi đấu'}</button></article>`}).join('')||'<div class="empty-state">Chưa có giải đấu được công bố.</div>';box.querySelectorAll('.join-tournament').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_join_tournament',{p_tournament_id:b.dataset.id});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);await Promise.all([loadTournaments(),loadCommunityFeed()])})}
 $('refreshCommunityFeed').onclick=loadCommunityFeed;$('refreshTournaments').onclick=loadTournaments;
 await Promise.all([renderPlayers(''),loadSocialSummary(),loadCommunityFeed(),loadClan(),loadClanDirectory(),loadTournaments()]);
}
async function publicSocial(){
 if(!$('publicFollowers'))return;const code=new URLSearchParams(location.search).get('p');if(!code)return;
 const render=async()=>{const {data,error}=await db.rpc('nexora_public_social_stats',{p_public_code:code});if(error||!data?.ok)return;$('publicFollowers').textContent=data.followers||0;$('publicFollowing').textContent=data.following||0;$('publicClan').textContent=data.clan?`[${data.clan.tag}] ${data.clan.name}`:'—';const b=$('publicFollowBtn');if(!data.is_me){const s=await session();if(s){b.classList.remove('hidden');b.textContent=data.viewer_following?'✓ Đang theo dõi':'+ Theo dõi';b.className=data.viewer_following?'ghost':'btn';b.onclick=async()=>{b.disabled=true;const r=await db.rpc('nexora_toggle_follow',{p_public_code:code});b.disabled=false;if(r.error)return alert(r.error.message);await render()}}}};await render();
}
async function adminTournament(){
 if(!$('tournamentAdminForm'))return;const user=await requireUser();if(!user)return;
 async function load(){const box=$('adminTournamentList');const {data,error}=await db.rpc('nexora_admin_tournaments');if(error){box.textContent='Hãy chạy SQL v2.3 để bật Tournament Admin.';return}box.innerHTML=(data||[]).map(t=>`<article class="admin-tournament"><div><b>${esc(t.title)}</b><small>${String(t.status).toUpperCase()} • ${Number(t.registered)}/${Number(t.max_players)} • ${communityTime(t.starts_at)}</small><p>${esc(t.description)}</p>${t.result_text?`<p>🏅 ${esc(t.result_text)}</p>`:''}</div><div class="admin-tournament-actions"><button class="ghost tournament-status" data-id="${t.id}" data-status="published">Công bố</button><button class="ghost tournament-status" data-id="${t.id}" data-status="live">Bắt đầu</button><button class="ghost tournament-complete" data-id="${t.id}">Kết thúc</button><button class="ghost tournament-status" data-id="${t.id}" data-status="cancelled">Hủy</button></div></article>`).join('')||'<div class="empty-state">Chưa có giải đấu.</div>';box.querySelectorAll('.tournament-status').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_admin_set_tournament',{p_tournament_id:b.dataset.id,p_status:b.dataset.status,p_result_text:null});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);load()});box.querySelectorAll('.tournament-complete').forEach(b=>b.onclick=async()=>{const result=prompt('Kết quả / người chiến thắng (có thể để trống):')||'';const r=await db.rpc('nexora_admin_set_tournament',{p_tournament_id:b.dataset.id,p_status:'completed',p_result_text:result});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);load()})}
 $('tournamentAdminForm').onsubmit=async e=>{e.preventDefault();const start=$('tournamentStart').value,reg=$('tournamentRegEnd').value;if(!start||!reg)return;const r=await db.rpc('nexora_admin_create_tournament',{p_title:$('tournamentTitle').value.trim(),p_description:$('tournamentDescription').value.trim(),p_reward_text:$('tournamentReward').value.trim(),p_starts_at:new Date(start).toISOString(),p_registration_ends_at:new Date(reg).toISOString(),p_max_players:+$('tournamentMax').value});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);if(r.data?.ok)e.target.reset();load()};$('refreshAdminTournaments').onclick=load;await load();
}


// =========================================================
// Nexora v2.4 — Social & Competitive Expansion
// =========================================================
async function loadCommunityFeed(){
 const box=$('communityFeedList'); if(!box)return;
 const {data,error}=await db.rpc('nexora_community_feed',{p_limit:30});
 if(error){box.textContent='Hãy chạy SQL v2.4 để bật Social Feed.';return}
 const icons={rank_up:'🏆',season_points:'⚡',follow:'👥',clan_create:'🛡️',clan_join:'🛡️',clan_leave:'🚪',tournament_join:'🎮'};
 const rows=data||[]; const eng=await Promise.all(rows.map(a=>db.rpc('nexora_feed_engagement',{p_activity_id:a.id}).then(r=>r.data||{}).catch(()=>({}))));
 box.innerHTML=rows.map((a,i)=>{const e=eng[i]||{},comments=e.comments||[];return `<article class="community-activity"><span class="community-activity-icon">${icons[a.activity_type]||'🔥'}</span><div class="feed-main"><a href="profile.html?p=${encodeURIComponent(a.public_code)}">${esc(a.display_name||'Game thủ')}</a><b>${esc(a.title||'Hoạt động mới')}</b><small>${esc(a.detail||'')} ${a.detail?'• ':''}${communityTime(a.created_at)}</small><div class="feed-actions"><button class="feed-action react-feed" data-id="${a.id}" data-r="fire">🔥 ${Number(e.reactions||0)}</button><button class="feed-action react-feed" data-id="${a.id}" data-r="gg">GG</button><button class="feed-action react-feed" data-id="${a.id}" data-r="heart">❤️</button></div><div class="feed-comments">${comments.slice(-3).map(c=>`<div class="feed-comment"><b>${esc(c.display_name||'Game thủ')}:</b> ${esc(c.body)}</div>`).join('')}<form class="feed-comment-form" data-id="${a.id}"><input maxlength="240" placeholder="Viết bình luận..."><button class="ghost small">Gửi</button></form></div></div>${a.following?'<span class="feed-following">FOLLOWING</span>':''}</article>`}).join('')||'<div class="empty-state">Chưa có hoạt động cộng đồng.</div>';
 box.querySelectorAll('.react-feed').forEach(b=>b.onclick=async()=>{await db.rpc('nexora_toggle_reaction',{p_activity_id:b.dataset.id,p_reaction:b.dataset.r});loadCommunityFeed()});
 box.querySelectorAll('.feed-comment-form').forEach(f=>f.onsubmit=async ev=>{ev.preventDefault();const input=f.querySelector('input'),body=input.value.trim();if(!body)return;const r=await db.rpc('nexora_add_comment',{p_activity_id:f.dataset.id,p_body:body});if(r.error)return msg('dashMsg',r.error.message,true);input.value='';await Promise.all([loadCommunityFeed(),loadNotifications(),loadCommunityMissions()])});
}
async function loadNotifications(){
 const box=$('notificationList');if(!box)return;
 const {data,error}=await db.rpc('nexora_my_notifications',{p_limit:50});
 if(error){box.textContent='Chạy SQL v2.4 để bật Notification Center.';return}
 const hidden=await hiddenHistoryV2687();
 const rows=(data||[]).filter(n=>!isHistoryHiddenV2687(hidden,'notification',String(n.id)));
 box.innerHTML=rows.map(n=>`<div class="notification-item ${n.is_read?'':'unread'}"><div class="notification-copy"><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div><small>${n.actor_name?esc(n.actor_name)+' • ':''}${communityTime(n.created_at)}</small></div><button class="ghost small user-history-delete-v2687" data-history-type="notification" data-history-key="${esc(String(n.id))}" data-history-label="thông báo này" type="button">🗑️</button></div>`).join('')||'<div class="empty-state">Chưa có thông báo đang hiển thị.</div>';
 bindHistoryDeleteV2687(box,loadNotifications);
}

async function loadProofNotificationsV266(){
 const box=$('proofNotificationList'),badge=$('userProofBadge');
 if(!box&&!badge)return;
 const {data,error}=await db.rpc('nexora_my_proof_notifications_v266',{p_limit:30});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.6 để bật thông báo Proof.';return}
 const hidden=await hiddenHistoryV2687(),rows=(data||[]).filter(n=>!isHistoryHiddenV2687(hidden,'proof_notification',String(n.id))), unread=rows.filter(x=>!x.is_read).length;
 userProofUnreadV266=unread;updateUserNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item proof-notif ${n.is_read?'':'unread'}">
   <div class="proof-notif-icon">${n.kind==='proof_approved'?'✅':n.kind==='proof_rejected'?'❌':'🛡️'}</div>
   <div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div><small>${communityTime(n.created_at)}</small>
   <div class="notification-actions">${n.proof_submission_id?`<button class="ghost small proof-notif-open" type="button">Mở lịch sử Proof</button>`:''}<button class="ghost small user-history-delete-v2687" data-history-type="proof_notification" data-history-key="${esc(String(n.id))}" data-history-label="thông báo Proof này" type="button">🗑️ Xóa</button></div></div>
 </div>`).join('')||'<div class="empty-state">Chưa có thông báo Proof.</div>';
 bindHistoryDeleteV2687(box,loadProofNotificationsV266);
 box?.querySelectorAll('.proof-notif-open').forEach(b=>b.onclick=()=>{
   document.querySelector('[data-dashboard-tab="proof"]')?.click();
   setTimeout(()=>document.querySelector('[data-module-tab="proof-center"]')?.click(),60);
 });
}
async function markProofNotificationsReadV266(){
 const {error}=await db.rpc('nexora_mark_proof_notifications_read_v266');
 if(!error)loadProofNotificationsV266();
}
function openUserProofNotificationsV266(){
 // v2.13.1: Dashboard mới dùng Modular Hub và các module cũ bị ẩn bằng
 // legacy-module-hidden, vì vậy nút chuông không thể mở tab Community cũ nữa.
 // Mở trực tiếp Notification Center của User, không ảnh hưởng Web Push.
 const center=document.querySelector('.notification-hub');
 if(!center)return;
 center.classList.remove('legacy-module-hidden','dashboard-category-hidden','dashboard-module-hidden','hidden');
 center.style.removeProperty('display');
 Promise.allSettled([
   typeof loadNotifications==='function'?loadNotifications():Promise.resolve(),
   typeof loadProofNotificationsV266==='function'?loadProofNotificationsV266():Promise.resolve(),
   typeof loadRewardNotificationsV267==='function'?loadRewardNotificationsV267():Promise.resolve(),
   typeof loadSupportNotificationsV2681==='function'?loadSupportNotificationsV2681():Promise.resolve()
 ]).finally(()=>{
   requestAnimationFrame(()=>center.scrollIntoView({behavior:'smooth',block:'start'}));
 });
}

async function loadRewardNotificationsV267(){
 const box=$('rewardNotificationList');
 if(!box&&!$('userProofBadge'))return;
 const {data,error}=await db.rpc('nexora_my_reward_notifications_v267',{p_limit:30});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.7 để bật thông báo Reward.';return}
 const hidden=await hiddenHistoryV2687(),rows=(data||[]).filter(n=>!isHistoryHiddenV2687(hidden,'reward_notification',String(n.id))),unread=rows.filter(x=>!x.is_read).length;
 userRewardUnreadV267=unread;updateUserNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item reward-notif ${n.is_read?'':'unread'}">
 <div class="proof-notif-icon">${n.kind==='reward_fulfilled'?'✅':n.kind==='reward_rejected'?'❌':n.kind==='reward_processing'?'⏳':'🎁'}</div>
 <div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div><small>${communityTime(n.created_at)}</small>
 <div class="notification-actions">${n.redemption_id?`<button class="ghost small reward-notif-open" type="button">Mở lịch sử đổi thưởng</button>`:''}<button class="ghost small user-history-delete-v2687" data-history-type="reward_notification" data-history-key="${esc(String(n.id))}" data-history-label="thông báo đổi thưởng này" type="button">🗑️ Xóa</button></div></div></div>`).join('')||'<div class="empty-state">Chưa có thông báo đổi thưởng.</div>';
 bindHistoryDeleteV2687(box,loadRewardNotificationsV267);
 box?.querySelectorAll('.reward-notif-open').forEach(b=>b.onclick=()=>{
   document.querySelector('[data-dashboard-tab="rewards"]')?.click();
   setTimeout(()=>{document.querySelector('[data-module-tab="reward-center"]')?.click();
   setTimeout(()=>document.querySelector('[data-reward-filter="history"]')?.click(),80)},70);
 });
}
async function markRewardNotificationsReadV267(){
 const {error}=await db.rpc('nexora_mark_reward_notifications_read_v267');
 if(!error)loadRewardNotificationsV267();
}


async function loadSupportNotificationsV2681(){
 const box=$('supportNotificationList');if(!box&&!$('userProofBadge'))return;
 const {data,error}=await db.rpc('nexora_my_support_notifications_v2681',{p_limit:30});
 if(error){if(box)box.textContent='Hãy chạy SQL v2.6.8.1 để bật thông báo Support.';return}
 const hidden=await hiddenHistoryV2687(),rows=(data||[]).filter(n=>!isHistoryHiddenV2687(hidden,'support_notification',String(n.id)));userSupportUnreadV2681=rows.filter(x=>!x.is_read).length;updateUserNotifyBadgeV267();
 if(box)box.innerHTML=rows.map(n=>`<div class="notification-item support-notif ${n.is_read?'':'unread'}"><div class="proof-notif-icon">🛟</div><div><b>${esc(n.title)}</b><div>${esc(n.detail||'')}</div><small>${communityTime(n.created_at)}</small><div class="notification-actions"><button class="ghost small support-notif-open" type="button">Mở Ticket</button><button class="ghost small user-history-delete-v2687" data-history-type="support_notification" data-history-key="${esc(String(n.id))}" data-history-label="thông báo hỗ trợ này" type="button">🗑️ Xóa</button></div></div></div>`).join('')||'<div class="empty-state">Chưa có thông báo hỗ trợ.</div>';
 bindHistoryDeleteV2687(box,loadSupportNotificationsV2681);
 box?.querySelectorAll('.support-notif-open').forEach(b=>b.onclick=()=>{document.querySelector('[data-dashboard-tab="support"]')?.click();setTimeout(()=>document.querySelector('[data-module-tab="my-tickets"]')?.click(),70)});
}
async function markSupportNotificationsReadV2681(){const {error}=await db.rpc('nexora_mark_support_notifications_read_v2681');if(!error)loadSupportNotificationsV2681()}

async function loadCommunityMissions(){
 const box=$('communityMissionList');if(!box)return;
 const period=document.querySelector('.community-mission-period.active')?.dataset.period||'daily';
 const {data,error}=await db.rpc('nexora_my_community_missions_v2689',{p_period:period});
 if(error){box.innerHTML=`<div class="empty-state">Hãy chạy SQL v2.6.8.9.<br><small>${esc(error.message||'')}</small></div>`;return}
 box.innerHTML=(data||[]).map(x=>{const p=Number(x.progress||0),t=Math.max(1,Number(x.target||1)),pct=Math.min(100,Math.round(p/t*100));return `<article class="mission-card rotating-community-mission"><div class="mission-period-tag">${x.period==='weekly'?'📆 HÀNG TUẦN':'📅 HÔM NAY'}</div><b>${esc(x.title)}</b><small>${esc(x.detail)}</small><div class="progress-track"><i style="width:${pct}%"></i></div><footer><span>${p}/${t} • +${x.points} PTS</span><button class="${x.claimed?'ghost':'btn'} claim-community-mission-v2689" data-key="${esc(x.key)}" data-period="${esc(x.period)}" ${x.claimed||p<t?'disabled':''}>${x.claimed?'✓ Đã nhận':'Nhận thưởng'}</button></footer></article>`}).join('')||'<div class="empty-state">Chưa có nhiệm vụ.</div>';
 box.querySelectorAll('.claim-community-mission-v2689').forEach(b=>b.onclick=async()=>{b.disabled=true;const r=await db.rpc('nexora_claim_community_mission_v2689',{p_key:b.dataset.key,p_period:b.dataset.period});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);await Promise.all([loadCommunityMissions(),loadActivity()])});
}
async function loadClanLeaderboard(){const box=$('clanLeaderboardList');if(!box)return;const {data,error}=await db.rpc('nexora_clan_leaderboard',{p_limit:20});if(error){box.textContent='Chạy SQL v2.4 để bật BXH Clan.';return}box.innerHTML=(data||[]).map((c,i)=>`<article class="clan-directory-item"><div><b>#${i+1} [${esc(c.tag)}] ${esc(c.name)}</b><small>Level ${c.level} • ${c.xp} Clan XP • ${c.members}/30 thành viên</small></div></article>`).join('')||'<div class="empty-state">Chưa có Clan.</div>'}
async function loadClan(){const box=$('myClanBox'),form=$('createClanForm');if(!box)return;const {data,error}=await db.rpc('nexora_my_clan');if(error){box.textContent='Không tải được Clan.';return}if(!data?.in_clan){$('myClanPill').textContent='CHƯA CÓ CLAN';box.innerHTML='<div class="empty-state">Bạn chưa gia nhập Clan nào.</div>';form?.classList.remove('hidden');return}form?.classList.add('hidden');const lb=await db.rpc('nexora_clan_leaderboard',{p_limit:50});const c=(lb.data||[]).find(x=>x.id===data.id)||{};$('myClanPill').textContent=`[${esc(data.tag)}] ${esc(data.name)}`;box.innerHTML=`<div class="clan-hero"><div><span class="clan-tag">[${esc(data.tag)}]</span><h3>${esc(data.name)}</h3><p>${esc(data.description||'Clan Nexora')}</p></div><button id="leaveClanBtn" class="ghost">${data.my_role==='owner'?'Giải tán Clan':'Rời Clan'}</button></div><div class="clan-level-box"><div><small>CLAN LEVEL</small><b>${c.level||1}</b></div><div><small>CLAN XP</small><b>${c.xp||0}</b></div><div><small>THÀNH VIÊN</small><b>${(data.members||[]).length}/30</b></div></div><div class="clan-members">${(data.members||[]).map(m=>`<div><a href="profile.html?p=${encodeURIComponent(m.public_code)}"><b>${m.role==='owner'?'👑 ':m.role==='co_leader'?'⭐ ':''}${esc(m.display_name)}</b></a><small class="clan-role">${m.role==='owner'?'OWNER':m.role==='co_leader'?'CO-LEADER':'MEMBER'}</small>${data.my_role==='owner'&&m.role!=='owner'?` <button class="feed-action clan-role-btn" data-user="${m.user_id||''}" data-role="${m.role==='co_leader'?'member':'co_leader'}">${m.role==='co_leader'?'Hạ Member':'Lên Co-Leader'}</button>`:''}</div>`).join('')}</div>`;$('leaveClanBtn').onclick=async()=>{if(!confirm(data.my_role==='owner'?'Giải tán Clan và đưa toàn bộ thành viên ra ngoài?':'Rời Clan?'))return;const r=await db.rpc('nexora_leave_clan');msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok);await Promise.all([loadClan(),loadClanDirectory(),loadClanLeaderboard()])};box.querySelectorAll('.clan-role-btn').forEach(b=>b.onclick=async()=>{if(!b.dataset.user)return msg('dashMsg','Cần SQL v2.4 cập nhật danh sách thành viên.',true);const r=await db.rpc('nexora_clan_set_role',{p_user_id:b.dataset.user,p_role:b.dataset.role});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error);loadClan()})}
async function loadTournaments(){const box=$('tournamentList');if(!box)return;const {data,error}=await db.rpc('nexora_tournaments_list');if(error){box.textContent='Không tải được Tournament.';return}box.innerHTML=(data||[]).map(t=>{const full=+t.registered>=+t.max_players,closed=new Date(t.registration_ends_at)<new Date(),can=t.status==='published'&&!full&&!closed&&!t.joined;return `<article class="tournament-card ${esc(t.status)}"><div class="tournament-top"><span class="pill">${String(t.status).toUpperCase()}</span><span>${t.registered}/${t.max_players} người</span></div><h3>${esc(t.title)}</h3><p>${esc(t.description)}</p>${t.reward_text?`<div class="tournament-reward">🎁 ${esc(t.reward_text)}</div>`:''}<small>Đăng ký đến ${communityTime(t.registration_ends_at)} • Bắt đầu ${communityTime(t.starts_at)}</small>${t.result_text?`<div class="tournament-result">🏅 ${esc(t.result_text)}</div>`:''}<div class="tournament-extra"><button class="${t.joined?'ghost':'btn'} join-tournament" data-id="${t.id}" ${can?'':'disabled'}>${t.joined?'✓ Đã đăng ký':full?'Đã đủ người':closed?'Hết hạn':'Đăng ký miễn phí'}</button>${t.joined&&['published','live'].includes(t.status)?`<button class="ghost checkin-btn" data-id="${t.id}">✅ Check-in</button>`:''}<button class="feed-action show-participants" data-id="${t.id}">👥 Xem người tham gia</button><div class="participants-box" data-box="${t.id}"></div></div></article>`}).join('')||'<div class="empty-state">Chưa có giải đấu.</div>';box.querySelectorAll('.join-tournament').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_join_tournament',{p_tournament_id:b.dataset.id});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error);loadTournaments()});box.querySelectorAll('.checkin-btn').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_tournament_checkin',{p_tournament_id:b.dataset.id});msg('dashMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error||!r.data?.ok)});box.querySelectorAll('.show-participants').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_tournament_participants',{p_tournament_id:b.dataset.id});const out=box.querySelector(`[data-box="${b.dataset.id}"]`);out.innerHTML=(r.data||[]).map(x=>`<div>${x.placement?`<span class="champion-badge">TOP ${x.placement}</span> `:''}<a href="profile.html?p=${encodeURIComponent(x.public_code)}">${esc(x.display_name)}</a> • ${esc(x.status)}</div>`).join('')||'Chưa có người tham gia.'})}
async function adminTournament(){
 if(!$('tournamentAdminForm'))return;const user=await requireUser();if(!user)return;
 async function participants(tid,host){const r=await db.rpc('nexora_tournament_participants',{p_tournament_id:tid});if(r.error){host.textContent=r.error.message;return}host.innerHTML=(r.data||[]).map(x=>`<div class="admin-proof"><div><b>${x.placement?`TOP ${x.placement} • `:''}${esc(x.display_name)}</b><small>${esc(x.status)}</small></div><div class="admin-tournament-actions"><button class="ghost place-player" data-u="${x.user_id}" data-p="1">Top 1</button><button class="ghost place-player" data-u="${x.user_id}" data-p="2">Top 2</button><button class="ghost place-player" data-u="${x.user_id}" data-p="3">Top 3</button></div></div>`).join('')||'Chưa có người tham gia.';host.querySelectorAll('.place-player').forEach(b=>b.onclick=async()=>{const z=await db.rpc('nexora_admin_tournament_place',{p_tournament_id:tid,p_user_id:b.dataset.u,p_placement:+b.dataset.p});msg('adminMsg',z.error?.message||z.data?.message||'Đã cập nhật',!!z.error);participants(tid,host)})}
 async function load(){const box=$('adminTournamentList');const {data,error}=await db.rpc('nexora_admin_tournaments');if(error){box.textContent='Hãy chạy SQL v2.4.';return}box.innerHTML=(data||[]).map(t=>`<article class="admin-tournament"><div><b>${esc(t.title)}</b><small>${String(t.status).toUpperCase()} • ${Number(t.registered)}/${Number(t.max_players)} • ${communityTime(t.starts_at)}</small><p>${esc(t.description)}</p>${t.result_text?`<p>🏅 ${esc(t.result_text)}</p>`:''}</div><div class="admin-tournament-actions"><button class="ghost tournament-status" data-id="${t.id}" data-status="published">Công bố</button><button class="ghost tournament-status" data-id="${t.id}" data-status="live">Bắt đầu</button><button class="ghost tournament-complete" data-id="${t.id}">Kết thúc</button><button class="ghost tournament-status" data-id="${t.id}" data-status="cancelled">Hủy</button><button class="ghost tournament-players" data-id="${t.id}">👥 Người chơi / Top 3</button></div><div class="admin-player-box" data-box="${t.id}"></div></article>`).join('')||'<div class="empty-state">Chưa có giải đấu.</div>';box.querySelectorAll('.tournament-status').forEach(b=>b.onclick=async()=>{const r=await db.rpc('nexora_admin_set_tournament',{p_tournament_id:b.dataset.id,p_status:b.dataset.status,p_result_text:null});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error);load()});box.querySelectorAll('.tournament-complete').forEach(b=>b.onclick=async()=>{const result=prompt('Kết quả giải đấu:')||'';const r=await db.rpc('nexora_admin_set_tournament',{p_tournament_id:b.dataset.id,p_status:'completed',p_result_text:result});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error);load()});box.querySelectorAll('.tournament-players').forEach(b=>b.onclick=()=>participants(b.dataset.id,box.querySelector(`[data-box="${b.dataset.id}"]`)))}
 $('tournamentAdminForm').onsubmit=async e=>{e.preventDefault();const start=$('tournamentStart').value,reg=$('tournamentRegEnd').value;if(!start||!reg)return;const r=await db.rpc('nexora_admin_create_tournament',{p_title:$('tournamentTitle').value.trim(),p_description:$('tournamentDescription').value.trim(),p_reward_text:$('tournamentReward').value.trim(),p_starts_at:new Date(start).toISOString(),p_registration_ends_at:new Date(reg).toISOString(),p_max_players:+$('tournamentMax').value});msg('adminMsg',r.error?.message||r.data?.message||'Đã xử lý',!!r.error);if(r.data?.ok)e.target.reset();load()};$('refreshAdminTournaments').onclick=load;await load();
}

async function v24Dashboard(){initMissionCenter();if(!$('communityMissionList'))return;await Promise.all([loadNotifications(),loadProofNotificationsV266(),loadRewardNotificationsV267(),loadSupportNotificationsV2681(),loadCommunityMissions(),loadClanLeaderboard()]);$('refreshCommunityMissions').onclick=loadCommunityMissions;document.querySelectorAll('.community-mission-period').forEach(b=>b.onclick=()=>{document.querySelectorAll('.community-mission-period').forEach(x=>x.classList.toggle('active',x===b));loadCommunityMissions()});$('refreshClanLeaderboard').onclick=loadClanLeaderboard;$('markNotificationsRead').onclick=async()=>{await db.rpc('nexora_mark_notifications_read');loadNotifications()};if($('markProofNotificationsRead'))$('markProofNotificationsRead').onclick=markProofNotificationsReadV266;if($('markRewardNotificationsRead'))$('markRewardNotificationsRead').onclick=markRewardNotificationsReadV267;if($('markSupportNotificationsRead'))$('markSupportNotificationsRead').onclick=markSupportNotificationsReadV2681;if($('userProofBell'))$('userProofBell').onclick=openUserProofNotificationsV266;setInterval(()=>{loadProofNotificationsV266();loadRewardNotificationsV267();loadSupportNotificationsV2681()},20000)}
async function v24Public(){if(!$('publicTournamentBadge'))return;const code=new URLSearchParams(location.search).get('p');if(!code)return;const {data}=await db.rpc('nexora_public_competitive_stats',{p_public_code:code});if(!data?.ok)return;$('publicTournamentBadge').textContent=data.tournament_wins?`🏆 Champion ×${data.tournament_wins}`:(data.best_placement?`Top ${data.best_placement}`:'—');$('publicClanLevel').textContent=data.clan_level?`Lv.${data.clan_level}`:'—'}

hydrateRankImages();authPage();dashboard();admin();adminEvents();adminProofs();initAdminProofNotificationsV266();publicProfile();communityDashboard();publicSocial();adminTournament();v24Dashboard();v24Public();
})();

// =========================================================
// Nexora v2.1.1 — Compact Dashboard Categories
// =========================================================
(function initDashboardCategories(){
  const tabs=document.getElementById('dashboardTabs');
  if(!tabs)return;
  const notes={
    overview:'Thông tin tài khoản, Level, XP và hoạt động gần đây.',
    challenges:'Random Challenge, Daily Challenge và các nhiệm vụ hôm nay.',
    ranking:'Rank mùa, huy hiệu và các bảng xếp hạng.',
    rewards:'Điểm danh, mốc Streak, Event và lượt tham gia.',
    proof:'Công cụ Media → URL và trung tâm gửi bằng chứng Challenge.',
    profile:'Player Card, hồ sơ công khai và Share Card.',
    community:'Follow game thủ, Activity Feed, Clan/Squad và Tournament Hub.',
    support:'Gửi báo cáo sự cố, theo dõi Ticket và trao đổi trực tiếp với Admin.'
  };
  const buttons=[...tabs.querySelectorAll('[data-dashboard-tab]')];
  const sections=[...document.querySelectorAll('[data-dash-category]')];
  const note=document.getElementById('dashboardTabNote');
  function showCategory(category,scroll=false){
    buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.dashboardTab===category));
    sections.forEach(sec=>sec.classList.toggle('dashboard-category-hidden',sec.dataset.dashCategory!==category));
    if(note)note.textContent=notes[category]||'';
    try{sessionStorage.setItem('nexora_dashboard_category',category)}catch{}
    if(scroll){
      const first=sections.find(sec=>sec.dataset.dashCategory===category);
      if(first)first.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }
  buttons.forEach(btn=>btn.addEventListener('click',()=>{
    showCategory(btn.dataset.dashboardTab,true);
    if(window.matchMedia('(max-width: 979px)').matches) document.body.classList.remove('sidebar-open');
  }));
  const sidebarToggle=document.getElementById('sidebarToggle');
  const sidebarOverlay=document.getElementById('sidebarOverlay');
  if(sidebarToggle) sidebarToggle.addEventListener('click',()=>document.body.classList.toggle('sidebar-open'));
  if(sidebarOverlay) sidebarOverlay.addEventListener('click',()=>document.body.classList.remove('sidebar-open'));
  window.addEventListener('resize',()=>{if(window.innerWidth>=980)document.body.classList.remove('sidebar-open')});
  let saved='overview';
  try{saved=sessionStorage.getItem('nexora_dashboard_category')||'overview'}catch{}
  if(!notes[saved])saved='overview';
  showCategory(saved,false);
})();


// =========================================================

// =========================================================
// Nexora v2.6.8.8 — Referral System
// =========================================================
async function loadReferralCenterV2688(){
 // v2.6.8.8.2 — Scope Hotfix
 // Referral lives outside the main app IIFE, so it must NOT use the private `$` or `db`.
 const el=id=>document.getElementById(id);
 const client=window.NEXORA_DB;
 const codeEl=el('myReferralCode'),linkEl=el('myReferralLink'),list=el('referralHistoryList');
 if(!codeEl&&!list)return;

 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateText=v=>{try{return new Date(v).toLocaleString('vi-VN')}catch{return '—'}};

 if(!client){
   if(codeEl)codeEl.textContent='Không tải được';
   if(linkEl)linkEl.value='Supabase chưa sẵn sàng';
   if(list)list.innerHTML='<div class="empty-state">Supabase chưa sẵn sàng. Hãy tải lại trang.</div>';
   return;
 }

 // Show deterministic code/link first, independent from RPCs.
 let localCode='';
 try{
   const {data,error}=await client.auth.getUser();
   if(error)throw error;
   const user=data?.user;
   if(user?.id)localCode='NX-'+String(user.id).replace(/-/g,'').slice(0,10).toUpperCase();
 }catch(e){console.warn('Referral auth v26882:',e)}

 if(localCode){
   const inviteUrl=new URL('auth.html',location.href);
   inviteUrl.searchParams.set('ref',localCode);
   if(codeEl)codeEl.textContent=localCode;
   if(linkEl)linkEl.value=inviteUrl.href;
 }

 // Summary is independent from history.
 try{
   const {data:s,error}=await client.rpc('nexora_my_referral_summary_v2688');
   if(error)throw error;
   const code=s?.code||localCode||'—';
   const inviteUrl=new URL('auth.html',location.href);
   inviteUrl.searchParams.set('ref',code);
   if(codeEl)codeEl.textContent=code;
   if(linkEl)linkEl.value=inviteUrl.href;
   if(el('referralTotal'))el('referralTotal').textContent=Number(s?.total_invited||0);
   if(el('referralSuccess'))el('referralSuccess').textContent=Number(s?.total_rewarded||0);
   if(el('referralPoints'))el('referralPoints').textContent=Number(s?.points_earned||0).toLocaleString('vi-VN');
   const monthCount=Number(s?.month_rewarded||0),limit=Number(s?.monthly_limit||10);
   if(el('referralMonth'))el('referralMonth').textContent=`${monthCount}/${limit}`;
   if(el('referralProgressText'))el('referralProgressText').textContent=`${monthCount} / ${limit} referral`;
   if(el('referralProgressBar'))el('referralProgressBar').style.width=`${Math.min(100,limit?monthCount/limit*100:0)}%`;
 }catch(e){
   console.warn('Referral summary v26882:',e);
   if(!localCode&&codeEl)codeEl.textContent='Không tải được';
   if(!localCode&&linkEl)linkEl.value='Không tải được link';
 }

 // History is also independent. No dependency on private v2.6.8.7 helper functions.
 if(list){
   try{
     const {data:rows,error}=await client.rpc('nexora_my_referrals_v2688',{p_limit:100});
     if(error)throw error;

     // Read hidden referral history directly through the public RPC.
     let hiddenKeys=new Set();
     try{
       const {data:hiddenRows,error:hiddenErr}=await client.rpc('nexora_my_hidden_history_v2687');
       if(hiddenErr)throw hiddenErr;
       hiddenKeys=new Set((hiddenRows||[])
         .filter(x=>x.history_type==='referral')
         .map(x=>String(x.history_key)));
     }catch(e){console.warn('Referral hidden v26882:',e)}

     const visible=(rows||[]).filter(r=>!hiddenKeys.has(String(r.referral_id)));
     const statusText=r=>r.status==='rewarded'
       ?'✅ Thành công'
       :r.status==='limit_reached'
         ?'⚠️ Đã xác minh • vượt giới hạn tháng'
         :'⏳ Chờ xác minh';

     list.innerHTML=visible.map(r=>`<article class="referral-history-item">
       <div class="referral-friend"><b>👤 ${safe(r.friend_name||'Game thủ Nexora')}</b><small>Tham gia ${dateText(r.created_at)}</small></div>
       <div class="referral-history-status"><span class="referral-status ${safe(r.status)}">${statusText(r)}</span>${r.status==='rewarded'?`<strong>+${Number(r.inviter_points||100)} PTS</strong>`:''}</div>
       <button class="ghost small referral-delete-v26882" data-referral-id="${safe(String(r.referral_id))}" type="button">🗑️ Xóa</button>
     </article>`).join('')||'<div class="empty-state">Bạn chưa có referral nào đang hiển thị.</div>';

     list.querySelectorAll('.referral-delete-v26882').forEach(btn=>{
       btn.onclick=async()=>{
         if(!confirm('Xóa lịch sử giới thiệu này khỏi phần hiển thị của bạn?'))return;
         btn.disabled=true;
         const {error}=await client.rpc('nexora_hide_history_item_v2687',{
           p_history_type:'referral',
           p_history_key:btn.dataset.referralId
         });
         if(error){btn.disabled=false;alert(error.message||'Không thể xóa lịch sử.');return}
         loadReferralCenterV2688();
       };
     });
   }catch(e){
     console.warn('Referral history v26882:',e);
     list.innerHTML=`<div class="empty-state">Không tải được lịch sử Referral.<br><small>${safe(e?.message||'Lỗi không xác định')}</small></div>`;
   }
 }
}
function initReferralCenterV2688(){
 const el=id=>document.getElementById(id);
 const copy=el('copyReferralLink'),share=el('shareReferralLink'),refresh=el('refreshReferral');
 const flash=t=>{const m=el('dashMsg');if(m){m.textContent=t;m.style.color='#20e6ff'}};
 if(copy)copy.onclick=async()=>{
   const link=el('myReferralLink')?.value||'';if(!link||link.startsWith('Đang'))return;
   try{await navigator.clipboard.writeText(link);flash('Đã sao chép link mời ✓')}catch{prompt('Sao chép link này:',link)}
 };
 if(share)share.onclick=async()=>{
   const link=el('myReferralLink')?.value||'';if(!link||link.startsWith('Đang'))return;
   if(navigator.share){try{await navigator.share({title:'Tham gia Nexora Gaming',text:'Tham gia Nexora cùng mình. Hoàn thành Challenge đầu tiên để nhận +50 PTS!',url:link})}catch{}}
   else{try{await navigator.clipboard.writeText(link);flash('Thiết bị chưa hỗ trợ Chia sẻ. Mình đã sao chép link ✓')}catch{}}
 };
 if(refresh)refresh.onclick=loadReferralCenterV2688;
}
document.addEventListener('DOMContentLoaded',initReferralCenterV2688);


// =========================================================
// Nexora v2.6.9 — Public Site Announcements
// =========================================================
async function loadSiteAnnouncementsV269(){
 // v2.6.9.1 — Announcement Scope Hotfix
 // This block is outside the main IIFE, so use public globals instead of private `$`, `db`, `esc`, `fmtDate`.
 const el=id=>document.getElementById(id);
 const box=el('siteAnnouncementList');
 if(!box)return;

 const client=window.NEXORA_DB;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dateText=v=>{try{return new Date(v).toLocaleString('vi-VN')}catch{return '—'}};

 if(!client){
   box.innerHTML='<div class="empty-state">Supabase chưa sẵn sàng. Hãy tải lại trang.</div>';
   return;
 }

 try{
   const {data,error}=await client.rpc('nexora_public_announcements_v269',{p_limit:5});
   if(error)throw error;

   const icon=t=>({update:'🆕',event:'🎟️',tournament:'🏆',system:'⚙️'}[t]||'📢');
   const label=t=>({update:'CẬP NHẬT',event:'EVENT',tournament:'GIẢI ĐẤU',system:'HỆ THỐNG'}[t]||'THÔNG BÁO');

   box.innerHTML=(data||[]).map(x=>`<article class="site-announcement-card type-${safe(x.type)} ${x.is_pinned?'is-pinned':''}">
     <div class="site-announcement-icon">${icon(x.type)}</div>
     <div class="site-announcement-body">
       <div class="site-announcement-meta"><span>${label(x.type)}</span>${x.is_pinned?'<b>📌 GHIM</b>':''}${x.is_new?'<em>MỚI</em>':''}<time>${dateText(x.published_at||x.created_at)}</time></div>
       <h3>${safe(x.title)}</h3>
       <p>${safe(x.content)}</p>
       ${x.link_url?`<a class="ghost small site-announcement-link" href="${safe(x.link_url)}">Mở thông báo →</a>`:''}
     </div>
   </article>`).join('')||'<div class="empty-state">Hiện chưa có thông báo mới từ Nexora.</div>';
 }catch(e){
   console.warn('Site announcements v2691:',e);
   box.innerHTML=`<div class="empty-state">Không tải được thông báo.<br><small>${safe(e?.message||'Lỗi không xác định')}</small></div>`;
 }
}

function initSiteAnnouncementsV269(){
 const b=document.getElementById('refreshSiteAnnouncements');
 if(b)b.onclick=loadSiteAnnouncementsV269;
}
document.addEventListener('DOMContentLoaded',initSiteAnnouncementsV269);

// Nexora v2.4.2 — Compact Module Navigation
// One module at a time inside each main Dashboard category.
// =========================================================
(function initCompactModuleNavigation(){
  const configs={
    overview:[['profile','👤 Hồ sơ nhanh','.profile-panel'],['xp','⚡ Level & XP','.xp-system'],['activity','🕘 Gần đây','#activityList']],
    challenges:[['random','🎲 Random','.advanced-challenge'],['daily','🔥 Daily','#dailyList'],['mission-center','⚡ Mission Center','#missionCenterList']],
    ranking:[['season','🏆 Rank mùa','.season-system'],['achievements','🏅 Huy hiệu','#achievementList'],['board','📊 BXH','#leaderboard']],
    rewards:[['daily-reward','🎁 Điểm danh','.reward-hub'],['reward-center','🛍️ Đổi thưởng','#rewardShopList'],['reward-history','🧾 Lịch sử đổi','#myRedemptionList'],['events','🎟️ Event','#eventList'],['entries','🎫 Lượt của tôi','#myEntries']],
    proof:[['media','🔗 Media → URL','#mediaUrlTool'],['proof-center','🛡️ Proof Center','#proofList']],
    profile:[['id-card','🪪 ID Card','#playerCard'],['public-profile','🌐 Public Profile','.public-profile-hub']],
    community:[['feed','🔥 Hoạt động','#communityFeedList'],['players','👥 Người chơi','#playerSearchResults'],['missions','⚡ Nhiệm vụ','#communityMissionList'],['referral','🤝 Mời bạn','#referralCenter'],['notifications','🔔 Thông báo','#notificationList'],['clan','🛡️ Clan','#myClanBox'],['clan-board','🏆 BXH Clan','#clanLeaderboardList'],['tournaments','🎮 Giải đấu','#tournamentList']],
    support:[['new-ticket','📨 Báo cáo sự cố','#supportTicketForm'],['my-tickets','🎫 Ticket của tôi','#supportTicketList']]
  };
  const sectionFor=(selector)=>{
    const el=document.querySelector(selector);
    return el?.closest('[data-dash-category]')||null;
  };
  Object.entries(configs).forEach(([category,items])=>items.forEach(([key,label,selector])=>{
    const sec=sectionFor(selector); if(sec) sec.dataset.dashModule=key;
  }));

  const bar=document.createElement('div');
  bar.id='dashboardModuleNav'; bar.className='dashboard-module-nav hidden';
  const navPanel=document.querySelector('.dashboard-nav-panel');
  if(navPanel) navPanel.insertAdjacentElement('afterend',bar);

  let activeCategory='overview';
  const getSaved=(cat)=>{try{return sessionStorage.getItem('nexora_module_'+cat)||''}catch{return ''}};
  const save=(cat,key)=>{try{sessionStorage.setItem('nexora_module_'+cat,key)}catch{}};
  function showModule(category,key,scroll=false){
    const available=(configs[category]||[]).filter(x=>sectionFor(x[2]));
    if(!available.length){bar.classList.add('hidden');return}
    if(!available.some(x=>x[0]===key)) key=available[0][0];
    document.querySelectorAll(`[data-dash-category="${category}"]`).forEach(sec=>{
      const module=sec.dataset.dashModule;
      sec.classList.toggle('dashboard-module-hidden',!!module && module!==key);
    });
    bar.querySelectorAll('[data-module-tab]').forEach(b=>b.classList.toggle('active',b.dataset.moduleTab===key));
    save(category,key);
    if(scroll){const target=document.querySelector(`[data-dash-category="${category}"][data-dash-module="${key}"]`);target?.scrollIntoView({behavior:'smooth',block:'start'});}
  }
  function render(category){
    activeCategory=category;
    const available=(configs[category]||[]).filter(x=>sectionFor(x[2]));
    if(!available.length){bar.classList.add('hidden');return}
    bar.classList.remove('hidden');
    bar.innerHTML=`<div class="module-nav-label">${category==='community'?'COMMUNITY HUB':'MODULES'} • v2.4.4</div><div class="module-tabs">${available.map(([key,label])=>`<button type="button" class="module-tab" data-module-tab="${key}">${label}</button>`).join('')}</div>`;
    bar.querySelectorAll('[data-module-tab]').forEach(b=>b.onclick=()=>showModule(category,b.dataset.moduleTab,true));
    showModule(category,getSaved(category)||available[0][0],false);
  }
  document.querySelectorAll('[data-dashboard-tab]').forEach(btn=>btn.addEventListener('click',()=>setTimeout(()=>render(btn.dataset.dashboardTab),0)));
  let initial='overview';try{initial=sessionStorage.getItem('nexora_dashboard_category')||'overview'}catch{}
  setTimeout(()=>render(initial),0);
})();

// Nexora v2.5 — Advanced Admin System
(function(){
 const $v=id=>document.getElementById(id), escv=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const getDb=()=>window.NEXORA_DB;
 const call=async(name,args={})=>{
  const client=getDb();
  if(!client)throw new Error('Supabase chưa sẵn sàng. Hãy tải lại trang.');
  const r=await client.rpc(name,args);
  if(r.error)throw r.error;
  return r.data;
 };
 const toast=(t,bad=false)=>{
  const e=$v('adminMsg');
  if(e){e.textContent=t;e.style.color=bad?'#ff6b7a':'#20e6ff';}
  else alert(t);
 };
 async function users(q=''){
  const box=$v('adminUserList');if(!box)return;
  try{const rows=await call('nexora_admin_users',{p_search:q,p_limit:50});box.innerHTML=(rows||[]).map(u=>`<article class="admin-v25-card"><b>${escv(u.display_name||'Game thủ')}</b> <small>${escv(u.email||'')}</small><div class="admin-v25-meta"><span>PTS ${u.points}</span><span>XP ${u.xp}</span><span>SP ${u.season_points}</span><span>${escv(u.game_rank||'—')}</span><span>${u.banned_until?'🔒 ĐANG KHÓA':'🟢 HOẠT ĐỘNG'}</span></div><div class="admin-v25-actions"><button class="ghost v25-adjust" data-id="${u.user_id}" data-name="${escv(u.display_name||'user')}">± PTS/XP/SP</button><button class="ghost ${u.banned_until?'':'admin-danger'} v25-ban" data-id="${u.user_id}" data-ban="${u.banned_until?'0':'1'}">${u.banned_until?'Mở khóa':'Khóa tài khoản'}</button></div></article>`).join('')||'<div class="empty-state">Không tìm thấy người dùng.</div>';}
  catch(e){box.textContent='Hãy chạy SQL v2.5. '+e.message;}
 }
 async function clans(){const box=$v('adminClanList');if(!box)return;try{const rows=await call('nexora_admin_clans',{p_limit:50});box.innerHTML=(rows||[]).map(c=>`<div class="admin-v25-card"><b>[${escv(c.tag)}] ${escv(c.name)}</b><div class="admin-v25-meta"><span>Owner: ${escv(c.owner_name||'—')}</span><span>${c.members} thành viên</span><span>${c.xp} XP</span></div><div class="admin-v25-actions"><button class="ghost admin-danger v25-del-clan" data-id="${c.id}" data-name="${escv(c.name)}">Xóa Clan</button></div></div>`).join('')||'Chưa có Clan.'}catch(e){box.textContent='Hãy chạy SQL v2.5. '+e.message}}
 async function community(){const box=$v('adminCommunityList');if(!box)return;try{const rows=await call('nexora_admin_community',{p_limit:50});box.innerHTML=(rows||[]).map(x=>`<div class="admin-v25-card"><b>${x.item_type==='comment'?'💬 Comment':'🔥 Activity'} • ${escv(x.display_name)}</b><p>${escv(x.body)}</p><div class="admin-v25-actions"><button class="ghost admin-danger v25-del-content" data-id="${x.id}" data-type="${x.item_type}">Xóa nội dung</button></div></div>`).join('')||'Chưa có nội dung.'}catch(e){box.textContent='Hãy chạy SQL v2.5. '+e.message}}
 async function audit(){const box=$v('adminAuditList');if(!box)return;try{const rows=await call('nexora_admin_audit',{p_limit:100});box.innerHTML=(rows||[]).map(x=>`<div class="admin-v25-card"><b>${escv(x.action)}</b> • ${escv(x.admin_name||'Admin')}<div class="admin-v25-meta"><span>${escv(x.target_type)}</span><span>${new Date(x.created_at).toLocaleString('vi-VN')}</span></div><div class="admin-audit-detail">${escv(JSON.stringify(x.detail||{}))}</div></div>`).join('')||'Chưa có thao tác Admin.'}catch(e){box.textContent='Hãy chạy SQL v2.5. '+e.message}}
 async function init(){if(!$v('adminUserList'))return;await Promise.all([users(),clans(),community(),audit()]);$v('adminUserSearchBtn').onclick=()=>users($v('adminUserSearch').value.trim());$v('adminUserSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();users(e.target.value.trim())}};$v('refreshAdminUsers').onclick=()=>users($v('adminUserSearch').value.trim());$v('refreshAdminCommunity').onclick=()=>Promise.all([clans(),community()]);$v('refreshAdminAudit').onclick=audit;
  document.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;try{
   if(b.classList.contains('v25-adjust')){const pts=+(prompt(`Điều chỉnh PTS cho ${b.dataset.name} (có thể âm):`,'0')||0),xp=+(prompt('Điều chỉnh XP (có thể âm):','0')||0),sp=+(prompt('Điều chỉnh SP mùa (có thể âm):','0')||0);if(!pts&&!xp&&!sp)return;const reason=prompt('Lý do điều chỉnh:','Admin adjustment')||'Admin adjustment';const r=await call('nexora_admin_adjust_user',{p_user_id:b.dataset.id,p_points:pts,p_xp:xp,p_sp:sp,p_reason:reason});toast(r.message);await users($v('adminUserSearch').value.trim());await audit();}
   if(b.classList.contains('v25-ban')){const ban=b.dataset.ban==='1';if(!confirm(`${ban?'Khóa':'Mở khóa'} tài khoản này?`))return;const r=await call('nexora_admin_set_user_ban',{p_user_id:b.dataset.id,p_banned:ban});toast(r.message);await users($v('adminUserSearch').value.trim());await audit();}
   if(b.classList.contains('v25-del-clan')){if(!confirm(`Xóa Clan ${b.dataset.name}? Thành viên sẽ bị đưa ra khỏi Clan.`))return;const reason=prompt('Lý do xóa Clan:','Vi phạm quy định')||'';const r=await call('nexora_admin_delete_clan',{p_clan_id:b.dataset.id,p_reason:reason});toast(r.message);await clans();await audit();}
   if(b.classList.contains('v25-del-content')){if(!confirm('Xóa nội dung này?'))return;const reason=prompt('Lý do xóa:','Vi phạm quy định')||'';const r=await call('nexora_admin_delete_community',{p_item_type:b.dataset.type,p_id:b.dataset.id,p_reason:reason});toast(r.message);await community();await audit();}
   if(b.classList.contains('v25-delete-object')){const kind=b.dataset.kind,id=b.dataset.id;if(!confirm(`Xóa ${kind} này?`))return;const fn={challenge:'nexora_admin_delete_challenge',event:'nexora_admin_delete_event',tournament:'nexora_admin_delete_tournament'}[kind];const r=await call(fn,{p_id:id});toast(r.message);location.reload();}
  }catch(err){toast(err.message||'Có lỗi xảy ra',true)}});
  // Add delete controls to existing Admin cards without replacing the proven v2.4 logic.
  const enhance=()=>{
   document.querySelectorAll('#adminChallengeList .admin-item').forEach(x=>{if(x.querySelector('.v25-delete-object'))return;const t=x.querySelector('.toggle');if(t){const b=document.createElement('button');b.className='ghost admin-danger v25-delete-object';b.dataset.kind='challenge';b.dataset.id=t.dataset.id;b.textContent='Xóa';x.appendChild(b)}});
   document.querySelectorAll('#adminEventList .admin-event').forEach(x=>{if(x.querySelector('.v25-delete-object'))return;const t=x.querySelector('.ev-toggle');if(t){const b=document.createElement('button');b.className='ghost admin-danger v25-delete-object';b.dataset.kind='event';b.dataset.id=t.dataset.id;b.textContent='Xóa Event';x.querySelector('.admin-event-actions')?.appendChild(b)}});
   document.querySelectorAll('#adminTournamentList .admin-tournament').forEach(x=>{if(x.querySelector('.v25-delete-object'))return;const t=x.querySelector('.tournament-status');if(t){const b=document.createElement('button');b.className='ghost admin-danger v25-delete-object';b.dataset.kind='tournament';b.dataset.id=t.dataset.id;b.textContent='Xóa giải';x.querySelector('.admin-tournament-actions')?.appendChild(b)}});
  };new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true});enhance();
 }
 document.addEventListener('DOMContentLoaded',init);
})();



// =========================================================
// Nexora v2.6.2 — Reward Center Denomination UI
// PTS -> Diamond / Game Card / Cash, with step-by-step selection.
// =========================================================
(function initRewardCenterV262(){
 const $r=id=>document.getElementById(id);
 const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
 const db=()=>window.NEXORA_DB;
 const call=async(name,args={})=>{const c=db();if(!c)throw new Error('Supabase chưa sẵn sàng');const {data,error}=await c.rpc(name,args);if(error)throw error;return data};
 const statusText=s=>({pending:'⏳ Chờ duyệt',processing:'🛠️ Đang xử lý',fulfilled:'✅ Đã trao',rejected:'↩️ Từ chối / hoàn PTS'}[s]||s);
 const typeText=t=>({diamond:'💎 Kim cương',game_card:'🎮 Thẻ game',cash:'💵 Rút tiền'}[t]||t);
 const typeHeading=t=>({diamond:'Chọn gói kim cương',game_card:'Chọn mệnh giá thẻ game',cash:'Chọn số tiền muốn rút'}[t]||'Chọn mệnh giá');
 const typeHint=t=>({diamond:'Chọn số kim cương bạn muốn nhận.',game_card:'Chọn mệnh giá thẻ game bạn muốn đổi.',cash:'Chọn mức tiền mặt muốn nhận qua ngân hàng.'}[t]||'Chọn gói bạn muốn đổi bằng Nexora PTS.');
 const notify=(text,bad=false)=>{const e=$r('dashMsg')||$r('adminMsg');if(e){e.textContent=text;e.style.color=bad?'#ff6b7a':'#20e6ff'}else alert(text)};

 // v2.12.4: Reward Center chạy trong IIFE riêng, nên cần helper lịch sử riêng trong scope này.
 let rewardHiddenHistoryV2687=null;
 async function hiddenHistoryV2687(force=false){
  if(rewardHiddenHistoryV2687&&!force)return rewardHiddenHistoryV2687;
  try{
   const rows=await call('nexora_my_hidden_history_v2687');
   rewardHiddenHistoryV2687=new Set((rows||[]).map(x=>`${x.history_type}|${x.history_key}`));
   return rewardHiddenHistoryV2687;
  }catch(e){console.warn('Reward hidden history:',e);return new Set()}
 }
 function isHistoryHiddenV2687(set,type,key){return set.has(`${type}|${key}`)}
 async function hideRewardHistoryItemV2687(type,key,label,reload){
  if(!confirm(`Xóa ${label||'mục này'} khỏi lịch sử của bạn?\n\nThao tác này chỉ ẩn mục khỏi tài khoản của bạn. Dữ liệu hệ thống vẫn được giữ an toàn.`))return;
  try{
   const out=await call('nexora_hide_history_item_v2687',{p_history_type:type,p_history_key:key});
   rewardHiddenHistoryV2687=null;
   if(typeof reload==='function')await reload();
   notify(out?.message||'Đã xóa khỏi lịch sử ✓');
  }catch(e){notify(e.message||'Không thể xóa khỏi lịch sử.',true)}
 }
 function bindHistoryDeleteV2687(container,reload){
  if(!container)return;
  container.querySelectorAll('.user-history-delete-v2687').forEach(b=>b.onclick=()=>hideRewardHistoryItemV2687(
   b.dataset.historyType,b.dataset.historyKey,b.dataset.historyLabel||'mục này',reload
  ));
 }

 let rewards=[];
 let activeRewardFilter='diamond';
 let selectedReward=null;

 function rewardIcon(t){return t==='diamond'?'💎':t==='game_card'?'🎮':'💵'}

 async function loadShop(){
  const box=$r('rewardShopList'); if(!box)return;
  try{
   rewards=await call('nexora_reward_catalog_v2');
   const c=db(); const {data:{session}}=await c.auth.getSession();
   if(session){
    const {data:p}=await c.from('nexora_profiles').select('points').eq('user_id',session.user.id).single();
    if($r('rewardCurrentPoints'))$r('rewardCurrentPoints').textContent=p?.points??0;
   }
   renderRewardPackages();
  }catch(e){box.textContent='Hãy chạy SQL v2.6.2. '+e.message}
 }

 function renderRewardPackages(){
  const box=$r('rewardShopList'); if(!box)return;
  const list=rewards.filter(x=>x.reward_type===activeRewardFilter);
  $r('rewardPackageHeading') && ($r('rewardPackageHeading').textContent=typeHeading(activeRewardFilter));
  $r('rewardPackageHint') && ($r('rewardPackageHint').textContent=typeHint(activeRewardFilter));
  box.innerHTML=list.map(x=>`
    <button class="reward-denomination-card" type="button" data-id="${x.id}">
      <span class="reward-denomination-value">${esc(x.display_value||x.title)}</span>
      <span class="reward-denomination-cost"><b>${Number(x.points_cost).toLocaleString('vi-VN')} PTS</b></span>
      <span class="reward-denomination-stock">${x.stock===-1?'Còn quà':x.stock>0?`Còn ${x.stock}`:'Hết quà'}</span>
    </button>
  `).join('')||'<div class="empty-state">Hiện chưa có gói phù hợp.</div>';
  document.querySelectorAll('.reward-denomination-card').forEach(b=>b.onclick=()=>selectReward(b.dataset.id));
 }

 function selectReward(id){
  selectedReward=rewards.find(x=>x.id===id);
  if(!selectedReward)return;
  document.querySelectorAll('.reward-denomination-card').forEach(b=>b.classList.toggle('selected',b.dataset.id===id));
  const summary=$r('rewardSelectedSummary');
  if(summary)summary.innerHTML=`<div><small>${typeText(selectedReward.reward_type)}</small><strong>${esc(selectedReward.display_value||selectedReward.title)}</strong><span>${Number(selectedReward.points_cost).toLocaleString('vi-VN')} PTS</span></div>`;
  renderRecipientFields(selectedReward.reward_type);
  if($r('rewardConfirmStep'))$r('rewardConfirmStep').hidden=false;
  $r('rewardConfirmStep')?.scrollIntoView({behavior:'smooth',block:'nearest'});
 }

 function renderRecipientFields(type){
  const box=$r('rewardRecipientFields'); if(!box)return;
  if(type==='diamond'){
   box.innerHTML=`<label>UID game<input id="rewardGameUid" inputmode="numeric" maxlength="40" placeholder="Nhập UID nhận kim cương"></label>`;
  }else if(type==='game_card'){
   box.innerHTML=`<label>Loại thẻ / nhà phát hành<input id="rewardGameCardProvider" maxlength="80" placeholder="VD: Garena, Zing, Google Play..."></label><label>Ghi chú nhận thẻ<input id="rewardGameCardNote" maxlength="160" placeholder="Thông tin cần thiết để Admin gửi thẻ"></label>`;
  }else{
   box.innerHTML=`<label>Ngân hàng<input id="rewardBankName" maxlength="80" placeholder="VD: Vietcombank"></label><label>Số tài khoản<input id="rewardBankAccount" inputmode="numeric" maxlength="40" placeholder="Nhập số tài khoản"></label><label>Tên chủ tài khoản<input id="rewardBankHolder" maxlength="100" placeholder="Nhập đúng tên chủ tài khoản"></label>`;
  }
 }

 function resetSelection(){
  selectedReward=null;
  document.querySelectorAll('.reward-denomination-card').forEach(b=>b.classList.remove('selected'));
  if($r('rewardConfirmStep'))$r('rewardConfirmStep').hidden=true;
 }

 async function submitSelectedReward(){
  if(!selectedReward)return;
  let recipient={};
  if(selectedReward.reward_type==='diamond'){
   const uid=$r('rewardGameUid')?.value.trim();
   if(!uid)return notify('Vui lòng nhập UID game.',true);
   recipient={game_uid:uid};
  }else if(selectedReward.reward_type==='game_card'){
   const provider=$r('rewardGameCardProvider')?.value.trim();
   const note=$r('rewardGameCardNote')?.value.trim();
   if(!provider)return notify('Vui lòng nhập loại thẻ hoặc nhà phát hành.',true);
   recipient={provider,note};
  }else{
   const bank=$r('rewardBankName')?.value.trim();
   const account=$r('rewardBankAccount')?.value.trim();
   const holder=$r('rewardBankHolder')?.value.trim();
   if(!bank||!account||!holder)return notify('Vui lòng nhập đủ thông tin ngân hàng.',true);
   recipient={bank_name:bank,account_number:account,account_holder:holder};
  }

  if(!confirm(`Xác nhận đổi ${selectedReward.display_value||selectedReward.title} với ${Number(selectedReward.points_cost).toLocaleString('vi-VN')} PTS?`))return;

  const btn=$r('confirmRewardRedemption');
  if(btn)btn.disabled=true;
  try{
   const out=await call('nexora_redeem_reward',{p_reward_id:selectedReward.id,p_recipient:recipient});
   if(out?.ok!==false && window.NEXORA_PUSH?.notifyAdmins){
    window.NEXORA_PUSH.notifyAdmins({event:'reward_request',rewardType:selectedReward.reward_type,rewardLabel:selectedReward.display_value||selectedReward.title||'Phần thưởng',pointsCost:Number(selectedReward.points_cost||0)});
   }
   notify(out?.message||'Đã gửi yêu cầu đổi thưởng ✓',!out?.ok);
   resetSelection();
   await loadShop();
   await loadMine();
   if(out?.points_left!=null){
    if($r('rewardCurrentPoints'))$r('rewardCurrentPoints').textContent=out.points_left;
    if($r('myPoints'))$r('myPoints').textContent=out.points_left;
   }
  }catch(e){notify(e.message,true)}
  finally{if(btn)btn.disabled=false}
 }

 async function loadMine(){
  const box=$r('myRedemptionList');if(!box)return;
  try{
   const allRows=await call('nexora_my_redemptions_v2',{p_limit:100});
   const hidden=await hiddenHistoryV2687();
   const rows=(allRows||[]).filter(x=>!isHistoryHiddenV2687(hidden,'reward_redemption',String(x.id)));
   box.innerHTML=rows.map(x=>{
    const f=x.fulfillment||{};
    const delivered=x.status==='fulfilled'&&x.reward_type==='game_card'
      ?`<div class="reward-note"><b>Mã thẻ:</b> <code>${esc(f.card_code||'—')}</code><br><b>Serial:</b> <code>${esc(f.card_serial||'—')}</code></div>`
      :x.status==='fulfilled'&&x.reward_type==='diamond'&&f.transaction_code
        ?`<div class="reward-note"><b>Mã giao dịch / xác nhận:</b> ${esc(f.transaction_code)}</div>`
        :x.status==='fulfilled'&&x.reward_type==='cash'&&f.transaction_code
          ?`<div class="reward-note"><b>Mã giao dịch chuyển khoản:</b> ${esc(f.transaction_code)}</div>`:'';
    const canDelete=['fulfilled','rejected'].includes(x.status);
    return `<div class="redemption-row"><div><b>${esc(x.display_value||x.reward_title)}</b><small>${typeText(x.reward_type)} • ${Number(x.points_cost).toLocaleString('vi-VN')} PTS</small></div><span class="redemption-status ${esc(x.status)}">${statusText(x.status)}</span>${delivered}${x.admin_note?`<p><b>Admin:</b> ${esc(x.admin_note)}</p>`:''}${canDelete?`<button class="ghost small user-history-delete-v2687" data-history-type="reward_redemption" data-history-key="${esc(String(x.id))}" data-history-label="lịch sử đổi thưởng này" type="button">🗑️ Xóa lịch sử</button>`:''}</div>`;
   }).join('')||'<div class="empty-state">Bạn chưa có lịch sử đổi thưởng đang hiển thị.</div>';
   bindHistoryDeleteV2687(box,loadMine);
  }catch(e){box.textContent='Hãy chạy SQL v2.6.2. '+e.message}
 }

 function applyRewardFilter(filter){
  activeRewardFilter=filter||'diamond';
  document.querySelectorAll('.reward-category-tab').forEach(b=>b.classList.toggle('active',b.dataset.rewardFilter===activeRewardFilter));
  const shopPanel=$r('rewardShopList')?.closest('.reward-center');
  const historyPanel=$r('myRedemptionList')?.closest('.reward-history');

  if(activeRewardFilter==='history'){
   if(shopPanel)shopPanel.classList.add('reward-history-mode');
   if($r('rewardPackageStep'))$r('rewardPackageStep').style.display='none';
   if($r('rewardConfirmStep'))$r('rewardConfirmStep').hidden=true;
   if(historyPanel){historyPanel.classList.remove('dashboard-category-hidden');historyPanel.style.display='block'}
   loadMine();
   return;
  }

  if(shopPanel)shopPanel.classList.remove('reward-history-mode');
  if($r('rewardPackageStep'))$r('rewardPackageStep').style.display='';
  if(historyPanel)historyPanel.style.display='none';
  resetSelection();
  renderRewardPackages();
 }

 function bindRewardCategoryNav(){
  document.querySelectorAll('.reward-category-tab').forEach(b=>{
   b.addEventListener('click',()=>applyRewardFilter(b.dataset.rewardFilter));
  });
 }

 async function adminRewards(){
  if(!$r('adminRewardList'))return;
  try{
   const [items,reqs]=await Promise.all([call('nexora_admin_rewards_v2',{p_limit:100}),call('nexora_admin_redemptions_v2',{p_limit:100})]);
   $r('adminRewardList').innerHTML=(items||[]).map(x=>`<div class="admin-v25-card"><b>${typeText(x.reward_type)} • ${esc(x.display_value||x.title)}</b><div class="admin-v25-meta"><span>${Number(x.points_cost).toLocaleString('vi-VN')} PTS</span><span>Kho: ${x.stock===-1?'∞':x.stock}</span><span>${x.is_active?'🟢 Đang bán':'⚫ Đã ẩn'}</span></div><small>${esc(x.title)}</small><div class="admin-v25-actions"><button class="ghost v26-toggle-reward" data-id="${x.id}" data-active="${x.is_active?'0':'1'}">${x.is_active?'Ẩn':'Hiện'}</button><button class="ghost admin-danger v26-delete-reward" data-id="${x.id}">Xóa</button></div></div>`).join('')||'Chưa có phần thưởng.';
   $r('adminRedemptionList').innerHTML=(reqs||[]).map(x=>{
    const d=x.recipient_data||{};
    const recipient=x.reward_type==='diamond'
      ?`UID game: ${esc(d.game_uid||'—')}`
      :x.reward_type==='game_card'
        ?`Loại thẻ: ${esc(d.provider||'—')}`
        :`Ngân hàng: ${esc(d.bank_name||'—')} • STK: ${esc(d.account_number||'—')} • Chủ TK: ${esc(d.account_holder||'—')}`;
    const f=x.fulfillment||{};
    const delivered=x.status==='fulfilled'&&x.reward_type==='game_card'
      ?`<div class="admin-recipient-data"><b>Mã thẻ:</b> ${esc(f.card_code||'—')} • <b>Serial:</b> ${esc(f.card_serial||'—')}</div>`
      :x.status==='fulfilled'&&f.transaction_code
        ?`<div class="admin-recipient-data"><b>Mã giao dịch:</b> ${esc(f.transaction_code)}</div>`:'';
    const fulfill=x.status==='processing'
      ?x.reward_type==='game_card'
        ?`<div class="admin-v25-actions"><input class="v2685-card-code" data-id="${x.id}" maxlength="200" placeholder="Mã thẻ *"><input class="v2685-card-serial" data-id="${x.id}" maxlength="200" placeholder="Serial *"></div>`
        :`<div class="admin-v25-actions"><input class="v2685-transaction" data-id="${x.id}" maxlength="200" placeholder="${x.reward_type==='cash'?'Mã giao dịch chuyển khoản':'Mã giao dịch / xác nhận nạp'}"></div>`
      :'';
    return `<div class="admin-v25-card"><b>${esc(x.display_name||'Game thủ')} • ${esc(x.display_value||x.reward_title)}</b><div class="admin-v25-meta"><span>${Number(x.points_cost).toLocaleString('vi-VN')} PTS</span><span>${statusText(x.status)}</span><span>${new Date(x.created_at).toLocaleString('vi-VN')}</span></div><div class="admin-recipient-data">${recipient}</div>${delivered}${fulfill}<div class="admin-v25-actions">${x.status==='pending'?`<button class="ghost v26-status" data-id="${x.id}" data-user="${x.user_id||''}" data-label="${esc(x.display_value||x.reward_title||'Phần thưởng')}" data-status="processing">Đang xử lý</button><button class="ghost admin-danger v26-status" data-id="${x.id}" data-user="${x.user_id||''}" data-label="${esc(x.display_value||x.reward_title||'Phần thưởng')}" data-status="rejected">Từ chối + hoàn PTS</button>`:''}${x.status==='processing'?`<button class="btn v26-status" data-id="${x.id}" data-user="${x.user_id||''}" data-label="${esc(x.display_value||x.reward_title||'Phần thưởng')}" data-type="${x.reward_type}" data-status="fulfilled">✓ Đã trao</button><button class="ghost admin-danger v26-status" data-id="${x.id}" data-user="${x.user_id||''}" data-label="${esc(x.display_value||x.reward_title||'Phần thưởng')}" data-status="rejected">Từ chối + hoàn PTS</button>`:''}</div></div>`;
   }).join('')||'Chưa có yêu cầu.';
   bindAdmin();
  }catch(e){$r('adminRewardList').textContent='Hãy chạy SQL v2.6.2. '+e.message}
 }

 const formatRecipient=(t,d={})=>t==='diamond'?`UID game: ${d.game_uid||'—'}`:t==='game_card'?`Loại thẻ: ${d.provider||'—'} • Ghi chú: ${d.note||'—'}`:`Ngân hàng: ${d.bank_name||'—'} • STK: ${d.account_number||'—'} • Chủ TK: ${d.account_holder||'—'}`;

 function bindAdmin(){
  document.querySelectorAll('.v26-toggle-reward').forEach(b=>b.onclick=async()=>{try{await call('nexora_admin_set_reward_active',{p_reward_id:b.dataset.id,p_active:b.dataset.active==='1'});await adminRewards()}catch(e){notify(e.message,true)}});
  document.querySelectorAll('.v26-delete-reward').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa phần thưởng này? Các yêu cầu cũ vẫn được giữ.'))return;try{await call('nexora_admin_delete_reward',{p_reward_id:b.dataset.id});await adminRewards()}catch(e){notify(e.message,true)}});
  document.querySelectorAll('.v26-status').forEach(b=>b.onclick=async()=>{
   let note='';
   if(b.dataset.status==='rejected'){
    note=prompt('Lý do từ chối (PTS sẽ được hoàn tự động):')||'';
    if(!note.trim())return;
   }
   try{
    let out;
    if(b.dataset.status==='fulfilled'){
     const id=b.dataset.id,type=b.dataset.type;
     const cardCode=document.querySelector(`.v2685-card-code[data-id="${id}"]`)?.value.trim()||'';
     const cardSerial=document.querySelector(`.v2685-card-serial[data-id="${id}"]`)?.value.trim()||'';
     const transaction=document.querySelector(`.v2685-transaction[data-id="${id}"]`)?.value.trim()||'';
     if(type==='game_card'&&(!cardCode||!cardSerial)){notify('Bạn cần nhập đủ Mã thẻ và Serial trước khi bấm Đã trao.',true);return}
     out=await call('nexora_admin_fulfill_redemption_v2685',{
      p_redemption_id:id,
      p_card_code:cardCode||null,
      p_card_serial:cardSerial||null,
      p_transaction_code:transaction||null
     });
    }else{
     out=await call('nexora_admin_set_redemption_status',{p_redemption_id:b.dataset.id,p_status:b.dataset.status,p_note:note});
    }
    notify(out?.message||'Đã cập nhật ✓');
    if(window.NEXORA_PUSH&&b.dataset.user){
      const labels={processing:'🎁 Đổi thưởng đang được xử lý',fulfilled:'🎁 Đổi thưởng đã hoàn tất',rejected:'🎁 Yêu cầu đổi thưởng bị từ chối'};
      const bodies={processing:`${b.dataset.label||'Phần thưởng'} đang được Admin xử lý.`,fulfilled:`${b.dataset.label||'Phần thưởng'} đã được Admin hoàn tất. Mở Reward Center để xem chi tiết.`,rejected:`${b.dataset.label||'Phần thưởng'} đã bị từ chối và PTS được hoàn theo hệ thống.`};
      window.NEXORA_PUSH.adminNotify(b.dataset.user,labels[b.dataset.status]||'🎁 Cập nhật đổi thưởng',bodies[b.dataset.status]||'Trạng thái đổi thưởng của bạn vừa thay đổi.','./dashboard.html','reward-status');
    }
    await adminRewards()
   }catch(e){notify(e.message,true)}
  });
 }

 document.addEventListener('DOMContentLoaded',()=>{
  if($r('rewardShopList')){
   bindRewardCategoryNav();
   loadShop();
   loadMine();
   applyRewardFilter('diamond');
   $r('cancelRewardSelection')?.addEventListener('click',resetSelection);
   $r('confirmRewardRedemption')?.addEventListener('click',submitSelectedReward);
   $r('refreshRewardCenter')?.addEventListener('click',()=>{loadShop();loadMine()});
  }

  if($r('adminRewardList')){
   adminRewards();
   $r('refreshAdminRewards')?.addEventListener('click',adminRewards);
   $r('adminRewardForm')?.addEventListener('submit',async e=>{
    e.preventDefault();
    try{
     const out=await call('nexora_admin_create_reward_v2',{
      p_title:$r('adminRewardTitle').value.trim(),
      p_reward_type:$r('adminRewardType').value,
      p_points_cost:+$r('adminRewardCost').value,
      p_stock:+$r('adminRewardStock').value,
      p_description:$r('adminRewardDescription').value.trim(),
      p_display_value:$r('adminRewardValue').value.trim()
     });
     notify(out?.message||'Đã thêm phần thưởng ✓');
     e.target.reset();
     $r('adminRewardCost').value=1000;
     $r('adminRewardStock').value=-1;
     await adminRewards();
    }catch(err){notify(err.message,true)}
   });
  }
 });
})();



// =========================================================
// Nexora v2.6.8 — Support & Issue Report System
// =========================================================
(function(){
 const $s=id=>document.getElementById(id);
 const escs=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const dbs=()=>window.NEXORA_DB;
 const rpc=async(name,args={})=>{
   const db=dbs(); if(!db) throw new Error('Supabase chưa sẵn sàng. Hãy tải lại trang.');
   const r=await db.rpc(name,args); if(r.error) throw r.error; return r.data;
 };
 const statusText=s=>({pending:'Chờ xử lý',processing:'Đang xử lý',resolved:'Đã giải quyết',closed:'Đã đóng'}[s]||s);
 const catText=s=>({challenge:'Challenge / Mission',proof:'Proof / Bằng chứng',reward:'Đổi thưởng',points:'PTS / Điểm',account:'Tài khoản',website:'Lỗi website',other:'Vấn đề khác'}[s]||s);
 const fmt=d=>{try{return new Date(d).toLocaleString('vi-VN')}catch{return d||''}};
 const toast=(m,bad=false)=>{
   const e=$s('dashMsg')||$s('adminMsg');
   if(e){e.textContent=m;e.style.color=bad?'#ff6b7a':'#20e6ff';e.scrollIntoView({behavior:'smooth',block:'nearest'});}
 };

 async function loadMyTickets(){
   const box=$s('supportTicketList'); if(!box)return;
   try{
     const rows=await rpc('nexora_my_support_tickets_v268',{p_limit:50});
     box.innerHTML=(rows||[]).map(t=>`<article class="support-ticket-card">
       <div class="support-ticket-head"><div><b>${escs(t.ticket_code)} • ${escs(t.subject)}</b><small>${escs(catText(t.category))} • ${fmt(t.updated_at)}</small></div><span class="support-status ${escs(t.status)}">${escs(statusText(t.status))}</span></div>
       <p>${escs(t.message)}</p>
       ${t.evidence_url?`<a class="ghost small support-evidence" href="${escs(t.evidence_url)}" target="_blank" rel="noopener">Mở bằng chứng</a>`:''}
       <div class="support-thread">${(t.messages||[]).map(m=>`<div class="support-message ${m.sender_role==='admin'?'admin':'user'}"><b>${m.sender_role==='admin'?'👨‍💻 Admin':'👤 Bạn'}</b><span>${escs(m.message)}</span><small>${fmt(m.created_at)}</small></div>`).join('')||'<div class="empty-state">Chưa có phản hồi.</div>'}</div>
       ${!['closed'].includes(t.status)?`<form class="support-reply-form" data-id="${t.id}"><input maxlength="1000" placeholder="Phản hồi thêm cho Admin..." required><button class="ghost small">Gửi</button></form>`:''}
       ${['resolved','closed'].includes(t.status)?`<div class="support-delete-row"><button class="ghost small support-delete-ticket" data-id="${t.id}" data-code="${escs(t.ticket_code)}" type="button">🗑️ Xóa lịch sử</button></div>`:''}
     </article>`).join('')||'<div class="empty-state">Bạn chưa có Ticket hỗ trợ.</div>';
     box.querySelectorAll('.support-reply-form').forEach(f=>f.onsubmit=async e=>{
       e.preventDefault();const input=f.querySelector('input');const msg=input.value.trim();if(!msg)return;
       try{await rpc('nexora_reply_support_ticket_v268',{p_ticket_id:f.dataset.id,p_message:msg});if(window.NEXORA_PUSH)window.NEXORA_PUSH.notifyAdmins({event:'support_reply',ticketId:f.dataset.id});input.value='';await loadMyTickets();toast('Đã gửi phản hồi cho Admin ✓')}
       catch(err){toast(err.message,true)}
     });
     box.querySelectorAll('.support-delete-ticket').forEach(b=>b.onclick=async()=>{
       const code=b.dataset.code||'Ticket này';
       if(!confirm(`Xóa vĩnh viễn lịch sử ${code}?\n\nTicket, toàn bộ tin nhắn và thông báo liên quan sẽ bị xóa. Thao tác này không thể hoàn tác.`))return;
       b.disabled=true;
       try{
         await rpc('nexora_delete_my_support_ticket_v2682',{p_ticket_id:b.dataset.id});
         await loadMyTickets();
         if(typeof loadSupportNotificationsV2681==='function') loadSupportNotificationsV2681();
         toast(`Đã xóa lịch sử ${code} ✓`);
       }catch(err){
         toast(err.message,true);
         b.disabled=false;
       }
     });
   }catch(e){box.textContent='Hãy chạy SQL v2.6.8 để bật Support Center. '+e.message}
 }

 async function createTicket(e){
   e.preventDefault();
   const btn=e.submitter||e.target.querySelector('button[type="submit"]'); if(btn)btn.disabled=true;
   try{
     const out=await rpc('nexora_create_support_ticket_v268',{
       p_category:$s('supportCategory').value,
       p_subject:$s('supportSubject').value.trim(),
       p_message:$s('supportMessage').value.trim(),
       p_evidence_url:$s('supportEvidenceUrl').value.trim()||null
     });
     e.target.reset(); await loadMyTickets();
     if(window.NEXORA_PUSH) window.NEXORA_PUSH.notifyAdmins({event:'support_ticket',ticketCode:out?.ticket_code||'',category:$s('supportCategory')?.value||'',subject:$s('supportSubject')?.value?.trim()||''});
     toast(`Đã gửi Ticket ${out?.ticket_code||''} cho Admin ✓`);
     document.querySelector('[data-module-tab="my-tickets"]')?.click();
   }catch(err){toast(err.message,true)}
   finally{if(btn)btn.disabled=false}
 }

 async function loadAdminTickets(){
   const box=$s('adminSupportTicketList'); if(!box)return;
   try{
     const filter=$s('adminSupportFilter')?.value||'open';
     const rows=await rpc('nexora_admin_support_tickets_v268',{p_filter:filter,p_limit:100});
     const pending=(rows||[]).filter(x=>['pending','processing'].includes(x.status)).length;
     const badge=$s('adminSupportBadge');if(badge){badge.textContent=pending;badge.classList.toggle('hidden',pending===0)}
     box.innerHTML=(rows||[]).map(t=>`<article class="admin-v25-card support-admin-card">
       <div class="support-ticket-head"><div><b>${escs(t.ticket_code)} • ${escs(t.subject)}</b><small>${escs(t.display_name||'Game thủ')} • ${escs(catText(t.category))} • ${fmt(t.updated_at)}</small></div><span class="support-status ${escs(t.status)}">${escs(statusText(t.status))}</span></div>
       <p>${escs(t.message)}</p>
       ${t.evidence_url?`<a class="ghost small support-evidence" href="${escs(t.evidence_url)}" target="_blank" rel="noopener">Mở bằng chứng</a>`:''}
       <div class="support-thread">${(t.messages||[]).map(m=>`<div class="support-message ${m.sender_role==='admin'?'admin':'user'}"><b>${m.sender_role==='admin'?'👨‍💻 Admin':'👤 Người dùng'}</b><span>${escs(m.message)}</span><small>${fmt(m.created_at)}</small></div>`).join('')}</div>
       <div class="admin-v25-actions">
         ${t.status==='pending'?`<button class="ghost support-status-btn" data-id="${t.id}" data-user="${t.user_id||''}" data-code="${escs(t.ticket_code||'Ticket')}" data-status="processing">Nhận xử lý</button>`:''}
         ${!['resolved','closed'].includes(t.status)?`<button class="btn support-status-btn" data-id="${t.id}" data-user="${t.user_id||''}" data-code="${escs(t.ticket_code||'Ticket')}" data-status="resolved">✓ Đã giải quyết</button>`:''}
         ${t.status==='resolved'?`<button class="ghost support-status-btn" data-id="${t.id}" data-user="${t.user_id||''}" data-code="${escs(t.ticket_code||'Ticket')}" data-status="closed">Đóng Ticket</button>`:''}
       </div>
       ${t.status!=='closed'?`<form class="support-admin-reply" data-id="${t.id}" data-user="${t.user_id||''}" data-code="${escs(t.ticket_code||'Ticket')}"><input maxlength="1000" placeholder="Trả lời người dùng..." required><button class="ghost small">Gửi phản hồi</button></form>`:''}
     </article>`).join('')||'<div class="empty-state">Không có Ticket phù hợp.</div>';

     box.querySelectorAll('.support-status-btn').forEach(b=>b.onclick=async()=>{
       try{await rpc('nexora_admin_set_support_status_v268',{p_ticket_id:b.dataset.id,p_status:b.dataset.status});if(window.NEXORA_PUSH&&b.dataset.user&&['resolved','closed'].includes(b.dataset.status)){window.NEXORA_PUSH.adminNotify(b.dataset.user,b.dataset.status==='resolved'?'🛟 Support đã giải quyết':'🛟 Ticket đã đóng',`${b.dataset.code||'Ticket'} ${b.dataset.status==='resolved'?'đã được Admin đánh dấu giải quyết.':'đã được đóng.'}`,'./dashboard.html','support-status')}await loadAdminTickets();toast('Đã cập nhật Ticket ✓')}
       catch(e){toast(e.message,true)}
     });
     box.querySelectorAll('.support-admin-reply').forEach(f=>f.onsubmit=async e=>{
       e.preventDefault();const input=f.querySelector('input');const msg=input.value.trim();if(!msg)return;
       try{await rpc('nexora_admin_reply_support_ticket_v268',{p_ticket_id:f.dataset.id,p_message:msg});if(window.NEXORA_PUSH&&f.dataset.user){window.NEXORA_PUSH.adminNotify(f.dataset.user,'🛟 Admin đã phản hồi Support',`${f.dataset.code||'Ticket'} có phản hồi mới từ Admin.`,'./dashboard.html','support-reply')}input.value='';await loadAdminTickets();toast('Đã gửi phản hồi ✓')}
       catch(err){toast(err.message,true)}
     });
   }catch(e){box.textContent='Hãy chạy SQL v2.6.8 để bật Support Desk. '+e.message}
 }

 document.addEventListener('DOMContentLoaded',()=>{
   $s('supportTicketForm')?.addEventListener('submit',createTicket);
   $s('refreshSupportTickets')?.addEventListener('click',loadMyTickets);
   if($s('supportTicketList')){loadMyTickets();setInterval(loadMyTickets,30000)}

   $s('refreshAdminSupport')?.addEventListener('click',loadAdminTickets);
   $s('adminSupportSearchBtn')?.addEventListener('click',loadAdminTickets);
   $s('adminSupportFilter')?.addEventListener('change',loadAdminTickets);
   if($s('adminSupportTicketList')){loadAdminTickets();setInterval(loadAdminTickets,20000)}
 });
})();


// Nexora v2.6.8.8 — Referral Admin
(function(){
 const q=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const call=async(name,args={})=>{const client=window.NEXORA_DB;if(!client)throw new Error('Supabase chưa sẵn sàng.');const r=await client.rpc(name,args);if(r.error)throw r.error;return r.data};
 async function load(search=''){
   const box=q('adminReferralList');if(!box)return;
   try{
     const [summary,rows]=await Promise.all([
       call('nexora_admin_referral_summary_v2688'),
       call('nexora_admin_referrals_v2688',{p_search:search,p_limit:150})
     ]);
     q('adminReferralTotal').textContent=Number(summary?.total_referrals||0);
     q('adminReferralRewarded').textContent=Number(summary?.rewarded||0);
     q('adminReferralPending').textContent=Number(summary?.pending||0);
     q('adminReferralPoints').textContent=Number(summary?.points_distributed||0).toLocaleString('vi-VN');
     box.innerHTML=(rows||[]).map(r=>`<article class="admin-v25-card">
       <b>🤝 ${safe(r.inviter_name||'Game thủ')} → ${safe(r.invited_name||'Game thủ')}</b>
       <div class="admin-v25-meta">
         <span>Mã ${safe(r.referral_code)}</span>
         <span>${r.status==='rewarded'?'✅ Đã thưởng':r.status==='limit_reached'?'⚠️ Vượt giới hạn':'⏳ Chờ xác minh'}</span>
         <span>${new Date(r.created_at).toLocaleString('vi-VN')}</span>
       </div>
       ${r.status==='rewarded'?`<small>Người mời +${r.inviter_points} PTS • Người mới +${r.invited_points} PTS</small>`:''}
     </article>`).join('')||'<div class="empty-state">Chưa có Referral.</div>';
   }catch(e){box.textContent='Hãy chạy SQL v2.6.8.8. '+e.message}
 }
 document.addEventListener('DOMContentLoaded',()=>{
   if(!q('adminReferralList'))return;
   load();
   q('refreshAdminReferral')?.addEventListener('click',()=>load(q('adminReferralSearch')?.value.trim()||''));
   q('adminReferralSearchBtn')?.addEventListener('click',()=>load(q('adminReferralSearch')?.value.trim()||''));
   q('adminReferralSearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();load(e.target.value.trim())}});
 });
})();



// =========================================================
// Nexora v2.6.9 — Site Announcement Admin
// =========================================================
(function(){
 const el=id=>document.getElementById(id);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const call=async(name,args={})=>{const c=window.NEXORA_DB;if(!c)throw new Error('Supabase chưa sẵn sàng.');const r=await c.rpc(name,args);if(r.error)throw r.error;return r.data};
 const say=(text,bad=false)=>{const m=el('adminAnnouncementMsg');if(m){m.textContent=text;m.style.color=bad?'#ff8c82':'#62e6aa'}};
 const typeLabel=t=>({update:'🆕 Cập nhật',event:'🎟️ Event',tournament:'🏆 Giải đấu',system:'⚙️ Hệ thống'}[t]||'📢 Thông báo');

 async function load(){
   const box=el('adminAnnouncementList');if(!box)return;
   try{
     const rows=await call('nexora_admin_announcements_v269',{p_limit:100});
     box.innerHTML=(rows||[]).map(x=>`<article class="admin-v25-card admin-announcement-card">
       <div><b>${typeLabel(x.type)} • ${safe(x.title)}</b><small>${safe(x.content)}</small></div>
       <div class="admin-v25-meta"><span>${x.is_active?'🟢 Đang hiện':'⚫ Đã ẩn'}</span>${x.is_pinned?'<span>📌 Đã ghim</span>':''}<span>${new Date(x.created_at).toLocaleString('vi-VN')}</span>${x.expires_at?`<span>Hết hạn ${new Date(x.expires_at).toLocaleString('vi-VN')}</span>`:''}</div>
       <div class="actions">
         <button class="ghost small ann-toggle" data-id="${x.id}" data-active="${x.is_active}">${x.is_active?'Ẩn':'Hiện'}</button>
         <button class="ghost small ann-pin" data-id="${x.id}" data-pin="${x.is_pinned}">${x.is_pinned?'Bỏ ghim':'📌 Ghim'}</button>
         <button class="danger small ann-delete" data-id="${x.id}">🗑️ Xóa</button>
       </div>
     </article>`).join('')||'<div class="empty-state">Chưa có thông báo nào.</div>';

     box.querySelectorAll('.ann-toggle').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await call('nexora_admin_set_announcement_active_v269',{p_id:b.dataset.id,p_active:b.dataset.active!=='true'});await load()}catch(e){say(e.message,true);b.disabled=false}});
     box.querySelectorAll('.ann-pin').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await call('nexora_admin_set_announcement_pinned_v269',{p_id:b.dataset.id,p_pinned:b.dataset.pin!=='true'});await load()}catch(e){say(e.message,true);b.disabled=false}});
     box.querySelectorAll('.ann-delete').forEach(b=>b.onclick=async()=>{if(!confirm('Xóa vĩnh viễn thông báo này?'))return;b.disabled=true;try{await call('nexora_admin_delete_announcement_v269',{p_id:b.dataset.id});say('Đã xóa thông báo ✓');await load()}catch(e){say(e.message,true);b.disabled=false}});
   }catch(e){box.innerHTML=`<div class="empty-state">Hãy chạy SQL v2.6.9.<br><small>${safe(e.message)}</small></div>`}
 }

 document.addEventListener('DOMContentLoaded',()=>{
   if(!el('adminAnnouncementList'))return;
   load();
   el('refreshAdminAnnouncements')?.addEventListener('click',load);
   el('adminAnnouncementForm')?.addEventListener('submit',async e=>{
     e.preventDefault();
     const btn=e.submitter;if(btn)btn.disabled=true;
     try{
       const expires=el('adminAnnouncementExpires').value;
       await call('nexora_admin_create_announcement_v269',{
         p_type:el('adminAnnouncementType').value,
         p_title:el('adminAnnouncementTitle').value.trim(),
         p_content:el('adminAnnouncementContent').value.trim(),
         p_link_url:el('adminAnnouncementLink').value.trim()||null,
         p_expires_at:expires?new Date(expires).toISOString():null,
         p_is_pinned:el('adminAnnouncementPinned').checked
       });
       e.target.reset();say('Đã đăng thông báo lên trang user ✓');await load();
     }catch(err){say(err.message,true)}
     finally{if(btn)btn.disabled=false}
   });
 });
})();

// =========================================================
// Nexora v2.6.10 — Real Web Push
// IMPORTANT: this block is outside the main IIFE. Use window.NEXORA_DB only.
// =========================================================
(function initNexoraRealWebPush(){
 const el=id=>document.getElementById(id);
 const client=()=>window.NEXORA_DB;
 const isIOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const isStandalone=()=>window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
 const supported=()=>('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
 const b64ToUint8=s=>{const pad='='.repeat((4-s.length%4)%4);const base64=(s+pad).replace(/-/g,'+').replace(/_/g,'/');const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
 const status=(text,kind='off',detail='')=>{const pill=el('pushStatusPill'),txt=el('pushStatusText');if(pill){pill.textContent=text;pill.classList.remove('push-ready','push-blocked','push-off');pill.classList.add('push-'+kind)}if(txt&&detail)txt.textContent=detail};
 async function registerSW(){return navigator.serviceWorker.register('./sw.js?v=2610',{scope:'./'}).then(()=>navigator.serviceWorker.ready)}
 async function invoke(body){const db=client();if(!db)throw new Error('Supabase chưa sẵn sàng.');const {data,error}=await db.functions.invoke('nexora-web-push',{body});if(error)throw error;if(data?.error)throw new Error(data.error);return data}
 async function currentUser(){const db=client();if(!db)return null;const {data,error}=await db.auth.getUser();if(error)throw error;return data?.user||null}
 async function saveSubscription(sub,user){const json=sub.toJSON();await invoke({action:'subscribe',subscription:{endpoint:sub.endpoint,keys:{p256dh:json.keys?.p256dh||'',auth:json.keys?.auth||''}},userAgent:navigator.userAgent})}
 async function syncUI(){
   const enable=el('enablePushBtn'),disable=el('disablePushBtn'),test=el('testPushBtn'),ios=el('pushIosNote');if(!enable&&!disable&&!test)return;
   if(ios)ios.hidden=!(isIOS()&&!isStandalone());
   if(!supported()){status('KHÔNG HỖ TRỢ','blocked','Trình duyệt/thiết bị này chưa hỗ trợ Web Push.');if(enable)enable.disabled=true;return}
   if(isIOS()&&!isStandalone()){status('CẦN CÀI WEB APP','off','Trên iPhone/iPad, hãy thêm Nexora vào Màn hình chính rồi mở từ biểu tượng Nexora để bật Web Push.');if(enable)enable.disabled=true;if(disable)disable.hidden=true;if(test)test.hidden=true;return}
   const reg=await registerSW();const sub=await reg.pushManager.getSubscription();
   if(Notification.permission==='denied'){status('ĐÃ CHẶN','blocked','Quyền thông báo đang bị chặn trong cài đặt trình duyệt.');if(enable)enable.disabled=true;if(disable)disable.hidden=!sub;if(test)test.hidden=true;return}
   if(sub){status('ĐÃ BẬT','ready','Web Push đang hoạt động trên thiết bị này. Bạn có thể gửi thử một thông báo.');if(enable){enable.hidden=true;enable.disabled=false}if(disable)disable.hidden=false;if(test)test.hidden=false;try{const user=await currentUser();if(user)await saveSubscription(sub,user)}catch(e){console.warn('Push sync:',e)} }
   else{status('CHƯA BẬT','off','Bật Web Push để nhận thông báo khi Nexora có cập nhật quan trọng cho tài khoản của bạn.');if(enable){enable.hidden=false;enable.disabled=false}if(disable)disable.hidden=true;if(test)test.hidden=true}
 }
 async function enable(){
   const btn=el('enablePushBtn');if(btn)btn.disabled=true;
   try{
     if(isIOS()&&!isStandalone())throw new Error('Trên iPhone, hãy Add to Home Screen rồi mở Nexora từ biểu tượng trên màn hình chính.');
     const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Bạn chưa cho phép Nexora gửi thông báo.');
     const user=await currentUser();if(!user)throw new Error('Bạn cần đăng nhập lại.');
     const cfg=await invoke({action:'config'});if(!cfg?.publicKey)throw new Error('Web Push chưa được cấu hình VAPID trên Supabase.');
     const reg=await registerSW();let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToUint8(cfg.publicKey)});
     await saveSubscription(sub,user);await syncUI();
   }catch(e){alert(e?.message||'Không thể bật Web Push.');await syncUI().catch(()=>{})}finally{if(btn)btn.disabled=false}
 }
 async function disable(){
   const btn=el('disablePushBtn');if(btn)btn.disabled=true;
   try{const reg=await registerSW();const sub=await reg.pushManager.getSubscription();if(sub){await invoke({action:'unsubscribe',endpoint:sub.endpoint});await sub.unsubscribe()}await syncUI()}catch(e){alert(e?.message||'Không thể tắt Web Push.')}finally{if(btn)btn.disabled=false}
 }
 async function test(){const btn=el('testPushBtn');if(btn)btn.disabled=true;try{const out=await invoke({action:'test'});if(!out?.ok)throw new Error(out?.message||'Không gửi được thông báo thử.')}catch(e){alert(e?.message||'Không gửi được thông báo thử.')}finally{if(btn)btn.disabled=false}}
 async function adminNotify(userId,title,body,url='./dashboard.html',tag='nexora-update'){
   if(!userId)return;try{await invoke({action:'admin_send',userId,title,body,url,tag})}catch(e){console.warn('Nexora Web Push admin send:',e)}
 }
 async function notifyAdmins(eventData={}){
   try{return await invoke({action:'notify_admins',...eventData})}catch(e){console.warn('Nexora Web Push notify admins:',e);return null}
 }
 window.NEXORA_PUSH={adminNotify,notifyAdmins,syncUI};
 document.addEventListener('DOMContentLoaded',()=>{el('enablePushBtn')?.addEventListener('click',enable);el('disablePushBtn')?.addEventListener('click',disable);el('testPushBtn')?.addEventListener('click',test);if(el('pushCenterPanel'))syncUI().catch(e=>{console.warn('Push init:',e);status('CHƯA CẤU HÌNH','off','Web Push chưa sẵn sàng. Hãy hoàn tất SQL và Edge Function v2.6.10.')})});
})();
