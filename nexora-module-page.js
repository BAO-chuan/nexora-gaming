/* Nexora v2.7.1 — Dedicated Module Page Controller */
(function(){
  const map={
    challenges:['challenges','proof'],
    rewards:['rewards'],
    leaderboard:['ranking'],
    support:['support'],
    profile:['profile']
  };
  function apply(){
    const page=document.body?.dataset?.modulePage;
    const allowed=map[page]||[];
    document.querySelectorAll('[data-dash-category]').forEach(el=>{
      const show=allowed.includes(el.dataset.dashCategory);
      el.classList.toggle('module-visible',show);
      if(show) el.classList.remove('legacy-module-hidden');
    });
    // Some app.js tab handlers can re-add dashboard-category-hidden; CSS module-visible overrides it.
    document.querySelectorAll('.module-nav-grid a').forEach(a=>{
      const file=(a.getAttribute('href')||'').split('/').pop();
      a.classList.toggle('active',file===location.pathname.split('/').pop());
    });
    // Keep messages close to the visible content.
    const msg=document.getElementById('dashMsg');
    if(msg){msg.classList.add('module-global-msg')}
  }
  apply();
  document.addEventListener('DOMContentLoaded',()=>{apply();setTimeout(apply,120);setTimeout(apply,600)});
})();
