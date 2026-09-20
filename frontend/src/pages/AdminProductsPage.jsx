import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Package, 
  Trash2, 
  Edit, 
  Search, 
  Loader2,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';
import { productsApi } from '../lib/api';
import { toast } from 'sonner';

const typeLabels = {
  meme: 'Meme',
  modern: 'Modern',
  custom: 'Personnalisé'
};

const rarityLabels = {
  common: 'Standard',
  uncommon: 'Petite série',
  rare: 'Édition limitée',
  very_rare: 'Édition très limitée',
  exceptional: 'Collector'
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                Ajouter un produit
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
                  <Button className="btn-burgundy">Ajouter votre premier produit</Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Tailles</TableHead>
                  <TableHead>Édition</TableHead>
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
                        <img
                          src={product.image_url || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=100&h=100&fit=crop'}
                          alt={product.name}
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                        />
                        <p className="font-medium line-clamp-1">{product.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {typeLabels[product.product_type] || product.product_type}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>{(product.sizes || []).join(', ')}</TableCell>
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
                          <DropdownMenuItem asChild>
                            <Link to={`/admin/produits/${product.id}/modifier`} className="flex items-center gap-2">
                              <Edit className="h-4 w-4" />
                              Modifier
                            </Link>
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

    </div>
  );
};

export default AdminProductsPage;
