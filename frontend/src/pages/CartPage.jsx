import { Link } from 'react-router-dom';
import { ShoppingCart, Trash2, ArrowRight, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

const CartPage = () => {
  const { cart, removeFromCart, loading } = useCart();

  const handleRemove = async (productId, productName) => {
    const result = await removeFromCart(productId);
    if (result.success) {
      toast.success('Retiré du panier', {
        description: productName
      });
    } else {
      toast.error('Erreur', {
        description: result.error
      });
    }
  };

  return (
    <div className="animate-fade-in" data-testid="cart-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Panier
          </h1>
        </div>

        {cart.items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-20 w-20 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-semibold text-foreground mb-2">
              Votre panier est vide
            </h2>
            <p className="text-muted-foreground mb-8">
              Découvrez notre collection et ajoutez des articles à votre panier
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/timbres">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Voir les timbres
                </Button>
              </Link>
              <Link to="/enveloppes">
                <Button variant="outline" className="gap-2">
                  Voir les enveloppes
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="bg-card rounded-lg border border-border divide-y divide-border">
              {cart.items.map(({ product }) => (
                <div 
                  key={product.id} 
                  className="p-4 flex gap-4"
                  data-testid={`cart-item-${product.id}`}
                >
                  {/* Image */}
                  <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={product.image_url || (product.product_type === 'stamp' 
                        ? 'https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=200&h=200&fit=crop'
                        : 'https://images.unsplash.com/photo-1767869171276-afe238e1df22?w=200&h=200&fit=crop'
                      )}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/produit/${product.id}`}
                      className="font-serif font-semibold text-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-muted-foreground mt-1">
                      {product.country} {product.year && `• ${product.year}`}
                    </p>
                    <p className="font-mono font-semibold text-primary mt-2">
                      {product.price.toFixed(2)} €
                    </p>
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(product.id, product.name)}
                    disabled={loading}
                    data-testid={`remove-item-${product.id}`}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Summary */}
            <div className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-mono font-semibold">{cart.total.toFixed(2)} €</span>
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-muted-foreground">Livraison</span>
                <span className="text-sm text-muted-foreground">Calculée à l'étape suivante</span>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-center mb-6">
                <span className="font-serif text-lg font-semibold">Total</span>
                <span className="font-mono text-2xl font-bold text-primary" data-testid="cart-total">
                  {cart.total.toFixed(2)} €
                </span>
              </div>

              <Link to="/checkout">
                <Button 
                  className="w-full btn-burgundy gap-2" 
                  size="lg"
                  data-testid="checkout-btn"
                >
                  Passer à la caisse
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Continue Shopping */}
            <div className="text-center">
              <Link to="/timbres" className="text-muted-foreground hover:text-foreground transition-colors">
                ← Continuer mes achats
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;
