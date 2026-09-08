(function initNexoraAdminDeleteUser(){
  const db=window.NEXORA_DB;
  const listEl=document.getElementById('adminDeleteUserList');
  const searchEl=document.getElementById('adminDeleteUserSearch');
  const refreshBtn=document.getElementById('refreshAdminDeleteUsers');
  if(!db||!listEl)return;

  let users=[];
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function render(){
    const q=(searchEl?.value||'').trim().toLowerCase();
    const rows=users.filter(u=>!q||String(u.name||'').toLowerCase().includes(q)||String(u.email||'').toLowerCase().includes(q));
    listEl.innerHTML=rows.length?rows.map(u=>{
      const admin=u.role==='admin';
      const disabled=admin||u.is_self;
      return `<div class="admin-delete-user-row"><div class="admin-delete-user-info"><strong>${esc(u.name||'Player')}</strong><small>${esc(u.email||'Không có email')} · ${esc(String(u.role||'player').toUpperCase())}</small></div><button class="ghost small admin-delete-user-btn" type="button" data-delete-user="${esc(u.id)}" ${disabled?'disabled':''}>${admin?'ADMIN':'🗑️ Xóa tài khoản'}</button></div>`;
    }).join(''):'<p class="note">Không tìm thấy tài khoản.</p>';
    listEl.querySelectorAll('[data-delete-user]:not([disabled])').forEach(btn=>btn.addEventListener('click',()=>removeUser(btn.dataset.deleteUser)));
  }

  async function load(){
    listEl.innerHTML='<p class="note">Đang tải tài khoản...</p>';
    const {data,error}=await db.functions.invoke('nexora-web-push',{body:{action:'admin_list_users'}});
    if(error){listEl.innerHTML=`<p class="msg">${esc(error.message||'Không tải được tài khoản.')}</p>`;return;}
    if(data?.error){listEl.innerHTML=`<p class="msg">${esc(data.detail||data.error)}</p>`;return;}
    users=Array.isArray(data?.users)?data.users:[];
    render();
  }

  async function removeUser(id){
    const u=users.find(x=>x.id===id); if(!u)return;
    const label=u.email||u.name||'tài khoản này';
    if(!confirm(`XÓA VĨNH VIỄN ${label}?\n\nTài khoản sẽ bị xóa khỏi Supabase Auth và không thể đăng nhập lại. Thao tác này không thể hoàn tác.`))return;
    const typed=prompt(`Để xác nhận, nhập chính xác: XOA`,'');
    if(typed!=='XOA')return alert('Đã hủy. Bạn chưa nhập đúng XOA.');
    const btn=listEl.querySelector(`[data-delete-user="${CSS.escape(id)}"]`);
    if(btn){btn.disabled=true;btn.textContent='Đang xóa...';}
    const {data,error}=await db.functions.invoke('nexora-web-push',{body:{action:'admin_delete_user',userId:id}});
    if(error){alert(error.message||'Xóa thất bại.');return load();}
    if(data?.error){alert(data.detail||data.error);return load();}
    alert('Đã xóa tài khoản thành công.');
    await load();
    document.getElementById('refreshAdminUsers')?.click();
  }

  searchEl?.addEventListener('input',render);
  refreshBtn?.addEventListener('click',load);
  document.querySelector('[data-admin-module="users"]')?.addEventListener('click',()=>setTimeout(load,50));
  load();
})();
