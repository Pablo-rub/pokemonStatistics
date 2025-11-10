import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

/**
 * SEO Component - Manage dynamic meta tags for each page
 * 
 * @param {string} title - Page title (will be appended with site name)
 * @param {string} description - Page description for search engines
 * @param {string} keywords - SEO keywords (optional)
 * @param {string} image - Open Graph image URL (optional)
 * @param {string} type - Open Graph type (default: 'website')
 */
const SEO = ({ 
  title, 
  description, 
  keywords = '',
  image = 'https://traineracademy.xyz/android-chrome-192x192.png',
  type = 'website'
}) => {
  const location = useLocation();
  const siteUrl = 'https://traineracademy.xyz';
  const currentUrl = `${siteUrl}${location.pathname}${location.search}`;
  
  // Default fallback values
  const defaultTitle = 'Trainer Academy — Rankings & Match Analysis for Pokémon VGC';
  const defaultDescription = 'Check rankings, analyze matches and save your Pokémon games. Improve your strategy with detailed statistics and comparisons for Pokémon VGC.';
  
  const fullTitle = title ? `${title} | Trainer Academy` : defaultTitle;
  const metaDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={currentUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={currentUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default SEO;
