// 기도의 동반자 — 데이터 타입 (pray-setup.sql 스키마와 1:1)

export type PrayerPeriod = 'urgent' | 'week' | 'period'; // 긴급·오늘 / 이번주 / 올해·이번달
export type Visibility = 'private' | 'neighbors' | 'clubs'; // 나만보기 / 이웃 / 클럽
export type NeighborStatus = 'pending' | 'accepted';
export type ClubRole = 'owner' | 'member';

export interface Profile {
  id: string; // = auth.users.id
  display_name: string;
  avatar_url: string | null;
  church: string | null;
  phone_hash: string | null; // 친구찾기 매칭용 (원문 전화번호는 저장 안 함)
  verse: string | null;               // 좋아하는 말씀 한 구절
  region: string | null;              // 우리동네
  sensitive_agreed_at: string | null; // 종교정보(민감정보) 별도 동의 시각 — 개보법 23조
  is_premium: boolean;                // 프리미엄(광고 제거) 구독 여부
  premium_until: string | null;       // 구독 만료 시각
  created_at: string;
}

export interface Prayer {
  id: string;
  author_id: string;
  title: string;
  body: string | null;
  period: PrayerPeriod;
  visibility: Visibility;
  due_date: string | null; // 기한 (긴급/이번주 정렬)
  answered_at: string | null; // 응답된 기도 표시
  created_at: string;
  updated_at: string;
}

// 조인 결과: 기도제목 + 작성자 + (내 기도함/오늘 기도 여부)
export interface PrayerWithMeta extends Prayer {
  author?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
  in_my_box?: boolean;
  prayed_today?: boolean;
  club_name?: string | null;
}

export interface Neighbor {
  user_id: string;
  neighbor_id: string;
  status: NeighborStatus;
  created_at: string;
}

export interface Club {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  join_code: string;
  created_at: string;
}

export interface ClubMember {
  club_id: string;
  user_id: string;
  role: ClubRole;
  joined_at: string;
}

export interface CommunityPost {
  id: string;
  author_id: string;
  is_anonymous: boolean;
  title: string;
  body: string;
  amen_count: number;
  comment_count: number;
  created_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  author_id: string;
  is_anonymous: boolean;
  body: string;
  created_at: string;
}
