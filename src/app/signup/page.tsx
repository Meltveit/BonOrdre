'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, User } from "firebase/auth";
import { collection, addDoc, doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";


const signupSchema = z.object({
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    companyName: z.string().min(1, { message: "Company name is required." }),
    orgNumber: z.string().min(1, { message: "Organization number is required." }),
    phone: z.string().min(1, { message: "Phone number is required." }),
    address: z.string().min(1, { message: "Street address is required." }),
    postalCode: z.string().min(1, { message: "Postal code is required." }),
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type SignupFormData = z.infer<typeof signupSchema>;


export default function SignupPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            companyName: "",
            orgNumber: "",
            phone: "",
            address: "",
            postalCode: "",
            email: "",
            password: "",
        },
    });

    useEffect(() => {
        if (!isUserLoading && user) {
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

    const onSubmit: SubmitHandler<SignupFormData> = async (data) => {
        if (!auth || !firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Firebase is not initialized.",
            });
            return;
        }

        toast({
            title: "Processing request...",
            description: "Please wait.",
        });

        try {
            // WORKAROUND: If it's the admin user, try to sign in instead of creating a new user.
            // Replace with your actual admin email.
            if (data.email.toLowerCase() === 'admin@example.com' || data.email.toLowerCase() === 'your-admin-email@domain.com') { // IMPORTANT: change this email
                toast({ title: "Admin login attempt..."});
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
                    await handlePostLogin(userCredential.user);
                    return; // Stop execution
                } catch(signInError: any) {
                     // If sign-in fails, we still fall through to the create user logic,
                     // which will likely fail if user exists, but it's a fallback.
                     console.warn("Admin sign-in failed, proceeding to sign-up logic.", signInError);
                }
            }


            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const newUser = userCredential.user;

            // 2. Create a new company document in Firestore
            const companyRef = await addDoc(collection(firestore, "companies"), {
                name: data.companyName,
                orgNumber: data.orgNumber,
                companyType: "other", // Default value
                contactEmail: data.email,
                contactPhone: data.phone,
                contactPerson: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                },
                billingAddress: {
                    street: data.address,
                    zip: data.postalCode,
                    city: "", // Can be added later
                    country: "Norway" // Default value
                },
                visitingAddress: {
                    street: data.address,
                    zip: data.postalCode,
                    city: "",
                    country: "Norway"
                },
                shippingAddresses: [],
                pricing: {
                    freeShippingThreshold: 0,
                    hasCustomPricing: false,
                    discountPercentage: 0
                },
                active: false,
                approved: false,
                registeredAt: serverTimestamp(),
                approvedAt: null,
                approvedBy: null,
                adminNotes: ""
            });

            // 3. Create a new user document in Firestore linked to the company
            await setDoc(doc(firestore, "users", newUser.uid), {
                role: "customer",
                companyId: companyRef.id,
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                approved: false,
                active: true,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
                notificationSettings: {
                    emailNotifications: true,
                    inAppNotifications: true,
                    orderUpdates: true,
                    invoiceUpdates: true,
                    stockAlerts: false
                },
                permissions: {
                    canManageProducts: false,
                    canManageOrders: false,
                    canManageStock: false,
                    canViewReports: false
                }
            });

            toast({
                title: "Account Created!",
                description: "Redirecting you to the dashboard.",
            });

        } catch (error: any) {
            console.error("Signup Error:", error);
            let description = error.message || "Could not create your account.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please try logging in instead."
            }
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: description,
            });
        }
    };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/40 py-12">
      <Card className="mx-auto max-w-lg w-full shadow-xl">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Logo />
            </div>
          <CardTitle className="text-2xl font-headline">Create your B2B Account</CardTitle>
          <CardDescription>
            Enter your information to register for a wholesale account.
            Applications are subject to admin approval.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>First name</FormLabel>
                                <FormControl>
                                <Input placeholder="Max" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lastName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Last name</FormLabel>
                                <FormControl>
                                <Input placeholder="Robinson" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="companyName"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Company Name</FormLabel>
                            <FormControl>
                            <Input placeholder="The Grand Hotel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="orgNumber"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Organization Number</FormLabel>
                                <FormControl>
                                <Input placeholder="987654321" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                <Input placeholder="+47 123 45 678" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Street Address</FormLabel>
                                <FormControl>
                                <Input placeholder="Storgata 15" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="postalCode"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Postal Code</FormLabel>
                                <FormControl>
                                <Input placeholder="0184" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
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
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                            <Input type="password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Creating Account...' : 'Create an account'}
                    </Button>
                </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
