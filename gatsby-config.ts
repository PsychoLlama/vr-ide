import type { GatsbyConfig } from 'gatsby';

const config: GatsbyConfig = {
  graphqlTypegen: {
    generateOnBuild: true,
  },
  plugins: ['gatsby-plugin-vanilla-extract'],
};

export default config;
