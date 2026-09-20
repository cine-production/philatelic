import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';
import { CUSTOM_TSHIRTS_ENABLED } from '../config/features';

const rarityLabels = {
  common: 'Standard',
  uncommon: 'Petite série',
  rare: 'Édition limitée',
  very_rare: 'Édition limitée',
  exceptional: 'Collector'
};

const rarityColors = {
  common: 'bg-muted text-muted-foreground',
  uncommon: 'bg-blue-100 text-blue-700',
  rare: 'bg-purple-100 text-purple-700',
  very_rare: 'bg-pink-100 text-pink-700',
  exceptional: 'bg-gradient-to-r from-amber-400 to-yellow-200 text-amber-900'
};

// Cadre décoratif appliqué à la carte produit selon l'édition
const editionCardClass = {
  common: '',
  uncommon: 'edition-uncommon',
  rare: 'edition-rare',
  very_rare: 'edition-very_rare',
  exceptional: 'edition-exceptional'
};

const ProductCard = ({ product }) => {
  const { addToCart, loading } = useCart();

  const variantPrices = (product.color_variants || [])
    .map((v) => v.price)
    .filter((p) => p !== null && p !== undefined);
  const minPrice = variantPrices.length > 0 ? Math.min(product.price, ...variantPrices) : product.price;
  const hasVariantPricing = variantPrices.some((p) => p !== product.price);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.is_customizable) {
      // Les t-shirts personnalisables nécessitent un visuel/texte : direction fiche produit
      window.location.href = `/produit/${product.id}`;
      return;
    }
    
    const defaultSize = product.sizes?.[0] || 'M';
    const defaultColor = product.colors?.[0] || null;
    const result = await addToCart(product.id, 1, { size: defaultSize, color: defaultColor });
    if (result.success) {
      toast.success('Ajouté au panier', {
        description: product.name
      });
    } else {
      toast.error('Erreur', {
        description: result.error
      });
    }
  };

  const placeholderImage = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop';

  return (
    <Link 
      to={`/produit/${product.id}`}
      className={`group curator-card overflow-hidden flex flex-col ${editionCardClass[product.rarity] || ''}`}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div className="relative product-image-container bg-muted aspect-square p-4">
        <img
          src={product.images?.[0] || product.image_url || placeholderImage}
          alt={product.name}
          className="w-full h-full object-contain rounded"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className={rarityColors[product.rarity]}>
            {rarityLabels[product.rarity]}
          </Badge>
          {product.is_customizable && (
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              {CUSTOM_TSHIRTS_ENABLED ? 'Personnalisable' : 'Indisponible'}
            </Badge>
          )}
          {product.is_preorder && (
            <Badge className="bg-primary/10 text-primary border border-primary/20">
              Précommande
            </Badge>
          )}
        </div>

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="sm" className="gap-2">
            <Eye className="h-4 w-4" />
            Voir détails
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <h3 className="font-serif font-semibold text-foreground line-clamp-2 mb-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span>{product.category}</span>
          </div>

          {product.sizes?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {product.sizes.map((s) => (
                <Badge key={s} variant="outline" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Price and Actions */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-semibold text-primary">
              {hasVariantPricing && 'Dès '}{minPrice.toFixed(2)} €
            </p>
            {product.estimated_value > minPrice && (
              <p className="text-xs text-muted-foreground line-through">
                Prix normal: {product.estimated_value.toFixed(2)} €
              </p>
            )}
          </div>
          
          <Button
            size="sm"
            className="btn-burgundy gap-2"
            onClick={handleAddToCart}
            disabled={loading}
            data-testid={`add-to-cart-${product.id}`}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
