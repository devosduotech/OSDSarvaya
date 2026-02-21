import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  ...props
}) => {

  // ================================
  // BASE STYLES
  // ================================
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1";

  // ================================
  // SIZE VARIANTS
  // ================================
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-3 text-base"
  };

  // ================================
  // COLOR VARIANTS
  // ================================
  const variants = {
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm",
    secondary:
      "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 focus:ring-gray-400",
    danger:
      "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500",
    ghost:
      "bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 focus:ring-gray-300"
  };

  const disabledStyle = "opacity-50 cursor-not-allowed pointer-events-none";

  // ================================
  // RENDER
  // ================================
  return (
    <button
      className={`
        ${base}
        ${sizes[size]}
        ${variants[variant]}
        ${disabled || loading ? disabledStyle : ''}
        ${className}
      `}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >

      {/* LEFT ICON */}
      {icon && iconPosition === 'left' && !loading && (
        <span className="flex items-center justify-center">
          {icon}
        </span>
      )}

      {/* LOADING SPINNER */}
      {loading && (
        <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
      )}

      {/* TEXT */}
      {children && <span>{children}</span>}

      {/* RIGHT ICON */}
      {icon && iconPosition === 'right' && !loading && (
        <span className="flex items-center justify-center">
          {icon}
        </span>
      )}

    </button>
  );
};

export default Button;
