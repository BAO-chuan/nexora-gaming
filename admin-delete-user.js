(()=>{
  'use strict';

  const db=window.NEXORA_DB;
  if(!db)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let rows=[];
  let currentUserId='';

  function say(text,bad=false){
    const box=$('adminDeleteUserList');
    if(!box)return;
    box.innerHTML=`<div class="${bad?'msg error':'msg'}">${esc(text)}</div>`;
  }

  async function ensureAdmin(){
    const {data:{user},error}=await db.auth.getUser();
    if(error||!user)throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại Admin.');
    currentUserId=user.id;
    const {data:p,error:pe}=await db.from('nexora_profiles').select('role').eq('user_id',user.id).single();
    if(pe||p?.role!=='admin')throw new Error('Chỉ Admin được dùng chức năng này.');
    return user;
  }

  async function load(q=''){
    const box=$('adminDeleteUserList');
    if(!box)return;
    box.innerHTML='Đang tải...';
    try{
      await ensureAdmin();
      const {data,error}=await db.rpc('nexora_admin_users',{p_search:q||null,p_limit:50});
      if(error)throw error;
      rows=Array.isArray(data)?data:[];
      render();
    }catch(e){say(e?.message||'Không thể tải danh sách User.',true)}
  }

  function render(){
    const box=$('adminDeleteUserList');
    if(!box)return;
    if(!rows.length){box.innerHTML='<div class="empty-state">Không tìm thấy người dùng.</div>';return;}
    box.innerHTML=rows.map(u=>{
      const id=String(u.user_id||'');
      const isSelf=id===currentUserId;
      const isAdmin=String(u.role||'').toLowerCase()==='admin';
      const disabled=isSelf||isAdmin;
      const why=isSelf?'Đây là Admin đang đăng nhập':isAdmin?'Không thể xóa tài khoản Admin':'';
      return `<div class="admin-delete-user-row">
        <div class="admin-delete-user-info">
          <strong>${esc(u.display_name||'Game thủ')}</strong>
          <small>${esc(u.email||id)}</small>
          ${why?`<small>${esc(why)}</small>`:''}
        </div>
        <button class="ghost small admin-delete-user-btn" type="button" data-delete-user="${esc(id)}" data-delete-name="${esc(u.display_name||u.email||'User')}" ${disabled?'disabled':''}>🗑️ Xóa</button>
      </div>`;
    }).join('');

    box.querySelectorAll('[data-delete-user]').forEach(btn=>{
      btn.addEventListener('click',()=>removeUser(btn.dataset.deleteUser,btn.dataset.deleteName,btn));
    });
  }

  async function removeUser(id,name,btn){
    if(!id)return;
    if(!confirm(`XÓA VĨNH VIỄN tài khoản “${name}”?\n\nTài khoản đăng nhập của User sẽ bị xóa và thao tác này không thể hoàn tác.`))return;
    const typed=prompt(`Để xác nhận, nhập XOA để xóa “${name}”.`,'');
    if(String(typed||'').trim().toUpperCase()!=='XOA')return;

    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Đang xóa...';
    try{
      await ensureAdmin();
      const {data,error}=await db.functions.invoke('nexora-admin-delete-user',{
        body:{target_user_id:id}
      });
      if(error){
        let detail='';
        try{
          if(error.context && typeof error.context.json==='function'){
            const body=await error.context.json();
            detail=body?.detail||body?.error||'';
          }
        }catch(_e){}
        throw new Error(detail||error.message||'Edge Function trả về lỗi.');
      }
      if(data?.error)throw new Error(data.detail||data.error);
      alert(data?.message||'Đã xóa tài khoản User ✓');
      await load($('adminDeleteUserSearch')?.value.trim()||'');
      try{$('refreshAdminUsers')?.click()}catch(_e){}
    }catch(e){
      console.error('Delete user:',e);
      say(e?.message||'Không thể xóa tài khoản.',true);
    }finally{
      if(btn?.isConnected){btn.disabled=false;btn.textContent=old}
    }
  }

  function bind(){
    if(!$('adminDeleteUserList'))return;
    $('refreshAdminDeleteUsers')?.addEventListener('click',()=>load($('adminDeleteUserSearch')?.value.trim()||''));
    let timer;
    $('adminDeleteUserSearch')?.addEventListener('input',e=>{
      clearTimeout(timer);
      timer=setTimeout(()=>load(e.target.value.trim()),300);
    });
    load();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();
