<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $merge = [];
        if ($this->has('pin') && ! $this->has('code_pin')) {
            $merge['code_pin'] = $this->pin;
        }
        if ($this->has('newPin') && ! $this->has('code_pin')) {
            $merge['code_pin'] = $this->newPin;
        }
        if ($this->has('pin_confirmation') && ! $this->has('code_pin_confirmation')) {
            $merge['code_pin_confirmation'] = $this->pin_confirmation;
        }
        if ($this->has('confirmPin') && ! $this->has('code_pin_confirmation')) {
            $merge['code_pin_confirmation'] = $this->confirmPin;
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'max:255'],
            'prenom' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'telephone' => ['nullable', 'string', 'max:30', 'unique:users,telephone'],
            'password' => ['nullable', 'string', 'min:6'],
            'code_pin' => ['required_without:password', 'string', 'digits:6', 'confirmed'],
            'code_pin_confirmation' => ['nullable', 'string', 'digits:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'code_pin.confirmed' => 'La confirmation du code PIN ne correspond pas au premier code saisi.',
            'code_pin.digits' => 'Le code PIN doit comporter exactement 6 chiffres.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà associé à un compte.',
            'email.unique' => 'Cette adresse email est déjà associée à un compte.',
        ];
    }
}
