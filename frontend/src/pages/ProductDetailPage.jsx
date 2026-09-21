import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ShoppingCart, Tag, Award, Info, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { productsApi } from '../lib/api';
import { processDesignFile } from '../lib/designPreview';
import { setPageMeta } from '../lib/seo';
import ShirtDesignPositioner, { DEFAULT_POSITION } from '../components/ShirtDesignPositioner';
import { CUSTOM_TSHIRTS_ENABLED } from '../config/features';
import { useCart } from '../context/CartContext';
import { toast } from 'sonner';

const typeLabels = {
  meme: 'Meme / Influenceur',
  modern: 'Style Moderne',
  custom: 'Personnalisé'
};

const typeRoutes = {
  meme: '/memes',
  modern: '/modernes',
  custom: '/personnalise'
};

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

// Cadre décoratif de la photo produit selon l'édition
const editionCardClass = {
  common: '',
  uncommon: 'edition-uncommon',
  rare: 'edition-rare',
  very_rare: 'edition-very_rare',
  exceptional: 'edition-exceptional'
};

const placeholderImage = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop';

const ProductDetailPage = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [customNotes, setCustomNotes] = useState('');
  const [customImage, setCustomImage] = useState(null); // aperçu (PNG, ou 1ère page PDF rendue)
  const [customFile, setCustomFile] = useState(null); // { base64, type } - fichier original envoyé
  const [designPosition, setDesignPosition] = useState(DEFAULT_POSITION);
  const [designLoading, setDesignLoading] = useState(false);
  const [designError, setDesignError] = useState('');
  const { addToCart, loading: cartLoading } = useCart();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await productsApi.getById(id);
        setProduct(response.data);
        setPageMeta(
          `${response.data.name} — MemeWear`,
          (response.data.description || '').slice(0, 155)
        );
        setSelectedSize(response.data.sizes?.[0] || null);
        setSelectedColor(response.data.colors?.[0] || null);
        setActiveImageIndex(0);
      } catch (error) {
        console.error('Failed to fetch product:', error);
        toast.error('Produit non trouvé');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Variante de la couleur sélectionnée (stock + images dédiées), si elle existe
  const selectedVariant = useMemo(() => {
    if (!product?.color_variants?.length || !selectedColor) return null;
    return product.color_variants.find((v) => v.color === selectedColor) || null;
  }, [product, selectedColor]);

  // Galerie d'images affichée : celles de la couleur choisie si dispo, sinon la galerie générale
  const gallery = useMemo(() => {
    if (selectedVariant?.images?.length) return selectedVariant.images;
    if (product?.images?.length) return product.images;
    return product?.image_url ? [product.image_url] : [placeholderImage];
  }, [product, selectedVariant]);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [selectedColor]);

  const handleDesignUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDesignError('');
    setDesignLoading(true);
    try {
      const { fileBase64, fileType, previewDataUrl } = await processDesignFile(file);
      setCustomFile({ base64: fileBase64, type: fileType });
      setCustomImage(previewDataUrl);
      setDesignPosition(DEFAULT_POSITION);
    } catch (err) {
      setDesignError(err.message || 'Impossible de lire ce fichier.');
      setCustomFile(null);
      setCustomImage(null);
    } finally {
      setDesignLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (isCustomizable && !customImage && !customNotes.trim()) {
      toast.error('Personnalisation requise', {
        description: 'Envoyez votre visuel (PNG/PDF) ou décrivez votre design avant de commander.'
      });
      return;
    }

    const result = await addToCart(product.id, quantity, {
      size: selectedSize,
      color: selectedColor,
      customNotes: isCustomizable ? customNotes : null,
      customImageBase64: isCustomizable ? customImage : null,
      customFileBase64: isCustomizable ? customFile?.base64 : null,
      customFileType: isCustomizable ? customFile?.type : null,
      customPosition: isCustomizable && customImage ? designPosition : null,
    });
    if (result.success) {
      toast.success('Ajouté au panier', {
        description: `${quantity}x ${product.name}`
      });
    } else {
      toast.error('Erreur', {
        description: result.error
      });
    }
  };

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

  // Stock disponible : illimité, ou spécifique à la couleur choisie, ou global
  const unlimitedStock = product.unlimited_stock !== false;
  const isCustomizable = product.is_customizable && CUSTOM_TSHIRTS_ENABLED;
  const stockAvailable = unlimitedStock
    ? Infinity
    : (selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity) ?? 1;
  const outOfStock = !unlimitedStock && stockAvailable <= 0;
  const effectivePrice = (selectedVariant?.price ?? product.price);

  const preorderProgress = product.is_preorder && product.preorder_threshold
    ? Math.min(100, Math.round(((product.preorder_count || 0) / product.preorder_threshold) * 100))
    : null;

  return (
    <div className="animate-fade-in" data-testid="product-detail-page">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Breadcrumb */}
        <Link 
          to={typeRoutes[product.product_type] || '/'}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux {typeLabels[product.product_type] || 'produits'}
        </Link>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Images */}
          <div className="space-y-4">
            <div className={`bg-card rounded-xl border border-border p-8 aspect-square flex items-center justify-center ${editionCardClass[product.rarity] || ''}`}>
              <img
                src={gallery[activeImageIndex] || placeholderImage}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg"
                data-testid="product-image"
              />
            </div>

            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {gallery.map((img, idx) => (
                  <button
                    key={img + idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`w-16 h-16 flex-shrink-0 rounded-lg border overflow-hidden ${
                      activeImageIndex === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                    }`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge className={rarityColors[product.rarity]}>
                {rarityLabels[product.rarity]}
              </Badge>
              <Badge variant="outline">
                {typeLabels[product.product_type]}
              </Badge>
              {product.is_customizable && (
                <Badge variant="secondary">
                  {isCustomizable ? 'Personnalisable' : 'Personnalisation indisponible'}
                </Badge>
              )}
              {product.is_preorder && (
                <Badge className="bg-primary/10 text-primary border border-primary/20 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Précommande
                </Badge>
              )}
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground" data-testid="product-name">
              {product.name}
            </h1>

            {/* Meta Info */}
            <div className="flex flex-wrap gap-4 text-muted-foreground">
              {product.category && (
                <div className="flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  {product.category}
                </div>
              )}
              {product.style && (
                <div className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  {product.style}
                </div>
              )}
              {product.dimensions && (
                <div className="flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  {product.dimensions}
                </div>
              )}
            </div>

            <Separator />

            {/* Price */}
            <div className="space-y-2">
              <p className="font-mono text-4xl font-bold text-primary" data-testid="product-price">
                {effectivePrice.toFixed(2)} €
              </p>
              {product.estimated_value > effectivePrice && (
                <p className="text-muted-foreground">
                  Valeur estimée: <span className="line-through">{product.estimated_value.toFixed(2)} €</span>
                </p>
              )}

              {/* Précommande - progression vers le seuil */}
              {preorderProgress !== null && (
                <div className="mt-3 max-w-sm">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{product.preorder_count || 0} précommande{(product.preorder_count || 0) !== 1 ? 's' : ''}</span>
                    <span>Seuil : {product.preorder_threshold}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${preorderProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Stock Status */}
              {!unlimitedStock && (
                <div className="mt-2">
                  {stockAvailable > 0 ? (
                    <Badge className="bg-green-100 text-green-700">
                      En stock ({stockAvailable} disponible{stockAvailable > 1 ? 's' : ''})
                    </Badge>
                  ) : (
                    <Badge variant="destructive">Rupture de stock{selectedColor ? ` (${selectedColor})` : ''}</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground block mb-2">Taille:</span>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div>
                <span className="text-sm text-muted-foreground block mb-2">Couleur:</span>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const variant = product.color_variants?.find((v) => v.color === color);
                    const colorOutOfStock = !unlimitedStock && variant && variant.stock_quantity <= 0;
                    return (
                      <button
                        key={color}
                        type="button"
                        disabled={colorOutOfStock}
                        onClick={() => setSelectedColor(color)}
                        className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                          selectedColor === color
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border hover:bg-muted'
                        } ${colorOutOfStock ? 'opacity-40 cursor-not-allowed line-through' : ''}`}
                      >
                        {color}
                        {!unlimitedStock && variant && (
                          <span className="ml-1 text-xs opacity-70">({variant.stock_quantity})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Custom design zone */}
            {product.is_customizable && !CUSTOM_TSHIRTS_ENABLED && (
              <div className="bg-muted/50 rounded-lg p-4 border border-dashed border-border text-center">
                <p className="text-sm text-muted-foreground">
                  🕐 La personnalisation est temporairement indisponible. On revient très vite !
                </p>
              </div>
            )}

            {isCustomizable && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-4 border border-dashed border-primary/40">
                <h3 className="font-serif font-semibold flex items-center gap-2">
                  Personnalisez votre t-shirt
                </h3>

                <div className="grid sm:grid-cols-2 gap-4 items-start">
                  {/* Aperçu en direct sur le t-shirt */}
                  <div>
                    <span className="text-sm text-muted-foreground block mb-2">Aperçu sur le t-shirt :</span>
                    <ShirtDesignPositioner
                      shirtImage={gallery[0] || placeholderImage}
                      designImage={customImage}
                      position={designPosition}
                      onChange={setDesignPosition}
                    />
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Votre visuel — PNG ou PDF au format A4
                      </label>
                      <input
                        type="file"
                        accept="image/png,application/pdf,.png,.pdf"
                        onChange={handleDesignUpload}
                        className="text-sm"
                      />
                      {designLoading && (
                        <p className="text-xs text-muted-foreground mt-1">Lecture du fichier...</p>
                      )}
                      {designError && (
                        <p className="text-xs text-destructive mt-1">{designError}</p>
                      )}
                      {customFile && !designLoading && (
                        <p className="text-xs text-green-700 mt-1">
                          Fichier chargé ({customFile.type === 'application/pdf' ? 'PDF' : 'PNG'})
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground block mb-1">
                        Texte ou instructions (facultatif)
                      </label>
                      <textarea
                        value={customNotes}
                        onChange={(e) => setCustomNotes(e.target.value)}
                        placeholder="Ex: mets le texte 'Team Nono' en jaune, logo au centre..."
                        className="w-full rounded-md border border-border p-2 text-sm bg-background"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Votre visuel/texte sera transmis avec votre commande pour la fabrication.
                </p>
              </div>
            )}

            {/* Add to Cart */}
            {product.is_customizable && !CUSTOM_TSHIRTS_ENABLED ? (
              <Button size="lg" disabled className="w-full md:w-auto">
                Personnalisation indisponible
              </Button>
            ) : !product.is_sold && (unlimitedStock || stockAvailable > 0) ? (
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                {/* Quantity Selector */}
                {(unlimitedStock || stockAvailable > 1) && (
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
                        onClick={() => setQuantity(q => unlimitedStock ? q + 1 : Math.min(stockAvailable, q + 1))}
                        className="px-3 py-2 hover:bg-muted transition-colors"
                        disabled={!unlimitedStock && quantity >= stockAvailable}
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
              ) : outOfStock ? (
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
                    {typeLabels[product.product_type] || product.product_type}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Édition:</span>
                  <span className="ml-2 font-medium">{rarityLabels[product.rarity]}</span>
                </div>
                {product.style && (
                  <div>
                    <span className="text-muted-foreground">Style:</span>
                    <span className="ml-2 font-medium">{product.style}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div>
                    <span className="text-muted-foreground">Matière / Coupe:</span>
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
