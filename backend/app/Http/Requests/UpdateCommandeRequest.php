<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCommandeRequest extends FormRequest
{
    /**
     * Seul le propriétaire de la commande ou un administrateur peut la modifier.
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

        $commande = $this->route('commande');

        return $commande !== null && (int) $commande->utilisateur_id === (int) $user->id;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $commande = $this->route('commande');
        $commandeId = is_object($commande) ? $commande->id : $commande;

        if (! ($this->user()?->isAdmin() ?? false)) {
            // Le client ne peut que annuler sa commande ; tout le reste est serveur
            return [
                'utilisateur_id' => 'prohibited',
                'reference' => 'prohibited',
                'statut' => ['sometimes', Rule::in(['annulee'])],
                'prix_total' => 'prohibited',
            ];
        }

        return [
            'utilisateur_id' => ['sometimes', 'required', 'exists:users,id'],
            'reference' => ['sometimes', 'required', 'string', 'max:255', Rule::unique('commandes', 'reference')->ignore($commandeId)],
            'statut' => ['sometimes', Rule::in(['en_attente', 'en_cours', 'valide', 'annulee', 'livree'])],
            'prix_total' => ['sometimes', 'required', 'numeric', 'min:0'],
        ];
    }
}
