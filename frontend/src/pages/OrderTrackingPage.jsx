import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  CreditCard,
  MapPin,
  Search,
  ExternalLink,
  PackageCheck,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ordersApi } from '../lib/api';
import { toast } from 'sonner';

const statusSteps = [
  { key: 'pending', label: 'En attente', icon: Clock },
  { key: 'paid', label: 'Payée', icon: CreditCard },
  { key: 'preparing', label: 'Préparation', icon: Package },
  { key: 'shipped', label: 'Expédiée', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: MapPin },
  { key: 'received', label: 'Reçue', icon: CheckCircle }
];

const statusIndex = {
  pending: 0,
  paid: 1,
  preparing: 2,
  shipped: 3,
  delivered: 4,
  received: 5,
  cancelled: -1
};

const OrderTrackingPage = () => {
  const { trackingCode: urlTrackingCode } = useParams();
  const [searchParams] = useSearchParams();
  const [trackingCode, setTrackingCode] = useState(urlTrackingCode || searchParams.get('code') || '');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    if (urlTrackingCode) {
      setShowEmailForm(true);
    }
  }, [urlTrackingCode]);

    const fetchOrder = async (code, customerEmail) => {
        if (!code || !customerEmail) return;
    
    try {
      setLoading(true);
      const response = await ordersApi.track(code.toUpperCase(), customerEmail);
      setOrder(response.data);
    } catch (error) {
      console.error('Track error:', error);
      if (error.response?.status === 403) {
        toast.error('Email incorrect', {
          description: 'L\'email ne correspond pas à cette commande'
        });
      } else {
      toast.error('Commande non trouvée', {
        description: 'Vérifiez le code de suivi'
      });
      }
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (trackingCode) {
      if (!email) {
        setShowEmailForm(true);
      } else {
        fetchOrder(trackingCode, email);
      }
    }
  };

  const handleConfirmReception = async () => {
    if (!order || !email) return;
    
    try {
      setConfirming(true);
      await ordersApi.confirmReception(order.tracking_code, email);
      toast.success('Réception confirmée !');
      fetchOrder(order.tracking_code, email);
    } catch (error) {
      toast.error('Erreur', {
        description: error.response?.data?.detail || 'Impossible de confirmer la réception'
      });
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const currentStepIndex = order ? statusIndex[order.status] : -1;

  return (
    <div className="animate-fade-in" data-testid="order-tracking-page">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="text-center mb-8">
          <Package className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
            Suivi de commande
          </h1>
          <p className="text-muted-foreground">
            Entrez votre code de suivi pour voir l'état de votre commande
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-8">
          <div className="flex gap-2">
          <Input
            value={trackingCode}
            onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
            placeholder="Code de suivi (ex: ABC12345)"
            className="flex-1 font-mono text-lg tracking-wider"
            data-testid="tracking-input"
          />
          {!showEmailForm && (
            <Button type="submit" disabled={loading} className="btn-burgundy gap-2">
               <Search className="h-4 w-4" />
                Suivre
            </Button>
            )}
          </div>
          
          {showEmailForm && (
            <div className="flex gap-2">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email utilisé lors de la commande"
                className="flex-1"
                data-testid="email-input"
              />
              <Button
                type="submit"
                disabled={loading || !email}
                className="btn-burgundy gap-2"
                >
                <Search className="h-4 w-4" />
                Rechercher
            </Button>
          </div>
        )}
        </form>

        {/* Order Details */}
        {order && (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {/* Header */}
            <div className="bg-muted/50 p-6 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm text-muted-foreground">Code de suivi</span>
                  <h2 className="font-mono text-2xl font-bold text-primary">
                    {order.tracking_code}
                  </h2>
                </div>
                {order.status === 'cancelled' ? (
                  <Badge variant="destructive" className="text-lg px-4 py-1">
                    Annulée
                  </Badge>
                ) : (
                  <Badge className="bg-primary/10 text-primary text-lg px-4 py-1">
                    {statusSteps[currentStepIndex]?.label || order.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Commande passée le {formatDate(order.created_at)}
              </p>
            </div>

            {/* Progress Steps */}
            {order.status !== 'cancelled' && (
              <div className="p-6 border-b border-border">
                <div className="flex justify-between">
                  {statusSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    
                    return (
                      <div key={step.key} className="flex flex-col items-center flex-1">
                        <div className={`
                          w-10 h-10 rounded-full flex items-center justify-center mb-2
                          ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                          ${isCurrent ? 'ring-4 ring-primary/20' : ''}
                        `}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`text-xs text-center ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                        {index < statusSteps.length - 1 && (
                          <div className={`absolute h-0.5 w-full top-5 left-1/2 ${
                            index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                          }`} style={{ zIndex: -1 }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tracking Info */}
            {order.tracking_number && (
              <div className="p-6 border-b border-border bg-blue-50">
                <div className="flex items-center gap-3">
                  <Truck className="h-6 w-6 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      Numéro de suivi {order.carrier || 'transporteur'}
                    </p>
                    <p className="font-mono text-lg text-blue-700">{order.tracking_number}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-1"
                  >
                    <a 
                      href={`https://www.laposte.fr/outils/suivre-vos-envois?code=${order.tracking_number}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      Suivre <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Articles commandés</h3>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="gap-2"
                >
                  <a href={ordersApi.downloadPdf(order.tracking_code)} download>
                    <Download className="h-4 w-4" />
                    Télécharger PDF
                  </a>
                </Button>
              </div>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantité: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total</span>
                <span className="text-primary">{order.total.toFixed(2)} €</span>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold mb-2">Adresse de livraison</h3>
              <p className="text-muted-foreground">
                {order.shipping_info.name}<br />
                {order.shipping_info.city}, {order.shipping_info.country}
              </p>
            </div>

            {/* Timeline */}
            <div className="p-6 border-b border-border">
              <h3 className="font-semibold mb-4">Historique</h3>
              <div className="space-y-4">
                {order.received_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium text-green-700">Réception confirmée</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.received_at)}</p>
                    </div>
                  </div>
                )}
                {order.delivered_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500" />
                    <div>
                      <p className="font-medium">Colis livré</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.delivered_at)}</p>
                    </div>
                  </div>
                )}
                {order.shipped_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium">Colis expédié</p>
                      <p className="text-sm text-muted-foreground">{formatDate(order.shipped_at)}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
                  <div>
                    <p className="font-medium">Commande créée</p>
                    <p className="text-sm text-muted-foreground">{formatDate(order.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Reception Button */}
            {(order.status === 'shipped' || order.status === 'delivered') && (
              <div className="p-6 bg-green-50">
                <div className="flex items-center gap-4">
                  <PackageCheck className="h-8 w-8 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium text-green-900">Avez-vous reçu votre colis ?</p>
                    <p className="text-sm text-green-700">
                      Confirmez la réception pour finaliser votre commande
                    </p>
                  </div>
                  <Button
                    onClick={handleConfirmReception}
                    disabled={confirming}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                    data-testid="confirm-reception-btn"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {confirming ? 'Confirmation...' : `J'ai reçu mon colis`}
                  </Button>
                </div>
              </div>
            )}

            {order.status === 'received' && (
              <div className="p-6 bg-green-50 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-900">Commande terminée</p>
                <p className="text-sm text-green-700">
                  Merci pour votre achat ! Réception confirmée le {formatDate(order.received_at)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* No Order State */}
        {!order && !loading && trackingCode && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-xl font-semibold mb-2">Commande non trouvée</h3>
            <p className="text-muted-foreground">
              Vérifiez que le code de suivi est correct
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTrackingPage;