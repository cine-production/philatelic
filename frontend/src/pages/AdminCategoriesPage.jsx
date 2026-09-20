import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Tag, Shirt, Palette, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { categoriesApi, stylesApi, colorsApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const TaxonomyPanel = ({ title, icon, items, newValue, setNewValue, onAdd, onDelete, loading, placeholder }) => (
  <div className="bg-card rounded-lg border border-border p-6">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
    </div>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAdd();
      }}
      className="flex gap-2 mb-4"
    >
      <Input
        value={newValue}
        onChange={(e) => setNewValue(e.target.value)}
        placeholder={placeholder}
      />
      <Button type="submit" className="btn-burgundy gap-2" disabled={loading || !newValue.trim()}>
        <Plus className="h-4 w-4" />
        Ajouter
      </Button>
    </form>

    {items.length === 0 ? (
      <p className="text-sm text-muted-foreground">Aucun élément pour le moment.</p>
    ) : (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item.id} variant="outline" className="gap-2 py-1.5 pl-3 pr-2 text-sm">
            {item.name}
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="hover:text-destructive transition-colors"
              aria-label={`Supprimer ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ))}
      </div>
    )}
  </div>
);

const AdminCategoriesPage = () => {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState([]);
  const [styles, setStyles] = useState([]);
  const [colors, setColors] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [newStyle, setNewStyle] = useState('');
  const [newColor, setNewColor] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const fetchAll = async () => {
    try {
      setInitialLoading(true);
      const [catRes, styleRes, colorRes] = await Promise.all([
        categoriesApi.getAll(),
        stylesApi.getAll(),
        colorsApi.getAll(),
      ]);
      setCategories(catRes.data);
      setStyles(styleRes.data);
      setColors(colorRes.data);
    } catch (error) {
      console.error('Failed to fetch taxonomies:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      setLoading(true);
      const res = await categoriesApi.create(newCategory.trim());
      setCategories((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategory('');
      toast.success('Catégorie ajoutée');
    } catch (error) {
      toast.error('Erreur', { description: error.response?.data?.detail || 'Impossible d\'ajouter la catégorie' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStyle = async () => {
    if (!newStyle.trim()) return;
    try {
      setLoading(true);
      const res = await stylesApi.create(newStyle.trim());
      setStyles((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewStyle('');
      toast.success('Style ajouté');
    } catch (error) {
      toast.error('Erreur', { description: error.response?.data?.detail || 'Impossible d\'ajouter le style' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await categoriesApi.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
      toast.success('Catégorie supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleDeleteStyle = async (id) => {
    try {
      await stylesApi.delete(id);
      setStyles((prev) => prev.filter((s) => s.id !== id));
      toast.success('Style supprimé');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleAddColor = async () => {
    if (!newColor.trim()) return;
    try {
      setLoading(true);
      const res = await colorsApi.create(newColor.trim());
      setColors((prev) => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
      setNewColor('');
      toast.success('Couleur ajoutée');
    } catch (error) {
      toast.error('Erreur', { description: error.response?.data?.detail || 'Impossible d\'ajouter la couleur' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteColor = async (id) => {
    try {
      await colorsApi.delete(id);
      setColors((prev) => prev.filter((c) => c.id !== id));
      toast.success('Couleur supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (authLoading || (!isAuthenticated || !isAdmin)) {
    return null;
  }

  return (
    <div className="animate-fade-in" data-testid="admin-categories-page">
      <div className="max-w-4xl mx-auto px-4 md:px-8 lg:px-12 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>

        <h1 className="font-serif text-3xl font-bold text-foreground mb-2">
          Catégories & Styles
        </h1>
        <p className="text-muted-foreground mb-8">
          Gère les listes proposées lors de l'ajout ou de la modification d'un t-shirt.
          Les couleurs correspondent aux teintes de base neutres que tu utilises pour fabriquer tes t-shirts.
        </p>

        {initialLoading ? (
          <div className="text-center py-16">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            <TaxonomyPanel
              title="Catégories"
              icon={<Tag className="h-5 w-5 text-primary" />}
              items={categories}
              newValue={newCategory}
              setNewValue={setNewCategory}
              onAdd={handleAddCategory}
              onDelete={handleDeleteCategory}
              loading={loading}
              placeholder="Ex: Influenceurs, Gaming, Cinéma..."
            />
            <TaxonomyPanel
              title="Styles"
              icon={<Shirt className="h-5 w-5 text-primary" />}
              items={styles}
              newValue={newStyle}
              setNewValue={setNewStyle}
              onAdd={handleAddStyle}
              onDelete={handleDeleteStyle}
              loading={loading}
              placeholder="Ex: Oversize, Regular, Crop..."
            />
            <TaxonomyPanel
              title="Couleurs de base"
              icon={<Palette className="h-5 w-5 text-primary" />}
              items={colors}
              newValue={newColor}
              setNewValue={setNewColor}
              onAdd={handleAddColor}
              onDelete={handleDeleteColor}
              loading={loading}
              placeholder="Ex: Noir, Blanc, Beige..."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
