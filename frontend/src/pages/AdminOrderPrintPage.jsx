import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Package, MapPin, User, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';
import { ordersApi } from '../lib/api';
import { toast } from 'sonner';

const AdminOrderPrintPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await ordersApi.getForPrint(orderId);
        setOrder(response.data);
      } catch (error) {
        console.error('Failed to fetch order:', error);
        toast.error('Erreur lors du chargement de la commande');
        navigate('/admin/commandes');
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && isAdmin && orderId) {
      fetchOrder();
    }
  }, [orderId, isAuthenticated, isAdmin, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (authLoading || !isAuthenticated || !isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-page { 
            page-break-after: always;
            padding: 20mm;
            font-size: 12pt;
          }
          .classification-id {
            font-size: 18pt;
            font-weight: bold;
            font-family: monospace;
            background: #f0f0f0;
            padding: 4px 8px;
            border: 2px solid #333;
          }
        }
      `}</style>

      <div className="animate-fade-in print-page" data-testid="order-print-page">
        {/* Header - No Print */}
        <div className="no-print max-w-4xl mx-auto px-4 py-6">
          <Link 
            to="/admin/commandes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux commandes
          </Link>
          
          <div className="flex items-center justify-between mb-6">
            <h1 className="font-serif text-2xl font-bold">
              Fiche de préparation
            </h1>
            <Button onClick={handlePrint} className="btn-burgundy gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="max-w-4xl mx-auto px-4 py-6 bg-white">
          {/* Order Header */}
          <div className="border-2 border-black p-4 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">FICHE DE PRÉPARATION</h2>
                <p className="text-lg">MemeWear</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Code de suivi client</p>
                <p className="font-mono text-2xl font-bold">{order.tracking_code || order.id.slice(0, 8).toUpperCase()}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Date de commande:</strong> {formatDate(order.created_at)}</p>
                <p><strong>ID Commande:</strong> {order.id.slice(0, 8)}...</p>
              </div>
              <div>
                <p><strong>Statut paiement:</strong> {order.payment_status === 'completed' ? 'Payé ✓' : order.payment_status}</p>
                <p><strong>Méthode:</strong> {order.payment_method}</p>
              </div>
            </div>
          </div>

          {/* Customer Info */}
          <div className="border border-gray-300 p-4 mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations Client
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <strong>Email:</strong> {order.customer_email || 'Non renseigné'}
                </p>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="border border-gray-300 p-4 mb-6">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Adresse de Livraison
            </h3>
            <div className="bg-gray-50 p-4 rounded text-lg">
              <p className="font-semibold">{order.shipping_info.name}</p>
              <p>{order.shipping_info.address}</p>
              <p>{order.shipping_info.postal_code} {order.shipping_info.city}</p>
              <p className="font-semibold">{order.shipping_info.country}</p>
            </div>
          </div>

          {/* Items to Pick */}
          <div className="border-2 border-black p-4 mb-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Package className="h-5 w-5" />
              ARTICLES À PRÉPARER ({order.items.length})
            </h3>
            
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 px-2">ID Classification</th>
                  <th className="text-left py-2 px-2">Article</th>
                  <th className="text-center py-2 px-2">Qté</th>
                  <th className="text-right py-2 px-2">Prix</th>
                  <th className="text-center py-2 px-2 no-print">✓</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="py-3 px-2">
                      <span className="classification-id">
                        {item.classification_id || 'N/A'}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.country && item.year && (
                          <p className="text-sm text-muted-foreground">
                            {item.country} • {item.year}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-2 font-bold text-lg">
                      {item.quantity}
                    </td>
                    <td className="text-right py-3 px-2 font-mono">
                      {item.price.toFixed(2)} €
                    </td>
                    <td className="text-center py-3 px-2 no-print">
                      <div className="w-6 h-6 border-2 border-gray-400 rounded mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black">
                  <td colSpan="3" className="py-3 px-2 text-right font-bold text-lg">
                    TOTAL:
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-bold text-xl">
                    {order.total.toFixed(2)} €
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Checklist */}
          <div className="border border-gray-300 p-4 mb-6">
            <h3 className="font-bold text-lg mb-3">Checklist Préparation</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Articles vérifiés',
                'État des articles contrôlé',
                'Emballage protection',
                'Étiquette adresse',
                'Numéro de suivi',
                'Colis pesé'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-400 rounded" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking Number Space */}
          <div className="border border-dashed border-gray-400 p-4 mb-6">
            <h3 className="font-bold mb-2">Numéro de suivi postal:</h3>
            <div className="h-12 border-b border-gray-300" />
            <div className="mt-2 grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Transporteur:</span>
                <div className="h-8 border-b border-gray-300" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Date d'expédition:</span>
                <div className="h-8 border-b border-gray-300" />
              </div>
            </div>
          </div>

          {/* Admin Notes */}
          {order.admin_notes && (
            <div className="border border-yellow-300 bg-yellow-50 p-4 mb-6">
              <h3 className="font-bold mb-2">Notes Admin:</h3>
              <p>{order.admin_notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground mt-8 pt-4 border-t">
            <p>Imprimé le {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}</p>
            <p>MemeWear - Fiche de préparation commande</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminOrderPrintPage;