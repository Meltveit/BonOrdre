'use client';

import { useState } from 'react';
import { MoreHorizontal, CheckCircle, XCircle, Clock } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import type { CompanyApplication } from "@/lib/definitions";
import { approveApplication, rejectApplication } from '@/lib/application-utils';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function ApplicationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedApplication, setSelectedApplication] = useState<CompanyApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const applicationsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'companyApplications'), where('status', '==', activeTab));
  }, [firestore, activeTab]);

  const { data: applications, isLoading } = useCollection<CompanyApplication>(applicationsQuery);

  const getBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  }

  const handleViewDetails = (app: CompanyApplication) => {
    setSelectedApplication(app);
    setIsModalOpen(true);
  };
  
  const handleApprove = async () => {
    if (!firestore || !selectedApplication || !user) return;
    
    toast({ title: "Approving application..." });
    try {
        await approveApplication(firestore, selectedApplication.id, selectedApplication, user.uid);
        toast({ title: "Application Approved!", description: `${selectedApplication.companyName} is now a customer.`});
        setIsModalOpen(false);
        setSelectedApplication(null);
    } catch (error: any) {
        toast({ variant: 'destructive', title: "Error", description: `Could not approve application. ${error.message}`});
    }
  }
  
  const handleReject = async () => {
    if (!firestore || !selectedApplication || !user || !rejectionReason) {
        toast({ variant: 'destructive', title: "Error", description: "Rejection reason is required." });
        return;
    };
    
    toast({ title: "Rejecting application..." });
    try {
        await rejectApplication(firestore, selectedApplication.id, selectedApplication, user.uid, rejectionReason);
        toast({ title: "Application Rejected" });
        setIsModalOpen(false);
        setSelectedApplication(null);
        setRejectionReason('');
    } catch(error: any) {
        toast({ variant: 'destructive', title: "Error", description: `Could not reject application. ${error.message}`});
    }
  }

  return (
    <>
      <Tabs defaultValue="pending" onValueChange={setActiveTab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </div>
        <Card className='mt-4'>
          <CardHeader>
            <CardTitle>Company Applications</CardTitle>
            <CardDescription>
              Review and manage new business account applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Submitted</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && <TableRow><TableCell colSpan={5}>Loading applications...</TableCell></TableRow>}
                {!isLoading && applications?.length === 0 && <TableRow><TableCell colSpan={5}>No {activeTab} applications found.</TableCell></TableRow>}
                {applications?.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.companyName}</TableCell>
                    <TableCell>{`${app.contactPerson.firstName} ${app.contactPerson.lastName}`}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(app.status)} className="capitalize flex gap-1 items-center w-fit">
                        {getStatusIcon(app.status)}
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                        {app.submittedAt?.toDate().toLocaleDateString() || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => handleViewDetails(app)}>
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
      
      {/* Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application: {selectedApplication?.companyName}</DialogTitle>
            <DialogDescription>Review the details and take action.</DialogDescription>
          </DialogHeader>
          {selectedApplication && (
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6">
                <div className="grid grid-cols-2 gap-4">
                    <div><strong>Company Name:</strong> {selectedApplication.companyName}</div>
                    <div><strong>Org. Number:</strong> {selectedApplication.orgNumber}</div>
                </div>
                 <div><strong>Company Type:</strong> {selectedApplication.companyType}</div>
                 <hr/>
                <div className="grid grid-cols-2 gap-4">
                    <div><strong>Contact Person:</strong> {`${selectedApplication.contactPerson.firstName} ${selectedApplication.contactPerson.lastName}`}</div>
                    <div><strong>Contact Email:</strong> {selectedApplication.contactEmail}</div>
                    <div><strong>Contact Phone:</strong> {selectedApplication.contactPhone}</div>
                </div>
                 <hr/>
                 <div>
                    <strong>Visiting Address:</strong>
                    <p>{selectedApplication.visitingAddress.street}, {selectedApplication.visitingAddress.zip} {selectedApplication.visitingAddress.city}</p>
                 </div>
                 <div>
                    <strong>Billing Address:</strong>
                    <p>{selectedApplication.billingAddress.street}, {selectedApplication.billingAddress.zip} {selectedApplication.billingAddress.city}</p>
                 </div>
                  <div>
                    <strong>Delivery Address:</strong>
                    <p>{selectedApplication.deliveryAddress.street}, {selectedApplication.deliveryAddress.zip} {selectedApplication.deliveryAddress.city}</p>
                 </div>
                 {selectedApplication.comments && (
                    <>
                        <hr/>
                        <div>
                            <strong>Comments:</strong>
                            <p className="text-sm text-muted-foreground">{selectedApplication.comments}</p>
                        </div>
                    </>
                 )}
                 {selectedApplication.status === 'rejected' && selectedApplication.rejectionReason && (
                    <>
                        <hr/>
                        <div>
                            <strong>Rejection Reason:</strong>
                            <p className="text-sm text-destructive">{selectedApplication.rejectionReason}</p>
                        </div>
                    </>
                 )}

                 {selectedApplication.status === 'pending' && (
                    <>
                        <hr/>
                        <div className="grid gap-2">
                            <Label htmlFor="rejectionReason">Reason for Rejection (if applicable)</Label>
                            <Textarea id="rejectionReason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Provide a clear reason for rejection..."/>
                        </div>
                    </>
                 )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Close</Button>
             {selectedApplication?.status === 'pending' && (
                <>
                    <Button variant="destructive" onClick={handleReject} disabled={!rejectionReason}>Reject</Button>
                    <Button onClick={handleApprove}>Approve</Button>
                </>
             )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
