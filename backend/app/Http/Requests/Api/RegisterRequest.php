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
        if ($this->has('nom') && is_string($this->nom)) {
            $merge['nom'] = trim(strip_tags($this->nom));
        }
        if ($this->has('prenom') && is_string($this->prenom)) {
            $merge['prenom'] = trim(strip_tags($this->prenom));
        }
        if ($this->has('telephone')) {
            $cleaned = preg_replace('/[\s\-\.]+/', '', (string) $this->telephone);
            $merge['telephone'] = $cleaned;
            if (! $this->has('email') || empty($this->email)) {
                $digits = preg_replace('/\D/', '', $cleaned);
                if (! empty($digits)) {
                    $merge['email'] = $digits.'@client.takapay.bj';
                }
            }
        }
        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    public function rules(): array
    {
        return [
            'nom' => ['required', 'string', 'min:2', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'prenom' => ['nullable', 'string', 'max:100', 'regex:/^[\p{L}\s\-\'\.]+$/u'],
            'email' => [
                'nullable',
                'string',
                'email:rfc',
                'max:255',
                'unique:users,email',
                function (string $attribute, mixed $value, \Closure $fail) {
                    $domain = substr(strrchr((string) $value, '@'), 1);
                    if ($domain && $domain !== 'client.takapay.bj' && $domain !== 'example.com' && $domain !== 'example.org') {
                        if (! checkdnsrr($domain, 'MX') && ! checkdnsrr($domain, 'A')) {
                            $fail("Le domaine de l'adresse e-mail (« {$domain} ») n'existe pas.");
                        }
                    }
                },
            ],
            'telephone' => ['nullable', 'string', 'regex:/^\+?[0-9]{8,15}$/', 'unique:users,telephone'],
            'password' => ['nullable', 'string', 'min:6'],
            'code_pin' => ['required_without:password', 'string', 'digits:6', 'confirmed'],
            'code_pin_confirmation' => ['nullable', 'string', 'digits:6'],
        ];
    }

    public function messages(): array
    {
        return [
            'nom.regex' => 'Le nom ne doit contenir que des lettres.',
            'prenom.regex' => 'Le prénom ne doit contenir que des lettres.',
            'telephone.regex' => 'Veuillez saisir un numéro de téléphone valide (8 à 15 chiffres).',
            'code_pin.confirmed' => 'La confirmation du code PIN ne correspond pas au premier code saisi.',
            'code_pin.digits' => 'Le code PIN doit comporter exactement 6 chiffres.',
            'telephone.unique' => 'Ce numéro de téléphone est déjà associé à un compte. Veuillez vous connecter.',
            'email.unique' => 'Cette adresse e-mail ou ce numéro est déjà associé à un compte. Veuillez vous connecter.',
        ];
    }
}
