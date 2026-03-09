import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif text-xl font-bold">PC</span>
              </div>
              <span className="font-serif text-xl font-semibold">Philatelic Curator</span>
            </div>
            <p className="text-secondary-foreground/70 text-sm leading-relaxed">
              Votre expert en timbres et enveloppes de collection. 
              Découvrez des pièces rares et authentifiées par notre IA.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/timbres" 
                  className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                >
                  Timbres
                </Link>
              </li>
              <li>
                <Link 
                  to="/enveloppes" 
                  className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                >
                  Enveloppes
                </Link>
              </li>
              <li>
                <Link 
                  to="/panier" 
                  className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                >
                  Panier
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-2 text-secondary-foreground/70 text-sm">
                <Mail className="h-4 w-4" />
                contact@philatelic-curator.com
              </li>
              <li className="flex items-center gap-2 text-secondary-foreground/70 text-sm">
                <MapPin className="h-4 w-4" />
                France
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-secondary-foreground/50 text-sm">
            © {new Date().getFullYear()} Philatelic Curator. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
