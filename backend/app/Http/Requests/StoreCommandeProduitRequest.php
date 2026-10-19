<?php

namespace App\Http\Requests;

use App\Models\Commande;
use Illuminate\Foundation\Http\FormRequest;

class StoreCommandeProduitRequest extends FormRequest
{
    /**
     * Le client n'ajoute des lignes qu'à ses propres commandes.
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

        $commande = Commande::find($this->input('commande_id'));

        return $commande !== null && (int) $commande->utilisateur_id === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'commande_id' => ['required', 'exists:commandes,id'],
            'produit_id' => ['required', 'exists:produits,id'],
            'quantite' => ['required', 'integer', 'min:1'],
            // Le prix unitaire est privilégié depuis la base (paramètre produit) ;
            // il ne sert que de secours. Le total est toujours recalculé par le serveur.
            'prix_unitaire' => ['required', 'numeric', 'min:0'],
            'total' => ['prohibited'],
        ];
    }
}
