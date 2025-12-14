/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: "#6366f1", // Indigo 500
                secondary: "#a855f7", // Purple 500
                dark: "#0f172a", // Slate 900
                card: "#1e293b", // Slate 800
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        color: theme('colors.gray.300'),
                        h1: {
                            color: theme('colors.white'),
                            fontWeight: '800',
                        },
                        h2: {
                            color: theme('colors.white'),
                            fontWeight: '700',
                            marginTop: '1.5em',
                            marginBottom: '0.8em',
                        },
                        h3: {
                            color: theme('colors.gray.100'),
                            fontWeight: '600',
                        },
                        strong: {
                            color: theme('colors.white'),
                        },
                        'ul > li::marker': {
                            color: theme('colors.secondary'),
                        },
                        'ol > li::marker': {
                            color: theme('colors.primary'),
                        },
                        blockquote: {
                            borderLeftColor: theme('colors.primary'),
                            color: theme('colors.gray.400'),
                        },
                    },
                },
            }),
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
        require('@tailwindcss/forms'),
    ],
}
