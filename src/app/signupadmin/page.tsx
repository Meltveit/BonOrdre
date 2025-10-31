'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

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
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const adminSignupSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type AdminSignupFormValues = z.infer<typeof adminSignupSchema>;

export default function SignupAdminPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<AdminSignupFormValues>({
        resolver: zodResolver(adminSignupSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const onSubmit = async (data: AdminSignupFormValues) => {
        if (!auth || !firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Firebase is not properly initialized.",
            });
            return;
        }
        
        toast({
            title: "Creating Admin Account...",
            description: "Please wait.",
        });

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const userId = userCredential.user.uid;

            // 2. Prepare user data for Firestore
            const userData = {
                id: userId,
                email: data.email,
                firstName: "Admin",
                lastName: "User",
                role: 'admin', // Explicitly set role to admin
                companyId: null, // Admins are not tied to a company
                active: true,
                approved: true, // Admins are pre-approved
                createdAt: serverTimestamp(),
            };

            // 3. Create user document in Firestore
            const userDocRef = doc(firestore, "users", userId);
            setDoc(userDocRef, userData).catch(serverError => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userData
                }));
                throw serverError; // Re-throw to be caught by the outer try-catch
            });

            toast({
                title: "Admin Account Created!",
                description: "You can now log in with your new credentials.",
            });

            router.push("/"); // Redirect to the main login page

        } catch (error: any) {
            let description = error.message || "Could not create your account.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please try logging in instead.";
            }
            
            // Avoid double-toasting for permission errors we handle globally
            if (error.name !== 'FirebaseError' || !error.message.includes('Firestore Security Rules')) {
                 toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: description,
                });
            }
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-muted/40">
            <Card className="mx-auto max-w-sm w-full shadow-xl">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl font-headline">Create Admin Account</CardTitle>
                    <CardDescription>
                        This is a temporary page for initial admin setup.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Admin Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="admin@example.com" {...field} />
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
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Creating...' : 'Create Admin'}
                            </Button>

                            <div className="text-center text-sm">
                                Go back to {" "}
                                <Link href="/" className="underline">
                                    Login
                                </Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}