import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Stamp, Mail, Sparkles, Shield, Search } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="animate-fade-in" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted opacity-90" />
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1767635360163-0633939b9f4b?w=1920&q=80")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-20 md:py-32">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-8">
              <Badge className="bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                <Sparkles className="h-3 w-3 mr-1" />
                Analyse IA intégrée
              </Badge>
              
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Votre Collection<br />
                <span className="text-primary">Philatélique</span><br />
                D'Exception
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Découvrez des timbres et enveloppes rares, authentifiés par notre intelligence artificielle. 
                Chaque pièce raconte une histoire unique de l'histoire postale.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/timbres">
                  <Button size="lg" className="btn-burgundy gap-2" data-testid="cta-stamps">
                    <Stamp className="h-5 w-5" />
                    Explorer les Timbres
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/enveloppes">
                  <Button size="lg" variant="outline" className="gap-2" data-testid="cta-envelopes">
                    <Mail className="h-5 w-5" />
                    Voir les Enveloppes
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="md:col-span-5 relative">
              <div className="relative aspect-square max-w-md mx-auto">
                <div className="absolute inset-4 bg-card rounded-2xl shadow-float transform rotate-3 border border-border" />
                <div className="absolute inset-4 bg-card rounded-2xl shadow-float transform -rotate-3 border border-border" />
                <div className="relative bg-card rounded-2xl shadow-float p-6 border border-border">
                  <img
                    src="https://images.unsplash.com/photo-1767869168428-910a487a11b0?w=600&h=600&fit=crop"
                    alt="Collection de timbres"
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Nos Collections
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explorez notre sélection de pièces philatéliques soigneusement sélectionnées
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Stamps Category */}
            <Link 
              to="/timbres"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow"
              data-testid="category-stamps"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1767869168428-910a487a11b0?w=800&h=600&fit=crop"
                  alt="Timbres de collection"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Stamp className="h-5 w-5 text-white" />
                  <Badge className="bg-white/20 text-white border-0">Collection</Badge>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white mb-2">Timbres</h3>
                <p className="text-white/80 text-sm">
                  Des raretés aux classiques, découvrez notre sélection de timbres du monde entier.
                </p>
              </div>
            </Link>

            {/* Envelopes Category */}
            <Link 
              to="/enveloppes"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow"
              data-testid="category-envelopes"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1767869171276-afe238e1df22?w=800&h=600&fit=crop"
                  alt="Enveloppes de collection"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Mail className="h-5 w-5 text-white" />
                  <Badge className="bg-white/20 text-white border-0">Collection</Badge>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white mb-2">Enveloppes</h3>
                <p className="text-white/80 text-sm">
                  Lettres historiques, premiers jours et enveloppes commémoratives.
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Pourquoi Nous Choisir
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Analyse IA</h3>
              <p className="text-muted-foreground text-sm">
                Chaque pièce est analysée par notre IA pour garantir l'authenticité et estimer la valeur.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Authenticité</h3>
              <p className="text-muted-foreground text-sm">
                Toutes nos pièces sont vérifiées et accompagnées d'informations détaillées sur leur provenance.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Search className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Recherche Facile</h3>
              <p className="text-muted-foreground text-sm">
                Filtrez par pays, année, rareté et plus encore pour trouver la pièce parfaite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Prêt à Enrichir Votre Collection ?
          </h2>
          <p className="text-secondary-foreground/70 max-w-2xl mx-auto mb-8">
            Parcourez notre catalogue et trouvez des pièces uniques pour votre collection philatélique.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/timbres">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Voir les Timbres
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/enveloppes">
              <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 gap-2">
                Voir les Enveloppes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
