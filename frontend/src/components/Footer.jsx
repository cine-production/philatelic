import { Link } from 'react-router-dom';
import { Mail, MapPin } from 'lucide-react';
import { CUSTOM_TSHIRTS_ENABLED } from '../config/features';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-serif text-xl font-bold">👕</span>
              </div>
              <span className="font-serif text-xl font-semibold">MemeWear</span>
            </div>
            <p className="text-secondary-foreground/70 text-sm leading-relaxed">
              Des t-shirts drôles inspirés des memes et des influenceurs, et des designs modernes épurés.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-serif text-lg font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  to="/memes" 
                  className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                >
                  Memes
                </Link>
              </li>
              <li>
                <Link 
                  to="/modernes" 
                  className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                >
                  Modern
                </Link>
              </li>
              {CUSTOM_TSHIRTS_ENABLED && (
                <li>
                  <Link 
                    to="/personnalise" 
                    className="text-secondary-foreground/70 hover:text-secondary-foreground text-sm transition-colors"
                  >
                    Personnalisé
                  </Link>
                </li>
              )}
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
                contact@memewear.fr
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
            © {new Date().getFullYear()} MemeWear. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
