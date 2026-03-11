import { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';

const FilterSidebar = ({ filters, setFilters, countries = [], categories = [] }) => {
  const [openSections, setOpenSections] = useState({
    condition: true,
    rarity: true,
    price: true,
    country: false,
    category: false,
    year: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      condition: null,
      rarity: null,
      country: null,
      category: null,
      is_obliterated: null,
      min_price: null,
      max_price: null,
      min_year: null,
      max_year: null,
      sort_by: 'created_at',
      sort_order: 'desc'
    });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== null && v !== 'created_at' && v !== 'desc').length;

  const conditions = [
    { value: 'mint', label: 'Neuf' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Bon' },
    { value: 'fair', label: 'Correct' },
    { value: 'poor', label: 'Usé' }
  ];

  const rarities = [
    { value: 'common', label: 'Commun' },
    { value: 'uncommon', label: 'Peu commun' },
    { value: 'rare', label: 'Rare' },
    { value: 'very_rare', label: 'Très rare' },
    { value: 'exceptional', label: 'Exceptionnel' }
  ];

  return (
    <div className="bg-card rounded-lg border border-border p-4" data-testid="filter-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif font-semibold text-lg">Filtres</h3>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground gap-1"
            data-testid="clear-filters-btn"
          >
            <X className="h-4 w-4" />
            Effacer ({activeFiltersCount})
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {/* Sort */}
        <div className="pb-4 border-b border-border">
          <Label className="text-sm font-medium mb-2 block">Trier par</Label>
          <Select
            value={`${filters.sort_by}-${filters.sort_order}`}
            onValueChange={(value) => {
              const [sortBy, sortOrder] = value.split('-');
              handleFilterChange('sort_by', sortBy);
              handleFilterChange('sort_order', sortOrder);
            }}
          >
            <SelectTrigger data-testid="sort-select">
              <SelectValue placeholder="Trier par..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Plus récents</SelectItem>
              <SelectItem value="created_at-asc">Plus anciens</SelectItem>
              <SelectItem value="price-asc">Prix croissant</SelectItem>
              <SelectItem value="price-desc">Prix décroissant</SelectItem>
              <SelectItem value="year-desc">Année (récent)</SelectItem>
              <SelectItem value="year-asc">Année (ancien)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Obliteration */}
        <div className="pb-4 border-b border-border">
          <Label className="text-sm font-medium mb-2 block">Oblitération</Label>
          <div className="flex gap-2">
            <Badge
              variant={filters.is_obliterated === false ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange('is_obliterated', filters.is_obliterated === false ? null : false)}
              data-testid="filter-non-oblitere"
            >
              Non oblitéré
            </Badge>
            <Badge
              variant={filters.is_obliterated === true ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange('is_obliterated', filters.is_obliterated === true ? null : true)}
              data-testid="filter-oblitere"
            >
              Oblitéré
            </Badge>
          </div>
        </div>

        {/* Condition */}
        <Collapsible open={openSections.condition} onOpenChange={() => toggleSection('condition')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
            <span className="text-sm font-medium">État</span>
            {openSections.condition ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {conditions.map((cond) => (
              <div key={cond.value} className="flex items-center gap-2">
                <Checkbox
                  id={`condition-${cond.value}`}
                  checked={filters.condition === cond.value}
                  onCheckedChange={(checked) => handleFilterChange('condition', checked ? cond.value : null)}
                  data-testid={`filter-condition-${cond.value}`}
                />
                <Label htmlFor={`condition-${cond.value}`} className="text-sm cursor-pointer">
                  {cond.label}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Rarity */}
        <Collapsible open={openSections.rarity} onOpenChange={() => toggleSection('rarity')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t border-border pt-4">
            <span className="text-sm font-medium">Rareté</span>
            {openSections.rarity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            {rarities.map((rarity) => (
              <div key={rarity.value} className="flex items-center gap-2">
                <Checkbox
                  id={`rarity-${rarity.value}`}
                  checked={filters.rarity === rarity.value}
                  onCheckedChange={(checked) => handleFilterChange('rarity', checked ? rarity.value : null)}
                  data-testid={`filter-rarity-${rarity.value}`}
                />
                <Label htmlFor={`rarity-${rarity.value}`} className="text-sm cursor-pointer">
                  {rarity.label}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Price Range */}
        <Collapsible open={openSections.price} onOpenChange={() => toggleSection('price')}>
          <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t border-border pt-4">
            <span className="text-sm font-medium">Prix</span>
            {openSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="space-y-4">
              <Slider
                value={[filters.min_price || 0, filters.max_price || 1000]}
                min={0}
                max={1000}
                step={10}
                onValueChange={([min, max]) => {
                  handleFilterChange('min_price', min > 0 ? min : null);
                  handleFilterChange('max_price', max < 1000 ? max : null);
                }}
                data-testid="price-slider"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filters.min_price || 0} €</span>
                <span>{filters.max_price || 1000}+ €</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Country */}
        {countries.length > 0 && (
          <Collapsible open={openSections.country} onOpenChange={() => toggleSection('country')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t border-border pt-4">
              <span className="text-sm font-medium">Pays</span>
              {openSections.country ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Select
                value={filters.country || ''}
                onValueChange={(value) => handleFilterChange('country', value || null)}
              >
                <SelectTrigger data-testid="country-select">
                  <SelectValue placeholder="Tous les pays" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tous les pays</SelectItem>
                  {countries.filter(c => c && c.trim() !== '').map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Category */}
        {categories.length > 0 && (
          <Collapsible open={openSections.category} onOpenChange={() => toggleSection('category')}>
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 border-t border-border pt-4">
              <span className="text-sm font-medium">Catégorie</span>
              {openSections.category ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <Select
                value={filters.category || ''}
                onValueChange={(value) => handleFilterChange('category', value || null)}
              >
                <SelectTrigger data-testid="category-select">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Toutes les catégories</SelectItem>
                  {categories.filter(c => c && c.trim() !== '').map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
};

export default FilterSidebar;
