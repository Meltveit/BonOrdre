'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs, query, limit } from "firebase/firestore";


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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";


const signupSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required." }),
    orgNumber: z.string().min(1, { message: "Organization number is required." }),
    companyType: z.string().min(1, { message: "Company type is required." }),
    
    contactEmail: z.string().email({ message: "Invalid business email address." }),
    contactPhone: z.string().min(1, { message: "Phone number is required." }),
    
    firstName: z.string().min(1, { message: "First name is required." }),
    lastName: z.string().min(1, { message: "Last name is required." }),
    
    visitingAddressStreet: z.string().min(1, { message: "Visiting address is required." }),
    visitingAddressZip: z.string().min(1, { message: "Postal code is required." }),
    visitingAddressCity: z.string().min(1, { message: "City is required." }),

    useVisitingAsBilling: z.boolean().default(false),
    billingAddressStreet: z.string().optional(),
    billingAddressZip: z.string().optional(),
    billingAddressCity: z.string().optional(),

    useBillingAsDelivery: z.boolean().default(false),
    deliveryAddressStreet: z.string().optional(),
    deliveryAddressZip: z.string().optional(),
    deliveryAddressCity: z.string().optional(),

    comments: z.string().optional(),

    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
    acceptTerms: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions." }),
}).superRefine((data, ctx) => {
    if (!data.useVisitingAsBilling) {
        if (!data.billingAddressStreet) ctx.addIssue({ code: "custom", path: ["billingAddressStreet"], message: "Billing address is required." });
        if (!data.billingAddressZip) ctx.addIssue({ code: "custom", path: ["billingAddressZip"], message: "Postal code is required." });
        if (!data.billingAddressCity) ctx.addIssue({ code: "custom", path: ["billingAddressCity"], message: "City is required." });
    }
    if (!data.useBillingAsDelivery) {
        if (!data.deliveryAddressStreet) ctx.addIssue({ code: "custom", path: ["deliveryAddressStreet"], message: "Delivery address is required." });
        if (!data.deliveryAddressZip) ctx.addIssue({ code: "custom", path: ["deliveryAddressZip"], message: "Postal code is required." });
        if (!data.deliveryAddressCity) ctx.addIssue({ code: "custom", path: ["deliveryAddressCity"], message: "City is required." });
    }
});


type SignupFormData = z.infer<typeof signupSchema>;


