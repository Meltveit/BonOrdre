'use client';
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUser, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

type UserProfile = {
    firstName: string;
    lastName: string;
    email: string;
    companyName?: string;
    address?: string;
};

export default function AccountPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [companyName, setCompanyName] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    const userDocRef = useMemoFirebase(() => user && firestore ? doc(firestore, 'users', user.uid) : null, [user, firestore]);

    useEffect(() => {
        if (!userDocRef || !firestore) {
            setIsLoading(false);
            return;
        };

        const fetchUserData = async () => {
            setIsLoading(true);
            try {
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    setProfile({
                        firstName: userData.firstName,
                        lastName: userData.lastName,
                        email: userData.email,
                    });

                    if (userData.companyId) {
                        const companyDocRef = doc(firestore, 'companies', userData.companyId);
                        const companyDocSnap = await getDoc(companyDocRef);
                        if (companyDocSnap.exists()) {
                            setCompanyName(companyDocSnap.data().name);
                            // Assuming address is part of company data for this example
                            setProfile(prev => ({...prev!, address: companyDocSnap.data().billingAddress?.street || 'N/A' }));
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching user data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserData();
    }, [userDocRef, firestore]);


    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">My Profile</CardTitle>
                    <CardDescription>
                        Loading your personal and company information...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                        <div className="h-10 bg-muted rounded animate-pulse"></div>
                        <div className="h-20 bg-muted rounded animate-pulse"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">My Profile</CardTitle>
          <CardDescription>
            Update your personal and company information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="first-name">First name</Label>
                <Input id="first-name" value={profile?.firstName || ''} readOnly />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="last-name">Last name</Label>
                <Input id="last-name" value={profile?.lastName || ''} readOnly />
              </div>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={profile?.email || ''} readOnly />
            </div>
            {companyName && (
                <div className="grid gap-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" value={companyName} readOnly />
                </div>
            )}
            {profile?.address && (
                <div className="grid gap-2">
                    <Label htmlFor="address">Business Address</Label>
                    <Textarea id="address" value={profile.address} readOnly />
                </div>
            )}
            <div className="flex justify-end">
                <Button type="submit" disabled>Save Changes</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
