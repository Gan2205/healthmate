import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'text';
    isLoading?: boolean;
    fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    isLoading = false,
    fullWidth = false,
    className = '',
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";

    const variants = {
        primary: "bg-[var(--color-primary)] text-white hover:bg-black/90",
        secondary: "bg-[var(--color-secondary)] text-white hover:bg-green-600",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        text: "hover:bg-black/5 text-[var(--color-primary)]",
    };

    const sizes = "h-[65px] px-6 py-4 text-lg"; // Matching Flutter's 65px height and font size

    return (
        <button
            className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : null}
            {children}
        </button>
    );
};
