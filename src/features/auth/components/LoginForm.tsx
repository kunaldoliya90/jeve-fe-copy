import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { toUserMessage } from '@/lib/http/errors';

import { useAuth } from '../hooks/useAuth';
import { type LoginInput, loginSchema } from '../schemas/auth.schema';

export interface LoginFormProps {
  /** Called after a successful login, so the page owns the redirect. */
  onSuccess?: (() => void) | undefined;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { login, isLoggingIn, loginError } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // `mutate` rather than `mutateAsync`: the failure path is already rendered
  // from `loginError`, and awaiting a rejecting promise here would need a
  // try/catch whose only job is to prevent an unhandled rejection.
  const onSubmit = handleSubmit((values) => {
    login(values, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  });

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4" noValidate>
      <FormField label="Email" error={errors.email?.message} required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            hasError={Boolean(errors.email)}
          />
        )}
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        {(fieldProps) => (
          <Input
            {...fieldProps}
            {...register('password')}
            type="password"
            autoComplete="current-password"
            hasError={Boolean(errors.password)}
          />
        )}
      </FormField>

      {/* Server-side failures belong above the button, announced on arrival. */}
      {loginError ? (
        <p role="alert" className="text-sm text-danger">
          {toUserMessage(loginError)}
        </p>
      ) : null}

      <Button type="submit" isLoading={isLoggingIn} className="mt-2">
        Sign in
      </Button>
    </form>
  );
}
