<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreProduitRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->isAdmin() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        foreach (['nom', 'description', 'couleur'] as $field) {
            if ($this->has($field) && is_string($this->input($field))) {
                $merge[$field] = trim(strip_tags($this->input($field)));
            }
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'sous_categorie_id' => ['required', 'exists:sous_categories,id'],
            'nom' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'stock' => ['required', 'integer', 'min:0'],
            'duree' => ['required', 'integer', 'min:0'],
            'garantie_duree' => ['nullable', 'integer', 'min:1', 'max:1200', 'required_with:garantie_unite'],
            'garantie_unite' => ['nullable', 'string', 'in:jours,mois,ans', 'required_with:garantie_duree'],
            'couleur' => ['nullable', 'string', 'max:100'],
        ];
    }
}
