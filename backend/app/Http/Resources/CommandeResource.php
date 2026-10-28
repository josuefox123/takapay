<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommandeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Récupération directe ou via transaction
        $cagnotte = $this->cagnotte ?? ($this->relationLoaded('transactions') ? $this->transactions->first()?->cagnotte : null);

        $objectif = 0;
        $montantVerse = 0;
        $progression = 0;

        if ($cagnotte) {
            $objectif = (float) ($cagnotte->prix_unitaire ?? $cagnotte->montant_objectif ?? 0);
            $montantVerse = (float) ($cagnotte->montant_verse ?? 0);
            $progression = $objectif > 0
                ? (int) min(100, round(($montantVerse / $objectif) * 100))
                : 0;
        }

        return [
            'id'                => $this->id,
            'reference'         => $this->reference,
            'statut'            => $this->statut,
            'type_commande'     => $this->type_commande ?? 'libre',
            'mode_paiement'     => $this->mode_paiement ?? $cagnotte?->moyen_paiement,
            'statut_reception'  => $this->statut_reception ?? 'non_recu',
            'prix_total'        => (float) $this->prix_total,
            'adresse_livraison' => $this->adresse_livraison,
            'telephone_livraison' => $this->telephone_livraison,
            'note_livraison'    => $this->note_livraison,
            'coordonnees_gps'   => $this->coordonnees_gps,
            'client'            => $this->whenLoaded('utilisateur', fn () => [
                'id'        => $this->utilisateur->id,
                'nom'       => $this->utilisateur->nom,
                'prenom'    => $this->utilisateur->prenom,
                'telephone' => $this->utilisateur->telephone,
                'email'     => $this->utilisateur->email,
            ]),
            'articles'          => $this->whenLoaded('commandeProduits', function () {
                return $this->commandeProduits->map(fn ($cp) => [
                    'id'            => $cp->id,
                    'produit'       => $cp->produit?->nom ?? '—',
                    'quantite'      => (int) $cp->quantite,
                    'prix_unitaire' => (float) $cp->prix_unitaire,
                    'total'         => (float) $cp->total,
                ]);
            }),
            'cagnotte'          => $cagnotte ? [
                'id'             => $cagnotte->id,
                'montant_verse'  => $montantVerse,
                'objectif'       => $objectif,
                'progression'    => $progression,
                'moyen_paiement' => $cagnotte->moyen_paiement,
            ] : null,
            'created_at'        => $this->created_at?->toIso8601String(),
            'updated_at'        => $this->updated_at?->toIso8601String(),
        ];
    }
}
