'use client';

import Image from "next/image";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, DocumentSnapshot } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@/lib/definitions";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [authChecked, setAuthChecked] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (isUserLoading || !firestore) return;
    
    const checkUser = async (user: User) => {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
             toast({
                variant: 'destructive',
                title: 'Login Error',
                description: "User data not found."
            });
            auth?.signOut();
            setAuthChecked(true);
            return;
        }

        const userData = userDocSnap.data();

        if (userData.role === 'admin') {
            router.push('/admin');
        } else if (userData.role === 'customer') {
            const companyId = userData.companyId;
            if (!companyId) {
                 toast({
                    variant: 'destructive',
                    title: 'Login Error',
                    description: "Your user is not associated with a company."
                });
                auth?.signOut();
                setAuthChecked(true);
                return;
            }
            const companyDocRef = doc(firestore, "companies", companyId);
            const companyDocSnap = await getDoc(companyDocRef);
            if (companyDocSnap.exists() && companyDocSnap.data().approved) {
                 router.push('/dashboard');
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Account Not Approved',
                    description: "Your account is still awaiting admin approval. Please check back later."
                });
                auth?.signOut();
                setAuthChecked(true); 
            }
        } else {
            // Handle other roles like 'employee' in the future
            toast({
                variant: 'destructive',
                title: 'Login Error',
                description: "Your user role is not configured for login."
            });
            auth?.signOut();
            setAuthChecked(true);
        }
    }

    if (user) {
        checkUser(user);
    } else {
        setAuthChecked(true);
    }

  }, [user, isUserLoading, router, firestore, auth, toast]);

    const handlePostLogin = async (loggedInUser: User) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, "users", loggedInUser.uid);
        try {
            await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error("Failed to update last login time:", error);
             toast({
                variant: "destructive",
                title: "Session Error",
                description: "Could not update your session. Please try again.",
            });
        }
    }

  const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
    if (!auth) return;
    
    toast({
      title: "Logging in...",
      description: "You will be redirected shortly.",
    });

    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      await handlePostLogin(userCredential.user);
      // The useEffect will handle the redirect after state update.
    } catch (error: any) {
      console.error("Login Error:", error);
      let description = "An unknown error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = "Invalid email or password. Please try again.";
      } else {
        description = error.message || "Could not sign you in.";
      }
      toast({
          variant: "destructive",
          title: "Login Failed",
          description: description,
      });
    }
  };

  if (!authChecked || (isUserLoading && !user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex justify-center">
              <Logo />
            </div>
            <h1 className="text-3xl font-headline font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your business account
            </p>
          </div>
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
              <CardDescription>
                Access the B2B portal to manage your orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="m@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center">
                            <FormLabel>Password</FormLabel>
                            <Link
                                href="/forgot-password"
                                className="ml-auto inline-block text-sm underline"
                            >
                                Forgot your password?
                            </Link>
                        </div>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="underline">
              Sign up
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
            <Image
            src={loginImage.imageUrl}
            alt={loginImage.description}
            data-ai-hint={loginImage.imageHint}
            width={1920}
            height={1080}
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        )}
      </div>
    </div>
  );
}
