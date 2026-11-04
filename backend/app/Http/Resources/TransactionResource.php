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
        $client = $this->commande?->utilisateur ?? $this->cagnotte?->utilisateur;
        $isRefund = $this->type === 'remboursement'
            || str_starts_with((string) $this->reference_externe, 'REM-')
            || str_contains((string) $this->reference_externe, 'ANNUL');

        return [
            'id'                 => $this->id,
            'cagnotte_id'        => $this->cagnotte_id,
            'commande_id'        => $this->commande_id,
            'echeance_id'        => $this->echeance_id,
            'is_refund'          => $isRefund,
            'sens'               => $isRefund ? 'debit' : 'credit',

            'commande_reference' => $this->commande?->reference
                ?? ($this->commande_id ? "CMD-{$this->commande_id}" : null),
            'cagnotte_nom'       => $this->cagnotte?->nom
                ?? ($this->cagnotte_id ? "CG-{$this->cagnotte_id}" : null),
            'article'            => $this->cagnotte?->produit?->nom
                ?? $this->commande?->commandeProduits?->first()?->produit?->nom
                ?? '—',
            'client_nom'         => $client ? trim("{$client->prenom} {$client->nom}") : null,
            'client_tel'         => $this->cagnotte?->telephone_remboursement ?? $client?->telephone ?? null,

            'montant'            => (float) $this->montant,
            'montant_cotise'     => (float) ($this->cagnotte?->montant_verse ?? 0),
            'objectif'           => (float) ($this->cagnotte?->objectif_effectif ?? 0),
            'progression'        => (int) ($this->cagnotte?->progression ?? 0),

            'reference_externe'  => $this->reference_externe,
            'statut'             => $this->statut,
            'statut_label'       => $this->isSuccessful()
                ? ($isRefund ? 'Remboursé' : 'Réussi')
                : ($this->statut === 'en_attente' ? 'En attente' : 'Échoué'),
            'moyen_paiement'     => $this->moyen_paiement,
            'prestataire'        => $this->prestataire,
            'type'               => $this->type,
            'type_label'         => $isRefund
                ? 'Remboursement'
                : ($this->type === 'paiement_livraison'
                    ? 'Paiement à la livraison'
                    : ($this->type === 'commande_cash' ? 'Paiement comptant' : 'Cotisation cagnotte')),
            'devise'             => $this->devise,

            'date'               => $this->date?->toIso8601String(),
            'created_at'         => $this->created_at?->toIso8601String(),
            'updated_at'         => $this->updated_at?->toIso8601String(),
        ];
    }
}
