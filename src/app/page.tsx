'use client';

import Image from "next/image";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useAuth, useUser, useFirestore } from "@/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

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

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
        // If user is admin, redirect to admin dashboard, else to customer dashboard
        const userDocRef = doc(firestore, "users", user.uid);
        getDoc(userDocRef).then(docSnap => {
            if (docSnap.exists() && docSnap.data().role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/dashboard');
            }
        });
    }
  }, [user, isUserLoading, router, firestore]);

    const handlePostLogin = async (loggedInUser: User) => {
        if (!firestore) return;

        const userDocRef = doc(firestore, "users", loggedInUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            toast({
                title: "Setting up your account...",
                description: "Creating database entries for the first time.",
            });

            // Special case for your admin UID
            const isAdminUser = loggedInUser.uid === '1PImCPdQ6AfYU412d2o6tKFjpte2';
            const userRole = isAdminUser ? 'admin' : 'customer';

            // 1. Create a new company document in Firestore
            const companyRef = await addDoc(collection(firestore, "companies"), {
                name: "Default Company",
                orgNumber: "000000000",
                companyType: "other",
                contactEmail: loggedInUser.email,
                contactPhone: "N/A",
                contactPerson: {
                    firstName: "Admin",
                    lastName: "User",
                },
                billingAddress: { street: "", zip: "", city: "", country: "Norway" },
                visitingAddress: { street: "", zip: "", city: "", country: "Norway" },
                shippingAddresses: [],
                pricing: { freeShippingThreshold: 0, hasCustomPricing: false, discountPercentage: 0 },
                active: true,
                approved: true,
                registeredAt: serverTimestamp(),
                approvedAt: serverTimestamp(),
                approvedBy: "system",
                adminNotes: "Automatically created for existing auth user."
            });

            // 2. Create the user document in Firestore
            await setDoc(userDocRef, {
                role: userRole,
                companyId: companyRef.id,
                email: loggedInUser.email,
                firstName: "Admin",
                lastName: "User",
                phone: "N/A",
                approved: true,
                active: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                notificationSettings: { emailNotifications: true, inAppNotifications: true, orderUpdates: true, invoiceUpdates: true, stockAlerts: false },
                permissions: { canManageProducts: isAdminUser, canManageOrders: isAdminUser, canManageStock: isAdminUser, canViewReports: isAdminUser }
            });
        } else {
             await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
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
      // The useEffect will handle the redirect after state update
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

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  if(user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <p>Redirecting...</p>
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
