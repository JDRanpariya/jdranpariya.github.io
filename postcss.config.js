import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import purgecss from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
    ...(process.env.ELEVENTY_ENV === 'prod'
      ? [
          purgecss({
            content: ['./src/**/*.{html,njk,md,js,ts}'],
            defaultExtractor: (content) =>
              content.match(/[\w-/:]+(?<!:)/g) || [],
          }),
        ]
      : []),
  ],
};
