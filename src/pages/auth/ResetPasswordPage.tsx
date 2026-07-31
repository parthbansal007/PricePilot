import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { CheckCircle2, Lock } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export function ResetPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();
  const { token } = useParams();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      if (!token) throw new Error("Invalid token");
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      toast.error('Invalid or expired reset token. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-6">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-3xl font-bold text-textPrimary mb-4">Password reset</h2>
        <p className="text-textSecondary mb-8 max-w-sm mx-auto">
          Your password has been successfully reset. Redirecting you to login...
        </p>
        <Link to="/login">
          <Button className="w-full">
            Continue to log in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-textPrimary mb-2">Set new password</h2>
        <p className="text-textSecondary">
          Your new password must be different to previously used passwords.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Password"
          type="password"
          placeholder="••••••••"
          {...register('password')}
          error={errors.password?.message}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="••••••••"
          {...register('confirmPassword')}
          error={errors.confirmPassword?.message}
        />

        <Button type="submit" className="w-full mt-4" isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
