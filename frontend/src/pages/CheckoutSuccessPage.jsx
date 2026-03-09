import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Loader2, Package } from 'lucide-react';
import { Button } from '../components/ui/button';
import { paymentsApi } from '../lib/api';
import { useCart } from '../context/CartContext';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');
  const [orderDetails, setOrderDetails] = useState(null);
  const { refreshCart } = useCart();

  const sessionId = searchParams.get('session_id');
  const paypalOrderId = searchParams.get('paypal_order_id');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        if (sessionId) {
          // Stripe payment - poll for status
          let attempts = 0;
          const maxAttempts = 10;
          
          const poll = async () => {
            const response = await paymentsApi.getStripeStatus(sessionId);
            
            if (response.data.payment_status === 'paid') {
              setStatus('success');
              setOrderDetails(response.data);
              await refreshCart();
              return;
            }
            
            if (attempts < maxAttempts) {
              attempts++;
              setTimeout(poll, 2000);
            } else {
              setStatus('pending');
            }
          };
          
          await poll();
        } else if (paypalOrderId) {
          // PayPal payment - capture
          const response = await paymentsApi.capturePayPalPayment(paypalOrderId);
          
          if (response.data.status === 'COMPLETED') {
            setStatus('success');
            setOrderDetails(response.data);
            await refreshCart();
          } else {
            setStatus('pending');
          }
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Payment status check failed:', error);
        setStatus('error');
      }
    };

    checkPaymentStatus();
  }, [sessionId, paypalOrderId, refreshCart]);

  return (
    <div className="animate-fade-in" data-testid="checkout-success-page">
      <div className="max-w-2xl mx-auto px-4 md:px-8 lg:px-12 py-16 text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="h-16 w-16 text-primary mx-auto mb-6 animate-spin" />
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
              Vérification du paiement...
            </h1>
            <p className="text-muted-foreground">
              Veuillez patienter pendant que nous confirmons votre paiement.
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
              Commande confirmée !
            </h1>
            <p className="text-muted-foreground mb-8">
              Merci pour votre achat. Vous recevrez un email de confirmation avec les détails de votre commande.
            </p>
            
            <div className="bg-card rounded-lg border border-border p-6 mb-8 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Package className="h-5 w-5 text-primary" />
                <h3 className="font-serif font-semibold">Prochaines étapes</h3>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Votre commande sera préparée avec soin</li>
                <li>• Vous recevrez un email avec le numéro de suivi</li>
                <li>• Livraison estimée : 3-5 jours ouvrés</li>
              </ul>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/">
                <Button className="btn-burgundy">
                  Retour à l'accueil
                </Button>
              </Link>
              <Link to="/timbres">
                <Button variant="outline">
                  Continuer mes achats
                </Button>
              </Link>
            </div>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="h-16 w-16 text-amber-500 mx-auto mb-6" />
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
              Paiement en cours de traitement
            </h1>
            <p className="text-muted-foreground mb-8">
              Votre paiement est en cours de traitement. Vous recevrez une confirmation par email une fois le paiement validé.
            </p>
            <Link to="/">
              <Button className="btn-burgundy">
                Retour à l'accueil
              </Button>
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">❌</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
              Une erreur s'est produite
            </h1>
            <p className="text-muted-foreground mb-8">
              Nous n'avons pas pu vérifier votre paiement. Veuillez contacter notre support si vous avez été débité.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/panier">
                <Button className="btn-burgundy">
                  Retour au panier
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline">
                  Accueil
                </Button>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CheckoutSuccessPage;
