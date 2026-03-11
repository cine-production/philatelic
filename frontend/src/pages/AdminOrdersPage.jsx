import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Loader2, 
  Package, 
  Truck, 
  CheckCircle,
  Printer,
  Eye,
  Mail,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Download,
  Trash2,
  Archive,
  ArchiveRestore,
  Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../lib/api';
import { toast } from 'sonner';

const statusLabels = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700', icon: Package },
  paid: { label: 'Payée', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  preparing: { label: 'Préparation', color: 'bg-orange-100 text-orange-700', icon: Package },
  shipped: { label: 'Expédiée', color: 'bg-blue-100 text-blue-700', icon: Truck },
  delivered: { label: 'Livrée', color: 'bg-purple-100 text-purple-700', icon: PackageCheck },
  received: { label: 'Reçue', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled: { label: 'Annulée', color: 'bg-red-100 text-red-700', icon: Package }
};

const paymentStatusLabels = {
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Payé', color: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', color: 'bg-red-100 text-red-700' },
  cancelled: { label: 'Annulé', color: 'bg-gray-100 text-gray-700' }
};

const AdminOrdersPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [archivedOrders, setArchivedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [editDialog, setEditDialog] = useState({ open: false, order: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, order: null });
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [editForm, setEditForm] = useState({
    tracking_number: '',
    carrier: '',
    admin_notes: ''
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersApi.getAll({ limit: 100 });
        const allOrders = response.data;
        setOrders(allOrders.filter(o => !o.is_archived));
        setArchivedOrders(allOrders.filter(o => o.is_archived));
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error('Erreur lors du chargement des commandes');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchOrders();
    }
  }, [isAuthenticated, isAdmin]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      setUpdating(orderId);
      await ordersApi.updateStatus(orderId, newStatus);
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ));
      toast.success('Statut mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setUpdating(null);
    }
  };

  
  const handleDownloadPdf = async (orderId, trackingCode) => {
    try {
      const response = await ordersApi.downloadAdminPdf(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preparation_${trackingCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download error:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    }
  };

  const handleDeleteOrder = async () => {
    if (!deleteDialog.order) return;
    try {
      await ordersApi.delete(deleteDialog.order.id);
      setOrders(prev => prev.filter(o => o.id !== deleteDialog.order.id));
      setArchivedOrders(prev => prev.filter(o => o.id !== deleteDialog.order.id));
      toast.success('Commande supprimée');
      setDeleteDialog({ open: false, order: null });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleArchiveOrder = async (order) => {
    try {
      await ordersApi.archive(order.id);
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setArchivedOrders(prev => [...prev, { ...order, is_archived: true }]);
      toast.success('Commande archivée');
    } catch (error) {
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const handleUnarchiveOrder = async (order) => {
    try {
      await ordersApi.unarchive(order.id);
      setArchivedOrders(prev => prev.filter(o => o.id !== order.id));
      setOrders(prev => [...prev, { ...order, is_archived: false }]);
      toast.success('Commande désarchivée');
    } catch (error) {
      toast.error('Erreur lors du désarchivage');
    }
  };

  const openEditDialog = (order) => {
    setEditForm({
      tracking_number: order.tracking_number || '',
      carrier: order.carrier || '',
      admin_notes: order.admin_notes || ''
    });
    setEditDialog({ open: true, order });
  };

  const handleSaveEdit = async () => {
    if (!editDialog.order) return;
    
    try {
      await ordersApi.update(editDialog.order.id, editForm);
      setOrders(prev => prev.map(o => 
        o.id === editDialog.order.id ? { ...o, ...editForm } : o
      ));
      setEditDialog({ open: false, order: null });
      toast.success('Commande mise à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  
  // Filter orders based on search query
  const filterOrders = (ordersList) => {
    if (!searchQuery) return ordersList;
    const query = searchQuery.toLowerCase();
    return ordersList.filter(o =>
      o.tracking_code?.toLowerCase().includes(query) ||
      o.customer_email?.toLowerCase().includes(query) ||
      o.shipping_info?.name?.toLowerCase().includes(query) ||
      o.id?.toLowerCase().includes(query)
    );
  };

  const filteredOrders = filterOrders(orders);
  const filteredArchivedOrders = filterOrders(archivedOrders);
  
  const renderOrdersTable = (ordersList, isArchived = false) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Commande</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Articles</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Paiement</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ordersList.map((order) => (
            <>
              <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                  >
                    {expandedOrder === order.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell>
                  <div>
                    <code className="text-xs bg-muted px-2 py-1 rounded block mb-1">
                      {order.tracking_code || order.id.slice(0, 8).toUpperCase()}
                    </code>
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(order.created_at)}
                </TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{order.shipping_info.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {order.customer_email || 'Non renseigné'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{order.items.length}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono font-semibold">
                  {order.total.toFixed(2)} €
                </TableCell>
                <TableCell>
                  <Badge className={paymentStatusLabels[order.payment_status]?.color}>
                    {paymentStatusLabels[order.payment_status]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={statusLabels[order.status]?.color}>
                    {statusLabels[order.status]?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {!isArchived && (
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusUpdate(order.id, value)}
                        disabled={updating === order.id}
                      >
                        <SelectTrigger className="w-28" data-testid={`status-select-${order.id}`}>
                          {updating === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <SelectValue />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">En attente</SelectItem>
                          <SelectItem value="paid">Payée</SelectItem>
                          <SelectItem value="preparing">Préparation</SelectItem>
                          <SelectItem value="shipped">Expédiée</SelectItem>
                          <SelectItem value="delivered">Livrée</SelectItem>
                          <SelectItem value="received">Reçue</SelectItem>
                          <SelectItem value="cancelled">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(order)}
                      title="Modifier"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Link to={`/admin/commandes/${order.id}/imprimer`}>
                      <Button variant="outline" size="sm" title="Imprimer">
                        <Printer className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      title="Télécharger PDF"
                      onClick={() => handleDownloadPdf(order.id, order.tracking_code || order.id.slice(0, 8))}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {isArchived ? (
                      <Button
                        variant="outline"
                        size="sm"
                        title="Désarchiver"
                        onClick={() => handleUnarchiveOrder(order)}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        title="Archiver"
                        onClick={() => handleArchiveOrder(order)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      title="Supprimer"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => setDeleteDialog({ open: true, order })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
              
              {/* Expanded Row */}
              {expandedOrder === order.id && (
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={9}>
                    <div className="p-4 grid md:grid-cols-3 gap-6">
                      {/* Items */}
                      <div>
                        <h4 className="font-semibold mb-2">Articles</h4>
                        <div className="space-y-2">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <div>
                                <span className="font-mono text-xs bg-primary/10 text-primary px-1 rounded mr-2">
                                  {item.classification_id || 'N/A'}
                                </span>
                                {item.name}
                              </div>
                              <span className="font-mono">{item.price.toFixed(2)} €</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Shipping */}
                      <div>
                        <h4 className="font-semibold mb-2">Livraison</h4>
                        <p className="text-sm">
                          {order.shipping_info.name}<br />
                          {order.shipping_info.address}<br />
                          {order.shipping_info.postal_code} {order.shipping_info.city}<br />
                          {order.shipping_info.country}
                        </p>
                        {order.tracking_number && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <p className="text-xs text-blue-600">Suivi: {order.carrier}</p>
                            <p className="font-mono text-sm text-blue-700">{order.tracking_number}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Notes */}
                      <div>
                        <h4 className="font-semibold mb-2">Notes</h4>
                        {order.admin_notes ? (
                          <p className="text-sm text-muted-foreground">{order.admin_notes}</p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Aucune note</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  if (authLoading || (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return (
    <div className="animate-fade-in" data-testid="admin-orders-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <div className="flex items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Commandes
          </h1>
          </div>
          
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="active" className="gap-2">
              <Package className="h-4 w-4" />
              Actives ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger value="archived" className="gap-2">
              <Archive className="h-4 w-4" />
              Archives ({filteredArchivedOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-8 text-center">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
               <p className="text-muted-foreground">{searchQuery ? 'Aucun résultat' : 'Aucune commande active'}</p>
            </div>
          ) : (
            renderOrdersTable(filteredOrders, false)
                                )}
                              </div>
                              
                              </TabsContent>

          <TabsContent value="archived">
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {filteredArchivedOrders.length === 0 ? (
                <div className="p-8 text-center">
                  <Archive className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">{searchQuery ? 'Aucun résultat' : 'Aucune commande archivée'}</p>
                </div>
              ) : (
                renderOrdersTable(filteredArchivedOrders, true)
              )}
            </div>
            </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 text-sm">
          {Object.entries(statusLabels).map(([key, { label, color, icon: Icon }]) => (
            <div key={key} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              <Badge className={color}>{label}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, order: open ? editDialog.order : null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la commande</DialogTitle>
            <DialogDescription>
              Ajoutez le numéro de suivi et des notes pour cette commande.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carrier">Transporteur</Label>
                <Select
                  value={editForm.carrier}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, carrier: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="La Poste">La Poste</SelectItem>
                    <SelectItem value="Colissimo">Colissimo</SelectItem>
                    <SelectItem value="Chronopost">Chronopost</SelectItem>
                    <SelectItem value="Mondial Relay">Mondial Relay</SelectItem>
                    <SelectItem value="DHL">DHL</SelectItem>
                    <SelectItem value="UPS">UPS</SelectItem>
                    <SelectItem value="FedEx">FedEx</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tracking_number">Numéro de suivi</Label>
                <Input
                  id="tracking_number"
                  value={editForm.tracking_number}
                  onChange={(e) => setEditForm(prev => ({ ...prev, tracking_number: e.target.value }))}
                  placeholder="Ex: 1Z999AA10123456784"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="admin_notes">Notes internes</Label>
              <Textarea
                id="admin_notes"
                value={editForm.admin_notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                placeholder="Notes pour cette commande..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, order: null })}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} className="btn-burgundy">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, order: open ? deleteDialog.order : null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la commande ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La commande {deleteDialog.order?.tracking_code || deleteDialog.order?.id?.slice(0, 8)} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminOrdersPage;