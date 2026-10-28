<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AdresseController;
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
use App\Http\Controllers\Api\SupportChatController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\CarouselController;
use App\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| AUTHENTIFICATION PUBLIQUE (anti brute-force)
|--------------------------------------------------------------------------
*/
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1')->name('login');
Route::post('/auth/google', [AuthController::class, 'googleAuth'])->middleware('throttle:10,1');

/*
|--------------------------------------------------------------------------
| CATALOGUE PUBLIC (Consultation & synchronisation client/dashboard)
|--------------------------------------------------------------------------
*/
Route::get('categories', [CategorieController::class, 'index'])->name('categories.index');
Route::get('categories/{category}/sous-categories', [CategorieController::class, 'sousCategories'])
    ->name('categories.sous-categories');
Route::get('sous-categories', [SousCategorieController::class, 'index'])->name('sous-categories.index');
Route::get('sous-categories/{sous_category}/produits', [SousCategorieController::class, 'produits'])
    ->name('sous-categories.produits');
Route::get('produits', [ProduitController::class, 'index'])->name('produits.index');
Route::get('produits/{produit}', [ProduitController::class, 'show'])->name('produits.show');
Route::get('promotions', [PromotionController::class, 'index'])->name('promotions.index');
Route::get('cagnottes', [CagnotteController::class, 'index'])->name('cagnottes.index');
Route::get('commandes', [CommandeController::class, 'index'])->name('commandes.index');
Route::get('carousels', [CarouselController::class, 'index'])->name('carousels.index');
Route::put('profile', [AuthController::class, 'updateProfile'])->name('profile.update');
Route::put('profile/pin', [AuthController::class, 'updatePin'])->name('profile.update-pin');
Route::post('cagnottes/{cagnotte}/confirmer-reception', [CagnotteController::class, 'confirmerReception'])->name('cagnottes.confirmer-reception');
Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
Route::put('notifications/{notification}/lire', [NotificationController::class, 'marquerCommeLu'])->name('notifications.marquer-lu');
Route::post('notifications/tout-lire', [NotificationController::class, 'toutMarquerCommeLu'])->name('notifications.tout-lire');

/*
|--------------------------------------------------------------------------
| SUPPORT CLIENTÈLE & CHAT EN DIRECT (PUBLIC / CLIENT)
|--------------------------------------------------------------------------
*/
Route::prefix('support')->group(function () {
    Route::get('/messages', [SupportChatController::class, 'getClientMessages']);
    Route::post('/send', [SupportChatController::class, 'sendClientMessage'])->middleware('throttle:10,1');
});

/*
|--------------------------------------------------------------------------
| ROUTES PROTÉGÉES PAR SANCTUM (+ compte actif)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Authentification & Profil
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    /*
    |--------------------------------------------------------------------------
    | RÉSERVÉ AUX ADMINISTRATEURS (SUPER ADMIN & ADMIN)
    |--------------------------------------------------------------------------
    */
    Route::middleware('role:super_admin,admin')->group(function () {

        // Back-office
        Route::prefix('admin')->group(function () {
            // Statistiques du tableau de bord
            Route::get('/stats', [AdminStatsController::class, 'stats']);

            // Commandes (vue admin avec relations)
            Route::get('/commandes', [CommandeController::class, 'adminIndex']);

            // Produits & médias
            Route::post('/produits', [AdminController::class, 'storeFullProduit']);
            Route::post('/upload-video', [AdminController::class, 'uploadVideo']);

            // Utilisateurs
            Route::post('/users', [AdminController::class, 'createAdminUser']);
            Route::patch('/users/{user}/status', [AdminController::class, 'updateUserStatus']);

            // Documents KYC
            Route::patch('/documents/{document}/verify', [AdminController::class, 'verifyDocument']);

            // Livreurs
            Route::patch('/livreurs/{livreur}/status', [AdminController::class, 'updateLivreurStatus']);

            // Support Clientèle & Messagerie
            Route::get('/support/unread-count', [SupportChatController::class, 'adminUnreadCount']);
            Route::get('/support/conversations', [SupportChatController::class, 'adminListConversations']);
            Route::get('/support/conversations/{id}', [SupportChatController::class, 'adminGetConversation']);
            Route::post('/support/conversations/{id}/reply', [SupportChatController::class, 'adminReply']);
            Route::patch('/support/conversations/{id}/close', [SupportChatController::class, 'adminCloseConversation']);

            // Bannières Carrousel
            Route::get('/carousels', [CarouselController::class, 'adminIndex']);
            Route::post('/carousels', [CarouselController::class, 'store']);
            Route::post('/carousels/{carousel}', [CarouselController::class, 'update']);
            Route::put('/carousels/{carousel}', [CarouselController::class, 'update']);
            Route::delete('/carousels/{carousel}', [CarouselController::class, 'destroy']);
        });

        // Gestion des comptes, du KYC, des audits et des livreurs
        Route::apiResource('users', UserController::class);
        Route::apiResource('audits', AuditController::class);
        Route::apiResource('livreurs', LivreurController::class);

        // Catalogue (écriture réservée à l'administration)
        Route::apiResource('categories', CategorieController::class)->except(['index', 'show']);
        Route::apiResource('sous-categories', SousCategorieController::class)->except(['index', 'show']);
        Route::apiResource('produits', ProduitController::class)->except(['index', 'show']);
        Route::apiResource('image-produits', ImageProduitController::class);
        Route::apiResource('promotions', PromotionController::class)->except(['index', 'show']);

        // Paramètres & cycle financier (écriture et lecture réservées à l'administration)
        Route::apiResource('parametre-produits', ParametreProduitController::class);
        Route::apiResource('cagnottes', CagnotteController::class)->except(['index']);
        Route::apiResource('echeances', EcheanceController::class);
        Route::apiResource('transactions', TransactionController::class);
        Route::apiResource('livraisons', LivraisonController::class);
    });

    /*
    |--------------------------------------------------------------------------
    | RESSOURCES PROPRIÉTAIRES (propriétaire OU administrateur)
    | Le filtrage par propriétaire est assuré dans les contrôleurs/FormRequests.
    |--------------------------------------------------------------------------
    */
    Route::apiResource('adresses', AdresseController::class)
        ->parameters(['adresses' => 'adresse']);
    Route::apiResource('documents', DocumentController::class);
    Route::apiResource('notifications', NotificationController::class)->except(['index']);
    Route::apiResource('commandes', CommandeController::class)->except(['index']);
    Route::apiResource('commande-produits', CommandeProduitController::class);
});

/*
|--------------------------------------------------------------------------
| ROUTES PAIEMENTS FEEXPAY (Initiation, Confirmation & Webhook)
|--------------------------------------------------------------------------
*/
Route::post('/payment/initiate', [PaymentController::class, 'initiatePayment']);
Route::post('/payment/confirm', [PaymentController::class, 'confirmPayment']);
Route::post('/payment/webhook', [PaymentController::class, 'handleWebhook']);
