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
import { mockCustomers } from "@/lib/data";

export default function AdminCustomersPage() {
    const getBadgeVariant = (status: string) => {
    switch (status) {
        case 'Approved': return 'default';
        case 'Pending Approval': return 'secondary';
        case 'Rejected': return 'destructive';
        default: return 'outline';
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
            {mockCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.companyName}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>
                  <Badge variant={getBadgeVariant(customer.status)}>{customer.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{customer.registrationDate}</TableCell>
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
                      {customer.status === "Pending Approval" && (
                        <>
                            <DropdownMenuItem>Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">Reject</DropdownMenuItem>
                            <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>View Orders</DropdownMenuItem>
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
