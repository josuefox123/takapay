<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommandeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'utilisateur_id' => ['required', 'exists:users,id'],
            'reference' => ['required', 'string', 'max:255'],
            'statut' => ['required', 'string', 'max:255'],
            'prix_total' => ['required', 'numeric', 'min:0'],
        ];
    }
}
