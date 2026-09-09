// Nexora Gaming v2.13.8 — New User Onboarding
(()=>{
  'use strict';
  const VERSION='2138';
  const NEW_ACCOUNT_DAYS=7;
  const steps=[
    {icon:'👑',title:'Chào mừng đến Nexora!',text:'Chỉ mất khoảng 30 giây để biết cách bắt đầu hành trình của bạn tại Nexora Gaming.'},
    {icon:'☀️',title:'Điểm danh mỗi ngày',text:'Quay lại Nexora mỗi ngày để nhận PTS và duy trì chuỗi đăng nhập 3 • 7 • 14 • 30 ngày.'},
    {icon:'🎯',title:'Tham gia Challenge',text:'Chọn Challenge phù hợp, hoàn thành trong Free Fire rồi gửi bằng chứng để Admin xét duyệt.'},
    {icon:'🎁',title:'Tích PTS • Đổi Reward',text:'Hoàn thành hoạt động để tích PTS, sau đó vào Reward Center để chọn phần thưởng phù hợp.'}
  ];
  let idx=0,userKey='guest';
  const key=()=>`nexora_onboarding_${VERSION}_${userKey}`;
  const root=document.createElement('div');
  root.className='nx-onboard';root.id='nexoraOnboarding';root.hidden=true;
  root.innerHTML=`<div class="nx-onboard-card" role="dialog" aria-modal="true" aria-labelledby="nxObTitle"><div class="nx-onboard-top"><span class="nx-onboard-brand">NEXORA • QUICK START</span><button class="nx-onboard-skip" type="button">Bỏ qua</button></div><div class="nx-onboard-progress"><i></i></div><div class="nx-onboard-step"><div class="nx-onboard-icon"></div><span class="nx-onboard-count"></span><h2 id="nxObTitle"></h2><p></p></div><div class="nx-onboard-actions"><button class="nx-onboard-back" type="button">← Quay lại</button><button class="nx-onboard-next" type="button">Tiếp tục →</button></div></div>`;
  function done(){try{localStorage.setItem(key(),'done')}catch{} root.hidden=true;document.documentElement.style.overflow='';}
  function render(){const s=steps[idx];root.querySelector('.nx-onboard-icon').textContent=s.icon;root.querySelector('.nx-onboard-count').textContent=`BƯỚC ${idx+1} / ${steps.length}`;root.querySelector('h2').textContent=s.title;root.querySelector('.nx-onboard-step p').textContent=s.text;root.querySelector('.nx-onboard-progress i').style.width=`${((idx+1)/steps.length)*100}%`;root.querySelector('.nx-onboard-back').style.visibility=idx?'visible':'hidden';root.querySelector('.nx-onboard-next').textContent=idx===steps.length-1?'🔥 BẮT ĐẦU NGAY':'Tiếp tục →';}
  function open(){idx=0;render();root.hidden=false;document.documentElement.style.overflow='hidden';}
  async function init(){document.body.appendChild(root);root.querySelector('.nx-onboard-skip').onclick=done;root.querySelector('.nx-onboard-back').onclick=()=>{if(idx){idx--;render()}};root.querySelector('.nx-onboard-next').onclick=()=>{if(idx<steps.length-1){idx++;render();return}done();location.href='challenges.html'};
    try{const sb=window.sb||window.supabaseClient||window.supabase?.createClient&&null;let user=null;if(window.supabaseClient?.auth)({data:{user}}=await window.supabaseClient.auth.getUser());else if(window.sb?.auth)({data:{user}}=await window.sb.auth.getUser());
      if(!user){const candidates=Object.values(window).filter(v=>v&&typeof v==='object'&&v.auth&&typeof v.auth.getUser==='function');if(candidates[0])({data:{user}}=await candidates[0].auth.getUser())}
      if(!user)return;userKey=user.id||'guest';if(localStorage.getItem(key())==='done')return;const created=new Date(user.created_at).getTime();if(!Number.isFinite(created))return;const age=(Date.now()-created)/86400000;if(age>=0&&age<=NEW_ACCOUNT_DAYS)open();
    }catch(e){console.warn('[Nexora Onboarding]',e)}
  }
  window.NEXORA_ONBOARDING={open};
  document.addEventListener('DOMContentLoaded',()=>setTimeout(init,650));
})();
