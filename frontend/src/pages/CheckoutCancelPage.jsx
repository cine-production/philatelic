import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { ordersApi } from '../lib/api';

const CheckoutCancelPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    // Cancel the pending order if we have an order_id
    const cancelOrder = async () => {
      if (orderId) {
        try {
          await ordersApi.cancelPending(orderId);
        } catch (error) {
          console.log('Order cancellation:', error.message);
        }
      }
    };
    cancelOrder();
  }, [orderId]);

  return (
    <div className="animate-fade-in" data-testid="checkout-cancel-page">
      <div className="max-w-2xl mx-auto px-4 md:px-8 lg:px-12 py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
          <XCircle className="h-10 w-10 text-amber-600" />
        </div>
        
        <h1 className="font-serif text-3xl font-bold text-foreground mb-4">
          Paiement annulé
        </h1>
        
        <p className="text-muted-foreground mb-8">
          Vous avez annulé le paiement. Votre panier a été conservé et vous pouvez reprendre votre commande à tout moment.
        </p>

        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/panier">
            <Button className="btn-burgundy">
              Retour au panier
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline">
              Continuer mes achats
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;
