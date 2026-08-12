// 의원 승격 게이트 — mp_members.status='active' 여야 앱이 열린다 (어드민에서 승격)
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { MpMember } from '../types/db';

interface MemberContextType {
  member: MpMember | null;
  isLoading: boolean;
  /** 승격 신청 (pending 행 생성) */
  apply: (info: { name: string; position?: string; district?: string; party?: string }) => Promise<{ error: any }>;
  refresh: () => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [member, setMember] = useState<MpMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setMember(null); setIsLoading(false); return; }
    const { data } = await supabase.from('mp_members').select('*').eq('user_id', user.id).maybeSingle();
    setMember((data as MpMember) ?? null);
    setIsLoading(false);
  }, [user?.id]);

  // onAuthStateChange 콜백 안에서 부르지 않는다(데드락) — user 변화를 보고 별도 effect에서 조회
  useEffect(() => { setIsLoading(true); refresh(); }, [refresh]);

  const apply = async (info: { name: string; position?: string; district?: string; party?: string }) => {
    if (!user) return { error: new Error('로그인이 필요해요') };
    const { error } = await supabase.from('mp_members').insert({
      user_id: user.id,
      name: info.name,
      position: info.position ?? null,
      district: info.district ?? null,
      party: info.party ?? null,
      status: 'pending',
    });
    if (!error) await refresh();
    return { error };
  };

  return (
    <MemberContext.Provider value={{ member, isLoading, apply, refresh }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (ctx === undefined) throw new Error('useMember must be used within MemberProvider');
  return ctx;
}
