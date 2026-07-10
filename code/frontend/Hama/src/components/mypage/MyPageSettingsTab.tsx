import {
  ArrowLeft,
  Bell,
  ChevronRight,
  Clock,
  KeyRound,
  Mail,
  Trash2,
  UserRound,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import {
  changeMyPassword,
  fetchMyProfile,
  updateMyProfile,
  withdrawMe,
} from '../../api/mypageApi';
import { hairline } from '../../styles/hairline';
import { TabHeader } from './MyPageShared';

export type SettingsView =
  | 'main'
  | 'editName'
  | 'editEmail'
  | 'editPassword'
  | 'notificationPreferences'
  | 'keywordAlerts'
  | 'recentData'
  | 'withdrawal';

type MyPageSettingsTabProps = {
  view: SettingsView;
  setView: (view: SettingsView) => void;
  onWithdrawn: () => void;
};

export function MyPageSettingsTab({
  view,
  setView,
  onWithdrawn,
}: MyPageSettingsTabProps) {
  const [displayName, setDisplayName] = useState('');
  const [displayEmail, setDisplayEmail] = useState('');

  useEffect(() => {
    fetchMyProfile()
      .then((profile) => {
        setDisplayName(profile.name ?? '');
        setDisplayEmail(profile.email ?? '');
      })
      .catch(() => undefined);
  }, []);

  if (view === 'editName') {
    return (
      <EditTextView
        title="이름 변경"
        description="프로필에 표시될 이름을 수정합니다."
        currentValue={displayName}
        placeholder="새 이름 입력"
        onBack={() => setView('main')}
        onSave={async (value) => {
          await updateMyProfile({ name: value });
          setDisplayName(value);
          setView('main');
        }}
      />
    );
  }

  if (view === 'editEmail') {
    return (
      <EditTextView
        title="이메일 변경"
        description="로그인에 사용할 이메일을 수정합니다."
        currentValue={displayEmail}
        placeholder="새 이메일 주소 입력"
        type="email"
        onBack={() => setView('main')}
        onSave={async (value) => {
          await updateMyProfile({ email: value });
          setDisplayEmail(value);
          setView('main');
        }}
      />
    );
  }

  if (view === 'editPassword') {
    return <PasswordView onBack={() => setView('main')} />;
  }

  if (view === 'notificationPreferences') {
    return (
      <SettingsPlaceholderView
        title="알림 수신 설정"
        description="최저가, 판매 상태, 새 상품 알림을 받을 방식을 정리합니다."
        icon={<Bell className="h-5 w-5 text-amber-500" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'keywordAlerts') {
    return (
      <SettingsPlaceholderView
        title="키워드 알림 관리"
        description="인기 검색어와 직접 저장한 키워드 알림을 한곳에서 관리할 예정입니다."
        icon={<KeyRound className="h-5 w-5 text-blue-600" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'recentData') {
    return (
      <SettingsPlaceholderView
        title="최근 본 상품 관리"
        description="최근 본 상품 기록 삭제와 보관 기간 설정을 연결할 예정입니다."
        icon={<Clock className="h-5 w-5 text-blue-600" aria-hidden="true" />}
        onBack={() => setView('main')}
      />
    );
  }

  if (view === 'withdrawal') {
    return (
      <WithdrawalView
        onBack={() => setView('main')}
        onWithdrawn={onWithdrawn}
      />
    );
  }

  return (
    <>
      <TabHeader
        title="설정"
        description="계정 정보와 알림 설정을 관리합니다"
      />
      <div className={`rounded-[28px] p-6 ${hairline.panelSoft}`}>
        <SettingsGroup title="프로필">
          <SettingsRow
            icon={<UserRound className="h-4 w-4 text-emerald-600" aria-hidden="true" />}
            label="이름 변경"
            onClick={() => setView('editName')}
          />
          <SettingsRow
            icon={<Mail className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="이메일 변경"
            onClick={() => setView('editEmail')}
          />
          <SettingsRow
            icon={<KeyRound className="h-4 w-4 text-amber-600" aria-hidden="true" />}
            label="비밀번호 변경"
            onClick={() => setView('editPassword')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="알림">
          <SettingsRow
            icon={<Bell className="h-4 w-4 text-amber-500" aria-hidden="true" />}
            label="알림 수신 설정"
            helper="가격, 판매 상태, 새 상품"
            onClick={() => setView('notificationPreferences')}
          />
          <SettingsRow
            icon={<KeyRound className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="키워드 알림 관리"
            helper="관심 검색어 기반"
            onClick={() => setView('keywordAlerts')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="데이터">
          <SettingsRow
            icon={<Clock className="h-4 w-4 text-blue-600" aria-hidden="true" />}
            label="최근 본 상품 관리"
            helper="기록 정리"
            onClick={() => setView('recentData')}
          />
        </SettingsGroup>
        <div className="my-5 h-px bg-[#C9CFDA]" />
        <SettingsGroup title="계정">
          <SettingsRow
            icon={<Trash2 className="h-4 w-4 text-rose-600" aria-hidden="true" />}
            label="회원 탈퇴"
            onClick={() => setView('withdrawal')}
          />
        </SettingsGroup>
      </div>
    </>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className={`mb-3 px-1 text-sm font-black uppercase tracking-widest ${hairline.mutedText}`}>
        {title}
      </p>
      {children}
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  helper,
  onClick,
}: {
  icon?: ReactNode;
  label: string;
  helper?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex w-full items-center justify-between gap-4 rounded-xl px-4 py-3 text-base font-black text-gray-700 transition-colors hover:bg-white ${hairline.focus}`}
    >
      <span className="flex min-w-0 items-center gap-3">
        {icon ? (
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${hairline.control}`}>
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 text-left">
          <span className="block truncate">{label}</span>
          {helper ? (
            <span className={`mt-0.5 block truncate text-xs font-bold ${hairline.quietText}`}>
              {helper}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 text-[#86868B] transition-colors group-hover:text-gray-950"
        aria-hidden="true"
      />
    </button>
  );
}

function SettingsPlaceholderView({
  title,
  description,
  icon,
  onBack,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onBack: () => void;
}) {
  return (
    <>
      <BackHeader title={title} description={description} onBack={onBack} />
      <div className={`rounded-[24px] p-6 ${hairline.panelSoft}`}>
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${hairline.control}`}
          >
            {icon}
          </div>
          <div>
            <p className="text-base font-black text-gray-950">
              백엔드 계정 API 연결 후 저장됩니다
            </p>
            <p className={`mt-2 text-sm font-semibold leading-6 ${hairline.mutedText}`}>
              지금은 화면 흐름을 확인하기 위한 설정 자리입니다. 실제 저장은 사용자 계정 테이블과 알림 API가 연결된 뒤 처리하면 됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function EditTextView({
  title,
  description,
  currentValue,
  placeholder,
  type = 'text',
  onBack,
  onSave,
}: {
  title: string;
  description: string;
  currentValue: string;
  placeholder: string;
  type?: 'text' | 'email';
  onBack: () => void;
  onSave: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState(currentValue);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!value.trim()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave(value.trim());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '변경 내용을 저장하지 못했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BackHeader title={title} description={description} onBack={onBack} />
      <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
        <input
          type={type}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 text-lg font-black outline-none transition-all focus:border-black focus:ring-2 focus:ring-black"
        />
        <button
          type="submit"
          disabled={!value.trim() || isSaving}
          className={`w-full rounded-2xl py-4 text-lg font-black transition-all ${hairline.primaryButton} ${hairline.focus} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {isSaving ? '저장 중...' : '저장하기'}
        </button>
        {errorMessage ? (
          <p className="text-sm font-bold text-rose-600">{errorMessage}</p>
        ) : null}
      </form>
    </>
  );
}

function PasswordView({ onBack }: { onBack: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    if (newPassword !== newPasswordConfirm) {
      setMessage('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await changeMyPassword({
        currentPassword,
        newPassword,
        newPasswordConfirm,
      });
      setMessage(response.message);
      setCurrentPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : '비밀번호를 변경하지 못했습니다.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <BackHeader
        title="비밀번호 변경"
        description="현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다."
        onBack={onBack}
      />
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <PasswordInput
          value={currentPassword}
          onChange={setCurrentPassword}
          placeholder="현재 비밀번호"
        />
        <PasswordInput
          value={newPassword}
          onChange={setNewPassword}
          placeholder="새 비밀번호"
        />
        <PasswordInput
          value={newPasswordConfirm}
          onChange={setNewPasswordConfirm}
          placeholder="새 비밀번호 확인"
        />
        <button
          type="submit"
          disabled={
            isSaving ||
            !currentPassword ||
            !newPassword ||
            !newPasswordConfirm
          }
          className={`w-full rounded-2xl py-4 text-lg font-black ${hairline.primaryButton} ${hairline.focus} disabled:opacity-40`}
        >
          {isSaving ? '변경 중...' : '비밀번호 변경'}
        </button>
        {message ? <p className="text-sm font-bold text-gray-700">{message}</p> : null}
      </form>
    </>
  );
}

function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="password"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-[#C9CFDA] bg-white px-5 py-4 text-lg font-black outline-none focus:border-black focus:ring-2 focus:ring-black"
      required
    />
  );
}

function WithdrawalView({
  onBack,
  onWithdrawn,
}: {
  onBack: () => void;
  onWithdrawn: () => void;
}) {
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleWithdrawal = async () => {
    if (!window.confirm('회원 정보와 저장된 데이터를 삭제하고 탈퇴하시겠습니까?')) {
      return;
    }

    setIsWithdrawing(true);
    setErrorMessage('');
    try {
      await withdrawMe();
      onWithdrawn();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '회원 탈퇴를 처리하지 못했습니다.'
      );
      setIsWithdrawing(false);
    }
  };

  return (
    <>
      <BackHeader
        title="회원 탈퇴"
        description="탈퇴하면 계정과 저장된 사용자 데이터가 삭제됩니다."
        onBack={onBack}
      />
      <div className={`rounded-[24px] p-6 ${hairline.panelSoft}`}>
        <div className="flex items-center gap-3 text-rose-600">
          <Trash2 className="h-5 w-5" aria-hidden="true" />
          <p className="text-sm font-black">탈퇴 후에는 계정을 복구할 수 없습니다.</p>
        </div>
        <button
          type="button"
          onClick={() => void handleWithdrawal()}
          disabled={isWithdrawing}
          className="mt-5 w-full rounded-2xl bg-rose-600 py-4 text-base font-black text-white disabled:opacity-50"
        >
          {isWithdrawing ? '탈퇴 처리 중...' : '회원 탈퇴'}
        </button>
        {errorMessage ? (
          <p className="mt-3 text-sm font-bold text-rose-600">{errorMessage}</p>
        ) : null}
      </div>
    </>
  );
}

function BackHeader({
  title,
  description,
  onBack,
}: {
  title: string;
  description: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-10 flex items-center gap-4">
      <button
        type="button"
        onClick={onBack}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hairline.secondaryButton} ${hairline.focus}`}
        aria-label="설정으로 돌아가기"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <div>
        <h3 className="text-3xl font-black tracking-tight text-gray-950">{title}</h3>
        <p className={`text-base font-semibold ${hairline.mutedText}`}>
          {description}
        </p>
      </div>
    </div>
  );
}
