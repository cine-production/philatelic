import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { useCart } from '../context/CartContext';
import { ordersApi, paymentsApi } from '../lib/api';
import { toast } from 'sonner';

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { cart, sessionId } = useCart();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [customerEmail, setCustomerEmail] = useState('');
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerEmail || !shippingInfo.name || !shippingInfo.address || !shippingInfo.city || !shippingInfo.postal_code) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      toast.error('Veuillez entrer une adresse email valide');
      return;
    }

    if (cart.items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    try {
      setLoading(true);

      // Create order
      const orderResponse = await ordersApi.create({
        customer_email: customerEmail,
        shipping_name: shippingInfo.name,
        shipping_address: shippingInfo.address,
        shipping_city: shippingInfo.city,
        shipping_postal_code: shippingInfo.postal_code,
        shipping_country: shippingInfo.country,
        payment_method: paymentMethod
      });

      const orderId = orderResponse.data.id;
      const trackingCode = orderResponse.data.tracking_code;
      const originUrl = window.location.origin;

      // Store tracking code for success page
      localStorage.setItem('last_tracking_code', trackingCode);

      // Create payment session based on method
      if (paymentMethod === 'stripe') {
        const paymentResponse = await paymentsApi.createStripeCheckout(orderId, originUrl);
        window.location.href = paymentResponse.data.checkout_url;
      } else if (paymentMethod === 'paypal') {
        const paymentResponse = await paymentsApi.createPayPalOrder(orderId, originUrl);
        window.location.href = paymentResponse.data.approve_url;
      }

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Erreur lors de la commande', {
        description: error.response?.data?.detail || 'Veuillez réessayer'
      });
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0) {
    navigate('/panier');
    return null;
  }

  return (
    <div className="animate-fade-in" data-testid="checkout-page">
      <div className="max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <h1 className="font-serif text-3xl font-bold text-foreground mb-8">
          Finaliser la commande
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Shipping Information */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">
                  Informations de livraison
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Adresse email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="votre@email.com"
                      required
                      data-testid="customer-email"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pour recevoir les mises à jour de votre commande
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      name="name"
                      value={shippingInfo.name}
                      onChange={handleInputChange}
                      placeholder="Jean Dupont"
                      required
                      data-testid="shipping-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      name="address"
                      value={shippingInfo.address}
                      onChange={handleInputChange}
                      placeholder="123 Rue de la Poste"
                      required
                      data-testid="shipping-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        name="city"
                        value={shippingInfo.city}
                        onChange={handleInputChange}
                        placeholder="Paris"
                        required
                        data-testid="shipping-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Code postal</Label>
                      <Input
                        id="postal_code"
                        name="postal_code"
                        value={shippingInfo.postal_code}
                        onChange={handleInputChange}
                        placeholder="75001"
                        required
                        data-testid="shipping-postal"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      name="country"
                      value={shippingInfo.country}
                      onChange={handleInputChange}
                      placeholder="France"
                      required
                      data-testid="shipping-country"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card rounded-lg border border-border p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">
                  Méthode de paiement
                </h2>
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="stripe" id="stripe" data-testid="payment-stripe" />
                    <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">Carte bancaire</p>
                          <p className="text-sm text-muted-foreground">Via Stripe - Visa, Mastercard, etc.</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="paypal" id="paypal" data-testid="payment-paypal" />
                    <Label htmlFor="paypal" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-5 h-5 bg-[#003087] rounded flex items-center justify-center">
                          <span className="text-white text-xs font-bold">P</span>
                        </div>
                        <div>
                          <p className="font-medium">PayPal</p>
                          <p className="text-sm text-muted-foreground">Paiement sécurisé via PayPal</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full btn-burgundy gap-2"
                disabled={loading}
                data-testid="submit-order-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Traitement en cours...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Payer {cart.total.toFixed(2)} €
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-lg border border-border p-6 sticky top-24">
              <h2 className="font-serif text-xl font-semibold mb-4">
                Récapitulatif
              </h2>
              
              <div className="space-y-4 mb-4">
                {cart.items.map(({ product }) => (
                  <div key={product.id} className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=100&h=100&fit=crop'}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.country}</p>
                      <p className="font-mono text-sm font-semibold text-primary">
                        {product.price.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total</span>
                  <span>{cart.total.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Livraison</span>
                  <span className="text-muted-foreground">Gratuite</span>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between">
                <span className="font-serif font-semibold">Total</span>
                <span className="font-mono text-xl font-bold text-primary" data-testid="checkout-total">
                  {cart.total.toFixed(2)} €
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
