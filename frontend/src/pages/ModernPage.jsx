import { useState, useEffect } from 'react';
import { Sparkles, Filter, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import ProductCard from '../components/ProductCard';
import FilterSidebar from '../components/FilterSidebar';
import { productsApi } from '../lib/api';

const ModernPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ countries: [], categories: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    condition: null,
    rarity: null,
    country: null,
    category: null,
    is_obliterated: null,
    min_price: null,
    max_price: null,
    min_year: null,
    max_year: null,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const params = {
          product_type: 'modern',
          ...Object.fromEntries(
            Object.entries(filters).filter(([_, v]) => v !== null)
          )
        };
        
        const [productsRes, statsRes] = await Promise.all([
          productsApi.getAll(params),
          productsApi.getStats()
        ]);
        
        setProducts(productsRes.data);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters]);

  
  // Filter products by search query
  const filteredProducts = products.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.name?.toLowerCase().includes(query) ||
      p.country?.toLowerCase().includes(query) ||
      p.category?.toLowerCase().includes(query) ||
      p.classification_id?.toLowerCase().includes(query) ||
      p.year?.toString().includes(query)
    );
  });

  return (
    <div className="animate-fade-in" data-testid="modern-page">
      {/* Header */}
      <div className="bg-muted/30 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
              T-Shirts Style Moderne
            </h1>
          </div>
          <p className="text-muted-foreground">
            Des coupes épurées et des designs minimalistes pour un look actuel
          </p>
          </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un t-shirt moderne..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="modern-search"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24">
              <FilterSidebar 
                filters={filters} 
                setFilters={setFilters}
                countries={stats.countries}
                categories={stats.categories}
              />
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Mobile Filter Button */}
            <div className="lg:hidden mb-6">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="gap-2" data-testid="mobile-filter-btn">
                    <Filter className="h-4 w-4" />
                    Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-0">
                  <div className="p-4">
                    <FilterSidebar 
                      filters={filters} 
                      setFilters={setFilters}
                      countries={stats.countries}
                      categories={stats.categories}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Results Count */}
            <div className="mb-6">
              <p className="text-muted-foreground">
                 {loading ? 'Chargement...' : `${filteredProducts.length} t-shirt${filteredProducts.length !== 1 ? 's' : ''} trouvé${filteredProducts.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
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
                <Sparkles className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
                  Aucun t-shirt trouvé
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Aucun résultat pour votre recherche' : 'Essayez de modifier vos filtres pour voir plus de résultats'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModernPage;
