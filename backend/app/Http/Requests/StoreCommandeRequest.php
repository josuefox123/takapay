<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommandeRequest extends FormRequest
{
    /**
     * Un client crée sa propre commande (propriétaire forcé côté contrôleur) ;
     * l'administration peut en créer pour un autre.
     */
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isAdmin = $this->user()?->isAdmin() ?? false;

        return [
            'utilisateur_id' => $isAdmin
                ? ['sometimes', 'exists:users,id']
                : ['sometimes', Rule::in([(string) $this->user()?->id])],
            'reference' => ['required', 'string', 'max:255', 'unique:commandes,reference'],
            // Le statut initial appartient au serveur
            'statut' => $isAdmin
                ? ['sometimes', Rule::in(['en_attente', 'en_cours', 'valide', 'annulee', 'livree'])]
                : ['prohibited'],
            // Le total est recalculé par le serveur à partir des lignes
            'prix_total' => $isAdmin ? ['required', 'numeric', 'min:0'] : ['prohibited'],
        ];
    }
}
