// 의원 인증용 선거구 선택 데이터 — poly-build의 선관위(후보 등록) 로직 이식.
// 출처: poly-build/src/data/election-data.ts (PROVINCES·PROVINCE_CITIES·경기 상세)
//       + district-map.ts (제9회 지선 2026 획정 · 22대 국선 기준 상세 매핑, 대도시 42곳)
// 원칙: 상세 데이터가 있으면 정확한 선거구 목록, 없으면 시군구 단위 폴백(자유입력 없음).
import { getDistrictMap } from './district-map';

/* ── 의원 유형 ─────────────────────────────────────────── */
export type MemberLevel = 'basic' | 'metro' | 'national';
export const MEMBER_LEVELS: { key: MemberLevel; label: string }[] = [
  { key: 'basic', label: '기초의회의원' },
  { key: 'metro', label: '광역의회의원' },
  { key: 'national', label: '국회의원' },
];
export const levelLabel = (k: string) => MEMBER_LEVELS.find(l => l.key === k)?.label ?? k;

/* ── 광역시/도 17 ──────────────────────────────────────── */
export const PROVINCES = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시',
  '울산광역시', '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도',
  '전북특별자치도', '전라남도', '경상북도', '경상남도', '제주특별자치도',
];

/* ── 경기도 상세 (시도의원/시군구의원 선거구) ─────────── */
interface CityData { name: string; provincialDistricts: string[]; cityDistricts: string[] }
const GYEONGGI_CITIES: CityData[] = [
  { name: '수원시', provincialDistricts: ['수원시제1선거구', '수원시제2선거구', '수원시제3선거구', '수원시제4선거구', '수원시제5선거구'], cityDistricts: ['장안구 가', '장안구 나', '권선구 가', '권선구 나', '팔달구', '영통구 가', '영통구 나'] },
  { name: '성남시', provincialDistricts: ['성남시제1선거구', '성남시제2선거구', '성남시제3선거구'], cityDistricts: ['수정구 가', '수정구 나', '중원구', '분당구 가', '분당구 나', '분당구 다'] },
  { name: '고양시', provincialDistricts: ['고양시제1선거구', '고양시제2선거구', '고양시제3선거구'], cityDistricts: ['덕양구 가', '덕양구 나', '일산동구', '일산서구'] },
  { name: '용인시', provincialDistricts: ['용인시제1선거구', '용인시제2선거구', '용인시제3선거구'], cityDistricts: ['처인구', '기흥구 가', '기흥구 나', '수지구'] },
  { name: '부천시', provincialDistricts: ['부천시제1선거구', '부천시제2선거구'], cityDistricts: ['부천시 가', '부천시 나', '부천시 다', '부천시 라'] },
  { name: '안산시', provincialDistricts: ['안산시제1선거구', '안산시제2선거구'], cityDistricts: ['상록구 가', '상록구 나', '단원구 가', '단원구 나'] },
  { name: '안양시', provincialDistricts: ['안양시제1선거구', '안양시제2선거구'], cityDistricts: ['만안구', '동안구 가', '동안구 나'] },
  { name: '남양주시', provincialDistricts: ['남양주시제1선거구', '남양주시제2선거구'], cityDistricts: ['남양주시 가', '남양주시 나', '남양주시 다'] },
  { name: '화성시', provincialDistricts: ['화성시제1선거구', '화성시제2선거구', '화성시제3선거구'], cityDistricts: ['화성시 가', '화성시 나', '화성시 다', '화성시 라'] },
  { name: '평택시', provincialDistricts: ['평택시제1선거구', '평택시제2선거구'], cityDistricts: ['평택시 가', '평택시 나', '평택시 다'] },
  { name: '의정부시', provincialDistricts: ['의정부시제1선거구', '의정부시제2선거구'], cityDistricts: ['의정부시 가', '의정부시 나'] },
  { name: '시흥시', provincialDistricts: ['시흥시제1선거구', '시흥시제2선거구'], cityDistricts: ['시흥시 가', '시흥시 나', '시흥시 다'] },
  { name: '파주시', provincialDistricts: ['파주시선거구'], cityDistricts: ['파주시 가', '파주시 나'] },
  { name: '김포시', provincialDistricts: ['김포시선거구'], cityDistricts: ['김포시 가', '김포시 나'] },
  { name: '광명시', provincialDistricts: ['광명시선거구'], cityDistricts: ['광명시 가', '광명시 나'] },
  { name: '광주시', provincialDistricts: ['광주시선거구'], cityDistricts: ['광주시 가', '광주시 나'] },
  { name: '군포시', provincialDistricts: ['군포시선거구'], cityDistricts: ['군포시 가', '군포시 나'] },
  { name: '하남시', provincialDistricts: ['하남시선거구'], cityDistricts: ['하남시'] },
  { name: '오산시', provincialDistricts: ['오산시선거구'], cityDistricts: ['오산시'] },
  { name: '이천시', provincialDistricts: ['이천시선거구'], cityDistricts: ['이천시'] },
  { name: '안성시', provincialDistricts: ['안성시선거구'], cityDistricts: ['안성시'] },
  { name: '구리시', provincialDistricts: ['구리시선거구'], cityDistricts: ['구리시'] },
  { name: '양주시', provincialDistricts: ['양주시선거구'], cityDistricts: ['양주시'] },
  { name: '포천시', provincialDistricts: ['포천시선거구'], cityDistricts: ['포천시'] },
  { name: '여주시', provincialDistricts: ['여주시선거구'], cityDistricts: ['여주시'] },
  { name: '동두천시', provincialDistricts: ['동두천시·연천군선거구'], cityDistricts: ['동두천시'] },
  { name: '과천시', provincialDistricts: ['과천시·의왕시선거구'], cityDistricts: ['과천시'] },
  { name: '의왕시', provincialDistricts: ['과천시·의왕시선거구'], cityDistricts: ['의왕시'] },
];

