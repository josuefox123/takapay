<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdresseController;
use App\Http\Controllers\Api\LivreurController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\NotificationController;






Route::apiResource('users', UserController::class);
Route::apiResource('adresses', AdresseController::class) 
  ->parameters(['adresses' => 'adresse']);
Route::apiResource('livreurs', LivreurController::class);
Route::apiResource('documents', DocumentController::class);
Route::apiResource('notifications', NotificationController::class);



