import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40">
      <div className="mx-auto grid w-[350px] gap-6">
        <div className="grid gap-2 text-center">
            <div className="flex justify-center">
                <Logo />
            </div>
          <h1 className="text-3xl font-bold font-headline">Forgot Password</h1>
          <p className="text-balance text-muted-foreground">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
        </div>
        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                Send Reset Link
              </Button>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center text-sm">
          Remember your password?{" "}
          <Link href="/" className="underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
