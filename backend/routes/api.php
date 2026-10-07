<?php

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


Route::get('categories/{category}/sous-categories', [CategorieController::class, 'sousCategories'])
    ->name('categories.sous-categories');
Route::get('sous-categories/{sous_category}/produits', [SousCategorieController::class, 'produits'])
    ->name('sous-categories.produits');