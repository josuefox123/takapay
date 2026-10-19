<?php

namespace App\Services;

use App\Rules\ImageContent;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Service de stockage des images :
 * - Accepte tous les formats d'image courants (PNG, JPEG, JPG, WEBP, GIF, SVG, BMP)
 * - Conserve le format d'origine sans conversion forcée en WebP
 * - Stocke le nom de fichier original (ex: telephone.jpeg) tel quel en base de données
 */
class ImageStorageService
{
    private const DISK = 'public';

    /**
     * Traite une valeur d'image envoyée et retourne le nom de fichier à persister en base
     * (ex: "telephone.jpeg" ou URL distante).
     *
     * @param  mixed  $input  UploadedFile, data-URI base64, URL ou nom de fichier
     * @param  string  $directory  sous-dossier de stockage (ex: produits, categories)
     * @param  string|null  $current  valeur actuelle en base
     * @param  string  $attribute  nom du champ pour les erreurs
     * @param  string|null  $preferredName  nom de fichier d'origine souhaité (ex: telephone.jpeg)
     * @return string|null nom de l'image (ex: telephone.jpeg) ou URL
     */
    public function process(
        mixed $input,
        string $directory = 'produits',
        ?string $current = null,
        string $attribute = 'image',
        ?string $preferredName = null
    ): ?string {
        if ($input === null || $input === '' || $input === $current) {
            return $current;
        }

        // Fichier multipart UploadedFile
        if ($input instanceof UploadedFile) {
            $filename = $this->sanitizeFilename($preferredName ?: $input->getClientOriginalName());

            // Sauvegarde dans le sous-dossier (ex: storage/produits/telephone.jpeg)
            Storage::disk(self::DISK)->putFileAs($directory, $input, $filename);
            // Copie à la racine du disque public pour garantir l'accès direct si besoin
            Storage::disk(self::DISK)->putFileAs('', $input, $filename);

            return $filename;
        }

        if (! is_string($input)) {
            throw $this->invalid($attribute, 'Le format de l\'image est invalide.');
        }

        // Data-URI base64 : conservation du format d'origine (PNG, JPEG, GIF, etc.)
        if (str_starts_with($input, 'data:image/')) {
            $comma = strpos($input, ',');
            $header = substr($input, 0, $comma);
            $binary = base64_decode(substr($input, $comma + 1), true);

            if ($binary === false) {
                throw $this->invalid($attribute, 'Le contenu base64 de l\'image est invalide.');
            }

            if (strlen($binary) > ImageContent::MAX_BYTES) {
                throw $this->invalid($attribute, 'L\'image dépasse la taille maximale de 10 Mo.');
            }

            // Déduction de l'extension d'origine à partir du header MIME
            $extension = $this->guessExtensionFromHeader($header, $binary);

            if ($preferredName) {
                $filename = $this->sanitizeFilename($preferredName);
                if (! str_contains($filename, '.')) {
                    $filename .= '.'.$extension;
                }
            } else {
                $filename = 'image_'.time().'_'.Str::random(6).'.'.$extension;
            }

            // Sauvegarde brute sans conversion WebP forcée
            Storage::disk(self::DISK)->put($directory.'/'.$filename, $binary);
            Storage::disk(self::DISK)->put($filename, $binary);

            return $filename;
        }

        // URL distante : conservée telle quelle
        if (preg_match('#^https?://#i', $input)) {
            if (preg_match('#/storage/(?:'.$directory.'/)?(.+)$#i', $input, $m)) {
                return basename($m[1]);
            }

            if (filter_var($input, FILTER_VALIDATE_URL) !== false) {
                return $input;
            }

            throw $this->invalid($attribute, 'L\'URL de l\'image est invalide.');
        }

        // Nom de fichier direct (ex: telephone.jpeg) ou chemin relatif
        return $this->sanitizeFilename(basename($input));
    }

    /**
     * Supprime une image du disque.
     */
    public function delete(?string $path): void
    {
        if ($path === null || $path === '' || preg_match('#^https?://#i', $path)) {
            return;
        }

        try {
            $filename = basename($path);
            Storage::disk(self::DISK)->delete('produits/'.$filename);
            Storage::disk(self::DISK)->delete('categories/'.$filename);
            Storage::disk(self::DISK)->delete($filename);
            if ($path !== $filename) {
                Storage::disk(self::DISK)->delete($path);
            }
        } catch (\Throwable) {
            // Ignorer les échecs de suppression physique
        }
    }

    /**
     * Nettoie et sécurise le nom de fichier tout en conservant son extension et son nom d'origine.
     */
    private function sanitizeFilename(string $name): string
    {
        $name = basename($name);
        // Supprime d'éventuels caractères dangereux tout en gardant lettres, chiffres, tirets, underscores et points
        $clean = preg_replace('/[^A-Za-z0-9._ -]/', '', $name);

        return $clean !== '' ? $clean : 'image_'.time().'.jpg';
    }

    /**
     * Déduit l'extension depuis l'en-tête Data-URI ou le binaire.
     */
    private function guessExtensionFromHeader(string $header, string $binary): string
    {
        if (preg_match('#^data:image/(jpeg|jpg|png|webp|gif|svg\+xml|bmp)#i', $header, $m)) {
            $type = strtolower($m[1]);
            if ($type === 'jpeg' || $type === 'jpg') {
                return 'jpeg';
            }
            if ($type === 'svg+xml') {
                return 'svg';
            }

            return $type;
        }

        $info = @getimagesizefromstring($binary);

        return match ($info['mime'] ?? '') {
            'image/jpeg' => 'jpeg',
            'image/png' => 'png',
            'image/gif' => 'gif',
            'image/webp' => 'webp',
            'image/bmp' => 'bmp',
            default => 'png',
        };
    }

    private function invalid(string $attribute, string $message): ValidationException
    {
        return ValidationException::withMessages([$attribute => $message]);
    }
}
