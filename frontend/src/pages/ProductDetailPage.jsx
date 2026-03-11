import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Calendar, MapPin, Tag, Award, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { productsApi } from '../lib/api';
import { useCart } from '../context/CartContext';
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

const rarityColors = {
  common: 'bg-muted text-muted-foreground',
  uncommon: 'bg-blue-100 text-blue-700',
  rare: 'bg-purple-100 text-purple-700',
  very_rare: 'bg-amber-100 text-amber-700',
  exceptional: 'bg-accent text-white'
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const { addToCart, loading: cartLoading } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productsApi.getById(id);
        setProduct(response.data);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Produit non trouvé');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    const result = await addToCart(product.id, quantity);
    if (result.success) {
      toast.success('Ajouté au panier', {
        escription: `${quantity}x ${product.name}`
      });
    } else {
      toast.error('Erreur', {
        description: result.error
      });
    }
  };
  
  const stockAvailable = product?.stock_quantity || 1;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="grid md:grid-cols-2 gap-12">
          <div className="aspect-square skeleton rounded-xl" />
          <div className="space-y-4">
            <div className="h-8 skeleton rounded w-3/4" />
            <div className="h-6 skeleton rounded w-1/2" />
            <div className="h-24 skeleton rounded" />
            <div className="h-12 skeleton rounded w-1/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold mb-4">Produit non trouvé</h2>
        <Link to="/">
          <Button variant="outline">Retour à l'accueil</Button>
        </Link>
      </div>
    );
  }

  const placeholderImage = product.product_type === 'stamp'
    ? 'https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=800&h=800&fit=crop'
    : 'https://images.unsplash.com/photo-1767869171276-afe238e1df22?w=800&h=800&fit=crop';

  return (
    <div className="animate-fade-in" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Breadcrumb */}
        <Link 
          to={product.product_type === 'stamp' ? '/timbres' : '/enveloppes'}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux {product.product_type === 'stamp' ? 'timbres' : 'enveloppes'}
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Image */}
          <div className="space-y-4">
            <div className="bg-card rounded-xl border border-border p-8 aspect-square flex items-center justify-center">
              <img
                src={product.image_url || placeholderImage}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                data-testid="product-image"
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={rarityColors[product.rarity]}>
                {rarityLabels[product.rarity]}
              </Badge>
              <Badge variant="outline">
                {conditionLabels[product.condition]}
              </Badge>
              {product.is_obliterated && (
                <Badge variant="secondary">Oblitéré</Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground" data-testid="product-name">
              {product.name}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              {product.country && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {product.country}
                </div>
              )}
              {product.year && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {product.year}
                </div>
              )}
              {product.category && (
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {product.category}
                </div>
              )}
            </div>

            <Separator />

            {/* Price */}
            <div className="space-y-2">
              <p className="font-mono text-4xl font-bold text-primary" data-testid="product-price">
                {product.price.toFixed(2)} €
              </p>
              {product.estimated_value > product.price && (
                <p className="text-muted-foreground">
                  Valeur estimée: <span className="line-through">{product.estimated_value.toFixed(2)} €</span>
                </p>
              )}
              {/* Stock Status */}
              {product.stock_quantity !== undefined && (
                <div className="mt-2">
                  {product.stock_quantity > 0 ? (
                    <Badge className="bg-green-100 text-green-700">
                      En stock ({product.stock_quantity} disponible{product.stock_quantity > 1 ? 's' : ''})
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Rupture de stock</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Add to Cart */}
            {!product.is_sold && (product.stock_quantity === undefined || product.stock_quantity > 0) ? (
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                {/* Quantity Selector */}
                {stockAvailable > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quantité:</span>
                    <div className="flex items-center border rounded-md">
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="px-3 py-2 hover:bg-muted transition-colors"
                        disabled={quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-4 py-2 font-medium min-w-[3rem] text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity(q => Math.min(stockAvailable, q + 1))}
                        className="px-3 py-2 hover:bg-muted transition-colors"
                        disabled={quantity >= stockAvailable}
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              <Button
                size="lg"
                className="btn-burgundy w-full md:w-auto gap-2"
                onClick={handleAddToCart}
                disabled={cartLoading}
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart className="h-5 w-5" />
                Ajouter au panier
              </Button>
              </div>
              ) : product.stock_quantity === 0 ? (
              <Button size="lg" disabled className="w-full md:w-auto">
                Rupture de stock
              </Button>
            ) : (
              <Button size="lg" disabled className="w-full md:w-auto">
                Vendu
              </Button>
            )}

            <Separator />

            {/* Description */}
            <div>
              <h3 className="font-serif text-lg font-semibold mb-2 flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Description
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* History */}
            {product.history && (
              <div>
                <h3 className="font-serif text-lg font-semibold mb-2 flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Histoire
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {product.history}
                </p>
              </div>
            )}

            {/* Additional Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h3 className="font-serif font-semibold">Détails</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <span className="ml-2 font-medium">
                    {product.product_type === 'stamp' ? 'Timbre' : 'Enveloppe'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">État:</span>
                  <span className="ml-2 font-medium">{conditionLabels[product.condition]}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Rareté:</span>
                  <span className="ml-2 font-medium">{rarityLabels[product.rarity]}</span>
                </div>
                {product.print_quantity && (
                  <div>
                    <span className="text-muted-foreground">Tirage:</span>
                    <span className="ml-2 font-medium">{product.print_quantity.toLocaleString()}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="ml-2 font-medium">{product.dimensions}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
