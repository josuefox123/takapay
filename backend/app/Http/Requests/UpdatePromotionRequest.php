<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdatePromotionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'pourcentage_promo' => ['sometimes', 'required', 'numeric', 'min:0', 'max:100'],
            'date_debut' => ['sometimes', 'required', 'date'],
            'date_fin' => ['sometimes', 'required', 'date', 'after_or_equal:date_debut'],
            'statut' => ['sometimes', 'required', 'string', 'max:50'],
        ];
    }
}
