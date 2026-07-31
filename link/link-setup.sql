-- ============================================================
-- 네오익스 링크인바이오 (neoix.kr/link/{slug}) — Supabase 셋업
-- 공개 읽기 / 어드민(is_admin)만 쓰기. NEOIX 공용 프로젝트에서 1회 실행.
-- ============================================================

create table if not exists link_pages (
  slug       text primary key,               -- URL 슬러그 (영문/숫자/하이픈)
  title      text not null,                  -- 페이지 제목 (앱 이름)
  bio        text,                           -- 한 줄 소개
  avatar_url text,                           -- 프로필 이미지 URL
  links      jsonb not null default '[]',    -- [{label, sub, url}] — url 비면 '준비 중' 비활성
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table link_pages enable row level security;
drop policy if exists "link_pages read"  on link_pages;
drop policy if exists "link_pages write" on link_pages;
create policy "link_pages read"  on link_pages for select using (true);
create policy "link_pages write" on link_pages for all using (is_admin()) with check (is_admin());

-- 시드: 앱별 기본 페이지
insert into link_pages (slug, title, bio, avatar_url, links) values
('swoong', '슈웅', '전 세계 여행 기록', '/link/icon-swoong.png',
 '[{"label":"앱 다운로드","sub":"App Store · 곧 출시","url":""},
   {"label":"네오익스 계정","sub":"하나의 계정으로 모든 서비스","url":"https://neoix.kr/account"}]'::jsonb),
('pray', '프레이위드', '교회 중보기도', '/link/icon-pray.png',
 '[{"label":"앱 다운로드","sub":"App Store · 곧 출시","url":""},
   {"label":"네오익스 계정","sub":"하나의 계정으로 모든 서비스","url":"https://neoix.kr/account"}]'::jsonb),
('poly', '폴리', '우리 지역 정치, 쉽게', '/link/icon-poly.png',
 '[{"label":"앱 다운로드","sub":"App Store · 곧 출시","url":""},
   {"label":"네오익스 계정","sub":"하나의 계정으로 모든 서비스","url":"https://neoix.kr/account"}]'::jsonb),
('neoix', 'NEOIX', '사람들이 매일 쓰는 서비스를 만듭니다', '',
 '[{"label":"슈웅","sub":"전 세계 여행 기록","url":"https://neoix.kr/link/swoong"},
   {"label":"프레이위드","sub":"교회 중보기도","url":"https://neoix.kr/link/pray"},
   {"label":"폴리","sub":"우리 지역 정치, 쉽게","url":"https://neoix.kr/link/poly"},
   {"label":"OGX 찬양팀","sub":"악보·반주·콘티","url":"https://neoix.kr/ogx"}]'::jsonb)
on conflict (slug) do nothing;

select slug, title from link_pages;
