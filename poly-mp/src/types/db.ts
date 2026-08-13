// 폴리 오피스 — mp_ 테이블 행 타입 (poly-mp/mp-schema-p0.sql 과 1:1)

export interface Profile {
  id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface MpMember {
  user_id: string;
  name: string;
  /** 의원 유형 — basic(기초의회) | metro(광역의회) | national(국회) */
  level: string | null;
  position: string | null;
  district: string | null;
  party: string | null;
  photo_url: string | null;
  committee_id: string | null;
  plan: string | null;
  status: 'pending' | 'active' | 'suspended';
}

export type PostCategory = 'assembly' | 'district' | 'press' | 'event' | 'activity';
export interface MpPost {
  id: string;
  owner_user_id: string;
  created_at: string;
  body: string;
  category: PostCategory;
  event_at: string | null;
  place: string | null;
  media: { path: string; w?: number; h?: number }[];
}

export interface MpSchedule {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  place: string | null;
  kind: 'assembly' | 'district' | 'meeting' | 'etc';
  post_id: string | null;
  memo: string | null;
}

export interface MpContact {
  id: string;
  created_at: string;
  name: string;
  phone: string | null;
  phone_hash: string | null;
  title: string | null;
  memo: string | null;
  tags: string[];
  favorite: boolean;
  /** 연락처 사진 — mp-media 버킷 경로 */
  photo_path: string | null;
  email: string | null;
  /** 직장·직업 */
  company: string | null;
  /** 알게 된 시기 (YYYY-MM-DD) */
  met_at: string | null;
  /** 알게 된 경위 — 어디서·누구 소개로 */
  met_context: string | null;
  birthday: string | null;
  /** 거주 지역(동 단위) */
  address: string | null;
  /** 관계 친밀도 -2~2 (조직 우호도와 같은 스케일, null=미평가) */
  closeness: number | null;
}

export interface MpOrg {
  id: string;
  name: string;
  kind: 'group' | 'company' | 'gov' | 'media' | 'party' | 'etc';
  region: string | null;
  memo: string | null;
  friendly: number | null;
}

export interface MpContactOrg {
  contact_id: string;
  org_id: string;
  role: string | null;
}

export type CaseStatus = 'open' | 'progress' | 'resolved' | 'closed';
/** 접수 경로 — 직접(사적으로) 받은 민원 기록용 */
export type CaseChannel = 'call' | 'sms' | 'kakao' | 'visit' | 'etc';
export interface MpCase {
  id: string;
  created_at: string;
  contact_id: string | null;
  title: string;
  category: string;
  body: string | null;
  status: CaseStatus;
  resolved_at: string | null;
  /** 문자·카톡 캡처 등 첨부 (mp-media 버킷) */
  media: { path: string; w?: number; h?: number }[];
  channel: CaseChannel | null;
}

export interface MpMeeting {
  id: string;
  contact_id: string | null;
  case_id: string | null;
  met_at: string;
  place: string | null;
  summary: string | null;
  audio_path: string | null;
}

export interface DonorSummary {
  phone_hash: string;
  cnt: number;
  total: number;
  last_at: string | null;
}
