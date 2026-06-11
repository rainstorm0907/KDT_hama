import { PriceCompareWorkspace } from '../PriceCompareWorkspace';

type MyPagePriceCompareTabProps = {
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
};

export function MyPagePriceCompareTab({
  isLoggedIn = false,
  onLoginRequired,
}: MyPagePriceCompareTabProps) {
  return (
    <div className="min-w-0 overflow-visible">
      <PriceCompareWorkspace
        mode="page"
        isLoggedIn={isLoggedIn}
        onLoginRequired={onLoginRequired}
      />
    </div>
  );
}
