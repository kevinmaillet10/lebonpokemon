import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  try {
    const body = await req.json()
    console.log("Données reçues :", JSON.stringify(body, null, 2))

    const { 
      items, 
      shippingFee, 
      shippingMethod, 
      buyerProtection, 
      protectionFee, 
      sellerId, 
      buyerId, 
      orderId,
      parcelSize,
      pointRelais 
    } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error("La liste des articles est vide ou invalide.")
    }

    // 1. On ne garde que les vrais articles (cartes) en filtrant tout le reste
    const lineItems = items
      .filter((item: any) => {
        const name = (item.name || item.title || '').toLowerCase()
        return !name.includes('frais') && 
               !name.includes('port') && 
               !name.includes('shipping') && 
               !name.includes('mondial') && 
               !name.includes('colissimo') && 
               !name.includes('lettre') && 
               !name.includes('livraison') &&
               !name.includes('protection') &&
               !name.includes('transport') &&
               !name.includes('expedition') &&
               !name.includes('expédition') &&
               !name.includes('envoi') &&
               !name.includes('relais') &&
               !name.includes('suivie') &&
               !name.includes('suivante')
      })
      .map((item: any) => {
        const unitPrice = Number(item.price) || Number(item.unit_amount) || 0;
        const qty = Number(item.quantity) || 1;
        return {
          price_data: {
            currency: 'eur',
            product_data: {
              name: item.name || item.title || 'Carte Pokémon',
            },
            unit_amount: Math.round(unitPrice * 100),
          },
          quantity: qty,
        }
      })

    // Calcul automatique du sous-total en centimes pour les sécurités
    const subtotalCents = lineItems.reduce((acc, curr) => acc + (curr.price_data.unit_amount * curr.quantity), 0)

    // 2. Ajout unique des frais de port
    const parsedShippingFee = Number(shippingFee) || 0;
    if (parsedShippingFee > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Frais de port (${shippingMethod || 'Standard'})`,
          },
          unit_amount: Math.round(parsedShippingFee * 100),
        },
        quantity: 1,
      })
    }

    // 3. Ajout de la protection acheteur (récupérée du front ou calculée d'office à 10%)
    const rawProtection = buyerProtection !== undefined ? buyerProtection : (protectionFee !== undefined ? protectionFee : null);
    const parsedProtectionCents = rawProtection !== null 
      ? Math.round(Number(rawProtection) * 100) 
      : Math.round(subtotalCents * 0.10);

    if (parsedProtectionCents > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Protection acheteur (10%)',
          },
          unit_amount: parsedProtectionCents,
        },
        quantity: 1,
      })
    }

    const origin = req.headers.get('origin') || 'http://localhost:5173'

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        sellerId: sellerId || '',
        buyerId: buyerId || '',
        orderId: orderId || '',
        shippingMethod: shippingMethod || '',
        shippingFee: String(parsedShippingFee),
        buyerProtection: String(parsedProtectionCents / 100),
        parcelSize: parcelSize || 'small',
        pointRelais: JSON.stringify(pointRelais || {})
      }
    })

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } },
    )
  } catch (error: any) {
    console.error("Erreur Edge Function:", error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    )
  }
})