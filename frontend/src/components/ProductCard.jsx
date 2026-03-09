import { Link } from 'react-router-dom';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
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

const ProductCard = ({ product }) => {
  const { addToCart, loading } = useCart();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const result = await addToCart(product.id);
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

  const placeholderImage = product.product_type === 'stamp' 
    ? 'https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=400&h=400&fit=crop'
    : 'https://images.unsplash.com/photo-1767869171276-afe238e1df22?w=400&h=400&fit=crop';

  return (
    <Link 
      to={`/produit/${product.id}`}
      className="group curator-card overflow-hidden flex flex-col"
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div className="relative product-image-container bg-muted aspect-square p-4">
        <img
          src={product.image_url || placeholderImage}
          alt={product.name}
          className="w-full h-full object-contain rounded"
          loading="lazy"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Badge className={rarityColors[product.rarity]}>
            {rarityLabels[product.rarity]}
          </Badge>
          {product.is_obliterated && (
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              Oblitéré
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
            <span>{product.country}</span>
            {product.year && (
              <>
                <span>•</span>
                <span>{product.year}</span>
              </>
            )}
          </div>
          
          <Badge variant="outline" className="text-xs">
            {conditionLabels[product.condition]}
          </Badge>
        </div>

        {/* Price and Actions */}
        <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
          <div>
            <p className="font-mono text-lg font-semibold text-primary">
              {product.price.toFixed(2)} €
            </p>
            {product.estimated_value > product.price && (
              <p className="text-xs text-muted-foreground line-through">
                Valeur: {product.estimated_value.toFixed(2)} €
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
