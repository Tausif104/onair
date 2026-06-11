"use client";

import { useActionState } from "react";
import { Tv, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { login, signup, type AuthState } from "@/app/actions/auth";

export function AuthForm() {
  const [loginState, loginAction, loginPending] = useActionState<AuthState, FormData>(
    login,
    undefined,
  );
  const [signupState, signupAction, signupPending] = useActionState<AuthState, FormData>(
    signup,
    undefined,
  );

  return (
    <Card className="w-full max-w-sm border-white/10 bg-card/70 shadow-2xl shadow-black/40 backdrop-blur-xl">
      <CardHeader className="text-center">
        <div className="mx-auto mb-1 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-lg shadow-primary/40">
            <Tv className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl tracking-[0.12em] text-primary">
            STREAMLY
          </span>
        </div>
        <CardTitle className="text-base font-normal text-muted-foreground">
          Your playlists. Your streams. In the browser.
        </CardTitle>
        <CardDescription className="sr-only">Sign in or create an account</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Sign up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form action={loginAction} className="space-y-3">
              <Field id="login-email" label="Email" name="email" type="email" autoComplete="email" />
              <Field
                id="login-password"
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
              />
              {loginState?.error && <ErrorText>{loginState.error}</ErrorText>}
              <Button type="submit" className="w-full" disabled={loginPending}>
                {loginPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form action={signupAction} className="space-y-3">
              <Field id="signup-name" label="Name (optional)" name="name" autoComplete="name" required={false} />
              <Field id="signup-email" label="Email" name="email" type="email" autoComplete="email" />
              <Field
                id="signup-password"
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                hint="At least 8 characters"
              />
              {signupState?.error && <ErrorText>{signupState.error}</ErrorText>}
              <Button type="submit" className="w-full" disabled={signupPending}>
                {signupPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  name,
  type = "text",
  autoComplete,
  hint,
  required = true,
}: {
  id: string;
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} type={type} autoComplete={autoComplete} required={required} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-destructive">{children}</p>;
}
