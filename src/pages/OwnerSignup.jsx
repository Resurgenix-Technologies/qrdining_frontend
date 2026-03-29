import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Building2, ArrowLeft, ArrowRight, Eye, EyeOff, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

// Mask email for privacy: swapnil@gmail.com → sw*****@gmail.com
function maskEmail(email) {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

export default function OwnerSignup() {
  const navigate = useNavigate();
  const { initiateSignup, verifySignup } = useAuth();

  // ── Step 1 state ──
  const [step, setStep] = useState(1);
  const [restaurantName, setRestaurantName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ── Step 2 state ──
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const cooldownRef = useRef(null);

  // ── Shared state ──
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Start resend cooldown timer
  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // ── Step 1: Submit registration form ──
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }

    setIsLoading(true);
    try {
      await initiateSignup(ownerName, email, password, restaurantName);
      setStep(2);
      startCooldown(60);
      // Focus first OTP box after animation
      setTimeout(() => otpRefs.current[0]?.focus(), 350);
    } catch (err) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: OTP input handling ──
  const handleOtpChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) newOtp[i] = pasted[i];
    setOtp(newOtp);
    const nextEmpty = pasted.length < 6 ? pasted.length : 5;
    otpRefs.current[nextEmpty]?.focus();
  };

  // ── Step 2: Verify OTP ──
  const handleVerify = async (e) => {
    e.preventDefault();
    const otpStr = otp.join('');
    if (otpStr.length < 6) { setError('Please enter all 6 digits.'); return; }

    setIsLoading(true);
    setError('');
    try {
      await verifySignup(email, otpStr);
      navigate('/owner/setup');
    } catch (err) {
      setError(err.message || 'Verification failed. Please try again.');
      // Shake the OTP boxes on error
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (resendCooldown > 0 || isLoading) return;
    setIsLoading(true);
    setError('');
    setOtp(['', '', '', '', '', '']);
    try {
      await initiateSignup(ownerName, email, password, restaurantName);
      startCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <div className="min-h-[calc(100vh-65px)] flex items-center justify-center px-4 py-12 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        {step === 1 ? (
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted hover:text-primary transition mb-10">
            <ArrowLeft className="w-4 h-4" /> Home
          </button>
        ) : (
          <button onClick={() => { setStep(1); setError(''); setOtp(['','','','','','']); }} className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-muted hover:text-primary transition mb-10">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        )}

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                step > s ? 'bg-black text-white' : step === s ? 'bg-black text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
              <span className={`text-xs font-bold tracking-wide uppercase transition-colors ${step >= s ? 'text-primary' : 'text-muted/40'}`}>
                {s === 1 ? 'Details' : 'Verify Email'}
              </span>
              {s < 2 && <div className={`flex-1 h-px w-8 transition-colors ${step > s ? 'bg-black' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Error banner */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key={error}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 p-4 text-sm font-medium mb-6 rounded-lg"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" custom={step}>

          {/* ── STEP 1: Registration Form ── */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={1}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <h1 className="text-4xl md:text-5xl heading-font font-bold mb-3 tracking-tight">Create account</h1>
              <p className="text-muted text-sm mb-10 leading-relaxed max-w-xs">Start your restaurant's digital journey today.</p>

              <form onSubmit={handleFormSubmit} className="space-y-5">
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Restaurant Name</label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-muted-light absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="text" required value={restaurantName} onChange={e => setRestaurantName(e.target.value)} className="input-premium pl-12" placeholder="e.g. The Urban Fork" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-light absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="text" required value={ownerName} onChange={e => setOwnerName(e.target.value)} className="input-premium pl-12" placeholder="John Doe" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Email</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted-light absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="input-premium pl-12" placeholder="you@restaurant.com" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-light absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="input-premium pl-12 pr-12"
                      placeholder="Min. 6 characters"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted-light absolute left-4 top-1/2 -translate-y-1/2" />
                    <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-premium pl-12" placeholder="Re-enter password" />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Send Verification Code <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-muted mt-8">
                Already have an account?{' '}
                <Link to="/owner-login" className="text-primary font-bold underline underline-offset-4 hover:text-muted transition">Sign in</Link>
              </p>

              <p className="text-center mt-6 text-[10px] text-muted/40">
                Powered by{' '}
                <a href="https://www.resurgenixtechnologies.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition underline underline-offset-2">
                  Resurgenix Technologies
                </a>
              </p>
            </motion.div>
          )}

          {/* ── STEP 2: OTP Verification ── */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={2}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {/* Icon */}
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-8 h-8 text-white" />
              </div>

              <h1 className="text-3xl md:text-4xl heading-font font-bold mb-3 tracking-tight">Check your email</h1>
              <p className="text-muted text-sm mb-2 leading-relaxed">
                We sent a 6-digit verification code to
              </p>
              <p className="font-bold text-sm mb-8 font-mono tracking-wide bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg inline-block">
                {maskEmail(email)}
              </p>

              <form onSubmit={handleVerify} className="space-y-6">
                {/* OTP boxes */}
                <div>
                  <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-4">Verification Code</label>
                  <div className="flex gap-3 justify-between" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={el => otpRefs.current[i] = el}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={e => handleOtpChange(i, e.target.value)}
                        onKeyDown={e => handleOtpKeyDown(i, e)}
                        className={`w-full aspect-square text-center text-2xl font-bold tracking-tight border-2 rounded-xl transition-all duration-200 outline-none caret-white focus:border-black focus:bg-black focus:text-white ${
                          digit ? 'border-black bg-black text-white' : 'border-gray-200 bg-white text-primary'
                        }`}
                        style={{ minWidth: 0 }}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                {/* Timing note */}
                <p className="text-xs text-muted text-center">
                  Code expires in <span className="font-bold text-amber-500">10 minutes</span>. Check spam if not received.
                </p>

                <button
                  type="submit"
                  disabled={isLoading || otp.join('').length < 6}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>Verify & Create Account <CheckCircle2 className="w-4 h-4" /></>
                  )}
                </button>

                {/* Resend */}
                <div className="text-center">
                  <p className="text-sm text-muted mb-1">Didn't receive the code?</p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || isLoading}
                    className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:opacity-70 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
                  </button>
                </div>
              </form>

              <p className="text-center mt-8 text-[10px] text-muted/40">
                Powered by{' '}
                <a href="https://www.resurgenixtechnologies.com" target="_blank" rel="noopener noreferrer" className="hover:text-muted transition underline underline-offset-2">
                  Resurgenix Technologies
                </a>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
