<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CommandeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        // Première transaction liée → cagnotte liée
        $transaction = $this->relationLoaded('transactions')
            ? $this->transactions->first()
            : null;
        $cagnotte = $transaction?->cagnotte;

        $objectif = 0;
        $montantVerse = 0;
        $progression = 0;

        if ($cagnotte) {
            $objectif = (float) ($cagnotte->prix_unitaire ?? 0);
            $montantVerse = (float) ($cagnotte->montant_verse ?? 0);
            $progression = $objectif > 0
                ? (int) min(100, round(($montantVerse / $objectif) * 100))
                : 0;
        }

        return [
            'id'             => $this->id,
            'reference'      => $this->reference,
            'statut'         => $this->statut,
            'prix_total'     => (float) $this->prix_total,
            'client'         => $this->whenLoaded('utilisateur', fn () => [
                'id'  => $this->utilisateur->id,
                'nom' => $this->utilisateur->nom,
            ]),
            'articles'       => $this->whenLoaded('commandeProduits', function () {
                return $this->commandeProduits->map(fn ($cp) => [
                    'id'       => $cp->id,
                    'produit'  => $cp->produit?->nom ?? '—',
                    'quantite' => (int) $cp->quantite,
                    'total'    => (float) $cp->total,
                ]);
            }),
            'cagnotte' => $cagnotte ? [
                'id'            => $cagnotte->id,
                'montant_verse' => $montantVerse,
                'objectif'      => $objectif,
                'progression'   => $progression,
                'moyen_paiement'=> $cagnotte->moyen_paiement,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
