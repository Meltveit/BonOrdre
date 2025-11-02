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

    const getBadgeVariant = (active: boolean): "default" | "secondary" | "destructive" | "outline" => {
        if (active) return 'default';
        return 'secondary';
    }

    const getStatusText = (active: boolean) => {
        if (active) return 'Active';
        return 'Inactive';
    }

    const handleToggleActive = async (companyId: string, currentActive: boolean) => {
        if (!firestore) return;
        const companyDocRef = doc(firestore, "companies", companyId);
        const actionText = currentActive ? 'Deactivating' : 'Activating';
        const actionDoneText = currentActive ? 'Deactivated' : 'Activated';

        toast({ title: `${actionText} company...` });

        try {
            await updateDoc(companyDocRef, {
                active: !currentActive,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
        <CardDescription>
          Manage your B2B customers and their account status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Organization Number</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Registered</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6}>Loading customers...</TableCell></TableRow>}
            {!isLoading && companies?.length === 0 && <TableRow><TableCell colSpan={6}>No customers found.</TableCell></TableRow>}
            {companies?.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.orgNumber || 'N/A'}</TableCell>
                <TableCell>{company.contactEmail || 'N/A'}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(company.active)}>{getStatusText(company.active)}</Badge>
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
                      <DropdownMenuItem onClick={() => handleToggleActive(company.id, company.active)} className={company.active ? 'text-destructive' : ''}>
                        {company.active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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