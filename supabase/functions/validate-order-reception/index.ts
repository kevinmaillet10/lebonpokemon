import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@12.18.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  try {
    const { orderId, userId } = await req.json();

    // 1. Récupérer la commande et le compte Stripe du vendeur associé
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, seller:seller_id(stripe_account_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) throw new Error("Commande introuvable.");
    if (order.buyer_id !== userId) throw new Error("Action non autorisée.");
    if (order.status !== 'paid_escrow' && order.status !== 'shipped') {
      throw new Error("Statut de commande invalide pour un déblocage.");
    }

    const sellerStripeId = order.seller?.stripe_account_id;
    if (!sellerStripeId) {
      throw new Error("Le vendeur n'a pas configuré son compte Stripe Connect.");
    }

    // 2. Transférer l'argent du compte plateforme vers le vendeur
    const transfer = await stripe.transfers.create({
      amount: Math.round(order.amount * 100), // Montant de l'article en centimes
      currency: 'eur',
      destination: sellerStripeId,
      transfer_group: orderId,
    });

    // 3. Mettre à jour le statut de la commande
    await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);

    return new Response(JSON.stringify({ success: true, transferId: transfer.id }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});