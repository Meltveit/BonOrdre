'use client';
import { MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@/lib/definitions";

export default function AdminCustomersPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const companiesRef = useMemoFirebase(() => firestore ? collection(firestore, 'companies') : null, [firestore]);
    const { data: companies, isLoading } = useCollection<Company>(companiesRef);

    const getBadgeVariant = (approved: boolean, active: boolean): "default" | "secondary" | "destructive" | "outline" => {
        if (approved && active) return 'default';
        if (!approved && !active) return 'secondary'; // Pending approval
        if (approved && !active) return 'destructive'; // Deactivated
        if (!approved && active) return 'destructive'; // Rejected
        return 'outline';
    }

    const getStatusText = (approved: boolean, active: boolean) => {
        if (approved && active) return 'Approved';
        if (!approved && !active) return 'Pending Approval';
        if (approved && !active) return 'Deactivated';
        if (!approved && active) return 'Rejected'; // This state happens when rejected
        return 'Unknown';
    }

    const handleApproval = async (companyId: string, approve: boolean) => {
        if (!firestore) return;
        const companyDocRef = doc(firestore, "companies", companyId);
        const actionText = approve ? 'Approving' : 'Rejecting';
        const actionDoneText = approve ? 'Approved' : 'Rejected';

        toast({ title: `${actionText} company...` });

        try {
            // When rejecting, we set approved to false and active to true to signify rejection.
            // When approving, both become true.
            await updateDoc(companyDocRef, {
                approved: approve,
                active: approve ? true : true, // A rejected company is marked as active=true, approved=false
            });
            toast({ title: `Company ${actionDoneText}` });
        } catch (error: any) {
            console.error(`Error ${actionText.toLowerCase()} company:`, error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not update company status. ${error.message}`
            });
        }
    };
    
    const handleDeactivation = async (companyId: string, deactivate: boolean) => {
        if (!firestore) return;
        const companyDocRef = doc(firestore, "companies", companyId);
        const actionText = deactivate ? 'Deactivating' : 'Activating';
        const actionDoneText = deactivate ? 'Deactivated' : 'Activated';
        
        toast({ title: `${actionText} company...`});

        try {
            await updateDoc(companyDocRef, { active: !deactivate });
            toast({ title: `Company ${actionDoneText}` });
        } catch(error: any) {
             console.error(`Error ${actionText.toLowerCase()} company:`, error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: `Could not update company status. ${error.message}`
            });
        }
    }


  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>
          Manage your B2B customers and their approval status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Contact Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Registered</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5}>Loading customers...</TableCell></TableRow>}
            {!isLoading && companies?.length === 0 && <TableRow><TableCell colSpan={5}>No customers found.</TableCell></TableRow>}
            {companies?.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{`${company.contactPerson.firstName} ${company.contactPerson.lastName}`}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(company.approved, company.active)}>{getStatusText(company.approved, company.active)}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    {company.registeredAt?.toDate().toLocaleDateString() || 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {/* Show Approve/Reject only if it's a new, pending application */}
                      {!company.approved && !company.active && (
                        <>
                            <DropdownMenuItem onClick={() => handleApproval(company.id, true)}>
                                Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleApproval(company.id, false)} className="text-destructive">
                                Reject
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                      )}
                       {/* Show Deactivate/Activate only if company is approved */}
                       {company.approved && (
                         <DropdownMenuItem onClick={() => handleDeactivation(company.id, company.active)} className={company.active ? 'text-destructive' : ''}>
                            {company.active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                       )}
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
