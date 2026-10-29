import { RequireAuth } from "@/components/auth/RequireAuth";
import { FocusProvider } from "@/components/focus/FocusProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <FocusProvider>
      <RequireAuth>{children}</RequireAuth>
    </FocusProvider>
  );
}
