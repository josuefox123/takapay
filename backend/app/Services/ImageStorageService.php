<?php

namespace App\Services;

use App\Rules\ImageContent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ImageStorageService
{
    private const DISK = 'public';

    /**
     * Enregistre une image et retourne son chemin relatif.
     *
     * Exemples :
     * produits/telephone.jpeg
     * categories/accessoire.png
     */
    public function process(
        mixed $input,
        string $directory = 'produits',
        ?string $current = null,
        string $attribute = 'image',
        ?string $preferredName = null
    ): ?string {
        if ($input === null || $input === '') {
            return $current;
        }

        if ($input === $current) {
            return $current;
        }

        $directory = trim(
            str_replace('\\', '/', $directory),
            '/'
        );

        /*
         * 1. Fichier envoyé par formulaire multipart.
         */
        if ($input instanceof UploadedFile) {
            if (! $input->isValid()) {
                throw $this->invalid(
                    $attribute,
                    'Le fichier image envoyé est invalide.'
                );
            }

            $this->validateImage($input, $attribute);

            $filename = $this->sanitizeFilename(
                $preferredName ?: $input->getClientOriginalName()
            );

            $path = $input->storeAs(
                $directory,
                $filename,
                self::DISK
            );

            if (! $path) {
                throw $this->invalid(
                    $attribute,
                    'Impossible d’enregistrer le fichier image.'
                );
            }

            return $path;
        }

        if (! is_string($input)) {
            throw $this->invalid(
                $attribute,
                'Le format de l’image est invalide.'
            );
        }

        /*
         * 2. Image encodée en Data URI base64.
         * Accepte image/* et application/octet-stream.
         */
        if (
            str_starts_with($input, 'data:image/') ||
            str_starts_with($input, 'data:application/octet-stream')
        ) {
            $comma = strpos($input, ',');

            if ($comma === false) {
                throw $this->invalid(
                    $attribute,
                    'Le contenu de l’image est invalide.'
                );
            }

            $header = substr($input, 0, $comma);

            $binary = base64_decode(
                substr($input, $comma + 1),
                true
            );

            if ($binary === false || $binary === '') {
                throw $this->invalid(
                    $attribute,
                    'Le contenu base64 de l’image est invalide.'
                );
            }

            if (strlen($binary) > ImageContent::MAX_BYTES) {
                throw $this->invalid(
                    $attribute,
                    'L’image dépasse la taille maximale autorisée de 10 Mo.'
                );
            }

            $extension = $this->guessExtensionFromHeader(
                $header,
                $binary
            );

            $filename = $preferredName
                ? $this->sanitizeFilename($preferredName)
                : 'image_' . Str::uuid() . '.' . $extension;

            if (! pathinfo($filename, PATHINFO_EXTENSION)) {
                $filename .= '.' . $extension;
            }

            $path = $directory . '/' . $filename;

            if (! Storage::disk(self::DISK)->put($path, $binary)) {
                throw $this->invalid(
                    $attribute,
                    'Impossible d’enregistrer l’image.'
                );
            }

            return $path;
        }

        /*
         * 3. URL distante.
         */
        if (preg_match('#^https?://#i', $input)) {
            if (filter_var($input, FILTER_VALIDATE_URL) === false) {
                throw $this->invalid(
                    $attribute,
                    'L’URL de l’image est invalide.'
                );
            }

            $path = parse_url($input, PHP_URL_PATH);

            if (is_string($path)) {
                $prefix = '/storage/' . $directory . '/';

                if (str_starts_with($path, $prefix)) {
                    return basename($path);
                }

                if (str_starts_with($path, '/storage/')) {
                    return basename($path);
                }
            }

            // Les URL externes valides sont conservées.
            return $input;
        }

        /*
         * 4. Nom de fichier ou chemin local existant.
         */
        $input = str_replace('\\', '/', trim($input));

        if (str_starts_with($input, '/storage/')) {
            $input = substr($input, strlen('/storage/'));
        }

        $filename = basename($input);

        if (
            $filename === '' ||
            $filename === '.' ||
            $filename === '..'
        ) {
            throw $this->invalid(
                $attribute,
                'Le nom du fichier image est invalide.'
            );
        }

        $filename = $this->sanitizeFilename($filename);

        $candidatePaths = [
            $directory . '/' . $filename,
            $filename,
        ];

        foreach ($candidatePaths as $path) {
            if (Storage::disk(self::DISK)->exists($path)) {
                return $path;
            }
        }

        /*
         * Compatibilité avec les anciens enregistrements.
         * Le chemin est conservé même si le fichier est absent.
         */
        return $filename;
    }

    /**
     * Valide un fichier image envoyé par formulaire.
     */
    private function validateImage(
        UploadedFile $file,
        string $attribute
    ): void {
        $mime = $file->getMimeType();

        $allowedMimes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/bmp',
            'image/svg+xml',
        ];

        if (! in_array($mime, $allowedMimes, true)) {
            throw $this->invalid(
                $attribute,
                'Le format de l’image n’est pas autorisé.'
            );
        }

        if ($file->getSize() > ImageContent::MAX_BYTES) {
            throw $this->invalid(
                $attribute,
                'L’image dépasse la taille maximale autorisée de 10 Mo.'
            );
        }
    }

    /**
     * Supprime un fichier image local.
     * Ne supprime jamais les images hébergées à l'extérieur.
     */
    public function delete(?string $path): void
    {
        if (
            $path === null ||
            trim($path) === '' ||
            preg_match('#^(https?://|data:)#i', $path)
        ) {
            return;
        }

        $path = str_replace('\\', '/', trim($path));

        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        }

        $path = ltrim($path, '/');

        // Empêche les traversées de répertoires.
        if (in_array('..', explode('/', $path), true)) {
            return;
        }

        try {
            Storage::disk(self::DISK)->delete($path);

            /*
             * Compatibilité avec les anciens fichiers
             * qui pouvaient aussi être copiés à la racine.
             */
            $filename = basename($path);

            if ($filename !== $path) {
                Storage::disk(self::DISK)->delete($filename);
            }
        } catch (\Throwable $exception) {
            report($exception);
        }
    }

    /**
     * Nettoie et sécurise un nom de fichier.
     */
    private function sanitizeFilename(string $name): string
    {
        $name = basename(str_replace('\\', '/', $name));

        $clean = preg_replace(
            '/[^A-Za-z0-9._ -]/',
            '',
            $name
        );

        $clean = trim($clean ?? '', '. ');

        return $clean !== ''
            ? $clean
            : 'image_' . Str::uuid() . '.jpg';
    }

    /**
     * Déduit l'extension depuis le Data URI ou le contenu binaire.
     */
    private function guessExtensionFromHeader(
        string $header,
        string $binary
    ): string {
        if (
            preg_match(
                '#^data:(?:image/([a-zA-Z0-9.+-]+)|application/octet-stream)#i',
                $header,
                $matches
            )
        ) {
            $type = strtolower($matches[1] ?? '');

            $extension = match ($type) {
                'jpeg', 'jpg', 'jfif', 'pjpeg' => 'jpeg',
                'svg+xml' => 'svg',
                'x-png' => 'png',
                'png', 'webp', 'gif', 'bmp', 'avif', 'heic', 'heif' => $type,
                default => null,
            };

            if ($extension !== null) {
                return $extension;
            }
        }

        $info = @getimagesizefromstring($binary);
        $mime = $info['mime'] ?? '';

        $extension = match ($mime) {
            'image/jpeg' => 'jpeg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/bmp' => 'bmp',
            'image/avif' => 'avif',
            'image/heic' => 'heic',
            'image/heif' => 'heif',
            'image/svg+xml' => 'svg',
            default => null,
        };

        if ($extension !== null) {
            return $extension;
        }

        throw $this->invalid(
            'image',
            'Impossible de déterminer le format de cette image.'
        );
    }

    /**
     * Construit une erreur de validation Laravel.
     */
    private function invalid(
        string $attribute,
        string $message
    ): ValidationException {
        return ValidationException::withMessages([
            $attribute => $message,
        ]);
    }
}
