<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

/**
 * Valide le contenu d'une image quel que soit son mode d'envoi :
 * fichier multipart, data-URI base64, URL distante ou nom de fichier direct (ex: telephone.jpeg).
 */
class ImageContent implements ValidationRule
{
    /** Poids maximum accepté (10 Mo). */
    public const MAX_BYTES = 10_000_000;

    /** Dimensions maximales acceptées à l'entrée. */
    public const MAX_WIDTH = 12000;

    public const MAX_HEIGHT = 12000;

    private const ALLOWED_MIME = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/bmp',
        'image/x-ms-bmp',
    ];

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value instanceof UploadedFile) {
            if (! $value->isValid()) {
                $fail("Le fichier {$attribute} n'a pas pu être téléversé.");

                return;
            }

            if ($value->getSize() > self::MAX_BYTES) {
                $fail("Le fichier {$attribute} dépasse 10 Mo.");

                return;
            }

            return;
        }

        if (! is_string($value) || $value === '') {
            $fail("Le champ {$attribute} doit contenir une image.");

            return;
        }

        // Data-URI base64
        if (preg_match('#^data:image/(jpeg|jpg|png|webp|gif|svg\+xml|bmp);base64,#i', $value)) {
            $comma = strpos($value, ',');
            $binary = base64_decode(substr($value, $comma + 1), true);

            if ($binary === false) {
                $fail("Le contenu base64 de {$attribute} est invalide.");

                return;
            }

            if (strlen($binary) > self::MAX_BYTES) {
                $fail("L'image {$attribute} dépasse 10 Mo.");

                return;
            }

            return;
        }

        // URL distante (image hébergée ailleurs)
        if (preg_match('#^https?://#i', $value)) {
            if (filter_var($value, FILTER_VALIDATE_URL) === false || mb_strlen($value) > 500) {
                $fail("L'URL de {$attribute} est invalide.");
            }

            return;
        }

        // Nom de fichier direct (ex: telephone.jpeg, mon_produit.png) ou chemin relatif (produits/..., assets/...)
        if (preg_match('#^([A-Za-z0-9._-]+/)*[A-Za-z0-9._ -]+\.(png|jpe?g|webp|gif|svg|bmp)$#i', $value)) {
            return;
        }

        $fail("Le format de {$attribute} n'est pas reconnu.");
    }
}
