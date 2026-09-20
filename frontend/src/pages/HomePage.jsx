import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowRight, Laugh, Sparkles, Shield, Truck } from 'lucide-react';
import { CUSTOM_TSHIRTS_ENABLED } from '../config/features';

const HomePage = () => {
  return (
    <div className="animate-fade-in" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted opacity-90" />
        <div 
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1920&q=80")`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-20 md:py-32">
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 space-y-8">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Portez<br />
                <span className="text-primary">Votre Style</span><br />
                Sans Filtre
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Des t-shirts drôles inspirés des memes et des influenceurs, et des designs modernes et épurés.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/memes">
                  <Button size="lg" className="btn-burgundy gap-2" data-testid="cta-memes">
                    <Laugh className="h-5 w-5" />
                    Voir les Memes
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/modernes">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Sparkles className="h-5 w-5" />
                    Voir le Style Modern
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
                    src="http://cine-production.github.io/ServiceTiers/BASEDONNEE/IMGPhilatelic/Pr%C3%A9sentation.png"
                    alt="Collection de t-shirts"
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
              Deux styles, une seule règle : ton t-shirt doit te ressembler
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Meme Category */}
            <Link 
              to="/memes"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow"
              data-testid="category-memes"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&h=600&fit=crop"
                  alt="T-shirts memes"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Laugh className="h-5 w-5 text-white" />
                  <Badge className="bg-white/20 text-white border-0">Collection</Badge>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white mb-2">Memes</h3>
                <p className="text-white/80 text-sm">
                  Les répliques et memes d'influenceurs les plus drôles, sur un t-shirt.
                </p>
              </div>
            </Link>

            {/* Modern Category */}
            <Link 
              to="/modernes"
              className="group relative overflow-hidden rounded-2xl bg-card border border-border shadow-card hover:shadow-card-hover transition-shadow"
              data-testid="category-modern"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=600&fit=crop"
                  alt="T-shirts style moderne"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-5 w-5 text-white" />
                  <Badge className="bg-white/20 text-white border-0">Collection</Badge>
                </div>
                <h3 className="font-serif text-2xl font-bold text-white mb-2">Modern</h3>
                <p className="text-white/80 text-sm">
                  Coupes épurées et designs minimalistes pour un look actuel.
                </p>
              </div>
            </Link>
          </div>

          {/* Lien discret vers le sur-mesure, sans le mettre en avant */}
          {CUSTOM_TSHIRTS_ENABLED && (
            <p className="text-center text-sm text-muted-foreground mt-8">
              Envie d'un t-shirt sur-mesure ?{' '}
              <Link to="/personnalise" className="text-primary hover:underline">
                Découvre nos bases personnalisables
              </Link>
            </p>
          )}
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
                <Laugh className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Designs Originaux</h3>
              <p className="text-muted-foreground text-sm">
                Des visuels drôles et actuels, renouvelés régulièrement.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Qualité Garantie</h3>
              <p className="text-muted-foreground text-sm">
                Des t-shirts confortables, résistants au lavage, pour un port au quotidien.
              </p>
            </div>
            
            <div className="text-center p-6 rounded-xl bg-card border border-border">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Truck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-xl font-semibold mb-2">Suivi de Commande</h3>
              <p className="text-muted-foreground text-sm">
                Suis ta commande en temps réel, de la préparation à la livraison.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-secondary text-secondary-foreground">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
            Prêt à Trouver Ton T-Shirt ?
          </h2>
          <p className="text-secondary-foreground/70 max-w-2xl mx-auto mb-8">
            Parcours le catalogue ou crée ton propre design en quelques clics.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/memes">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Voir les Memes
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/modernes">
              <Button size="lg" variant="outline" className="border-secondary-foreground/30 text-secondary-foreground hover:bg-secondary-foreground/10 gap-2">
                Voir le Style Modern
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
