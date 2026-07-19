/* ============================================================
   SHARED PAGE CHROME — nav scroll state, mobile menu, reveals
   ============================================================ */
document.addEventListener('DOMContentLoaded', ()=>{
  const headerEl = document.getElementById('site-header');
  if(headerEl){
    const updateHeader = ()=> headerEl.classList.toggle('scrolled', window.scrollY > 20);
    document.addEventListener('scroll', updateHeader, { passive:true });
    updateHeader();

    const navToggle = document.getElementById('nav-toggle');
    if(navToggle){
      navToggle.addEventListener('click', ()=>{
        const open = headerEl.classList.toggle('menu-open');
        navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    document.querySelectorAll('.mobile-menu a').forEach(a=>{
      a.addEventListener('click', ()=> headerEl.classList.remove('menu-open'));
    });
  }

  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold:0.14 });
  document.querySelectorAll('.reveal, .reveal-stagger').forEach(el=> io.observe(el));
});
