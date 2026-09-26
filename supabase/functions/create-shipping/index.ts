import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { md5 } from "https://deno.land/x/md5@v1.0.3/mod.ts"

serve(async (req) => {
  try {
    const { orderId, selectedRelay } = await req.json()

    // 1. Initialisation du client Supabase avec la clé service_role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Récupération des informations de la commande, du vendeur et de l'acheteur
    // (Assurez-vous que votre table 'orders' ou 'items' contient la taille/poids du colis)
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*, seller:seller_id(*), buyer:buyer_id(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      throw new Error('Commande introuvable dans la base de données.')
    }

    // 3. Détermination dynamique du poids en fonction de la taille choisie par le vendeur
    // (Adaptez 'order.parcel_size' selon le nom de votre colonne en base de données : 'small', 'medium', 'large' ou 'petit', 'moyen', 'grand')
    const weightMap: Record<string, string> = {
      small: "500",   // Petit colis (ex: 500g max)
      medium: "1000", // Moyen colis (ex: 1 kg max)
      large: "2000",  // Grand colis (ex: 2 kg max)
      petit: "500",
      moyen: "1000",
      grand: "2000"
    }

    const selectedSize = order.parcel_size || order.size || 'small'
    const dynamicWeight = order.weight || weightMap[selectedSize] || "500"

    const enseigne = Deno.env.get('MONDIAL_RELAY_ENSEIGNE') ?? ''
    const privateKey = Deno.env.get('MONDIAL_RELAY_PRIVATE_KEY') ?? ''

    // 4. Construction des paramètres pour l'API Mondial Relay avec le poids dynamique
    const params = {
      Enseigne: enseigne,
      ModeCol: "REL",
      ModeLiv: "24R",
      Exp_Langue: "FR",
      Exp_Nom: order.seller.name,
      Exp_Adresse1: order.seller.address,
      Exp_Ville: order.seller.city,
      Exp_CP: order.seller.postal_code,
      Exp_Pays: "FR",
      Dest_Langue: "FR",
      Dest_Nom: order.buyer.name,
      Dest_Adresse1: order.buyer.address,
      Dest_Ville: order.buyer.city,
      Dest_CP: order.buyer.postal_code,
      Dest_Pays: "FR",
      Dest_Rel_ID: selectedRelay.id,
      Poids: dynamicWeight, // Poids dynamique injecté ici
      Longueur: "",
      Taille: "",
      ValeurMouchard: "",
    }

    // Calcul de la clé de sécurité MD5
    const rawString = Object.values(params).join('') + privateKey
    const securityKey = md5(rawString).toUpperCase()

    const payload = { ...params, Security: securityKey }

    const formData = new URLSearchParams()
    for (const [key, value] of Object.entries(payload)) {
      formData.append(key, value as string)
    }

    // 5. Appel de l'API Mondial Relay
    const mrResponse = await fetch('https://api.mondialrelay.com/Web_Services.asmx/WSI2_CreationExpedition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    })

    const responseText = await mrResponse.text()

    // 6. Extraction sécurisée des données XML renvoyées par Mondial Relay
    const statMatch = responseText.match(/<STAT>(.*?)<\/STAT>/)
    const stat = statMatch ? statMatch[1] : "-1"

    if (stat !== "0") {
      const msgMatch = responseText.match(/<Message>(.*?)<\/Message>/)
      const errorMsg = msgMatch ? msgMatch[1] : "Erreur inconnue Mondial Relay"
      throw new Error(`Erreur Mondial Relay (${stat}): ${errorMsg}`)
    }

    const expNumMatch = responseText.match(/<ExpeditionNum>(.*?)<\/ExpeditionNum>/)
    const urlPdfMatch = responseText.match(/<URL_Etiquette>(.*?)<\/URL_Etiquette>/)

    const expeditionNum = expNumMatch ? expNumMatch[1] : null
    const urlEtiquette = urlPdfMatch ? urlPdfMatch[1] : null

    if (!urlEtiquette) {
      throw new Error("L'expédition a été créée mais l'URL de l'étiquette est introuvable.")
    }

    // 7. Mise à jour de la commande dans Supabase
    await supabaseClient
      .from('orders')
      .update({ 
        tracking_number: expeditionNum, 
        label_url: urlEtiquette,
        relay_point_id: selectedRelay.id 
      })
      .eq('id', orderId)

    // 8. Renvoi de l'URL au front-end
    return new Response(
      JSON.stringify({ 
        success: true, 
        shippingLabelUrl: urlEtiquette,
        trackingNumber: expeditionNum 
      }),
      { headers: { "Content-Type": "application/json" } },
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }
})