/* ============================================================
   MODERATION — shared bot-deterrence + bad-content filter for
   every public-write form (signup, pledge, journal, blog).
   This is a pragmatic first line of defense, not a complete
   trust & safety system — see README-SETUP.md for how to
   harden it further (Supabase CAPTCHA, a real moderation API).
   ============================================================ */

/* ---------- 1. bad-content filter ----------
   Blocks clearly abusive language and obvious spam patterns.
   Keep this list short and generic on purpose — expand it in
   one place and every form on the site picks it up. */
const BLOCKED_TERMS = [
  'fuck','shit','bitch','asshole','cunt','faggot','nigger','nigga',
  'retard','whore','slut','rape','kill yourself','kys'
];

const SPAM_PATTERNS = [
  /\bhttps?:\/\/\S+.*\bhttps?:\/\/\S+/i,          // 2+ links in one field
  /\b(viagra|crypto\s?airdrop|forex signals|make money fast|click here now|onlyfans|free followers|bet(ting)?\s?site)\b/i,
  /(.)\1{7,}/,                                     // "aaaaaaaa" style flooding
  /[A-Z]{12,}/                                      // long ALL-CAPS runs
];

function moderateText(text){
  const t = (text || '').trim();
  if(!t) return { ok:false, reason:'This field is empty.' };

  const lower = t.toLowerCase();
  for(const term of BLOCKED_TERMS){
    // whole-word match so "class" doesn't trip on substrings, etc.
    const re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b', 'i');
    if(re.test(lower)){
      return { ok:false, reason:"That contains language we don't allow here. Please rewrite it." };
    }
  }
  for(const pattern of SPAM_PATTERNS){
    if(pattern.test(t)){
      return { ok:false, reason:'That looks like spam (links, flooding, or promo text). Please rewrite it.' };
    }
  }
  return { ok:true };
}

/* ---------- 2. honeypot field ----------
   Inject a visually-hidden field real users never touch.
   Any bot that autofills every input on a form fills it in,
   which is our signal to silently reject the submission. */
function injectHoneypot(formEl){
  if(!formEl || formEl.querySelector('.hp-field')) return;
  const wrap = document.createElement('div');
  wrap.className = 'hp-field';
  wrap.style.cssText = 'position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;';
  wrap.innerHTML = `<label>Leave this field empty<input type="text" tabindex="-1" autocomplete="off"></label>`;
  formEl.appendChild(wrap);
  formEl.dataset.hpRenderedAt = Date.now();
}
function honeypotTripped(formEl){
  if(!formEl) return false;
  const hp = formEl.querySelector('.hp-field input');
  if(hp && hp.value.trim() !== '') return true;               // hidden field got filled -> bot
  const renderedAt = Number(formEl.dataset.hpRenderedAt || 0);
  if(renderedAt && Date.now() - renderedAt < 2500) return true; // submitted too fast for a human
  return false;
}

/* ---------- 3. photo upload helpers ----------
   Shared by journal.html and blog.html. Validates client-side for
   fast feedback; assets/../supabase-schema.sql enforces the same
   type/size limits on the bucket itself, so this can't be bypassed
   by someone calling the storage API directly. */
const ALLOWED_IMAGE_TYPES = ['image/png','image/jpeg','image/webp','image/gif'];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB, matches the bucket's file_size_limit

function validateImageFile(file){
  if(!file) return { ok:false, reason:'No file selected.' };
  if(!ALLOWED_IMAGE_TYPES.includes(file.type)){
    return { ok:false, reason:'Please choose a PNG, JPEG, WEBP, or GIF image.' };
  }
  if(file.size > MAX_IMAGE_BYTES){
    return { ok:false, reason:'That image is over 5MB — please choose a smaller one.' };
  }
  return { ok:true };
}

function sanitizeFilename(name){
  const parts = (name || 'image').split('.');
  const ext = parts.length > 1 ? parts.pop().toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5) : 'jpg';
  const base = parts.join('.').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,40) || 'image';
  return `${base}.${ext || 'jpg'}`;
}

/* Uploads to the shared "media" bucket under `${folder}/${userId}/…`
   and returns the public URL, or throws with a friendly message. */
async function uploadPhoto(file, folder, userId){
  const check = validateImageFile(file);
  if(!check.ok) throw new Error(check.reason);
  const path = `${folder}/${userId}/${Date.now()}-${sanitizeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600', upsert: false, contentType: file.type
  });
  if(uploadError) throw new Error(uploadError.message || 'Upload failed — please try again.');
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
