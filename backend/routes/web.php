<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/admin/{any?}', function () {
    $frontendBase = rtrim(env('FRONTEND_URL', 'http://localhost:5173'), '/');
    return redirect($frontendBase . request()->getRequestUri());
})->where('any', '.*');