export default function SignupPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            useVisitingAsBilling: true,
            useBillingAsDelivery: true,
            acceptTerms: false,
        },
    });

    const useVisitingAsBilling = form.watch('useVisitingAsBilling');
    const useBillingAsDelivery = form.watch('useBillingAsDelivery');

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
            title: "Creating your account...",
            description: "Please wait.",
        });

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, data.contactEmail, data.password);
            const newUser = userCredential.user;

            const billingAddress = data.useVisitingAsBilling 
                ? { street: data.visitingAddressStreet, zip: data.visitingAddressZip, city: data.visitingAddressCity, country: "Norway" }
                : { street: data.billingAddressStreet, zip: data.billingAddressZip, city: data.billingAddressCity, country: "Norway" };

            const deliveryAddress = data.useBillingAsDelivery ? billingAddress : { street: data.deliveryAddressStreet, zip: data.deliveryAddressZip, city: data.deliveryAddressCity, country: "Norway" };

            // 2. Create a new company document in Firestore
            const companyData = {
                name: data.companyName,
                orgNumber: data.orgNumber,
                companyType: data.companyType,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                contactPerson: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                },
                visitingAddress: {
                    street: data.visitingAddressStreet,
                    zip: data.visitingAddressZip,
                    city: data.visitingAddressCity,
                    country: "Norway"
                },
                billingAddress: billingAddress,
                shippingAddresses: [deliveryAddress],
                pricing: {},
                active: false,
                approved: false,
                registeredAt: serverTimestamp(),
                approvedAt: null,
                approvedBy: null,
                adminNotes: data.comments || ""
            };
            const companyRef = await addDoc(collection(firestore, "companies"), companyData);

            // 3. Create a new user document in Firestore linked to the company
            const userData = {
                id: newUser.uid,
                role: "customer",
                companyId: companyRef.id,
                email: data.contactEmail,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.contactPhone,
                approved: false,
                active: false, // User is inactive until approved by admin
                createdAt: serverTimestamp(),
                lastLogin: null,
                notificationSettings: {},
                permissions: {}
            };
            const userDocRef = doc(firestore, "users", newUser.uid);
            await setDoc(userDocRef, userData).catch(serverError => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userData
                }));
                throw serverError; // Re-throw to be caught by the outer try-catch
            });


            toast({
                title: "Application Submitted!",
                description: "Your registration is pending approval. You will be notified by email.",
            });

            if (auth.currentUser) {
                await auth.signOut();
            }

            router.push('/');

        } catch (error: any) {
            console.error("Signup Error:", error);
            let description = error.message || "Could not create your account.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please try logging in instead."
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
    <div className="flex items-center justify-center min-h-screen bg-muted/40 py-12">
      <Card className="mx-auto max-w-2xl w-full shadow-xl">
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
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    
                    <div className="space-y-4 rounded-md border p-4">
                        <h3 className="font-semibold text-lg font-headline">Company Information</h3>
                        <FormField control={form.control} name="companyName" render={({ field }) => ( <FormItem> <FormLabel>Company Name</FormLabel> <FormControl> <Input placeholder="The Grand Hotel" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="orgNumber" render={({ field }) => ( <FormItem> <FormLabel>Organization Number</FormLabel> <FormControl> <Input placeholder="987654321" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField
                                control={form.control}
                                name="companyType"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company Type</FormLabel>
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="horeca">Horeca</SelectItem>
                                                    <SelectItem value="distributor">Distributor</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="visitingAddressStreet" render={({ field }) => ( <FormItem> <FormLabel>Visiting Address</FormLabel> <FormControl> <Input placeholder="Storgata 15" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="visitingAddressZip" render={({ field }) => ( <FormItem> <FormLabel>Postal Code</FormLabel> <FormControl> <Input placeholder="0184" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                        </div>
                        <FormField control={form.control} name="visitingAddressCity" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl> <Input placeholder="Oslo" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>

                        <FormField control={form.control} name="useVisitingAsBilling" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-normal">Billing address is the same as visiting address</FormLabel>
                            </FormItem>
                        )} />

                        {!useVisitingAsBilling && (
                             <div className="space-y-4 pl-4 border-l">
                                <h4 className="font-medium text-md">Billing Address</h4>
                                <FormField control={form.control} name="billingAddressStreet" render={({ field }) => ( <FormItem> <FormLabel>Street Address</FormLabel> <FormControl> <Input placeholder="Billing Street 1" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="billingAddressZip" render={({ field }) => ( <FormItem> <FormLabel>Postal Code</FormLabel> <FormControl> <Input placeholder="0185" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="billingAddressCity" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl> <Input placeholder="Oslo" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                </div>
                            </div>
                        )}

                        <FormField control={form.control} name="useBillingAsDelivery" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                <FormLabel className="font-normal">Delivery address is the same as billing address</FormLabel>
                            </FormItem>
                        )} />

                        {!useBillingAsDelivery && (
                             <div className="space-y-4 pl-4 border-l">
                                <h4 className="font-medium text-md">Delivery Address</h4>
                                <FormField control={form.control} name="deliveryAddressStreet" render={({ field }) => ( <FormItem> <FormLabel>Street Address</FormLabel> <FormControl> <Input placeholder="Delivery Street 1" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <div className="grid grid-cols-2 gap-4">
                                <FormField control={form.control} name="deliveryAddressZip" render={({ field }) => ( <FormItem> <FormLabel>Postal Code</FormLabel> <FormControl> <Input placeholder="0186" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                <FormField control={form.control} name="deliveryAddressCity" render={({ field }) => ( <FormItem> <FormLabel>City</FormLabel> <FormControl> <Input placeholder="Oslo" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="space-y-4 rounded-md border p-4">
                        <h3 className="font-semibold text-lg font-headline">Contact Person</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem> <FormLabel>First name</FormLabel> <FormControl> <Input placeholder="Max" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                            <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem> <FormLabel>Last name</FormLabel> <FormControl> <Input placeholder="Robinson" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="contactEmail" render={({ field }) => ( <FormItem> <FormLabel>Contact Email (for login)</FormLabel> <FormControl> <Input type="email" placeholder="m@example.com" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                             <FormField control={form.control} name="contactPhone" render={({ field }) => ( <FormItem> <FormLabel>Phone</FormLabel> <FormControl> <Input placeholder="+47 123 45 678" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                        </div>
                        <FormField control={form.control} name="password" render={({ field }) => ( <FormItem> <FormLabel>Password</FormLabel> <FormControl> <Input type="password" {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                    </div>

                     <div className="space-y-4 rounded-md border p-4">
                        <h3 className="font-semibold text-lg font-headline">Additional Information</h3>
                        <FormField control={form.control} name="comments" render={({ field }) => ( <FormItem> <FormLabel>Comments</FormLabel> <FormControl> <Textarea placeholder="Any extra information for the admin team..." {...field} /> </FormControl> <FormMessage /> </FormItem> )}/>
                     </div>

                    <FormField
                        control={form.control}
                        name="acceptTerms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="acceptTerms"
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <label
                                        htmlFor="acceptTerms"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Accept terms and conditions
                                    </label>
                                    <p className="text-sm text-muted-foreground">
                                        You agree to our <Link href="#" className="underline">Terms of Service</Link> and <Link href="#" className="underline">Privacy Policy</Link>.
                                    </p>
                                    <FormMessage />
                                </div>
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
