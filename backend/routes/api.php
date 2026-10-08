<?php

use App\Http\Controllers\Api\AdresseController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CagnotteController;
use App\Http\Controllers\Api\CategorieController;
use App\Http\Controllers\Api\CommandeController;
use App\Http\Controllers\Api\CommandeProduitController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EcheanceController;
use App\Http\Controllers\Api\ImageProduitController;
use App\Http\Controllers\Api\LivraisonController;
use App\Http\Controllers\Api\LivreurController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ParametreProduitController;
use App\Http\Controllers\Api\ProduitController;
use App\Http\Controllers\Api\PromotionController;
use App\Http\Controllers\Api\SousCategorieController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AUTHENTIFICATION PUBLIQUE
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| CATALOGUE PUBLIQUE (Consultation)
|--------------------------------------------------------------------------
*/
Route::get('categories/{category}/sous-categories', [CategorieController::class, 'sousCategories'])
    ->name('categories.sous-categories');
Route::get('sous-categories/{sous_category}/produits', [SousCategorieController::class, 'produits'])
    ->name('sous-categories.produits');

/*
|--------------------------------------------------------------------------
| ROUTES PROTÉGÉES PAR SANCTUM
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // Authentification & Profil
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | ADMINISTRATION (SUPER ADMIN & ADMIN)
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:super_admin,admin')->prefix('admin')->group(function () {
        Route::post('/users', [AdminController::class, 'createAdminUser']);
        Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus']);
        Route::patch('/documents/{document}/verify', [AdminController::class, 'verifyDocument']);
        Route::patch('/livreurs/{livreur}/status', [AdminController::class, 'updateLivreurStatus']);
    });

    // Ressources métier
    Route::apiResource('users', UserController::class);
    Route::apiResource('adresses', AdresseController::class)
        ->parameters(['adresses' => 'adresse']);
    Route::apiResource('documents', DocumentController::class);
    Route::apiResource('livreurs', LivreurController::class);
    Route::apiResource('notifications', NotificationController::class);
    Route::apiResource('audits', AuditController::class);

    Route::apiResource('categories', CategorieController::class);
    Route::apiResource('sous-categories', SousCategorieController::class);
    Route::apiResource('produits', ProduitController::class);
    Route::apiResource('parametre-produits', ParametreProduitController::class);
    Route::apiResource('promotions', PromotionController::class);
    Route::apiResource('image-produits', ImageProduitController::class);

    Route::apiResource('commandes', CommandeController::class);
    Route::apiResource('commande-produits', CommandeProduitController::class);
    Route::apiResource('cagnottes', CagnotteController::class);
    Route::apiResource('echeances', EcheanceController::class);
    Route::apiResource('transactions', TransactionController::class);
    Route::apiResource('livraisons', LivraisonController::class);
});
