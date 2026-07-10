-- 관리자 기능 활성화: User.role 영속화 (@Transient → @Column 전환과 세트)
-- 적용: 2026-06-11, Supabase 프로젝트 kgpkcvuawbpgdcyykfdk
-- 관리자 지정 예: UPDATE public.users SET role = 'ADMIN' WHERE email = '<관리자 이메일>';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role varchar NOT NULL DEFAULT 'USER';
