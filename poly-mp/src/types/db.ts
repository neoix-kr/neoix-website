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
export interface MpCase {
  id: string;
  created_at: string;
  contact_id: string | null;
  title: string;
  category: string;
  body: string | null;
  status: CaseStatus;
  resolved_at: string | null;
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
