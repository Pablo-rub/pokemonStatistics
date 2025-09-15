import React from 'react';

export default function SEOHeading({ text = "Rankings and Match Analysis for Pokémon", visible = false }) {
  return visible ? (
    <h1 className="hero-heading">{text}</h1>
  ) : (
    <h1 className="sr-only">{text}</h1>
  );
}