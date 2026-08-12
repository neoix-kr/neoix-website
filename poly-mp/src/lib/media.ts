// 게시물 사진 — mp-media 버킷 업로드/조회 헬퍼
// RLS: {user_id}/ 폴더에만 쓰기 가능(mp-schema-p0.sql §9), 읽기는 공개 버킷.
import { supabase } from './supabase';

const BUCKET = 'mp-media';

// base64 → ArrayBuffer. Hermes 버전별 atob 유무에 기대지 않는 자체 디코더
// (supabase-js RN 업로드는 ArrayBuffer 바디가 공식 권장 경로다).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const len = Math.floor(clean.length * 3 / 4);
  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n1 = B64.indexOf(clean[i]);
    const n2 = B64.indexOf(clean[i + 1] ?? 'A');
    const n3 = B64.indexOf(clean[i + 2] ?? 'A');
    const n4 = B64.indexOf(clean[i + 3] ?? 'A');
    const triplet = (n1 << 18) | (n2 << 12) | (n3 << 6) | n4;
    if (p < len) bytes[p++] = (triplet >> 16) & 0xff;
    if (p < len) bytes[p++] = (triplet >> 8) & 0xff;
    if (p < len) bytes[p++] = triplet & 0xff;
  }
  return bytes.buffer;
}

/** 사진 1장 업로드 → 저장 경로 반환. 경로 규칙: {userId}/{ts}-{i}.jpg (RLS 폴더 검사와 일치) */
export async function uploadPostImage(userId: string, base64: string, index: number): Promise<string> {
  const path = `${userId}/${Date.now()}-${index}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, base64ToArrayBuffer(base64), { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return path;
}

/** 공개 버킷 조회 URL */
export function mediaUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
