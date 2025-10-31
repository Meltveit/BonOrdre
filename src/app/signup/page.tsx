'use client';

import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc } from "firebase/firestore";

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
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

// Force dynamic rendering - prevent static generation
export const dynamic = 'force-dynamic';

const signupSchema = z.object({
    companyName: z.string().min(1, { message: "Company name is required." }),
    orgNumber: z.string().min(9, { message: "Organization number must be at least 9 digits." }),
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
    if (!data.useBillingAsDelivery && !data.useVisitingAsBilling) {
        if (!data.deliveryAddressStreet) ctx.addIssue({ code: "custom", path: ["deliveryAddressStreet"], message: "Delivery address is required." });
        if (!data.deliveryAddressZip) ctx.addIssue({ code: "custom", path: ["deliveryAddressZip"], message: "Postal code is required." });
        if (!data.deliveryAddressCity) ctx.addIssue({ code: "custom", path: ["deliveryAddressCity"], message: "City is required." });
    }
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const auth = useAuth();
    const firestore = useFirestore();
    const user = useUser();
    const router = useRouter();
    const { toast } = useToast();
    
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            companyName: "",
            orgNumber: "",
            companyType: "",
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
        if (useVisitingAsBilling) {
            const visitingStreet = form.getValues("visitingAddressStreet");
            const visitingZip = form.getValues("visitingAddressZip");
            const visitingCity = form.getValues("visitingAddressCity");
            form.setValue("billingAddressStreet", visitingStreet);
            form.setValue("billingAddressZip", visitingZip);
            form.setValue("billingAddressCity", visitingCity);
        }
    }, [useVisitingAsBilling, form]);

    useEffect(() => {
        if (useBillingAsDelivery) {
            const billingStreet = form.getValues("billingAddressStreet");
            const billingZip = form.getValues("billingAddressZip");
            const billingCity = form.getValues("billingAddressCity");
            form.setValue("deliveryAddressStreet", billingStreet);
            form.setValue("deliveryAddressZip", billingZip);
            form.setValue("deliveryAddressCity", billingCity);
        }
    }, [useBillingAsDelivery, form]);

    useEffect(() => {
        if (user) {
            router.push("/dashboard");
        }
    }, [user, router]);

    const onSubmit: SubmitHandler<SignupFormData> = async (data) => {
        if (!auth || !firestore) {
            toast({
                title: "Error",
                description: "Firebase services not available. Please try again later.",
                variant: "destructive",
            });
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, data.contactEmail, data.password);
            const uid = userCredential.user.uid;

            await setDoc(doc(firestore, 'users', uid), {
                email: data.contactEmail,
                role: 'customer',
                companyId: uid,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.contactPhone,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await setDoc(doc(firestore, 'companies', uid), {
                name: data.companyName,
                orgNumber: data.orgNumber,
                type: data.companyType,
                visitingAddress: {
                    street: data.visitingAddressStreet,
                    zip: data.visitingAddressZip,
                    city: data.visitingAddressCity,
                },
                billingAddress: {
                    street: data.billingAddressStreet || data.visitingAddressStreet,
                    zip: data.billingAddressZip || data.visitingAddressZip,
                    city: data.billingAddressCity || data.visitingAddressCity,
                },
                deliveryAddress: {
                    street: data.deliveryAddressStreet || data.billingAddressStreet || data.visitingAddressStreet,
                    zip: data.deliveryAddressZip || data.billingAddressZip || data.visitingAddressZip,
                    city: data.deliveryAddressCity || data.billingAddressCity || data.visitingAddressCity,
                },
                contactPerson: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.contactEmail,
                    phone: data.contactPhone,
                },
                status: 'pending',
                comments: data.comments || '',
                acceptedTerms: data.acceptTerms,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            await addDoc(collection(firestore, 'notifications'), {
                type: 'new_signup',
                title: 'New Company Registration',
                message: `${data.companyName} has registered and is pending approval.`,
                companyId: uid,
                companyName: data.companyName,
                read: false,
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Application Submitted",
                description: "Your application has been submitted for review. You'll be notified once approved.",
            });

            router.push('/pending-approval');
        } catch (error: any) {
            console.error('Signup error:', error);
            toast({
                title: "Registration Failed",
                description: error.message || "Something went wrong during registration.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <Card className="w-full max-w-4xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <Logo />
                    </div>
                    <CardTitle className="text-2xl font-headline">Create a business account</CardTitle>
                    <CardDescription>
                        Enter your company details below to apply for an account.
                        Applications are subject to admin approval.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            
                            {/* Company Information */}
                            <div className="space-y-4 rounded-md border p-4">
                                <h3 className="font-semibold text-lg font-headline">Company Information</h3>
                                
                                <FormField
                                    control={form.control}
                                    name="companyName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ABC Trading AS" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="orgNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Organization Number</FormLabel>
                                            <FormControl>
                                                <Input placeholder="123456789" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                Norwegian organization number (9 digits)
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

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
                                                    <SelectItem value="Restaurant">Restaurant</SelectItem>
                                                    <SelectItem value="Bar">Bar</SelectItem>
                                                    <SelectItem value="Hotel">Hotel</SelectItem>
                                                    <SelectItem value="Nightclub">Nightclub</SelectItem>
                                                    <SelectItem value="Catering">Catering</SelectItem>
                                                    <SelectItem value="Retail">Retail</SelectItem>
                                                    <SelectItem value="Other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Addresses */}
                            <div className="space-y-4 rounded-md border p-4">
                                <h3 className="font-semibold text-lg font-headline">Address Information</h3>
                                
                                <div className="space-y-4">
                                    <h4 className="font-medium text-md">Visiting Address</h4>
                                    
                                    <FormField
                                        control={form.control}
                                        name="visitingAddressStreet"
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
                                </div>

                                <FormField
                                    control={form.control}
                                    name="useVisitingAsBilling"
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
                                                    Billing address is the same as visiting address
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )}
                                />

                                {!useVisitingAsBilling && (
                                    <div className="space-y-4 pl-4 border-l">
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
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
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

                                {!useBillingAsDelivery && !useVisitingAsBilling && (
                                    <div className="space-y-4 pl-4 border-l">
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

                            {/* Contact Person */}
                            <div className="space-y-4 rounded-md border p-4">
                                <h3 className="font-semibold text-lg font-headline">Contact Person</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="contactEmail"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Contact Email (for login)</FormLabel>
                                                <FormControl>
                                                    <Input type="email" placeholder="m@example.com" {...field} />
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
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="+47 123 45 678" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" {...field} />
                                            </FormControl>
                                            <FormDescription>
                                                At least 6 characters
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Additional Information */}
                            <div className="space-y-4 rounded-md border p-4">
                                <h3 className="font-semibold text-lg font-headline">Additional Information</h3>
                                <FormField
                                    control={form.control}
                                    name="comments"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Comments (Optional)</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Any extra information for the admin team..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Accept Terms - FIXED */}
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
                                                I accept the terms and conditions
                                            </FormLabel>
                                            <FormDescription>
                                                You agree to our{" "}
                                                <Link href="/terms" className="underline hover:text-primary">
                                                    Terms of Service
                                                </Link>
                                                {" "}and{" "}
                                                <Link href="/privacy" className="underline hover:text-primary">
                                                    Privacy Policy
                                                </Link>
                                                .
                                            </FormDescription>
                                            <FormMessage />
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <Button 
                                type="submit" 
                                className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" 
                                disabled={form.formState.isSubmitting}
                            >
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