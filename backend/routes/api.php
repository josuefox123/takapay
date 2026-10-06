<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdresseController;
use App\Http\Controllers\Api\LivreurController;




Route::apiResource('users', UserController::class);
Route::apiResource('adresses', AdresseController::class);
Route::apiResource('livreurs', LivreurController::class);


