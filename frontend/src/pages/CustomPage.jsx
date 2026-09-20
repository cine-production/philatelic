import { useState, useEffect } from 'react';
import { Palette, Search, Clock } from 'lucide-react';
import { Input } from '../components/ui/input';
import ProductCard from '../components/ProductCard';
import { productsApi } from '../lib/api';
import { CUSTOM_TSHIRTS_ENABLED } from '../config/features';

const CustomPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!CUSTOM_TSHIRTS_ENABLED) {
      setLoading(false);
      return;
    }
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productsApi.getAll({ product_type: 'custom' });
        setProducts(res.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (!CUSTOM_TSHIRTS_ENABLED) {
    return (
      <div className="animate-fade-in max-w-2xl mx-auto px-4 py-24 text-center" data-testid="custom-page-disabled">
        <Clock className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h1 className="font-serif text-2xl font-bold text-foreground mb-2">
          Personnalisation temporairement indisponible
        </h1>
        <p className="text-muted-foreground">
          On revient très vite avec les t-shirts personnalisables. En attendant, découvre nos
          collections Memes et Modern.
        </p>
      </div>
    );
  }

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query);
  });

  return (
    <div className="animate-fade-in" data-testid="custom-page">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Palette className="h-8 w-8 text-primary" />
                <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
                  T-Shirts Personnalisés
                </h1>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                Choisis un t-shirt de base ci-dessous, ouvre sa fiche produit, puis envoie ton visuel
                (image, logo, meme...) ou ton texte. On imprime et on t'expédie ta création.
              </p>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une base..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="custom-search"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* How it works */}
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-serif font-semibold mb-1">1. Choisis ta base</p>
            <p className="text-sm text-muted-foreground">Couleur, taille et coupe du t-shirt à personnaliser.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-serif font-semibold mb-1">2. Envoie ton design</p>
            <p className="text-sm text-muted-foreground">Une image, un logo ou simplement un texte à imprimer.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="font-serif font-semibold mb-1">3. On s'occupe du reste</p>
            <p className="text-sm text-muted-foreground">Impression, préparation et expédition de ta commande.</p>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            {loading
              ? 'Chargement...'
              : `${filteredProducts.length} base${filteredProducts.length !== 1 ? 's' : ''} personnalisable${filteredProducts.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-lg border border-border overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-4 space-y-3">
                  <div className="h-5 skeleton rounded w-3/4" />
                  <div className="h-4 skeleton rounded w-1/2" />
                  <div className="h-8 skeleton rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Palette className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
              Aucune base personnalisable pour le moment
            </h3>
            <p className="text-muted-foreground">
              Ajoute un produit de type "Personnalisé" (is_customizable = true) depuis l'admin.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomPage;
