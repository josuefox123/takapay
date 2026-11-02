<?php

use App\Models\Produit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/{any?}', function () {
    $frontendBase = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
    return redirect($frontendBase . request()->getRequestUri());
})->where('any', '.*');

// Fiche article partageable avec balises Open Graph pour WhatsApp, Facebook, etc.
Route::get('/produit/{id}', function (Request $request, $id) {
    $produit = Produit::with(['imageProduits', 'parametreProduit'])->find($id);

    $host = $request->getHttpHost();
    $scheme = $request->getScheme();
    $frontendHost = str_replace(':8000', ':5173', $host);
    $frontendUrl = "{$scheme}://{$frontendHost}/app/produits/{$id}";
    $canonicalUrl = $request->fullUrl();

    if (!$produit) {
        return redirect("{$scheme}://{$frontendHost}/app/produits");
    }

    $nom = $produit->nom ?: 'Article TakaPay';
    $prix = $produit->parametreProduit?->prix_total ?: $produit->parametreProduit?->prix_cash;
    $prixText = $prix ? number_format($prix, 0, ',', ' ') . ' FCFA' : '';

    $descParts = [];
    if ($prixText) {
        $descParts[] = "Prix : {$prixText}";
    }
    if (!empty($produit->description)) {
        $descParts[] = Str::limit(strip_tags($produit->description), 150);
    } else {
        $descParts[] = "Disponible sur Takapay Bénin. Épargne progressive d'achat sans frais.";
    }
    $description = implode(' · ', $descParts);

    $firstImage = $produit->imageProduits->first();
    $imagePath = $firstImage ? $firstImage->chemin : null;
    $imageUrl = null;
    if ($imagePath) {
        if (str_starts_with($imagePath, 'http://') || str_starts_with($imagePath, 'https://')) {
            $imageUrl = $imagePath;
        } else {
            $clean = ltrim($imagePath, '/');
            if (str_starts_with($clean, 'storage/')) {
                $imageUrl = "{$scheme}://{$host}/{$clean}";
            } elseif (str_starts_with($clean, 'produits/')) {
                $imageUrl = "{$scheme}://{$host}/storage/{$clean}";
            } else {
                $imageUrl = "{$scheme}://{$host}/storage/produits/{$clean}";
            }
        }
    }

    return view('share_product', compact('produit', 'nom', 'description', 'imageUrl', 'frontendUrl', 'canonicalUrl'));
})->name('produit.share');

Route::get('/p/{id}', function ($id) {
    return redirect()->route('produit.share', ['id' => $id]);
});

