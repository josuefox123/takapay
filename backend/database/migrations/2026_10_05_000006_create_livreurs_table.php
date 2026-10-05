<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('livreurs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('utilisateur_id')->constrained('users')->cascadeOnDelete();
            $table->string('type_vehicule');
            $table->string('statut')->default('inactif');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('livreurs');
    }
};
