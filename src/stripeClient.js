// src/stripeClient.js
import { loadStripe } from '@stripe/stripe-js';

// On initialise Stripe avec ta clé publique récupérée depuis ton fichier .env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default stripePromise;