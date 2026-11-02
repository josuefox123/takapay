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
        'image/pjpeg',
        'image/png',
        'image/x-png',
        'image/webp',
        'image/avif',
        'image/heic',
        'image/heif',
        'image/gif',
        'image/svg+xml',
        'image/bmp',
        'image/x-ms-bmp',
        'image/jfif',
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

        // Data-URI base64 (supporte tous les formats d'image : webp, avif, heic, png, jpeg, etc.)
        if (preg_match('#^data:(image/[a-zA-Z0-9.+-]+|application/octet-stream)(;[a-zA-Z0-9.+-]+=[^;]+)*;base64,#i', $value)) {
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

        // Nom de fichier direct ou chemin relatif / stockage
        $cleaned = ltrim($value, '/');
        if (preg_match('#\.(png|jpe?g|webp|gif|svg|bmp|avif|heic|heif|jfif)$#i', $cleaned)) {
            return;
        }

        $fail("Le format de {$attribute} n'est pas reconnu.");
    }
}
