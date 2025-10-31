'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";

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
import { useAuth, useFirestore, useUser, errorEmitter, FirestorePermissionError } from "@/firebase";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const signupSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required." }),
    orgNumber: z.string().min(1, { message: "Organization number is required." }),
    companyType: z.enum(["distributor", "bar", "hotel", "restaurant", "other"], { 
        errorMap: () => ({ message: "Please select a company type." }) 
    }),
    country: z.string().min(1, { message: "Country is required." }),
    
    contactEmail: z.string().email({ message: "Invalid email address." }),
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
    if (!data.useBillingAsDelivery && !data.useVisitingAsBilling) {
        if (!data.deliveryAddressStreet) ctx.addIssue({ code: "custom", path: ["deliveryAddressStreet"], message: "Delivery address is required." });
        if (!data.deliveryAddressZip) ctx.addIssue({ code: "custom", path: ["deliveryAddressZip"], message: "Postal code is required." });
        if (!data.deliveryAddressCity) ctx.addIssue({ code: "custom", path: ["deliveryAddressCity"], message: "City is required." });
    }
});

type SignupFormValues = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const { user, isUserLoading } = useUser();
    const auth = useAuth();
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();

    const form = useForm<SignupFormValues>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            companyName: "",
            orgNumber: "",
            companyType: undefined,
            country: "",
            contactEmail: "",
            contactPhone: "",
            firstName: "",
            lastName: "",
            visitingAddressStreet: "",
            visitingAddressZip: "",
            visitingAddressCity: "",
            useVisitingAsBilling: false,
            billingAddressStreet: "",
            billingAddressZip: "",
            billingAddressCity: "",
            useBillingAsDelivery: false,
            deliveryAddressStreet: "",
            deliveryAddressZip: "",
            deliveryAddressCity: "",
            comments: "",
            password: "",
            acceptTerms: false,
        },
    });

    const useVisitingAsBilling = form.watch("useVisitingAsBilling");
    const useBillingAsDelivery = form.watch("useBillingAsDelivery");

    useEffect(() => {
        if (!isUserLoading && user) {
            router.push("/dashboard"); 
        }
    }, [user, isUserLoading, router]);

    const onSubmit = async (data: SignupFormValues) => {
        if (!auth || !firestore) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Firebase is not properly initialized.",
            });
            return;
        }
        
        toast({
            title: "Creating your account...",
            description: "Please wait.",
        });

        try {
            // Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, data.contactEmail, data.password);
            const userId = userCredential.user.uid;

            // Immediately sign the new user out. They need admin approval to log in.
            if (auth) {
                await auth.signOut();
            }

            // Prepare addresses
            const visitingAddress = {
                street: data.visitingAddressStreet,
                zip: data.visitingAddressZip,
                city: data.visitingAddressCity,
            };

            const billingAddress = data.useVisitingAsBilling 
                ? visitingAddress 
                : {
                    street: data.billingAddressStreet || "",
                    zip: data.billingAddressZip || "",
                    city: data.billingAddressCity || "",
                };

            let deliveryAddress;
            if (data.useBillingAsDelivery) {
                deliveryAddress = billingAddress;
            } else if (data.useVisitingAsBilling) { // Changed this logic
                deliveryAddress = visitingAddress;
            } else {
                deliveryAddress = {
                    street: data.deliveryAddressStreet || "",
                    zip: data.deliveryAddressZip || "",
                    city: data.deliveryAddressCity || "",
                };
            }
            
            // Set active and approved to false for new registrations
            const companyData = {
                name: data.companyName,
                orgNumber: data.orgNumber,
                companyType: data.companyType,
                country: data.country,
                contactEmail: data.contactEmail,
                contactPhone: data.contactPhone,
                contactPerson: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                },
                visitingAddress,
                billingAddress,
                shippingAddresses: [deliveryAddress],
                pricing: {},
                active: false, // Must be approved by admin first
                approved: false, // Must be approved by admin first
                registeredAt: serverTimestamp(),
                comments: data.comments || "",
            };

            const companyPromise = addDoc(collection(firestore, "companies"), companyData).catch(serverError => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'companies',
                    operation: 'create',
                    requestResourceData: companyData
                }));
                throw serverError;
            });
            
            const companyRef = await companyPromise;

            const userData = {
                id: userId,
                email: data.contactEmail,
                firstName: data.firstName,
                lastName: data.lastName,
                role: 'customer',
                companyId: companyRef.id,
                active: false, // User account is also inactive until approved
                approved: false,
                createdAt: serverTimestamp(),
            };

            const userDocRef = doc(firestore, "users", userId);
            setDoc(userDocRef, userData).catch(serverError => {
                 errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'create',
                    requestResourceData: userData
                }));
                throw serverError;
            });

            toast({
                title: "Registration successful!",
                description: "Your application has been submitted and is pending approval. You will be redirected to the login page.",
            });

            router.push("/");

        } catch (error: any) {
             let description = error.message || "Could not create your account.";
            if (error.code === 'auth/email-already-in-use') {
                description = "This email is already registered. Please try logging in instead.";
            }
            // Only show toast if it's not a permission error we are handling globally
            if (error.name !== 'FirebaseError' || !error.message.includes('Firestore Security Rules')) {
                toast({
                    variant: "destructive",
                    title: "Uh oh! Something went wrong.",
                    description: description,
                });
            }
        }
    };

    if (isUserLoading || user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </div>
        );
    }

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
                            {/* Company Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Company Information</h3>
                                
                                <FormField
                                    control={form.control}
                                    name="companyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Example AS" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="orgNumber"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Organization Number</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="123456789" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select country" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="norway">Norway</SelectItem>
                                                        <SelectItem value="sweden">Sweden</SelectItem>
                                                        <SelectItem value="denmark">Denmark</SelectItem>
                                                        <SelectItem value="finland">Finland</SelectItem>
                                                        <SelectItem value="iceland">Iceland</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="companyType"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select company type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="distributor">Distributor</SelectItem>
                                                    <SelectItem value="bar">Bar</SelectItem>
                                                    <SelectItem value="hotel">Hotel</SelectItem>
                                                    <SelectItem value="restaurant">Restaurant</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Contact Information */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Contact Information</h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="John" {...field} />
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
                                                <FormLabel>Last Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Doe" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="contactEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Business Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="john@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="contactPhone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+47 123 45 678" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Addresses */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Addresses</h3>
                                
                                <FormField
                                    control={form.control}
                                    name="visitingAddressStreet"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Visiting Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Main Street 15" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="visitingAddressZip"
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

                                    <FormField
                                        control={form.control}
                                        name="visitingAddressCity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>City</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Oslo" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <FormField
                                    control={form.control}
                                    name="useVisitingAsBilling"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="font-normal">
                                                    Billing address is the same as visiting address
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {!useVisitingAsBilling && (
                                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                                        <h4 className="font-medium text-md">Billing Address</h4>
                                        
                                        <FormField
                                            control={form.control}
                                            name="billingAddressStreet"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Street Address</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Billing Street 1" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="billingAddressZip"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Postal Code</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="0185" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="billingAddressCity"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>City</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Oslo" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}

                                <FormField
                                    control={form.control}
                                    name="useBillingAsDelivery"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                             <FormControl>
                                                <Checkbox
                                                    checked={field.value}
                                                    onCheckedChange={field.onChange}
                                                />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="font-normal">
                                                    Delivery address is the same as billing address
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {!useBillingAsDelivery && (
                                    <div className="space-y-4 pl-4 border-l-2 border-muted">
                                        <h4 className="font-medium text-md">Delivery Address</h4>
                                        
                                        <FormField
                                            control={form.control}
                                            name="deliveryAddressStreet"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Street Address</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Delivery Street 1" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="grid grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="deliveryAddressZip"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Postal Code</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="0186" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="deliveryAddressCity"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>City</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Oslo" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Information */}
                            <FormField
                                control={form.control}
                                name="comments"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Comments (optional)</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Add any additional information here..." 
                                                className="resize-none" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Any special needs or information
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Password */}
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Password</FormLabel>
                                        <FormControl>
                                            <Input type="password" placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            At least 6 characters
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="acceptTerms"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel className="font-normal">
                                                I accept the{" "}
                                                <Link href="/terms" className="underline">
                                                    terms and conditions
                                                </Link>
                                            </FormLabel>
                                            <FormMessage />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
                            </Button>

                            <div className="text-center text-sm">
                                Already have an account?{" "}
                                <Link href="/" className="underline">
                                    Log in
                                </Link>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