/* ── 시도 → 시군구 ─────────────────────────────────────── */
const SEOUL_GUCHEONG = [
  '종로구', '중구', '용산구', '성동구', '광진구', '동대문구', '중랑구', '성북구', '강북구',
  '도봉구', '노원구', '은평구', '서대문구', '마포구', '양천구', '강서구', '구로구', '금천구',
  '영등포구', '동작구', '관악구', '서초구', '강남구', '송파구', '강동구',
];
export const PROVINCE_CITIES: Record<string, string[]> = {
  '서울특별시': SEOUL_GUCHEONG,
  '경기도': GYEONGGI_CITIES.map(c => c.name),
  '인천광역시': ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
  '부산광역시': ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
  '대구광역시': ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
  '광주광역시': ['동구', '서구', '남구', '북구', '광산구'],
  '대전광역시': ['동구', '중구', '서구', '유성구', '대덕구'],
  '울산광역시': ['중구', '남구', '동구', '북구', '울주군'],
  '세종특별자치시': ['세종시'],
  '강원특별자치도': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
  '충청북도': ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
  '충청남도': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
  '전북특별자치도': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
  '전라남도': ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
  '경상북도': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
  '경상남도': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
  '제주특별자치도': ['제주시', '서귀포시'],
};

/* ── 선거구 목록 (유형·시도·시군구 → 선택지) ───────────── */
/**
 * poly-build getDistricts 로직 확장판:
 *  · district-map.ts 상세(대도시 42곳)가 있으면 그 선거구 목록을 그대로 쓴다.
 *  · 경기도는 election-data 상세로 폴백.
 *  · 그 외에는 시군구 단위 폴백([city]) — 자유입력은 두지 않는다.
 */
export function getDistrictOptions(level: MemberLevel, province: string, city: string): string[] {
  const map = getDistrictMap(province, city);

  if (level === 'national') {
    if (map) {
      const uniq = Array.from(new Set([...Object.values(map.provincial), ...Object.values(map.city)]));
      if (uniq.length > 0) return uniq.sort();
    }
    return [city];
  }

  if (level === 'metro') {
    if (map && Object.keys(map.provincial).length > 0) return Object.keys(map.provincial);
    if (province === '경기도') {
      const c = GYEONGGI_CITIES.find(x => x.name === city);
      if (c && c.provincialDistricts.length > 0) return c.provincialDistricts;
    }
    return [city];
  }

  // basic — 기초의회
  if (map && Object.keys(map.city).length > 0) return Object.keys(map.city);
  if (province === '경기도') {
    const c = GYEONGGI_CITIES.find(x => x.name === city);
    if (c && c.cityDistricts.length > 0) return c.cityDistricts;
  }
  return [city];
}

/** 저장용 지역구 문자열 — "경기도 고양시 고양시제1선거구" / 폴백이면 "강원특별자치도 춘천시" */
export function formatDistrict(province: string, city: string, district: string): string {
  return district === city ? `${province} ${city}` : `${province} ${city} ${district}`;
}
