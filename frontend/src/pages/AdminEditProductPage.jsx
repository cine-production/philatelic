import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { useAuth } from '../context/AuthContext';
import { productsApi, categoriesApi, stylesApi, colorsApi } from '../lib/api';
import { toast } from 'sonner';

const rarityLabels = {
  common: 'Standard',
  uncommon: 'Petite série',
  rare: 'Édition limitée',
  very_rare: 'Édition très limitée',
  exceptional: 'Collector'
};

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const emptyForm = {
  name: '',
  description: '',
  product_type: 'meme',
  category: '',
  style: '',
  rarity: 'common',
  dimensions: '',
  price: '',
  estimated_value: '',
  history: '',
  image_url: '',
  images: [],
  sizes: ['S', 'M', 'L', 'XL'],
  colors: [],
  color_variants: [],
  is_customizable: false,
  is_preorder: true,
  preorder_threshold: '',
  preorder_count: 0,
  unlimited_stock: true,
  stock_quantity: 1,
  is_sold: false,
};

const AdminEditProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [colorOptions, setColorOptions] = useState([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productRes, catRes, styleRes, colorRes] = await Promise.all([
          productsApi.getById(id),
          categoriesApi.getAll(),
          stylesApi.getAll(),
          colorsApi.getAll(),
        ]);
        const p = productRes.data;
        setFormData({
          name: p.name || '',
          description: p.description || '',
          product_type: p.product_type || 'meme',
          category: p.category || '',
          style: p.style || '',
          rarity: p.rarity || 'common',
          dimensions: p.dimensions || '',
          price: p.price ?? '',
          estimated_value: p.estimated_value ?? '',
          history: p.history || '',
          image_url: p.image_url || '',
          images: p.images || [],
          sizes: p.sizes || [],
          colors: p.colors || [],
          color_variants: p.color_variants || [],
          is_customizable: !!p.is_customizable,
          is_preorder: p.is_preorder !== false,
          preorder_threshold: p.preorder_threshold ?? '',
          preorder_count: p.preorder_count || 0,
          unlimited_stock: p.unlimited_stock !== false,
          stock_quantity: p.stock_quantity ?? 1,
          is_sold: !!p.is_sold,
        });
        setCategories(catRes.data);
        setStyles(styleRes.data);
        setColorOptions(colorRes.data);
      } catch (error) {
        console.error('Failed to load product:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    if (isAuthenticated && isAdmin) fetchData();
  }, [id, isAuthenticated, isAdmin]);

  // La personnalisation n'est possible que pour le type "custom"
  useEffect(() => {
    setFormData((prev) => ({ ...prev, is_customizable: prev.product_type === 'custom' }));
  }, [formData.product_type]);

  const set = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const toggleSize = (size) => {
    setFormData((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((s) => s !== size) : [...prev.sizes, size],
    }));
  };

  const toggleColor = (colorName) => {
    setFormData((prev) => {
      const checked = prev.colors.includes(colorName);
      const colors = checked ? prev.colors.filter((c) => c !== colorName) : [...prev.colors, colorName];
      const color_variants = checked
        ? prev.color_variants.filter((v) => v.color !== colorName)
        : [...prev.color_variants, { color: colorName, price: null, stock_quantity: 0, images: [] }];
      return { ...prev, colors, color_variants };
    });
  };

  const updateVariant = (colorName, patch) => {
    setFormData((prev) => ({
      ...prev,
      color_variants: prev.color_variants.map((v) => (v.color === colorName ? { ...v, ...patch } : v)),
    }));
  };

  const handleAddImagesToVariant = (colorName, files) => {
    Promise.all(
      Array.from(files).map(
        (file) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
          })
      )
    ).then((newImages) => {
      const variant = formData.color_variants.find((v) => v.color === colorName);
      updateVariant(colorName, { images: [...(variant?.images || []), ...newImages] });
    });
  };

  const handleMainImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set('image_url', reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.category) {
      toast.error('Champs obligatoires manquants', {
        description: 'Nom, Prix et Catégorie sont requis',
      });
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        price: parseFloat(formData.price),
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
        stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 1,
        preorder_threshold: formData.preorder_threshold ? parseInt(formData.preorder_threshold) : null,
        color_variants: formData.color_variants.map((v) => ({
          ...v,
          price: v.price === '' || v.price === null || v.price === undefined ? null : parseFloat(v.price),
          stock_quantity: parseInt(v.stock_quantity) || 0,
        })),
      };
      await productsApi.update(id, payload);
      toast.success('Produit mis à jour');
      navigate('/admin/produits');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde', {
        description: error.response?.data?.detail || 'Réessayez',
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Produit introuvable.</p>
        <Link to="/admin/produits">
          <Button variant="outline">Retour à la liste</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" data-testid="admin-edit-product-page">
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-8">
        <Link
          to="/admin/produits"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste des produits
        </Link>

        <h1 className="font-serif text-3xl font-bold text-foreground mb-6">Modifier le produit</h1>

        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {/* Infos de base */}
          <div>
            <Label>Nom *</Label>
            <Input value={formData.name} onChange={(e) => set('name', e.target.value)} />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea rows={4} value={formData.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Photo principale */}
          <div>
            <Label>Photo principale</Label>
            <div className="flex items-center gap-3 mt-1">
              {formData.image_url ? (
                <img src={formData.image_url} alt="Principale" className="w-16 h-16 object-cover rounded-md border border-border" />
              ) : (
                <div className="w-16 h-16 rounded-md border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                  Aucune
                </div>
              )}
              <label className="text-sm text-primary hover:underline cursor-pointer">
                {formData.image_url ? 'Changer' : 'Importer'}
                <input type="file" accept="image/*" className="hidden" onChange={handleMainImageUpload} />
              </label>
            </div>
          </div>

          {/* Galerie générale */}
          <div>
            <Label>Photos de présentation (galerie générale)</Label>
            <div className="flex flex-wrap items-center gap-2 mb-2 mt-1">
              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-muted">
                + Importer des photos
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    Promise.all(
                      files.map(
                        (file) =>
                          new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.readAsDataURL(file);
                          })
                      )
                    ).then((newImages) => set('images', [...formData.images, ...newImages]));
                    e.target.value = '';
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">ou</span>
              <Input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Coller une URL d'image"
                className="max-w-xs"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!newImageUrl.trim()}
                onClick={() => {
                  set('images', [...formData.images, newImageUrl.trim()]);
                  setNewImageUrl('');
                }}
              >
                Ajouter
              </Button>
            </div>
            {formData.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt={`Photo ${idx + 1}`} className="w-16 h-16 object-cover rounded-md border border-border" />
                    <button
                      type="button"
                      onClick={() => set('images', formData.images.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Type / catégorie / style */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type *</Label>
              <Select value={formData.product_type} onValueChange={(v) => set('product_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meme">Meme / Influenceur</SelectItem>
                  <SelectItem value="modern">Style Moderne</SelectItem>
                  <SelectItem value="custom">Personnalisé (base neutre)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Édition</Label>
              <Select value={formData.rarity} onValueChange={(v) => set('rarity', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(rarityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link to="/admin/categories" className="text-xs text-primary hover:underline mt-1 inline-block">
                + Gérer les catégories
              </Link>
            </div>

            <div>
              <Label>Style</Label>
              <Select value={formData.style} onValueChange={(v) => set('style', v)}>
                <SelectTrigger><SelectValue placeholder="Choisir un style" /></SelectTrigger>
                <SelectContent>
                  {styles.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.product_type === 'custom' && (
            <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Ce produit est une <strong>base personnalisable</strong> : le client pourra envoyer
                son propre visuel (PNG/PDF) dessus.
              </p>
            </div>
          )}

          <div>
            <Label>Matière / Coupe</Label>
            <Input
              value={formData.dimensions}
              onChange={(e) => set('dimensions', e.target.value)}
              placeholder="Ex: Coton bio, coupe regular"
            />
          </div>

          <Separator />

          {/* Tailles */}
          <div>
            <Label>Tailles disponibles</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {ALL_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                    formData.sizes.includes(size)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs + variantes */}
          <div>
            <Label>Couleurs disponibles</Label>
            <div className="flex flex-wrap gap-2 mt-1 mb-3">
              {colorOptions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Aucune couleur définie. <Link to="/admin/categories" className="text-primary hover:underline">Ajoute des couleurs de base</Link> d'abord.
                </p>
              )}
              {colorOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleColor(c.name)}
                  className={`px-3 py-1.5 rounded-md border text-sm font-medium transition-colors ${
                    formData.colors.includes(c.name)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {formData.colors.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-3">
                {formData.colors.map((colorName) => {
                  const variant = formData.color_variants.find((v) => v.color === colorName) || {
                    price: null,
                    stock_quantity: 0,
                    images: [],
                  };
                  return (
                    <div key={colorName} className="border border-border rounded-lg p-3 space-y-2">
                      <p className="font-medium text-sm">{colorName}</p>

                      <div className="flex flex-wrap gap-2 mb-1">
                        {(variant.images || []).map((img, imgIdx) => (
                          <div key={imgIdx} className="relative">
                            <img src={img} alt={`${colorName} ${imgIdx + 1}`} className="w-14 h-14 object-cover rounded-md border border-border" />
                            <button
                              type="button"
                              onClick={() =>
                                updateVariant(colorName, { images: variant.images.filter((_, i) => i !== imgIdx) })
                              }
                              className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <label className="w-14 h-14 rounded-md border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground cursor-pointer hover:bg-muted">
                          + Ajouter
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.length) handleAddImagesToVariant(colorName, e.target.files);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <div>
                        <Label className="text-xs">Prix pour cette couleur (€, optionnel)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder={`Par défaut : ${formData.price || '—'} €`}
                          value={variant.price ?? ''}
                          onChange={(e) =>
                            updateVariant(colorName, {
                              price: e.target.value === '' ? null : parseFloat(e.target.value),
                            })
                          }
                          className="h-8"
                        />
                      </div>

                      {!formData.unlimited_stock && (
                        <div>
                          <Label className="text-xs">Stock disponible</Label>
                          <Input
                            type="number"
                            min="0"
                            value={variant.stock_quantity}
                            onChange={(e) => updateVariant(colorName, { stock_quantity: parseInt(e.target.value) || 0 })}
                            className="h-8"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix de vente (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => set('price', e.target.value)}
                className="font-mono text-lg"
              />
            </div>
            <div>
              <Label>Prix barré (€, optionnel)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.estimated_value}
                onChange={(e) => set('estimated_value', e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <Separator />

          {/* Précommande / stock */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="cursor-pointer">Précommande</Label>
              <p className="text-xs text-muted-foreground">
                Ce t-shirt est fabriqué une fois un seuil de commandes atteint
              </p>
            </div>
            <Switch checked={formData.is_preorder} onCheckedChange={(v) => set('is_preorder', v)} />
          </div>

          {formData.is_preorder && (
            <div>
              <Label>Seuil de précommandes avant fabrication</Label>
              <Input
                type="number"
                min="1"
                value={formData.preorder_threshold}
                onChange={(e) => set('preorder_threshold', e.target.value)}
                placeholder="Ex: 10"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Actuellement : {formData.preorder_count} précommande(s) reçue(s)
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div>
              <Label className="cursor-pointer">Stock illimité</Label>
              <p className="text-xs text-muted-foreground">
                Fabriqué à la demande : pas de limite de quantité vendable
              </p>
            </div>
            <Switch checked={formData.unlimited_stock} onCheckedChange={(v) => set('unlimited_stock', v)} />
          </div>

          {!formData.unlimited_stock && (
            <div>
              <Label>Quantité en stock (global, si pas de couleur)</Label>
              <Input
                type="number"
                min="0"
                value={formData.stock_quantity}
                onChange={(e) => set('stock_quantity', e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <Label className="cursor-pointer">Marqué comme vendu / masqué de la boutique</Label>
            <Switch checked={formData.is_sold} onCheckedChange={(v) => set('is_sold', v)} />
          </div>

          <Separator />

          <div className="flex justify-end gap-3">
            <Link to="/admin/produits">
              <Button variant="outline" type="button">Annuler</Button>
            </Link>
            <Button className="btn-burgundy gap-2" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Enregistrer
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditProductPage;
