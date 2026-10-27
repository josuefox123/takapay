<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $cagnotte = $this->whenLoaded('cagnotte');
        $commande = $this->whenLoaded('commande');

        return [
            'id'                 => $this->id,
            'cagnotte_id'        => $this->cagnotte_id,
            'commande_id'        => $this->commande_id,
            'echeance_id'        => $this->echeance_id,

            'commande_reference' => $this->commande?->reference
                ?? ($this->commande_id ? "CMD-{$this->commande_id}" : null),
            'cagnotte_nom'       => $this->cagnotte?->nom
                ?? ($this->cagnotte_id ? "CG-{$this->cagnotte_id}" : null),
            'article'            => $this->cagnotte?->produit?->nom,

            'montant'            => (float) $this->montant,
            'montant_cotise'     => (float) ($this->cagnotte?->montant_verse ?? 0),
            'objectif'           => (float) ($this->cagnotte?->objectif_effectif ?? 0),
            'progression'        => (int) ($this->cagnotte?->progression ?? 0),

            'reference_externe'  => $this->reference_externe,
            'statut'             => $this->statut,
            'statut_label'       => $this->isSuccessful()
                ? 'Réussi'
                : ($this->statut === 'en_attente' ? 'En attente' : 'Échoué'),
            'moyen_paiement'     => $this->moyen_paiement,
            'prestataire'        => $this->prestataire,
            'type'               => $this->type,
            'devise'             => $this->devise,

            'date'               => $this->date?->toIso8601String(),
            'created_at'         => $this->created_at?->toIso8601String(),
            'updated_at'         => $this->updated_at?->toIso8601String(),
        ];
    }
}
