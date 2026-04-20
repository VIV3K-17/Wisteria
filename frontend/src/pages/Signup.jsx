import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const Signup = () => {
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const { signup, sendEmailOTP, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateStep1 = () => {
    const errs = {};
    if (!fullName.trim()) errs.fullName = 'Full name is required';
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format';
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!validateStep1()) return;
    
    setLoading(true);
    const result = await sendEmailOTP(email.trim().toLowerCase());
    setLoading(false);
    
    if (result.success) {
      setStep(2);
      toast({
        title: 'OTP Sent',
        description: result.data?.message || 'Please check your email inbox'
      });
    } else {
      toast({
        title: 'Error',
        description: result.error || 'Failed to send OTP. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleVerifyAndSignup = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter a 6-digit OTP',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    const result = await signup({
      fullName,
      email,
      password,
      otp
    });
    setLoading(false);

    if (result.success) {
      toast({
        title: 'Account created!',
        description: 'Now let\'s set up your emergency contacts'
      });
      // Route to settings to enforce emergency contact setup
      setTimeout(() => navigate('/settings'), 1500);
    } else {
      toast({
        title: 'Signup failed',
        description: result.error || 'User already exists or invalid OTP',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4"
          >
            <Shield className="w-8 h-8 text-primary-foreground" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">
            {step === 1 ? 'Create Account' : 'Verify Identity'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {step === 1 ? 'Join SafeTravel today' : 'Enter OTP sent to your email'}
          </p>
        </div>

        <div className="glass-card rounded-2xl p-6 soft-shadow overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSendOTP}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} className="pl-10 rounded-xl" />
                  </div>
                  {errors.fullName && <p className="text-destructive text-xs">{errors.fullName}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 rounded-xl" />
                  </div>
                  {errors.email && <p className="text-destructive text-xs">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type={showPassword ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="pl-10 pr-10 rounded-xl" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-destructive text-xs">{errors.password}</p>}
                </div>

                <Button type="submit" disabled={loading} className="w-full gradient-primary rounded-xl h-12 mt-4">
                  {loading ? 'Sending OTP...' : 'Send Email OTP'}
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleVerifyAndSignup}
                className="space-y-6 flex flex-col items-center"
              >
                <div className="flex justify-center w-full">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="w-full space-y-3">
                  <Button type="submit" disabled={loading || otp.length !== 6} className="w-full gradient-primary rounded-xl h-12">
                    {loading ? 'Verifying...' : 'Verify & Sign Up'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setStep(1)} className="w-full rounded-xl">
                    Back to edit info
                  </Button>
                </div>
                
                <p className="text-xs text-muted-foreground text-center">
                  Did not receive OTP? <button type="button" className="text-primary hover:underline" onClick={handleSendOTP}>Resend</button>
                </p>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-muted-foreground mt-6 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Signup;