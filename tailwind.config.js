export default {
    content: ["./src/**/*.{html,njk,js,md}"],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                bg: 'var(--color-bg)',
                surface: 'var(--color-surface)',
                primary: 'var(--color-text)',
                muted: 'var(--color-text-light)',
                accent: 'var(--color-accent)',
                border: 'var(--color-border)',
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                serif: ['Merriweather', 'serif'],
            },
        },
    },
    plugins: [
        require('@tailwindcss/typography'),
    ],
}

