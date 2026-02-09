/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
        './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
        './src/components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                sidebar: "#FFFFFF",
                sidebarText: "#1E293B",
                primary: "#2563EB", // Blue 600
                secondary: "#64748B", // Slate 500
                background: "#F8FAFC", // Slate 50
                surface: "#FFFFFF",
                border: "#E2E8F0", // Slate 200
                active: "#EFF6FF", // Blue 50
            },
        },
    },
    plugins: [],
}
