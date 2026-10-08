<?php

use App\Http\Controllers\Api\AdresseController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\CagnotteController;
use App\Http\Controllers\Api\CommandeController;
use App\Http\Controllers\Api\CommandeProduitController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EcheanceController;
use App\Http\Controllers\Api\LivraisonController;
use App\Http\Controllers\Api\LivreurController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CategorieController;
use App\Http\Controllers\Api\SousCategorieController;
use App\Http\Controllers\Api\ProduitController;
use App\Http\Controllers\Api\ImageProduitController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\ParametreProduitController;

use Illuminate\Support\Facades\Route;

Route::apiResource('users', UserController::class);
Route::apiResource('categories', CategorieController::class);
Route::apiResource('sous-categories', SousCategorieController::class);
Route::apiResource('produits', ProduitController::class);
Route::apiResource('parametre-produits', ParametreProduitController::class);
Route::apiResource('promotions', PromotionController::class);
Route::apiResource('image-produits', ImageProduitController::class);

Route::apiResource('adresses', AdresseController::class)
    ->parameters(['adresses' => 'adresse']);

Route::apiResource('livreurs', LivreurController::class);

Route::apiResource('documents', DocumentController::class);

Route::apiResource('notifications', NotificationController::class);

Route::apiResource('audits', AuditController::class)
    ->only(['index', 'store', 'show']);

Route::apiResource('commandes', CommandeController::class);

Route::get('categories/{category}/sous-categories', [CategorieController::class, 'sousCategories'])
    ->name('categories.sous-categories');
Route::get('sous-categories/{sous_category}/produits', [SousCategorieController::class, 'produits'])
    ->name('sous-categories.produits');
Route::apiResource('commande-produits', CommandeProduitController::class);

Route::apiResource('livraisons', LivraisonController::class);

Route::apiResource('cagnottes', CagnotteController::class);

Route::apiResource('transactions', TransactionController::class);

Route::apiResource('echeances', EcheanceController::class);
