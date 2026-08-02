import { AccountScreen } from "@/components/member/screens/account-screen";

export default function AccountPreview() {
  return (
    <AccountScreen
      firstName="Sample"
      email="sample@example.com"
      programme="Sub-90"
      subscription={null}
      base="/control-preview/app"
    />
  );
}
