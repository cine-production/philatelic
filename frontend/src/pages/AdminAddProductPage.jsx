import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  Loader2, 
  Sparkles, 
  Check, 
  AlertCircle,
  Camera,
  Wand2,
  X,
  Edit,
  Save,
  RotateCcw
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useAuth } from '../context/AuthContext';
import { aiApi, productsApi } from '../lib/api';
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

const AdminAddProductPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // States
  const [aiStatus, setAiStatus] = useState({ status: 'checking' });
  const [step, setStep] = useState('capture'); // 'capture', 'analyzing', 'confirm', 'editing'
  const [imageData, setImageData] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
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

  const [aiConfidence, setAiConfidence] = useState(0);

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

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Impossible d\'accéder à la caméra. Vérifiez les permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setImageData(dataUrl);
      stopCamera();
      
      // Automatically start analysis
      analyzeImage(dataUrl);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageData(reader.result);
        // Automatically start analysis
        analyzeImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (imageDataUrl) => {
    if (aiStatus.status !== 'online' || !aiStatus.has_llava) {
      toast.error('IA non disponible', {
        description: 'Assurez-vous qu\'Ollama est en cours d\'exécution avec LLaVA'
      });
      setStep('editing');
      return;
    }

    try {
      setStep('analyzing');
      setAnalyzing(true);
      setAnalysisProgress(10);

      const base64 = imageDataUrl.split(',')[1];
      
      setAnalysisProgress(30);
      
      const response = await aiApi.analyze(base64);
      const analysis = response.data;
      
      setAnalysisProgress(80);
      
      // Auto-generate name based on analysis
      const autoName = generateProductName(analysis);
      
      // Update form with AI analysis
      setFormData({
        name: autoName,
        description: analysis.description || '',
        product_type: 'stamp', // Will be detected by AI in future
        condition: analysis.condition || 'good',
        is_obliterated: analysis.is_obliterated || false,
        year: analysis.year?.toString() || '',
        country: analysis.country || '',
        category: analysis.category || '',
        rarity: analysis.rarity || 'common',
        price: analysis.suggested_price?.toFixed(2) || '',
        estimated_value: analysis.estimated_value?.toFixed(2) || '',
        history: analysis.history || '',
        print_quantity: '',
        dimensions: '',
        image_url: imageDataUrl
      });
      
      setAiConfidence(analysis.confidence || 0);
      setAnalysisProgress(100);
      
      setTimeout(() => {
        setStep('confirm');
        setAnalyzing(false);
      }, 500);
      
      toast.success('Analyse terminée !', {
        description: `Confiance: ${Math.round((analysis.confidence || 0) * 100)}%`
      });
      
    } catch (error) {
      console.error('AI analysis error:', error);
      setAnalyzing(false);
      setStep('editing');
      toast.error('Échec de l\'analyse', {
        description: error.response?.data?.detail || 'Vous pouvez saisir les informations manuellement'
      });
    }
  };

  const generateProductName = (analysis) => {
    const parts = [];
    if (analysis.category) parts.push(analysis.category);
    if (analysis.country) parts.push(analysis.country);
    if (analysis.year) parts.push(analysis.year);
    if (analysis.is_obliterated) parts.push('Oblitéré');
    
    if (parts.length === 0) return 'Timbre de collection';
    return parts.join(' - ');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setImageData(null);
    setFormData({
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
    setAiConfidence(0);
    setStep('capture');
  };

  const handleSave = async () => {
    if (!formData.name || !formData.price || !formData.country) {
      toast.error('Veuillez remplir les champs obligatoires', {
        description: 'Nom, Prix et Pays sont requis'
      });
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
      
      toast.success('Produit enregistré !', {
        description: `"${formData.name}" est maintenant en vente`
      });
      
      setShowConfirmDialog(false);
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

  return (
    <div className="animate-fade-in" data-testid="admin-add-product">
      <div className="max-w-5xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Header */}
        <Link 
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Wand2 className="h-8 w-8 text-primary" />
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Scanner un produit
            </h1>
          </div>
          
          {/* AI Status Badge */}
          <Badge 
            variant={aiStatus.status === 'online' && aiStatus.has_llava ? 'default' : 'destructive'}
            className="gap-1"
          >
            <span className={`w-2 h-2 rounded-full ${aiStatus.status === 'online' && aiStatus.has_llava ? 'bg-green-400' : 'bg-red-400'}`} />
            IA {aiStatus.status === 'online' && aiStatus.has_llava ? 'Connectée' : 'Hors ligne'}
          </Badge>
        </div>

        {/* AI Status Alert */}
        {aiStatus.status !== 'online' && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>IA non disponible</AlertTitle>
            <AlertDescription>
              Assurez-vous qu'Ollama est en cours d'exécution sur votre PC avec le modèle LLaVA.
              <br />
              <code className="bg-destructive/20 px-2 py-1 rounded mt-2 inline-block">
                ollama serve & ollama pull llava
              </code>
            </AlertDescription>
          </Alert>
        )}

        {aiStatus.status === 'online' && !aiStatus.has_llava && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Modèle LLaVA requis</AlertTitle>
            <AlertDescription>
              Installez le modèle LLaVA: <code className="bg-muted px-2 py-1 rounded">ollama pull llava</code>
            </AlertDescription>
          </Alert>
        )}

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {['capture', 'analyzing', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${step === s || (step === 'editing' && s === 'confirm') 
                  ? 'bg-primary text-primary-foreground' 
                  : i < ['capture', 'analyzing', 'confirm'].indexOf(step) || (step === 'editing' && s !== 'confirm')
                    ? 'bg-green-500 text-white'
                    : 'bg-muted text-muted-foreground'
                }
              `}>
                {i < ['capture', 'analyzing', 'confirm'].indexOf(step) || (step === 'editing' && s !== 'confirm')
                  ? <Check className="h-5 w-5" />
                  : i + 1
                }
              </div>
              <span className={`ml-2 font-medium ${step === s || (step === 'editing' && s === 'confirm') ? 'text-foreground' : 'text-muted-foreground'}`}>
                {s === 'capture' && 'Capture'}
                {s === 'analyzing' && 'Analyse'}
                {s === 'confirm' && 'Confirmation'}
              </span>
              {i < 2 && <div className="w-12 h-0.5 bg-border mx-4" />}
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          
          {/* STEP 1: Capture */}
          {step === 'capture' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Camera className="h-16 w-16 text-primary mx-auto mb-4" />
                <h2 className="font-serif text-2xl font-semibold mb-2">
                  Photographier le produit
                </h2>
                <p className="text-muted-foreground">
                  Prenez une photo ou importez une image de votre timbre ou enveloppe
                </p>
              </div>

              {cameraActive ? (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden max-w-2xl mx-auto">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-red-500 text-white animate-pulse">
                        ● LIVE
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4">
                    <Button
                      size="lg"
                      onClick={capturePhoto}
                      className="btn-burgundy gap-2"
                      data-testid="capture-btn"
                    >
                      <Camera className="h-5 w-5" />
                      Capturer
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={stopCamera}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {/* Camera Option */}
                  <button
                    onClick={startCamera}
                    className="p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors text-center group"
                    data-testid="start-camera-btn"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Prendre une photo</h3>
                    <p className="text-sm text-muted-foreground">
                      Utilisez la caméra de votre appareil
                    </p>
                  </button>

                  {/* Upload Option */}
                  <label className="p-8 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-colors text-center cursor-pointer group">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-1">Importer une image</h3>
                    <p className="text-sm text-muted-foreground">
                      PNG, JPG jusqu'à 10MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      data-testid="file-input"
                    />
                  </label>
                </div>
              )}

              {cameraError && (
                <Alert variant="destructive" className="mt-6 max-w-2xl mx-auto">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{cameraError}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* STEP 2: Analyzing */}
          {step === 'analyzing' && (
            <div className="p-8">
              <div className="max-w-xl mx-auto text-center">
                <div className="relative mb-8">
                  {imageData && (
                    <div className="relative inline-block">
                      <img 
                        src={imageData} 
                        alt="Analyzing" 
                        className="max-h-64 rounded-lg mx-auto"
                      />
                      {/* Scanning animation */}
                      <div className="absolute inset-0 overflow-hidden rounded-lg">
                        <div 
                          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
                          style={{
                            animation: 'scan 2s linear infinite',
                            top: `${analysisProgress}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <Sparkles className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
                <h2 className="font-serif text-2xl font-semibold mb-2">
                  Analyse en cours...
                </h2>
                <p className="text-muted-foreground mb-6">
                  L'IA examine l'image pour identifier le produit
                </p>
                
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2 mb-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <p className={analysisProgress >= 10 ? 'text-foreground' : ''}>
                    {analysisProgress >= 10 ? '✓' : '○'} Préparation de l'image
                  </p>
                  <p className={analysisProgress >= 30 ? 'text-foreground' : ''}>
                    {analysisProgress >= 30 ? '✓' : '○'} Détection de l'état et oblitération
                  </p>
                  <p className={analysisProgress >= 60 ? 'text-foreground' : ''}>
                    {analysisProgress >= 60 ? '✓' : '○'} Identification origine et date
                  </p>
                  <p className={analysisProgress >= 80 ? 'text-foreground' : ''}>
                    {analysisProgress >= 80 ? '✓' : '○'} Estimation de la valeur
                  </p>
                  <p className={analysisProgress >= 100 ? 'text-foreground' : ''}>
                    {analysisProgress >= 100 ? '✓' : '○'} Finalisation
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Confirm / Edit */}
          {(step === 'confirm' || step === 'editing') && (
            <div className="p-8">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Image Preview */}
                <div>
                  <div className="bg-muted rounded-xl p-4 mb-4">
                    {imageData && (
                      <img 
                        src={imageData} 
                        alt="Product" 
                        className="w-full h-auto rounded-lg"
                      />
                    )}
                  </div>
                  
                  {step === 'confirm' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 mb-2">
                        <Sparkles className="h-5 w-5" />
                        <span className="font-semibold">Analyse IA terminée</span>
                      </div>
                      <p className="text-sm text-green-600">
                        Confiance: {Math.round(aiConfidence * 100)}%
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Vérifiez et modifiez les informations si nécessaire avant de confirmer.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={resetForm}
                      className="flex-1 gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Nouveau scan
                    </Button>
                    {step === 'confirm' && (
                      <Button
                        variant="outline"
                        onClick={() => setStep('editing')}
                        className="flex-1 gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Modifier
                      </Button>
                    )}
                  </div>
                </div>

                {/* Form */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-xl font-semibold">
                      {step === 'confirm' ? 'Informations détectées' : 'Modifier les informations'}
                    </h3>
                    {step === 'editing' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStep('confirm')}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>

                  {/* Form Fields */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nom du produit *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={step === 'confirm'}
                        className={step === 'confirm' ? 'bg-muted' : ''}
                        data-testid="product-name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={formData.product_type}
                          onValueChange={(v) => handleSelectChange('product_type', v)}
                          disabled={step === 'confirm'}
                        >
                          <SelectTrigger className={step === 'confirm' ? 'bg-muted' : ''}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="stamp">Timbre</SelectItem>
                            <SelectItem value="envelope">Enveloppe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>État</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(v) => handleSelectChange('condition', v)}
                          disabled={step === 'confirm'}
                        >
                          <SelectTrigger className={step === 'confirm' ? 'bg-muted' : ''}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(conditionLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Pays *</Label>
                        <Input
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          disabled={step === 'confirm'}
                          className={step === 'confirm' ? 'bg-muted' : ''}
                          data-testid="product-country"
                        />
                      </div>

                      <div>
                        <Label>Année</Label>
                        <Input
                          name="year"
                          type="number"
                          value={formData.year}
                          onChange={handleInputChange}
                          disabled={step === 'confirm'}
                          className={step === 'confirm' ? 'bg-muted' : ''}
                          data-testid="product-year"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Catégorie</Label>
                        <Input
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          disabled={step === 'confirm'}
                          className={step === 'confirm' ? 'bg-muted' : ''}
                        />
                      </div>

                      <div>
                        <Label>Rareté</Label>
                        <Select
                          value={formData.rarity}
                          onValueChange={(v) => handleSelectChange('rarity', v)}
                          disabled={step === 'confirm'}
                        >
                          <SelectTrigger className={step === 'confirm' ? 'bg-muted' : ''}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(rarityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <Label className="cursor-pointer">Oblitéré</Label>
                      <Switch
                        checked={formData.is_obliterated}
                        onCheckedChange={(checked) => handleSelectChange('is_obliterated', checked)}
                        disabled={step === 'confirm'}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prix de vente (€) *</Label>
                        <Input
                          name="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={handleInputChange}
                          disabled={step === 'confirm'}
                          className={`font-mono text-lg ${step === 'confirm' ? 'bg-muted' : ''}`}
                          data-testid="product-price"
                        />
                      </div>

                      <div>
                        <Label>Valeur estimée (€)</Label>
                        <Input
                          name="estimated_value"
                          type="number"
                          step="0.01"
                          value={formData.estimated_value}
                          onChange={handleInputChange}
                          disabled={step === 'confirm'}
                          className={`font-mono ${step === 'confirm' ? 'bg-muted' : ''}`}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        disabled={step === 'confirm'}
                        className={step === 'confirm' ? 'bg-muted' : ''}
                        rows={3}
                      />
                    </div>

                    <div>
                      <Label>Histoire / Contexte</Label>
                      <Textarea
                        name="history"
                        value={formData.history}
                        onChange={handleInputChange}
                        disabled={step === 'confirm'}
                        className={step === 'confirm' ? 'bg-muted' : ''}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4 pt-4">
                    {step === 'confirm' ? (
                      <Button
                        onClick={() => setShowConfirmDialog(true)}
                        className="flex-1 btn-burgundy gap-2"
                        size="lg"
                        data-testid="confirm-save-btn"
                      >
                        <Check className="h-5 w-5" />
                        Confirmer et mettre en vente
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowConfirmDialog(true)}
                        className="flex-1 btn-burgundy gap-2"
                        size="lg"
                        data-testid="save-btn"
                      >
                        <Save className="h-5 w-5" />
                        Enregistrer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden canvas for photo capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer l'enregistrement</DialogTitle>
              <DialogDescription>
                Le produit sera mis en vente sur votre boutique.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="flex gap-4 items-start">
                {imageData && (
                  <img 
                    src={imageData} 
                    alt="Product" 
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                )}
                <div>
                  <h4 className="font-semibold">{formData.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {formData.country} {formData.year && `• ${formData.year}`}
                  </p>
                  <p className="font-mono font-semibold text-primary mt-1">
                    {formData.price} €
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleSave} 
                className="btn-burgundy gap-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Confirmer
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          100% { top: 100%; }
        }
      `}</style>
    </div>
  );
};

export default AdminAddProductPage;
