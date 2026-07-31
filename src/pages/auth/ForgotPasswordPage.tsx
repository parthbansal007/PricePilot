import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export function ForgotPasswordPage() {
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data) => {
    try {
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSuccess(true);
      toast.success('Reset link sent!');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 mb-6">
          <CheckCircle2 className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-3xl font-bold text-textPrimary mb-4">Check your email</h2>
        <p className="text-textSecondary mb-8 max-w-sm mx-auto">
          We sent a password reset link to your email address. Please click the link to reset your password.
        </p>
        <Link to="/login">
          <Button variant="outline" className="w-full">
            Back to log in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <Link to="/login" className="inline-flex items-center text-sm font-medium text-textSecondary hover:text-primary mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to log in
      </Link>
      
      <div className="mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-6">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-3xl font-bold text-textPrimary mb-2">Forgot password?</h2>
        <p className="text-textSecondary">
          No worries, we'll send you reset instructions.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Email"
          type="email"
          placeholder="name@example.com"
          {...register('email')}
          error={errors.email?.message}
        />

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </div>
  );
}
