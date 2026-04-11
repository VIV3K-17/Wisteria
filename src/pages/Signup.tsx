import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, User, CreditCard, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const validateAadhaar = (aadhaar: string): boolean => {
  const cleaned = aadhaar.replace(/\s/g, '');
  return /^\d{12}$/.test(cleaned);
};

const formatAadhaar = (value: string): string => {
  const cleaned = value.replace(/\D/g, '').slice(0, 12);
  return cleaned.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (!validateAadhaar(aadhaar)) errs.aadhaar = 'Aadhaar must be exactly 12 digits';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const success = await signup({
      fullName,
      email,
      password,
      aadhaarNumber: aadhaar.replace(/\s/g, ''),
    });
    setLoading(false);
    if (success) {
      toast({ title: 'Account created!', description: 'Welcome to SafeTravel' });
      navigate('/dashboard');
    } else {
      toast({ title: 'Email already registered', variant: 'destructive' });
    }
  };

  const inputFields = [
    { id: 'fullName', label: 'Full Name', icon: User, type: 'text', value: fullName, onChange: (v: string) => setFullName(v), placeholder: 'John Doe', error: errors.fullName },
    { id: 'email', label: 'Email Address', icon: Mail, type: 'email', value: email, onChange: (v: string) => setEmail(v), placeholder: 'you@example.com', error: errors.email },
    { id: 'aadhaar', label: 'Aadhaar Number', icon: CreditCard, type: 'text', value: aadhaar, onChange: (v: string) => setAadhaar(formatAadhaar(v)), placeholder: '1234 5678 9012', error: errors.aadhaar },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <Shield className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-1">Join SafeTravel today</p>
        </div>

        <div className="glass-card rounded-2xl p-6 soft-shadow">
          <form onSubmit={handleSubmit} className="space-y-4">
            {inputFields.map((field, i) => (
              <motion.div
                key={field.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className="space-y-2"
              >
                <Label htmlFor={field.id} className="text-foreground">{field.label}</Label>
                <div className="relative">
                  <field.icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={field.id}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={field.value}
                    onChange={e => field.onChange(e.target.value)}
                    className="pl-10 rounded-xl bg-background border-border"
                  />
                </div>
                {field.error && <p className="text-destructive text-xs">{field.error}</p>}
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-10 pr-10 rounded-xl bg-background border-border"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
            </motion.div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full gradient-primary text-primary-foreground rounded-xl h-12 font-semibold text-base mt-2"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;
