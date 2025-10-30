'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useAuth } from "@/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const auth = useAuth();
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
    if (!auth) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Firebase is not initialized.",
        });
        return;
    }

    toast({
        title: "Sending reset link...",
        description: "Please wait.",
    });

    try {
      await sendPasswordResetEmail(auth, data.email);
      toast({
        title: "Password Reset Email Sent",
        description: "Please check your inbox for a link to reset your password.",
      });
      form.reset();
    } catch (error: any) {
      console.error("Forgot Password Error:", error);
      let description = "An unknown error occurred. Please try again.";
       if (error.code === 'auth/user-not-found') {
        description = "No user found with this email address.";
      } else {
        description = error.message || "Could not send reset email.";
      }
      toast({
          variant: "destructive",
          title: "Error",
          description: description,
      });
    }
  };


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
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                            type="email"
                            placeholder="m@example.com"
                            required
                            {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            </Form>
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
