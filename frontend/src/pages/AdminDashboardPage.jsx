import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Plus, 
  TrendingUp,
  Laugh,
  Sparkles,
  Palette,
  Euro,
  Archive,
  AlertTriangle,
  Tag
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { adminApi } from '../lib/api';

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await adminApi.getStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin) {
      fetchStats();
    }
  }, [isAuthenticated, isAdmin]);

  if (authLoading || (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return (
    <div className="animate-fade-in" data-testid="admin-dashboard">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Tableau de bord
            </h1>
          </div>
          <Link to="/admin/ajouter">
            <Button className="btn-burgundy gap-2" data-testid="add-product-btn">
              <Plus className="h-4 w-4" />
              Ajouter un produit
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Produits disponibles
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="stat-available">
                {loading ? '...' : stats?.products?.available || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '' : `${stats?.products?.sold || 0} vendu(s)`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Memes
              </CardTitle>
              <Laugh className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="stat-meme">
                {loading ? '...' : stats?.products?.meme || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Modern
              </CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="stat-modern">
                {loading ? '...' : stats?.products?.modern || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Personnalisés
              </CardTitle>
              <Palette className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono" data-testid="stat-custom">
                {loading ? '...' : stats?.products?.custom || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Chiffre d'affaires
              </CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary" data-testid="stat-revenue">
                {loading ? '...' : `${stats?.revenue?.toFixed(2) || '0.00'} €`}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '' : `${stats?.orders?.paid || 0} commande(s) payée(s)`}
              </p>
            </CardContent>
          </Card>
        </div>

        
        {/* Additional Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                T-shirts vendus
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-green-600">
                {loading ? '...' : stats?.products?.sold || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Commandes actives
              </CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {loading ? '...' : stats?.orders?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {loading ? '' : `${stats?.orders?.preparing || 0} en préparation`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Archivées
              </CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {loading ? '...' : stats?.orders?.archived || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stock faible
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-amber-600">
                {loading ? '...' : stats?.products?.low_stock || 0}
              </div>
              <p className="text-xs text-muted-foreground">produits ≤ 2</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Link to="/admin/ajouter" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold">Ajouter un produit</h3>
                    <p className="text-sm text-muted-foreground">
                      Ajouter un nouveau t-shirt à la boutique
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/produits" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                    <ShoppingBag className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold">Gérer les produits</h3>
                    <p className="text-sm text-muted-foreground">
                      Voir, modifier ou supprimer vos produits
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/commandes" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold">Voir les commandes</h3>
                    <p className="text-sm text-muted-foreground">
                      Suivre et gérer les commandes clients
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/admin/categories" className="block">
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Tag className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-serif font-semibold">Catégories & Styles</h3>
                    <p className="text-sm text-muted-foreground">
                      Gérer les listes de catégories et styles
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
