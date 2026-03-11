import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Trash2, 
  Edit, 
  Search, 
  Loader2,
  Save,
  X,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../context/AuthContext';
import { productsApi } from '../lib/api';
import { toast } from 'sonner';

const conditionLabels = {
  mint: 'Neuf',
  excellent: 'Excellent',
  good: 'Bon',
  fair: 'Correct',
  poor: 'Usé'
};

const rarityLabels = {
  common: 'Commun',
  uncommon: 'Peu commun',
  rare: 'Rare',
  very_rare: 'Très rare',
  exceptional: 'Exceptionnel'
};

const AdminProductsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchProducts();
  }, [isAuthenticated, isAdmin]);

  const fetchProducts = async () => {
    if (!isAuthenticated || !isAdmin) return;
    
    try {
      setLoading(true);
      const response = await productsApi.getAll({ limit: 100 });
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Erreur lors du chargement des produits');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    
    try {
      setDeleting(productToDelete.id);
      await productsApi.delete(productToDelete.id);
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast.success('Produit supprimé', { description: productToDelete.name });
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(null);
      setDeleteDialogOpen(false);
      setProductToDelete(null);
    }
  };

  const handleEditClick = (product) => {
    setEditingProduct({ ...product });
    setEditDialogOpen(true);
  };

  const handleEditChange = (field, value) => {
    setEditingProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    try {
      setSaving(true);
      
      const updateData = {
        name: editingProduct.name,
        description: editingProduct.description,
        condition: editingProduct.condition,
        is_obliterated: editingProduct.is_obliterated,
        year: editingProduct.year ? parseInt(editingProduct.year) : null,
        country: editingProduct.country,
        category: editingProduct.category,
        rarity: editingProduct.rarity,
        price: parseFloat(editingProduct.price),
        estimated_value: editingProduct.estimated_value ? parseFloat(editingProduct.estimated_value) : null,
        history: editingProduct.history,
        is_sold: editingProduct.is_sold,
        stock_quantity: editingProduct.stock_quantity ? parseInt(editingProduct.stock_quantity) : 1,
        classification_id: editingProduct.classification_id
      };
      
      await productsApi.update(editingProduct.id, updateData);
      
      // Update local state
      setProducts(prev => prev.map(p => 
        p.id === editingProduct.id ? { ...p, ...updateData } : p
      ));
      
      toast.success('Produit modifié', { description: editingProduct.name });
      setEditDialogOpen(false);
      setEditingProduct(null);
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la modification');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return (
    <div className="animate-fade-in" data-testid="admin-products-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Package className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Mes produits ({products.length})
            </h1>
          </div>
          
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
                data-testid="search-input"
              />
            </div>
            <Link to="/admin/ajouter">
              <Button className="btn-burgundy gap-2">
                <Package className="h-4 w-4" />
                Scanner un produit
              </Button>
            </Link>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
              <p className="text-muted-foreground mt-2">Chargement...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Aucun produit trouvé' : 'Aucun produit ajouté'}
              </p>
              {!searchQuery && (
                <Link to="/admin/ajouter">
                  <Button className="btn-burgundy">Scanner votre premier produit</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Pays</TableHead>
                  <TableHead>État</TableHead>
                  <TableHead>Rareté</TableHead>
                  <TableHead>Prix</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                          <img
                            src={product.image_url || 'https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=100&h=100&fit=crop'}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">{product.name}</p>
                          {product.year && (
                            <p className="text-xs text-muted-foreground">{product.year}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {product.product_type === 'stamp' ? 'Timbre' : 'Enveloppe'}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.country}</TableCell>
                    <TableCell>{conditionLabels[product.condition]}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {rarityLabels[product.rarity]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-semibold">
                      {product.price.toFixed(2)} €
                    </TableCell>
                    <TableCell>
                      {product.is_sold ? (
                        <Badge variant="secondary">Vendu</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700">En vente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link to={`/produit/${product.id}`} className="flex items-center gap-2">
                              <Eye className="h-4 w-4" />
                              Voir sur le site
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditClick(product)}
                            className="flex items-center gap-2"
                          >
                            <Edit className="h-4 w-4" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(product)}
                            className="flex items-center gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit "{productToDelete?.name}" sera définitivement supprimé de votre boutique.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting === productToDelete?.id}
            >
              {deleting === productToDelete?.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Modifiez les informations du produit et enregistrez vos changements.
            </DialogDescription>
          </DialogHeader>
          
          {editingProduct && (
            <div className="space-y-4 py-4">
              {/* Image Preview */}
              {editingProduct.image_url && (
                <div className="flex justify-center">
                  <img 
                    src={editingProduct.image_url} 
                    alt={editingProduct.name}
                    className="max-h-40 rounded-lg"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nom *</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => handleEditChange('name', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Pays *</Label>
                  <Input
                    value={editingProduct.country}
                    onChange={(e) => handleEditChange('country', e.target.value)}
                  />
                </div>

                <div>
                  <Label>Année</Label>
                  <Input
                    type="number"
                    value={editingProduct.year || ''}
                    onChange={(e) => handleEditChange('year', e.target.value)}
                  />
                </div>

                <div>
                  <Label>État</Label>
                  <Select
                    value={editingProduct.condition}
                    onValueChange={(v) => handleEditChange('condition', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rareté</Label>
                  <Select
                    value={editingProduct.rarity}
                    onValueChange={(v) => handleEditChange('rarity', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(rarityLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Catégorie</Label>
                  <Input
                    value={editingProduct.category || ''}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label>Oblitéré</Label>
                  <Switch
                    checked={editingProduct.is_obliterated}
                    onCheckedChange={(checked) => handleEditChange('is_obliterated', checked)}
                  />
                </div>

                <div>
                  <Label>Prix (€) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => handleEditChange('price', e.target.value)}
                    className="font-mono"
                  />
                </div>

                <div>
                  <Label>Valeur estimée (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.estimated_value || ''}
                    onChange={(e) => handleEditChange('estimated_value', e.target.value)}
                    className="font-mono"
                  />
                </div>

                
                <div>
                  <Label>Quantité en stock</Label>
                  <Input
                    type="number"
                    min="0"
                    value={editingProduct.stock_quantity ?? 1}
                    onChange={(e) => handleEditChange('stock_quantity', e.target.value)}
                    data-testid="edit-stock-quantity"
                  />
                </div>

                <div>
                  <Label>ID Classification</Label>
                  <Input
                    value={editingProduct.classification_id || ''}
                    onChange={(e) => handleEditChange('classification_id', e.target.value)}
                    placeholder="Ex: 1960-FR-COM-001"
                    className="font-mono"
                    data-testid="edit-classification-id"
                  />
                </div>


                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editingProduct.description || ''}
                    onChange={(e) => handleEditChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Histoire</Label>
                  <Textarea
                    value={editingProduct.history || ''}
                    onChange={(e) => handleEditChange('history', e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="col-span-2 flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                  <div>
                    <Label>Marquer comme vendu</Label>
                    <p className="text-xs text-muted-foreground">Le produit ne sera plus visible dans la boutique</p>
                  </div>
                  <Switch
                    checked={editingProduct.is_sold}
                    onCheckedChange={(checked) => handleEditChange('is_sold', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              className="btn-burgundy gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;
