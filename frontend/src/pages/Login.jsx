import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    login
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const handleSubmit = async e => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: 'Please fill all fields',
        variant: 'destructive'
      });
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast({
        title: 'Welcome back!',
        description: 'Login successful'
      });

      navigate('/dashboard', { replace: true });
    } else {
      toast({
        title: 'Invalid credentials',
        description: result.error || 'Please check your email and password',
        variant: 'destructive'
      });
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div initial={{
      opacity: 0,
      y: 30
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.5,
      ease: 'easeOut'
    }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <motion.div initial={{
          scale: 0
        }} animate={{
          scale: 1
        }} transition={{
          delay: 0.2,
          type: 'spring',
          stiffness: 200
        }} className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Wisteria</h1>
          <p className="text-muted-foreground mt-1">Your safety companion</p>
        </div>

        <div className="glass-card rounded-2xl p-6 soft-shadow">
          <h2 className="text-xl font-semibold text-foreground mb-6">Sign In</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 rounded-xl bg-background border-border" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 rounded-xl bg-background border-border" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full gradient-primary text-primary-foreground rounded-xl h-12 font-semibold text-base">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>;
};
export default Login;