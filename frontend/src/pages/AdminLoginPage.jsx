import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, register, isAuthenticated, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });

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

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const user = await register(registerData.email, registerData.password, registerData.name);
      
      toast.success('Compte créé !', {
        description: user.is_admin 
          ? 'Vous êtes maintenant administrateur' 
          : 'Compte créé avec succès'
      });
      
      // Always redirect to admin dashboard - context will handle access control
      setTimeout(() => {
        navigate('/admin', { replace: true });
      }, 100);
    } catch (error) {
      toast.error('Échec de l\'inscription', {
        description: error.response?.data?.detail || 'Vérifiez les informations'
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
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Connexion</TabsTrigger>
              <TabsTrigger value="register">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
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
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground mb-4">
                  <UserPlus className="h-4 w-4 inline mr-2" />
                  Le premier utilisateur inscrit devient automatiquement administrateur.
                </div>
                <div>
                  <Label htmlFor="register-name">Nom</Label>
                  <Input
                    id="register-name"
                    type="text"
                    value={registerData.name}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Jean Dupont"
                    required
                    data-testid="register-name"
                  />
                </div>
                <div>
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@example.com"
                    required
                    data-testid="register-email"
                  />
                </div>
                <div>
                  <Label htmlFor="register-password">Mot de passe</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerData.password}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    data-testid="register-password"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full btn-burgundy" 
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Inscription...
                    </>
                  ) : (
                    'Créer un compte'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
