import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  Sparkles, 
  Check, 
  AlertCircle,
  Camera,
  Wand2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { aiApi, productsApi } from '../lib/api';
import { toast } from 'sonner';

const AdminAddProductPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  
  const [aiStatus, setAiStatus] = useState({ status: 'checking' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    product_type: 'stamp',
    condition: 'good',
    is_obliterated: false,
    year: '',
    country: '',
    category: '',
    rarity: 'common',
    price: '',
    estimated_value: '',
    history: '',
    print_quantity: '',
    dimensions: '',
    image_url: ''
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate]);

  useEffect(() => {
    const checkAI = async () => {
      try {
        const response = await aiApi.checkStatus();
        setAiStatus(response.data);
      } catch (error) {
        setAiStatus({ status: 'offline', message: 'Impossible de se connecter à l\'IA' });
      }
    };
    checkAI();
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setAnalyzed(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!imageFile) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    try {
      setAnalyzing(true);
      setAnalysisStep(1);

      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(imageFile);
      
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        
        setAnalysisStep(2);
        
        try {
          const response = await aiApi.analyze(base64);
          const analysis = response.data;
          
          setAnalysisStep(3);
          
          // Update form with AI analysis
          setFormData(prev => ({
            ...prev,
            condition: analysis.condition || prev.condition,
            is_obliterated: analysis.is_obliterated || false,
            year: analysis.year?.toString() || '',
            country: analysis.country || '',
            category: analysis.category || '',
            rarity: analysis.rarity || 'common',
            price: analysis.suggested_price?.toString() || '',
            estimated_value: analysis.estimated_value?.toString() || '',
            history: analysis.history || '',
            description: analysis.description || '',
            image_url: imagePreview
          }));
          
          setAnalyzed(true);
          toast.success('Analyse terminée !', {
            description: `Confiance: ${Math.round(analysis.confidence * 100)}%`
          });
          
        } catch (error) {
          console.error('AI analysis error:', error);
          toast.error('Échec de l\'analyse', {
            description: error.response?.data?.detail || 'L\'IA n\'a pas pu analyser l\'image'
          });
        }
        
        setAnalyzing(false);
        setAnalysisStep(0);
      };
      
    } catch (error) {
      setAnalyzing(false);
      setAnalysisStep(0);
      toast.error('Erreur lors de l\'analyse');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || !formData.country) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      setSaving(true);
      
      const productData = {
        ...formData,
        year: formData.year ? parseInt(formData.year) : null,
        price: parseFloat(formData.price),
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : parseFloat(formData.price),
        print_quantity: formData.print_quantity ? parseInt(formData.print_quantity) : null
      };
      
      await productsApi.create(productData);
      
      toast.success('Produit ajouté !', {
        description: formData.name
      });
      
      navigate('/admin/produits');
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Échec de l\'enregistrement', {
        description: error.response?.data?.detail || 'Veuillez réessayer'
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || (!isAuthenticated || !isAdmin)) {
    return null;
  }

  const analysisSteps = [
    { label: 'Préparation', icon: Upload },
    { label: 'Analyse de l\'image', icon: Camera },
    { label: 'Identification', icon: Sparkles },
    { label: 'Évaluation', icon: Check }
  ];

  return (
    <div className="animate-fade-in" data-testid="admin-add-product">
      <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <Wand2 className="h-8 w-8 text-primary" />
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Ajouter un produit
          </h1>
        </div>

        {/* AI Status */}
        {aiStatus.status !== 'online' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>IA non disponible</AlertTitle>
            <AlertDescription>
              {aiStatus.status === 'checking' 
                ? 'Vérification de la connexion à Ollama...'
                : `L'IA locale n'est pas accessible. Assurez-vous qu'Ollama est en cours d'exécution sur ${aiStatus.ollama_url || 'localhost:11434'} avec le modèle LLaVA installé.`
              }
            </AlertDescription>
          </Alert>
        )}

        {aiStatus.status === 'online' && !aiStatus.has_llava && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modèle LLaVA non trouvé</AlertTitle>
            <AlertDescription>
              Installez le modèle LLaVA avec la commande: <code className="bg-muted px-1 rounded">ollama pull llava</code>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Upload & Analysis */}
          <div className="space-y-6">
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">
                1. Télécharger l'image
              </h2>
              
              <div 
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  imagePreview ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                {imagePreview ? (
                  <div className="space-y-4">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="max-h-64 mx-auto rounded-lg object-contain"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview(null);
                        setAnalyzed(false);
                      }}
                    >
                      Changer l'image
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium text-foreground mb-1">
                      Cliquez pour télécharger
                    </p>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG jusqu'à 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      data-testid="image-input"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* AI Analysis */}
            <div className="bg-card rounded-lg border border-border p-6">
              <h2 className="font-serif text-xl font-semibold mb-4">
                2. Analyser avec l'IA
              </h2>
              
              {analyzing ? (
                <div className="space-y-4">
                  {analysisSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index + 1 === analysisStep;
                    const isComplete = index + 1 < analysisStep;
                    
                    return (
                      <div 
                        key={step.label}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                          isActive ? 'bg-primary/10' : isComplete ? 'bg-green-50' : 'bg-muted/50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isActive ? 'bg-primary text-white' : isComplete ? 'bg-green-500 text-white' : 'bg-muted'
                        }`}>
                          {isComplete ? (
                            <Check className="h-4 w-4" />
                          ) : isActive ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span className={isActive ? 'font-medium' : ''}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {analyzed && (
                    <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Analyse terminée</span>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleAnalyze}
                    disabled={!imageFile || aiStatus.status !== 'online' || !aiStatus.has_llava}
                    className="w-full btn-burgundy gap-2"
                    data-testid="analyze-btn"
                  >
                    <Sparkles className="h-4 w-4" />
                    {analyzed ? 'Ré-analyser' : 'Analyser l\'image'}
                  </Button>
                  
                  <p className="text-xs text-muted-foreground text-center">
                    L'IA va détecter l'état, l'oblitération, l'origine et estimer la valeur
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div>
            <form onSubmit={handleSubmit} className="bg-card rounded-lg border border-border p-6 space-y-6">
              <h2 className="font-serif text-xl font-semibold">
                3. Confirmer les informations
              </h2>

              {/* Basic Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Nom du produit *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Timbre Marianne 1960"
                    required
                    data-testid="product-name"
                  />
                </div>

                <div>
                  <Label htmlFor="product_type">Type *</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(v) => handleSelectChange('product_type', v)}
                  >
                    <SelectTrigger data-testid="product-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stamp">Timbre</SelectItem>
                      <SelectItem value="envelope">Enveloppe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Description détaillée du produit..."
                    rows={3}
                    data-testid="product-description"
                  />
                </div>
              </div>

              <Separator />

              {/* Characteristics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="condition">État</Label>
                  <Select
                    value={formData.condition}
                    onValueChange={(v) => handleSelectChange('condition', v)}
                  >
                    <SelectTrigger data-testid="product-condition">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mint">Neuf</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Bon</SelectItem>
                      <SelectItem value="fair">Correct</SelectItem>
                      <SelectItem value="poor">Usé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="rarity">Rareté</Label>
                  <Select
                    value={formData.rarity}
                    onValueChange={(v) => handleSelectChange('rarity', v)}
                  >
                    <SelectTrigger data-testid="product-rarity">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">Commun</SelectItem>
                      <SelectItem value="uncommon">Peu commun</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="very_rare">Très rare</SelectItem>
                      <SelectItem value="exceptional">Exceptionnel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="country">Pays *</Label>
                  <Input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="France"
                    required
                    data-testid="product-country"
                  />
                </div>

                <div>
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    value={formData.year}
                    onChange={handleInputChange}
                    placeholder="1960"
                    data-testid="product-year"
                  />
                </div>

                <div>
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    placeholder="Commémoratif"
                    data-testid="product-category"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <Label htmlFor="is_obliterated" className="cursor-pointer">Oblitéré</Label>
                  <Switch
                    id="is_obliterated"
                    checked={formData.is_obliterated}
                    onCheckedChange={(checked) => handleSelectChange('is_obliterated', checked)}
                    data-testid="product-obliterated"
                  />
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Prix de vente (€) *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="25.00"
                    required
                    data-testid="product-price"
                  />
                </div>

                <div>
                  <Label htmlFor="estimated_value">Valeur estimée (€)</Label>
                  <Input
                    id="estimated_value"
                    name="estimated_value"
                    type="number"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={handleInputChange}
                    placeholder="30.00"
                    data-testid="product-estimated-value"
                  />
                </div>
              </div>

              <Separator />

              {/* Additional Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="history">Histoire / Contexte</Label>
                  <Textarea
                    id="history"
                    name="history"
                    value={formData.history}
                    onChange={handleInputChange}
                    placeholder="Contexte historique, événement commémoré..."
                    rows={2}
                    data-testid="product-history"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="print_quantity">Tirage</Label>
                    <Input
                      id="print_quantity"
                      name="print_quantity"
                      type="number"
                      value={formData.print_quantity}
                      onChange={handleInputChange}
                      placeholder="10000"
                      data-testid="product-print-quantity"
                    />
                  </div>

                  <div>
                    <Label htmlFor="dimensions">Dimensions</Label>
                    <Input
                      id="dimensions"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleInputChange}
                      placeholder="25x35mm"
                      data-testid="product-dimensions"
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full btn-burgundy gap-2"
                disabled={saving}
                data-testid="save-product-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Enregistrer le produit
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAddProductPage;
