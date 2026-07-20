// POLY Profile 공용 모듈 (네오익스 통합 계정)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const supabase = createClient(
  'https://nroddjekdjwnwguwkudl.supabase.co',
  'sb_publishable_Uygr7NmVn1wmqopNrb4FRw_CRWw7Xeg'
);
export const SERVICE = { key: 'poly-profile', name: '폴리 프로필' };

// ── 인증 ─────────────────────────────────────────────
export async function kakaoLogin(returnTo) {
  await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: returnTo || (window.location.origin + window.location.pathname),
      scopes: 'profile_nickname account_email',
    },
  });
}
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session || null;
}
export function onAuth(cb) {
  supabase.auth.onAuthStateChange(async (_e, s) => {
    if (s?.user) {
      try { await supabase.rpc('record_membership', { p_service_key: SERVICE.key, p_service_name: SERVICE.name }); } catch {}
    }
    cb(s || null);
  });
}
/* scope:'local' — 앱 웹뷰에서 열릴 때 global 이면 네이티브 앱 세션까지 폐기된다 */ export async function logout() { await supabase.auth.signOut({ scope: 'local' }); }

// ── 한글 이름 → 로마자 slug ───────────────────────────
const CHO = ['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const JUNG = ['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const JONG = ['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
const SURNAME = {'김':'kim','이':'lee','박':'park','최':'choi','정':'jung','강':'kang','조':'cho','윤':'yoon','장':'jang','임':'lim','한':'han','오':'oh','서':'seo','신':'shin','권':'kwon','황':'hwang','안':'ahn','송':'song','전':'jeon','홍':'hong','유':'yoo','고':'ko','문':'moon','양':'yang','손':'son','배':'bae','백':'baek','허':'heo','남':'nam','심':'sim','노':'noh','하':'ha','곽':'kwak','성':'sung','차':'cha','주':'joo','우':'woo','구':'koo','민':'min','류':'ryu','나':'na','진':'jin','지':'ji','엄':'uhm','채':'chae','원':'won','천':'chun','방':'bang','공':'kong','현':'hyun','함':'ham','변':'byun','염':'yeom','여':'yeo','추':'chu','도':'do','소':'so','석':'seok','선':'sun','설':'seol','마':'ma','길':'gil','연':'yeon','위':'wi','표':'pyo','명':'myung','기':'ki','반':'ban','라':'ra','왕':'wang','금':'keum','옥':'ok','육':'yook','인':'in','맹':'maeng','제':'je','모':'mo','탁':'tak'};
function romanChar(ch) {
  const code = ch.charCodeAt(0);
  if (code < 0xAC00 || code > 0xD7A3) return /[a-zA-Z0-9]/.test(ch) ? ch.toLowerCase() : '';
  const i = code - 0xAC00;
  return CHO[Math.floor(i/588)] + JUNG[Math.floor((i%588)/28)] + JONG[i%28];
}
export function romanize(name) {
  name = (name || '').trim();
  if (!name) return '';
  let out = '';
  const chars = [...name];
  chars.forEach((ch, idx) => {
    if (idx === 0 && chars.length >= 2 && SURNAME[ch]) out += SURNAME[ch];
    else out += romanChar(ch);
  });
  return out.slice(0, 24);
}

// slug 중복 시 숫자 붙여 가용 slug 반환
export async function availableSlug(base) {
  base = (base || '').replace(/[^a-z0-9_-]/g, '') || 'profile';
  for (let i = 0; i < 50; i++) {
    const s = i === 0 ? base : base + (i + 1);
    const { data } = await supabase.from('poly_pages').select('id').eq('slug', s).maybeSingle();
    if (!data) return s;
  }
  return base + Date.now().toString(36);
}

// ── 데이터 ────────────────────────────────────────────
export async function myRole() {
  const s = await getSession();
  if (!s) return null;
  const { data } = await supabase.from('poly_users').select('role').eq('user_id', s.user.id).maybeSingle();
  return data?.role || null;
}
export async function myProfile() {
  const s = await getSession();
  if (!s) return null;
  const { data } = await supabase.from('poly_pages').select('*').eq('owner', s.user.id).maybeSingle();
  return data || null;
}
export async function profileBySlug(slug) {
  const { data } = await supabase.from('poly_pages').select('*').eq('slug', slug).maybeSingle();
  return data || null;
}

// ── 업로드 ────────────────────────────────────────────
export async function uploadTo(bucket, file, prefix) {
  const s = await getSession();
  if (!s) throw new Error('로그인이 필요합니다');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${s.user.id}/${prefix}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}
export function publicUrl(bucket, path) {
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// ── 기본 블록 구성 (김수진 템플릿) ──────────────────────
export const DEFAULT_BLOCKS = [
  { type: 'pledges', hidden: false, data: { summary: '', items: [] } },   // items:[{title,percent,status,memo}] status: done|ing|ready
  { type: 'complaints', hidden: false, data: { items: [] } },             // items:[{title,meta,status}] status: ing|ok
  { type: 'gallery', hidden: false, data: { items: [] } },                // items:[{photo_path,caption,date}]
  { type: 'guestbook', hidden: false, data: {} },
];
export const BLOCK_NAMES = { pledges: '공약 진행도', complaints: '해결 중인 민원', gallery: '활동', guestbook: '방명록' };

export const $ = (sel, el) => (el || document).querySelector(sel);
export const $$ = (sel, el) => [...(el || document).querySelectorAll(sel)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
