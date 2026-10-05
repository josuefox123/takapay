<?php

use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AdresseController;



Route::apiResource('users', UserController::class);
Route::apiResource('adresses', AdresseController::class);

