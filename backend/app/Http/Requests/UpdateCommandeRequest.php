<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCommandeRequest extends FormRequest
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
            'utilisateur_id' => ['sometimes', 'required', 'exists:users,id'],
            'reference' => ['sometimes', 'required', 'string', 'max:255'],
            'statut' => ['sometimes', 'required', 'string', 'max:255'],
            'prix_total' => ['sometimes', 'required', 'numeric', 'min:0'],
        ];
    }
}
