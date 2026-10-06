<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::apiResource('users', UserController::class);
Route::apiResource('commandes', \App\Http\Controllers\Api\CommandeController::class);
Route::apiResource('commande-produits', \App\Http\Controllers\Api\CommandeProduitController::class);
Route::apiResource('livraisons', \App\Http\Controllers\Api\LivraisonController::class);
Route::apiResource('cagnottes', \App\Http\Controllers\Api\CagnotteController::class);
Route::apiResource('transactions', \App\Http\Controllers\Api\TransactionController::class);
Route::apiResource('echeances', \App\Http\Controllers\Api\EcheanceController::class);
