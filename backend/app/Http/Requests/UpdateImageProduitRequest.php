<?php

namespace App\Http\Requests;

use App\Rules\ImageContent;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateImageProduitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'produit_id' => ['sometimes', 'required', 'exists:produits,id'],
            'chemin' => ['sometimes', 'required', new ImageContent],
            'nom_fichier' => ['nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'required', 'integer', 'min:0'],
            'is_principal' => ['sometimes', 'required', 'boolean'],
        ];
    }
}
