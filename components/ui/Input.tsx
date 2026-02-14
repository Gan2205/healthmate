import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
    endIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, endIcon, ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                <div className="relative">
                    <div className="absolute top-[-10px] left-3 bg-white px-1 text-xs font-medium text-gray-500 z-10 hidden">
                        {/* Material floating label placeholder if we wanted to animate it, 
                 but Flutter app uses placeholder/hint text style with label on top in some cases or inside.
                 Looking at login.dart: 
                 InputDecoration(label: Text(label), hintText: hintText, filled: true, fillColor: grey.shade100)
                 It uses standard Material design with filled background.
             */}
                    </div>
                    <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 sr-only">
                        {label}
                    </label>
                    <div className="relative">
                        <input
                            type={type}
                            className={`
                flex h-[60px] w-full rounded-2xl border-none bg-zinc-100 px-4 py-3 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-50
                ${error ? 'ring-2 ring-red-500' : ''}
                ${className}
              `}
                            ref={ref}
                            placeholder={label} // Using label as placeholder for simplicty to match Material filled look approximately
                            {...props}
                        />
                        {endIcon && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
                                {endIcon}
                            </div>
                        )}
                    </div>
                </div>
                {error && <p className="text-sm font-medium text-red-500">{error}</p>}
            </div>
        );
    }
);
Input.displayName = "Input";
