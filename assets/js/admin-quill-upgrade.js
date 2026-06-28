/* SA-UPI Admin v13: modern Quill toolbar defaults for long-form CMS editing. */
(function(){
  if(!window.Quill || window.__SAUPI_QUILL_UPGRADED__) return;
  window.__SAUPI_QUILL_UPGRADED__ = true;
  const OriginalQuill = window.Quill;
  const modernToolbar = [
    [{ header: [1, 2, 3, 4, false] }, { size: ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }, { list: 'check' }],
    [{ align: [] }, { indent: '-1' }, { indent: '+1' }],
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],
    ['clean']
  ];
  function shouldUpgrade(target){
    const id = typeof target === 'string' ? target.replace('#','') : target && target.id;
    return ['infoEditor','wikiEditor','jobEditor'].includes(id);
  }
  function addUtilityButtons(quill){
    const toolbar = quill.getModule && quill.getModule('toolbar');
    if(!toolbar || !toolbar.container || toolbar.container.dataset.saupiEnhanced) return;
    toolbar.container.dataset.saupiEnhanced = 'true';
    const group = document.createElement('span');
    group.className = 'ql-formats saupi-toolbar-extra';
    const buttons = [
      ['undo','↶','Undo'],
      ['redo','↷','Redo'],
      ['fullscreen','⛶','Mode layar penuh']
    ];
    buttons.forEach(([name,label,title])=>{
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='ql-saupi-'+name;
      btn.title=title;
      btn.textContent=label;
      btn.addEventListener('click',()=>{
        if(name==='undo') quill.history && quill.history.undo();
        if(name==='redo') quill.history && quill.history.redo();
        if(name==='fullscreen') document.body.classList.toggle('admin-editor-fullscreen');
      });
      group.appendChild(btn);
    });
    toolbar.container.appendChild(group);
  }
  function EnhancedQuill(target, options){
    const opts = Object.assign({}, options || {});
    if(shouldUpgrade(target)){
      opts.theme = opts.theme || 'snow';
      opts.modules = Object.assign({}, opts.modules || {});
      opts.modules.history = Object.assign({ delay: 800, maxStack: 100, userOnly: true }, opts.modules.history || {});
      if(!opts.modules.toolbar) opts.modules.toolbar = modernToolbar;
    }
    const quill = new OriginalQuill(target, opts);
    if(shouldUpgrade(target)) setTimeout(()=>addUtilityButtons(quill), 0);
    return quill;
  }
  Object.setPrototypeOf(EnhancedQuill, OriginalQuill);
  EnhancedQuill.prototype = OriginalQuill.prototype;
  ['register','import','find','debug'].forEach(k=>{ if(OriginalQuill[k]) EnhancedQuill[k]=OriginalQuill[k].bind(OriginalQuill); });
  window.Quill = EnhancedQuill;
})();
