import { LoginForm } from "@/components/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm rounded-lg border border-border bg-muted p-6">
        <h1 className="font-heading text-2xl font-semibold">Finance Tracker</h1>
        <p className="mt-1 text-sm text-foreground/60">Sign in to see your money.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
