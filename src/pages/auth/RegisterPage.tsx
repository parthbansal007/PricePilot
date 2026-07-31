import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils/cn';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the terms',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
  });

  const password = watch('password', '');

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-danger', 'bg-orange-500', 'bg-yellow-500', 'bg-accent', 'bg-accent'];

  const onSubmit = async (data) => {
    try {
      await registerUser(data.name, data.email, data.password);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-textPrimary mb-2">Create an account</h2>
        <p className="text-textSecondary">Join PricePilot AI to start saving.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          placeholder="John Doe"
          {...register('name')}
          error={errors.name?.message}
        />

        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          {...register('email')}
          error={errors.email?.message}
        />

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
            error={errors.password?.message}
          />
          {password.length > 0 && (
            <div className="mt-2 space-y-1.5">
              <div className="flex gap-1 h-1.5 w-full bg-borderLight rounded-full overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-full flex-1 transition-colors duration-300',
                      i < strength ? strengthColors[Math.min(strength - 1, 4)] : 'bg-transparent'
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-textSecondary text-right font-medium">
                {strength > 0 && strengthLabels[Math.min(strength - 1, 4)]}
              </p>
            </div>
          )}
        </div>

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <div>
          <label className="flex items-start gap-2 text-sm text-textSecondary cursor-pointer">
            <input 
              type="checkbox" 
              className="mt-1 rounded border-borderLight text-primary focus:ring-primary" 
              {...register('terms')}
            />
            <span className="leading-snug">
              I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.terms && <p className="mt-1.5 text-sm text-danger font-medium">{errors.terms.message}</p>}
        </div>

        <Button type="submit" className="w-full mt-2" isLoading={isSubmitting}>
          Create Account
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-textSecondary">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary hover:text-secondary">
          Log in
        </Link>
      </p>
    </div>
  );
}
