<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommandeProduitRequest extends FormRequest
{
    /**
     * Le client ne modifie que les lignes de ses propres commandes.
     */
    public function authorize(): bool
    {
        $user = $this->user();

        if (! $user) {
            return false;
        }

        if ($user->isAdmin()) {
            return true;
        }

        $commandeProduit = $this->route('commande_produit');
        $commande = $commandeProduit?->commande;

        return $commande !== null && (int) $commande->utilisateur_id === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isSuperAdmin = ($this->user()?->role ?? '') === 'super_admin';

        return [
            // La ligne reste rattachée à sa commande d'origine
            'commande_id' => $isSuperAdmin
                ? ['sometimes', 'required', 'exists:commandes,id']
                : ['prohibited'],
            'produit_id' => ['sometimes', 'required', 'exists:produits,id'],
            'quantite' => ['sometimes', 'required', 'integer', 'min:1'],
            'prix_unitaire' => ['sometimes', 'required', 'numeric', 'min:0'],
            'total' => ['prohibited'],
        ];
    }
}
