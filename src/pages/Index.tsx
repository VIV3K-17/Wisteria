import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, MapPin, Bell, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  { icon: MapPin, title: 'Live Tracking', desc: 'Real-time GPS-based journey monitoring' },
  { icon: Shield, title: 'Safety Checks', desc: 'Checkpoint-based safety verification' },
  { icon: Bell, title: 'Smart Alerts', desc: 'Auto-alert emergency contacts if needed' },
];

const Index: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  React.useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
          className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center mb-6 soft-shadow"
        >
          <Shield className="w-10 h-10 text-primary-foreground" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-extrabold text-foreground mb-2"
        >
          SafeTravel
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground max-w-xs mb-8"
        >
          Your intelligent travel safety companion with real-time monitoring
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm space-y-3 mb-10"
        >
          <Button
            onClick={() => navigate('/signup')}
            className="w-full gradient-primary text-primary-foreground rounded-2xl h-14 font-semibold text-base soft-shadow"
          >
            Get Started
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="w-full rounded-2xl h-14 font-semibold text-base border-primary text-primary"
          >
            Sign In
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-lg">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass-card rounded-2xl p-4 soft-shadow text-center"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-2">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{f.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
