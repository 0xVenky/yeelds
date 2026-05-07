import { WalletButton } from "./WalletButton";

export function TopBar() {
  return (
    <div
      className="flex items-center justify-end px-4 sm:px-6 h-14 shrink-0"
      style={{ backgroundColor: "var(--surface-container-low)" }}
    >
      <WalletButton />
    </div>
  );
}
