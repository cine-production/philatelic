import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Redirect if already logged in as admin
  if (isAuthenticated && isAdmin) {
    navigate('/admin');
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = await login(loginData.email, loginData.password);

      if (user.is_admin) {
        toast.success('Bienvenue !', {
          description: `Connecté en tant que ${user.name}`
        });
        navigate('/admin');
      } else {
        toast.error('Accès refusé', {
          description: 'Ce compte n\'a pas les droits administrateur'
        });
      }
    } catch (error) {
      toast.error('Échec de connexion', {
        description: error.response?.data?.detail || 'Vérifiez vos identifiants'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" data-testid="admin-login-page">
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Administration
          </h1>
          <p className="text-muted-foreground mt-2">
            Connectez-vous pour gérer votre boutique
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@example.com"
                required
                data-testid="login-email"
              />
            </div>
            <div>
              <Label htmlFor="login-password">Mot de passe</Label>
              <Input
                id="login-password"
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••"
                required
                data-testid="login-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full btn-burgundy"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
